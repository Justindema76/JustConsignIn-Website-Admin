import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Plus, Star, Trash2, X } from 'lucide-react';
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

  // Drag a photo onto another spot to reorder. Click a photo to see it big.
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [view, setView] = useState(null);
  const moveTo = (from, to) => {
    if (from === to || from == null || to == null) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  };
  const remove = i => commit(list.filter((_, j) => j !== i));

  useEffect(() => {
    if (view == null) return undefined;
    const key = e => {
      if (e.key === 'Escape') setView(null);
      if (e.key === 'ArrowRight') setView(v => Math.min(list.length - 1, v + 1));
      if (e.key === 'ArrowLeft') setView(v => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [view, list.length]);

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
      {list.map((src, i) => <div
        className={`rr-photo${drag === i ? ' is-dragging' : ''}${over === i && drag !== i ? ' is-over' : ''}`}
        key={`${src}-${i}`}
        draggable={!single}
        onDragStart={e => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
        onDragOver={e => { if (drag == null) return; e.preventDefault(); if (over !== i) setOver(i); }}
        onDragLeave={() => setOver(o => (o === i ? null : o))}
        onDrop={e => { e.preventDefault(); moveTo(drag, i); setDrag(null); setOver(null); }}
        onDragEnd={() => { setDrag(null); setOver(null); }}
      >
        <button type="button" className="rr-photo-open" onClick={() => setView(i)} aria-label={`View photo ${i + 1}`}><img src={src} alt="" loading="lazy" draggable={false}/></button>
        <span className="rr-photo-n">{i + 1}{i === 0 && !single ? ' · Main' : ''}</span>
        {!single && <span className="rr-photo-grip" aria-hidden="true"><GripVertical size={14}/></span>}
        <div className="rr-photo-tools">
          <button type="button" onClick={() => remove(i)} aria-label="Remove photo"><Trash2 size={13}/></button>
        </div>
      </div>)}
      <label className="rr-photo rr-photo-add upload-button">
        <ImagePlus size={20}/>
        <span>{busy ? 'Uploading…' : single && list.length ? 'Replace' : 'Upload'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={!single} onChange={upload} disabled={busy}/>
      </label>
    </div>
    {!single && list.length > 1 && <small className="rr-hint">Drag photos to reorder. Click one to see it full size.</small>}
    {view != null && list[view] && <div className="rr-lightbox" role="dialog" aria-modal="true" aria-label={`Photo ${view + 1} of ${list.length}`} onClick={() => setView(null)}>
      <div className="rr-lightbox-box" onClick={e => e.stopPropagation()}>
        <div className="rr-lightbox-head">
          <strong>Photo {view + 1} of {list.length}{view === 0 && !single ? ' (main photo)' : ''}</strong>
          <button type="button" className="rr-icon-btn" onClick={() => setView(null)} aria-label="Close"><X size={16}/></button>
        </div>
        <div className="rr-lightbox-img">
          <img src={list[view]} alt=""/>
          {view > 0 && <button type="button" className="rr-lb-nav prev" onClick={() => setView(view - 1)} aria-label="Previous photo"><ChevronLeft size={22}/></button>}
          {view < list.length - 1 && <button type="button" className="rr-lb-nav next" onClick={() => setView(view + 1)} aria-label="Next photo"><ChevronRight size={22}/></button>}
        </div>
        <div className="rr-lightbox-foot">
          {!single && view > 0 && <button type="button" className="site-admin-btn secondary small" onClick={() => { moveTo(view, 0); setView(0); }}><Star size={13}/> Make main photo</button>}
          <button type="button" className="site-admin-btn secondary small" onClick={() => { remove(view); setView(null); }}><Trash2 size={13}/> Remove</button>
        </div>
      </div>
    </div>}
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
export function OptionRows({ value = [], onChange, photoCount = 0, photos = [] }) {
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
        {choice.img && photos[choice.img - 1] ? <img className="rr-choice-thumb" src={photos[choice.img - 1]} alt={`Photo ${choice.img}`}/> : <span className="rr-choice-thumb"/>}
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
