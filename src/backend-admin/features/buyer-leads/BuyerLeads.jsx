import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { addBuyerLead, deleteBuyerLead, loadBuyerLeads, updateBuyerLead } from '../../services/buyerLeadsService';
import './buyerLeads.css';

const STATUS_OPTIONS = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['interested', 'Interested'],
  ['passed', 'Passed'],
  ['sold', 'Sold'],
];

const emptyForm = {
  name: '',
  leadType: 'business',
  platform: '',
  url: '',
  location: 'Hamilton / Stoney Creek',
  wantedItems: '',
  contactMethod: '',
  contactValue: '',
  priority: 'WATCH',
  status: 'new',
  notes: '',
};

function Priority({ value }) {
  return <span className={`buyer-priority ${String(value || 'WATCH').toLowerCase()}`}>{value || 'WATCH'}</span>;
}

export default function BuyerLeads() {
  const { accessToken } = useAuth();
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const refresh = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setLeads(await loadBuyerLeads(accessToken));
    } catch (err) {
      setError(err.message || 'Unable to load Buyer Leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [accessToken]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter(lead => {
      const haystack = [lead.name, lead.platform, lead.location, lead.wanted_items, lead.contact_value, lead.notes].join(' ').toLowerCase();
      return (!needle || haystack.includes(needle))
        && (!type || lead.lead_type === type)
        && (!status || lead.status === status)
        && (!priority || lead.priority === priority);
    });
  }, [leads, query, type, status, priority]);

  const strongCount = leads.filter(lead => lead.priority === 'STRONG').length;
  const localCount = leads.filter(lead => /hamilton|stoney|burlington|ancaster/i.test(lead.location || '')).length;
  const activeCount = leads.filter(lead => ['contacted', 'interested'].includes(lead.status)).length;

  const patchLead = async (id, patch) => {
    setSavingId(id);
    setError('');
    try {
      const updated = await updateBuyerLead(accessToken, id, patch);
      setLeads(current => current.map(lead => lead.id === id ? updated : lead));
    } catch (err) {
      setError(err.message || 'Unable to update Buyer Lead.');
    } finally {
      setSavingId(null);
    }
  };

  const removeLead = async lead => {
    if (!window.confirm(`Delete "${lead.name}" from Buyer Leads?`)) return;
    setSavingId(lead.id);
    try {
      await deleteBuyerLead(accessToken, lead.id);
      setLeads(current => current.filter(item => item.id !== lead.id));
    } catch (err) {
      setError(err.message || 'Unable to delete Buyer Lead.');
    } finally {
      setSavingId(null);
    }
  };

  const submit = async event => {
    event.preventDefault();
    setError('');
    try {
      const created = await addBuyerLead(accessToken, form);
      setLeads(current => [created, ...current]);
      setForm(emptyForm);
      setShowAdd(false);
    } catch (err) {
      setError(err.message || 'Unable to add Buyer Lead.');
    }
  };

  return <div className="buyer-leads-page">
    <div className="site-admin-page-head buyer-leads-head">
      <div>
        <p className="site-admin-eyebrow">Resale Demand</p>
        <h1>Buyer Leads</h1>
        <p>People, shops and collector communities actively looking for the kinds of inventory we already own and want to sell.</p>
      </div>
      <div className="buyer-leads-head-actions">
        <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
        <button className="site-admin-btn" type="button" onClick={() => setShowAdd(true)}><Plus size={15}/> Add buyer</button>
      </div>
    </div>

    {error && <div className="buyer-leads-error">{error}</div>}

    <div className="buyer-leads-stats">
      <div><strong>{leads.length}</strong><span>Buyer leads</span></div>
      <div><strong>{strongCount}</strong><span>Strong direct buyers</span></div>
      <div><strong>{localCount}</strong><span>Local leads</span></div>
      <div><strong>{activeCount}</strong><span>Contacted / interested</span></div>
    </div>

    <div className="buyer-leads-toolbar">
      <label className="buyer-leads-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Omega Supreme, MOTU, Hamilton…"/></label>
      <select value={type} onChange={event => setType(event.target.value)}><option value="">All buyer types</option><option value="business">Businesses</option><option value="community">Communities</option><option value="individual">Individuals</option></select>
      <select value={priority} onChange={event => setPriority(event.target.value)}><option value="">All priorities</option><option>STRONG</option><option>ACTIVE</option><option>WATCH</option></select>
      <select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>

    <div className="buyer-leads-guide">
      <strong>Use this for buyers, not sourcing:</strong>
      <span>direct collectors, stores that buy collections, wanted ads, and collector forums where people are actively searching for specific toys or parts.</span>
    </div>

    {loading ? <div className="buyer-leads-empty">Loading buyer leads…</div> : visible.length === 0 ? <div className="buyer-leads-empty">No buyer leads match these filters.</div> :
      <div className="buyer-leads-grid">
        {visible.map(lead => <article className="buyer-lead-card" key={lead.id}>
          <div className="buyer-lead-card-top">
            <div>
              <div className="buyer-lead-source">{lead.platform || lead.lead_type} · {lead.location || 'Location not entered'}</div>
              <h2>{lead.name}</h2>
            </div>
            <Priority value={lead.priority}/>
          </div>

          {lead.wanted_items && <div className="buyer-lead-wanted"><strong>Looking for</strong><span>{lead.wanted_items}</span></div>}
          {lead.contact_value && <div className="buyer-lead-contact"><strong>{lead.contact_method || 'Contact'}</strong><span>{lead.contact_value}</span></div>}
          {lead.notes && <p className="buyer-lead-notes">{lead.notes}</p>}

          <div className="buyer-lead-card-actions">
            {lead.url ? <a className="site-admin-btn secondary small" href={lead.url} target="_blank" rel="noreferrer">Open lead <ExternalLink size={13}/></a> : <span/>}
            <select
              value={lead.status || 'new'}
              onChange={event => patchLead(lead.id, { status: event.target.value })}
              disabled={savingId === lead.id}
              aria-label={`Status for ${lead.name}`}
            >
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className="buyer-lead-delete" type="button" onClick={() => removeLead(lead)} disabled={savingId === lead.id} aria-label={`Delete ${lead.name}`}><Trash2 size={15}/></button>
          </div>
        </article>)}
      </div>
    }

    {showAdd && <div className="buyer-leads-modal-backdrop" onMouseDown={() => setShowAdd(false)}>
      <form className="buyer-leads-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="buyer-leads-modal-head"><div><span>Manual buyer</span><h2>Add buyer lead</h2></div><button type="button" onClick={() => setShowAdd(false)} aria-label="Close"><X size={20}/></button></div>
        <div className="buyer-leads-form-grid">
          <label className="wide">Buyer / community name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label>
          <label>Type<select value={form.leadType} onChange={event => setForm({ ...form, leadType: event.target.value })}><option value="business">Business</option><option value="community">Community</option><option value="individual">Individual</option></select></label>
          <label>Platform<input value={form.platform} onChange={event => setForm({ ...form, platform: event.target.value })}/></label>
          <label className="wide">Lead URL<input type="url" value={form.url} onChange={event => setForm({ ...form, url: event.target.value })}/></label>
          <label>Location<input value={form.location} onChange={event => setForm({ ...form, location: event.target.value })}/></label>
          <label>Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}><option>STRONG</option><option>ACTIVE</option><option>WATCH</option></select></label>
          <label className="wide">What they want<textarea rows="3" value={form.wantedItems} onChange={event => setForm({ ...form, wantedItems: event.target.value })}/></label>
          <label>Contact method<input value={form.contactMethod} onChange={event => setForm({ ...form, contactMethod: event.target.value })}/></label>
          <label>Contact details<input value={form.contactValue} onChange={event => setForm({ ...form, contactValue: event.target.value })}/></label>
          <label className="wide">Notes<textarea rows="3" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })}/></label>
        </div>
        <div className="buyer-leads-modal-actions"><button className="site-admin-btn secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</button><button className="site-admin-btn" type="submit">Add Buyer Lead</button></div>
      </form>
    </div>}
  </div>;
}
