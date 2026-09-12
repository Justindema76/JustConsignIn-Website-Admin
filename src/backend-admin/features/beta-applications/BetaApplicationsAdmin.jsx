import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clipboard, ExternalLink, Handshake, Mail, Phone, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { deleteBetaApplication, loadBetaApplications, updateBetaApplication } from './betaApplications.service';

const STATUS_OPTIONS = [
  ['new', 'New'],
  ['reviewing', 'Reviewing'],
  ['contacted', 'Contacted'],
  ['demo', 'Demo'],
  ['accepted', 'Accepted'],
  ['waitlist', 'Waitlist'],
  ['installed', 'Installed'],
  ['active', 'Active'],
  ['completed', 'Completed'],
  ['declined', 'Declined'],
];

const PARTNER_BASE_URL = 'https://www.justconsignin.com/partner-program';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function statusLabel(status) {
  return STATUS_OPTIONS.find(([key]) => key === status)?.[1] || status || 'New';
}

function companySource(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

function buildInviteLink(companyName) {
  const company = String(companyName || '').trim();
  if (!company) return '';
  const params = new URLSearchParams({
    invite: '1',
    business: company,
    source: companySource(company),
  });
  return `${PARTNER_BASE_URL}?${params.toString()}`;
}

export default function BetaApplicationsAdmin() {
  const { accessToken } = useAuth();
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draftStatus, setDraftStatus] = useState('new');
  const [draftNotes, setDraftNotes] = useState('');
  const [inviteCompany, setInviteCompany] = useState('');

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await loadBetaApplications(accessToken);
      setApplications(rows);
      setSelectedId(current => current && rows.some(row => row.id === current) ? current : (rows[0]?.id || ''));
    } catch (err) {
      setError(err.message || 'Unable to load partner applications.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return applications.filter(application => {
      if (statusFilter === 'active' && ['completed', 'declined'].includes(application.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'active' && application.status !== statusFilter) return false;
      if (!needle) return true;
      return [application.first_name, application.last_name, application.business_name, application.email, application.phone, application.shopify_status, application.current_system, application.biggest_problem, application.source_tag]
        .filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [applications, query, statusFilter]);

  const selected = applications.find(application => application.id === selectedId) || filtered[0] || null;

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setDraftStatus(selected.status || 'new');
    setDraftNotes(selected.admin_notes || '');
    setSuccess('');
  }, [selected?.id, selected?.status, selected?.admin_notes]);

  const counts = useMemo(() => ({
    total: applications.length,
    new: applications.filter(item => item.status === 'new').length,
    accepted: applications.filter(item => ['accepted', 'installed', 'active'].includes(item.status)).length,
    active: applications.filter(item => item.status === 'active').length,
  }), [applications]);

  const inviteLink = buildInviteLink(inviteCompany);

  async function copyInviteLink(companyName = inviteCompany) {
    const link = buildInviteLink(companyName);
    if (!link) {
      setError('Enter the company name first.');
      return;
    }
    setError('');
    try {
      await navigator.clipboard.writeText(link);
      setSuccess(`Invite link copied for ${String(companyName).trim()}.`);
    } catch {
      window.prompt('Copy this partner invite link:', link);
    }
  }

  async function save() {
    if (!selected || !accessToken) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateBetaApplication(accessToken, { id: selected.id, status: draftStatus, adminNotes: draftNotes });
      setApplications(rows => rows.map(row => row.id === updated.id ? updated : row));
      setSuccess('Partner application updated.');
    } catch (err) {
      setError(err.message || 'Unable to save partner application.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected || !accessToken || deleting) return;
    if (!window.confirm(`Permanently delete the application from ${selected.business_name || 'this store'}? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await deleteBetaApplication(accessToken, selected.id);
      const remaining = applications.filter(row => row.id !== selected.id);
      setApplications(remaining);
      setSelectedId(remaining[0]?.id || '');
      setSuccess('Partner application deleted.');
    } catch (err) {
      setError(err.message || 'Unable to delete partner application.');
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Founding Partner Program</p>
        <h1>Beta Partners</h1>
        <p>Track applications, outreach sources, acceptance, installation and active beta partners.</p>
      </div>
      <div className="beta-admin-head-actions">
        <a className="site-admin-btn secondary" href={PARTNER_BASE_URL} target="_blank" rel="noreferrer">Open Partner Program <ExternalLink size={14}/></a>
        <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {success && <div className="site-admin-alert success">{success}</div>}

    <section className="site-admin-card beta-partner-link-card">
      <div>
        <p className="site-admin-eyebrow">Company invite</p>
        <h2>Generate a Partner Program link</h2>
        <p>Type the company name exactly as you know it. The admin creates the tracking code automatically and copies a personalized invitation link for your email.</p>
      </div>
      <div className="beta-partner-link-controls">
        <input value={inviteCompany} onChange={event => setInviteCompany(event.target.value)} placeholder="Company name" aria-label="Company name for partner invitation" />
        {inviteLink && <code>{inviteLink}</code>}
        <button className="site-admin-btn" type="button" onClick={() => copyInviteLink()}><Clipboard size={14}/> Generate & Copy Invite Link</button>
      </div>
    </section>

    <div className="demo-request-stats">
      <div className="site-admin-card"><span>New</span><strong>{counts.new}</strong></div>
      <div className="site-admin-card"><span>Accepted+</span><strong>{counts.accepted}</strong></div>
      <div className="site-admin-card"><span>Active Testers</span><strong>{counts.active}</strong></div>
      <div className="site-admin-card"><span>Total</span><strong>{counts.total}</strong></div>
    </div>

    <div className="site-admin-toolbar demo-request-toolbar">
      <label className="site-admin-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search store, owner, email, workflow or source" /></label>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter partner applications by status">
        <option value="active">Open / active</option>
        <option value="all">All</option>
        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>

    {loading ? <div className="site-admin-card site-admin-empty large"><p>Loading partner applications…</p></div> : applications.length === 0 ? <div className="site-admin-card site-admin-empty large"><Handshake size={30}/><h2>No partner applications yet</h2><p>Generate a company invite link above and paste it into your outreach email. Submitted applications will appear here.</p></div> : <div className="demo-request-admin-grid">
      <section className="site-admin-card demo-request-list" aria-label="Partner application list">
        {filtered.length === 0 ? <div className="site-admin-empty">No applications match this filter.</div> : filtered.map(application => <button key={application.id} type="button" className={`demo-request-row${application.id === selected?.id ? ' selected' : ''}`} onClick={() => setSelectedId(application.id)}>
          <div className="demo-request-row-main">
            <strong>{application.business_name}</strong>
            <span>{application.first_name} {application.last_name}</span>
            <small>{application.source_tag ? `Source: ${application.source_tag}` : application.email}</small>
          </div>
          <div className="demo-request-row-meta">
            <span className={`demo-request-status ${application.status || 'new'}`}>{statusLabel(application.status)}</span>
            <small>{formatDate(application.created_at)}</small>
          </div>
        </button>)}
      </section>

      <section className="site-admin-card demo-request-detail">
        {!selected ? <div className="site-admin-empty">Choose an application.</div> : <>
          <div className="demo-request-detail-head">
            <div><p className="site-admin-eyebrow">{statusLabel(selected.status)}</p><h2>{selected.business_name}</h2><p>{selected.first_name} {selected.last_name}</p></div>
            <span className={`demo-request-status ${selected.status || 'new'}`}>{statusLabel(selected.status)}</span>
          </div>

          <div className="demo-request-contact-actions">
            <a className="site-admin-btn" href={`mailto:${selected.email}`}><Mail size={14}/> Email {selected.first_name || 'Store'}</a>
            <button className="site-admin-btn secondary" type="button" onClick={() => copyInviteLink(selected.business_name)}><Clipboard size={14}/> Copy Invite Link</button>
            {selected.phone && <a className="site-admin-btn secondary" href={`tel:${selected.phone}`}><Phone size={14}/> Call</a>}
            {selected.business_website && <a className="site-admin-btn secondary" href={selected.business_website} target="_blank" rel="noreferrer">Website <ExternalLink size={14}/></a>}
            <button className="site-admin-btn danger demo-request-delete" type="button" onClick={remove} disabled={deleting}><Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete'}</button>
          </div>

          <div className="beta-application-detail-grid">
            <div><span>Email</span><strong>{selected.email}</strong></div>
            <div><span>Shopify setup</span><strong>{selected.shopify_status || '—'}</strong></div>
            <div><span>Monthly volume</span><strong>{selected.monthly_item_volume || '—'}</strong></div>
            <div><span>Source</span><strong>{selected.source_tag || selected.utm_source || 'Direct'}</strong></div>
            <div><span>Shopify store</span><strong>{selected.shopify_store_url || '—'}</strong></div>
            <div><span>Marketing opt-in</span><strong>{selected.marketing_consent ? 'Yes' : 'No'}</strong></div>
          </div>

          <div className="beta-application-copy-block"><span>Current consignment system</span><p>{selected.current_system || 'Not provided'}</p></div>
          <div className="beta-application-copy-block"><span>Biggest problem</span><p>{selected.biggest_problem || 'Not provided'}</p></div>
          <div className="beta-application-copy-block"><span>What they want from the beta</span><p>{selected.beta_goal || 'Not provided'}</p></div>

          <div className="demo-request-admin-edit">
            <label>Status<select value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>Private notes<textarea value={draftNotes} onChange={event => setDraftNotes(event.target.value)} placeholder="What did they say? What needs follow-up? Any workflow requirements?" /></label>
            <button className="site-admin-btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Partner'}</button>
          </div>

          <div className="beta-application-timeline">
            <span>Applied: {formatDate(selected.created_at)}</span>
            <span>Contacted: {formatDate(selected.contacted_at)}</span>
            <span>Accepted: {formatDate(selected.accepted_at)}</span>
            <span>Installed: {formatDate(selected.installed_at)}</span>
            <span>Notification: {selected.email_notified_at ? `sent ${formatDate(selected.email_notified_at)}` : (selected.email_notification_error || 'not sent yet')}</span>
          </div>
        </>}
      </section>
    </div>}
  </>;
}
