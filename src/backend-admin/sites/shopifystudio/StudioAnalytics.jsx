import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { adminFetch, parseJsonResponse } from '../../services/apiClient';
import { loadServiceRequests } from '../../features/service-requests/serviceRequests.service';
import { Bars, Kpi, Split, TrafficChart } from '../../features/analytics/SunwingsAnalytics';
import '../../features/analytics/analytics.css';

// Shopify Studio Analytics — the Sunwings Analytics page, reused: visits to the /shopify-studio pages
// (Google Analytics), which Shopify Tips people read, where they came from, and the free reviews and
// quotes received (the admin's own records).

const PERIODS = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [365, '12 months']];
const GA_LINK = 'https://analytics.google.com/analytics/web/';
const GREEN = '#22a05a';
const AMBER = '#f59e0b';
const DAY = 86400000;
const number = value => Math.round(Number(value || 0)).toLocaleString('en-CA');
const percent = value => `${(Number(value || 0) * 100).toFixed(1)}%`;
const duration = seconds => { const s = Math.round(Number(seconds || 0)); return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`; };
const pageName = path => path === '/shopify-studio' ? 'Shopify Studio (main page)' : path.replace(/^\/shopify-studio\/?/, '/').replace(/^\/tips\//, 'Tip: ');
// The Studio form starts the message with "Quote request." or "Free store review request."
const isReview = item => !/^\s*quote request/i.test(item.message || '');

export default function StudioAnalytics() {
  const { accessToken } = useAuth();
  const [ga, setGa] = useState(null);
  const [requests, setRequests] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError('');
    const [reqs, google] = await Promise.allSettled([
      loadServiceRequests(accessToken, 'studio'),
      adminFetch(`/api/admin/studio-analytics?days=${days}`, {}, accessToken).then(r => parseJsonResponse(r, 'Unable to load Google Analytics.')),
    ]);
    if (reqs.status === 'fulfilled') setRequests(reqs.value); else setError(reqs.reason?.message || 'Unable to load requests.');
    setGa(google.status === 'fulfilled' ? google.value : { connected: false, reason: google.reason?.message });
    setLoading(false);
  }, [accessToken, days]);
  useEffect(() => { refresh(); }, [refresh]);

  const connected = Boolean(ga?.connected);
  const cur = ga?.current || {};
  const prev = connected ? ga.previous || {} : {};
  const ev = cur.events || {};
  const ga4 = value => loading ? '—' : connected ? value : '—';
  const notConnected = 'Shows once Google Analytics is connected.';

  const received = useMemo(() => {
    const end = Date.now();
    const between = (from, to) => requests.filter(r => { const t = new Date(r.created_at).getTime(); return t >= from && t < to; });
    return { now: between(end - days * DAY, end + DAY), before: between(end - 2 * days * DAY, end - days * DAY) };
  }, [requests, days]);
  const rateNow = cur.visitors ? received.now.length / cur.visitors : 0;
  const rateBefore = prev.visitors ? received.before.length / prev.visitors : null;

  return <div className="an">
    <div className="an-head">
      <div>
        <h1>Analytics</h1>
        <p>Shopify Studio · who visits the Studio pages, which tips they read, and who asks for a review or quote</p>
        {!loading && <div className={`an-status ${connected ? '' : 'off'}`}>{connected ? 'Live from Google Analytics' : 'Google Analytics not connected yet'}</div>}
      </div>
      <div className="an-tools">
        <div className="an-periods" role="tablist" aria-label="Period">
          {PERIODS.map(([value, label]) => <button key={value} type="button" className={days === value ? 'on' : ''} onClick={() => setDays(value)}>{label}</button>)}
        </div>
        <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> {loading ? 'Loading…' : 'Refresh'}</button>
        <a className="site-admin-btn secondary" href={GA_LINK} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Google Analytics</a>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {!loading && ga && !connected && <div className="site-admin-note" style={{ marginBottom: 14 }}>
      Website numbers appear once Google Analytics is connected{ga.missing?.length ? ` (missing setting: ${ga.missing.join(', ')})` : ga.reason ? ` (${ga.reason})` : ''}. Free reviews and quotes below already count from your own records.
    </div>}

    <div className="an-kpis">
      <Kpi label="Visitors" value={ga4(number(cur.visitors))} now={cur.visitors} before={prev.visitors} note={connected ? `${number(cur.newVisitors)} new` : ''}/>
      <Kpi label="Page views" value={ga4(number(cur.pageViews))} now={cur.pageViews} before={prev.pageViews} note={connected && cur.visitors ? `${(cur.pageViews / cur.visitors).toFixed(1)} per visitor` : ''}/>
      <Kpi lead label="Free reviews & quotes" value={loading ? '—' : number(received.now.length)} now={received.now.length} before={received.before.length} note="requests received"/>
      <Kpi label="Visitors → requests" value={ga4(percent(rateNow))} now={rateNow} before={rateBefore} note="asked for a review or quote"/>
      <Kpi label="Package clicks" value={ga4(number(ev.select_package))} now={ev.select_package} before={prev.events?.select_package} note="picked a package"/>
      <Kpi label="Time on site" value={ga4(duration(cur.avgSessionSeconds))} now={cur.avgSessionSeconds} before={prev.avgSessionSeconds} note={connected ? `${percent(cur.engagementRate)} engaged` : ''}/>
    </div>

    <section className="an-card an-chart-card">
      <h2>Visitors and requests per day</h2>
      <div className="an-legend"><span><i style={{ background: GREEN }}/>Visitors</span><span><i style={{ background: AMBER }}/>Free reviews &amp; quotes</span></div>
      {connected ? <TrafficChart daily={ga.daily} barKey="leads" barLabel="requests" lineColor={GREEN} barColor={AMBER}/> : <p className="an-empty">{loading ? 'Loading…' : notConnected}</p>}
    </section>

    <section className="an-card" style={{ marginBottom: 16 }}>
      <h2>From visit to customer</h2>
      <p className="an-sub">The last {PERIODS.find(([value]) => value === days)?.[1]}.</p>
      <div className="an-funnel">
        <div className="an-step"><span>Visitors</span><b>{ga4(number(cur.visitors))}</b><small>on the Studio pages</small></div>
        <div className="an-step"><span>Looked at pricing</span><b>{ga4(number(ev.pricing_click))}</b><small>pricing clicks</small></div>
        <div className="an-step"><span>Opened a demo</span><b>{ga4(number(ev.demo_store_open))}</b><small>demo store</small></div>
        <div className="an-step hot"><span>Requests</span><b>{loading ? '—' : number(received.now.length)}</b><small>reviews and quotes</small></div>
        <div className="an-step done"><span>Won</span><b>{loading ? '—' : number(received.now.filter(r => ['accepted', 'in_progress', 'complete'].includes(r.status)).length)}</b><small>accepted or done</small></div>
      </div>
    </section>

    <div className="an-grid-2">
      <section className="an-card">
        <h2>Top Shopify Tips</h2>
        <p className="an-sub">Which how-to guides people read</p>
        <Bars items={ga?.topTips} label={item => pageName(item.path)} value={item => item.views} empty={connected ? 'No tips read yet — publish the first one.' : notConnected}/>
      </section>
      <section className="an-card">
        <h2>Top Studio pages</h2>
        <p className="an-sub">Page views</p>
        <Bars items={ga?.topPages} label={item => pageName(item.path)} value={item => item.views} empty={connected ? 'No page views yet.' : notConnected}/>
      </section>
    </div>

    <div className="an-grid-3">
      <section className="an-card">
        <h2>How people find the Studio</h2>
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
        <h2>Websites and searches sending visitors</h2>
        <p className="an-sub">Source / medium</p>
        <Bars items={ga?.sources} label={item => item.name} value={item => item.sessions} empty={connected ? 'No visits yet.' : notConnected}/>
      </section>
      <section className="an-card">
        <h2>Recent requests</h2>
        <p className="an-sub"><Link to="/admin/service-requests">Open Free Reviews &amp; Quotes</Link> for customer details</p>
        {loading ? <p className="an-empty">Loading…</p> : !received.now.length ? <p className="an-empty">No requests in this period.</p> :
          <div style={{ overflowX: 'auto' }}><table className="an-table"><thead><tr><th>Received</th><th>Type</th><th>Came from</th><th>Status</th></tr></thead><tbody>
            {received.now.slice(0, 8).map(item => <tr key={item.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(item.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</td>
              <td>{isReview(item) ? 'Free review' : 'Quote'}</td>
              <td>{item.utm_source || (item.referrer ? item.referrer.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : 'Direct')}</td>
              <td><span className={`an-pill ${item.status || 'new'}`}>{String(item.status || 'new').replace(/_/g, ' ')}</span></td>
            </tr>)}
          </tbody></table></div>}
      </section>
    </div>
  </div>;
}
