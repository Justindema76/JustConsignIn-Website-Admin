import { useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, ExternalLink, Mail, Phone, RefreshCw, Search, ShieldAlert, Trash2 } from 'lucide-react';
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

function statusLabel(value) {
  return STATUS_OPTIONS.find(([key]) => key === value)?.[1] || value || 'New';
}

function reasonLabel(value) {
  return REASON_LABELS[value] || value || 'Employment';
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

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await loadHiringContacts(accessToken);
      setContacts(rows);
      setSelectedId(current => current && rows.some(row => row.id === current) ? current : (rows.find(row => row.status !== 'spam')?.id || rows[0]?.id || ''));
    } catch (err) {
      setError(err?.message || 'Unable to load hiring contacts.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts.filter(contact => {
      if (statusFilter === 'active' && ['closed','spam'].includes(contact.status)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'active' && contact.status !== statusFilter) return false;
      if (!needle) return true;
      return [contact.name,contact.company,contact.email,contact.phone,contact.role_title,contact.message]
        .filter(Boolean).join(' ').toLowerCase().includes(needle);
    });
  }, [contacts, query, statusFilter]);

  const selected = contacts.find(contact => contact.id === selectedId) || filtered[0] || null;

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setDraftStatus(selected.status || 'new');
    setDraftNotes(selected.admin_notes || '');
    setSuccess('');
  }, [selected?.id, selected?.status, selected?.admin_notes]);

  const counts = useMemo(() => ({
    new: contacts.filter(item => item.status === 'new').length,
    active: contacts.filter(item => !['closed','spam'].includes(item.status)).length,
    interview: contacts.filter(item => item.status === 'interview').length,
    spam: contacts.filter(item => item.status === 'spam').length,
  }), [contacts]);

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
    try {
      await deleteHiringContact(accessToken, selected.id);
      const remaining = contacts.filter(row => row.id !== selected.id);
      setContacts(remaining);
      setSelectedId(remaining.find(row => row.status !== 'spam')?.id || remaining[0]?.id || '');
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
        <p className="site-admin-eyebrow">Employment</p>
        <h1>Hiring Contacts</h1>
        <p>Interview requests, job opportunities and recruiter messages from JustinDeMatteis.com.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {success && <div className="site-admin-alert success">{success}</div>}

    <div className="demo-request-stats">
      <div className="site-admin-card"><span>New</span><strong>{counts.new}</strong></div>
      <div className="site-admin-card"><span>Active</span><strong>{counts.active}</strong></div>
      <div className="site-admin-card"><span>Interview</span><strong>{counts.interview}</strong></div>
      <div className="site-admin-card"><span>Filtered Spam</span><strong>{counts.spam}</strong></div>
    </div>

    <div className="site-admin-toolbar demo-request-toolbar hiring-contact-toolbar">
      <label className="site-admin-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, company, role, email or message" /></label>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter hiring contacts">
        <option value="active">Open / active</option>
        <option value="all">All</option>
        {STATUS_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>

    {loading ? <div className="site-admin-card site-admin-empty large"><p>Loading hiring contacts…</p></div> : contacts.length === 0 ? <div className="site-admin-card site-admin-empty large"><BriefcaseBusiness size={30}/><h2>No hiring contacts yet</h2><p>Employment and interview enquiries from the Contact page will appear here.</p></div> : <div className="demo-request-admin-grid">
      <section className="site-admin-card demo-request-list" aria-label="Hiring contact list">
        {filtered.length === 0 ? <div className="site-admin-empty">No contacts match this filter.</div> : filtered.map(contact => <button key={contact.id} type="button" className={`demo-request-row${contact.id === selected?.id ? ' selected' : ''}`} onClick={() => setSelectedId(contact.id)}>
          <div className="demo-request-row-main">
            <strong>{contact.company || contact.name}</strong>
            <span>{contact.name}</span>
            <small>{reasonLabel(contact.reason)} · {contact.role_title || contact.email}</small>
          </div>
          <div className="demo-request-row-meta">
            {contact.is_spam && <span className="hiring-spam-pill">Filtered</span>}
            <span className={`demo-request-status ${contact.status || 'new'}`}>{statusLabel(contact.status)}</span>
            <small>{formatDate(contact.created_at)}</small>
          </div>
        </button>)}
      </section>

      <section className="site-admin-card demo-request-detail">
        {!selected ? <div className="site-admin-empty">Choose a contact.</div> : <>
          <div className="demo-request-detail-head">
            <div>
              <p className="site-admin-eyebrow">{reasonLabel(selected.reason)}</p>
              <h2>{selected.company}</h2>
              <p>{selected.name} · {selected.role_title}</p>
            </div>
            <span className={`demo-request-status ${selected.status || 'new'}`}>{statusLabel(selected.status)}</span>
          </div>

          <div className="demo-request-contact-actions">
            <a className="site-admin-btn" href={`mailto:${selected.email}`}><Mail size={14}/> Email {selected.name?.split(/\s+/)[0] || 'Contact'}</a>
            {selected.phone && <a className="site-admin-btn secondary" href={`tel:${selected.phone}`}><Phone size={14}/> Call</a>}
            {selected.website_or_linkedin && <a className="site-admin-btn secondary" href={selected.website_or_linkedin} target="_blank" rel="noreferrer">LinkedIn / Website <ExternalLink size={14}/></a>}
            <button className="site-admin-btn danger demo-request-delete" type="button" onClick={remove} disabled={deleting}><Trash2 size={14}/> {deleting ? 'Deleting…' : 'Delete'}</button>
          </div>

          {selected.is_spam && <div className="hiring-spam-warning"><ShieldAlert size={18}/><div><strong>Automatically filtered</strong><span>Spam score {selected.spam_score}. {(selected.spam_reasons || []).join(' · ') || 'Matched spam rules.'}</span></div></div>}

          <dl className="demo-request-details">
            <div><dt>Email</dt><dd>{selected.email}</dd></div>
            <div><dt>Phone</dt><dd>{selected.phone || '—'}</dd></div>
            <div><dt>Reason</dt><dd>{reasonLabel(selected.reason)}</dd></div>
            <div><dt>Position / Role</dt><dd>{selected.role_title}</dd></div>
            <div><dt>Submitted</dt><dd>{formatDate(selected.created_at)}</dd></div>
            <div><dt>Notification</dt><dd>{selected.email_notified_at ? `Sent ${formatDate(selected.email_notified_at)}` : (selected.email_notification_error || (selected.is_spam ? 'Suppressed as spam' : 'Not sent yet'))}</dd></div>
            <div className="wide"><dt>LinkedIn / Company Website</dt><dd>{selected.website_or_linkedin || '—'}</dd></div>
            <div className="wide"><dt>Message</dt><dd>{selected.message}</dd></div>
          </dl>

          <div className="demo-request-workflow">
            <label>Status<select value={draftStatus} onChange={event => setDraftStatus(event.target.value)}>{STATUS_OPTIONS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="wide">Private notes<textarea rows="5" value={draftNotes} onChange={event => setDraftNotes(event.target.value)} placeholder="Interview details, recruiter notes, follow-up, role information…" /></label>
            <div className="wide demo-request-save"><button className="site-admin-btn" type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Contact'}</button></div>
          </div>
        </>}
      </section>
    </div>}
  </>;
}
