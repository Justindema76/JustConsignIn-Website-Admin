import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { adminFetch, parseJsonResponse } from '../../services/apiClient';
import { loadSunwingsQuotes } from '../../sites/sunwings/sunwingsAdminService';
import './analytics.css';

// Sunwings Analytics: traffic and phone clicks from Google Analytics (GA4),
// quote requests and bookings from the admin's own records.

const PERIODS = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];
const GA_LINK = 'https://analytics.google.com/analytics/web/#/p522090228/reports/intelligenthome';
const SPLIT_COLORS = ['#1f67b2', '#f97316', '#12b76a', '#7a5af8', '#98a2b3'];
const DAY = 86400000;

const number = value => Math.round(Number(value || 0)).toLocaleString('en-CA');
const percent = value => `${(Number(value || 0) * 100).toFixed(1)}%`;
const duration = seconds => { const s = Math.round(Number(seconds || 0)); return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`; };
const shortDate = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
const validDate = value => value && !Number.isNaN(new Date(value).getTime());
const requestType = item => item.request_type === 'quick_quote' ? 'Quick quote' : item.request_type === 'contact' ? 'Contact' : 'Full quote';

async function loadGoogleAnalytics(accessToken, days) {
  return parseJsonResponse(await adminFetch(`/api/admin/sunwings/google-analytics?days=${days}`, {}, accessToken), 'Unable to load Google Analytics.');
}

function Delta({ now, before, invert = false }) {
  if (before === undefined || before === null) return null;
  if (!before) return now ? <span className="an-delta up">New</span> : <span>No change</span>;
  const change = (now - before) / before;
  if (Math.abs(change) < 0.005) return <span>No change</span>;
  const good = invert ? change < 0 : change > 0;
  return <span className={`an-delta ${good ? 'up' : 'down'}`}>{change > 0 ? '▲' : '▼'} {Math.abs(change * 100).toFixed(0)}%</span>;
}

function Kpi({ label, value, now, before, note, lead }) {
  return <div className={`an-kpi ${lead ? 'lead' : ''}`}>
    <span>{label}</span>
    <b>{value}</b>
    <small><Delta now={now} before={before}/> {note}</small>
  </div>;
}

function TrafficChart({ daily }) {
  const [hover, setHover] = useState(null);
  if (!daily?.length) return <p className="an-empty">No visits in this period yet.</p>;
  const W = 1000, H = 240, top = 10, bottom = 26;
  const maxV = Math.max(1, ...daily.map(d => d.visitors));
  const maxP = Math.max(1, ...daily.map(d => d.phoneClicks));
  const step = W / daily.length;
  const x = i => i * step + step / 2;
  const y = v => top + (H - top - bottom) * (1 - v / maxV);
  const line = daily.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.visitors).toFixed(1)}`).join(' ');
  const area = `${line} L${x(daily.length - 1)},${H - bottom} L${x(0)},${H - bottom} Z`;
  const barW = Math.max(2, Math.min(18, step * 0.55));
  const labelEvery = Math.ceil(daily.length / 7);

  function move(event) {
    const box = event.currentTarget.getBoundingClientRect();
    const index = Math.min(daily.length - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * daily.length)));
    setHover(index);
  }

  const point = hover !== null ? daily[hover] : null;
  return <div className="an-chart">
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseMove={move} onMouseLeave={() => setHover(null)} role="img" aria-label="Visitors and phone clicks per day">
      {[0.25, 0.5, 0.75, 1].map(f => <line key={f} x1="0" x2={W} y1={y(maxV * f)} y2={y(maxV * f)} stroke="#eef1f5" strokeWidth="1" vectorEffect="non-scaling-stroke"/>)}
      {daily.map((d, i) => d.phoneClicks ? <rect key={`p${d.date}`} x={x(i) - barW / 2} width={barW} y={H - bottom - (H - top - bottom) * 0.4 * (d.phoneClicks / maxP)} height={(H - top - bottom) * 0.4 * (d.phoneClicks / maxP)} rx="2" fill="#f97316" opacity=".85"/> : null)}
      <path d={area} fill="#1f67b2" opacity=".1"/>
      <path d={line} fill="none" stroke="#1f67b2" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
      {point ? <line x1={x(hover)} x2={x(hover)} y1={top} y2={H - bottom} stroke="#98a2b3" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> : null}
      {daily.map((d, i) => i % labelEvery === 0 ? <text key={`l${d.date}`} x={x(i)} y={H - 6} textAnchor="middle" fontSize="12" fill="#667085" style={{ transform: 'none' }}>{shortDate(d.date)}</text> : null)}
    </svg>
    {point ? <div className="an-tip" style={{ left: `${((hover + 0.5) / daily.length) * 100}%` }}>
      <b>{shortDate(point.date)}</b>
      {number(point.visitors)} visitors · {number(point.pageViews)} page views · {number(point.phoneClicks)} phone clicks
    </div> : null}
  </div>;
}

function Bars({ items, label, value, color, empty }) {
  if (!items?.length) return <p className="an-empty">{empty}</p>;
  const max = Math.max(1, ...items.map(value));
  return <div className="an-bars">{items.map(item => <div className="an-bar-row" key={label(item)}>
    <div className="an-bar-top"><span title={label(item)}>{label(item)}</span><b>{number(value(item))}</b></div>
    <div className="an-bar-track"><div className={`an-bar-fill ${color || ''}`} style={{ width: `${(value(item) / max) * 100}%` }}/></div>
  </div>)}</div>;
}

function Split({ items, empty }) {
  const total = (items || []).reduce((sum, item) => sum + item.visitors, 0);
  if (!total) return <p className="an-empty">{empty}</p>;
  return <>
    <div className="an-split">{items.map((item, i) => <div key={item.name} style={{ width: `${(item.visitors / total) * 100}%`, background: SPLIT_COLORS[i % SPLIT_COLORS.length] }}/>)}</div>
    <div className="an-split-legend">{items.map((item, i) => <div key={item.name}>
      <span style={{ textTransform: 'capitalize' }}><i style={{ background: SPLIT_COLORS[i % SPLIT_COLORS.length] }}/>{item.name}</span>
      <b>{Math.round((item.visitors / total) * 100)}%</b>
    </div>)}</div>
  </>;
}

export function AnalyticsView({ ga, requests, days, setDays, loading, error, onRefresh }) {
  const connected = Boolean(ga?.connected);
  const cur = ga?.current || {};
  const prev = connected ? ga.previous || {} : {};

  const quotes = useMemo(() => {
    const end = Date.now();
    const inRange = (from, to) => requests.filter(item => validDate(item.created_at) && new Date(item.created_at).getTime() >= from && new Date(item.created_at).getTime() < to);
    return { now: inRange(end - days * DAY, end + DAY), before: inRange(end - 2 * days * DAY, end - days * DAY) };
  }, [requests, days]);
  const booked = quotes.now.filter(item => ['booked', 'complete'].includes(item.status)).length;
  const completed = quotes.now.filter(item => item.status === 'complete').length;
  const leadsNow = (cur.phoneClicks || 0) + quotes.now.length;
  const leadsBefore = (prev.phoneClicks || 0) + quotes.before.length;
  const rateNow = cur.visitors ? leadsNow / cur.visitors : 0;
  const rateBefore = prev.visitors ? leadsBefore / prev.visitors : null;
  const ga4 = value => loading ? '—' : connected ? value : '—';
  const notConnected = 'Shows once Google Analytics is connected.';

  return <div className="an">
    <div className="an-head">
      <div>
        <h1>Analytics</h1>
        <p>Sunwings Transport · who visits the website, and who calls or asks for a quote</p>
        {!loading && <div className={`an-status ${connected ? '' : 'off'}`}>{connected ? 'Live from Google Analytics' : 'Google Analytics not connected'}</div>}
      </div>
      <div className="an-tools">
        <div className="an-periods" role="tablist" aria-label="Period">
          {PERIODS.map(([value, label]) => <button key={value} type="button" className={days === value ? 'on' : ''} onClick={() => setDays(value)}>{label}</button>)}
        </div>
        <button className="site-admin-btn secondary" type="button" onClick={onRefresh} disabled={loading}><RefreshCw size={15}/> {loading ? 'Loading…' : 'Refresh'}</button>
        <a className="site-admin-btn secondary" href={GA_LINK} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Google Analytics</a>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {!loading && ga && !connected && <div className="site-admin-alert error">
      Google Analytics didn’t load{ga.missing?.length ? `. Missing Vercel settings: ${ga.missing.join(', ')}.` : ga.reason ? `: ${ga.reason}` : '.'}
    </div>}

    <div className="an-kpis">
      <Kpi label="Visitors" value={ga4(number(cur.visitors))} now={cur.visitors} before={prev.visitors} note={connected ? `${number(cur.newVisitors)} new` : ''}/>
      <Kpi label="Page views" value={ga4(number(cur.pageViews))} now={cur.pageViews} before={prev.pageViews} note={connected && cur.visitors ? `${(cur.pageViews / cur.visitors).toFixed(1)} per visitor` : ''}/>
      <Kpi lead label="Phone clicks" value={ga4(number(cur.phoneClicks))} now={cur.phoneClicks} before={prev.phoneClicks} note="Call Now taps"/>
      <Kpi lead label="Quote requests" value={loading ? '—' : number(quotes.now.length)} now={quotes.now.length} before={quotes.before.length} note="forms received"/>
      <Kpi label="Visitors → leads" value={ga4(percent(rateNow))} now={rateNow} before={rateBefore} note="called or asked for a quote"/>
      <Kpi label="Time on site" value={ga4(duration(cur.avgSessionSeconds))} now={cur.avgSessionSeconds} before={prev.avgSessionSeconds} note={connected ? `${percent(cur.engagementRate)} engaged` : ''}/>
    </div>

    <section className="an-card an-chart-card">
      <h2>Visitors and phone clicks per day</h2>
      <div className="an-legend"><span><i style={{ background: '#1f67b2' }}/>Visitors</span><span><i style={{ background: '#f97316' }}/>Phone clicks</span></div>
      {connected ? <TrafficChart daily={ga.daily}/> : <p className="an-empty">{loading ? 'Loading…' : notConnected}</p>}
    </section>

    <section className="an-card" style={{ marginBottom: 16 }}>
      <h2>From visit to job</h2>
      <p className="an-sub">The last {PERIODS.find(([value]) => value === days)?.[1]}.</p>
      <div className="an-funnel">
        <div className="an-step"><span>Visitors</span><b>{ga4(number(cur.visitors))}</b><small>on the website</small></div>
        <div className="an-step hot"><span>Phone clicks</span><b>{ga4(number(cur.phoneClicks))}</b><small>tapped Call Now</small></div>
        <div className="an-step hot"><span>Quote requests</span><b>{loading ? '—' : number(quotes.now.length)}</b><small>sent the form</small></div>
        <div className="an-step done"><span>Booked</span><b>{loading ? '—' : number(booked)}</b><small>booked or completed</small></div>
        <div className="an-step done"><span>Completed</span><b>{loading ? '—' : number(completed)}</b><small>jobs done</small></div>
      </div>
    </section>

    <div className="an-grid-3">
      <section className="an-card">
        <h2>How people find the site</h2>
        <p className="an-sub">Visits by where they came from</p>
        <Bars items={ga?.channels} label={item => item.name} value={item => item.sessions} empty={connected ? 'No visits yet.' : notConnected}/>
      </section>
      <section className="an-card">
        <h2>Phone or computer</h2>
        <p className="an-sub">Visitors by device</p>
        <Split items={ga?.devices} empty={connected ? 'No visitors yet.' : notConnected}/>
      </section>
      <section className="an-card">
        <h2>Top cities</h2>
        <p className="an-sub">Where visitors are</p>
        <Bars items={ga?.cities} label={item => item.name === '(not set)' ? 'Unknown' : item.name} value={item => item.visitors} empty={connected ? 'No visitors yet.' : notConnected}/>
      </section>
    </div>

    <div className="an-grid-2">
      <section className="an-card">
        <h2>Top pages</h2>
        <p className="an-sub">Page views</p>
        <Bars items={ga?.topPages} label={item => item.path} value={item => item.views} empty={connected ? 'No page views yet.' : notConnected}/>
      </section>
      <section className="an-card">
        <h2>Pages people call from</h2>
        <p className="an-sub">Call Now taps by page</p>
        <Bars items={ga?.phoneByPage} label={item => item.path} value={item => item.clicks} color="orange" empty={connected ? 'No phone clicks in this period.' : notConnected}/>
      </section>
    </div>

    <div className="an-grid-2">
      <section className="an-card">
        <h2>Websites and searches sending visitors</h2>
        <p className="an-sub">Source / medium</p>
        <Bars items={ga?.sources} label={item => item.name} value={item => item.sessions} empty={connected ? 'No visits yet.' : notConnected}/>
      </section>
      <section className="an-card">
        <h2>Recent quote requests</h2>
        <p className="an-sub"><Link to="/admin/sunwings/quotes">Open Quote Requests</Link> for customer details</p>
        {loading ? <p className="an-empty">Loading…</p> : !quotes.now.length ? <p className="an-empty">No quote requests in this period.</p> :
          <div style={{ overflowX: 'auto' }}><table className="an-table"><thead><tr><th>Received</th><th>Service</th><th>Type</th><th>Status</th></tr></thead><tbody>
            {quotes.now.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8).map(item => <tr key={item.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(item.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</td>
              <td>{item.service || '—'}</td>
              <td>{requestType(item)}</td>
              <td><span className={`an-pill ${item.status || 'new'}`}>{String(item.status || 'new').replace(/_/g, ' ')}</span></td>
            </tr>)}
          </tbody></table></div>}
      </section>
    </div>
  </div>;
}

export default function SunwingsAnalytics() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [ga, setGa] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    const [quotes, google] = await Promise.allSettled([loadSunwingsQuotes(accessToken), loadGoogleAnalytics(accessToken, days)]);
    if (quotes.status === 'fulfilled') setRequests(quotes.value); else setError(quotes.reason?.message || 'Unable to load quote requests.');
    setGa(google.status === 'fulfilled' ? google.value : { connected: false, reason: google.reason?.message });
    setLoading(false);
  }, [accessToken, days]);
  useEffect(() => { refresh(); }, [refresh]);

  return <AnalyticsView ga={ga} requests={requests} days={days} setDays={setDays} loading={loading} error={error} onRefresh={refresh}/>;
}
