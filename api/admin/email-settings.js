import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseAnon, supabaseUrl, supabaseUserRest } from '../_lib/supabase.js';
import { loadSiteEmailSettings, recipientsFor, sendSiteEmail } from '../_lib/smtp.js';

const ROUTE_TYPES = new Set(['to', 'cc', 'bcc']);
const EVENT_KEY = /^[a-z0-9_-]{1,60}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SITE_CONFIG = {
  justconsignin: {
    requiredEvent: 'demo_request',
    requiredLabel: 'Demo Requests',
    fallbackRouteId: 'demo-primary',
    defaultFromName: 'JustConsignIn',
  },
  justindematteis: {
    requiredEvent: 'service_request',
    requiredLabel: 'Service Requests',
    fallbackRouteId: 'service-primary',
    defaultFromName: 'Justin DeMatteis',
  },
};

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

function siteKeyFromRequest(req) {
  const siteKey = clean(req.query?.site, 80).toLowerCase() || 'justconsignin';
  return SITE_CONFIG[siteKey] ? siteKey : '';
}

function normalizeRoutes(value, fallbackEmail = '', siteKey = 'justconsignin') {
  const site = SITE_CONFIG[siteKey] || SITE_CONFIG.justconsignin;
  const source = Array.isArray(value) ? value : [];

  // A newly-added row with no address is an unfinished UI row, not a broken route.
  // Ignore it until an address is entered so "Add recipient" does not make Save fail.
  const routes = source
    .slice(0, 50)
    .filter(route => clean(route?.email, 320))
    .map((route, index) => {
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

  const fallback = clean(fallbackEmail, 320).toLowerCase();
  if (!routes.length && EMAIL.test(fallback)) {
    routes.push({
      id: site.fallbackRouteId,
      eventKey: site.requiredEvent,
      recipientType: 'to',
      email: fallback,
      enabled: true,
    });
  }

  const hasRequiredTo = routes.some(
    route => route.enabled && route.eventKey === site.requiredEvent && route.recipientType === 'to' && route.email,
  );

  if (!hasRequiredTo) {
    throw new Error(`Add at least one enabled ${site.requiredLabel} recipient using To.`);
  }

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

  const siteKey = siteKeyFromRequest(req);
  if (!siteKey) return res.status(400).json({ error: 'Unknown website.' });
  const site = SITE_CONFIG[siteKey];

  if (req.method === 'GET') {
    try {
      const rows = await callOwnerRpc(owner.accessToken, 'admin_get_email_settings', {
        p_site_key: siteKey,
      });
      return res.status(200).json({
        siteKey,
        settings: Array.isArray(rows) ? rows[0] || null : rows || null,
      });
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
      routes = normalizeRoutes(body.notificationRoutes, body.notificationEmail, siteKey);
    } catch (error) {
      return res.status(400).json({ error: error?.message || 'Check notification routing.' });
    }

    const primaryEmail = routes.find(
      route => route.enabled && route.eventKey === site.requiredEvent && route.recipientType === 'to',
    )?.email || '';

    try {
      const rows = await callOwnerRpc(owner.accessToken, 'admin_save_email_settings', {
        p_enabled: body.enabled !== false,
        p_provider: 'smtp',
        p_smtp_host: smtpHost,
        p_smtp_port: port,
        p_smtp_secure: body.smtpSecure !== false,
        p_smtp_username: smtpUsername,
        p_smtp_from_email: fromEmail,
        p_smtp_from_name: clean(body.fromName, 160) || site.defaultFromName,
        p_notification_email: primaryEmail,
        p_password: clean(body.password, 1000) || null,
        p_notification_routes: routes,
        p_site_key: siteKey,
      });
      return res.status(200).json({
        siteKey,
        settings: Array.isArray(rows) ? rows[0] || null : rows || null,
      });
    } catch (error) {
      console.error('Email settings PUT failed', error);
      return res.status(500).json({ error: error?.message || 'Unable to save email settings.' });
    }
  }

  if (req.method === 'POST') {
    const body = readBody(req);
    if (body.action !== 'test') return res.status(400).json({ error: 'Invalid action.' });

    try {
      if (siteKey === 'justindematteis') {
        const settings = await loadSiteEmailSettings(siteKey);
        const recipients = recipientsFor(settings, site.requiredEvent);
        await sendSiteEmail(settings, {
          ...recipients,
          subject: 'Justin DeMatteis Email Settings Test',
          text: 'Your Website Admin SMTP settings and Service Requests routing are working.',
          html: '<div style="font-family:Arial,sans-serif;padding:24px"><h2 style="margin:0 0 12px">Email settings are working</h2><p>Your Justin DeMatteis Website Admin successfully connected to HostPapa and sent this message using the saved Service Requests routing.</p></div>',
        });
        return res.status(200).json({ ok: true, message: 'Test email sent.' });
      }

      const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnon(),
          Authorization: `Bearer ${owner.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test', siteKey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(502).json({ error: payload?.error || 'Test email failed.' });
      return res.status(200).json({ ok: true, message: 'Test email sent.' });
    } catch (error) {
      const message = error?.message || 'Test email failed.';
      console.error('Email settings test failed', error);
      return res.status(502).json({ error: message });
    }
  }

  res.setHeader('Allow', 'GET, PUT, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}
