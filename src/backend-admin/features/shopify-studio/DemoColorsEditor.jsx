// Colours of the Sunny Days demo store (justindematteis.com/shopify-studio/store), per era.
// Saved inside the shopify-studio settings as "demoColors": { [era]: { pu: '#…', … } }.
// Only changed colours are saved; anything left out uses the era's built-in colour (demoPalettes.json).
// Text that ends up hard to read is switched to white or near-black automatically on the store.
import { useState } from 'react';
import PALETTES from './demoPalettes.json';

const SITE = 'https://www.justindematteis.com';
const FIELDS = [
  ['pu', 'Main colour', 'Buttons, logo, menu bar'],
  ['pu2', 'Main colour (darker)', 'Hover and shadows'],
  ['pu3', 'Darkest', 'Footer and deep panels'],
  ['or', 'Accent', 'Sale tags, second button'],
  ['or2', 'Accent (darker)', 'Accent hover'],
  ['pk', 'Highlight', 'Small highlights and arrows'],
  ['go', 'Gold', 'Stars and little badges'],
  ['tl', 'Teal', 'Extra decoration colour'],
  ['nav', 'Top bar', 'Behind the logo and menu'],
  ['icon', 'Top bar icons', 'Search, account, cart, menu'],
  ['band', 'Big colour blocks', 'Category banner, visit us, footer'],
  ['cr', 'Page background', 'Behind everything'],
  ['cr2', 'Page background 2', 'Bands, lines, filters'],
  ['card', 'Cards', 'Product cards and boxes'],
  ['ink', 'Text', 'Main writing'],
  ['mu', 'Soft text', 'Small print and notes'],
];
// One-click page backgrounds (sets background, background 2, cards and the writing to match).
const SWATCHES = [
  ['Light pink', { cr: '#ffd9ed', cr2: '#ffb6dc', card: '#ffffff', ink: '#1f1850', mu: '#5b4b80' }],
  ['Lavender', { cr: '#ece6ff', cr2: '#d8ccff', card: '#ffffff', ink: '#1f1850', mu: '#5b4b80' }],
  ['Mint', { cr: '#dcf7ee', cr2: '#bdeedd', card: '#ffffff', ink: '#14302a', mu: '#4a6660' }],
  ['Sky', { cr: '#dcefff', cr2: '#bfe0ff', card: '#ffffff', ink: '#13254a', mu: '#4a5a78' }],
  ['Cream', { cr: '#fbf1dc', cr2: '#f3e3c3', card: '#ffffff', ink: '#2a1838', mu: '#6b5b66' }],
  ['White', { cr: '#ffffff', cr2: '#f1eff6', card: '#ffffff', ink: '#1c1a24', mu: '#5f5b6b' }],
  ['Midnight', { cr: '#2b2368', cr2: '#463b92', card: '#362c7c', ink: '#ffffff', mu: '#d6d0f5' }],
  ['Black', { cr: '#121016', cr2: '#2a2730', card: '#1e1b24', ink: '#ffffff', mu: '#c9c5d2' }],
];
const hex6 = value => {
  const v = String(value || '').trim();
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v.slice(1).split('').map(c => c + c).join('')}`.toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '#000000';
};

export default function DemoColorsEditor({ value, onChange }) {
  const eras = Object.keys(PALETTES);
  const [era, setEra] = useState(eras.includes('80s') ? '80s' : eras[0]);
  const all = value && typeof value === 'object' ? value : {};
  const saved = all[era] || {};
  const base = PALETTES[era];

  const setColor = (key, color) => {
    const next = { ...saved };
    if (!color || hex6(color) === hex6(base[key])) delete next[key]; else next[key] = hex6(color);
    const out = { ...all };
    if (Object.keys(next).length) out[era] = next; else delete out[era];
    onChange(out);
  };
  const applySwatch = colors => {
    const next = { ...saved };
    Object.entries(colors).forEach(([k, v]) => { if (hex6(v) === hex6(base[k])) delete next[k]; else next[k] = v; });
    const out = { ...all };
    if (Object.keys(next).length) out[era] = next; else delete out[era];
    onChange(out);
  };
  const resetEra = () => {
    if (!window.confirm(`Put every ${base.label} colour back to the built-in one? (Takes effect when you click Save.)`)) return;
    const out = { ...all }; delete out[era]; onChange(out);
  };
  const changed = Object.keys(saved).length;

  return <div className="pricing-ed">
    <p className="pricing-ed-intro">Pick a decade, change any colour, then click Save at the top. The <a href={`${SITE}/shopify-studio/store?theme=${era}`} target="_blank" rel="noreferrer">demo store</a> picks it up on the next visit. Writing that would be hard to read on its background is turned white or black automatically.</p>
    <div className="pricing-ed-row">
      <label>Decade
        <select value={era} onChange={e => setEra(e.target.value)}>
          {eras.map(e => <option key={e} value={e}>{PALETTES[e].label}{all[e] ? ' (changed)' : ''}</option>)}
        </select>
      </label>
    </div>
    <div className="demo-swatches"><span>Page background</span>
      {SWATCHES.map(([name, colors]) => <button type="button" key={name} onClick={() => applySwatch(colors)} className={(saved.cr || base.cr) === colors.cr ? 'on' : ''}>
        <i style={{ background: colors.cr, borderColor: colors.cr2 }} />{name}
      </button>)}
    </div>
    <div className="demo-colors-grid">
      {FIELDS.map(([key, label, hint]) => {
        const current = saved[key] || base[key];
        return <label key={key} className={`demo-color${saved[key] ? ' changed' : ''}`}>
          <span className="demo-color-name">{label}<small>{hint}</small></span>
          <span className="demo-color-pick">
            <input type="color" value={hex6(current)} onChange={e => setColor(key, e.target.value)} />
            <input value={current} onChange={e => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(e.target.value) && setColor(key, e.target.value)} />
            {saved[key] && <button type="button" onClick={() => setColor(key, '')} title="Use the built-in colour">Undo</button>}
          </span>
        </label>;
      })}
    </div>
    <div className="demo-colors-preview" style={{ background: saved.cr || base.cr, borderColor: saved.pu || base.pu }}>
      <span style={{ background: saved.pu || base.pu, color: '#fff' }}>Shop gifts</span>
      <span style={{ background: saved.or || base.or, color: '#fff' }}>Gift cards</span>
      <span style={{ background: saved.card || base.card, color: saved.ink || base.ink }}>Product card</span>
    </div>
    {changed > 0 && <button type="button" className="pricing-ed-reset" onClick={resetEra}>Put all {base.label} colours back ({changed} changed)</button>}
  </div>;
}
