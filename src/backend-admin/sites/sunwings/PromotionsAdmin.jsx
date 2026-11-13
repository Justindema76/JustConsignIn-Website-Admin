import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, Library, Plus, RotateCcw, Save, Sparkles, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminMedia, uploadSunwingsImage } from '../../services/siteAdminService';
import { loadSunwingsSettings, saveSunwingsSettings } from './sunwingsAdminService';
import MediaPickerModal from '../../features/social-automation/components/MediaPickerModal';
import { PROMOTIONS_DEFAULTS } from './promotionsDefaults';
import PhotoPositionField from './PhotoPositionField';
import { loadServicePosts } from './sunwingsPostStore';
import '../../features/settings/settings.css';
import '../../features/work-posts/workPosts.css';
import './promotionsAdmin.css';

// Edits the Sunwings site's banners, slides, promo pop-up, price match and snow removal
// content. Each section is one sunwings_site_settings key saved as JSON; the site uses the
// saved value, or PROMOTIONS_DEFAULTS until something is saved.

const SERVICES = [
  ['residential-moving', 'Residential Moving'],
  ['furniture-delivery', 'Furniture Delivery'],
  ['commercial-transport', 'Commercial Transport'],
  ['snow-removal', 'Snow Removal'],
  ['packing-protection', 'Packing & Protection'],
  ['warehouse-container-unloading', 'Warehouse & Container Unloading'],
  ['junk-removal', 'Junk Removal'],
];

const PHOTO_HINT = 'Leave blank to use the service’s own photo.';
const POSITION_FIELD = { name: 'photoPosition', label: 'Photo position', type: 'photo-position' };

// Service slug → its banner photo, so the position editor can show the right picture.
const ServicePhotos = createContext({});

const BANNER_FIELDS = [
  { name: 'eyebrow', label: 'Small tag above the headline' },
  { name: 'heading', label: 'Headline (white)' },
  { name: 'accent', label: 'Second line (orange)' },
  { name: 'text', label: 'Subtitle', type: 'textarea', hint: 'Leave blank to use the subtitle from the Pages editor.' },
  { name: 'image', label: 'Banner photo', type: 'image', hint: 'Leave blank to use the photo from the Pages editor.' },
  POSITION_FIELD,
  { name: 'showServiceSlides', label: 'Rotate through the service slides after this banner', type: 'toggle' },
];

const SECTIONS = [
  {
    key: 'promo_popup',
    title: 'Pop-up',
    intro: 'The offer shown in the top bar on every page (it flips with the usual top bar line) and as a small tab in the bottom-left corner of its service page on computers. Turn it off below to hide both.',
    fields: [
      { name: 'enabled', label: 'ON / OFF: show this offer (top bar + pop-up tab)', type: 'toggle' },
      { name: 'serviceSlug', label: 'Service it promotes', type: 'select', options: SERVICES, hint: 'Its quote form opens with this service picked.' },
      { name: 'image', label: 'Photo', type: 'image', hint: PHOTO_HINT },
      { name: 'eyebrow', label: 'Small tag' },
      { name: 'heading', label: 'Headline' },
      { name: 'price', label: 'Price badge', hint: 'Leave blank to show the featured plan’s price, e.g. “from $175/month”.' },
      { name: 'text', label: 'Text', type: 'textarea' },
      { name: 'primary', label: 'Main button text' },
      { name: 'plan', label: 'Plan picked in the quote form', hint: 'Must match a plan name, e.g. “Seasonal plan”. Optional.' },
      { name: 'secondary', label: 'Second link text' },
      { name: 'secondaryHref', label: 'Second link goes to', hint: 'E.g. /services/snow-removal#plans opens the snow plans.' },
      { name: 'tabLabel', label: 'Closed tab text', hint: 'Leave blank for “[Service] [price]”.' },
    ],
  },
  {
    key: 'hero_slides',
    title: 'Slides',
    intro: 'The homepage slider, in order. Services, Service Areas and Pricing show these after their own banner.',
    list: true,
    itemLabel: item => `${SERVICES.find(([slug]) => slug === item.slug)?.[1] || 'Slide'}: ${item.heading || ''} ${item.accent || ''}`,
    newItem: { enabled: true, slug: 'residential-moving', image: '', desktopPosition: '', desktopSize: '', mobilePosition: '', mobileSize: '', eyebrow: '', heading: 'New slide', accent: '', text: '', primary: 'Get a quote', plan: '', secondary: 'Learn more', secondaryHref: '', badgeFromPrice: false, badgeTop: '', badgeMain: '', badgeBottom: '' },
    fields: [
      { name: 'enabled', label: 'Show this slide', type: 'toggle' },
      { name: 'slug', label: 'Service', type: 'select', options: SERVICES, hint: 'Sets the photo, the quote form service and the default “learn more” link.' },
      { name: 'image', label: 'Photo', type: 'image', hint: PHOTO_HINT },
      POSITION_FIELD,
      { name: 'eyebrow', label: 'Small tag above the headline' },
      { name: 'heading', label: 'Headline (white)' },
      { name: 'accent', label: 'Second line (orange)' },
      { name: 'text', label: 'Subtitle', type: 'textarea' },
      { name: 'primary', label: 'Orange button text', hint: 'Opens the quote form.' },
      { name: 'plan', label: 'Plan picked in the quote form', hint: 'Optional, e.g. “Seasonal plan”.' },
      { name: 'secondary', label: 'Outline button text', hint: 'Leave blank to hide it.' },
      { name: 'secondaryHref', label: 'Outline button goes to', hint: 'Leave blank for the service’s page.' },
      { name: 'badgeFromPrice', label: 'Round badge shows the service’s plan price', type: 'toggle' },
      { name: 'badgeTop', label: 'Badge: top line', hint: 'Used when the price badge is off. Leave the big word blank for no badge.' },
      { name: 'badgeMain', label: 'Badge: big word' },
      { name: 'badgeBottom', label: 'Badge: bottom line' },
    ],
  },
  {
    key: 'page_banners',
    title: 'Page banners',
    intro: 'The banner at the top of each main page.',
    groups: [
      ['services', 'Services'],
      ['locations', 'Service Areas'],
      ['pricing', 'Pricing'],
      ['blog', 'Moving Tips'],
      ['contact', 'Contact'],
      ['privacy', 'Privacy Policy'],
    ],
    fields: BANNER_FIELDS,
  },
  {
    key: 'service_banners',
    title: 'Service page photos',
    intro: 'Which part of each service page’s banner photo shows, on desktop and on phones. The photo itself is set in Service Posts.',
    groups: [...SERVICES, ['client-assist-moving-delivery', 'Client Assist Moving & Delivery']],
    fields: [POSITION_FIELD],
  },
  {
    key: 'pricing_panel',
    title: 'Pricing box',
    intro: 'The price box on the right of the Pricing banner (hidden on phones).',
    list: true,
    itemLabel: item => `${item.label || 'Row'}: ${item.value || '(automatic price)'}`,
    newItem: { label: 'New row', value: '', note: '' },
    fields: [
      { name: 'label', label: 'Small orange label' },
      { name: 'value', label: 'Big text', hint: 'On a “Snow removal” row, leave blank to show the snow plan price.' },
      { name: 'note', label: 'Small note' },
    ],
  },
  {
    key: 'price_match',
    title: 'Price match',
    intro: 'The price-match section on the Pricing page (/pricing#price-match).',
    fields: [
      { name: 'enabled', label: 'Show this section', type: 'toggle' },
      { name: 'eyebrow', label: 'Small tag' },
      { name: 'heading', label: 'Headline' },
      { name: 'text', label: 'Intro', type: 'textarea' },
      { name: 'steps', label: 'Steps', type: 'repeat', itemLabel: item => item.title, newItem: { title: 'New step', text: '' }, fields: [{ name: 'title', label: 'Title' }, { name: 'text', label: 'Text', type: 'textarea' }] },
      { name: 'rulesTitle', label: 'Rules box title' },
      { name: 'rules', label: 'Rules', type: 'lines', hint: 'One rule per line.' },
      { name: 'button', label: 'Button text' },
    ],
  },
  {
    key: 'trust_links',
    title: 'Under-banner boxes',
    intro: 'The 4 boxes under every banner. A box with a link shows an arrow; outside links open in a new tab.',
    list: true,
    itemLabel: item => item.title,
    newItem: { title: 'New box', text: '', href: '' },
    fields: [
      { name: 'title', label: 'Title' },
      { name: 'text', label: 'Small text' },
      { name: 'href', label: 'Link', hint: 'Leave blank for no link. E.g. /pricing#price-match or a Google link.' },
    ],
  },
  {
    key: 'snow_pricing',
    title: 'Snow removal plans',
    intro: 'The plans, prices and service areas on the Snow Removal page and the Pricing page. Leave Service areas empty to use the locations that have Snow Removal ticked (Admin › Locations).',
    fields: [
      { name: 'eyebrow', label: 'Small tag' },
      { name: 'heading', label: 'Headline' },
      { name: 'text', label: 'Intro', type: 'textarea' },
      {
        name: 'cards', label: 'Plans', type: 'repeat', itemLabel: item => `${item.title}: ${item.prefix ? `${item.prefix} ` : ''}${item.amount}${item.unit || ''}`,
        newItem: { title: 'New plan', subtitle: '', prefix: '', amount: 'Quote', unit: '', note: '', features: [], buttonText: 'Get a quote', featured: false },
        fields: [
          { name: 'title', label: 'Plan name' },
          { name: 'subtitle', label: 'Subtitle' },
          { name: 'prefix', label: 'Before the price', hint: 'E.g. “from”.' },
          { name: 'amount', label: 'Price', hint: 'E.g. $175, or “Quote”.' },
          { name: 'unit', label: 'After the price', hint: 'E.g. /month.' },
          { name: 'note', label: 'Small note under the price' },
          { name: 'features', label: 'What’s included', type: 'lines', hint: 'One per line.' },
          { name: 'buttonText', label: 'Button text' },
          { name: 'featured', label: 'Featured plan (highlighted; its price is used in badges and the pop-up)', type: 'toggle' },
        ],
      },
      { name: 'details', label: 'Fact boxes', type: 'repeat', itemLabel: item => `${item.label}: ${item.value}`, newItem: { label: '', value: '', note: '' }, fields: [{ name: 'label', label: 'Label' }, { name: 'value', label: 'Big text' }, { name: 'note', label: 'Small note' }] },
      {
        name: 'regions', label: 'Service areas', type: 'repeat', itemLabel: item => item.label, newItem: { label: 'New area', places: [] },
        fields: [
          { name: 'label', label: 'Area name' },
          { name: 'places', label: 'Towns', type: 'repeat', itemLabel: item => item.label, newItem: { label: '', href: '' }, fields: [{ name: 'label', label: 'Town' }, { name: 'href', label: 'Link', hint: 'E.g. /locations/markham. Leave blank if the town has no page.' }] },
        ],
      },
      { name: 'footnote', label: 'Fine print', type: 'textarea' },
    ],
  },
  {
    key: 'snow_page',
    title: 'Snow removal page',
    intro: 'The Snow Removal service post is the page’s content. Only fill in a field here to replace that part of it; blank fields use the service post.',
    fields: [
      { name: 'hero_title', label: 'Page headline' },
      { name: 'intro', label: 'Intro', type: 'textarea' },
      { name: 'seo_title', label: 'Google title' },
      { name: 'seo_description', label: 'Google description', type: 'textarea' },
      { name: 'bullets', label: 'What’s included', type: 'lines', hint: 'One per line.' },
      { name: 'body_html', label: 'Main text (HTML)', type: 'textarea', rows: 6 },
      { name: 'faq', label: 'FAQs', type: 'repeat', itemLabel: item => item.question, newItem: { question: '', answer: '' }, fields: [{ name: 'question', label: 'Question' }, { name: 'answer', label: 'Answer', type: 'textarea' }] },
    ],
  },
];

function parse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(fallback)) return Array.isArray(value) ? value : fallback;
    return value && typeof value === 'object' ? { ...fallback, ...value } : fallback;
  } catch {
    return fallback;
  }
}

function move(list, from, to) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function ImageField({ value, onChange, onPickMedia }) {
  const { accessToken } = useAuth();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      onChange(await uploadSunwingsImage(accessToken, file));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return <div className="promo-image-field">
    {value ? <img src={value} alt=""/> : <span className="promo-image-empty">Default photo</span>}
    <div className="promo-image-controls">
      <input value={value || ''} onChange={event => onChange(event.target.value)} placeholder="Image URL"/>
      <div className="promo-row-actions">
        <button className="site-admin-btn secondary small" type="button" onClick={() => onPickMedia(onChange)}><Library size={13}/> Choose from Media</button>
        <button className="site-admin-btn secondary small" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload size={13}/> {uploading ? 'Uploading…' : 'Upload'}</button>
        {value ? <button className="site-admin-btn secondary small" type="button" onClick={() => onChange('')}>Use default</button> : null}
      </div>
      {error ? <small className="promo-error">{error}</small> : null}
    </div>
    <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload}/>
  </div>;
}

function Field({ field, value, onChange, onPickMedia, item, groupKey, onItemChange }) {
  const label = <span className="promo-label">{field.label}</span>;
  const hint = field.hint ? <small>{field.hint}</small> : null;

  if (field.type === 'toggle') {
    return <label className="promo-toggle"><input type="checkbox" checked={value !== false && Boolean(value ?? false)} onChange={event => onChange(event.target.checked)}/> {field.label}{hint}</label>;
  }
  if (field.type === 'select') {
    return <label>{label}<select value={value ?? ''} onChange={event => onChange(event.target.value)}>{field.options.map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select>{hint}</label>;
  }
  if (field.type === 'textarea') {
    return <label>{label}<textarea rows={field.rows || 3} value={value ?? ''} onChange={event => onChange(event.target.value)}/>{hint}</label>;
  }
  if (field.type === 'lines') {
    return <label>{label}<textarea rows={Math.max(3, (value || []).length + 1)} value={(value || []).join('\n')} onChange={event => onChange(event.target.value.split('\n'))} onBlur={event => onChange(event.target.value.split('\n').map(line => line.trim()).filter(Boolean))}/>{hint}</label>;
  }
  if (field.type === 'photo-position') {
    return <PositionField item={item} groupKey={groupKey} onItemChange={onItemChange}/>;
  }
  if (field.type === 'image') {
    return <div className="promo-field">{label}<ImageField value={value} onChange={onChange} onPickMedia={onPickMedia}/>{hint}</div>;
  }
  if (field.type === 'repeat') {
    return <div className="promo-field">{label}{hint}<Repeat field={field} items={value || []} onChange={onChange} onPickMedia={onPickMedia}/></div>;
  }
  return <label>{label}<input value={value ?? ''} onChange={event => onChange(event.target.value)}/>{hint}</label>;
}

function PositionField({ item = {}, groupKey, onItemChange }) {
  const photos = useContext(ServicePhotos);
  const image = item.image || photos[item.slug] || photos[groupKey] || '';
  return <div className="promo-field">
    <span className="promo-label">Photo position</span>
    <PhotoPositionField image={image} item={item} onChange={changes => onItemChange({ ...item, ...changes })}/>
    {!image ? <small>No photo set here. Pick one above (or in the Pages editor) to position it.</small> : null}
  </div>;
}

function Fields({ fields, value, onChange, onPickMedia, groupKey }) {
  return <div className="promo-fields">
    {fields.map(field => (
      <Field key={field.name} field={field} value={value?.[field.name]} onPickMedia={onPickMedia}
        item={value} groupKey={groupKey} onItemChange={onChange}
        onChange={next => onChange({ ...value, [field.name]: next })}/>
    ))}
  </div>;
}

function Repeat({ field, items, onChange, onPickMedia }) {
  const [open, setOpen] = useState(null);
  return <div className="promo-repeat">
    {items.map((item, index) => (
      <div className={`promo-item ${open === index ? 'open' : ''} ${item?.enabled === false ? 'off' : ''}`} key={index}>
        <div className="promo-item-head">
          <button type="button" className="promo-item-title" onClick={() => setOpen(open === index ? null : index)}>
            <b>{index + 1}.</b> {field.itemLabel?.(item) || `Item ${index + 1}`}{item?.enabled === false ? <em> (hidden)</em> : null}
          </button>
          <div className="promo-row-actions">
            <button type="button" className="site-admin-btn secondary small" onClick={() => onChange(move(items, index, index - 1))} disabled={index === 0} aria-label="Move up"><ArrowUp size={13}/></button>
            <button type="button" className="site-admin-btn secondary small" onClick={() => onChange(move(items, index, index + 1))} disabled={index === items.length - 1} aria-label="Move down"><ArrowDown size={13}/></button>
            <button type="button" className="site-admin-btn secondary small" onClick={() => { if (window.confirm('Remove this item?')) onChange(items.filter((_, i) => i !== index)); }} aria-label="Remove"><Trash2 size={13}/></button>
          </div>
        </div>
        {open === index ? <Fields fields={field.fields} value={item} onPickMedia={onPickMedia} onChange={next => onChange(items.map((entry, i) => i === index ? next : entry))}/> : null}
      </div>
    ))}
    <button type="button" className="site-admin-btn secondary small" onClick={() => { onChange([...items, structuredClone(field.newItem)]); setOpen(items.length); }}><Plus size={13}/> Add</button>
  </div>;
}

export default function PromotionsAdmin() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState(SECTIONS[0].key);
  const [values, setValues] = useState(() => structuredClone(PROMOTIONS_DEFAULTS));
  const [dirty, setDirty] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [picker, setPicker] = useState(null);
  const [media, setMedia] = useState([]);
  const [servicePhotos, setServicePhotos] = useState({});

  useEffect(() => {
    if (!accessToken) return;
    setBusy(true);
    loadSunwingsSettings(accessToken)
      .then(settings => setValues(Object.fromEntries(Object.entries(PROMOTIONS_DEFAULTS).map(([key, fallback]) => [key, parse(settings?.[key], structuredClone(fallback))]))))
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
    loadServicePosts(accessToken)
      .then(posts => setServicePhotos(Object.fromEntries((posts || []).filter(post => post.slug && post.bannerImage).map(post => [post.slug, post.bannerImage]))))
      .catch(() => {});
  }, [accessToken]);

  const section = SECTIONS.find(item => item.key === tab);
  const update = (key, next) => { setValues(current => ({ ...current, [key]: next })); setDirty(current => ({ ...current, [key]: true })); setMessage(''); };

  const pickMedia = async apply => {
    setPicker(() => apply);
    if (media.length || !accessToken) return;
    try { setMedia(await loadAdminMedia(accessToken)); } catch (err) { setError(err.message); }
  };

  const save = async () => {
    const keys = Object.keys(dirty);
    if (!keys.length) return setMessage('Nothing to save.');
    setBusy(true); setError(''); setMessage('');
    try {
      await saveSunwingsSettings(accessToken, Object.fromEntries(keys.map(key => [key, JSON.stringify(values[key])])));
      setDirty({});
      setMessage('Saved. The live site updates within about a minute.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resetSection = () => {
    if (!window.confirm(`Put “${section.title}” back to the original content? This takes effect when you save.`)) return;
    update(section.key, structuredClone(PROMOTIONS_DEFAULTS[section.key]));
  };

  const value = values[section.key];

  return <ServicePhotos.Provider value={servicePhotos}>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Sunwings Transport</p>
        <h1>Pop-up, Slider &amp; Banners</h1>
        <p>Edit the slider, page banners, the slide-up pop-up, the price match and the snow removal plans. Changes go live about a minute after you save.</p>
      </div>
      <button className="site-admin-btn" type="button" onClick={save} disabled={busy}><Save size={15}/> {busy ? 'Saving…' : Object.keys(dirty).length ? `Save ${Object.keys(dirty).length} change${Object.keys(dirty).length > 1 ? 's' : ''}` : 'Save'}</button>
    </div>

    <div className="settings-tabs promo-tabs" role="tablist" aria-label="Promotions sections">
      {SECTIONS.map(item => (
        <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={`settings-tab ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
          {item.title}{dirty[item.key] ? ' •' : ''}
        </button>
      ))}
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="site-admin-card work-post-panel promo-panel">
      <div className="work-post-panel-head">
        <div><span><Sparkles size={15}/></span><div><h2>{section.title}</h2><p>{section.intro}</p></div></div>
        <button className="site-admin-btn secondary small" type="button" onClick={resetSection}><RotateCcw size={13}/> Original content</button>
      </div>

      {section.list ? (
        <Repeat field={section} items={value} onChange={next => update(section.key, next)} onPickMedia={pickMedia}/>
      ) : section.groups ? (
        section.groups.map(([groupKey, groupLabel]) => (
          <details className="promo-group" key={groupKey}>
            <summary>{groupLabel}</summary>
            <Fields fields={section.fields} value={value?.[groupKey] || {}} onPickMedia={pickMedia} groupKey={groupKey}
              onChange={next => update(section.key, { ...value, [groupKey]: next })}/>
          </details>
        ))
      ) : (
        <Fields fields={section.fields} value={value} onPickMedia={pickMedia} onChange={next => update(section.key, next)}/>
      )}
    </div>

    {picker && <MediaPickerModal
      items={media.filter(item => (item.mediaType || 'image') === 'image')}
      onClose={() => setPicker(null)}
      onSelect={item => { picker(item.url); setPicker(null); }}
    />}
  </ServicePhotos.Provider>;
}
