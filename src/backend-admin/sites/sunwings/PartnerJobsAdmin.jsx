import { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadPartnerJobs, savePartnerJob } from './sunwingsAdminService';
import './sunwingsJobs.css';

// Marius's view: jobs Justin sent him. The server only returns customer phone/email
// when Justin has shared them for that job.

const STATUS = [
  ['', 'Not started'],
  ['reviewing', 'Looking at it'],
  ['priced', 'Priced'],
  ['booked', 'Booked'],
  ['complete', 'Complete'],
  ['cant_do', 'Can’t do it'],
];

function yesNo(value) {
  if (value == null) return '—';
  return value ? 'Yes' : 'No';
}

function place(address, city, postal) {
  return [address, city, postal].filter(Boolean).join(', ') || '—';
}

function JobCard({ job, onSaved }) {
  const { accessToken } = useAuth();
  const [price, setPrice] = useState(job.partner_price == null ? '' : String(job.partner_price));
  const [status, setStatus] = useState(job.partner_status || '');
  const [finalPrice, setFinalPrice] = useState(job.final_price == null ? '' : String(job.final_price));
  const [note, setNote] = useState(job.partner_note || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save() {
    setBusy(true); setError(''); setMessage('');
    try {
      await savePartnerJob(accessToken, { id: job.id, partnerPrice: price, partnerStatus: status, finalPrice, partnerNote: note });
      setMessage('Saved. Justin can see your update.');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const waiting = !job.partner_status && job.partner_price == null;
  return <section className="site-admin-card partner-job">
    <div className="partner-job-head">
      <div>
        <p className="site-admin-eyebrow">{job.request_type === 'quick_quote' ? 'Quick quote' : 'Full quote'} · {job.service || 'Service'}</p>
        <h2>{job.customer || 'Customer'}</h2>
        <small>Sent by Justin {job.forwarded_at ? new Date(job.forwarded_at).toLocaleDateString() : ''}</small>
      </div>
      <span className={`job-chip ${waiting ? 'attention' : ''}`}>{waiting ? 'Waiting for your price' : (STATUS.find(([v]) => v === job.partner_status)?.[1] || 'Updated')}</span>
    </div>

    <dl className="partner-job-details">
      <div><dt>Date / time</dt><dd>{job.preferred_date || '—'} · {job.preferred_time || 'Flexible'}</dd></div>
      <div><dt>Size</dt><dd>{job.move_size || '—'}</dd></div>
      <div><dt>Pickup</dt><dd>{place(job.pickup_address, job.pickup_city, job.pickup_postal_code)}<br/><small>Elevator: {yesNo(job.pickup_elevator)} · Stairs: {yesNo(job.pickup_stairs)}</small></dd></div>
      <div><dt>Drop-off</dt><dd>{place(job.dropoff_address, job.dropoff_city, job.dropoff_postal_code)}<br/><small>Elevator: {yesNo(job.dropoff_elevator)} · Stairs: {yesNo(job.dropoff_stairs)}</small></dd></div>
      {job.item_list ? <div className="wide"><dt>Items</dt><dd>{job.item_list}</dd></div> : null}
      {job.message ? <div className="wide"><dt>Notes</dt><dd>{job.message}</dd></div> : null}
      <div className="wide"><dt>Customer contact</dt><dd>
        {job.contact_shared
          ? <>{job.phone ? <a href={`tel:${job.phone}`}>{job.phone}</a> : '—'}{job.email ? <> · <a href={`mailto:${job.email}`}>{job.email}</a></> : null}</>
          : <span className="job-chip muted">Hidden: Justin handles the customer</span>}
      </dd></div>
    </dl>

    <div className="partner-job-form">
      <label>Your price<input type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)} placeholder="$"/></label>
      <label>Job status<select value={status} onChange={event => setStatus(event.target.value)}>{STATUS.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      <label>Final price (after the job)<input type="number" min="0" step="0.01" value={finalPrice} onChange={event => setFinalPrice(event.target.value)} placeholder="$"/></label>
      <label className="wide">Note to Justin<textarea rows="2" value={note} onChange={event => setNote(event.target.value)} placeholder="e.g. Need 3 movers because of the stairs"/></label>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}
    <button className="site-admin-btn" type="button" onClick={save} disabled={busy}><Save size={14}/> {busy ? 'Saving…' : 'Save'}</button>
  </section>;
}

export default function PartnerJobsAdmin() {
  const { accessToken } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    if (!accessToken) return;
    setLoading(true); setError('');
    try { setJobs(await loadPartnerJobs(accessToken)); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [accessToken]);

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Sunwings Transport</p>
        <h1>Jobs from Justin</h1>
        <p>Jobs Justin sent you. Add your price and update each job as it goes. When you save, Justin sees it right away.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {loading ? <div className="site-admin-card site-admin-empty"><p>Loading jobs…</p></div>
      : !jobs.length ? <div className="site-admin-card site-admin-empty"><p>No jobs yet. Jobs Justin sends you will show up here.</p></div>
      : jobs.map(job => <JobCard key={job.id} job={job} onSaved={refresh}/>)}
  </>;
}
