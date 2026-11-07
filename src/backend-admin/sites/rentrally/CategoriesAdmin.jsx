import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { PhotoList } from './fields';
import { categoriesApi, productsApi, slugify, slugTyping } from './rentrallyAdminService';
import './rentrally.css';

const blank = () => ({ id: '', slug: '', name: '', blurb: '', image: '', seo_title: '', seo_description: '', status: 'published', sort_order: 0, _new: true });

export default function CategoriesAdmin() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = () => Promise.all([categoriesApi.list(), productsApi.list()])
    .then(([c, p]) => {
      setRows(c);
      setCounts(p.reduce((acc, x) => ({ ...acc, [x.category_slug]: (acc[x.category_slug] || 0) + 1 }), {}));
    })
    .catch(err => setError(err.message))
    .finally(() => setBusy(false));
  useEffect(() => { refresh(); }, []);

  const set = (i, patch) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch, _dirty: true } : r)));

  const save = async i => {
    setError(''); setMessage('');
    try {
      const { _new, _dirty, ...row } = rows[i];
      const saved = await categoriesApi.save({ ...row, slug: row.slug || slugify(row.name) });
      setRows(rs => rs.map((r, j) => (j === i ? saved : r)));
      setMessage(`Saved “${saved.name}”.`);
    } catch (err) { setError(err.message); }
  };

  const remove = async i => {
    const row = rows[i];
    if (row._new) { setRows(rs => rs.filter((_, j) => j !== i)); return; }
    if (counts[row.slug]) { setError(`“${row.name}” still has ${counts[row.slug]} rental(s). Move them to another category first.`); return; }
    if (!confirm(`Delete the “${row.name}” category?`)) return;
    try { await categoriesApi.remove(row.id); refresh(); } catch (err) { setError(err.message); }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Catalogue</p>
        <h1>Categories</h1>
        <p>The “Shop by Category” tiles on the homepage and the filters on the rentals page.</p>
      </div>
      <button className="site-admin-btn" type="button" onClick={() => setRows(rs => [...rs, blank()])}><Plus size={15}/> New Category</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}
    {busy && <div className="site-admin-card site-admin-empty">Loading categories…</div>}
    {!busy && !rows.length && <div className="site-admin-card site-admin-empty">No categories yet. Add one, or use “Import starter catalogue” on the Rentals page.</div>}
    <div className="rr-cat-list">
      {rows.map((r, i) => <div className="site-admin-card rr-cat" key={r.id || `new-${i}`}>
        <PhotoList single label="Tile photo" value={r.image} onChange={v => set(i, { image: v })}/>
        <div className="site-admin-form rr-cat-form">
          <label>Name<input value={r.name} onChange={e => set(i, { name: e.target.value, ...(r._new ? { slug: slugify(e.target.value) } : {}) })}/></label>
          <label>Slug <small>used in the web address</small><input value={r.slug} onChange={e => set(i, { slug: slugTyping(e.target.value) })} onBlur={e => set(i, { slug: slugify(e.target.value) })}/></label>
          <label className="wide">Blurb<input value={r.blurb} onChange={e => set(i, { blurb: e.target.value })}/></label>
          <label className="wide">SEO title <small>blank = “{r.name || 'Category'} Rentals | Rent &amp; Rally”</small><input value={r.seo_title || ''} maxLength={120} onChange={e => set(i, { seo_title: e.target.value })}/></label>
          <label className="wide">SEO description <small>blank = written from the blurb</small><textarea rows={2} value={r.seo_description || ''} maxLength={320} onChange={e => set(i, { seo_description: e.target.value })}/></label>
          <label>Sort order<input type="number" value={r.sort_order} onChange={e => set(i, { sort_order: e.target.value })}/></label>
          <label>Status<select value={r.status} onChange={e => set(i, { status: e.target.value })}><option value="published">Published</option><option value="draft">Hidden</option></select></label>
          <div className="wide site-admin-actions">
            <button className="site-admin-btn small" type="button" onClick={() => save(i)} disabled={!r._dirty && !r._new}><Save size={13}/> Save</button>
            <button className="site-admin-btn danger small" type="button" onClick={() => remove(i)}><Trash2 size={13}/> Delete</button>
            <small>{counts[r.slug] || 0} rental{counts[r.slug] === 1 ? '' : 's'}</small>
          </div>
        </div>
      </div>)}
    </div>
  </>;
}
