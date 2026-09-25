import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Inbox, Mail, Phone, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import DemoRequestEmailComposer from '../demo-requests/components/DemoRequestEmailComposer';
import DemoRequestEmailHistory from '../demo-requests/components/DemoRequestEmailHistory';
import {
  deleteServiceRequest,
  loadServiceRequestEmails,
  loadServiceRequests,
  sendServiceRequestEmail,
  updateServiceRequest,
} from './serviceRequests.service';

const STATUS_OPTIONS = [
  ['new', 'New'],
  ['reviewing', 'Reviewing'],
  ['contacted', 'Contacted'],
  ['discovery', 'Discovery'],
  ['proposal_sent', 'Proposal Sent'],
  ['accepted', 'Accepted'],
  ['in_progress', 'In Progress'],
  ['complete', 'Complete'],
  ['declined', 'Declined'],
  ['spam', 'Spam'],
];

const SERVICE_LABELS = {
  website_wordpress: 'Website / WordPress',
  wordpress_plugin: 'Custom WordPress Plugin',
  shopify_ecommerce: 'Shopify / Ecommerce',
  ai_automation: 'AI Automation',
  api_integration: 'API Integration',
  custom_web_app: 'Custom Web App',
  seo_digital: 'SEO / Digital Marketing',
  other: 'Other / Discovery',
  not_sure: 'Not sure yet',
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function statusLabel(status) {
  return STATUS_OPTIONS.find(([key]) => key === status)?.[1] || status || 'New';
}

function serviceLabel(value) {
  return SERVICE_LABELS[value] || value || 'Other / Discovery';
}

function priorityLabel(value) {
  return String(value || 'normal').toUpperCase();
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there';
}

const serviceStarterMessage = name => `Hi ${name || 'there'},\n\nThanks for reaching out about your project. I reviewed your request and wanted to follow up.\n\n`;

export default function ServiceRequestsAdmin() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draftStatus, setDraftStatus] = useState('new');
  const [draftNotes, setDraftNotes] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await loadServiceRequests(accessToken);
      setRequests(rows);
      setSelectedId(current => current && rows.some(row => row.id === current) ? current : (rows[0]?.id || ''));
    } catch (err) {
      setError(err.message || 'Unable to load service requests.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter(request => {
      if (statusFilter === 'active' && ['complete', 'declined', 'spam'].includes(request.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'active' && request.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && request.ai_primary_service !== serviceFilter && request.requested_service !== serviceFilter) return false;
      if (!needle) return true;
      return [
        request.name,
        request.company,
        request.email,
        request.phone,
        request.website,
        request.requested_service,
        request.ai_primary_service,
        request.ai_summary,
        request.message,
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [requests, query, statusFilter, serviceFilter]);

  const selected = requests.find(request => request.id === selectedId) || filtered[0] || null;

  useEffect(() => {
    if (!selected) {
      setEmails([]);
      return;
    }
    setSelectedId(selected.id);
    setDraftStatus(selected.status || 'new');
    setDraftNotes(selected.admin_notes || '');
    setEmailOpen(false);
    setSuccess('');
  }, [selected?.id, selected?.status, selected?.admin_notes]);

  const refreshEmails = useCallback(async requestId => {
    if (!accessToken || !requestId) {
      setEmails([]);
      return;
    }
    setEmailsLoading(true);
    try {
      const rows = await loadServiceRequestEmails(accessToken, requestId);
      setEmails(rows);
    } catch (err) {
      setError(err?.message || 'Unable to load email history.');
    } finally {
      setEmailsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (selected?.id) refreshEmails(selected.id);
    else setEmails([]);
  }, [selected?.id, refreshEmails]);

  const counts = useMemo(() => ({
    total: requests.length,
    new: requests.filter(request => request.status === 'new').length,
    active: requests.filter(request => !['complete', 'declined', 'spam'].includes(request.status)).length,
    accepted: requests.filter(request => ['accepted', 'in_progress', 'complete'].includes(request.status)).length,
  }), [requests]);

  const save = async () => {
    if (!selected || !accessToken) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateServiceRequest(accessToken, {
        id: selected.id,
        status: draftStatus,
        adminNotes: draftNotes,
      });
      setRequests(rows => rows.map(row => row.id === updated.id ? updated : row));
      setSuccess('Service request updated.');
    } catch (err) {
      setError(err.message || 'Unable to save service request.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSent = payload => {
    if (payload?.email) setEmails(current => [payload.email, ...current.filter(item => item.id !== payload.email.id)]);
    if (payload?.request && selected) {
      setRequests(rows => rows.map(row => row.id === selected.id ? { ...row, ...payload.request } : row));
      setDraftStatus(payload.request.status || draftStatus);
    }
    setEmailOpen(false);
    setSuccess(`Email sent to ${selected?.email || 'customer'}.`);
  };

  const remove = async () => {
    if (!selected || !accessToken || deleting) return;
    const label = selected.company || selected.name || 'this request';
    if (!window.confirm(`Permanently delete ${label}?\n\nThis also deletes its email history. This cannot be undone.`)) return;

    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await deleteServiceRequest(accessToken, selected.id);
      const remaining = requests.filter(row => row.id !== selected.id);
      setRequests(remaining);
      setSelectedId(remaining[0]?.id || '');
      setEmails([]);
      setEmailOpen(false);
      setSuccess('Service request deleted.');
    } catch (err) {
      setError(err?.message || 'Unable to delete service request.');
    } finally {
      setDeleting(false);
    }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Leads</p>
        <h1>Service Requests</h1>
        <p>Website, WordPress, Shopify, development, API and AI automation enquiries from JustinDeMatteis.com.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {success && <div className="site-admin-alert success">{success}</div>}

    <div className="demo-request-stats">
      <div className="site-admin-card"><span>New</span><strong>{counts.new}</strong></div>
      <div className="site-admin-card"><span>Active</span><strong>{counts.active}</strong></div>
      <div className="site-admin-card"><span>Accepted+</span><strong>{counts.accepted}</strong></div>
      <div className="site-admin-card"><span>Total</span><strong>{counts.total}</strong></div>
    </div>

    <div className="site-admin-toolbar demo-request-toolbar">
      <label className="site-admin-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, company, email, service or message" /></label>
      <select value={serviceFilter} onChange={event => setServiceFilter(event.target.value)} aria-label="Filter by service">
        <option value="all">All services</option>
        {Object.entries(SERVICE_LABELS).filter(([key]) => key !== 'not_sure').map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status">
        <option value="active">Open / active</option>
        <option value="all">All</option>
        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>

    {loading ? <div className="site-admin-card site-admin-empty large"><p>Loading service requests…</p></div> : requests.length === 0 ? <div className="site-admin-card site-admin-empty large"><Inbox size={28}/><h2>No service requests yet</h2><p>When someone submits the portfolio service form, the request will appear here.</p></div> : <div className="demo-request-admin-grid">
      <section className="site-admin-card demo-request-list" aria-label="Service request list">
        {filtered.length === 0 ? <div className="site-admin-empty">No requests match this filter.</div> : filtered.map(request => <button key={request.id} type="button" className={`demo-request-row${request.id === selected?.id ? ' selected' : ''}`} onClick={() => setSelectedId(request.id)}>
          <div className="demo-request-row-main">
            <strong>{request.company || request.name}</strong>
            <span>{request.company ? request.name : serviceLabel(request.ai_primary_service || request.requested_service)}</span>
            <small>{serviceLabel(request.ai_primary_service || request.requested_service)} · {request.email}</small>
          </div>
          <div className="demo-request-row-meta">
            <span className={`service-request-priority ${request.ai_priority || 'normal'}`}>{priorityLabel(request.ai_priority)}</span>
            <span className={`demo-request-status ${request.status || 'new'}`}>{statusLabel(request.status)}</span>
            <small>{formatDate(request.created_at)}</small>
          </div>
        </button>)}
      </section>

      <section className="site-admin-card demo-request-detail">
        {!selected ? <div className="site-admin-empty">Choose a request.</div> : <>
          <div className="demo-request-detail-head">
            <div>
              <p className="site-admin-eyebrow">{statusLabel(selected.status)}</p>
              <h2>{selected.company || selected.name}</h2>
              <p>{selected.company ? selected.name : selected.email}</p>
            </div>
            <span className={`demo-request-status ${selected.status || 'new'}`}>{statusLabel(selected.status)}</span>
          </div>

          <div className="demo-request-contact-actions">
            <button className="site-admin-btn" type="button" onClick={() => setEmailOpen(open => !open)}><Mail size={14}/> {emailOpen ? 'Close Email' : `Email ${firstName(selected.name)}`}</button>
            {selected.phone && <a className="site-admin-btn secondary" href={`tel:${selected.phone}`}><Phone size={14}/> Call</a>}
            {selected.website && <a className="site-admin-btn secondary" href={selected.website} target="_blank" rel="noreferrer">Website <ExternalLink size={14}/></a>}
            <button className="site-admin-btn danger demo-request-delete" type="button" onClick={remove} disabled={deleting}><Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete'}</button>
          </div>

          {emailOpen && <DemoRequestEmailComposer
            request={selected}
            accessToken={accessToken}
            onCancel={() => setEmailOpen(false)}
            onSent={handleEmailSent}
            sendEmail={sendServiceRequestEmail}
            subjectText="Your project request"
            starterMessage={serviceStarterMessage}
            recipientName={firstName(selected.name)}
            savedToLabel="this service request"
          />}

          <section className="service-request-ai-card">
            <div className="service-request-ai-head">
              <div>
                <p className="site-admin-eyebrow">AI routing</p>
                <h3>{serviceLabel(selected.ai_primary_service)}</h3>
              </div>
              <span className={`service-request-priority ${selected.ai_priority || 'normal'}`}>{priorityLabel(selected.ai_priority)}</span>
            </div>
            {Array.isArray(selected.ai_secondary_services) && selected.ai_secondary_services.length > 0 && <div className="service-request-ai-tags">
              {selected.ai_secondary_services.map(service => <span key={service}>{serviceLabel(service)}</span>)}
            </div>}
            <p>{selected.ai_summary || 'No AI summary yet.'}</p>
            <small>Confidence: {Math.round(Number(selected.ai_confidence || 0) * 100)}% · {selected.ai_provider || 'rules'}{selected.ai_model ? ` · ${selected.ai_model}` : ''}</small>
          </section>

          <dl className="demo-request-details">
            <div><dt>Email</dt><dd>{selected.email}</dd></div>
            <div><dt>Phone</dt><dd>{selected.phone || '—'}</dd></div>
            <div><dt>Requested service</dt><dd>{serviceLabel(selected.requested_service)}</dd></div>
            <div><dt>Routed queue</dt><dd>{serviceLabel(selected.routed_queue)}</dd></div>
            <div><dt>Budget</dt><dd>{selected.budget_range || 'Not provided'}</dd></div>
            <div><dt>Timeline</dt><dd>{selected.timeline || 'Not provided'}</dd></div>
            <div><dt>Submitted</dt><dd>{formatDate(selected.created_at)}</dd></div>
            <div><dt>Campaign</dt><dd>{selected.utm_campaign || selected.utm_source || 'Direct / unknown'}</dd></div>
            <div className="wide"><dt>Project request</dt><dd>{selected.message || 'No message provided.'}</dd></div>
            <div><dt>Source page</dt><dd>{selected.source_path || '—'}</dd></div>
            <div><dt>Referrer</dt><dd>{selected.referrer || '—'}</dd></div>
          </dl>

          <div className="demo-request-workflow">
            <label>Status<select value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="wide">Admin notes<textarea rows="5" value={draftNotes} onChange={event => setDraftNotes(event.target.value)} placeholder="Discovery notes, follow-up, requirements, proposal details…" /></label>
            <div className="wide demo-request-save"><button className="site-admin-btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Request'}</button></div>
          </div>

          <DemoRequestEmailHistory emails={emails} loading={emailsLoading} />
        </>}
      </section>
    </div>}
  </>;
}
