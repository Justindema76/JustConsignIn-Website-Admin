import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronRight, ExternalLink, Mail, Phone, RefreshCw, Search, Trash2, Workflow, X } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import DemoRequestEmailHistory from '../demo-requests/components/DemoRequestEmailHistory';
import ServiceRequestEmailComposer from './components/ServiceRequestEmailComposer';
import {
  assignServiceRequestDepartment,
  deleteServiceRequest,
  loadServiceRequestEmails,
  loadServiceRequests,
  updateServiceRequest,
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

function shortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusLabel(status) {
  return STATUS_OPTIONS.find(([key]) => key === status)?.[1] || status || 'New';
}

function departmentClass(name) {
  return {
    Development: 'development',
    Ecommerce: 'ecommerce',
    'AI / Automation': 'ai-automation',
    'SEO / Digital': 'seo-digital',
    'Management / Review': 'management-review',
  }[name] || 'unassigned';
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
  const [departments, setDepartments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draftStatus, setDraftStatus] = useState('new');
  const [draftNotes, setDraftNotes] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const selected = requests.find(request => request.id === selectedId) || null;

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
    } catch (err) {
      setError(err?.message || 'Unable to load service requests.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!selected) {
      setEmails([]);
      setEmailOpen(false);
      return;
    }
    setDraftStatus(selected.status || 'new');
    setDraftNotes(selected.admin_notes || '');
    setSelectedDepartmentId(selected.assigned_department_id || '');
    setSuccess('');
    setEmailOpen(false);
  }, [selected?.id]);

  const refreshEmails = useCallback(async requestId => {
    if (!accessToken || !requestId) {
      setEmails([]);
      return;
    }
    setEmailsLoading(true);
    try {
      setEmails(await loadServiceRequestEmails(accessToken, requestId));
    } catch (err) {
      setError(err?.message || 'Unable to load email history.');
    } finally {
      setEmailsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (selectedId) refreshEmails(selectedId);
  }, [selectedId, refreshEmails]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = event => {
      if (event.key === 'Escape') setSelectedId('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedId]);

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
        request.assigned_department_name,
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [requests, query, statusFilter, serviceFilter]);

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

  function closeDrawer() {
    setSelectedId('');
    setEmailOpen(false);
  }

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
      });
      if (payload?.request) {
        setRequests(rows => rows.map(row => row.id === selected.id ? { ...row, ...payload.request } : row));
        setDraftStatus(payload.request.status || 'needs_quote');
      }
      const departmentName = payload?.department?.name || 'department';
      setSuccess(`Assigned to ${departmentName}.`);
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
      setRequests(rows => rows.filter(row => row.id !== selected.id));
      closeDrawer();
      setSuccess('Service request deleted.');
    } catch (err) {
      setError(err?.message || 'Unable to delete service request.');
    } finally {
      setDeleting(false);
    }
  }

  return <div className="service-request-page">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Projects & Quotes</p>
        <h1>Service Requests</h1>
        <p>Track project enquiries from request through quote, follow-up, acceptance and delivery.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {success && !selected && <div className="site-admin-alert success">{success}</div>}

    <div className="demo-request-stats service-request-stats">
      <button type="button" className="site-admin-card service-request-stat" onClick={() => setStatusFilter('new')}><span>New</span><strong>{counts.new}</strong></button>
      <button type="button" className="site-admin-card service-request-stat" onClick={() => setStatusFilter('active')}><span>Open / Active</span><strong>{counts.active}</strong></button>
      <button type="button" className="site-admin-card service-request-stat" onClick={() => setStatusFilter('needs_quote')}><span>Needs Quote</span><strong>{counts.needsQuote}</strong></button>
      <button type="button" className="site-admin-card service-request-stat" onClick={() => setStatusFilter('active')}><span>High Priority</span><strong>{counts.high}</strong></button>
    </div>

    <div className="site-admin-toolbar demo-request-toolbar service-request-toolbar">
      <label className="site-admin-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search company, contact, service or department" /></label>
      <select value={serviceFilter} onChange={event => setServiceFilter(event.target.value)} aria-label="Filter by service">
        <option value="all">All services</option>
        {availableServices.map(value => <option value={value} key={value}>{serviceLabel(value)}</option>)}
      </select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status">
        <option value="active">Open / active</option>
        <option value="all">All requests</option>
        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>

    {loading ? <div className="site-admin-card site-admin-empty large"><p>Loading service requests…</p></div> :
      requests.length === 0 ? <div className="site-admin-card site-admin-empty large"><Workflow size={30}/><h2>No service requests yet</h2><p>When someone submits the service form on JustinDeMatteis.com, the request will appear here.</p></div> :
      <section className="site-admin-card service-request-queue" aria-label="Service request queue">
        <div className="service-request-queue-head">
          <span>Customer</span>
          <span>Service</span>
          <span>Department</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Received</span>
          <span aria-hidden="true"></span>
        </div>

        {filtered.length === 0 ? <div className="site-admin-empty service-request-empty">No requests match these filters.</div> :
          filtered.map(request => <button key={request.id} type="button" className="service-request-queue-row" onClick={() => setSelectedId(request.id)}>
            <span className="service-request-customer">
              <strong>{request.company || request.name}</strong>
              <small>{request.name}{request.company ? ` · ${request.email}` : ''}</small>
            </span>
            <span className="service-request-service">{serviceLabel(request.ai_primary_service || request.requested_service)}</span>
            <span className={`service-request-department ${departmentClass(request.assigned_department_name)}`}>
              {request.assigned_department_name || 'Unassigned'}
            </span>
            <span><span className={`demo-request-status ${request.status || 'new'}`}>{statusLabel(request.status)}</span></span>
            <span><span className={`service-request-priority ${request.ai_priority || 'normal'}`}>{request.ai_priority || 'normal'}</span></span>
            <span className="service-request-date">{shortDate(request.created_at)}</span>
            <ChevronRight className="service-request-open-icon" size={18}/>
          </button>)
        }
      </section>
    }

    {selected && <>
      <div className="service-request-drawer-overlay" onClick={closeDrawer} />
      <aside className="service-request-drawer" role="dialog" aria-modal="true" aria-label={`Service request from ${selected.company || selected.name}`}>
        <header className="service-request-drawer-head">
          <div>
            <p className="site-admin-eyebrow">{serviceLabel(selected.ai_primary_service || selected.requested_service)}</p>
            <div className="service-request-drawer-title">
              <h2>{selected.company || selected.name}</h2>
              <span className={`demo-request-status ${selected.status || 'new'}`}>{statusLabel(selected.status)}</span>
            </div>
            <p>{selected.company ? selected.name : selected.email} · {formatDate(selected.created_at)}</p>
          </div>
          <button className="service-request-drawer-close" type="button" onClick={closeDrawer} aria-label="Close service request"><X size={20}/></button>
        </header>

        <div className="service-request-drawer-body">
          {success && <div className="site-admin-alert success">{success}</div>}
          {error && <div className="site-admin-alert error">{error}</div>}

          <div className="service-request-quick-actions">
            <button className="site-admin-btn" type="button" onClick={() => setEmailOpen(open => !open)}><Mail size={14}/> {emailOpen ? 'Close Email' : 'Email Client'}</button>
            {selected.phone && <a className="site-admin-btn secondary" href={`tel:${selected.phone}`}><Phone size={14}/> Call</a>}
            {selected.website && <a className="site-admin-btn secondary" href={selected.website} target="_blank" rel="noreferrer">Website <ExternalLink size={14}/></a>}
          </div>

          {emailOpen && <ServiceRequestEmailComposer request={selected} accessToken={accessToken} onCancel={() => setEmailOpen(false)} onSent={handleEmailSent} />}

          <section className="service-request-drawer-section primary-section">
            <div className="service-request-section-head">
              <div>
                <p className="site-admin-eyebrow">Quote routing</p>
                <h3>{selected.assigned_department_name ? `Assigned to ${selected.assigned_department_name}` : 'Assign this request'}</h3>
              </div>
              <Building2 size={20}/>
            </div>
            <div className="service-request-assignment-controls">
              <label>
                <span>Department</span>
                <select value={selectedDepartmentId} onChange={event => setSelectedDepartmentId(event.target.value)}>
                  <option value="">Select department</option>
                  {departments.filter(item => item.active !== false).map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>
              <button className="site-admin-btn" type="button" onClick={assignDepartment} disabled={!selectedDepartmentId || assigning}>
                {assigning ? 'Assigning…' : 'Assign Department'}
              </button>
            </div>
            {selected.assigned_department_name && <div className="service-request-assignment-summary">
              <div><span>Department</span><strong>{selected.assigned_department_name}</strong></div>
              <div><span>Assigned</span><strong>{formatDate(selected.assigned_at)}</strong></div>
            </div>}
          </section>

          <section className="service-request-drawer-section">
            <p className="site-admin-eyebrow">Customer request</p>
            <p className="service-request-message">{selected.message}</p>
          </section>

          <section className="service-request-drawer-section">
            <p className="site-admin-eyebrow">Contact & project</p>
            <dl className="service-request-compact-details">
              <div><dt>Email</dt><dd>{selected.email}</dd></div>
              <div><dt>Phone</dt><dd>{selected.phone || '—'}</dd></div>
              <div><dt>Requested service</dt><dd>{serviceLabel(selected.requested_service)}</dd></div>
              <div><dt>Budget</dt><dd>{budgetLabel(selected.budget_range)}</dd></div>
              <div><dt>Timeline</dt><dd>{timelineLabel(selected.timeline)}</dd></div>
              <div><dt>Source</dt><dd>{sourceLabel(selected)}</dd></div>
            </dl>
          </section>

          <section className="service-request-drawer-section">
            <p className="site-admin-eyebrow">Workflow</p>
            <div className="service-request-workflow-compact">
              <label>Status<select value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Private notes<textarea rows="4" value={draftNotes} onChange={event => setDraftNotes(event.target.value)} placeholder="Requirements, follow-up, quote notes…" /></label>
              <button className="site-admin-btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </section>

          <details className="service-request-collapsible">
            <summary>AI classification & routing</summary>
            <section className="service-request-ai-card">
              <div className="service-request-ai-head">
                <div><p className="site-admin-eyebrow">AI Routing</p><h3>{serviceLabel(selected.ai_primary_service)}</h3></div>
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
          </details>

          <details className="service-request-collapsible">
            <summary>Email history ({emails.length})</summary>
            <DemoRequestEmailHistory emails={emails} loading={emailsLoading} />
          </details>

          <div className="service-request-danger-zone">
            <button className="site-admin-btn danger" type="button" onClick={remove} disabled={deleting}><Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete Request'}</button>
          </div>
        </div>
      </aside>
    </>}
  </div>;
}
