import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadSunwingsQuotes } from '../../sites/sunwings/sunwingsAdminService';

const formatDate = value => new Date(value).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' });
const validDate = value => value && !Number.isNaN(new Date(value).getTime());
const periods = [{ label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: '90 days', days: 90 }, { label: 'All time', days: 0 }];
const card = { border: '1px solid var(--border, #d6dbe1)', borderRadius: 12, padding: 18, minWidth: 0 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 };

export default function SunwingsAnalytics() {
  const { accessToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try { setRequests(await loadSunwingsQuotes(accessToken)); }
    catch (err) { setError(err?.message || 'Unable to load analytics.'); }
    finally { setLoading(false); }
  }, [accessToken]);
  useEffect(() => { refresh(); }, [refresh]);
  const filtered = useMemo(() => {
    const cutoff = days ? Date.now() - days * 86400000 : 0;
    return requests.filter(item => validDate(item.created_at) && new Date(item.created_at).getTime() >= cutoff);
  }, [requests, days]);
  const booked = filtered.filter(item => ['booked', 'complete'].includes(item.status));
  const completed = filtered.filter(item => item.status === 'complete');
  const sourceCounts = useMemo(() => {
    const result = {};
    for (const item of filtered) {
      const source = item.request_type === 'quick_quote' ? 'Quick quote' : item.request_type === 'contact' ? 'Contact' : 'Full quote';
      result[source] = (result[source] || 0) + 1;
    }
    return Object.entries(result).sort((a,b) => b[1]-a[1]);
  }, [filtered]);
  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 0 40px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div><h1 style={{ margin: '0 0 5px' }}>Analytics</h1><p style={{ margin: 0, opacity: .7 }}>Sunwings Transport · Verified website inquiries</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label htmlFor="analytics-period" style={{ alignSelf: 'center' }}>Period</label>
          <select id="analytics-period" value={days} onChange={event => setDays(Number(event.target.value))} style={{ padding: 9, borderRadius: 8 }}>
            {periods.map(period => <option key={period.days} value={period.days}>{period.label}</option>)}
          </select>
          <button type="button" onClick={refresh} disabled={loading} style={{ padding: '9px 14px', borderRadius: 8 }}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
      </div>
      {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
      <div style={grid}>
        {[
          ['Quote requests', loading || error ? '—' : filtered.length],
          ['Booked or completed', loading || error ? '—' : booked.length],
          ['Completed', loading || error ? '—' : completed.length],
          ['Phone clicks', 'Not connected'],
          ['Visitors', 'Not connected'],
          ['Page views', 'Not connected'],
        ].map(([label, value]) => <div key={label} style={card}><div style={{ opacity: .7, fontSize: 13, marginBottom: 10 }}>{label}</div><div style={{ fontSize: typeof value === 'number' ? 28 : 16, fontWeight: 700 }}>{value}</div></div>)}
      </div>
      <p style={{ fontSize: 13, opacity: .75, margin: '14px 0 24px' }}>Quote totals are read from existing Supabase submissions. Booked/completed totals reflect statuses recorded in the admin, not independently verified payments. GA4 phone and traffic reporting will remain unconnected until reporting access is configured.</p>
      <section style={{ ...card, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Inquiry types</h2>
        {loading ? <p>Loading…</p> : !sourceCounts.length ? <p>No recorded inquiries in this period.</p> : sourceCounts.map(([name, count]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '10px 0' }}><span>{name}</span><strong>{count}</strong></div>)}
      </section>
      <section style={card}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Recent quote activity</h2>
        {loading ? <p>Loading…</p> : filtered.length === 0 ? <p>No recorded quote requests in this period.</p> :
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr>{['Received', 'Type', 'Service', 'Status'].map(label => <th key={label} style={{ padding: '10px 8px', borderBottom: '1px solid #ddd' }}>{label}</th>)}</tr></thead><tbody>
            {filtered.slice().sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50).map(item => <tr key={item.id}><td style={{ padding: '10px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{formatDate(item.created_at)}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>{item.request_type || 'quote'}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>{item.service || '—'}</td><td style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>{item.status || 'new'}</td></tr>)}
          </tbody></table></div>}
        <p style={{ marginBottom: 0, fontSize: 13 }}>View full customer details and update statuses in Quote Requests.</p>
      </section>
    </div>
  );
}
