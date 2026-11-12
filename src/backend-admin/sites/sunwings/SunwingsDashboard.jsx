import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Inbox, RefreshCw, Truck } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { getSiteIcon } from '../icons';
import { loadSunwingsQuotes } from './sunwingsAdminService';
import { commissionFor } from './commission';
import { addDays, ago, fmtTime, followUpOf, iso, longDate, money, toJob, validEmail } from './jobModel';
import './sunwingsDashboard.css';

// The Sunwings dashboard: one list of what needs doing, most urgent first.
// Finished, declined and cancelled jobs never show here.
const CLOSED = new Set(['complete', 'declined', 'cancelled']);

const STAGES = [
  { key: 'new', label: 'New', sub: 'Reply & price' },
  { key: 'quoted', label: 'Quote sent', sub: 'Waiting on customer' },
  { key: 'accepted', label: 'Accepted', sub: 'Needs a date' },
  { key: 'booked', label: 'Booked', sub: 'On the calendar' },
];

function contactJob(row) {
  return { id: row.id, row, stage: 'new', name: row.name || 'No name', service: 'Contact message', price: null, contact: true };
}

// Everything that needs Justin, as one ordered list. Each job appears once, with its most urgent reason.
function buildTodo(rows, now, isOwner) {
  const items = [];
  for (const row of rows) {
    if (CLOSED.has(row.status)) continue;
    const job = row.request_type === 'contact' ? contactJob(row) : toJob(row);
    if (!job) continue;
    const reasons = [];
    const due = followUpOf(job, now);
    const canEmail = validEmail(row.email) && !job.contact;
    const quoteLink = `/admin/sunwings/quotes?id=${encodeURIComponent(job.id)}`;
    const calLink = (email = false) => `/admin/sunwings/calendar?job=${encodeURIComponent(job.id)}${email ? '&email=1' : ''}`;

    if (due?.kind === 'reply') reasons.push({
      rank: due.rank === 0 ? 0 : 3, tag: due.tag,
      why: job.contact ? `Contact message ${ago(now - Date.parse(row.created_at))}.` : due.text,
      cta: canEmail ? 'Reply' : 'Open', to: canEmail ? calLink(true) : quoteLink,
    });
    // Marius: jobs Justin sent that still need his price.
    if (!isOwner && ['forwarded', 'reviewing', 'needs_quote'].includes(row.status) && row.partner_price == null) reasons.push({
      rank: 1, tag: ['amber', 'Needs your price'],
      why: `Sent to you ${ago(now - Date.parse(row.forwarded_at || row.created_at))}.`,
      cta: 'Price it', to: quoteLink,
    });
    if (isOwner && row.partner_update_unseen) reasons.push({
      rank: 1, tag: ['blue', 'Marius updated'],
      why: row.partner_note || 'New price or status from Marius.',
      cta: 'Review', to: quoteLink,
    });
    if ((job.stage === 'accepted' || job.stage === 'booked') && !job.date) reasons.push({
      rank: 2, tag: ['amber', 'Needs a date'],
      why: job.requested ? `Accepted. Asked for ${longDate(job.requested)}.` : 'Accepted. No date yet.',
      cta: 'Schedule', to: calLink(),
    });
    if (due && due.kind !== 'reply') reasons.push({
      rank: due.kind === 'due' ? 4 : 5, tag: due.tag, why: due.text,
      cta: canEmail ? 'Follow up' : 'Open', to: canEmail ? calLink(true) : quoteLink,
    });
    if (!reasons.length) continue;
    reasons.sort((a, b) => a.rank - b.rank);
    items.push({ job, ...reasons[0], more: reasons.slice(1).map(item => item.tag) });
  }
  return items.sort((a, b) => a.rank - b.rank || Date.parse(a.job.row.created_at) - Date.parse(b.job.row.created_at));
}

export default function SunwingsDashboard({ quick = [], sections = [] }) {
  const { accessToken, user } = useAuth();
  const isOwner = !user?.role || user.role === 'owner';
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  async function refresh() {
    if (!accessToken) return;
    setLoading(true); setError('');
    try { setRows(await loadSunwingsQuotes(accessToken)); }
    catch (err) { setError(err.message || 'Unable to load jobs.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [accessToken]);

  const now = Date.now();
  const todo = useMemo(() => buildTodo(rows, now, isOwner), [rows, isOwner]);
  const jobs = useMemo(() => rows.map(toJob).filter(Boolean), [rows]);
  const today = iso(new Date());
  const weekEnd = iso(addDays(new Date(), 7));
  const week = jobs.filter(job => job.stage === 'booked' && job.date && job.date >= today && job.date <= weekEnd)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const count = key => jobs.filter(job => job.stage === key).length;
  const owed = rows.filter(row => row.status === 'complete' && row.commission_status !== 'paid' && row.commission_status !== 'none')
    .reduce((sum, row) => sum + commissionFor(row).amount, 0);
  const urgent = todo.filter(item => item.rank <= 1).length;
  const visible = showAll ? todo : todo.slice(0, 8);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || 'there').split(' ')[0];

  return <div className="swd">
    <div className="swd-head">
      <div>
        <h1>{greeting}, {firstName}</h1>
        <p>{loading ? 'Loading your jobs…' : todo.length
          ? `${todo.length} thing${todo.length === 1 ? '' : 's'} need${todo.length === 1 ? 's' : ''} you${urgent ? `, ${urgent} urgent` : ''}.`
          : 'You’re all caught up.'}</p>
      </div>
      <button type="button" className="swd-icon-btn" onClick={refresh} disabled={loading} aria-label="Refresh"><RefreshCw size={16}/></button>
    </div>
    {error ? <div className="site-admin-alert error">{error}</div> : null}

    <section className="swd-card swd-todo">
      <div className="swd-card-head">
        <h2>Do now</h2>
        <span>Most urgent first</span>
      </div>
      {loading ? <p className="swd-empty">Loading…</p> : !todo.length
        ? <p className="swd-empty">Nothing waiting on you. New requests show up here first.</p>
        : <>
          {visible.map(item => <button type="button" key={item.job.id} className={`swd-row r${item.rank}`} onClick={() => navigate(item.to)}>
            <span className="swd-who">
              <span className="swd-line1"><b>{item.job.name}</b><span className={`swd-tag ${item.tag[0]}`}>{item.tag[1]}</span>{item.more.map(tag => <span key={tag[1]} className={`swd-tag ${tag[0]} soft`}>{tag[1]}</span>)}</span>
              <span className="swd-line2">{item.job.service}{item.job.price != null ? ` · ${money(item.job.price)}` : ''}</span>
              <span className="swd-line3">{item.why}</span>
            </span>
            <span className="swd-cta">{item.cta}<ChevronRight size={15}/></span>
          </button>)}
          {todo.length > 8 ? <button type="button" className="swd-more" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show fewer' : `Show all ${todo.length}`}</button> : null}
        </>}
    </section>

    <div className="swd-grid">
      <section className="swd-card">
        <div className="swd-card-head">
          <h2>This week</h2>
          <Link to="/admin/sunwings/calendar">Calendar <ChevronRight size={14}/></Link>
        </div>
        {!week.length ? <p className="swd-empty">No booked jobs in the next 7 days.</p>
          : week.map(job => <button type="button" key={job.id} className="swd-week" onClick={() => navigate(`/admin/sunwings/calendar?job=${encodeURIComponent(job.id)}`)}>
            <span className={`swd-date${job.date === today ? ' today' : ''}`}><b>{job.date === today ? 'Today' : longDate(job.date)}</b><small>{fmtTime(job.start)}</small></span>
            <span className="swd-who"><b>{job.name}</b><span className="swd-line2">{job.service}{job.crew ? ` · ${job.crew}` : ''}</span></span>
          </button>)}
      </section>

      <section className="swd-card">
        <div className="swd-card-head">
          <h2>Jobs in progress</h2>
          <Link to="/admin/sunwings/quotes">All quotes <ChevronRight size={14}/></Link>
        </div>
        <div className="swd-stages">
          {STAGES.map(stage => <Link key={stage.key} to={stage.key === 'accepted' || stage.key === 'booked' ? '/admin/sunwings/calendar' : '/admin/sunwings/quotes'} className="swd-stage">
            <b>{loading ? '–' : count(stage.key)}</b><span>{stage.label}</span><small>{stage.sub}</small>
          </Link>)}
        </div>
        {isOwner ? <Link to="/admin/sunwings/commission" className="swd-owed">
          <span>Commission owed to you</span><b>{money(owed) || '$0'}</b>
        </Link> : null}
      </section>
    </div>

    <section className="swd-card swd-links">
      <div className="swd-card-head"><h2>{isOwner ? 'Website' : 'Go to'}</h2>{isOwner ? <span>Pages, posts and settings</span> : null}</div>
      <div className="swd-link-grid">
        <Link to="/admin/sunwings/calendar" className="swd-link"><CalendarDays size={16}/> Jobs calendar</Link>
        {!isOwner ? <Link to="/admin/sunwings/quotes" className="swd-link"><Inbox size={16}/> Quotes</Link> : null}
        {!isOwner ? <Link to="/admin/sunwings/jobs" className="swd-link"><Truck size={16}/> Jobs from Justin</Link> : null}
        {isOwner && quick.filter(item => !item.ownerOnly || isOwner).map(item => {
          const Icon = getSiteIcon(item.icon);
          return <Link key={item.to} to={item.to} className="swd-link"><Icon size={16}/> {item.title}</Link>;
        })}
        {isOwner && sections.flatMap(section => section.items).filter(item => !item.partnerOnly && !quick.some(q => q.to === item.to) && item.to !== '/admin/sunwings/calendar').map(item => {
          const Icon = getSiteIcon(item.icon);
          return <Link key={item.to} to={item.to} className="swd-link"><Icon size={16}/> {item.title}</Link>;
        })}
      </div>
    </section>
  </div>;
}
