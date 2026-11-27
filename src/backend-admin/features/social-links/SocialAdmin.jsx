import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { SOCIAL_NETWORKS, SOCIAL_SECTIONS, emptySocialLinks } from '../../config/siteContent';
import { getAdminSiteKey, loadAdminSocial, saveAdminSocial } from '../../services/siteAdminService';

export default function SocialAdmin() {
  const { accessToken } = useAuth();
  const siteKey = getAdminSiteKey();
  const isSunwings = siteKey === 'sunwings';
  const sections = SOCIAL_SECTIONS[siteKey] || [];
  // No saved choice yet = shown on the main site only (how it worked before sections existed).
  const shownOn = (key, section) => { const saved = social[key]?.sections; return saved && section in saved ? saved[section] === true : section === sections[0]?.key; };
  const setShownOn = (key, section, on) => setSocial(current => { const prev = current[key] || {}; const base = Object.fromEntries(sections.map(s => [s.key, shownOn(key, s.key)])); return { ...current, [key]: { ...prev, sections: { ...base, [section]: on } } }; });
  const [social, setSocial] = useState(emptySocialLinks());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    setBusy(true); setError('');
    loadAdminSocial(accessToken).then(setSocial).catch(err => setError(err.message)).finally(() => setBusy(false));
  }, [accessToken]);

  const update = (key, patch) => setSocial(current => ({ ...current, [key]: { ...current[key], ...patch } }));

  const save = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await saveAdminSocial(accessToken, social);
      setSocial(saved);
      setMessage('Social links saved. The footer updates from these settings.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Website</p><h1>Social Links</h1><p>Add the links once here.{sections.length > 1 ? ' Tick where each icon shows: the main site, Shopify Studio, and any section added later.' : ' The same icon set is used in the public footer and website admin.'}</p></div>
      <button className="site-admin-btn" type="button" onClick={save} disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save Social Links'}</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}
    <div className="site-admin-card site-admin-social-form">
      <div className="site-admin-note">Using the icon files already in <strong>/public/images/brand/social-media-icons/</strong>.</div>
      {SOCIAL_NETWORKS.map(network => <div className="site-admin-social-row" key={network.key}>
        <div className="site-admin-social-name"><img src={network.icon} alt=""/><strong>{network.label}</strong></div>
        <input value={social[network.key]?.url || ''} onChange={e => update(network.key, { url: e.target.value })} placeholder={`https://${network.key}.com/...`}/>
        <label className="site-admin-switch"><input type="checkbox" checked={social[network.key]?.enabled !== false} onChange={e => update(network.key, { enabled: e.target.checked })}/><span>Show</span></label>
        {sections.length > 1 && <div className="site-admin-social-sections" aria-label={`Where ${network.label} shows`}>{sections.map(section => <label key={section.key} className="site-admin-switch"><input type="checkbox" checked={shownOn(network.key, section.key)} onChange={e => setShownOn(network.key, section.key, e.target.checked)}/><span>{section.label}</span></label>)}</div>}
      </div>)}
    </div>
    <div className="site-admin-footer-preview">
      <div><strong>{isSunwings ? 'Sunwings Transport' : siteKey === 'rentrally' ? 'Rent & Rally' : 'JustConsignIn'}</strong><p>{isSunwings ? 'Moving, delivery and commercial transport from Toronto to Niagara.' : siteKey === 'rentrally' ? 'Event and promo rentals in Hamilton, Niagara and the GTA.' : 'Consignment management for Shopify stores.'}</p></div>
      <div className="site-admin-social-icons">{SOCIAL_NETWORKS.filter(network => social[network.key]?.enabled !== false).map(network => <span key={network.key} className={!social[network.key]?.url ? 'disabled' : ''}><img src={network.icon} alt={network.label}/></span>)}</div>
    </div>
  </>;
}
