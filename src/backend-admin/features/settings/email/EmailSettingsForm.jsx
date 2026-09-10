import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, MailCheck, Plus, Save, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../../auth/AdminAuthContext';
import { loadEmailSettings, saveEmailSettings, sendEmailSettingsTest } from './emailSettings.service';

const EVENT_OPTIONS = [
  ['demo_request', 'Demo Requests'],
  ['contact', 'Contact Form'],
  ['all', 'All website notifications'],
];

const RECIPIENT_OPTIONS = [
  ['to', 'To'],
  ['cc', 'CC'],
  ['bcc', 'BCC'],
];

const newRouteId = () => globalThis.crypto?.randomUUID?.() || `route-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultRoute = () => ({
  id: newRouteId(),
  eventKey: 'demo_request',
  recipientType: 'to',
  email: '',
  enabled: true,
});

const EMPTY = {
  enabled: true,
  provider: 'smtp',
  smtpHost: 'mail.justconsignin.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUsername: 'support@justconsignin.com',
  fromEmail: 'support@justconsignin.com',
  fromName: 'JustConsignIn',
  notificationEmail: 'support@justconsignin.com',
  notificationRoutes: [{ id: 'demo-primary', eventKey: 'demo_request', recipientType: 'to', email: 'support@justconsignin.com', enabled: true }],
  password: '',
  hasPassword: false,
  updatedAt: null,
};

function normalizeRoute(route, index) {
  return {
    id: route?.id || `route-${index + 1}`,
    eventKey: route?.eventKey || 'demo_request',
    recipientType: route?.recipientType || 'to',
    email: route?.email || '',
    enabled: route?.enabled !== false,
  };
}

function normalize(settings) {
  if (!settings) return EMPTY;
  const storedRoutes = Array.isArray(settings.notification_routes) ? settings.notification_routes : [];
  const fallbackEmail = settings.notification_email || '';
  const notificationRoutes = storedRoutes.length
    ? storedRoutes.map(normalizeRoute)
    : fallbackEmail
      ? [{ id: 'demo-primary', eventKey: 'demo_request', recipientType: 'to', email: fallbackEmail, enabled: true }]
      : [defaultRoute()];

  return {
    enabled: settings.enabled !== false,
    provider: settings.provider || 'smtp',
    smtpHost: settings.smtp_host || 'mail.justconsignin.com',
    smtpPort: settings.smtp_port || 465,
    smtpSecure: settings.smtp_secure !== false,
    smtpUsername: settings.smtp_username || '',
    fromEmail: settings.smtp_from_email || '',
    fromName: settings.smtp_from_name || 'JustConsignIn',
    notificationEmail: fallbackEmail,
    notificationRoutes,
    password: '',
    hasPassword: Boolean(settings.has_password),
    updatedAt: settings.updated_at || null,
  };
}

export default function EmailSettingsForm() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const configured = useMemo(() => {
    const hasDemoTo = form.notificationRoutes.some(route => route.enabled && route.eventKey === 'demo_request' && route.recipientType === 'to' && route.email);
    return Boolean(form.smtpHost && form.smtpPort && form.smtpUsername && form.fromEmail && (form.hasPassword || form.password) && hasDemoTo);
  }, [form]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    setLoading(true);
    loadEmailSettings(accessToken)
      .then(settings => { if (active) setForm(normalize(settings)); })
      .catch(err => { if (active) setError(err?.message || 'Unable to load email settings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const updateRoute = (id, key, value) => setForm(current => ({
    ...current,
    notificationRoutes: current.notificationRoutes.map(route => route.id === id ? { ...route, [key]: value } : route),
  }));

  const addRoute = () => setForm(current => ({
    ...current,
    notificationRoutes: [...current.notificationRoutes, defaultRoute()],
  }));

  const removeRoute = id => setForm(current => ({
    ...current,
    notificationRoutes: current.notificationRoutes.filter(route => route.id !== id),
  }));

  const saveCurrent = async () => {
    const saved = await saveEmailSettings(accessToken, form);
    const normalized = normalize(saved);
    setForm(normalized);
    return normalized;
  };

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveCurrent();
      setSuccess('Email settings and routing saved securely.');
    } catch (err) {
      setError(err?.message || 'Unable to save email settings.');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setError('');
    setSuccess('');
    try {
      await saveCurrent();
      await sendEmailSettingsTest(accessToken);
      setSuccess('Test email sent using the saved Demo Requests routing.');
    } catch (err) {
      setError(err?.message || 'Unable to send test email.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="site-admin-card email-settings-loading">Loading email settings…</div>;

  return <div className="email-settings-layout">
    <form className="site-admin-card email-settings-form" onSubmit={submit}>
      <div className="email-settings-section-head">
        <div>
          <p className="site-admin-eyebrow">Outgoing mail</p>
          <h2>SMTP connection</h2>
          <p>Configure the mailbox this website uses to send notifications.</p>
        </div>
        <label className="email-settings-enabled">
          <input type="checkbox" checked={form.enabled} onChange={event => update('enabled', event.target.checked)} />
          <span>Email notifications enabled</span>
        </label>
      </div>

      {error && <div className="site-admin-alert error">{error}</div>}
      {success && <div className="site-admin-alert success">{success}</div>}

      <div className="email-settings-fields">
        <label>
          <span>Provider</span>
          <select value={form.provider} disabled><option value="smtp">SMTP</option></select>
          <small>SMTP is supported now. The feature is isolated so another provider can be added later.</small>
        </label>
        <label>
          <span>SMTP server</span>
          <input required value={form.smtpHost} onChange={event => update('smtpHost', event.target.value)} placeholder="mail.example.com" autoCapitalize="none" autoCorrect="off" />
        </label>
        <label>
          <span>Port</span>
          <input required type="number" min="1" max="65535" value={form.smtpPort} onChange={event => update('smtpPort', Number(event.target.value))} />
        </label>
        <label className="email-settings-checkbox-field">
          <span>Security</span>
          <span className="email-settings-checkbox-row"><input type="checkbox" checked={form.smtpSecure} onChange={event => update('smtpSecure', event.target.checked)} /> Use SSL/TLS</span>
          <small>HostPapa's recommended port 465 uses SSL/TLS.</small>
        </label>
        <label>
          <span>SMTP username</span>
          <input required type="email" value={form.smtpUsername} onChange={event => update('smtpUsername', event.target.value)} autoCapitalize="none" autoCorrect="off" />
        </label>
        <label>
          <span>SMTP password</span>
          <span className="email-password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={event => update('password', event.target.value)}
              placeholder={form.hasPassword ? 'Password is saved — leave blank to keep it' : 'Enter mailbox password'}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
            </button>
          </span>
          <small>The password is encrypted in Supabase Vault and is never displayed after saving.</small>
        </label>
      </div>

      <div className="email-settings-divider" />

      <div className="email-settings-section-head compact">
        <div>
          <p className="site-admin-eyebrow">Message identity</p>
          <h2>From address</h2>
        </div>
      </div>

      <div className="email-settings-fields">
        <label>
          <span>From name</span>
          <input required value={form.fromName} onChange={event => update('fromName', event.target.value)} placeholder="JustConsignIn" />
        </label>
        <label>
          <span>From email</span>
          <input required type="email" value={form.fromEmail} onChange={event => update('fromEmail', event.target.value)} autoCapitalize="none" autoCorrect="off" />
        </label>
      </div>

      <div className="email-settings-divider" />

      <div className="email-settings-section-head compact email-routing-head">
        <div>
          <p className="site-admin-eyebrow">Notification routing</p>
          <h2>Where website email goes</h2>
          <p>Add as many recipients as you need. Choose which website event they receive and whether they are To, CC or BCC.</p>
        </div>
        <button className="site-admin-btn secondary small" type="button" onClick={addRoute}><Plus size={15}/> Add recipient</button>
      </div>

      <div className="email-routing-list">
        {form.notificationRoutes.length === 0 && <div className="site-admin-note">Add at least one Demo Requests recipient using To.</div>}
        {form.notificationRoutes.map((route, index) => <div className="email-routing-row" key={route.id}>
          <span className="email-routing-number">{index + 1}</span>
          <label>
            <span>Receives</span>
            <select value={route.eventKey} onChange={event => updateRoute(route.id, 'eventKey', event.target.value)}>
              {EVENT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Delivery</span>
            <select value={route.recipientType} onChange={event => updateRoute(route.id, 'recipientType', event.target.value)}>
              {RECIPIENT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label className="email-routing-address">
            <span>Email address</span>
            <input required type="email" value={route.email} onChange={event => updateRoute(route.id, 'email', event.target.value)} placeholder="name@example.com" autoCapitalize="none" autoCorrect="off" />
          </label>
          <label className="email-routing-active"><span>Active</span><input type="checkbox" checked={route.enabled} onChange={event => updateRoute(route.id, 'enabled', event.target.checked)} /></label>
          <button className="email-routing-remove" type="button" onClick={() => removeRoute(route.id)} aria-label={`Remove recipient ${index + 1}`}><Trash2 size={17}/></button>
        </div>)}
      </div>

      <div className="email-settings-actions">
        <button className="site-admin-btn" type="submit" disabled={saving || testing}><Save size={16}/>{saving ? 'Saving…' : 'Save email settings'}</button>
        <button className="site-admin-btn secondary" type="button" onClick={test} disabled={!configured || saving || testing}><Send size={16}/>{testing ? 'Saving & sending…' : 'Save & send test email'}</button>
      </div>
    </form>

    <aside className="email-settings-side">
      <div className="site-admin-card email-settings-status-card">
        <span className={`email-settings-status-icon ${configured ? 'ready' : ''}`}>{configured ? <MailCheck size={22}/> : <ShieldCheck size={22}/>}</span>
        <h3>{configured ? 'Email is configured' : 'Finish email setup'}</h3>
        <p>{configured ? 'SMTP and at least one Demo Requests To recipient are configured.' : 'Enter the mailbox password and add an enabled Demo Requests To recipient.'}</p>
        <div className="email-settings-status-list">
          <span><CheckCircle2 size={15}/> SMTP settings managed in the admin</span>
          <span><CheckCircle2 size={15}/> Password protected by Supabase Vault</span>
          <span><CheckCircle2 size={15}/> Multiple To / CC / BCC recipients supported</span>
          <span><CheckCircle2 size={15}/> Routing is reusable for future website forms</span>
        </div>
      </div>
      <div className="site-admin-note">
        <strong>Template rule</strong><br/>
        For another website, configure the sending mailbox and routing here. The form and mail-delivery code do not need to be rewritten.
      </div>
    </aside>
  </div>;
}
