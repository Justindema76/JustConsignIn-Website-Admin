import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Save, Upload } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminGlobalSection, saveAdminGlobalSection, uploadSiteImage } from '../../services/siteAdminService';
import '../settings/settings.css';

// Settings for justindematteis.com/shopify-studio (the era-themed Shopify landing page and the
// Jill & The Beanstalk case study). Saved as site_settings key "global_shopify-studio"; the site
// falls back to these defaults until something is saved. Free store review requests from the
// page land in Service Requests as "Shopify / Ecommerce".

const SITE = 'https://www.justindematteis.com';

const ERAS = [
  ['50s', '1950s'],
  ['60s', '1960s'],
  ['70s', '1970s'],
  ['80s', '1980s Neon'],
  ['80s-memphis', '1980s Memphis'],
  ['90s', '1990s'],
  ['2000s', '2000s / Y2K'],
  ['2010s', '2010s'],
];

const DEFAULTS = {
  defaultEra: '50s',
  enabledEras: ERAS.map(([key]) => key),
  showEraSwitcher: true,
  switcherLabel: 'Try another decade',
  spotsLeft: '',
  priceTuneUp: '',
  priceRedesign: '',
  priceCustomApp: '',
  heroImages: {},
};

// Built-in hero pictures on the website (used when a box is left blank).
const HERO_BUILT_IN = {
  '50s': { desktop: 'bag-50s.webp', phone: 'hero-phone-50s.webp' },
  '60s': { desktop: 'bag-60s-v1.webp', phone: 'hero-phone-60s.webp' },
  '70s': { desktop: 'bag-70s-v1.webp', phone: 'hero-phone-70s.webp' },
  '80s': { desktop: 'bag-80s-v1.webp', phone: 'hero-phone-80s.webp' },
  '80s-memphis': { desktop: 'bag-80s-memphis-v1.webp', phone: 'hero-phone-80s-memphis.webp' },
  '90s': { desktop: 'bag-90s-v1.webp', phone: 'hero-phone-90s.webp' },
  '2000s': { desktop: 'bag-2000s-v1.webp', phone: 'hero-phone-2000s.webp' },
  '2010s': { desktop: 'bag-2010s-v1.webp', phone: '' },
};
const builtIn = (era, kind) => (HERO_BUILT_IN[era]?.[kind] ? `${SITE}/shopify-studio/img/${HERO_BUILT_IN[era][kind]}` : '');

export default function ShopifyStudioAdmin() {
  const { accessToken } = useAuth();
  const [values, setValues] = useState(DEFAULTS);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    loadAdminGlobalSection(accessToken, 'shopify-studio')
      .then(({ value }) => setValues({ ...DEFAULTS, ...(value || {}) }))
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  }, [accessToken]);

  const set = (key, value) => setValues(current => ({ ...current, [key]: value }));
  const toggleEra = key => setValues(current => {
    const enabled = new Set(current.enabledEras || []);
    if (enabled.has(key)) enabled.delete(key); else enabled.add(key);
    return { ...current, enabledEras: ERAS.map(([k]) => k).filter(k => enabled.has(k)) };
  });

  const heroValue = (era, kind) => values.heroImages?.[era]?.[kind] || '';
  const setHero = (era, kind, url) => setValues(current => ({
    ...current,
    heroImages: { ...(current.heroImages || {}), [era]: { ...(current.heroImages?.[era] || {}), [kind]: url } },
  }));
  const [uploading, setUploading] = useState('');
  async function uploadHero(era, kind, file) {
    if (!file) return;
    setError(''); setUploading(`${era}-${kind}`);
    try { setHero(era, kind, await uploadSiteImage(accessToken, file)); setMessage('Picture uploaded. Click Save to put it on the website.'); }
    catch (err) { setError(err.message); }
    finally { setUploading(''); }
  }

  async function save(event) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!values.enabledEras?.length) { setError('Turn on at least one era.'); return; }
    if (!values.enabledEras.includes(values.defaultEra)) { setError('The default era has to be one of the eras that are turned on.'); return; }
    setBusy(true);
    try {
      await saveAdminGlobalSection(accessToken, 'shopify-studio', values);
      setMessage('Saved. The website picks this up on the next page load.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={save}>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website</p>
        <h1>Shopify Studio</h1>
        <p>The Shopify store-building page and the Jill &amp; The Beanstalk case study. Every era says the same thing; only the look changes. Free store review requests arrive in <Link to="/admin/service-requests">Service Requests</Link> as Shopify / Ecommerce.</p>
      </div>
      <button className="site-admin-btn" type="submit" disabled={busy}><Save size={15} /> {busy ? 'Saving…' : 'Save'}</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16} />{message}</div>}

    <div className="email-settings-layout">
      <div className="site-admin-card email-settings-form">
        <div className="email-settings-section-head compact"><div><h2>Eras</h2><p>Which decades visitors can see, and which one opens at justindematteis.com/shopify-studio.</p></div></div>
        <div className="email-settings-fields">
          <label className="wide">Default era
            <select value={values.defaultEra} onChange={e => set('defaultEra', e.target.value)}>
              {ERAS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          {ERAS.map(([key, label]) => <label key={key} className="email-settings-checkbox-field">
            <span className="email-settings-checkbox-row">
              <input type="checkbox" checked={(values.enabledEras || []).includes(key)} onChange={() => toggleEra(key)} /> {label}
            </span>
          </label>)}
          <label className="wide email-settings-checkbox-field">
            <span className="email-settings-checkbox-row">
              <input type="checkbox" checked={!!values.showEraSwitcher} onChange={e => set('showEraSwitcher', e.target.checked)} /> Show the “try another decade” button on the page
            </span>
          </label>
          <label className="wide">Button text
            <input value={values.switcherLabel || ''} placeholder="Try another decade" onChange={e => set('switcherLabel', e.target.value)} />
          </label>
        </div>

        <div className="email-settings-divider" />
        <div className="email-settings-section-head compact"><div><h2>Packages &amp; availability</h2><p>Leave a price blank to show “Free quote”. Leave spots blank to hide the spots line.</p></div></div>
        <div className="email-settings-fields">
          <label>Store Tune-Up price (from $)<input value={values.priceTuneUp || ''} placeholder="e.g. 1,500" onChange={e => set('priceTuneUp', e.target.value)} /></label>
          <label>Custom Store Redesign price (from $)<input value={values.priceRedesign || ''} placeholder="e.g. 4,500" onChange={e => set('priceRedesign', e.target.value)} /></label>
          <label>Custom App or Feature price (from $)<input value={values.priceCustomApp || ''} placeholder="e.g. 1,200" onChange={e => set('priceCustomApp', e.target.value)} /></label>
          <label>Spots left this month<input value={values.spotsLeft || ''} placeholder="e.g. 2" onChange={e => set('spotsLeft', e.target.value)} /></label>
        </div>

        <div className="email-settings-divider" />
        <div className="email-settings-section-head compact"><div><h2>Hero pictures</h2><p>The big picture at the top of each era. Desktop is the wide one; Phone is the 3x4 one shown under the text on phones. Upload a new one or paste a link. Leave blank to use the built-in picture.</p></div></div>
        <div className="email-settings-fields">
          {ERAS.map(([era, label]) => ['desktop', 'phone'].map(kind => {
            const current = heroValue(era, kind) || builtIn(era, kind);
            return <label key={`${era}-${kind}`}>{label} · {kind === 'desktop' ? 'Desktop' : 'Phone (3x4)'}
              {current ? <img src={current} alt="" style={{ width: kind === 'desktop' ? 160 : 72, height: 96, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', display: 'block', margin: '6px 0' }} /> : <small style={{ display: 'block', margin: '6px 0' }}>No picture</small>}
              <input value={heroValue(era, kind)} placeholder="Built-in picture" onChange={e => setHero(era, kind, e.target.value)} />
              <span style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <span className="site-admin-btn secondary" style={{ position: 'relative', overflow: 'hidden' }}>
                  <Upload size={14} /> {uploading === `${era}-${kind}` ? 'Uploading…' : 'Upload'}
                  <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => { uploadHero(era, kind, e.target.files?.[0]); e.target.value = ''; }} />
                </span>
                {heroValue(era, kind) && <button type="button" className="site-admin-btn secondary" onClick={() => setHero(era, kind, '')}>Use built-in</button>}
              </span>
            </label>;
          }))}
        </div>
      </div>

      <aside className="email-settings-side">
        <div className="site-admin-card email-settings-status-card">
          <h3>Preview each era</h3>
          <p>Opens the live page in a new tab.</p>
          <div className="email-settings-status-list">
            {ERAS.map(([key, label]) => <span key={key}>
              <a href={`${SITE}/shopify-studio/${key}`} target="_blank" rel="noreferrer">{label} page <ExternalLink size={12} /></a>
              {' · '}
              <a href={`${SITE}/shopify-studio/jill-and-the-beanstalk/${key}`} target="_blank" rel="noreferrer">case study <ExternalLink size={12} /></a>
            </span>)}
          </div>
        </div>
      </aside>
    </div>
  </form>;
}
