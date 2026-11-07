import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Mail, Phone, RefreshCw, Save, Trash2 } from 'lucide-react';
import { money, quotesApi } from './rentrallyAdminService';
import './rentrally.css';

const STATUSES = [
  ['new', 'New'], ['contacted', 'Contacted'], ['quoted', 'Quote sent'], ['booked', 'Booked'],
  ['completed', 'Completed'], ['declined', 'Declined'], ['cancelled', 'Cancelled'],
];
const LABEL = Object.fromEntries(STATUSES);
const OPEN = new Set(['new', 'contacted', 'quoted', 'booked']);

const when = iso => (iso ? new Date(iso).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }) : '');
const day = s => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD');

export default function QuoteRequestsAdmin() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('open');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState('');
  const [edit, setEdit] = useState({});

  const refresh = () => {
    setBusy(true);
    return quotesApi.list().then(setRows).catch(err => setError(err.message)).finally(() => setBusy(false));
  };
  useEffect(() => { refresh(); }, []);

  const counts = useMemo(() => rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {}), [rows]);
  const filtered = rows.filter(r =>
    (filter === 'all' || (filter === 'open' ? OPEN.has(r.status) : r.status === filter))
    && (!q || `${r.name} ${r.business} ${r.email} ${r.phone} ${r.area}`.toLowerCase().includes(q.toLowerCase())));

  const open = r => {
    setOpenId(openId === r.id ? '' : r.id);
    setEdit({ status: r.status, quoteAmount: r.quote_amount ?? '', adminNotes: r.admin_notes || '' });
    setMessage('');
  };

  const save = async r => {
    setError(''); setMessage('');
    try {
      const saved = await quotesApi.update({ id: r.id, ...edit });
      setRows(rs => rs.map(x => (x.id === r.id ? saved : x)));
      setMessage(`Saved ${r.name}'s quote.`);
    } catch (err) { setError(err.message); }
  };

  const quickStatus = async (r, status) => {
    try {
      const saved = await quotesApi.update({ id: r.id, status });
      setRows(rs => rs.map(x => (x.id === r.id ? saved : x)));
      if (openId === r.id) setEdit(e => ({ ...e, status }));
    } catch (err) { setError(err.message); }
  };

  const remove = async r => {
    if (!confirm(`Delete ${r.name}'s quote request? This can't be undone.`)) return;
    try { await quotesApi.remove(r.id); setRows(rs => rs.filter(x => x.id !== r.id)); setOpenId(''); } catch (err) { setError(err.message); }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Leads</p>
        <h1>Quote Requests</h1>
        <p>Every “Request Quote” from the website, with what they picked, their dates and estimated total.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={busy}><RefreshCw size={14}/> {busy ? 'Loading…' : 'Refresh'}</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="rr-chips" role="tablist">
      {[['open', 'Open'], ['all', 'All'], ...STATUSES].map(([key, label]) => {
        const n = key === 'all' ? rows.length : key === 'open' ? rows.filter(r => OPEN.has(r.status)).length : (counts[key] || 0);
        return <button key={key} type="button" className={filter === key ? 'on' : ''} onClick={() => setFilter(key)}>{label} <span>{n}</span></button>;
      })}
    </div>
    <div className="site-admin-toolbar"><label className="site-admin-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, business, phone, email or area"/></label></div>

    {!busy && !filtered.length && <div className="site-admin-card site-admin-empty">{rows.length ? 'No quote requests match.' : 'No quote requests yet. They’ll appear here as soon as someone sends one from the website.'}</div>}

    <div className="rr-quotes">
      {filtered.map(r => {
        const lines = Array.isArray(r.lines) ? r.lines : [];
        const isOpen = openId === r.id;
        return <div className={`site-admin-card rr-quote ${isOpen ? 'open' : ''}`} key={r.id}>
          <button type="button" className="rr-quote-head" onClick={() => open(r)} aria-expanded={isOpen}>
            <div>
              <strong>{r.name}{r.business ? <span> · {r.business}</span> : null}</strong>
              <small>{when(r.created_at)} · {r.area || 'Area not given'} · {lines.length} item{lines.length === 1 ? '' : 's'}</small>
            </div>
            <div className="rr-quote-right">
              <b>{money(r.quote_amount ?? r.estimated_total)}</b>
              <small>{r.quote_amount != null ? 'quoted' : 'estimate'}</small>
            </div>
            <span className={`rr-status s-${r.status}`}>{LABEL[r.status] || r.status}</span>
          </button>

          {isOpen && <div className="rr-quote-body">
            <div className="rr-contact">
              {r.phone && <a className="site-admin-btn secondary small" href={`tel:${r.phone}`}><Phone size={13}/> {r.phone}</a>}
              {r.email && <a className="site-admin-btn secondary small" href={`mailto:${r.email}?subject=${encodeURIComponent('Your Rent & Rally quote')}`}><Mail size={13}/> {r.email}</a>}
            </div>

            <div className="rr-lines">
              {lines.map((l, i) => <div className="rr-line-row" key={i}>
                {l.image ? <img src={l.image} alt=""/> : <span className="rr-noimg"/>}
                <div>
                  <strong>{l.qty} × {l.name}{l.kind === 'pkg' ? ' (package)' : ''}</strong>
                  <small>{[l.period, `from ${day(l.start)}`, l.options].filter(Boolean).join(' · ')}</small>
                  {l.notes && <small className="rr-note">“{l.notes}”</small>}
                </div>
                <span>{money(l.total)}<small>{money(l.rate)}/day</small></span>
              </div>)}
              <div className="rr-line-total"><span>Website estimate (before delivery &amp; tax)</span><b>{money(r.estimated_total)}</b></div>
            </div>

            {r.notes && <div className="site-admin-note"><strong>Customer notes:</strong> {r.notes}</div>}

            <div className="site-admin-form rr-quote-form">
              <label>Status<select value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })}>{STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label>Your quoted price (CAD) <small>incl. delivery, before tax</small><input inputMode="decimal" value={edit.quoteAmount} onChange={e => setEdit({ ...edit, quoteAmount: e.target.value })} placeholder={String(r.estimated_total ?? '')}/></label>
              <label className="wide">Private notes <small>only you see these</small><textarea rows={3} value={edit.adminNotes} onChange={e => setEdit({ ...edit, adminNotes: e.target.value })}/></label>
              <div className="wide site-admin-actions">
                <button className="site-admin-btn" type="button" onClick={() => save(r)}><Save size={14}/> Save</button>
                {r.status === 'new' && <button className="site-admin-btn secondary" type="button" onClick={() => quickStatus(r, 'contacted')}>Mark contacted</button>}
                {['contacted', 'quoted'].includes(r.status) && <button className="site-admin-btn secondary" type="button" onClick={() => quickStatus(r, 'booked')}>Mark booked</button>}
                <button className="site-admin-btn danger small" type="button" onClick={() => remove(r)} aria-label="Delete quote request"><Trash2 size={13}/></button>
              </div>
            </div>
          </div>}
        </div>;
      })}
    </div>
  </>;
}
