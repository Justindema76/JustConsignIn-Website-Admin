import { useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { uploadSiteImage } from '../../services/siteAdminService';

// Ordered list of photo URLs. First photo = main photo on the site.
export function PhotoList({ value = [], onChange, single = false, label = 'Photos' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const list = single ? (value ? [value] : []) : value;
  const commit = next => onChange(single ? (next[0] || '') : next);

  const upload = async event => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      const urls = [];
      for (const file of files) urls.push(await uploadSiteImage('', file));
      commit(single ? urls.slice(-1) : [...list, ...urls]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const move = (i, d) => {
    const next = [...list];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const addUrl = () => {
    const clean = url.trim();
    if (!clean) return;
    commit(single ? [clean] : [...list, clean]);
    setUrl('');
  };

  return <div className="rr-photos">
    <div className="rr-photos-head">
      <strong>{label}</strong>
      <small>{single ? 'One photo.' : 'The first photo is the main one. Options can point at a photo number.'}</small>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    <div className="rr-photo-grid">
      {list.map((src, i) => <div className="rr-photo" key={`${src}-${i}`}>
        <img src={src} alt="" loading="lazy"/>
        <span className="rr-photo-n">{i + 1}</span>
        <div className="rr-photo-tools">
          {!single && <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier"><ArrowUp size={13}/></button>}
          {!single && <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move later"><ArrowDown size={13}/></button>}
          <button type="button" onClick={() => commit(list.filter((_, j) => j !== i))} aria-label="Remove photo"><Trash2 size={13}/></button>
        </div>
      </div>)}
      <label className="rr-photo rr-photo-add upload-button">
        <ImagePlus size={20}/>
        <span>{busy ? 'Uploading…' : single && list.length ? 'Replace' : 'Upload'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={!single} onChange={upload} disabled={busy}/>
      </label>
    </div>
    <div className="rr-inline">
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="…or paste a photo URL" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}/>
      <button className="site-admin-btn secondary small" type="button" onClick={addUrl}>Add URL</button>
    </div>
  </div>;
}

// Rows of label/value pairs (Specifications).
export function PairRows({ value = [], onChange, labels = ['Label', 'Value'], addLabel = 'Add row' }) {
  const set = (i, key, v) => onChange(value.map((row, j) => (j === i ? { ...row, [key]: v } : row)));
  return <div className="rr-rows">
    {value.map((row, i) => <div className="rr-row" key={i}>
      <input value={row.label} onChange={e => set(i, 'label', e.target.value)} placeholder={labels[0]} aria-label={labels[0]}/>
      <input value={row.value} onChange={e => set(i, 'value', e.target.value)} placeholder={labels[1]} aria-label={labels[1]}/>
      <button type="button" className="rr-icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove row"><Trash2 size={14}/></button>
    </div>)}
    <button type="button" className="site-admin-btn secondary small" onClick={() => onChange([...value, { label: '', value: '' }])}><Plus size={13}/> {addLabel}</button>
  </div>;
}

// Options like Colour / Size. Each choice can switch the gallery to a photo number,
// and "(+$50/day)" in a choice adds that amount to the day rate on the site.
export function OptionRows({ value = [], onChange, photoCount = 0 }) {
  const setOption = (i, patch) => onChange(value.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setChoice = (i, k, patch) => setOption(i, { values: value[i].values.map((v, j) => (j === k ? { ...v, ...patch } : v)) });
  return <div className="rr-options">
    {value.map((option, i) => <div className="rr-option" key={i}>
      <div className="rr-row">
        <input value={option.label} onChange={e => setOption(i, { label: e.target.value })} placeholder="Option name, e.g. Colour" aria-label="Option name"/>
        <button type="button" className="rr-icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove option"><Trash2 size={14}/></button>
      </div>
      {option.values.map((choice, k) => <div className="rr-row rr-choice" key={k}>
        <input value={choice.v} onChange={e => setChoice(i, k, { v: e.target.value })} placeholder={"Choice, e.g. Red or 18' (+$50/day)"} aria-label="Choice"/>
        <select value={choice.img || ''} onChange={e => setChoice(i, k, { img: e.target.value ? Number(e.target.value) : undefined })} aria-label="Photo for this choice">
          <option value="">No photo change</option>
          {Array.from({ length: photoCount }, (_, n) => <option key={n} value={n + 1}>Show photo {n + 1}</option>)}
        </select>
        <button type="button" className="rr-icon-btn" onClick={() => setOption(i, { values: option.values.filter((_, j) => j !== k) })} aria-label="Remove choice"><Trash2 size={14}/></button>
      </div>)}
      <button type="button" className="site-admin-btn secondary small" onClick={() => setOption(i, { values: [...option.values, { v: '' }] })}><Plus size={13}/> Add choice</button>
    </div>)}
    <button type="button" className="site-admin-btn secondary small" onClick={() => onChange([...value, { label: '', values: [{ v: '' }] }])}><Plus size={13}/> Add option</button>
    <small className="rr-hint">Write a price add-on inside a choice like <code>18' (+$50/day)</code> and the website adds it to the day rate.</small>
  </div>;
}

// One item per line (features).
export const linesToList = text => String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
// Paragraphs separated by a blank line (description).
export const paragraphsToList = text => String(text || '').split(/\n\s*\n/).map(s => s.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);

const clip = (value, max) => (value.length > max ? `${value.slice(0, max - 2).trim()}…` : value);

// Google search title and description. Blank = the website writes one from the item's details.
export function SeoFields({ title = '', description = '', onChange, autoTitle = '', autoDescription = '', url = '' }) {
  const shownTitle = title || autoTitle;
  const shownDescription = description || autoDescription;
  return <div className="site-admin-card site-admin-side-card rr-seo">
    <h2>Google search</h2>
    <p>Leave blank and the website writes these for you.</p>
    <label>SEO title <small>{title.length}/60</small><input className="rr-side-input" value={title} maxLength={120} placeholder={autoTitle} onChange={e => onChange({ seo_title: e.target.value })}/></label>
    <label>SEO description <small>{description.length}/155</small><textarea className="rr-side-input" rows={4} value={description} maxLength={320} placeholder={autoDescription} onChange={e => onChange({ seo_description: e.target.value })}/></label>
    <div className="rr-serp" aria-label="Search result preview">
      <small>{url}</small>
      <b>{clip(shownTitle, 62)}</b>
      <span>{clip(shownDescription, 158)}</span>
    </div>
  </div>;
}
