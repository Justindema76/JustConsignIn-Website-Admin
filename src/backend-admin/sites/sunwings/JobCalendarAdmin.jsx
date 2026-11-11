import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadSunwingsQuotes, updateSunwingsQuote } from './sunwingsAdminService';
import { jobPrice } from './commission';
import './jobCalendar.css';

// Where a request sits in the booking flow. Declined/cancelled jobs and contact
// messages are left off the calendar.
const STAGE_OF = {
  new: 'new', reviewing: 'new', forwarded: 'new', priced: 'new', needs_quote: 'new', contacted: 'new',
  quote_sent: 'quoted', accepted: 'accepted', booked: 'booked', complete: 'complete',
};
const STAGES = [
  { key: 'new', label: 'New requests', sub: 'Reply & price', attn: true },
  { key: 'quoted', label: 'Quote sent', sub: 'Waiting on customer' },
  { key: 'accepted', label: 'Accepted', sub: 'Needs a date', attn: true },
  { key: 'booked', label: 'Booked', sub: 'On the calendar', good: true },
  { key: 'complete', label: 'Done this month', sub: 'Commission owed' },
];
const FLOW = [['new', 'New'], ['quoted', 'Quoted'], ['accepted', 'Accepted'], ['booked', 'Booked'], ['complete', 'Done']];
const TAG = { new: ['amber', 'New request'], quoted: ['blue', 'Quote sent'], accepted: ['amber', 'Accepted · needs a date'], booked: ['green', 'Booked'], complete: ['grey', 'Done'] };
const MARIUS_LABEL = { reviewing: 'Looking at it', priced: 'Priced', booked: 'Booked', complete: 'Complete', cant_do: 'Can’t do it' };
const DEFAULT_CREW = ['Marius'];
const DEFAULT_TRUCKS = ['Cargo van', '16ft truck', '20ft truck'];
const DEFAULT_HOURS = 3;
const H0 = 7, H1 = 20, PX = 44;

const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const money = n => (n == null ? '' : '$' + Number(n).toLocaleString('en-CA', { maximumFractionDigits: 2 }));
const minutes = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
const hhmm = mins => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = String(t).split(':').map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}${m ? ':' + pad(m) : ''}${h >= 12 ? 'pm' : 'am'}`;
}
const longDate = s => (s ? parse(s).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' }) : '');

// Turn the customer's "preferred time" text into a sensible start time.
function startFromPreferred(text) {
  const value = String(text || '').toLowerCase();
  const clock = value.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (clock) {
    let h = Number(clock[1]);
    if (clock[3] === 'pm' && h < 12) h += 12;
    if (clock[3] === 'am' && h === 12) h = 0;
    if (h >= 6 && h <= 20) return `${pad(h)}:${clock[2] || '00'}`;
  }
  if (value.includes('after')) return '13:00';
  if (value.includes('mid') || value.includes('noon')) return '12:00';
  if (value.includes('even')) return '17:00';
  return '09:00';
}

function toJob(row) {
  const stage = row.request_type === 'contact' ? null : STAGE_OF[row.status || 'new'];
  if (!stage) return null;
  const from = [row.pickup_city, row.pickup_postal_code].filter(Boolean).join(' ') || row.move_from || '';
  const to = [row.dropoff_city, row.dropoff_postal_code].filter(Boolean).join(' ') || row.move_to || '';
  return {
    id: row.id, row, stage,
    name: row.name || 'No name',
    service: row.service || 'Job',
    price: jobPrice(row),
    from, to,
    date: row.scheduled_date ? String(row.scheduled_date).slice(0, 10) : '',
    start: row.scheduled_start ? String(row.scheduled_start).slice(0, 5) : '',
    hours: Number(row.scheduled_hours) || DEFAULT_HOURS,
    crew: row.crew || '',
    truck: row.truck || '',
    notes: row.crew_notes || '',
    requested: row.preferred_date ? String(row.preferred_date).slice(0, 10) : '',
    reqTime: row.preferred_time || '',
  };
}

const crewKey = job => job.crew.trim().toLowerCase();
function overlaps(a, b) {
  if (!a.date || a.date !== b.date || !a.start || !b.start) return false;
  return minutes(a.start) < minutes(b.start) + b.hours * 60 && minutes(b.start) < minutes(a.start) + a.hours * 60;
}

export default function JobCalendarAdmin() {
  const { accessToken, user } = useAuth();
  const isOwner = !user?.role || user.role === 'owner';
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 760 ? 'list' : 'month'));
  const [cursor, setCursor] = useState(() => new Date());
  const [showReq, setShowReq] = useState(true);
  const [openId, setOpenId] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dropDay, setDropDay] = useState('');
  const today = useMemo(() => iso(new Date()), []);

  async function refresh() {
    if (!accessToken) return;
    setLoading(true); setError('');
    try { setRows(await loadSunwingsQuotes(accessToken)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [accessToken]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const jobs = useMemo(() => rows.map(toJob).filter(Boolean), [rows]);
  const booked = useMemo(() => jobs.filter(job => job.stage === 'booked' && job.date), [jobs]);
  const clashesOf = job => (job.stage === 'booked' && crewKey(job)
    ? booked.filter(other => other.id !== job.id && crewKey(other) === crewKey(job) && overlaps(other, job))
    : []);

  function itemsOn(dayIso) {
    const list = jobs.filter(job => job.date === dayIso && (job.stage === 'booked' || job.stage === 'complete'))
      .map(job => ({ job, kind: job.stage === 'complete' ? 'complete' : 'booked' }));
    if (showReq) {
      jobs.filter(job => !job.date && job.requested === dayIso && ['new', 'quoted', 'accepted'].includes(job.stage))
        .forEach(job => list.push({ job, kind: job.stage === 'quoted' ? 'quoted' : 'requested' }));
    }
    return list.sort((a, b) => (a.job.start || '99').localeCompare(b.job.start || '99'));
  }

  const monthPrefix = today.slice(0, 7);
  const count = key => (key === 'complete'
    ? jobs.filter(job => job.stage === 'complete' && (job.date || String(job.row.status_changed_at || '')).startsWith(monthPrefix)).length
    : jobs.filter(job => job.stage === key).length);
  const needDate = jobs.filter(job => (job.stage === 'accepted' || job.stage === 'booked') && !job.date);
  const weekEnd = iso(addDays(new Date(), 7));
  const upcoming = booked.filter(job => job.date >= today && job.date <= weekEnd)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  const crewOptions = [...new Set([...DEFAULT_CREW, ...jobs.map(job => job.crew).filter(Boolean)])];
  const truckOptions = [...new Set([...DEFAULT_TRUCKS, ...jobs.map(job => job.truck).filter(Boolean)])];

  const open = jobs.find(job => job.id === openId) || null;
  function openJob(job) {
    setOpenId(job.id);
    setForm({
      date: job.date || job.requested || today,
      start: job.start || startFromPreferred(job.reqTime),
      hours: String(job.hours),
      crew: job.crew || 'Marius',
      truck: job.truck,
      notes: job.notes,
    });
  }
  function closeJob() { setOpenId(''); setForm(null); }
  useEffect(() => {
    if (!openId) return undefined;
    const onKey = event => { if (event.key === 'Escape') closeJob(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId]);

  async function save(job, patch, message) {
    setSaving(true); setError('');
    try {
      const updated = await updateSunwingsQuote(accessToken, { id: job.id, ...patch });
      if (updated) setRows(list => list.map(row => (row.id === updated.id ? updated : row)));
      setToast(message);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally { setSaving(false); }
  }

  function book(job, values) {
    const patch = {
      scheduledDate: values.date,
      scheduledStart: values.start,
      scheduledHours: values.hours,
      crew: values.crew,
      truck: values.truck,
      crewNotes: values.notes,
    };
    if (job.row.status !== 'booked') patch.status = 'booked';
    return save(job, patch, `${job.name} booked for ${longDate(values.date)} at ${fmtTime(values.start)}`);
  }

  function quickBook(job, dayIso) {
    return book(job, {
      date: dayIso,
      start: job.start || startFromPreferred(job.reqTime),
      hours: String(job.hours),
      crew: job.crew || 'Marius',
      truck: job.truck,
      notes: job.notes,
    });
  }

  // Drag a "Needs a date" card onto a day.
  const dropProps = dayIso => ({
    'data-day': dayIso,
    onDragOver: event => { if (event.dataTransfer.types.includes('text/plain')) { event.preventDefault(); setDropDay(dayIso); } },
    onDragLeave: event => { if (!event.currentTarget.contains(event.relatedTarget)) setDropDay(current => (current === dayIso ? '' : current)); },
    onDrop: event => {
      event.preventDefault(); setDropDay('');
      const job = jobs.find(item => item.id === event.dataTransfer.getData('text/plain'));
      if (job) quickBook(job, dayIso);
    },
  });

  function step(dir) {
    setCursor(current => (view === 'week' ? addDays(current, dir * 7) : new Date(current.getFullYear(), current.getMonth() + dir, 1)));
  }

  const title = view === 'week'
    ? (() => { const s = addDays(cursor, -cursor.getDay()); const e = addDays(s, 6); return `${s.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`; })()
    : cursor.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

  function chip(item) {
    const { job, kind } = item;
    const clash = kind === 'booked' && clashesOf(job).length;
    const time = job.start ? <b>{fmtTime(job.start)} </b> : kind !== 'booked' && kind !== 'complete' ? <b>Req. </b> : null;
    return <button key={item.job.id} type="button" className={`jc-chip ${kind}${clash ? ' conflict' : ''}`} title={`${job.name} · ${job.service}`} onClick={() => openJob(job)}>{time}{job.name} · {job.service}</button>;
  }

  function monthView() {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    return <>
      <div className="jc-dow">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}</div>
      <div className="jc-month">{days.map(day => {
        const dayIso = iso(day);
        const items = itemsOn(dayIso);
        const clash = items.some(item => item.kind === 'booked' && clashesOf(item.job).length);
        return <div key={dayIso} className={`jc-day${day.getMonth() !== cursor.getMonth() ? ' out' : ''}${dayIso === today ? ' today' : ''}${dropDay === dayIso ? ' drop' : ''}`} {...dropProps(dayIso)}>
          <span className="jc-num">{day.getDate()}</span>
          {clash ? <span className="jc-warn" title="Crew double-booked">⚠</span> : null}
          {items.slice(0, 3).map(chip)}
          {items.length > 3 ? <button type="button" className="jc-more" onClick={() => { setCursor(day); setView('week'); }}>+{items.length - 3} more</button> : null}
        </div>;
      })}</div>
    </>;
  }

  function weekView() {
    const start = addDays(cursor, -cursor.getDay());
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return <div className="jc-week-wrap"><div className="jc-week">
      <div className="jc-wh"/>
      {days.map(d => <div key={iso(d)} className={`jc-wh${iso(d) === today ? ' today' : ''}`}>{d.toLocaleDateString('en-CA', { weekday: 'short' })} {d.getDate()}</div>)}
      <div>{Array.from({ length: H1 - H0 }, (_, i) => <div key={i} className="jc-hour">{fmtTime(`${H0 + i}:00`)}</div>)}</div>
      {days.map(d => {
        const dayIso = iso(d);
        return <div key={dayIso} className={`jc-col${dropDay === dayIso ? ' drop' : ''}`} {...dropProps(dayIso)}>
          {Array.from({ length: H1 - H0 }, (_, i) => <div key={i} className="jc-slot"/>)}
          {itemsOn(dayIso).map(({ job, kind }) => {
            const begin = job.start ? minutes(job.start) : minutes(startFromPreferred(job.reqTime));
            const top = Math.max(0, (begin / 60 - H0) * PX);
            const height = job.start ? Math.max(job.hours * PX - 4, 30) : PX * 1.2;
            return <button key={job.id} type="button" className={`jc-block ${kind}`} style={{ top, height }} onClick={() => openJob(job)}>
              <b>{job.start ? `${fmtTime(job.start)}–${fmtTime(hhmm(minutes(job.start) + job.hours * 60))}` : `Requested ${job.reqTime}`}</b><br/>{job.name}<br/>{job.service}
            </button>;
          })}
        </div>;
      })}
    </div></div>;
  }

  function listView() {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const now = new Date();
    const start = cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth() ? parse(today) : monthStart;
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const groups = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const items = itemsOn(iso(d));
      if (items.length) groups.push([new Date(d), items]);
    }
    if (!groups.length) return <p className="jc-hint jc-pad">No jobs for the rest of this month.</p>;
    return <div className="jc-agenda">{groups.map(([d, items]) => {
      const isToday = iso(d) === today;
      return <div key={iso(d)}>
        <h3 className={isToday ? 'today' : ''}>{d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}{isToday ? ' · Today' : ''}</h3>
        {items.map(({ job, kind }) => <button key={job.id} type="button" className={`jc-arow ${kind}`} onClick={() => openJob(job)}>
          <span className="t">{job.start ? fmtTime(job.start) : kind === 'quoted' ? 'Quoted' : 'Requested'}<small>{job.start ? `${job.hours} hrs` : job.reqTime}</small></span>
          <span className="who"><b>{job.name}</b><span>{job.service}{job.from ? ` · ${job.from}` : ''}{job.to ? ` → ${job.to}` : ''}</span></span>
          {clashesOf(job).length ? <span className="jc-tag red">Clash</span> : null}
          <span className="amt">{money(job.price)}</span>
        </button>)}
      </div>;
    })}</div>;
  }

  const clash = open && form ? booked.filter(other => other.id !== open.id && form.crew.trim() && other.crew.trim().toLowerCase() === form.crew.trim().toLowerCase()
    && overlaps(other, { date: form.date, start: form.start, hours: Number(form.hours) || DEFAULT_HOURS })) : [];
  const canSchedule = open && open.stage !== 'complete';
  const flowAt = open ? FLOW.findIndex(([key]) => key === open.stage) : -1;

  return <div className="jc">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Leads</p>
        <h1>Job Calendar</h1>
        <p>Every booked job on one calendar. Accepted jobs without a day wait in “Needs a date”.</p>
      </div>
      <div className="jc-head-actions">
        <div className="jc-seg" role="tablist">
          {[['month', 'Month'], ['week', 'Week'], ['list', 'List']].map(([key, label]) => <button key={key} type="button" className={view === key ? 'on' : ''} onClick={() => setView(key)}>{label}</button>)}
        </div>
        <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
      </div>
    </div>
    {error ? <div className="site-admin-alert error">{error}</div> : null}

    <div className="jc-pipeline">{STAGES.map(stage => {
      const n = count(stage.key);
      return <button key={stage.key} type="button" className={`jc-stage${n && stage.attn ? ' attn' : ''}${stage.good ? ' good' : ''}`} onClick={() => navigate('/admin/sunwings/quotes')}>
        <b>{loading ? '–' : n}</b><span>{stage.label}</span><small>{stage.sub}</small>
      </button>;
    })}</div>

    <div className="jc-board">
      <section className="jc-card">
        <div className="jc-cal-head">
          <button type="button" className="jc-btn icon" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft size={16}/></button>
          <button type="button" className="jc-btn" onClick={() => setCursor(new Date())}>Today</button>
          <button type="button" className="jc-btn icon" onClick={() => step(1)} aria-label="Next"><ChevronRight size={16}/></button>
          <h2>{title}</h2>
          <label className="jc-toggle"><input type="checkbox" checked={showReq} onChange={event => setShowReq(event.target.checked)}/> Show requested dates</label>
          <div className="jc-legend">
            <span><i className="booked"/>Booked</span><span><i className="quoted"/>Quoted</span><span><i className="requested"/>Requested date</span><span><i className="complete"/>Done</span>
          </div>
        </div>
        {view === 'month' ? monthView() : view === 'week' ? weekView() : listView()}
      </section>

      <aside className="jc-stack">
        <div className="jc-card jc-panel">
          <h3>Needs a date <span className="n">{needDate.length}</span></h3>
          <p className="jc-hint">Accepted, but no day set yet. Drag onto the calendar or tap Schedule.</p>
          {needDate.length ? needDate.map(job => <div key={job.id} className="jc-todo" draggable onDragStart={event => event.dataTransfer.setData('text/plain', job.id)}>
            <b>{job.name} <span className="jc-tag amber">{job.stage === 'booked' ? 'Booked' : 'Accepted'}</span></b>
            <span>{job.service}{job.price != null ? ` · ${money(job.price)}` : ''}</span>
            {job.requested ? <span>Asked for {longDate(job.requested)}{job.reqTime ? `, ${job.reqTime.toLowerCase()}` : ''}</span> : <span>No date requested</span>}
            <div className="row">
              <button type="button" className="jc-btn primary" onClick={() => openJob(job)}>Schedule</button>
              {job.requested ? <button type="button" className="jc-btn" disabled={saving} onClick={() => quickBook(job, job.requested)}>Use {longDate(job.requested)}</button> : null}
            </div>
          </div>) : <p className="jc-hint">All caught up.</p>}
        </div>
        <div className="jc-card jc-panel">
          <h3>Coming up this week</h3>
          <p className="jc-hint">Booked jobs in the next 7 days.</p>
          {upcoming.length ? upcoming.map(job => <button key={job.id} type="button" className="jc-arow booked compact" onClick={() => openJob(job)}>
            <span className="t">{longDate(job.date)}<small>{fmtTime(job.start)}</small></span>
            <span className="who"><b>{job.name}</b><span>{job.service}</span></span>
            {clashesOf(job).length ? <span className="jc-tag red">Clash</span> : null}
          </button>) : <p className="jc-hint">Nothing booked this week.</p>}
        </div>
      </aside>
    </div>

    <div className={`jc-scrim${open ? ' on' : ''}`} onClick={closeJob}/>
    <aside className={`jc-drawer${open ? ' on' : ''}`} aria-hidden={!open}>
      {open && form ? <>
        <div className="jc-dhead">
          <div>
            <span className={`jc-tag ${TAG[open.stage][0]}`}>{open.stage === 'booked' && !open.date ? 'Booked · needs a date' : TAG[open.stage][1]}</span>
            <h2>{open.name}</h2>
            <div className="jc-sub">{open.service}{open.price != null ? ` · ${money(open.price)}` : ''}</div>
          </div>
          <button type="button" className="jc-x" onClick={closeJob} aria-label="Close"><X size={18}/></button>
        </div>
        <div className="jc-dbody">
          <div className="jc-flow">{FLOW.map(([key, label], i) => <div key={key} className={i < flowAt ? 'done' : i === flowAt ? 'now' : ''}>{i < flowAt ? '✓ ' : ''}{label}</div>)}</div>
          <dl>
            <dt>Customer asked</dt><dd>{open.requested ? longDate(open.requested) : 'No date'}{open.reqTime ? ` · ${open.reqTime}` : ''}</dd>
            {open.from ? <><dt>Pickup</dt><dd>{open.from}</dd></> : null}
            {open.to ? <><dt>Drop-off</dt><dd>{open.to}</dd></> : null}
            {open.row.move_size ? <><dt>Size</dt><dd>{open.row.move_size}</dd></> : null}
            {open.row.partner_status || open.row.partner_note ? <><dt>Marius says</dt><dd>{[MARIUS_LABEL[open.row.partner_status] || open.row.partner_status, open.row.partner_note].filter(Boolean).join(' · ')}</dd></> : null}
          </dl>
          {canSchedule ? <div className={`jc-sched${open.date ? ' ok' : ''}`}>
            <h4>{open.date ? '✓ Scheduled' : 'Schedule this job'}</h4>
            <div className="jc-grid2">
              <label>Job date<input type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })}/></label>
              <label>Start time<input type="time" value={form.start} onChange={event => setForm({ ...form, start: event.target.value })}/></label>
              <label>Hours (estimate)<input type="number" min="0.5" max="24" step="0.5" value={form.hours} onChange={event => setForm({ ...form, hours: event.target.value })}/></label>
              <label>Truck<input list="jc-trucks" value={form.truck} placeholder="e.g. 16ft truck" onChange={event => setForm({ ...form, truck: event.target.value })}/></label>
              <label className="full">Crew<input list="jc-crews" value={form.crew} placeholder="e.g. Marius + 2 movers" onChange={event => setForm({ ...form, crew: event.target.value })}/></label>
              <label className="full">Notes for the crew<textarea rows="2" value={form.notes} placeholder="Elevator booked 1–5pm, parking on street…" onChange={event => setForm({ ...form, notes: event.target.value })}/></label>
            </div>
            <datalist id="jc-crews">{crewOptions.map(item => <option key={item} value={item}/>)}</datalist>
            <datalist id="jc-trucks">{truckOptions.map(item => <option key={item} value={item}/>)}</datalist>
            {clash.length ? <div className="jc-alert red">⚠ {form.crew} is already on <b>{clash.map(item => item.name).join(', ')}</b> at that time.</div> : null}
            {open.row.status !== 'booked' ? <div className="jc-alert blue">Saving a date marks this job <b>Booked</b> and puts it on the calendar.</div> : null}
          </div> : null}
        </div>
        <div className="jc-dfoot">
          {canSchedule ? <button type="button" className="jc-btn primary" disabled={saving || !form.date} onClick={() => book(open, form)}>{open.date ? 'Save changes' : 'Book it'}</button> : null}
          {open.stage === 'booked' ? <button type="button" className="jc-btn green" disabled={saving} onClick={() => save(open, { status: 'complete' }, isOwner ? `${open.name} marked done. Commission is now owed.` : `${open.name} marked done.`)}>Mark done</button> : null}
          {open.stage === 'complete' && isOwner ? <button type="button" className="jc-btn green" onClick={() => navigate('/admin/sunwings/commission')}>Go to Commission →</button> : null}
          {open.date && open.stage === 'booked' ? <button type="button" className="jc-btn" disabled={saving} onClick={async () => { if (await save(open, { scheduledDate: '', scheduledStart: '', status: 'accepted' }, `${open.name} moved back to Needs a date`)) closeJob(); }}>Remove date</button> : null}
          <button type="button" className="jc-btn push" onClick={() => navigate(`/admin/sunwings/quotes?id=${encodeURIComponent(open.id)}`)}>Open full quote</button>
        </div>
      </> : null}
    </aside>
    <div className={`jc-toast${toast ? ' on' : ''}`} role="status">{toast}</div>
  </div>;
}
