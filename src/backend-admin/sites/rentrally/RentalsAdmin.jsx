import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { OptionRows, PairRows, PhotoList, SeoFields, linesToList, paragraphsToList } from './fields';
import { RENTRALLY_SITE_URL, categoriesApi, importStarterCatalogue, money, productsApi, slugify } from './rentrallyAdminService';
import './rentrally.css';

const BASE = '/admin/rentrally/rentals';

const EMPTY = {
  id: '', slug: '', name: '', sku: '', category_slug: '', images: [], day_rate: '', buy_price: '', buy_note: '', buy_url: '',
  badge: '', description: [], features: [], specs: [], options: [], related: [], featured: false, status: 'draft', sort_order: 0,
  seo_title: '', seo_description: '',
};

// Editor keeps description/features as plain text; convert on load/save.
const toDraft = row => ({
  ...EMPTY,
  ...row,
  day_rate: row?.day_rate ?? '',
  buy_price: row?.buy_price ?? '',
  descriptionText: (row?.description || []).join('\n\n'),
  featuresText: (row?.features || []).join('\n'),
});
const fromDraft = d => {
  const { descriptionText, featuresText, ...rest } = d;
  return { ...rest, description: paragraphsToList(descriptionText), features: linesToList(featuresText) };
};

export default function RentalsAdmin() {
  const { id } = useParams();
  return id ? <RentalEditor id={id}/> : <RentalList/>;
}

function RentalList() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [status, setStatus] = useState('all');

  const refresh = () => {
    setBusy(true);
    return Promise.all([productsApi.list(), categoriesApi.list()])
      .then(([p, c]) => { setRows(p); setCats(c); })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  };
  useEffect(() => { refresh(); }, []);

  const catName = slug => cats.find(c => c.slug === slug)?.name || slug || 'No category';
  const filtered = useMemo(() => rows.filter(r =>
    (cat === 'all' || r.category_slug === cat)
    && (status === 'all' || r.status === status)
    && (!q || `${r.name} ${r.sku} ${r.slug}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, cat, status]);

  const runImport = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await importStarterCatalogue();
      const refreshed = result.refreshed?.products ? ` Updated ${result.refreshed.products} rebuilt rentals (flags, signs and banner stands); their prices and status were kept.` : '';
      setMessage(`Imported ${result.added.products} rentals, ${result.added.packages} packages and ${result.added.categories} categories.${refreshed} Everything else already here was left as it was.`);
      await refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const remove = async row => {
    if (!confirm(`Delete "${row.name}"? It will disappear from the website and from any package that uses it.`)) return;
    try { await productsApi.remove(row.id); setMessage('Rental deleted.'); refresh(); } catch (err) { setError(err.message); }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Catalogue</p>
        <h1>Rentals</h1>
        <p>Everything customers can rent. Published items show on the website straight away.</p>
      </div>
      <div className="site-admin-actions">
        <a className="site-admin-btn secondary" href={`${RENTRALLY_SITE_URL}/rentals`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> View site</a>
        <button className="site-admin-btn secondary" type="button" onClick={runImport} disabled={busy}>Load new rentals</button>
        <Link className="site-admin-btn" to={`${BASE}/new`}><Plus size={15}/> New Rental</Link>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    {!busy && !rows.length && <div className="site-admin-card site-admin-empty large">
      <h2>No rentals yet</h2>
      <p>Load the starter rentals, packages and categories to start with. You can edit or delete any of them after.</p>
      <button className="site-admin-btn" type="button" onClick={runImport}>Import starter catalogue</button>
    </div>}

    {!!rows.length && <>
      <div className="site-admin-toolbar">
        <label className="site-admin-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or SKU"/></label>
        <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {cats.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option>
        </select>
      </div>
      <div className="site-admin-card site-admin-table">
        <div className="site-admin-table-head blogs"><span>Photo</span><span>Rental</span><span>Status</span><span>Day rate</span><span>Actions</span></div>
        {filtered.map(r => <div className="site-admin-table-row blogs" key={r.id}>
          <div className="site-admin-blog-thumb rr-thumb">{r.images?.[0] ? <img src={r.images[0]} alt=""/> : '—'}</div>
          <div><strong>{r.name}</strong><small>{catName(r.category_slug)} · SKU {r.sku || '—'}{r.featured ? ' · Popular' : ''}</small></div>
          <span className={`site-admin-status ${r.status}`}>{r.status}</span>
          <div><strong>{money(r.day_rate)}</strong><small>/day</small></div>
          <div className="site-admin-actions right">
            <Link className="site-admin-btn secondary small" to={`${BASE}/${r.id}`}>Edit</Link>
            {r.status === 'published' && <a className="site-admin-btn secondary small" href={`${RENTRALLY_SITE_URL}/rental/${r.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/></a>}
            <button className="site-admin-btn danger small" type="button" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}><Trash2 size={13}/></button>
          </div>
        </div>)}
        {!filtered.length && <div className="site-admin-empty">No rentals match.</div>}
      </div>
    </>}
    {busy && !rows.length && <div className="site-admin-card site-admin-empty">Loading rentals…</div>}
  </>;
}

function RentalEditor({ id }) {
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [draft, setDraft] = useState(toDraft(EMPTY));
  const [cats, setCats] = useState([]);
  const [all, setAll] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    setBusy(true);
    Promise.all([categoriesApi.list(), productsApi.list(), isNew ? Promise.resolve(null) : productsApi.one(id)])
      .then(([c, p, row]) => {
        setCats(c); setAll(p);
        if (!isNew && !row) throw new Error('That rental was not found.');
        setDraft(toDraft(row || { ...EMPTY, category_slug: c[0]?.slug || '' }));
      })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  }, [id]);

  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const setName = value => setDraft(d => ({ ...d, name: value, slug: slugTouched ? d.slug : slugify(value) }));

  const save = async event => {
    event?.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await productsApi.save(fromDraft(draft));
      setDraft(toDraft(saved));
      setMessage(saved.status === 'published' ? 'Saved. It’s live on the website.' : 'Saved as a draft. It won’t show on the website until you publish it.');
      if (isNew) navigate(`${BASE}/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    const copy = fromDraft({ ...draft, id: '', name: `${draft.name} (copy)`, slug: `${draft.slug}-copy`, status: 'draft' });
    try {
      const saved = await productsApi.save(copy);
      navigate(`${BASE}/${saved.id}`);
    } catch (err) { setError(err.message); }
  };

  const remove = async () => {
    if (!confirm(`Delete "${draft.name}"? This can’t be undone.`)) return;
    try { await productsApi.remove(draft.id); navigate(BASE); } catch (err) { setError(err.message); }
  };

  const others = all.filter(p => p.id !== draft.id);

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Rentals</p>
        <h1>{isNew ? 'New Rental' : draft.name || 'Edit Rental'}</h1>
        <p>{draft.status === 'published' ? 'Published: changes go live when you save.' : 'Draft: only you can see this.'}</p>
      </div>
      <div className="site-admin-actions">
        <Link className="site-admin-btn secondary" to={BASE}>← Rentals</Link>
        <button className="site-admin-btn" type="submit" form="rr-rental-form" disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <form id="rr-rental-form" className="site-admin-editor-grid" onSubmit={save}>
      <div>
        <div className="site-admin-card site-admin-form">
          <label className="wide">Name<input required value={draft.name} onChange={e => setName(e.target.value)} placeholder="Gigantic Tube Man Air Dancer"/></label>
          <label>Category
            <select value={draft.category_slug} onChange={e => set('category_slug', e.target.value)}>
              <option value="">No category</option>
              {cats.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
          <label>SKU<input value={draft.sku} onChange={e => set('sku', e.target.value)}/></label>
          <label>Day rate (CAD)<input inputMode="decimal" required value={draft.day_rate} onChange={e => set('day_rate', e.target.value)} placeholder="45"/>
            <small>Weekend = 2 days, 1 week = 4 days, 2 weeks = 8 days.</small></label>
          <label>Badge <small>(optional, e.g. New)</small><input value={draft.badge} onChange={e => set('badge', e.target.value)}/></label>
        </div>

        <div className="site-admin-card rr-section"><PhotoList value={draft.images} onChange={v => set('images', v)}/></div>

        <div className="site-admin-card site-admin-form">
          <label className="wide">Description <small>Leave a blank line between paragraphs.</small>
            <textarea rows={6} value={draft.descriptionText} onChange={e => set('descriptionText', e.target.value)}/></label>
          <label className="wide">Features <small>One per line.</small>
            <textarea rows={5} value={draft.featuresText} onChange={e => set('featuresText', e.target.value)}/></label>
        </div>

        <div className="site-admin-card rr-section">
          <div className="rr-photos-head"><strong>Specifications</strong><small>Shown as a table on the product page.</small></div>
          <PairRows value={draft.specs} onChange={v => set('specs', v)} labels={['Spec, e.g. Height', 'Value, e.g. 20 ft']} addLabel="Add spec"/>
        </div>

        <div className="site-admin-card rr-section">
          <div className="rr-photos-head"><strong>Options</strong><small>Choices the customer picks before adding to their quote.</small></div>
          <OptionRows value={draft.options} onChange={v => set('options', v)} photoCount={draft.images.length}/>
        </div>

        <div className="site-admin-card site-admin-form">
          <div className="wide rr-photos-head"><strong>Prefer to own it?</strong><small>Optional “Buy new” box on the product page.</small></div>
          <label>Buy-new price (CAD)<input inputMode="decimal" value={draft.buy_price} onChange={e => set('buy_price', e.target.value)}/></label>
          <label>Price note <small>(e.g. “frame &amp; banner”)</small><input value={draft.buy_note} onChange={e => set('buy_note', e.target.value)}/></label>
          <label className="wide">Supplier link<input value={draft.buy_url} onChange={e => set('buy_url', e.target.value)} placeholder="https://wheelsauto.com/ca-en/…"/></label>
        </div>
      </div>

      <aside>
        <div className="site-admin-card site-admin-side-card">
          <h2>Publishing</h2>
          <label>Status<select value={draft.status} onChange={e => set('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
          <label className="site-admin-switch rr-switch"><input type="checkbox" checked={draft.featured} onChange={e => set('featured', e.target.checked)}/> Show in “Popular Rentals” on the homepage</label>
          <label>Sort order <small>Lower shows first</small><input className="rr-side-input" type="number" value={draft.sort_order} onChange={e => set('sort_order', e.target.value)}/></label>
        </div>
        <div className="site-admin-card site-admin-side-card">
          <h2>Web address</h2>
          <label>Slug<input className="rr-side-input" value={draft.slug} onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}/></label>
          <p className="site-admin-url">{RENTRALLY_SITE_URL}/rental/{draft.slug || 'slug'}</p>
          {!isNew && draft.status === 'published' && <a className="site-admin-btn secondary small" href={`${RENTRALLY_SITE_URL}/rental/${draft.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View live</a>}
        </div>
        <SeoFields
          title={draft.seo_title || ''}
          description={draft.seo_description || ''}
          onChange={patch => setDraft(d => ({ ...d, ...patch }))}
          autoTitle={`${draft.name || 'Rental name'} Rental | Rent & Rally`}
          autoDescription={`Rent the ${draft.name || 'item'} from ${money(draft.day_rate || 0)}/day in Hamilton, Niagara and the GTA. ${(draft.descriptionText || '').split('\n')[0].slice(0, 110)}`}
          url={`rent-and-rally.vercel.app › rental › ${draft.slug || 'slug'}`}
        />
        <div className="site-admin-card site-admin-side-card">
          <h2>Related rentals</h2>
          <p>Shown under “Related Rentals” on this item.</p>
          <div className="rr-checklist">
            {others.map(p => <label key={p.id} className="site-admin-switch"><input type="checkbox" checked={draft.related.includes(p.slug)} onChange={e => set('related', e.target.checked ? [...draft.related, p.slug] : draft.related.filter(s => s !== p.slug))}/> {p.name}</label>)}
            {!others.length && <small>No other rentals yet.</small>}
          </div>
        </div>
        {!isNew && <div className="site-admin-card site-admin-side-card">
          <h2>More</h2>
          <div className="site-admin-actions">
            <button className="site-admin-btn secondary small" type="button" onClick={duplicate}><Copy size={13}/> Duplicate</button>
            <button className="site-admin-btn danger small" type="button" onClick={remove}><Trash2 size={13}/> Delete</button>
          </div>
        </div>}
      </aside>
    </form>
  </>;
}
