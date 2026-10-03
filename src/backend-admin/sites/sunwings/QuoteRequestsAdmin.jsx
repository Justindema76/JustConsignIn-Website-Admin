import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Mail, Phone, RefreshCw, Search, Trash2, Workflow, X } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { deleteSunwingsQuote, loadSunwingsQuotes, updateSunwingsQuote } from './sunwingsAdminService';
import '../../styles/serviceRequests.css';

const STATUS_OPTIONS = [
  ['new', 'New'],
  ['reviewing', 'Reviewing'],
  ['needs_quote', 'Needs Quote'],
  ['contacted', 'Contacted'],
  ['quote_sent', 'Quote Sent'],
  ['accepted', 'Accepted'],
  ['booked', 'Booked'],
  ['complete', 'Complete'],
  ['declined', 'Declined'],
  ['cancelled', 'Cancelled'],
];

const PRIORITY_OPTIONS = [
  ['low', 'Low'],
  ['normal', 'Normal'],
  ['high', 'High'],
];

function statusLabel(value) {
  return STATUS_OPTIONS.find(([key]) => key === value)?.[1] || value || 'New';
}

function requestTypeLabel(value) {
  if (value === 'quick_quote') return 'Quick Quote';
  if (value === 'contact') return 'Contact';
  return 'Full Quote';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function shortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
}

function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function yesNo(value) {
  if (value == null) return 'Not specified';
  return value ? 'Yes' : 'No';
}

function routeSummary(request) {
  const pickup = [request.pickup_city, request.pickup_postal_code].filter(Boolean).join(' ');
  const dropoff = [request.dropoff_city, request.dropoff_postal_code].filter(Boolean).join(' ');
  return [pickup || request.move_from, dropoff || request.move_to].filter(Boolean).join(' → ') || '—';
}

export default function QuoteRequestsAdmin() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [draftStatus, setDraftStatus] = useState('new');
  const [draftPriority, setDraftPriority] = useState('normal');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftQuoteNumber, setDraftQuoteNumber] = useState('');
  const [draftQuoteAmount, setDraftQuoteAmount] = useState('');
  const [draftNextAction, setDraftNextAction] = useState('');
  const [draftNextActionDueAt, setDraftNextActionDueAt] = useState('');

  const selected = requests.find(item => item.id === selectedId) || null;

  async function refresh() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setRequests(await loadSunwingsQuotes(accessToken));
    } catch (err) {
      setError(err?.message || 'Unable to load quote requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [accessToken]);

  useEffect(() => {
    if (!selected) return;
    setDraftStatus(selected.status || 'new');
    setDraftPriority(selected.priority || 'normal');
    setDraftNotes(selected.admin_notes || '');
    setDraftQuoteNumber(selected.quote_number || '');
    setDraftQuoteAmount(selected.quote_amount == null ? '' : String(selected.quote_amount));
    setDraftNextAction(selected.next_action || '');
    setDraftNextActionDueAt(dateInput(selected.next_action_due_at));
    setSuccess('');
  }, [selected?.id]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = event => {
      if (event.key === 'Escape') setSelectedId('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedId]);

  const services = useMemo(() => [...new Set(requests.map(item => item.service).filter(Boolean))].sort(), [requests]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return requests.filter(request => {
      if (statusFilter === 'active' && ['complete','declined','cancelled'].includes(request.status)) return false;
      if (statusFilter !== 'active' && statusFilter !== 'all' && request.status !== statusFilter) return false;
      if (serviceFilter !== 'all' && request.service !== serviceFilter) return false;
      if (requestTypeFilter !== 'all' && (request.request_type || 'quote') !== requestTypeFilter) return false;
      if (!needle) return true;
      return [
        request.name, request.email, request.phone, request.service,
        request.pickup_address, request.pickup_city, request.pickup_postal_code,
        request.dropoff_address, request.dropoff_city, request.dropoff_postal_code,
        request.item_list, request.message, request.admin_notes, request.quote_number,
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [requests, query, statusFilter, serviceFilter, requestTypeFilter]);

  const counts = useMemo(() => ({
    new: requests.filter(item => item.status === 'new').length,
    active: requests.filter(item => !['complete','declined','cancelled'].includes(item.status)).length,
    needsQuote: requests.filter(item => item.status === 'needs_quote').length,
    high: requests.filter(item => item.priority === 'high' && !['complete','declined','cancelled'].includes(item.status)).length,
  }), [requests]);

  async function save() {
    if (!selected || !accessToken) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateSunwingsQuote(accessToken, {
        id: selected.id,
        status: draftStatus,
        priority: draftPriority,
        adminNotes: draftNotes,
        quoteNumber: draftQuoteNumber,
        quoteAmount: draftQuoteAmount,
        nextAction: draftNextAction,
        nextActionDueAt: draftNextActionDueAt,
      });
      if (updated) setRequests(rows => rows.map(row => row.id === updated.id ? updated : row));
      setSuccess('Quote request updated.');
    } catch (err) {
      setError(err?.message || 'Unable to save quote request.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected || deleting) return;
    if (!window.confirm(`Permanently delete the quote request from ${selected.name}? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await deleteSunwingsQuote(accessToken, selected.id);
      setRequests(rows => rows.filter(row => row.id !== selected.id));
      setSelectedId('');
      setSuccess('Quote request deleted.');
    } catch (err) {
      setError(err?.message || 'Unable to delete quote request.');
    } finally {
      setDeleting(false);
    }
  }

  return <div className="service-request-page">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Leads & Quotes</p>
        <h1>Quote Requests</h1>
        <p>Track Sunwings enquiries from the website through review, quote, acceptance and booking.</p>
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
      <label className="site-admin-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search customer, route, service or quote" /></label>
      <select value={requestTypeFilter} onChange={event => setRequestTypeFilter(event.target.value)} aria-label="Filter by form type">
        <option value="all">All forms</option>
        <option value="quote">Full Quote</option>
        <option value="quick_quote">Quick Quote</option>
        <option value="contact">Contact</option>
      </select>
      <select value={serviceFilter} onChange={event => setServiceFilter(event.target.value)} aria-label="Filter by service">
        <option value="all">All services</option>
        {services.map(service => <option value={service} key={service}>{service}</option>)}
      </select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status">
        <option value="active">Open / active</option>
        <option value="all">All requests</option>
        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>

    {loading ? <div className="site-admin-card site-admin-empty large"><p>Loading quote requests…</p></div> :
      requests.length === 0 ? <div className="site-admin-card site-admin-empty large"><Workflow size={30}/><h2>No requests yet</h2><p>Full Quote, Quick Quote and Contact submissions will all appear here.</p></div> :
      <section className="site-admin-card service-request-queue" aria-label="Quote request queue">
        <div className="service-request-queue-head">
          <span>Customer</span><span>Form / Service</span><span>Route</span><span>Status</span><span>Priority</span><span>Received</span><span aria-hidden="true"></span>
        </div>
        {filtered.length === 0 ? <div className="site-admin-empty service-request-empty">No requests match these filters.</div> :
          filtered.map(request => <button key={request.id} type="button" className="service-request-queue-row" onClick={() => setSelectedId(request.id)}>
            <span className="service-request-customer">
              <strong>{request.name}</strong>
              <small>{request.email || request.phone}</small>
            </span>
            <span className="service-request-service">
              <strong>{requestTypeLabel(request.request_type)}</strong>
              <small>{request.request_type === 'contact' ? 'General Contact' : (request.service || 'Not specified')}</small>
            </span>
            <span className="service-request-department unassigned">{routeSummary(request)}</span>
            <span><span className={`demo-request-status ${request.status || 'new'}`}>{statusLabel(request.status)}</span></span>
            <span><span className={`service-request-priority ${request.priority || 'normal'}`}>{request.priority || 'normal'}</span></span>
            <span className="service-request-date">{shortDate(request.created_at)}</span>
            <ChevronRight className="service-request-open-icon" size={18}/>
          </button>)
        }
      </section>
    }

    {selected && <>
      <div className="service-request-drawer-overlay" onClick={() => setSelectedId('')} />
      <aside className="service-request-drawer" role="dialog" aria-modal="true" aria-label={`Quote request from ${selected.name}`}>
        <header className="service-request-drawer-head">
          <div>
            <p className="site-admin-eyebrow">{requestTypeLabel(selected.request_type)}{selected.request_type === 'contact' ? '' : selected.service ? ` · ${selected.service}` : ''}</p>
            <div className="service-request-drawer-title">
              <h2>{selected.name}</h2>
              <span className={`demo-request-status ${selected.status || 'new'}`}>{statusLabel(selected.status)}</span>
            </div>
            <p>{formatDate(selected.created_at)} · {routeSummary(selected)}</p>
          </div>
          <button className="service-request-drawer-close" type="button" onClick={() => setSelectedId('')} aria-label="Close quote request"><X size={20}/></button>
        </header>

        <div className="service-request-drawer-body">
          {success && <div className="site-admin-alert success">{success}</div>}
          {error && <div className="site-admin-alert error">{error}</div>}

          <div className="service-request-quick-actions">
            {selected.email && <a className="site-admin-btn" href={`mailto:${selected.email}`}><Mail size={14}/> Email Customer</a>}
            {selected.phone && <a className="site-admin-btn secondary" href={`tel:${selected.phone}`}><Phone size={14}/> Call Customer</a>}
          </div>

          <section className="service-request-drawer-section primary-section">
            <p className="site-admin-eyebrow">Workflow</p>
            <div className="service-request-workflow-compact">
              <div className="service-request-compact-details">
                <div><dt>Status</dt><dd><select value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{STATUS_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></dd></div>
                <div><dt>Priority</dt><dd><select value={draftPriority} onChange={event => setDraftPriority(event.target.value)}>{PRIORITY_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></dd></div>
                <div><dt>Quote #</dt><dd><input value={draftQuoteNumber} onChange={event => setDraftQuoteNumber(event.target.value)} placeholder="Optional"/></dd></div>
                <div><dt>Quote amount</dt><dd><input type="number" min="0" step="0.01" value={draftQuoteAmount} onChange={event => setDraftQuoteAmount(event.target.value)} placeholder="0.00"/></dd></div>
                <div><dt>Next action</dt><dd><input value={draftNextAction} onChange={event => setDraftNextAction(event.target.value)} placeholder="Call customer, prepare quote…"/></dd></div>
                <div><dt>Due</dt><dd><input type="datetime-local" value={draftNextActionDueAt} onChange={event => setDraftNextActionDueAt(event.target.value)}/></dd></div>
              </div>
              <label>Private notes<textarea rows="5" value={draftNotes} onChange={event => setDraftNotes(event.target.value)} placeholder="Quote notes, follow-up, requirements…"/></label>
              <button className="site-admin-btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Request'}</button>
            </div>
          </section>

          <section className="service-request-drawer-section">
            <p className="site-admin-eyebrow">Customer</p>
            <dl className="service-request-compact-details">
              <div><dt>Email</dt><dd>{selected.email || '—'}</dd></div>
              <div><dt>Phone</dt><dd>{selected.phone || '—'}</dd></div>
              <div><dt>Notification</dt><dd>{selected.email_notified_at ? 'Email sent' : selected.email_notification_error ? 'Email failed' : 'Not sent'}</dd></div>
            </dl>
          </section>

          <section className="service-request-drawer-section">
            <p className="site-admin-eyebrow">Job details</p>
            <dl className="service-request-compact-details">
              <div><dt>Service</dt><dd>{selected.service || '—'}</dd></div>
              <div><dt>Date</dt><dd>{selected.preferred_date || '—'}</dd></div>
              <div><dt>Preferred time</dt><dd>{selected.preferred_time || 'Flexible'}</dd></div>
              <div><dt>Move / job size</dt><dd>{selected.move_size || '—'}</dd></div>
              <div><dt>Pickup</dt><dd>{[selected.pickup_address,selected.pickup_city,selected.pickup_postal_code].filter(Boolean).join(', ') || selected.move_from || '—'}</dd></div>
              <div><dt>Pickup access</dt><dd>Elevator: {yesNo(selected.pickup_elevator)} · Stairs: {yesNo(selected.pickup_stairs)}</dd></div>
              <div><dt>Drop-off</dt><dd>{[selected.dropoff_address,selected.dropoff_city,selected.dropoff_postal_code].filter(Boolean).join(', ') || selected.move_to || '—'}</dd></div>
              <div><dt>Drop-off access</dt><dd>Elevator: {yesNo(selected.dropoff_elevator)} · Stairs: {yesNo(selected.dropoff_stairs)}</dd></div>
            </dl>
          </section>

          {selected.item_list && <section className="service-request-drawer-section"><p className="site-admin-eyebrow">Item list</p><p className="service-request-message">{selected.item_list}</p></section>}
          {selected.message && <section className="service-request-drawer-section"><p className="site-admin-eyebrow">Additional details</p><p className="service-request-message">{selected.message}</p></section>}

          <section className="service-request-drawer-section">
            <p className="site-admin-eyebrow">Activity</p>
            <dl className="service-request-compact-details">
              <div><dt>Last activity</dt><dd>{selected.last_activity || 'Request received'}</dd></div>
              <div><dt>Last activity at</dt><dd>{formatDate(selected.last_activity_at || selected.created_at)}</dd></div>
              <div><dt>Contacted</dt><dd>{formatDate(selected.contacted_at)}</dd></div>
              <div><dt>Status changed</dt><dd>{formatDate(selected.status_changed_at)}</dd></div>
            </dl>
          </section>

          <div className="service-request-danger-zone">
            <button className="site-admin-btn danger" type="button" onClick={remove} disabled={deleting}><Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete Request'}</button>
          </div>
        </div>
      </aside>
    </>}
  </div>;
}
