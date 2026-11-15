import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Image, Save } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadSunwingsSettings, saveSunwingsSettings } from './sunwingsAdminService';
import './sunwingsPages.css';
import MediaPickerModal from '../../features/social-automation/components/MediaPickerModal';

// Hamilton & Niagara pages and their search-engine text (Google title, description, share
// image). Saved in the `hn_seo` setting; blank fields use the defaults shown as placeholders,
// which match HN_SEO_DEFAULTS in the website's lib/hamiltonNiagara.js.
const PUBLIC_BASE = import.meta.env.VITE_SUNWINGS_PREVIEW_URL || 'https://sunwingstransport.ca';
const HN = '/hamilton-niagara';
export const HN_PAGES = [
  ['home', 'Home', HN, 'Hamilton & Niagara Movers | Long-Distance Moving & Transport | Sunwings', 'Moving, furniture delivery and long-distance transport across Hamilton, Burlington, Grimsby, St. Catharines, Niagara Falls and the Niagara Region, and to Toronto and the GTA. Free tailored quotes.'],
  ['long-distance', 'Long-Distance Moving', `${HN}/long-distance`, 'Long-Distance Moving in Hamilton & Niagara | Sunwings Transport', 'Long-distance moving across Hamilton, Burlington and the Niagara Region, and to Toronto and the GTA.'],
  ['furniture-delivery', 'Furniture Delivery', `${HN}/furniture-delivery`, 'Furniture Delivery in Hamilton & Niagara | Sunwings Transport', 'Furniture delivery across Hamilton, Burlington and the Niagara Region, and to Toronto and the GTA.'],
  ['commercial-transport', 'Commercial Transport', `${HN}/commercial-transport`, 'Commercial Transport in Hamilton & Niagara | Sunwings Transport', 'Commercial transport across Hamilton, Burlington and the Niagara Region, and to Toronto and the GTA.'],
  ['pricing', 'Pricing', `${HN}/pricing`, 'Moving & Delivery Prices in Hamilton & Niagara | Sunwings Transport', 'Upfront, written prices for moving, furniture delivery and long-distance transport in Hamilton, Burlington and the Niagara Region.'],
  ['contact', 'Contact', `${HN}/contact`, 'Contact Sunwings Transport | Hamilton & Niagara', 'Questions about moving, delivery or long-distance transport in Hamilton, Burlington or Niagara? Contact Sunwings Transport.'],
  ['blog', 'Moving Tips', `${HN}/blog`, 'Moving Tips for Hamilton & Niagara | Sunwings Transport', 'Moving tips, pricing guides and delivery advice for Hamilton, Burlington and the Niagara Region.'],
  ['facebook', 'Latest from Sunwings (Facebook)', `${HN}/facebook`, 'Latest from Sunwings | Hamilton & Niagara', 'Recent jobs, open spots and news from Sunwings Transport.'],
  ['partners', 'Store partners', `${HN}/partners`, 'Furniture Delivery Partners in Hamilton & Niagara | Sunwings Transport', 'Furniture stores and consignment shops in Hamilton, Burlington, Grimsby and the Niagara Region: free delivery partner program with written quotes for your customers.'],
];

// Where each page's banner and content are edited.
const BANNER_GROUP = { home: 'home', 'long-distance': 'long-distance', 'furniture-delivery': 'furniture-delivery', 'commercial-transport': 'commercial-transport' };
const BUILDER_PAGE = { pricing: 'hn-pricing', contact: 'hn-contact' };

function parse(raw) {
  let value = raw;
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { value = null; } }
  return value && typeof value === 'object' ? value : {};
}

export default function HnSeoPages({ open: openProp, onOpen, onLoaded }) {
  const { accessToken } = useAuth();
  const [seo, setSeo] = useState({});
  const [ownOpen, setOwnOpen] = useState('');
  const open = openProp ?? ownOpen;
  const setOpen = onOpen || setOwnOpen;
  const [picking, setPicking] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(true);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    loadSunwingsSettings(accessToken).then(settings => { const saved = parse(settings?.hn_seo); setSeo(saved); onLoaded?.(saved); }).catch(err => setNote(err.message)).finally(() => setBusy(false));
  }, [accessToken]);

  const set = (id, key, value) => { setSeo(current => ({ ...current, [id]: { ...current[id], [key]: value } })); setDirty(true); setNote(''); };

  const save = async () => {
    setBusy(true); setNote('');
    try {
      await saveSunwingsSettings(accessToken, { hn_seo: JSON.stringify(seo) });
      setDirty(false); onLoaded?.(seo); setNote('Saved. Google sees the new text the next time it visits.');
    } catch (err) { setNote(err.message); } finally { setBusy(false); }
  };

  return <div className="site-admin-card hn-seo-card" id="hamilton-niagara" style={{ marginTop: 24 }}>
    <div className="sunwings-pages-toolbar">
      <div><h2 style={{ margin: 0 }}>Google search text (SEO)</h2><small>Click a page to edit its Google title, description and share image. Blank = the grey default.</small></div>
      <button className="site-admin-btn" type="button" onClick={save} disabled={busy || !dirty}><Save size={15}/> {busy ? 'Working…' : dirty ? 'Save SEO' : 'Saved'}</button>
    </div>
    {note && <div className="site-admin-alert success">{note}</div>}
    {HN_PAGES.map(([id, title, path, defTitle, defDesc]) => {
      const own = seo[id] || {};
      const edited = Boolean(own.title || own.description || own.image);
      return <div key={id}>
        <div className="sunwings-pages-row" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === id ? '' : id)}>
          <div className="sunwings-page-title"><div><strong>{title}</strong></div></div>
          <code>{path}</code>
          <div><strong>{own.title || defTitle}</strong></div>
          <span className={`site-admin-status ${edited ? 'published' : 'system'}`}>{edited ? 'Custom SEO' : 'Default SEO'}</span>
          <div className="site-admin-actions right" onClick={event => event.stopPropagation()}>
            {BUILDER_PAGE[id] ? <Link className="site-admin-btn small" to={`/admin/sunwings/pages/${BUILDER_PAGE[id]}`}>Edit Page</Link> : null}
            {BANNER_GROUP[id] ? <Link className="site-admin-btn secondary small" to={`/admin/sunwings/promotions?tab=hn_content&open=${BANNER_GROUP[id]}`}>Edit banner</Link> : null}
            <button className="site-admin-btn secondary small" type="button" onClick={() => setOpen(open === id ? '' : id)}>{open === id ? 'Close' : 'Edit SEO'}</button>
            <a className="site-admin-btn secondary small" href={`${PUBLIC_BASE}${path}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View</a>
          </div>
        </div>
        {open === id && <div className="hn-seo-edit" style={{ display: 'grid', gap: 12, padding: '14px 16px 20px' }}>
          <label>Google title <small>{(own.title || defTitle).length}/60</small><input value={own.title || ''} placeholder={defTitle} onChange={event => set(id, 'title', event.target.value)}/></label>
          <label>Google description <small>{(own.description || defDesc).length}/160</small><textarea rows="3" value={own.description || ''} placeholder={defDesc} onChange={event => set(id, 'description', event.target.value)}/></label>
          <label>Share image (Facebook, texts)
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ flex: 1 }} value={own.image || ''} placeholder="Blank = the page's banner photo" onChange={event => set(id, 'image', event.target.value)}/>
              <button className="site-admin-btn secondary small" type="button" onClick={() => setPicking(id)}><Image size={13}/> Choose from Media</button>
            </div>
            {own.image ? <img src={own.image} alt="" style={{ marginTop: 8, maxWidth: 240, borderRadius: 8 }}/> : null}
          </label>
        </div>}
      </div>;
    })}
    {picking && <MediaPickerModal types={['image']} onClose={() => setPicking('')} onSelect={item => { set(picking, 'image', item.url); setPicking(''); }}/>}
  </div>;
}
