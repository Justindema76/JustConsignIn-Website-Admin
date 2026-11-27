import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Save, Upload } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminGlobalSection, saveAdminGlobalSection, uploadSiteImage } from '../../services/siteAdminService';
import '../settings/settings.css';
import PricingEditor from './PricingEditor';
import DemoColorsEditor from './DemoColorsEditor';
import './pricingEditor.css';

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
  demoImages: { hero: {}, products: {} },
  demoText: {},
  demoDepts: [],
  demoProducts: [],
};

// Demo store (justindematteis.com/shopify-studio/demo-store): wording, departments and products.
// Blank = the built-in Starlite Home & Gift text/picture.
const DEMO_TEXT = [
  ['storeName', 'Store name', 'Starlite'], ['storeTag', 'Under the name', 'Home & Gift'],
  ['announcement', 'Top bar', 'Free shipping on orders over $75 · Gift wrap on every order'],
  ['nav1', 'Menu link 1', 'Kitchen'], ['nav2', 'Menu link 2', 'Gifts'], ['nav3', 'Menu link 3', 'Sale'],
  ['heroKicker', 'Banner small line', 'Fresh from the counter'], ['heroTitle', 'Banner heading', 'Kitchen classics, made to last'],
  ['heroText', 'Banner text', 'Diner mugs, malt glasses and table radios, picked by hand and shipped from our little shop on Main Street.'],
  ['heroBtn1', 'Banner button 1', 'Shop the kitchen'], ['heroBtn2', 'Banner button 2', 'Gift ideas'],
  ['deptTitle', 'Departments heading', 'Shop by department'], ['bestTitle', 'Best sellers heading', 'Best sellers this week'],
  ['collectionKicker', 'Collection small line', 'The counter collection'], ['collectionTitle', 'Collection name', 'Kitchen & Diner'],
  ['collectionText', 'Collection text', 'Everything for a kitchen with a little chrome and a lot of personality. 24 products.'],
];
const DEMO_DEPTS = ['Kitchen', 'Glassware', 'Radios', 'Music', 'Linens'];
const DEMO_PRODUCTS = [
  { t: 'Chrome Table Radio', v: 'Starlite Originals', p: '$89.00', was: '$109.00', b: 'New' },
  { t: 'Diner Counter Mug, Set of 2', v: 'Main Street Pottery', p: '$28.00' },
  { t: 'Malt Shop Glasses, Set of 4', v: 'Starlite Originals', p: '$34.00' },
  { t: 'Vinyl Record Wall Clock', v: 'Spin Shop', p: '$42.00' },
  { t: 'Cherry Print Apron', v: 'Starlite Originals', p: '$22.00', was: '$28.00', b: 'Sale' },
  { t: 'Tin Lunch Box', v: 'Lunch Club', p: '$24.00', b: 'New' },
  { t: 'Glass Soda Bottles, Set of 3', v: 'Pop & Co.', p: '$16.00' },
  { t: 'Checkerboard Tea Towel', v: 'Starlite Originals', p: '$14.00' },
  { t: 'Blue Plate Special Dish', v: 'Main Street Pottery', p: '$19.00' },
];

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

  const demoValue = (group, key) => values.demoImages?.[group]?.[key] || '';
  const setDemo = (group, key, url) => setValues(current => ({
    ...current,
    demoImages: { ...(current.demoImages || {}), [group]: { ...(current.demoImages?.[group] || {}), [key]: url } },
  }));
  async function uploadDemo(group, key, file) {
    if (!file) return;
    setError(''); setUploading(`demo-${group}-${key}`);
    try { setDemo(group, key, await uploadSiteImage(accessToken, file)); setMessage('Picture uploaded. Click Save to put it on the website.'); }
    catch (err) { setError(err.message); }
    finally { setUploading(''); }
  }
  const picField = (id, label, url, onUrl, onFile, wide) => <label key={id}>{label}
    {url ? <img src={url} alt="" style={{ width: wide ? 160 : 96, height: 96, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', display: 'block', margin: '6px 0' }} /> : <small style={{ display: 'block', margin: '6px 0' }}>Using the built-in picture</small>}
    <input value={url} placeholder="Built-in picture" onChange={e => onUrl(e.target.value)} />
    <span style={{ display: 'flex', gap: 8, marginTop: 6 }}>
      <span className="site-admin-btn secondary" style={{ position: 'relative', overflow: 'hidden' }}>
        <Upload size={14} /> {uploading === id ? 'Uploading…' : 'Upload'}
        <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      </span>
      {url && <button type="button" className="site-admin-btn secondary" onClick={() => onUrl('')}>Use built-in</button>}
    </span>
  </label>;

  const setList = (listKey, index, field, value) => setValues(current => {
    const list = [...(current[listKey] || [])];
    list[index] = { ...(list[index] || {}), [field]: value };
    return { ...current, [listKey]: list };
  });
  async function uploadList(listKey, index, file) {
    if (!file) return;
    setError(''); setUploading(`${listKey}-${index}`);
    try { setList(listKey, index, 'img', await uploadSiteImage(accessToken, file)); setMessage('Picture uploaded. Click Save to put it on the website.'); }
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
        <div className="email-settings-section-head compact"><div><h2>Pricing</h2><p>Every service, package, price, table and condition on the pricing page.</p></div></div>
        <PricingEditor value={values.pricing} onChange={next => set('pricing', next)} />
        <div className="email-settings-fields" style={{ marginTop: 14 }}>
          <label>Spots left this month<input value={values.spotsLeft || ''} placeholder="blank = hide" onChange={e => set('spotsLeft', e.target.value)} /></label>
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

        <div className="email-settings-divider" />
        <div className="email-settings-section-head compact"><div><h2>Demo store banners</h2><p>The clickable demo store (<a href={`${SITE}/shopify-studio/demo-store`} target="_blank" rel="noreferrer">open it</a>). Banner picture per era. Leave blank to keep the built-in look.</p></div></div>
        <div className="email-settings-fields">
          {ERAS.map(([era, label]) => picField(`demo-hero-${era}`, `${label} · Banner`, demoValue('hero', era), url => setDemo('hero', era, url), file => uploadDemo('hero', era, file), true))}
        </div>

        <div className="email-settings-divider" />
        <div className="email-settings-section-head compact"><div><h2>Demo store colours</h2><p>Every colour of the demo store, per decade. Change only what you want; the rest keeps the built-in look.</p></div></div>
        <DemoColorsEditor value={values.demoColors} onChange={next => set('demoColors', next)} />

        <div className="email-settings-divider" />
        <div className="email-settings-section-head compact"><div><h2>Demo store wording</h2><p>Turn the demo into any kind of shop (records, clothing, toys…). Same in every era. Blank = built-in text.</p></div></div>
        <div className="email-settings-fields">
          {DEMO_TEXT.map(([key, label, fallback]) => <label key={key} className={fallback.length > 40 ? 'wide' : ''}>{label}
            <input value={values.demoText?.[key] || ''} placeholder={fallback} onChange={e => set('demoText', { ...(values.demoText || {}), [key]: e.target.value })} />
          </label>)}
        </div>

        <div className="email-settings-divider" />
        <div className="email-settings-section-head compact"><div><h2>Demo store departments</h2><p>The round tiles under “Shop by department”.</p></div></div>
        <div className="email-settings-fields">
          {DEMO_DEPTS.map((fallback, i) => <div key={i} style={{ display: 'contents' }}>
            <label>Department {i + 1} name<input value={values.demoDepts?.[i]?.label || ''} placeholder={fallback} onChange={e => setList('demoDepts', i, 'label', e.target.value)} /></label>
            {picField(`demoDepts-${i}`, `Department ${i + 1} picture`, values.demoDepts?.[i]?.img || '', url => setList('demoDepts', i, 'img', url), file => uploadList('demoDepts', i, file))}
          </div>)}
        </div>

        <div className="email-settings-divider" />
        <div className="email-settings-section-head compact"><div><h2>Demo store products</h2><p>Product 1 is also the product page. Badge: New, Sale or blank.</p></div></div>
        {DEMO_PRODUCTS.map((fallback, i) => <div key={i} className="email-settings-fields" style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
          <label className="wide"><b>Product {i + 1}</b><input value={values.demoProducts?.[i]?.t || ''} placeholder={fallback.t} onChange={e => setList('demoProducts', i, 't', e.target.value)} /></label>
          <label>Brand<input value={values.demoProducts?.[i]?.v || ''} placeholder={fallback.v} onChange={e => setList('demoProducts', i, 'v', e.target.value)} /></label>
          <label>Price<input value={values.demoProducts?.[i]?.p || ''} placeholder={fallback.p} onChange={e => setList('demoProducts', i, 'p', e.target.value)} /></label>
          <label>Was price<input value={values.demoProducts?.[i]?.was || ''} placeholder={fallback.was || 'blank = no sale'} onChange={e => setList('demoProducts', i, 'was', e.target.value)} /></label>
          <label>Badge<input value={values.demoProducts?.[i]?.b || ''} placeholder={fallback.b || 'blank = none'} onChange={e => setList('demoProducts', i, 'b', e.target.value)} /></label>
          {picField(`demoProducts-${i}`, 'Photo', values.demoProducts?.[i]?.img || '', url => setList('demoProducts', i, 'img', url), file => uploadList('demoProducts', i, file))}
        </div>)}
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
