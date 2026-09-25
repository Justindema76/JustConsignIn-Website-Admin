import tls from 'node:tls';
import { supabaseAdmin } from './supabase.js';

function clean(value, max = 4000) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

function normalizeList(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(source.map(item => clean(item, 320).toLowerCase()).filter(Boolean))];
}

function encodeHeader(value) {
  const text = clean(value, 1000);
  return /^[\x20-\x7E]*$/.test(text)
    ? text
    : `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}

function formatFrom(name, email) {
  const safeName = clean(name, 160).replace(/[\r\n"]/g, '');
  return safeName ? `"${safeName}" <${email}>` : email;
}

class SmtpReader {
  constructor(socket) {
    this.socket = socket;
    this.buffer = '';
    this.current = [];
    this.queue = [];
    this.waiters = [];
    this.failure = null;

    socket.setEncoding('utf8');
    socket.on('data', chunk => {
      this.buffer += chunk;
      this.drain();
    });
    socket.on('error', error => this.fail(error));
    socket.on('close', hadError => {
      if (!hadError && !this.failure) this.fail(new Error('SMTP connection closed unexpectedly.'));
    });
  }

  drain() {
    const lines = this.buffer.split('\r\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line) continue;
      this.current.push(line);
      if (/^\d{3} /.test(line)) {
        const response = this.current.join('\n');
        this.current = [];
        if (this.waiters.length) {
          const waiter = this.waiters.shift();
          clearTimeout(waiter.timer);
          waiter.resolve(response);
        } else {
          this.queue.push(response);
        }
      }
    }
  }

  fail(error) {
    if (this.failure) return;
    this.failure = error;
    while (this.waiters.length) {
      const waiter = this.waiters.shift();
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }

  next(timeoutMs = 15000) {
    if (this.failure) return Promise.reject(this.failure);
    if (this.queue.length) return Promise.resolve(this.queue.shift());

    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter(item => item !== waiter);
          reject(new Error('SMTP server did not respond before the timeout.'));
        }, timeoutMs),
      };
      this.waiters.push(waiter);
    });
  }
}

function smtpCode(response) {
  const line = String(response || '').trim().split('\n').pop() || '';
  return Number(line.slice(0, 3));
}

async function expect(reader, allowed, label) {
  const response = await reader.next();
  const code = smtpCode(response);
  if (!allowed.includes(code)) {
    throw new Error(`${label} failed: ${response.replace(/\n/g, ' | ')}`);
  }
  return response;
}

function smtpWrite(socket, value) {
  socket.write(`${value}\r\n`);
}

function messageBody({ fromName, fromEmail, to, cc, replyTo, subject, text, html }) {
  const toList = normalizeList(to);
  const ccList = normalizeList(cc);
  const boundary = `----=_Justin_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const headers = [
    `From: ${formatFrom(fromName, fromEmail)}`,
    `To: ${toList.join(', ')}`,
    ccList.length ? `Cc: ${ccList.join(', ')}` : '',
    replyTo ? `Reply-To: ${clean(replyTo, 320)}` : '',
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
  ].filter(Boolean);

  let body;
  if (html) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      String(text || ''),
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      String(html || ''),
      `--${boundary}--`,
      '',
    ].join('\r\n');
  } else {
    headers.push('Content-Type: text/plain; charset=UTF-8');
    headers.push('Content-Transfer-Encoding: 8bit');
    body = String(text || '');
  }

  const raw = `${headers.join('\r\n')}\r\n\r\n${body}`
    .replace(/\r?\n/g, '\r\n')
    .replace(/(^|\r\n)\./g, '$1..');

  return raw;
}

export async function loadSiteEmailSettings(siteKey = 'justconsignin') {
  const safeSiteKey = siteKey === 'justindematteis' ? 'justindematteis' : 'justconsignin';
  const response = await supabaseAdmin('/rest/v1/rpc/service_get_email_settings', {
    method: 'POST',
    body: JSON.stringify({ p_site_key: safeSiteKey }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Unable to load SMTP settings.');
  }
  const settings = Array.isArray(payload) ? payload[0] : payload;
  if (!settings?.enabled) throw new Error('Email notifications are disabled in Website Admin.');

  for (const key of ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_from_email', 'smtp_password']) {
    if (!settings?.[key]) throw new Error(`Email setting ${key} is not configured.`);
  }
  return settings;
}

export function recipientsFor(settings, eventKey) {
  const routes = Array.isArray(settings?.notification_routes) ? settings.notification_routes : [];
  const selected = routes.filter(route => {
    const routeEvent = clean(route?.eventKey, 60).toLowerCase();
    return route?.enabled !== false
      && (routeEvent === eventKey || routeEvent === 'all')
      && clean(route?.email, 320);
  });

  const pick = type => [...new Set(selected
    .filter(route => clean(route?.recipientType, 10).toLowerCase() === type)
    .map(route => clean(route?.email, 320).toLowerCase()))];

  let to = pick('to');
  const cc = pick('cc').filter(email => !to.includes(email));
  const bcc = pick('bcc').filter(email => !to.includes(email) && !cc.includes(email));

  if (!to.length && clean(settings?.notification_email, 320)) {
    to = [clean(settings.notification_email, 320).toLowerCase()];
  }
  if (!to.length) throw new Error(`No To recipient is configured for ${eventKey}.`);

  return { to, cc, bcc };
}

export async function sendSiteEmail(settings, {
  to,
  cc = [],
  bcc = [],
  replyTo = '',
  subject,
  text = '',
  html = '',
}) {
  const host = clean(settings.smtp_host, 255);
  const port = Number(settings.smtp_port);
  const username = clean(settings.smtp_username, 320);
  const password = String(settings.smtp_password || '');
  const fromEmail = clean(settings.smtp_from_email, 320).toLowerCase();
  const fromName = clean(settings.smtp_from_name, 160);
  const toList = normalizeList(to);
  const ccList = normalizeList(cc);
  const bccList = normalizeList(bcc);
  const recipients = [...new Set([...toList, ...ccList, ...bccList])];

  if (!recipients.length) throw new Error('No email recipient was provided.');

  const socket = tls.connect({
    host,
    port,
    servername: host,
    rejectUnauthorized: true,
  });
  socket.setTimeout(20000);

  const reader = new SmtpReader(socket);

  const connected = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Unable to connect to SMTP server ${host}:${port}.`)), 20000);
    socket.once('secureConnect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    socket.once('timeout', () => {
      clearTimeout(timer);
      socket.destroy();
      reject(new Error(`SMTP connection to ${host}:${port} timed out.`));
    });
  });

  try {
    await connected;
    await expect(reader, [220], 'SMTP greeting');

    smtpWrite(socket, 'EHLO website-admin');
    await expect(reader, [250], 'SMTP EHLO');

    smtpWrite(socket, 'AUTH LOGIN');
    await expect(reader, [334], 'SMTP authentication');

    smtpWrite(socket, Buffer.from(username, 'utf8').toString('base64'));
    await expect(reader, [334], 'SMTP username');

    smtpWrite(socket, Buffer.from(password, 'utf8').toString('base64'));
    await expect(reader, [235], 'SMTP password');

    smtpWrite(socket, `MAIL FROM:<${fromEmail}>`);
    await expect(reader, [250], 'SMTP sender');

    for (const recipient of recipients) {
      smtpWrite(socket, `RCPT TO:<${recipient}>`);
      await expect(reader, [250, 251], `SMTP recipient ${recipient}`);
    }

    smtpWrite(socket, 'DATA');
    await expect(reader, [354], 'SMTP DATA');

    const raw = messageBody({
      fromName,
      fromEmail,
      to: toList,
      cc: ccList,
      replyTo,
      subject,
      text,
      html,
    });
    socket.write(`${raw}\r\n.\r\n`);
    const delivered = await expect(reader, [250], 'SMTP delivery');

    smtpWrite(socket, 'QUIT');
    await expect(reader, [221], 'SMTP QUIT').catch(() => null);

    return { ok: true, response: delivered };
  } finally {
    socket.end();
    socket.destroy();
  }
}
