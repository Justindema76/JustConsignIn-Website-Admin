import { useEffect, useState } from 'react';
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
    title: 'Homepage hero',
    fields: [
      ['hero_title', 'Headline (first line)', 'Rent the gear that'],
      ['hero_highlight', 'Headline (red second line)', 'stops traffic.'],
      ['hero_text', 'Intro paragraph', 'Giant inflatables, air dancers, tents, flags and banner stands, delivered and set up…', 'wide', 'textarea'],
      ['hero_badge_title', 'Photo badge title', "22' Gorilla"],
      ['hero_badge_text', 'Photo badge text', 'Rent from $350/day'],
    ],
  },
  {
    title: 'Contact & service area',
    fields: [
      ['phone', 'Phone', '905-555-0123'],
      ['email', 'Email', 'hello@example.com'],
      ['hours', 'Hours', '9 AM – 5 PM Monday to Friday'],
      ['service_areas', 'Service areas', 'Hamilton, Stoney Creek, Burlington, Niagara, GTA'],
      ['footer_note', 'Footer line under the hours', 'Weekend delivery available', 'wide'],
    ],
  },
];

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
      const keys = [...GROUPS.flatMap(g => g.fields.map(f => f[0])), 'hero_image'];
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
        <p>Text and contact details used across the Rent &amp; Rally website. Leave a field blank to keep the website’s default.</p>
      </div>
      <button className="site-admin-btn" type="submit" disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save settings'}</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="site-admin-editor-grid">
      <div>
        {GROUPS.map(group => <div className="site-admin-card rr-settings-group" key={group.title}>
          <h2>{group.title}</h2>
          <div className="site-admin-form">
            {group.fields.map(([key, label, placeholder, wide, kind]) => <label key={key} className={wide || ''}>
              {label}
              {kind === 'textarea'
                ? <textarea rows={3} value={values[key] || ''} placeholder={placeholder} onChange={e => set(key, e.target.value)}/>
                : <input value={values[key] || ''} placeholder={placeholder} onChange={e => set(key, e.target.value)}/>}
            </label>)}
          </div>
        </div>)}
      </div>
      <aside>
        <div className="site-admin-card site-admin-side-card">
          <PhotoList single label="Homepage hero photo" value={values.hero_image || ''} onChange={v => set('hero_image', v)}/>
          <small className="rr-hint">Leave empty to use the gorilla photo.</small>
        </div>
      </aside>
    </div>
  </form>;
}
