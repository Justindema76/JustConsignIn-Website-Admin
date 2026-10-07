import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Copy, LoaderCircle, Palette, RotateCcw, Save, Type, LayoutGrid, Square } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { getAdminSiteKey, loadAdminGlobalStyles, saveAdminGlobalStyles } from '../../services/siteAdminService';
import { globalStylesForSite, globalStyleVars, normalizeGlobalStyles } from './globalStyles';
import './globalStylesAdmin.css';

const colorFields = [
  ['primary', 'Primary colour'],
  ['primaryDark', 'Primary hover / dark'],
  ['text', 'Text colour'],
  ['muted', 'Muted text'],
  ['pageBackground', 'Page background'],
  ['surface', 'Card / surface'],
  ['lightSurface', 'Light surface'],
  ['border', 'Border colour'],
  ['darkSurface', 'Dark surface'],
];

const FONT_FALLBACK = `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
const FONT_OPTIONS = [
  { name: 'Plus Jakarta Sans', category: 'Sans' },
  { name: 'Inter', category: 'Sans' },
  { name: 'Work Sans', category: 'Sans' },
  { name: 'Poppins', category: 'Sans / geometric' },
  { name: 'Montserrat', category: 'Sans / geometric' },
  { name: 'Space Grotesk', category: 'Sans / modern' },
  { name: 'Playfair Display', category: 'Serif / display' },
  { name: 'Merriweather', category: 'Serif' },
];

function primaryFontName(stack = '') {
  const match = String(stack || '').match(/^"?([^",]+)"?/);
  return match ? match[1].trim() : stack;
}

function ColorField({ label, value, onChange }) {
  return <label className="global-style-color-field">
    <span>{label}</span>
    <div>
      <input type="color" value={value} onChange={event => onChange(event.target.value)} aria-label={label}/>
      <input type="text" value={value} onChange={event => onChange(event.target.value)} />
    </div>
  </label>;
}

function FontPickerField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const selectedName = primaryFontName(value);

  useEffect(() => {
    if (!open) return;
    const onClickAway = event => { if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const options = FONT_OPTIONS.filter(font => font.name.toLowerCase().includes(query.toLowerCase()));

  const choose = fontName => {
    onChange(`"${fontName}", ${FONT_FALLBACK}`);
    setOpen(false);
    setQuery('');
  };

  return <div className="global-font-picker" ref={rootRef}>
    <span className="global-font-picker-label">{label}</span>
    <button type="button" className="global-font-picker-btn" onClick={() => setOpen(current => !current)}>
      <span style={{ fontFamily: `"${selectedName}"` }}>{selectedName}</span>
      <ChevronDown size={15} className={open ? 'open' : ''}/>
    </button>
    {open && <div className="global-font-picker-panel">
      <input
        className="global-font-picker-search"
        type="text"
        placeholder="Search fonts…"
        value={query}
        onChange={event => setQuery(event.target.value)}
        autoFocus
      />
      <div className="global-font-picker-list">
        {options.map(font => <div
          key={font.name}
          className={`global-font-picker-item ${font.name === selectedName ? 'selected' : ''}`}
          onClick={() => choose(font.name)}
        >
          <span style={{ fontFamily: `"${font.name}"` }}>{font.name}</span>
          <small>{font.category}</small>
        </div>)}
        {!options.length && <div className="global-font-picker-empty">No fonts match &ldquo;{query}&rdquo;.</div>}
      </div>
    </div>}
  </div>;
}

function BrandColorReference({ styles }) {
  const [copiedKey, setCopiedKey] = useState('');

  const copy = async (key, hex) => {
    try { await navigator.clipboard.writeText(hex); } catch { /* clipboard unavailable */ }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(current => (current === key ? '' : current)), 1200);
  };

  return <section className="site-admin-card global-style-section">
    <div className="global-style-section-head"><Palette size={18}/><div><h2>Brand colour reference</h2><p>Your last saved values. If a colour gets changed by mistake below, come back here to copy it back.</p></div></div>
    <div className="global-color-reference-grid">
      {colorFields.map(([key, label]) => <button
        type="button"
        key={key}
        className="global-color-reference-chip"
        onClick={() => copy(key, styles[key])}
      >
        <span className="global-color-reference-swatch" style={{ background: styles[key] }}/>
        <span className="global-color-reference-meta">
          <small>{label}</small>
          <strong>{copiedKey === key ? 'Copied ✓' : styles[key]}</strong>
        </span>
        <Copy size={13} className="global-color-reference-icon"/>
      </button>)}
    </div>
  </section>;
}

function NumberField({ label, value, min, max, step = 1, suffix = 'px', onChange }) {
  return <label className="global-style-number-field">
    <span>{label}</span>
    <div>
      <input type="number" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))}/>
      <small>{suffix}</small>
    </div>
  </label>;
}

export default function GlobalStylesAdmin() {
  const { accessToken } = useAuth();
  const siteKey = getAdminSiteKey();
  const defaults = useMemo(() => globalStylesForSite(siteKey), [siteKey]);
  const [styles, setStyles] = useState(defaults);
  const [savedStyles, setSavedStyles] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAdminGlobalStyles(accessToken)
      .then(result => {
        if (!active) return;
        const normalized = normalizeGlobalStyles(result.value, siteKey);
        setStyles(normalized);
        setSavedStyles(normalized);
        setUpdatedAt(result.updatedAt || '');
      })
      .catch(err => {
        if (active) setError(err.message || 'Unable to load global styles.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  const vars = useMemo(() => globalStyleVars(styles, siteKey), [styles, siteKey]);
  const update = (key, value) => setStyles(current => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await saveAdminGlobalStyles(accessToken, normalizeGlobalStyles(styles, siteKey));
      const normalized = normalizeGlobalStyles(result.value || styles, siteKey);
      setStyles(normalized);
      setSavedStyles(normalized);
      setUpdatedAt(result.updatedAt || new Date().toISOString());
      setMessage('Global styles saved. The public website and shared block previews will use these values.');
    } catch (err) {
      setError(err.message || 'Unable to save global styles.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStyles(defaults);
    setMessage('Defaults restored in the editor. Save to apply them to the website.');
    setError('');
  };

  if (loading) return <div className="site-admin-card global-styles-loading"><LoaderCircle className="jci-spin" size={22}/> Loading global styles…</div>;

  return <div className="global-styles-page">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website</p>
        <h1>Global Styles</h1>
        <p>Change the site-wide design tokens used by shared blocks instead of editing CSS one block at a time.</p>
      </div>
      <span className="global-styles-page-icon" aria-hidden="true"><Palette size={22}/></span>
    </div>

    <div className="global-styles-layout">
      <div className="global-styles-controls">
        <section className="site-admin-card global-style-section">
          <div className="global-style-section-head"><Palette size={18}/><div><h2>Colours</h2><p>Used across buttons, headings, cards, backgrounds and borders.</p></div></div>
          <div className="global-style-color-grid">
            {colorFields.map(([key,label]) => <ColorField key={key} label={label} value={styles[key]} onChange={value => update(key,value)}/>)}
          </div>
        </section>

        <BrandColorReference styles={savedStyles}/>

        <section className="site-admin-card global-style-section">
          <div className="global-style-section-head"><Type size={18}/><div><h2>Typography</h2><p>Global heading and body font stacks.</p></div></div>
          <div className="global-style-text-grid">
            <FontPickerField label="Heading font" value={styles.headingFont} onChange={value => update('headingFont',value)}/>
            <FontPickerField label="Body font" value={styles.bodyFont} onChange={value => update('bodyFont',value)}/>
          </div>
          <div className="global-style-number-grid global-heading-size-grid">
            <NumberField label="H1 size" value={styles.h1Size} min={36} max={96} onChange={value => update('h1Size',value)}/>
            <NumberField label="H2 size" value={styles.h2Size} min={28} max={80} onChange={value => update('h2Size',value)}/>
            <NumberField label="H3 size" value={styles.h3Size} min={22} max={64} onChange={value => update('h3Size',value)}/>
            <NumberField label="H4 size" value={styles.h4Size} min={16} max={48} onChange={value => update('h4Size',value)}/>
          </div>
        </section>

        <section className="site-admin-card global-style-section">
          <div className="global-style-section-head"><LayoutGrid size={18}/><div><h2>Layout</h2><p>Defaults used by every shared page block.</p></div></div>
          <div className="global-style-number-grid">
            <NumberField label="Content width" value={styles.contentWidth} min={900} max={1600} onChange={value => update('contentWidth',value)}/>
            <NumberField label="Section spacing" value={styles.sectionSpacing} min={24} max={140} onChange={value => update('sectionSpacing',value)}/>
          </div>
        </section>

        <section className="site-admin-card global-style-section">
          <div className="global-style-section-head"><Square size={18}/><div><h2>Components</h2><p>Shared card and button shape defaults.</p></div></div>
          <div className="global-style-number-grid">
            <NumberField label="Card radius" value={styles.cardRadius} min={0} max={40} onChange={value => update('cardRadius',value)}/>
            <NumberField label="Button radius" value={styles.buttonRadius} min={0} max={40} onChange={value => update('buttonRadius',value)}/>
            <NumberField label="Button height" value={styles.buttonHeight} min={32} max={64} onChange={value => update('buttonHeight',value)}/>
          </div>
        </section>

        <div className="global-style-actions">
          <button className="site-admin-btn" type="button" onClick={save} disabled={saving}>
            {saving ? <LoaderCircle className="jci-spin" size={14}/> : <Save size={14}/>}
            {saving ? 'Saving…' : 'Save Global Styles'}
          </button>
          <button className="site-admin-btn secondary" type="button" onClick={reset}><RotateCcw size={14}/> Restore Defaults</button>
          {updatedAt && <small>Last saved {new Date(updatedAt).toLocaleString()}</small>}
        </div>
        {message && <div className="jci-builder-message success"><CheckCircle2 size={17}/><span>{message}</span></div>}
        {error && <div className="jci-builder-message error"><span>{error}</span></div>}
      </div>

      <aside className="site-admin-card global-styles-preview" style={vars}>
        <span className="global-preview-eyebrow">Live design tokens</span>
        <h1 style={{fontSize:'var(--site-h1-size)'}}>H1 heading</h1>
        <h2 style={{fontSize:'var(--site-h2-size)'}}>H2 heading</h2>
        <h3 style={{fontSize:'var(--site-h3-size)'}}>H3 heading</h3>
        <h4 style={{fontSize:'var(--site-h4-size)'}}>H4 heading</h4>
        <p>Every shared block should use these values unless that block has an intentional local override.</p>
        <div className="global-preview-card">
          <span>Example card</span>
          <strong>One change, everywhere.</strong>
          <p>Colour, typography, spacing and component shape are inherited from the selected website.</p>
          <button type="button">Primary button</button>
        </div>
      </aside>
    </div>
  </div>;
}
