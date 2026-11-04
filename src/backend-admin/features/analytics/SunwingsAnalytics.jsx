import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { adminFetch, parseJsonResponse } from '../../services/apiClient';
import { loadSunwingsQuotes } from '../../sites/sunwings/sunwingsAdminService';

// Sunwings Analytics: website traffic and phone clicks from Google Analytics (GA4),
// plus quote requests counted from the admin's own records.

const periods = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }, { label: 'Last 12 months', days: 365 }];
const formatDate = value => new Date(value).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
const validDate = value => value && !Number.isNaN(new Date(value).getTime());
const number = value => Number(value || 0).toLocaleString('en-CA');
const card = { border: '1px solid var(--border, #d6dbe1)', borderRadius: 12, padding: 18, minWidth: 0, background: '#fff' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 };
const twoCol = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 };
const row = { display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #eee', padding: '9px 0' };
const GA_LINK = 'https://analytics.google.com/analytics/web/';

async function loadGoogleAnalytics(accessToken, days) {
  return parseJsonResponse(
    await adminFetch(`/api/admin/sunwings/google-analytics?days=${days}`, {}, accessToken),
    'Unable to load Google Analytics.',
  );
}

function List({ title, items, empty, render }) {
  return <section style={card}>
    <h2 style={{ marginTop: 0, fontSize: 18 }}>{title}</h2>
    {!items?.length ? <p style={{ opacity: .7, margin: 0 }}>{empty}</p> : items.map(render)}
  </section>;
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

  const filtered = useMemo(() => {
    const cutoff = Date.now() - days * 86400000;
    return requests.filter(item => validDate(item.created_at) && new Date(item.created_at).getTime() >= cutoff);
  }, [requests, days]);
  const booked = filtered.filter(item => ['booked', 'complete'].includes(item.status));
  const connected = ga?.connected;
  const gaValue = key => loading ? '—' : connected ? number(ga[key]) : 'Not connected';
  const emptyText = what => connected ? `No ${what} in this period.` : 'Shows once Google Analytics is connected.';

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 0 40px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div><h1 style={{ margin: '0 0 5px' }}>Analytics</h1><p style={{ margin: 0, opacity: .7 }}>Sunwings Transport · visitors, phone clicks and quote requests</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select aria-label="Period" value={days} onChange={event => setDays(Number(event.target.value))} style={{ padding: 9, borderRadius: 8 }}>
            {periods.map(period => <option key={period.days} value={period.days}>{period.label}</option>)}
          </select>
          <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> {loading ? 'Loading…' : 'Refresh'}</button>
          <a className="site-admin-btn secondary" href={GA_LINK} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Google Analytics</a>
        </div>
      </div>

      {error && <div className="site-admin-alert error">{error}</div>}
      {!loading && ga && !connected && <div className="site-admin-alert error">
        Google Analytics isn’t connected yet{ga.reason && !ga.missing ? `: ${ga.reason}` : '.'}
        {ga.missing?.length ? ` Missing Vercel settings: ${ga.missing.join(', ')}.` : ''}
      </div>}

      <div style={{ ...grid, marginBottom: 8 }}>
        {[
          ['Visitors', gaValue('visitors')],
          ['Page views', gaValue('pageViews')],
          ['Phone clicks', gaValue('phoneClicks')],
          ['Quote requests', loading ? '—' : number(filtered.length)],
          ['Booked or completed', loading ? '—' : number(booked.length)],
        ].map(([label, value]) => <div key={label} style={card}>
          <div style={{ opacity: .7, fontSize: 13, marginBottom: 10 }}>{label}</div>
          <div style={{ fontSize: value === 'Not connected' ? 16 : 28, fontWeight: 700 }}>{value}</div>
        </div>)}
      </div>
      <p style={{ fontSize: 13, opacity: .75, margin: '6px 0 22px' }}>Visitors, page views and phone clicks come from Google Analytics (it can take a few hours to catch up). Quote requests come from the forms saved in this admin.</p>

      <div style={twoCol}>
        <List title="Where visitors come from" items={ga?.sources} empty={emptyText('visits')}
          render={item => <div key={item.source} style={row}><span>{item.source}</span><strong>{number(item.sessions)}</strong></div>}/>
        <List title="Phone clicks by page" items={ga?.phoneByPage} empty={emptyText('phone clicks')}
          render={item => <div key={item.path} style={row}><span>{item.path}</span><strong>{number(item.clicks)}</strong></div>}/>
      </div>

      <div style={{ marginBottom: 16 }}>
        <List title="Top pages" items={ga?.topPages} empty={emptyText('page views')}
          render={item => <div key={item.path} style={row}><span>{item.path}</span><span><strong>{number(item.views)}</strong> <small style={{ opacity: .7 }}>views · {number(item.visitors)} visitors</small></span></div>}/>
      </div>

      <section style={card}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Recent quote requests</h2>
        {loading ? <p>Loading…</p> : filtered.length === 0 ? <p>No quote requests in this period.</p> :
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr>{['Received', 'Type', 'Service', 'Status'].map(label => <th key={label} style={{ padding: '10px 8px', borderBottom: '1px solid #ddd' }}>{label}</th>)}</tr></thead><tbody>
            {filtered.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50).map(item => <tr key={item.id}>
              <td style={{ padding: '10px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{formatDate(item.created_at)}</td>
              <td style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>{item.request_type === 'quick_quote' ? 'Quick quote' : item.request_type === 'contact' ? 'Contact' : 'Full quote'}</td>
              <td style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>{item.service || '—'}</td>
              <td style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>{String(item.status || 'new').replace(/_/g, ' ')}</td>
            </tr>)}
          </tbody></table></div>}
        <p style={{ marginBottom: 0, fontSize: 13 }}><Link to="/admin/sunwings/quotes">Open Quote Requests</Link> for customer details and to update statuses.</p>
      </section>
    </div>
  );
}
