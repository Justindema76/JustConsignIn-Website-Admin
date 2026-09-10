import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Inbox, Mail, Phone, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import DemoRequestEmailComposer from './components/DemoRequestEmailComposer';
import DemoRequestEmailHistory from './components/DemoRequestEmailHistory';
import {
  deleteDemoRequest,
  loadDemoRequestEmails,
  loadDemoRequests,
  updateDemoRequest,
} from './demoRequests.service';

const STATUS_OPTIONS = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['scheduled', 'Scheduled'],
  ['completed', 'Completed'],
  ['archived', 'Archived'],
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function localDateTimeValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function statusLabel(status) {
  return STATUS_OPTIONS.find(([key]) => key === status)?.[1] || status || 'New';
}

export default function DemoRequestsAdmin() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState([]);
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
  const [draftScheduledAt, setDraftScheduledAt] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await loadDemoRequests(accessToken);
      setRequests(rows);
      setSelectedId(current => current && rows.some(row => row.id === current) ? current : (rows[0]?.id || ''));
    } catch (err) {
      setError(err.message || 'Unable to load demo requests.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter(request => {
      if (statusFilter === 'active' && request.status === 'archived') return false;
      if (statusFilter !== 'all' && statusFilter !== 'active' && request.status !== statusFilter) return false;
      if (!needle) return true;
      return [request.first_name, request.last_name, request.business_name, request.email, request.phone, request.shopify_status, request.interest, request.message]
        .filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [requests, query, statusFilter]);

  const selected = requests.find(request => request.id === selectedId) || filtered[0] || null;

  useEffect(() => {
    if (!selected) {
      setEmails([]);
      return;
    }
    setSelectedId(selected.id);
    setDraftStatus(selected.status || 'new');
    setDraftNotes(selected.admin_notes || '');
    setDraftScheduledAt(localDateTimeValue(selected.scheduled_at));
    setSuccess('');
    setEmailOpen(false);
  }, [selected?.id, selected?.status, selected?.admin_notes, selected?.scheduled_at]);

  const refreshEmails = useCallback(async requestId => {
    if (!accessToken || !requestId) {
      setEmails([]);
      return;
    }
    setEmailsLoading(true);
    try {
      const rows = await loadDemoRequestEmails(accessToken, requestId);
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
    active: requests.filter(request => !['completed', 'archived'].includes(request.status)).length,
    completed: requests.filter(request => request.status === 'completed').length,
  }), [requests]);

  const save = async () => {
    if (!selected || !accessToken) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateDemoRequest(accessToken, {
        id: selected.id,
        status: draftStatus,
        adminNotes: draftNotes,
        scheduledAt: draftScheduledAt ? new Date(draftScheduledAt).toISOString() : null,
      });
      setRequests(rows => rows.map(row => row.id === updated.id ? updated : row));
      setSuccess('Demo request updated.');
    } catch (err) {
      setError(err.message || 'Unable to save demo request.');
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
    const label = selected.business_name || `${selected.first_name || ''} ${selected.last_name || ''}`.trim() || 'this request';
    const confirmed = window.confirm(`Permanently delete ${label}?\n\nThis also deletes the email history attached to this demo request. This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await deleteDemoRequest(accessToken, selected.id);
      const remaining = requests.filter(row => row.id !== selected.id);
      setRequests(remaining);
      setSelectedId(remaining[0]?.id || '');
      setEmails([]);
      setEmailOpen(false);
      setSuccess('Demo request deleted.');
    } catch (err) {
      setError(err?.message || 'Unable to delete demo request.');
    } finally {
      setDeleting(false);
    }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Leads</p>
        <h1>Demo Requests</h1>
        <p>Every Request a Free Demo submission from justconsignin.com appears here.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {success && <div className="site-admin-alert success">{success}</div>}

    <div className="demo-request-stats">
      <div className="site-admin-card"><span>New</span><strong>{counts.new}</strong></div>
      <div className="site-admin-card"><span>Active</span><strong>{counts.active}</strong></div>
      <div className="site-admin-card"><span>Completed</span><strong>{counts.completed}</strong></div>
      <div className="site-admin-card"><span>Total</span><strong>{counts.total}</strong></div>
    </div>

    <div className="site-admin-toolbar demo-request-toolbar">
      <label className="site-admin-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, store, email, phone or message" /></label>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter demo requests by status">
        <option value="active">Active</option>
        <option value="all">All</option>
        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>

    {loading ? <div className="site-admin-card site-admin-empty large"><p>Loading demo requests…</p></div> : requests.length === 0 ? <div className="site-admin-card site-admin-empty large"><Inbox size={28}/><h2>No demo requests yet</h2><p>When someone submits the Request a Free Demo form, the request will appear here.</p></div> : <div className="demo-request-admin-grid">
      <section className="site-admin-card demo-request-list" aria-label="Demo request list">
        {filtered.length === 0 ? <div className="site-admin-empty">No requests match this filter.</div> : filtered.map(request => <button key={request.id} type="button" className={`demo-request-row${request.id === selected?.id ? ' selected' : ''}`} onClick={() => setSelectedId(request.id)}>
          <div className="demo-request-row-main">
            <strong>{request.business_name}</strong>
            <span>{request.first_name} {request.last_name}</span>
            <small>{request.email}</small>
          </div>
          <div className="demo-request-row-meta">
            <span className={`demo-request-status ${request.status || 'new'}`}>{statusLabel(request.status)}</span>
            <small>{formatDate(request.created_at)}</small>
          </div>
        </button>)}
      </section>

      <section className="site-admin-card demo-request-detail">
        {!selected ? <div className="site-admin-empty">Choose a request.</div> : <>
          <div className="demo-request-detail-head">
            <div><p className="site-admin-eyebrow">{statusLabel(selected.status)}</p><h2>{selected.business_name}</h2><p>{selected.first_name} {selected.last_name}</p></div>
            <span className={`demo-request-status ${selected.status || 'new'}`}>{statusLabel(selected.status)}</span>
          </div>

          <div className="demo-request-contact-actions">
            <button className="site-admin-btn" type="button" onClick={() => setEmailOpen(open => !open)}><Mail size={14}/> {emailOpen ? 'Close Email' : `Email ${selected.first_name || 'Customer'}`}</button>
            {selected.phone && <a className="site-admin-btn secondary" href={`tel:${selected.phone}`}><Phone size={14}/> Call</a>}
            <button className="site-admin-btn danger demo-request-delete" type="button" onClick={remove} disabled={deleting}><Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete'}</button>
          </div>

          {emailOpen && <DemoRequestEmailComposer request={selected} accessToken={accessToken} onCancel={() => setEmailOpen(false)} onSent={handleEmailSent} />}

          <dl className="demo-request-details">
            <div><dt>Email</dt><dd>{selected.email}</dd></div>
            <div><dt>Phone</dt><dd>{selected.phone || '—'}</dd></div>
            <div><dt>Submitted</dt><dd>{formatDate(selected.created_at)}</dd></div>
            <div><dt>Shopify</dt><dd>{selected.shopify_status || '—'}</dd></div>
            <div className="wide"><dt>What they want to see</dt><dd>{selected.interest || '—'}</dd></div>
            <div className="wide"><dt>Message</dt><dd>{selected.message || 'No additional message.'}</dd></div>
            <div><dt>Source page</dt><dd>{selected.source_path || '—'}</dd></div>
            <div><dt>Campaign</dt><dd>{selected.utm_campaign || selected.utm_source || 'Direct / unknown'}</dd></div>
          </dl>

          <div className="demo-request-workflow">
            <label>Status<select value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span><CalendarClock size={14}/> Scheduled time</span><input type="datetime-local" value={draftScheduledAt} onChange={event => setDraftScheduledAt(event.target.value)} /></label>
            <label className="wide">Admin notes<textarea rows="5" value={draftNotes} onChange={event => setDraftNotes(event.target.value)} placeholder="Follow-up notes, demo details, next steps…" /></label>
            <div className="wide demo-request-save"><button className="site-admin-btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Request'}</button></div>
          </div>

          <DemoRequestEmailHistory emails={emails} loading={emailsLoading} />
        </>}
      </section>
    </div>}
  </>;
}
