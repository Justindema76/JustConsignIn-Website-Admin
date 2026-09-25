import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ExternalLink, Mail, Phone, RefreshCw, Search, Send, Trash2, Workflow } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import DemoRequestEmailHistory from '../demo-requests/components/DemoRequestEmailHistory';
import ServiceRequestEmailComposer from './components/ServiceRequestEmailComposer';
import {
  deleteServiceRequest,
  loadServiceRequestEmails,
  loadServiceRequests,
  updateServiceRequest,
  assignServiceRequestDepartment,
} from './serviceRequests.service';
import { loadDepartments } from '../departments/departments.service';

const STATUS_OPTIONS = [
  ['new', 'New'],
  ['reviewing', 'Reviewing'],
  ['needs_quote', 'Needs Quote'],
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
  not_sure: 'Not sure yet',
  other: 'Other / Discovery',
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
  return SERVICE_LABELS[value] || String(value || 'Other').replace(/_/g, ' ');
}

function budgetLabel(value) {
  return {
    under_2500: 'Under $2,500',
    '2500_5000': '$2,500 – $5,000',
    '5000_10000': '$5,000 – $10,000',
    '10000_25000': '$10,000 – $25,000',
    '25000_plus': '$25,000+',
  }[value] || value || 'Not specified';
}

function timelineLabel(value) {
  return {
    asap: 'As soon as possible',
    '30_days': 'Within 30 days',
    '60_90_days': 'Within 60–90 days',
    planning: 'Planning / research stage',
  }[value] || value || 'No fixed timeline';
}

function sourceLabel(request) {
  const campaign = [request.utm_source, request.utm_medium, request.utm_campaign].filter(Boolean).join(' / ');
  return campaign || request.referrer || request.source_path || 'Direct / unknown';
}

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
  const [departments, setDepartments] = useState([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [assigning, setAssigning] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [rows, departmentRows] = await Promise.all([
        loadServiceRequests(accessToken),
        loadDepartments(accessToken),
      ]);
      setRequests(rows);
      setDepartments(departmentRows);
      setSelectedId(current => current && rows.some(row => row.id === current) ? current : (rows[0]?.id || ''));
    } catch (err) {
      setError(err?.message || 'Unable to load service requests.');
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
    setSelectedDepartmentId(selected.assigned_department_id || '');
    setAssignmentNote('');
    setSuccess('');
    setEmailOpen(false);
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
    new: requests.filter(item => item.status === 'new').length,
    active: requests.filter(item => !['complete', 'declined', 'spam'].includes(item.status)).length,
    high: requests.filter(item => item.ai_priority === 'high' && !['complete', 'declined', 'spam'].includes(item.status)).length,
    needsQuote: requests.filter(item => item.status === 'needs_quote').length,
  }), [requests]);

  const availableServices = useMemo(() => {
    const values = new Set();
    requests.forEach(request => {
      if (request.ai_primary_service) values.add(request.ai_primary_service);
      else if (request.requested_service) values.add(request.requested_service);
    });
    return [...values].sort((a, b) => serviceLabel(a).localeCompare(serviceLabel(b)));
  }, [requests]);

  async function save() {
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
      setError(err?.message || 'Unable to save service request.');
    } finally {
      setSaving(false);
    }
  }

  async function assignDepartment() {
    if (!selected || !accessToken || !selectedDepartmentId) return;
    setAssigning(true);
    setError('');
    setSuccess('');
    try {
      const payload = await assignServiceRequestDepartment(accessToken, {
        requestId: selected.id,
        departmentId: selectedDepartmentId,
        note: assignmentNote,
      });
      if (payload?.request) {
        setRequests(rows => rows.map(row => row.id === selected.id ? { ...row, ...payload.request } : row));
        setDraftStatus(payload.request.status || 'needs_quote');
      }
      const departmentName = payload?.department?.name || 'department';
      setSuccess(payload?.emailSent
        ? `Assigned to ${departmentName} and quote-request email sent.`
        : `Assigned to ${departmentName}, but the email failed: ${payload?.emailError || 'unknown email error'}`);
    } catch (err) {
      setError(err?.message || 'Unable to assign department.');
    } finally {
      setAssigning(false);
    }
  }

  function handleEmailSent(payload) {
    if (payload?.email) setEmails(current => [payload.email, ...current.filter(item => item.id !== payload.email.id)]);
    if (payload?.request && selected) {
      setRequests(rows => rows.map(row => row.id === selected.id ? { ...row, ...payload.request } : row));
      setDraftStatus(payload.request.status || draftStatus);
    }
    setEmailOpen(false);
    setSuccess(`Email sent to ${selected?.email || 'client'}.`);
  }

  async function remove() {
    if (!selected || !accessToken || deleting) return;
    const label = selected.company || selected.name || 'this service request';
    if (!window.confirm(`Permanently delete ${label}?\n\nThis also deletes the email history attached to this request. This cannot be undone.`)) return;

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
  }

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Leads</p>
        <h1>Service Requests</h1>
        <p>Review enquiries from JustinDeMatteis.com, see AI routing, contact clients, and track each project from first request to completion.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {success && <div className="site-admin-alert success">{success}</div>}

    <div className="demo-request-stats">
      <div className="site-admin-card"><span>New</span><strong>{counts.new}</strong></div>
      <div className="site-admin-card"><span>Active</span><strong>{counts.active}</strong></div>
      <div className="site-admin-card"><span>High Priority</span><strong>{counts.high}</strong></div>
      <div className="site-admin-card"><span>Needs Quote</span><strong>{counts.needsQuote}</strong></div>
    </div>

    <div className="site-admin-toolbar demo-request-toolbar service-request-toolbar">
      <label className="site-admin-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, company, email, service or message" /></label>
      <select value={serviceFilter} onChange={event => setServiceFilter(event.target.value)} aria-label="Filter by service">
        <option value="all">All services</option>
        {availableServices.map(value => <option value={value} key={value}>{serviceLabel(value)}</option>)}
      </select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status">
        <option value="active">Open / active</option>
        <option value="all">All</option>
        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>

    {loading ? <div className="site-admin-card site-admin-empty large"><p>Loading service requests…</p></div> : requests.length === 0 ? <div className="site-admin-card site-admin-empty large"><Workflow size={30}/><h2>No service requests yet</h2><p>When someone submits the service form on JustinDeMatteis.com, the request will appear here.</p></div> : <div className="demo-request-admin-grid">
      <section className="site-admin-card demo-request-list" aria-label="Service request list">
        {filtered.length === 0 ? <div className="site-admin-empty">No requests match these filters.</div> : filtered.map(request => <button key={request.id} type="button" className={`demo-request-row${request.id === selected?.id ? ' selected' : ''}`} onClick={() => setSelectedId(request.id)}>
          <div className="demo-request-row-main">
            <strong>{request.company || request.name}</strong>
            <span>{request.name}</span>
            <small>{serviceLabel(request.ai_primary_service || request.requested_service)} · {request.assigned_department_name ? `Assigned: ${request.assigned_department_name}` : 'Unassigned'}</small>
          </div>
          <div className="demo-request-row-meta">
            {request.ai_priority === 'high' && <span className="service-request-priority high">High</span>}
            <span className={`demo-request-status ${request.status || 'new'}`}>{statusLabel(request.status)}</span>
            <small>{formatDate(request.created_at)}</small>
          </div>
        </button>)}
      </section>

      <section className="site-admin-card demo-request-detail">
        {!selected ? <div className="site-admin-empty">Choose a request.</div> : <>
          <div className="demo-request-detail-head">
            <div>
              <p className="site-admin-eyebrow">{serviceLabel(selected.ai_primary_service || selected.requested_service)}</p>
              <h2>{selected.company || selected.name}</h2>
              <p>{selected.name}</p>
            </div>
            <span className={`demo-request-status ${selected.status || 'new'}`}>{statusLabel(selected.status)}</span>
          </div>

          <div className="demo-request-contact-actions">
            <button className="site-admin-btn" type="button" onClick={() => setEmailOpen(open => !open)}><Mail size={14}/> {emailOpen ? 'Close Email' : `Email ${selected.name?.split(/\s+/)[0] || 'Client'}`}</button>
            {selected.phone && <a className="site-admin-btn secondary" href={`tel:${selected.phone}`}><Phone size={14}/> Call</a>}
            {selected.website && <a className="site-admin-btn secondary" href={selected.website} target="_blank" rel="noreferrer">Website <ExternalLink size={14}/></a>}
            <button className="site-admin-btn danger demo-request-delete" type="button" onClick={remove} disabled={deleting}><Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete'}</button>
          </div>

          {emailOpen && <ServiceRequestEmailComposer request={selected} accessToken={accessToken} onCancel={() => setEmailOpen(false)} onSent={handleEmailSent} />}

          <section className="service-request-assignment-card">
            <div className="service-request-assignment-head">
              <div>
                <p className="site-admin-eyebrow">Quote routing</p>
                <h3>{selected.assigned_department_name ? `Assigned to ${selected.assigned_department_name}` : 'Choose a department'}</h3>
                <p>The department email receives the request and a note to prepare a quote. No individual employee assignment yet.</p>
              </div>
              <Building2 size={21}/>
            </div>
            <div className="service-request-assignment-controls">
              <label>
                <span>Department</span>
                <select value={selectedDepartmentId} onChange={event => setSelectedDepartmentId(event.target.value)}>
                  <option value="">Select department</option>
                  {departments.filter(item => item.active !== false).map(department => <option key={department.id} value={department.id}>{department.name} — {department.email}</option>)}
                </select>
              </label>
              <label className="wide">
                <span>Assignment note <small>(optional)</small></span>
                <textarea rows="3" value={assignmentNote} onChange={event => setAssignmentNote(event.target.value)} placeholder="What should this department review or include in the quote?" />
              </label>
              <button className="site-admin-btn" type="button" onClick={assignDepartment} disabled={!selectedDepartmentId || assigning}>
                <Send size={15}/>{assigning ? 'Assigning & sending…' : 'Assign Department & Send'}
              </button>
            </div>
            {selected.assigned_department_name && <div className="service-request-assignment-meta">
              <span>Department <strong>{selected.assigned_department_name}</strong></span>
              <span>Email <strong>{selected.assigned_department_email}</strong></span>
              <span>Assigned <strong>{formatDate(selected.assigned_at)}</strong></span>
              <span>Assignment email <strong>{selected.assignment_email_sent_at ? `Sent ${formatDate(selected.assignment_email_sent_at)}` : (selected.assignment_email_error || 'Not sent')}</strong></span>
            </div>}
          </section>

          <section className="service-request-ai-card">
            <div className="service-request-ai-head">
              <div>
                <p className="site-admin-eyebrow">AI Routing</p>
                <h3>{serviceLabel(selected.ai_primary_service)}</h3>
              </div>
              <span className={`service-request-priority ${selected.ai_priority || 'normal'}`}>{selected.ai_priority || 'normal'}</span>
            </div>
            {selected.ai_secondary_services?.length > 0 && <div className="service-request-ai-tags">{selected.ai_secondary_services.map(item => <span key={item}>{serviceLabel(item)}</span>)}</div>}
            <p>{selected.ai_summary || 'No AI summary available.'}</p>
            <div className="service-request-ai-meta">
              <span>Confidence <strong>{Math.round(Number(selected.ai_confidence || 0) * 100)}%</strong></span>
              <span>Routing <strong>{selected.routed_queue || '—'}</strong></span>
              <span>Method <strong>{selected.ai_provider || 'rules'}</strong></span>
            </div>
          </section>

          <dl className="demo-request-details">
            <div><dt>Email</dt><dd>{selected.email}</dd></div>
            <div><dt>Phone</dt><dd>{selected.phone || '—'}</dd></div>
            <div><dt>Requested service</dt><dd>{serviceLabel(selected.requested_service)}</dd></div>
            <div><dt>Submitted</dt><dd>{formatDate(selected.created_at)}</dd></div>
            <div><dt>Budget</dt><dd>{budgetLabel(selected.budget_range)}</dd></div>
            <div><dt>Timeline</dt><dd>{timelineLabel(selected.timeline)}</dd></div>
            <div><dt>Source</dt><dd>{sourceLabel(selected)}</dd></div>
            <div><dt>Notification</dt><dd>{selected.email_notified_at ? `Sent ${formatDate(selected.email_notified_at)}` : (selected.email_notification_error || 'Not sent yet')}</dd></div>
            <div className="wide"><dt>Project request</dt><dd>{selected.message}</dd></div>
          </dl>

          <div className="demo-request-workflow">
            <label>Status<select value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="wide">Private notes<textarea rows="5" value={draftNotes} onChange={event => setDraftNotes(event.target.value)} placeholder="Discovery notes, requirements, follow-up, proposal details…" /></label>
            <div className="wide demo-request-save"><button className="site-admin-btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Request'}</button></div>
          </div>

          <DemoRequestEmailHistory emails={emails} loading={emailsLoading} />
        </>}
      </section>
    </div>}
  </>;
}
