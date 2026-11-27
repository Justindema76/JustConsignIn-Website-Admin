// Editor for justindematteis.com/shopify-studio/pricing (saved inside the shopify-studio settings as "pricing").
// The page is a service directory: pick a service on the left, its packages show on the right.
// Starts from pricingDefaults.json, the same file the website falls back to, so this always shows what the page shows.
import { useState } from 'react';
import DEFAULTS from './pricingDefaults.json';

const SITE = 'https://www.justindematteis.com';
const clone = value => JSON.parse(JSON.stringify(value));
const slug = text => String(text || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

export default function PricingEditor({ value, onChange }) {
  const data = value && Array.isArray(value.services) && value.services.length ? value : clone(DEFAULTS);
  const [sid, setSid] = useState(data.services[0]?.id);
  const index = Math.max(0, data.services.findIndex(s => s.id === sid));
  const service = data.services[index];

  const save = next => onChange(next);
  const setService = patch => save({ ...data, services: data.services.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  const listOps = key => ({
    set: (i, field, v) => setService({ [key]: service[key].map((item, j) => (j === i ? { ...item, [field]: v } : item)) }),
    move: (i, step) => { const l = [...service[key]]; const to = i + step; if (to < 0 || to >= l.length) return; [l[i], l[to]] = [l[to], l[i]]; setService({ [key]: l }); },
    remove: i => setService({ [key]: service[key].filter((_, j) => j !== i) }),
    add: item => setService({ [key]: [...(service[key] || []), item] }),
  });
  const cards = listOps('cards');
  const notes = listOps('notes');
  const tables = listOps('tables');
  const setRow = (t, r, field, v) => tables.set(t, 'rows', service.tables[t].rows.map((row, j) => (j === r ? { ...row, [field]: v } : row)));
  const moveRow = (t, r, step) => { const rows = [...service.tables[t].rows]; const to = r + step; if (to < 0 || to >= rows.length) return; [rows[r], rows[to]] = [rows[to], rows[r]]; tables.set(t, 'rows', rows); };

  const compareText = (service.compare?.rows || []).length
    ? [['', ...service.compare.cols].join(' | '), ...service.compare.rows.map(r => r.join(' | '))].join('\n') : '';
  const setCompare = text => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split('|').map(c => c.trim()));
    setService({ compare: lines.length > 1 ? { cols: lines[0].slice(1), rows: lines.slice(1) } : undefined });
  };

  const actions = (ops, i) => <div className="pricing-ed-actions">
    <button type="button" onClick={() => ops.move(i, -1)}>↑</button>
    <button type="button" onClick={() => ops.move(i, 1)}>↓</button>
    <button type="button" className="danger" onClick={() => ops.remove(i)}>Remove</button>
  </div>;

  return <div className="pricing-ed">
    <p className="pricing-ed-intro">Everything on the <a href={`${SITE}/shopify-studio/pricing`} target="_blank" rel="noreferrer">pricing page</a>. Pick a service, edit it, then click Save at the top. In “Everything included”, one item per line; start a line with <b>#</b> for a small heading (e.g. <code># Website design</code>). The first package of New Store Launch, Store Redesign and Product &amp; Backend sets the 3 “from” prices on the main page and era pages.</p>

    <label className="pricing-ed-pick">Service
      <select value={service.id} onChange={e => setSid(e.target.value)}>
        {data.groups.map(g => <optgroup key={g.name} label={g.name}>
          {g.services.map(id => data.services.find(s => s.id === id)).filter(Boolean).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </optgroup>)}
      </select>
    </label>

    <div className="pricing-ed-section"><div className="pricing-ed-body">
      <div className="pricing-ed-row">
        <label className="grow">Service name<input value={service.name || ''} onChange={e => setService({ name: e.target.value })} /></label>
      </div>
      <label>Intro<textarea rows={2} value={service.intro || ''} onChange={e => setService({ intro: e.target.value })} /></label>
    </div></div>

    <h3 className="pricing-ed-h">Packages ({(service.cards || []).length})</h3>
    {(service.cards || []).map((c, i) => <div key={`${c.id}-${i}`} className="pricing-ed-card">
      <div className="pricing-ed-row">
        <label>Tag<input value={c.tag || ''} onChange={e => cards.set(i, 'tag', e.target.value)} /></label>
        <label className="grow">Name<input value={c.name || ''} onChange={e => cards.set(i, 'name', e.target.value)} /></label>
        <label>Price (from $)<input value={c.price || ''} placeholder="e.g. 3,500 or 10,000+" onChange={e => cards.set(i, 'price', e.target.value)} /></label>
        <label>Shown as<select value={c.priceType || 'from'} onChange={e => cards.set(i, 'priceType', e.target.value)}>
          <option value="from">From $X</option><option value="fixed">$X (fixed)</option><option value="monthly">$X/month</option><option value="quote">Custom quote</option></select></label>
        <label>Per<select value={c.unit || ''} onChange={e => { cards.set(i, 'unit', e.target.value); }}>
          <option value="">one-time</option><option value="/month">/month</option><option value="/hour">/hour</option></select></label>
      </div>
      <label>Who it’s for<input value={c.who || ''} onChange={e => cards.set(i, 'who', e.target.value)} /></label>
      <label>Card selling points (4–5, one per line)<textarea rows={5} value={c.highlights || ''} onChange={e => cards.set(i, 'highlights', e.target.value)} /></label>
      <label>Everything included (opens with “See everything included”)<textarea rows={Math.min(16, Math.max(4, String(c.items || '').split('\n').length + 1))} value={c.items || ''} onChange={e => cards.set(i, 'items', e.target.value)} /></label>
      <div className="pricing-ed-row">
        <label className="grow">Delivery line<input value={c.eta || ''} onChange={e => cards.set(i, 'eta', e.target.value)} /></label>
        <label className="pricing-ed-check"><input type="checkbox" checked={!!c.recommended} onChange={e => cards.set(i, 'recommended', e.target.checked)} /> Recommended</label>
        <label className="pricing-ed-check"><input type="checkbox" checked={!!c.quote} onChange={e => cards.set(i, 'quote', e.target.checked)} /> Needs a quote</label>
      </div>
      {actions(cards, i)}
    </div>)}
    <button type="button" className="pricing-ed-add" onClick={() => cards.add({ id: `${service.id}-${Date.now().toString(36)}`, tag: '', name: 'New package', price: '', unit: '', billing: 'one-time', who: '', highlights: '', items: '', eta: '', recommended: false, quote: false })}>+ Add a package</button>

    <h3 className="pricing-ed-h">Compare tiers table</h3>
    <label>One row per line, columns split with <b>|</b>. First line = package names (start it with <b>|</b>). Leave empty for no table.
      <textarea rows={Math.min(14, Math.max(4, compareText.split('\n').length + 1))} defaultValue={compareText} key={`cmp-${service.id}`} onBlur={e => setCompare(e.target.value)} />
    </label>

    <h3 className="pricing-ed-h">Price tables</h3>
    {(service.tables || []).map((t, ti) => <div key={`${t.title}-${ti}`} className="pricing-ed-card">
      <div className="pricing-ed-row">
        <label className="grow">Table title<input value={t.title || ''} onChange={e => tables.set(ti, 'title', e.target.value)} /></label>
        <label>Price column<input value={t.col || 'From'} onChange={e => tables.set(ti, 'col', e.target.value)} /></label>
      </div>
      {(t.rows || []).map((r, ri) => <div key={ri} className="pricing-ed-row pricing-ed-line">
        <label className="grow">Service<input value={r.name || ''} onChange={e => setRow(ti, ri, 'name', e.target.value)} /></label>
        <label className="grow">Small note<input value={r.note || ''} onChange={e => setRow(ti, ri, 'note', e.target.value)} /></label>
        <label>Price<input value={r.price || ''} onChange={e => setRow(ti, ri, 'price', e.target.value)} /></label>
        <label className="pricing-ed-check"><input type="checkbox" checked={!!r.popular} onChange={e => setRow(ti, ri, 'popular', e.target.checked)} /> Popular</label>
        <div className="pricing-ed-actions">
          <button type="button" onClick={() => moveRow(ti, ri, -1)}>↑</button>
          <button type="button" onClick={() => moveRow(ti, ri, 1)}>↓</button>
          <button type="button" className="danger" onClick={() => tables.set(ti, 'rows', t.rows.filter((_, j) => j !== ri))}>✕</button>
        </div>
      </div>)}
      <button type="button" className="pricing-ed-add" onClick={() => tables.set(ti, 'rows', [...(t.rows || []), { id: `${slug(t.title)}-${Date.now().toString(36)}`, name: '', note: '', price: '', popular: false }])}>+ Add a line</button>
      {actions(tables, ti)}
    </div>)}
    <button type="button" className="pricing-ed-add" onClick={() => tables.add({ title: 'New table', col: 'From', rows: [] })}>+ Add a price table</button>

    <h3 className="pricing-ed-h">Conditions &amp; notes</h3>
    {(service.notes || []).map((n, i) => <div key={`${n.title}-${i}`} className="pricing-ed-card">
      <div className="pricing-ed-row">
        <label className="grow">Title<input value={n.title || ''} onChange={e => notes.set(i, 'title', e.target.value)} /></label>
        <label className="pricing-ed-check"><input type="checkbox" checked={!!n.list} onChange={e => notes.set(i, 'list', e.target.checked)} /> Show as a ticked list</label>
      </div>
      <label>Text (one paragraph or item per line)<textarea rows={Math.min(12, Math.max(3, String(n.text || '').split('\n').length + 1))} value={n.text || ''} onChange={e => notes.set(i, 'text', e.target.value)} /></label>
      {actions(notes, i)}
    </div>)}
    <button type="button" className="pricing-ed-add" onClick={() => notes.add({ title: 'Conditions', text: '' })}>+ Add a note</button>

    <h3 className="pricing-ed-h">Short disclaimer under every package group</h3>
    <textarea rows={3} value={data.disclaimer || ''} onChange={e => save({ ...data, disclaimer: e.target.value })} />

    <button type="button" className="pricing-ed-reset" onClick={() => { if (window.confirm('Put every service, price and text back to the built-in version? (Only takes effect when you click Save.)')) onChange(clone(DEFAULTS)); }}>Reset all pricing to the built-in version</button>
  </div>;
}
