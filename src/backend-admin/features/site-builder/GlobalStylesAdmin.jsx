import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, LoaderCircle, Palette, RotateCcw, Save, Type, LayoutGrid, SquareRoundCorner } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminGlobalStyles, saveAdminGlobalStyles } from '../../services/siteAdminService';
import { DEFAULT_GLOBAL_STYLES, globalStyleVars, normalizeGlobalStyles } from './globalStyles';
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

function ColorField({ label, value, onChange }) {
  return <label className="global-style-color-field">
    <span>{label}</span>
    <div>
      <input type="color" value={value} onChange={event => onChange(event.target.value)} aria-label={label}/>
      <input type="text" value={value} onChange={event => onChange(event.target.value)} />
    </div>
  </label>;
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
  const [styles, setStyles] = useState(DEFAULT_GLOBAL_STYLES);
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
        setStyles(normalizeGlobalStyles(result.value));
        setUpdatedAt(result.updatedAt || '');
      })
      .catch(err => {
        if (active) setError(err.message || 'Unable to load global styles.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  const vars = useMemo(() => globalStyleVars(styles), [styles]);
  const update = (key, value) => setStyles(current => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await saveAdminGlobalStyles(accessToken, normalizeGlobalStyles(styles));
      setStyles(normalizeGlobalStyles(result.value || styles));
      setUpdatedAt(result.updatedAt || new Date().toISOString());
      setMessage('Global styles saved. The public website and shared block previews will use these values.');
    } catch (err) {
      setError(err.message || 'Unable to save global styles.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStyles(DEFAULT_GLOBAL_STYLES);
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

        <section className="site-admin-card global-style-section">
          <div className="global-style-section-head"><Type size={18}/><div><h2>Typography</h2><p>Global heading and body font stacks.</p></div></div>
          <div className="global-style-text-grid">
            <label><span>Heading font</span><input value={styles.headingFont} onChange={event => update('headingFont',event.target.value)}/></label>
            <label><span>Body font</span><input value={styles.bodyFont} onChange={event => update('bodyFont',event.target.value)}/></label>
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
          <div className="global-style-section-head"><SquareRoundCorner size={18}/><div><h2>Components</h2><p>Shared card and button shape defaults.</p></div></div>
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
        <h2>Shared block preview</h2>
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
