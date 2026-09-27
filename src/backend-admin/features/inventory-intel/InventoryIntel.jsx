import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import {
  addInventoryIntelItem,
  deleteInventoryIntelItem,
  loadInventoryIntel,
  updateInventoryIntelItem,
} from '../../services/inventoryIntelService';
import './inventoryIntel.css';

const STATUS_OPTIONS = [
  ['researching', 'Researching'],
  ['contacted', 'Contacted'],
  ['negotiating', 'Negotiating'],
  ['bought', 'Bought'],
  ['passed', 'Passed'],
  ['sold', 'Sold'],
];

const emptyForm = {
  title: '',
  sourcePlatform: 'Facebook Marketplace',
  url: '',
  category: 'Hockey',
  condition: 'Used - Good',
  buyPrice: '',
  targetOffer: '',
  estimatedResaleLow: '',
  estimatedResaleHigh: '',
  quantity: '1',
  location: 'Hamilton / Stoney Creek',
  sellerName: '',
  signal: 'WATCH',
  isBundle: true,
  notes: '',
  strategy: '',
};

const money = value => {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(value));
};

function marginText(item) {
  const buy = Number(item.target_offer ?? item.buy_price);
  const low = Number(item.estimated_resale_low);
  const high = Number(item.estimated_resale_high);
  if (!Number.isFinite(buy) || (!Number.isFinite(low) && !Number.isFinite(high))) return 'Not estimated yet';
  if (Number.isFinite(low) && Number.isFinite(high)) return `${money(low - buy)}–${money(high - buy)} gross spread`;
  const resale = Number.isFinite(low) ? low : high;
  return `${money(resale - buy)} gross spread`;
}

function Recommendation({ value }) {
  return <span className={`intel-signal ${String(value || 'WATCH').toLowerCase()}`}>{value || 'WATCH'}</span>;
}

export default function InventoryIntel() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [signal, setSignal] = useState('');
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
      setItems(await loadInventoryIntel(accessToken));
    } catch (err) {
      setError(err.message || 'Unable to load Inventory Intel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [accessToken]);

  const categories = useMemo(() => [...new Set(items.map(item => item.category).filter(Boolean))].sort(), [items]);
  const platforms = useMemo(() => [...new Set(items.map(item => item.source_platform || 'Other').filter(Boolean))].sort(), [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(item => {
      const haystack = [item.title, item.category, item.location, item.source_platform, item.seller_name, item.notes, item.strategy].join(' ').toLowerCase();
      return (!needle || haystack.includes(needle))
        && (!category || item.category === category)
        && (!platform || (item.source_platform || 'Other') === platform)
        && (!status || item.admin_status === status)
        && (!signal || item.signal === signal);
    });
  }, [items, query, category, platform, status, signal]);

  const activeCount = items.filter(item => !['passed', 'sold'].includes(item.admin_status)).length;
  const localCount = items.filter(item => /hamilton|stoney|ancaster|burlington/i.test(item.location || '')).length;
  const boughtCount = items.filter(item => item.admin_status === 'bought').length;
  const strongCount = items.filter(item => ['STRONG', 'TEST'].includes(item.signal)).length;

  const patchItem = async (id, patch) => {
    setSavingId(id);
    setError('');
    try {
      const updated = await updateInventoryIntelItem(accessToken, id, patch);
      setItems(current => current.map(item => item.id === id ? updated : item));
    } catch (err) {
      setError(err.message || 'Unable to update item.');
    } finally {
      setSavingId(null);
    }
  };

  const removeItem = async item => {
    if (!window.confirm(`Delete "${item.title}" from Inventory Intel?`)) return;
    setSavingId(item.id);
    try {
      await deleteInventoryIntelItem(accessToken, item.id);
      setItems(current => current.filter(currentItem => currentItem.id !== item.id));
    } catch (err) {
      setError(err.message || 'Unable to delete item.');
    } finally {
      setSavingId(null);
    }
  };

  const submit = async event => {
    event.preventDefault();
    setError('');
    try {
      const created = await addInventoryIntelItem(accessToken, form);
      setItems(current => [created, ...current]);
      setForm(emptyForm);
      setShowAdd(false);
    } catch (err) {
      setError(err.message || 'Unable to add item.');
    }
  };

  return <div className="inventory-intel-page">
    <div className="site-admin-page-head inventory-intel-head">
      <div>
        <p className="site-admin-eyebrow">Inventory Research</p>
        <h1>Inventory Intel</h1>
        <p>One place to collect Marketplace, Kijiji, liquidation and wholesale opportunities while we build real inventory for the test store.</p>
      </div>
      <div className="inventory-intel-head-actions">
        <button className="site-admin-btn secondary" type="button" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button>
        <button className="site-admin-btn" type="button" onClick={() => setShowAdd(true)}><Plus size={15}/> Add candidate</button>
      </div>
    </div>

    {error && <div className="inventory-intel-error">{error}</div>}

    <div className="inventory-intel-stats">
      <div><strong>{items.length}</strong><span>Listings tracked</span></div>
      <div><strong>{strongCount}</strong><span>Strong / test leads</span></div>
      <div><strong>{localCount}</strong><span>Local leads</span></div>
      <div><strong>{boughtCount}</strong><span>Inventory bought</span></div>
    </div>

    <div className="inventory-intel-toolbar">
      <label className="inventory-intel-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Bauer, clothing, tools, Stoney Creek…"/></label>
      <select value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select>
      <select value={platform} onChange={event => setPlatform(event.target.value)}><option value="">All sources</option>{platforms.map(value => <option key={value}>{value}</option>)}</select>
      <select value={signal} onChange={event => setSignal(event.target.value)}><option value="">All recommendations</option><option>STRONG</option><option>TEST</option><option>WATCH</option><option>SKIP</option></select>
      <select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>

    <div className="inventory-intel-guide">
      <strong>What belongs here:</strong>
      <span>complete hockey packages, outgrown youth sports gear, clothing clean-outs, shoe lots, tools, toys, store closeouts, liquidation cases and anything else where the acquisition cost leaves enough room to resell.</span>
    </div>

    {loading ? <div className="inventory-intel-empty">Loading inventory leads…</div> : visible.length === 0 ? <div className="inventory-intel-empty">No listings match these filters.</div> :
      <div className="inventory-intel-grid">
        {visible.map(item => <article className="inventory-intel-card" key={item.id}>
          <div className="inventory-intel-card-top">
            <div>
              <div className="inventory-intel-source">{item.source_platform || 'Other'} · {item.location || 'Location not entered'}</div>
              <h2>{item.title}</h2>
            </div>
            <Recommendation value={item.signal}/>
          </div>

          <div className="inventory-intel-money">
            <div><span>Asking</span><strong>{money(item.buy_price)}</strong></div>
            <div><span>Target offer</span><strong>{money(item.target_offer)}</strong></div>
            <div><span>Resale range</span><strong>{item.estimated_resale_low || item.estimated_resale_high ? `${money(item.estimated_resale_low)}–${money(item.estimated_resale_high)}` : 'Research'}</strong></div>
            <div><span>Potential</span><strong>{marginText(item)}</strong></div>
          </div>

          <div className="inventory-intel-tags">
            {item.category && <span>{item.category}</span>}
            {item.condition && <span>{item.condition}</span>}
            {item.is_bundle && <span>Bundle / lot</span>}
            {item.quantity > 1 && <span>{item.quantity} units</span>}
          </div>

          {item.notes && <p className="inventory-intel-notes">{item.notes}</p>}
          {item.strategy && <div className="inventory-intel-strategy"><strong>Intel:</strong> {item.strategy}</div>}

          <div className="inventory-intel-card-actions">
            <a className="site-admin-btn secondary small" href={item.url} target="_blank" rel="noreferrer">Open post <ExternalLink size={13}/></a>
            <select
              value={item.admin_status || 'researching'}
              onChange={event => patchItem(item.id, { adminStatus: event.target.value })}
              disabled={savingId === item.id}
              aria-label={`Status for ${item.title}`}
            >
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className="inventory-intel-delete" type="button" onClick={() => removeItem(item)} disabled={savingId === item.id} aria-label={`Delete ${item.title}`}><Trash2 size={15}/></button>
          </div>
        </article>)}
      </div>
    }

    {showAdd && <div className="inventory-intel-modal-backdrop" onMouseDown={() => setShowAdd(false)}>
      <form className="inventory-intel-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <div className="inventory-intel-modal-head"><div><span>Manual lead</span><h2>Add inventory candidate</h2></div><button type="button" onClick={() => setShowAdd(false)} aria-label="Close"><X size={20}/></button></div>
        <div className="inventory-intel-form-grid">
          <label className="wide">Listing title<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
          <label>Source<select value={form.sourcePlatform} onChange={event => setForm({ ...form, sourcePlatform: event.target.value })}><option>Facebook Marketplace</option><option>Kijiji</option><option>Liquidation</option><option>Wholesale</option><option>Other</option></select></label>
          <label>Category<input value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}/></label>
          <label className="wide">Post URL<input required type="url" value={form.url} onChange={event => setForm({ ...form, url: event.target.value })}/></label>
          <label>Asking price<input inputMode="decimal" value={form.buyPrice} onChange={event => setForm({ ...form, buyPrice: event.target.value })}/></label>
          <label>Target offer<input inputMode="decimal" value={form.targetOffer} onChange={event => setForm({ ...form, targetOffer: event.target.value })}/></label>
          <label>Resale low<input inputMode="decimal" value={form.estimatedResaleLow} onChange={event => setForm({ ...form, estimatedResaleLow: event.target.value })}/></label>
          <label>Resale high<input inputMode="decimal" value={form.estimatedResaleHigh} onChange={event => setForm({ ...form, estimatedResaleHigh: event.target.value })}/></label>
          <label>Condition<input value={form.condition} onChange={event => setForm({ ...form, condition: event.target.value })}/></label>
          <label>Location<input value={form.location} onChange={event => setForm({ ...form, location: event.target.value })}/></label>
          <label>Recommendation<select value={form.signal} onChange={event => setForm({ ...form, signal: event.target.value })}><option>STRONG</option><option>TEST</option><option>WATCH</option><option>SKIP</option></select></label>
          <label>Seller<input value={form.sellerName} onChange={event => setForm({ ...form, sellerName: event.target.value })}/></label>
          <label className="wide">Listing details<textarea rows="3" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })}/></label>
          <label className="wide">Why it might work / resale strategy<textarea rows="3" value={form.strategy} onChange={event => setForm({ ...form, strategy: event.target.value })}/></label>
          <label className="inventory-intel-checkbox wide"><input type="checkbox" checked={form.isBundle} onChange={event => setForm({ ...form, isBundle: event.target.checked })}/> Bundle / lot</label>
        </div>
        <div className="inventory-intel-modal-actions"><button className="site-admin-btn secondary" type="button" onClick={() => setShowAdd(false)}>Cancel</button><button className="site-admin-btn" type="submit">Add to Inventory Intel</button></div>
      </form>
    </div>}
  </div>;
}
