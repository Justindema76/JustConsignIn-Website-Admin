import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Save } from 'lucide-react';
import { PhotoList } from './fields';
import { settingsApi } from './rentrallyAdminService';
import './rentrally.css';

// Blank fields fall back to the website's built-in text, so nothing breaks if a value is cleared.
const GROUPS = [
  {
    title: 'Brand',
    fields: [
      ['site_name', 'Business name', 'Rent & Rally'],
      ['tagline', 'Tagline under the logo', 'Event & Promo Rentals'],
      ['topbar_message', 'Top bar message', 'Planning an event? Message us for a same-day rental quote.', 'wide'],
    ],
  },
  {
    title: 'Buying (Shop)',
    note: 'What rental pages show under "Prefer to own it?". Shop items only appear on the website when this is set to Our Shop.',
    fields: [
      ['buy_mode', '"Prefer to own it?" on rental pages', '', 'wide', 'select'],
    ],
  },
  {
    title: 'Contact & service area',
    fields: [
      ['phone', 'Phone', '905-555-0123'],
      ['email', 'Email', 'hello@example.com'],
      ['hours', 'Hours', '9 AM – 5 PM Monday to Friday'],
      ['service_areas', 'Service areas', 'Hamilton, Stoney Creek, Burlington, Niagara & the GTA'],
      ['footer_note', 'Footer line under the hours', 'Weekend delivery available', 'wide'],
    ],
  },
  {
    title: 'Google search (whole site)',
    note: 'Used for the homepage and anywhere a page has no SEO text of its own.',
    fields: [
      ['seo_title', 'Homepage SEO title', 'Rent & Rally | Event & Promotional Rentals in Hamilton, Niagara & the GTA', 'wide'],
      ['seo_description', 'Homepage SEO description', 'Rent tents, air dancers, giant inflatables, flags, signs and banner stands. Delivered and set up across…', 'wide', 'textarea'],
      ['google_site_verification', 'Google Search Console code', 'The content="…" value from the HTML-tag method', 'wide'],
    ],
  },
  {
    title: 'Social links (footer)',
    note: 'Only the ones you fill in are shown.',
    fields: [
      ['facebook_url', 'Facebook', 'https://facebook.com/…'],
      ['instagram_url', 'Instagram', 'https://instagram.com/…'],
      ['tiktok_url', 'TikTok', 'https://tiktok.com/@…'],
    ],
  },
];

const SELECTS = {
  buy_mode: [
    ['supplier', 'Link to the supplier (Shop now → opens their page)'],
    ['shop', 'Our Shop (Buy it → our own buy pages; Shop items shown)'],
    ['off', 'Off (no buying on the website)'],
  ],
};

export default function SettingsAdmin() {
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    settingsApi.load().then(setValues).catch(err => setError(err.message)).finally(() => setBusy(false));
  }, []);

  const set = (key, value) => setValues(v => ({ ...v, [key]: value }));

  const save = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const keys = [...GROUPS.flatMap(g => g.fields.map(f => f[0])), 'seo_image'];
      await settingsApi.save(Object.fromEntries(keys.map(k => [k, values[k] ?? ''])));
      setMessage('Saved. The website picks these up on the next page load.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return <form onSubmit={save}>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Settings</p>
        <h1>Website Settings</h1>
        <p>Text and contact details used across the Rent &amp; Rally website. Leave a field blank to keep the website’s default. Homepage and How It Works content is edited in <Link to="/admin/website/pages">Website › Pages</Link>.</p>
      </div>
      <button className="site-admin-btn" type="submit" disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save settings'}</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="site-admin-editor-grid">
      <div>
        {GROUPS.map(group => <div className="site-admin-card rr-settings-group" key={group.title}>
          <h2>{group.title}</h2>
          {group.note && <p className="rr-hint" style={{ margin: '4px 18px 0' }}>{group.note}</p>}
          <div className="site-admin-form">
            {group.fields.map(([key, label, placeholder, wide, kind]) => <label key={key} className={wide || ''}>
              {label}
              {kind === 'select'
                ? <select value={values[key] || 'supplier'} onChange={e => set(key, e.target.value)}>{SELECTS[key].map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select>
                : kind === 'textarea'
                ? <textarea rows={3} value={values[key] || ''} placeholder={placeholder} onChange={e => set(key, e.target.value)}/>
                : <input value={values[key] || ''} placeholder={placeholder} onChange={e => set(key, e.target.value)}/>}
            </label>)}
          </div>
        </div>)}
      </div>
      <aside>
        <div className="site-admin-card site-admin-side-card">
          <PhotoList single label="Social share image" value={values.seo_image || ''} onChange={v => set('seo_image', v)}/>
          <small className="rr-hint">Shown when the site is shared on Facebook, texts, etc. Leave empty to use the gorilla photo. Best size 1200 × 630.</small>
        </div>
      </aside>
    </div>
  </form>;
}
