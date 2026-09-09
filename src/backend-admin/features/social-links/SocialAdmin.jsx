import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { SOCIAL_NETWORKS, emptySocialLinks } from '../../config/siteContent';
import { loadAdminSocial, saveAdminSocial } from '../../services/siteAdminService';

export default function SocialAdmin() {
  const { accessToken } = useAuth();
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
      <div><p className="site-admin-eyebrow">Website</p><h1>Social Links</h1><p>Add the links once here. The same icon set is used in the public footer and website admin.</p></div>
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
      </div>)}
    </div>
    <div className="site-admin-footer-preview">
      <div><strong>JustConsignIn</strong><p>Consignment management for Shopify stores.</p></div>
      <div className="site-admin-social-icons">{SOCIAL_NETWORKS.filter(network => social[network.key]?.enabled !== false).map(network => <span key={network.key} className={!social[network.key]?.url ? 'disabled' : ''}><img src={network.icon} alt={network.label}/></span>)}</div>
    </div>
  </>;
}
