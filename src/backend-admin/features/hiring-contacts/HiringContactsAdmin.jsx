import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, ChevronRight, ExternalLink, Mail, Phone, RefreshCw, Search, ShieldAlert, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { deleteHiringContact, loadHiringContacts, updateHiringContact } from './hiringContacts.service';

const STATUS_OPTIONS = [
  ['new','New'],
  ['reviewing','Reviewing'],
  ['contacted','Contacted'],
  ['interview','Interview'],
  ['closed','Closed'],
  ['spam','Spam'],
];

const REASON_LABELS = {
  interview: 'Interview Request',
  job_opportunity: 'Job Opportunity',
  recruiter: 'Recruiter',
  other_employment: 'Other Employment',
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

function statusLabel(value) {
  return STATUS_OPTIONS.find(([key]) => key === value)?.[1] || value || 'New';
}

function reasonLabel(value) {
  return REASON_LABELS[value] || value || 'Employment';
}

function reasonClass(value) {
  return {
    interview: 'hiring-reason-interview',
    job_opportunity: 'hiring-reason-job',
    recruiter: 'hiring-reason-recruiter',
    other_employment: 'hiring-reason-other',
  }[value] || 'hiring-reason-other';
}

export default function HiringContactsAdmin() {
  const { accessToken } = useAuth();
  const [contacts, setContacts] = useState([]);
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

  const selected = contacts.find(contact => contact.id === selectedId) || null;

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setContacts(await loadHiringContacts(accessToken));
    } catch (err) {
      setError(err?.message || 'Unable to load hiring contacts.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    setDraftStatus(selected.status || 'new');
    setDraftNotes(selected.admin_notes || '');
    setSuccess('');
  }, [selected?.id]);

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
    return contacts.filter(contact => {
      if (statusFilter === 'active' && ['closed','spam'].includes(contact.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'active' && contact.status !== statusFilter) return false;
      if (!needle) return true;
      return [
        contact.name,
        contact.company,
        contact.email,
        contact.phone,
        contact.role_title,
        contact.message,
        contact.reason,
      ].filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [contacts, query, statusFilter]);

  const counts = useMemo(() => ({
    new: contacts.filter(item => item.status === 'new').length,
    active: contacts.filter(item => !['closed','spam'].includes(item.status)).length,
    interview: contacts.filter(item => item.status === 'interview').length,
    spam: contacts.filter(item => item.status === 'spam').length,
  }), [contacts]);

  function closeDrawer() {
    setSelectedId('');
  }

  async function save() {
    if (!selected || !accessToken) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateHiringContact(accessToken, {
        id: selected.id,
        status: draftStatus,
        adminNotes: draftNotes,
      });
      setContacts(rows => rows.map(row => row.id === updated.id ? updated : row));
      setSuccess('Hiring contact updated.');
    } catch (err) {
      setError(err?.message || 'Unable to save hiring contact.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected || !accessToken || deleting) return;
    if (!window.confirm(`Permanently delete ${selected.company || selected.name}?\n\nThis cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await deleteHiringContact(accessToken, selected.id);
      setContacts(rows => rows.filter(row => row.id !== selected.id));
      closeDrawer();
      setSuccess('Hiring contact deleted.');
    } catch (err) {
      setError(err?.message || 'Unable to delete hiring contact.');
    } finally {
      setDeleting(false);
    }
  }

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Recruitment</p>
        <h1>Hiring Contacts</h1>
        <p>Review recruiter messages, interview requests and job opportunities separately from project enquiries.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {success && !selected && <div className="site-admin-alert success">{success}</div>}

    <div className="demo-request-stats service-request-stats">
      <button type="button" className="site-admin-card service-request-stat" onClick={() => setStatusFilter('new')}><span>New</span><strong>{counts.new}</strong></button>
      <button type="button" className="site-admin-card service-request-stat" onClick={() => setStatusFilter('active')}><span>Open / Active</span><strong>{counts.active}</strong></button>
      <button type="button" className="site-admin-card service-request-stat" onClick={() => setStatusFilter('interview')}><span>Interview</span><strong>{counts.interview}</strong></button>
      <button type="button" className="site-admin-card service-request-stat" onClick={() => setStatusFilter('spam')}><span>Filtered Spam</span><strong>{counts.spam}</strong></button>
    </div>

    <div className="site-admin-toolbar demo-request-toolbar service-request-toolbar">
      <label className="site-admin-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, company, role, email or message" /></label>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter hiring contacts">
        <option value="active">Open / active</option>
        <option value="all">All contacts</option>
        {STATUS_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>

    {loading ? <div className="site-admin-card site-admin-empty large"><p>Loading hiring contacts…</p></div> :
      contacts.length === 0 ? <div className="site-admin-card site-admin-empty large"><BriefcaseBusiness size={30}/><h2>No hiring contacts yet</h2><p>Employment and interview enquiries from the Contact page will appear here.</p></div> :
      <section className="site-admin-card hiring-contact-queue" aria-label="Hiring contact queue">
        <div className="hiring-contact-queue-head">
          <span>Company / Contact</span>
          <span>Reason</span>
          <span>Role</span>
          <span>Status</span>
          <span>Received</span>
          <span aria-hidden="true"></span>
        </div>

        {filtered.length === 0 ? <div className="site-admin-empty service-request-empty">No contacts match these filters.</div> :
          filtered.map(contact => <button key={contact.id} type="button" className="hiring-contact-queue-row" onClick={() => setSelectedId(contact.id)}>
            <span className="service-request-customer">
              <strong>{contact.company || contact.name}</strong>
              <small>{contact.name} · {contact.email}</small>
            </span>
            <span><span className={`hiring-reason-badge ${reasonClass(contact.reason)}`}>{reasonLabel(contact.reason)}</span></span>
            <span className="hiring-contact-role">{contact.role_title || '—'}</span>
            <span><span className={`demo-request-status ${contact.status || 'new'}`}>{statusLabel(contact.status)}</span></span>
            <span className="service-request-date">{shortDate(contact.created_at)}</span>
            <ChevronRight className="service-request-open-icon" size={18}/>
          </button>)
        }
      </section>
    }

    {selected && <>
      <div className="service-request-drawer-overlay" onClick={closeDrawer} />
      <aside className="service-request-drawer hiring-contact-drawer" role="dialog" aria-modal="true" aria-label={`Hiring contact from ${selected.company || selected.name}`}>
        <header className="service-request-drawer-head">
          <div>
            <p className="site-admin-eyebrow">{reasonLabel(selected.reason)}</p>
            <div className="service-request-drawer-title">
              <h2>{selected.company || selected.name}</h2>
              <span className={`demo-request-status ${selected.status || 'new'}`}>{statusLabel(selected.status)}</span>
            </div>
            <p>{selected.name}{selected.role_title ? ` · ${selected.role_title}` : ''} · {formatDate(selected.created_at)}</p>
          </div>
          <button className="service-request-drawer-close" type="button" onClick={closeDrawer} aria-label="Close hiring contact"><X size={20}/></button>
        </header>

        <div className="service-request-drawer-body">
          {success && <div className="site-admin-alert success">{success}</div>}
          {error && <div className="site-admin-alert error">{error}</div>}

          <div className="service-request-quick-actions">
            <a className="site-admin-btn" href={`mailto:${selected.email}`}><Mail size={14}/> Email {selected.name?.split(/\s+/)[0] || 'Contact'}</a>
            {selected.phone && <a className="site-admin-btn secondary" href={`tel:${selected.phone}`}><Phone size={14}/> Call</a>}
            {selected.website_or_linkedin && <a className="site-admin-btn secondary" href={selected.website_or_linkedin} target="_blank" rel="noreferrer">LinkedIn / Website <ExternalLink size={14}/></a>}
          </div>

          {selected.is_spam && <div className="hiring-spam-warning"><ShieldAlert size={18}/><div><strong>Automatically filtered</strong><span>Spam score {selected.spam_score}. {(selected.spam_reasons || []).join(' · ') || 'Matched spam rules.'}</span></div></div>}

          <section className="service-request-drawer-section primary-section">
            <div className="service-request-section-head">
              <div>
                <p className="site-admin-eyebrow">Hiring workflow</p>
                <h3>{statusLabel(selected.status)}</h3>
              </div>
              <BriefcaseBusiness size={20}/>
            </div>
            <div className="service-request-workflow-compact">
              <label>Status<select value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{STATUS_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Private notes<textarea rows="4" value={draftNotes} onChange={event => setDraftNotes(event.target.value)} placeholder="Interview details, recruiter notes, follow-up, role information…" /></label>
              <button className="site-admin-btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </section>

          <section className="service-request-drawer-section">
            <p className="site-admin-eyebrow">Message</p>
            <p className="service-request-message">{selected.message}</p>
          </section>

          <section className="service-request-drawer-section">
            <p className="site-admin-eyebrow">Contact & opportunity</p>
            <dl className="service-request-compact-details">
              <div><dt>Email</dt><dd>{selected.email}</dd></div>
              <div><dt>Phone</dt><dd>{selected.phone || '—'}</dd></div>
              <div><dt>Reason</dt><dd>{reasonLabel(selected.reason)}</dd></div>
              <div><dt>Position / Role</dt><dd>{selected.role_title || '—'}</dd></div>
              <div><dt>Submitted</dt><dd>{formatDate(selected.created_at)}</dd></div>
              <div><dt>Notification</dt><dd>{selected.email_notified_at ? `Sent ${formatDate(selected.email_notified_at)}` : (selected.email_notification_error || (selected.is_spam ? 'Suppressed as spam' : 'Not sent yet'))}</dd></div>
              <div><dt>Company</dt><dd>{selected.company || '—'}</dd></div>
              <div><dt>LinkedIn / Website</dt><dd>{selected.website_or_linkedin || '—'}</dd></div>
            </dl>
          </section>

          <div className="service-request-danger-zone">
            <button className="site-admin-btn danger" type="button" onClick={remove} disabled={deleting}><Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete Contact'}</button>
          </div>
        </div>
      </aside>
    </>}
  </>;
}
