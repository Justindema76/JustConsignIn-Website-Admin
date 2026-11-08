import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react';
import { PhotoList, SeoFields } from './fields';
import { RENTRALLY_SITE_URL, money, packagesApi, productsApi, slugify, slugTyping } from './rentrallyAdminService';
import './rentrally.css';

const BASE = '/admin/rentrally/packages';
const EMPTY = { id: '', slug: '', tag: '', name: '', hero_image: '', day_rate: '', items: [], description: '', good_for: [], status: 'draft', sort_order: 0, seo_title: '', seo_description: '' };

// Only rentals switched on count, same as the website.
// Add-ons are offered on the package page as extras; they are not part of the package price.
const included = items => (items || []).filter(i => !i.addon);
const separately = (items, products) => included(items).reduce((sum, item) => {
  const p = products.find(x => x.slug === item.product && x.status === 'published');
  return sum + (p ? Number(p.day_rate) * item.qty : 0);
}, 0);
// Package prices are automatic: 10% under renting the pieces separately, rounded to end in 9.
// The website works it out the same way, so packages follow every rental price change.
export const PACKAGE_DISCOUNT = 0.10;
export const autoPrice = list => (list > 0 ? Math.max(1, Math.round((list * (1 - PACKAGE_DISCOUNT)) / 5) * 5 - 1) : 0);

export default function PackagesAdmin() {
  const { id } = useParams();
  return id ? <PackageEditor id={id}/> : <PackageList/>;
}

function PackageList() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [picked, setPicked] = useState(() => new Set());
  const [saving, setSaving] = useState(false);

  const refresh = () => Promise.all([packagesApi.list(), productsApi.list()])
    .then(([pk, p]) => { setRows(pk); setProducts(p); })
    .catch(err => setError(err.message))
    .finally(() => setBusy(false));
  useEffect(() => { refresh(); }, []);

  const remove = async row => {
    if (!confirm(`Delete the "${row.name}" package?`)) return;
    try { await packagesApi.remove(row.id); refresh(); } catch (err) { setError(err.message); }
  };

  // Turn packages on (published, shows on the site) or off (draft, hidden) — one or many at once.
  const setLive = async (list, on) => {
    const next = on ? 'published' : 'draft';
    const todo = list.filter(r => r.status !== next);
    if (!todo.length) return;
    setSaving(true); setError(''); setMessage('');
    let done = 0;
    try {
      for (let i = 0; i < todo.length; i += 5) {
        const saved = await Promise.all(todo.slice(i, i + 5).map(r => packagesApi.save({ ...r, status: next })));
        done += saved.length;
        const byId = new Map(saved.filter(Boolean).map(r => [r.id, r]));
        setRows(rs => rs.map(r => byId.get(r.id) || r));
      }
      setMessage(done === 1 ? `${todo[0].name} is ${on ? 'on. It shows on the website now.' : 'off. It is hidden from the website.'}` : `${done} packages turned ${on ? 'on. They show on the website now.' : 'off. They are hidden from the website.'}`);
      setPicked(new Set());
    } catch (err) {
      setError(`${err.message} (${done} of ${todo.length} changed before the error.)`);
      refresh();
    } finally {
      setSaving(false);
    }
  };
  const toggle = id => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = rows.length > 0 && rows.every(r => picked.has(r.id));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(rows.map(r => r.id)));
  const pickedRows = rows.filter(r => picked.has(r.id));
  // Rentals in a package that are switched off (or deleted) don't show on the package page.
  const offIn = r => included(r.items).filter(i => products.find(p => p.slug === i.product)?.status !== 'published').length;

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Catalogue</p>
        <h1>Packages</h1>
        <p>Bundles of rentals at one daily price. Packages switched On show on the website. Tick several to turn them on or off together.</p>
      </div>
      <Link className="site-admin-btn" to={`${BASE}/new`}><Plus size={15}/> New Package</Link>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}
    {pickedRows.length > 0 && <div className="rr-bulkbar" role="region" aria-label="Bulk actions">
      <strong>{pickedRows.length} selected</strong>
      <button className="site-admin-btn small" type="button" onClick={() => setLive(pickedRows, true)} disabled={saving}><Eye size={13}/> Turn on</button>
      <button className="site-admin-btn secondary small" type="button" onClick={() => setLive(pickedRows, false)} disabled={saving}><EyeOff size={13}/> Turn off</button>
      <button className="site-admin-btn secondary small" type="button" onClick={() => setPicked(new Set())} disabled={saving}>Clear</button>
      {saving && <small>Saving…</small>}
    </div>}
    <div className="site-admin-card site-admin-table">
      <div className="site-admin-table-head rr-rentals"><span><input type="checkbox" className="rr-check" checked={allPicked} onChange={toggleAll} aria-label="Select all packages"/></span><span>Photo</span><span>Package</span><span>On website</span><span>Day rate</span><span>Actions</span></div>
      {busy && <div className="site-admin-empty">Loading packages…</div>}
      {!busy && !rows.length && <div className="site-admin-empty">No packages yet. Create one, or use “Import starter catalogue” on the Rentals page.</div>}
      {rows.map(r => {
        const list = separately(r.items || [], products);
        const off = offIn(r);
        return <div className={`site-admin-table-row rr-rentals${picked.has(r.id) ? ' is-picked' : ''}${r.status !== 'published' ? ' is-off' : ''}`} key={r.id}>
          <span><input type="checkbox" className="rr-check" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.name}`}/></span>
          <div className="site-admin-blog-thumb">{r.hero_image ? <img src={r.hero_image} alt=""/> : '—'}</div>
          <div><strong>{r.name}</strong><small>{included(r.items).reduce((s, i) => s + i.qty, 0)} pieces{r.tag ? ` · ${r.tag}` : ''}{list > autoPrice(list) ? ` · saves ${money(list - autoPrice(list))}/day` : ''}</small>{off > 0 && <small className="rr-warn">{off} rental{off === 1 ? ' is' : 's are'} switched off, so {off === 1 ? 'it is' : 'they are'} left out of this package on the site</small>}</div>
          <button type="button" className={`rr-switch${r.status === 'published' ? ' on' : ''}`} role="switch" aria-checked={r.status === 'published'} aria-label={`${r.name} on website`} onClick={() => setLive([r], r.status !== 'published')} disabled={saving}><i/><span>{r.status === 'published' ? 'On' : 'Off'}</span></button>
          <div><strong>{money(autoPrice(list))}</strong><small>/day</small></div>
          <div className="site-admin-actions right">
            <Link className="site-admin-btn secondary small" to={`${BASE}/${r.id}`}>Edit</Link>
            {r.status === 'published' && <a className="site-admin-btn secondary small" href={`${RENTRALLY_SITE_URL}/packages/${r.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/></a>}
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
  const rate = autoPrice(list);

  const save = async event => {
    event?.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const { goodForText, ...rest } = draft;
      const saved = await packagesApi.save({ ...rest, day_rate: rate, slug: slugify(rest.slug), good_for: goodForText.split(',').map(s => s.trim()).filter(Boolean) });
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
          <label>Package day rate (CAD) <small>automatic</small><input value={rate ? `${money(rate)} / day` : 'Add rentals below'} readOnly aria-readonly="true" title="10% under renting the pieces separately. Updates when you change a rental's price."/></label>
          <label className="wide">Description<textarea rows={4} value={draft.description} onChange={e => set('description', e.target.value)}/></label>
          <label className="wide">Great for <small>Comma separated, e.g. Grand openings, Car lots</small><input value={draft.goodForText} onChange={e => set('goodForText', e.target.value)}/></label>
        </div>

        <div className="site-admin-card rr-section">
          <div className="rr-photos-head"><strong>What’s included</strong><small>Pick rentals and how many of each.</small></div>
          <div className="rr-rows">
            {draft.items.map((it, i) => {
              if (it.addon) return null;
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
          <div className="rr-photos-head" style={{ marginTop: 18 }}><strong>Add-ons</strong><small>Extra rentals customers can add to this package at the same package discount (for example a 10' x 20' tent). Rentals from the same categories are suggested automatically too.</small></div>
          <div className="rr-rows">
            {draft.items.map((it, i) => {
              if (!it.addon) return null;
              const p = products.find(x => x.slug === it.product);
              return <div className="rr-row rr-item-row" key={`addon-${i}`}>
                <div className="rr-item-thumb">{p?.images?.[0] ? <img src={p.images[0]} alt=""/> : null}</div>
                <select value={it.product} onChange={e => setItem(i, { product: e.target.value })} aria-label="Add-on rental">
                  <option value="">Choose a rental…</option>
                  {products.filter(x => Number(x.day_rate) > 0).map(x => <option key={x.slug} value={x.slug}>{x.name}{x.status === 'draft' ? ' (off)' : ''}</option>)}
                </select>
                <span className="rr-line">{p ? `${money(p.day_rate)}/day` : ''}</span>
                <button type="button" className="rr-icon-btn" onClick={() => set('items', draft.items.filter((_, j) => j !== i))} aria-label="Remove add-on"><Trash2 size={14}/></button>
              </div>;
            })}
            <button type="button" className="site-admin-btn secondary small" onClick={() => set('items', [...draft.items, { product: '', qty: 0, addon: true }])}><Plus size={13}/> Add add-on</button>
          </div>
          <div className="rr-savings">
            <div><span>Rented separately</span><b>{money(list)}/day</b></div>
            <div><span>Package price (10% off, automatic)</span><b>{money(rate)}/day</b></div>
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
          <label>Slug<input className="rr-side-input" value={draft.slug} onChange={e => { setSlugTouched(true); set('slug', slugTyping(e.target.value)); }} onBlur={e => set('slug', slugify(e.target.value))}/></label>
          <p className="site-admin-url">{RENTRALLY_SITE_URL}/packages/{draft.slug || 'slug'}</p>
        </div>
        <SeoFields
          title={draft.seo_title || ''}
          description={draft.seo_description || ''}
          onChange={patch => setDraft(d => ({ ...d, ...patch }))}
          autoTitle={`${draft.name || 'Package name'} Rental Package | Rent & Rally`}
          autoDescription={`${draft.name || 'This package'}: ${included(draft.items).reduce((s, i) => s + i.qty, 0)} pieces from ${money(rate)}/day. Delivered and set up in Hamilton, Niagara and the GTA.`}
          url={`rent-and-rally.vercel.app › packages › ${draft.slug || 'slug'}`}
        />
        {!isNew && <div className="site-admin-card site-admin-side-card danger-zone"><h2>Delete</h2><button className="site-admin-btn danger small" type="button" onClick={remove}><Trash2 size={13}/> Delete package</button></div>}
      </aside>
    </form>
  </>;
}
