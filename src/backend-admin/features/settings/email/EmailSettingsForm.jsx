import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, MailCheck, Save, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../auth/AdminAuthContext';
import { loadEmailSettings, saveEmailSettings, sendEmailSettingsTest } from './emailSettings.service';

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
  password: '',
  hasPassword: false,
  updatedAt: null,
};

function normalize(settings) {
  if (!settings) return EMPTY;
  return {
    enabled: settings.enabled !== false,
    provider: settings.provider || 'smtp',
    smtpHost: settings.smtp_host || 'mail.justconsignin.com',
    smtpPort: settings.smtp_port || 465,
    smtpSecure: settings.smtp_secure !== false,
    smtpUsername: settings.smtp_username || '',
    fromEmail: settings.smtp_from_email || '',
    fromName: settings.smtp_from_name || 'JustConsignIn',
    notificationEmail: settings.notification_email || '',
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

  const configured = useMemo(() => Boolean(
    form.smtpHost && form.smtpPort && form.smtpUsername && form.fromEmail && form.notificationEmail && form.hasPassword
  ), [form]);

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

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await saveEmailSettings(accessToken, form);
      setForm(normalize(saved));
      setSuccess('Email settings saved securely.');
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
      await sendEmailSettingsTest(accessToken);
      setSuccess(`Test email sent to ${form.notificationEmail}.`);
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
          <p>Use the mail server settings supplied by the website owner's email provider.</p>
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
          <small>SMTP is supported now. Other providers can be added later without changing this form structure.</small>
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
          <h2>From and notification addresses</h2>
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
        <label className="wide">
          <span>Send demo-request notifications to</span>
          <input required type="email" value={form.notificationEmail} onChange={event => update('notificationEmail', event.target.value)} autoCapitalize="none" autoCorrect="off" />
          <small>This is the inbox that receives new Request a Free Demo notifications.</small>
        </label>
      </div>

      <div className="email-settings-actions">
        <button className="site-admin-btn" type="submit" disabled={saving || testing}><Save size={16}/>{saving ? 'Saving…' : 'Save email settings'}</button>
        <button className="site-admin-btn secondary" type="button" onClick={test} disabled={!configured || saving || testing}><Send size={16}/>{testing ? 'Sending test…' : 'Send test email'}</button>
      </div>
    </form>

    <aside className="email-settings-side">
      <div className="site-admin-card email-settings-status-card">
        <span className={`email-settings-status-icon ${configured ? 'ready' : ''}`}>{configured ? <MailCheck size={22}/> : <ShieldCheck size={22}/>}</span>
        <h3>{configured ? 'Email is configured' : 'Finish email setup'}</h3>
        <p>{configured ? 'The mail server details and password are saved. Use Send test email to verify delivery.' : 'Enter the mailbox password and save the settings before sending notifications.'}</p>
        <div className="email-settings-status-list">
          <span><CheckCircle2 size={15}/> SMTP settings stored in the admin</span>
          <span><CheckCircle2 size={15}/> Password protected by Supabase Vault</span>
          <span><CheckCircle2 size={15}/> Demo requests remain saved even if email fails</span>
        </div>
      </div>
      <div className="site-admin-note">
        <strong>Template rule</strong><br/>
        For another website, change these values here. Do not hard-code a mailbox password into the repository or Vercel project.
      </div>
    </aside>
  </div>;
}
