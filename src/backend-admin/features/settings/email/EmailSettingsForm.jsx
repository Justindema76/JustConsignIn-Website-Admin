import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, MailCheck, Plus, Save, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../../auth/AdminAuthContext';
import { getAdminSiteKey } from '../../../services/siteAdminService';
import { loadEmailSettings, saveEmailSettings, sendEmailSettingsTest } from './emailSettings.service';

const SITE_PROFILES = {
  justconsignin: {
    label: 'JustConsignIn',
    smtpHost: 'mail.justconsignin.com',
    smtpUsername: 'support@justconsignin.com',
    fromEmail: 'support@justconsignin.com',
    fromName: 'JustConsignIn',
    primaryEvent: 'demo_request',
    primaryEventLabel: 'Demo Requests',
    routeId: 'demo-primary',
    events: [
      ['demo_request', 'Demo Requests'],
      ['beta_application', 'Beta Applications'],
      ['contact', 'Contact Form'],
      ['all', 'All website notifications'],
    ],
  },
  justindematteis: {
    label: 'Justin DeMatteis',
    smtpHost: 'sh-cp11.yyz2.servername.online',
    smtpUsername: 'justin@justindematteis.com',
    fromEmail: 'justin@justindematteis.com',
    fromName: 'Justin DeMatteis',
    primaryEvent: 'service_request',
    primaryEventLabel: 'Service Requests',
    routeId: 'service-primary',
    events: [
      ['service_request', 'Service Requests'],
      ['contact', 'Contact Form'],
      ['all', 'All website notifications'],
    ],
  },
};

const RECIPIENT_OPTIONS = [
  ['to', 'To'],
  ['cc', 'CC'],
  ['bcc', 'BCC'],
];

const newRouteId = () => globalThis.crypto?.randomUUID?.() || `route-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function profileFor(siteKey) {
  return SITE_PROFILES[siteKey] || SITE_PROFILES.justconsignin;
}

function defaultRoute(siteKey) {
  const profile = profileFor(siteKey);
  return {
    id: newRouteId(),
    eventKey: profile.primaryEvent,
    recipientType: 'to',
    email: '',
    enabled: true,
  };
}

function emptyForSite(siteKey) {
  const profile = profileFor(siteKey);
  return {
    enabled: true,
    provider: 'smtp',
    smtpHost: profile.smtpHost,
    smtpPort: 465,
    smtpSecure: true,
    smtpUsername: profile.smtpUsername,
    fromEmail: profile.fromEmail,
    fromName: profile.fromName,
    notificationEmail: profile.fromEmail,
    notificationRoutes: [{
      id: profile.routeId,
      eventKey: profile.primaryEvent,
      recipientType: 'to',
      email: profile.fromEmail,
      enabled: true,
    }],
    password: '',
    hasPassword: false,
    updatedAt: null,
  };
}

function normalizeRoute(route, index, siteKey) {
  const profile = profileFor(siteKey);
  return {
    id: route?.id || `route-${index + 1}`,
    eventKey: route?.eventKey || profile.primaryEvent,
    recipientType: route?.recipientType || 'to',
    email: route?.email || '',
    enabled: route?.enabled !== false,
  };
}

function normalize(settings, siteKey) {
  const profile = profileFor(siteKey);
  const empty = emptyForSite(siteKey);
  if (!settings) return empty;

  const storedRoutes = Array.isArray(settings.notification_routes) ? settings.notification_routes : [];
  const fallbackEmail = settings.notification_email || '';
  const notificationRoutes = storedRoutes.length
    ? storedRoutes.map((route, index) => normalizeRoute(route, index, siteKey))
    : fallbackEmail
      ? [{
          id: profile.routeId,
          eventKey: profile.primaryEvent,
          recipientType: 'to',
          email: fallbackEmail,
          enabled: true,
        }]
      : [defaultRoute(siteKey)];

  return {
    enabled: settings.enabled !== false,
    provider: settings.provider || 'smtp',
    smtpHost: settings.smtp_host || profile.smtpHost,
    smtpPort: settings.smtp_port || 465,
    smtpSecure: settings.smtp_secure !== false,
    smtpUsername: settings.smtp_username || profile.smtpUsername,
    fromEmail: settings.smtp_from_email || profile.fromEmail,
    fromName: settings.smtp_from_name || profile.fromName,
    notificationEmail: fallbackEmail || profile.fromEmail,
    notificationRoutes,
    password: '',
    hasPassword: Boolean(settings.has_password),
    updatedAt: settings.updated_at || null,
  };
}

export default function EmailSettingsForm() {
  const { accessToken } = useAuth();
  const siteKey = getAdminSiteKey();
  const profile = profileFor(siteKey);
  const eventOptions = profile.events;
  const [form, setForm] = useState(() => emptyForSite(siteKey));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const configured = useMemo(() => {
    const hasPrimaryTo = form.notificationRoutes.some(
      route => route.enabled
        && route.eventKey === profile.primaryEvent
        && route.recipientType === 'to'
        && route.email,
    );
    return Boolean(
      form.smtpHost
      && form.smtpPort
      && form.smtpUsername
      && form.fromEmail
      && (form.hasPassword || form.password)
      && hasPrimaryTo
    );
  }, [form, profile.primaryEvent]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    setLoading(true);
    setError('');
    setSuccess('');
    setForm(emptyForSite(siteKey));

    loadEmailSettings(accessToken, siteKey)
      .then(settings => { if (active) setForm(normalize(settings, siteKey)); })
      .catch(err => { if (active) setError(err?.message || 'Unable to load email settings.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [accessToken, siteKey]);

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const updateRoute = (id, key, value) => setForm(current => ({
    ...current,
    notificationRoutes: current.notificationRoutes.map(route => route.id === id ? { ...route, [key]: value } : route),
  }));

  const addRoute = () => setForm(current => ({
    ...current,
    notificationRoutes: [...current.notificationRoutes, defaultRoute(siteKey)],
  }));

  const removeRoute = id => setForm(current => ({
    ...current,
    notificationRoutes: current.notificationRoutes.filter(route => route.id !== id),
  }));

  const saveCurrent = async () => {
    const saved = await saveEmailSettings(accessToken, form, siteKey);
    const normalized = normalize(saved, siteKey);
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
      setSuccess(`${profile.label} email settings and routing saved securely.`);
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
      await sendEmailSettingsTest(accessToken, siteKey);
      setSuccess(`Test email sent using the saved ${profile.primaryEventLabel} routing.`);
    } catch (err) {
      setError(err?.message || 'Unable to send test email.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="site-admin-card email-settings-loading">Loading {profile.label} email settings…</div>;

  return <div className="email-settings-layout">
    <form className="site-admin-card email-settings-form" onSubmit={submit}>
      <div className="email-settings-section-head">
        <div>
          <p className="site-admin-eyebrow">Outgoing mail</p>
          <h2>SMTP connection</h2>
          <p>Configure the mailbox {profile.label} uses to send notifications.</p>
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
          <input required value={form.fromName} onChange={event => update('fromName', event.target.value)} placeholder={profile.fromName} />
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
        {form.notificationRoutes.length === 0 && <div className="site-admin-note">Add at least one {profile.primaryEventLabel} recipient using To.</div>}
        {form.notificationRoutes.map((route, index) => <div className="email-routing-row" key={route.id}>
          <span className="email-routing-number">{index + 1}</span>
          <label>
            <span>Receives</span>
            <select value={route.eventKey} onChange={event => updateRoute(route.id, 'eventKey', event.target.value)}>
              {eventOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
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
            <input type="email" value={route.email} onChange={event => updateRoute(route.id, 'email', event.target.value)} placeholder="name@example.com" autoCapitalize="none" autoCorrect="off" />
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
        <p>{configured
          ? `SMTP and at least one ${profile.primaryEventLabel} To recipient are configured.`
          : `Enter the mailbox password and add an enabled ${profile.primaryEventLabel} To recipient.`}</p>
        <div className="email-settings-status-list">
          <span><CheckCircle2 size={15}/> SMTP settings managed separately for {profile.label}</span>
          <span><CheckCircle2 size={15}/> Password protected by Supabase Vault</span>
          <span><CheckCircle2 size={15}/> Multiple To / CC / BCC recipients supported</span>
          <span><CheckCircle2 size={15}/> Routing stays separate from the other website</span>
        </div>
      </div>
      <div className="site-admin-note">
        <strong>{profile.label} mailbox</strong><br/>
        These settings apply only while the {profile.label} website is selected in Website Admin.
      </div>
    </aside>
  </div>;
}
