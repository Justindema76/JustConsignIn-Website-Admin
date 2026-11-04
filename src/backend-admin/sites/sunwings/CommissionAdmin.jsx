import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import {
  addInvestment, addPartner, deleteInvestment, loadInvestments, loadPartners,
  loadSunwingsQuotes, removePartner, updateSunwingsQuote,
} from './sunwingsAdminService';
import { commissionFor, money } from './commission';
import './sunwingsJobs.css';

// Justin's money from Sunwings: commission owed/paid per job (10% up to $800, 20% over),
// money put into the business, and who has partner access to "Jobs from Justin".

const CATEGORIES = ['Flyers & printing', 'Ads (Google / Facebook)', 'Website & hosting', 'Equipment', 'Other'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function CommissionAdmin() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState('jobs');
  const [quotes, setQuotes] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [partners, setPartners] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [inv, setInv] = useState({ spentOn: today(), amount: '', category: CATEGORIES[0], note: '' });
  const [partnerEmail, setPartnerEmail] = useState('');

  async function refresh() {
    if (!accessToken) return;
    setLoading(true); setError('');
    const [q, i, p] = await Promise.allSettled([loadSunwingsQuotes(accessToken), loadInvestments(accessToken), loadPartners(accessToken)]);
    if (q.status === 'fulfilled') setQuotes(q.value);
    if (i.status === 'fulfilled') setInvestments(i.value);
    if (p.status === 'fulfilled') setPartners(p.value);
    const failed = [q, i, p].find(result => result.status === 'rejected');
    if (failed) setError(`${failed.reason?.message || 'Something didn’t load.'} If you haven’t yet, run the one-time database setup.`);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, [accessToken]);

  // Jobs that earn commission: anything with a price that isn't marked "no commission".
  const jobs = useMemo(() => quotes
    .map(request => ({ request, ...commissionFor(request) }))
    .filter(job => job.price !== null && job.request.commission_status !== 'none')
    .sort((a, b) => String(b.request.updated_at || '').localeCompare(String(a.request.updated_at || ''))), [quotes]);

  const owedJobs = jobs.filter(job => (job.request.commission_status || 'owed') === 'owed' && job.request.status === 'complete');
  const pendingJobs = jobs.filter(job => (job.request.commission_status || 'owed') === 'owed' && job.request.status !== 'complete');
  const paidJobs = jobs.filter(job => job.request.commission_status === 'paid');
  const sum = list => list.reduce((total, job) => total + job.amount, 0);
  const invested = investments.reduce((total, item) => total + Number(item.amount || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const earnedThisMonth = sum(jobs.filter(job => String(job.request.commission_paid_at || job.request.updated_at || '').startsWith(thisMonth) && job.request.status === 'complete'));

  const visible = filter === 'owed' ? owedJobs : filter === 'pending' ? pendingJobs : filter === 'paid' ? paidJobs : jobs;

  async function markPaid(request) {
    setError(''); setMessage('');
    try {
      const updated = await updateSunwingsQuote(accessToken, { id: request.id, commissionStatus: 'paid', commissionPaidAt: today() });
      setQuotes(rows => rows.map(row => row.id === updated.id ? updated : row));
      setMessage(`Marked paid: ${request.name}.`);
    } catch (err) { setError(err.message); }
  }

  async function saveInvestment() {
    setError(''); setMessage('');
    try {
      const saved = await addInvestment(accessToken, inv);
      setInvestments(rows => [saved, ...rows]);
      setInv({ spentOn: today(), amount: '', category: inv.category, note: '' });
      setMessage('Investment added.');
    } catch (err) { setError(err.message); }
  }

  async function removeInvestmentRow(item) {
    if (!window.confirm('Delete this investment entry?')) return;
    try { await deleteInvestment(accessToken, item.id); setInvestments(rows => rows.filter(row => row.id !== item.id)); } catch (err) { setError(err.message); }
  }

  async function savePartner() {
    setError(''); setMessage('');
    try {
      const saved = await addPartner(accessToken, { email: partnerEmail, label: 'Marius' });
      setPartners(rows => [...rows.filter(row => row.id !== saved.id), saved]);
      setPartnerEmail('');
      setMessage('Partner added. They sign in with Google using that email and only see “Jobs from Justin”.');
    } catch (err) { setError(err.message); }
  }

  async function removePartnerRow(item) {
    if (!window.confirm(`Remove ${item.email}? They will no longer see any jobs.`)) return;
    try { await removePartner(accessToken, item.id); setPartners(rows => rows.filter(row => row.id !== item.id)); } catch (err) { setError(err.message); }
  }

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Leads &amp; money</p>
        <h1>My Commission &amp; Investment</h1>
        <p>What Marius owes you, what he’s paid, and what you’ve put into Sunwings. Commission is 10% on jobs up to $800 and 20% on jobs over $800.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="money-stats">
      <div className="money-stat attention"><span>Owed to me</span><b>{money(sum(owedJobs))}</b><small>{owedJobs.length} completed job{owedJobs.length === 1 ? '' : 's'}</small></div>
      <div className="money-stat"><span>Coming</span><b>{money(sum(pendingJobs))}</b><small>jobs not finished yet</small></div>
      <div className="money-stat"><span>Paid to me</span><b>{money(sum(paidJobs))}</b><small>all time</small></div>
      <div className="money-stat"><span>This month</span><b>{money(earnedThisMonth)}</b><small>completed jobs</small></div>
      <div className="money-stat"><span>I’ve invested</span><b>{money(invested)}</b><small>flyers, ads, etc.</small></div>
      <div className="money-stat"><span>Net so far</span><b>{money(sum(paidJobs) - invested)}</b><small>paid − invested</small></div>
    </div>

    <div className="settings-tabs" role="tablist">
      {[['jobs', 'Commission by job'], ['investments', 'My investment'], ['partner', 'Marius’s access']].map(([key, label]) => (
        <button key={key} type="button" role="tab" aria-selected={tab === key} className={`settings-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>{label}</button>
      ))}
    </div>

    {tab === 'jobs' && <section className="site-admin-card money-panel">
      <div className="money-panel-head">
        <h2>Commission by job</h2>
        <select value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">All jobs</option><option value="owed">Owed (completed)</option><option value="pending">Coming (not finished)</option><option value="paid">Paid</option>
        </select>
      </div>
      {!visible.length ? <p className="job-hint">No jobs here yet. A job shows up once it has a price (Marius’s price, the final price or a quote amount).</p> :
        <div className="money-table-wrap"><table className="money-table">
          <thead><tr><th>Customer</th><th>Service</th><th>Job status</th><th className="num">Job price</th><th className="num">Rate</th><th className="num">Commission</th><th>Commission</th><th></th></tr></thead>
          <tbody>{visible.map(({ request, price, rate, amount }) => <tr key={request.id}>
            <td><Link to="/admin/sunwings/quotes"><b>{request.name}</b></Link></td>
            <td>{request.service || '—'}</td>
            <td>{String(request.status || 'new').replace(/_/g, ' ')}</td>
            <td className="num">{money(price)}</td>
            <td className="num">{rate}%</td>
            <td className="num"><b>{money(amount)}</b></td>
            <td><span className={`job-chip ${request.commission_status === 'paid' ? 'paid' : 'attention'}`}>{request.commission_status === 'paid' ? `Paid${request.commission_paid_at ? ` ${request.commission_paid_at}` : ''}` : 'Owed'}</span></td>
            <td>{request.commission_status !== 'paid' && request.status === 'complete' ? <button className="site-admin-btn small" type="button" onClick={() => markPaid(request)}>Mark paid</button> : null}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>}

    {tab === 'investments' && <section className="site-admin-card money-panel">
      <h2>My investment in Sunwings</h2>
      <div className="money-form">
        <label>Date<input type="date" value={inv.spentOn} onChange={event => setInv({ ...inv, spentOn: event.target.value })}/></label>
        <label>Amount<input type="number" min="0" step="0.01" value={inv.amount} onChange={event => setInv({ ...inv, amount: event.target.value })} placeholder="$"/></label>
        <label>What for<select value={inv.category} onChange={event => setInv({ ...inv, category: event.target.value })}>{CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Note<input value={inv.note} onChange={event => setInv({ ...inv, note: event.target.value })} placeholder="e.g. 500 door hangers, Markham"/></label>
      </div>
      <button className="site-admin-btn small" type="button" onClick={saveInvestment}><Plus size={14}/> Add investment</button>
      {investments.length ? <div className="money-table-wrap"><table className="money-table">
        <thead><tr><th>Date</th><th>What for</th><th>Note</th><th className="num">Amount</th><th></th></tr></thead>
        <tbody>{investments.map(item => <tr key={item.id}>
          <td>{item.spent_on}</td><td>{item.category}</td><td>{item.note}</td><td className="num"><b>{money(item.amount)}</b></td>
          <td><button className="site-admin-btn secondary small" type="button" onClick={() => removeInvestmentRow(item)} aria-label="Delete"><Trash2 size={13}/></button></td>
        </tr>)}</tbody>
      </table></div> : <p className="job-hint">Nothing logged yet.</p>}
    </section>}

    {tab === 'partner' && <section className="site-admin-card money-panel">
      <h2>Marius’s access</h2>
      <p className="job-hint">Add Marius’s Google email. He signs in to this admin with Google and sees only “Jobs from Justin”: the jobs you send him, with the customer’s phone and email hidden unless you share them. Don’t also add him under Team, or he’ll see everything.</p>
      <div className="money-form">
        <label className="wide">Marius’s Google email<input type="email" value={partnerEmail} onChange={event => setPartnerEmail(event.target.value)} placeholder="name@gmail.com"/></label>
      </div>
      <button className="site-admin-btn small" type="button" onClick={savePartner} disabled={!partnerEmail.includes('@')}><UserPlus size={14}/> Give access</button>
      {partners.map(item => <div className="money-partner-row" key={item.id}>
        <span><b>{item.email}</b> <small>added {new Date(item.created_at).toLocaleDateString()}</small></span>
        <button className="site-admin-btn secondary small" type="button" onClick={() => removePartnerRow(item)}>Remove</button>
      </div>)}
    </section>}
  </>;
}
