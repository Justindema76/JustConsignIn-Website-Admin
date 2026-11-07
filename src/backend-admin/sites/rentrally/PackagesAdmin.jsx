import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { PhotoList } from './fields';
import { RENTRALLY_SITE_URL, money, packagesApi, productsApi, slugify } from './rentrallyAdminService';
import './rentrally.css';

const BASE = '/admin/rentrally/packages';
const EMPTY = { id: '', slug: '', tag: '', name: '', hero_image: '', day_rate: '', items: [], description: '', good_for: [], status: 'draft', sort_order: 0 };

const separately = (items, products) => items.reduce((sum, item) => {
  const p = products.find(x => x.slug === item.product);
  return sum + (p ? Number(p.day_rate) * item.qty : 0);
}, 0);

export default function PackagesAdmin() {
  const { id } = useParams();
  return id ? <PackageEditor id={id}/> : <PackageList/>;
}

function PackageList() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const refresh = () => Promise.all([packagesApi.list(), productsApi.list()])
    .then(([pk, p]) => { setRows(pk); setProducts(p); })
    .catch(err => setError(err.message))
    .finally(() => setBusy(false));
  useEffect(() => { refresh(); }, []);

  const remove = async row => {
    if (!confirm(`Delete the "${row.name}" package?`)) return;
    try { await packagesApi.remove(row.id); refresh(); } catch (err) { setError(err.message); }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Catalogue</p>
        <h1>Packages</h1>
        <p>Bundles of rentals at one daily price. The website shows how much customers save.</p>
      </div>
      <Link className="site-admin-btn" to={`${BASE}/new`}><Plus size={15}/> New Package</Link>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    <div className="site-admin-card site-admin-table">
      <div className="site-admin-table-head blogs"><span>Photo</span><span>Package</span><span>Status</span><span>Day rate</span><span>Actions</span></div>
      {busy && <div className="site-admin-empty">Loading packages…</div>}
      {!busy && !rows.length && <div className="site-admin-empty">No packages yet. Create one, or use “Import starter catalogue” on the Rentals page.</div>}
      {rows.map(r => {
        const list = separately(r.items || [], products);
        return <div className="site-admin-table-row blogs" key={r.id}>
          <div className="site-admin-blog-thumb">{r.hero_image ? <img src={r.hero_image} alt=""/> : '—'}</div>
          <div><strong>{r.name}</strong><small>{(r.items || []).reduce((s, i) => s + i.qty, 0)} pieces{r.tag ? ` · ${r.tag}` : ''}{list > r.day_rate ? ` · saves ${money(list - r.day_rate)}/day` : ''}</small></div>
          <span className={`site-admin-status ${r.status}`}>{r.status}</span>
          <div><strong>{money(r.day_rate)}</strong><small>/day</small></div>
          <div className="site-admin-actions right">
            <Link className="site-admin-btn secondary small" to={`${BASE}/${r.id}`}>Edit</Link>
            {r.status === 'published' && <a className="site-admin-btn secondary small" href={`${RENTRALLY_SITE_URL}/#/package/${r.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/></a>}
            <button className="site-admin-btn danger small" type="button" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}><Trash2 size={13}/></button>
          </div>
        </div>;
      })}
    </div>
  </>;
}

function PackageEditor({ id }) {
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [draft, setDraft] = useState({ ...EMPTY, goodForText: '' });
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    Promise.all([productsApi.list(), isNew ? Promise.resolve(null) : packagesApi.one(id)])
      .then(([p, row]) => {
        setProducts(p);
        if (!isNew && !row) throw new Error('That package was not found.');
        const base = row || EMPTY;
        setDraft({ ...EMPTY, ...base, day_rate: base.day_rate ?? '', goodForText: (base.good_for || []).join(', ') });
      })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  }, [id]);

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const setItem = (i, patch) => set('items', draft.items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const list = useMemo(() => separately(draft.items, products), [draft.items, products]);
  const rate = Number(draft.day_rate) || 0;

  const save = async event => {
    event?.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const { goodForText, ...rest } = draft;
      const saved = await packagesApi.save({ ...rest, good_for: goodForText.split(',').map(s => s.trim()).filter(Boolean) });
      setDraft({ ...EMPTY, ...saved, goodForText: (saved.good_for || []).join(', ') });
      setMessage(saved.status === 'published' ? 'Saved. It’s live on the website.' : 'Saved as a draft.');
      if (isNew) navigate(`${BASE}/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete the "${draft.name}" package?`)) return;
    try { await packagesApi.remove(draft.id); navigate(BASE); } catch (err) { setError(err.message); }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Packages</p>
        <h1>{isNew ? 'New Package' : draft.name || 'Edit Package'}</h1>
      </div>
      <div className="site-admin-actions">
        <Link className="site-admin-btn secondary" to={BASE}>← Packages</Link>
        <button className="site-admin-btn" type="submit" form="rr-package-form" disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <form id="rr-package-form" className="site-admin-editor-grid" onSubmit={save}>
      <div>
        <div className="site-admin-card site-admin-form">
          <label className="wide">Package name<input required value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) }))}/></label>
          <label>Tag <small>(e.g. Most popular)</small><input value={draft.tag} onChange={e => set('tag', e.target.value)}/></label>
          <label>Package day rate (CAD)<input inputMode="decimal" required value={draft.day_rate} onChange={e => set('day_rate', e.target.value)}/></label>
          <label className="wide">Description<textarea rows={4} value={draft.description} onChange={e => set('description', e.target.value)}/></label>
          <label className="wide">Great for <small>Comma separated, e.g. Grand openings, Car lots</small><input value={draft.goodForText} onChange={e => set('goodForText', e.target.value)}/></label>
        </div>

        <div className="site-admin-card rr-section">
          <div className="rr-photos-head"><strong>What’s included</strong><small>Pick rentals and how many of each.</small></div>
          <div className="rr-rows">
            {draft.items.map((it, i) => {
              const p = products.find(x => x.slug === it.product);
              return <div className="rr-row rr-item-row" key={i}>
                <div className="rr-item-thumb">{p?.images?.[0] ? <img src={p.images[0]} alt=""/> : null}</div>
                <select value={it.product} onChange={e => setItem(i, { product: e.target.value })} aria-label="Rental">
                  <option value="">Choose a rental…</option>
                  {products.map(x => <option key={x.slug} value={x.slug}>{x.name}{x.status === 'draft' ? ' (draft)' : ''}</option>)}
                </select>
                <input type="number" min="1" value={it.qty} onChange={e => setItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })} aria-label="Quantity" className="rr-qty"/>
                <span className="rr-line">{p ? money(p.day_rate * it.qty) : ''}</span>
                <button type="button" className="rr-icon-btn" onClick={() => set('items', draft.items.filter((_, j) => j !== i))} aria-label="Remove item"><Trash2 size={14}/></button>
              </div>;
            })}
            <button type="button" className="site-admin-btn secondary small" onClick={() => set('items', [...draft.items, { product: '', qty: 1 }])}><Plus size={13}/> Add rental</button>
          </div>
          <div className="rr-savings">
            <div><span>Rented separately</span><b>{money(list)}/day</b></div>
            <div><span>Package price</span><b>{money(rate)}/day</b></div>
            <div className={list - rate > 0 ? 'good' : 'bad'}><span>Customer saves</span><b>{money(Math.max(0, list - rate))}/day</b></div>
          </div>
        </div>
      </div>

      <aside>
        <div className="site-admin-card site-admin-side-card">
          <h2>Publishing</h2>
          <label>Status<select value={draft.status} onChange={e => set('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
          <label>Sort order<input className="rr-side-input" type="number" value={draft.sort_order} onChange={e => set('sort_order', e.target.value)}/></label>
        </div>
        <div className="site-admin-card site-admin-side-card"><PhotoList single label="Main photo" value={draft.hero_image} onChange={v => set('hero_image', v)}/></div>
        <div className="site-admin-card site-admin-side-card">
          <h2>Web address</h2>
          <label>Slug<input className="rr-side-input" value={draft.slug} onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}/></label>
          <p className="site-admin-url">{RENTRALLY_SITE_URL}/#/package/{draft.slug || 'slug'}</p>
        </div>
        {!isNew && <div className="site-admin-card site-admin-side-card danger-zone"><h2>Delete</h2><button className="site-admin-btn danger small" type="button" onClick={remove}><Trash2 size={13}/> Delete package</button></div>}
      </aside>
    </form>
  </>;
}
