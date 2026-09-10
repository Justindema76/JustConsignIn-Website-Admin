import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseAnon, supabaseUrl, supabaseUserRest } from '../_lib/supabase.js';

const ROUTE_TYPES = new Set(['to', 'cc', 'bcc']);
const EVENT_KEY = /^[a-z0-9_-]{1,60}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function clean(value, max = 1000) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

function normalizeRoutes(value, fallbackEmail = '') {
  const source = Array.isArray(value) ? value : [];
  const routes = source.slice(0, 50).map((route, index) => {
    const eventKey = clean(route?.eventKey, 60).toLowerCase();
    const recipientType = clean(route?.recipientType, 10).toLowerCase();
    const email = clean(route?.email, 320).toLowerCase();
    if (!EVENT_KEY.test(eventKey) || !ROUTE_TYPES.has(recipientType) || !EMAIL.test(email)) {
      throw new Error(`Invalid notification route ${index + 1}.`);
    }
    return {
      id: clean(route?.id, 100) || `route-${index + 1}`,
      eventKey,
      recipientType,
      email,
      enabled: route?.enabled !== false,
    };
  });

  if (!routes.length && EMAIL.test(clean(fallbackEmail, 320))) {
    routes.push({ id: 'demo-primary', eventKey: 'demo_request', recipientType: 'to', email: clean(fallbackEmail, 320).toLowerCase(), enabled: true });
  }

  const hasDemoTo = routes.some(route => route.enabled && route.eventKey === 'demo_request' && route.recipientType === 'to');
  if (!hasDemoTo) throw new Error('Add at least one enabled Demo Requests recipient using To.');
  return routes;
}

async function parseSupabase(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || fallback);
  return payload;
}

async function callOwnerRpc(accessToken, name, body = {}) {
  const response = await supabaseUserRest(accessToken, `rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseSupabase(response, 'Unable to update email settings.');
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method === 'GET') {
    try {
      const rows = await callOwnerRpc(owner.accessToken, 'admin_get_email_settings');
      return res.status(200).json({ settings: Array.isArray(rows) ? rows[0] || null : rows || null });
    } catch (error) {
      console.error('Email settings GET failed', error);
      return res.status(500).json({ error: 'Unable to load email settings.' });
    }
  }

  if (req.method === 'PUT') {
    const body = readBody(req);
    const port = Number(body.smtpPort);
    const smtpHost = clean(body.smtpHost, 255);
    const smtpUsername = clean(body.smtpUsername, 320);
    const fromEmail = clean(body.fromEmail, 320).toLowerCase();

    if (!smtpHost || !smtpUsername || !fromEmail) {
      return res.status(400).json({ error: 'SMTP host, username and From email are required.' });
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return res.status(400).json({ error: 'Enter a valid SMTP port.' });
    }
    if (!EMAIL.test(fromEmail)) return res.status(400).json({ error: 'Enter a valid From email address.' });

    let routes;
    try {
      routes = normalizeRoutes(body.notificationRoutes, body.notificationEmail);
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Check notification routing.' });
    }
    const primaryDemoEmail = routes.find(route => route.enabled && route.eventKey === 'demo_request' && route.recipientType === 'to')?.email || '';

    try {
      const rows = await callOwnerRpc(owner.accessToken, 'admin_save_email_settings', {
        p_enabled: body.enabled !== false,
        p_provider: 'smtp',
        p_smtp_host: smtpHost,
        p_smtp_port: port,
        p_smtp_secure: body.smtpSecure !== false,
        p_smtp_username: smtpUsername,
        p_smtp_from_email: fromEmail,
        p_smtp_from_name: clean(body.fromName, 160) || 'JustConsignIn',
        p_notification_email: primaryDemoEmail,
        p_password: clean(body.password, 1000) || null,
        p_notification_routes: routes,
      });
      return res.status(200).json({ settings: Array.isArray(rows) ? rows[0] || null : rows || null });
    } catch (error) {
      console.error('Email settings PUT failed', error);
      return res.status(500).json({ error: error?.message || 'Unable to save email settings.' });
    }
  }

  if (req.method === 'POST') {
    const body = readBody(req);
    if (body.action !== 'test') return res.status(400).json({ error: 'Invalid action.' });

    try {
      const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnon(),
          Authorization: `Bearer ${owner.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(502).json({ error: payload?.error || 'Test email failed.' });
      return res.status(200).json({ ok: true, message: 'Test email sent.' });
    } catch (error) {
      console.error('Email settings test failed', error);
      return res.status(502).json({ error: 'Test email failed.' });
    }
  }

  res.setHeader('Allow', 'GET, PUT, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
