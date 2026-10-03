import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Save, Upload } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { uploadSunwingsImage } from '../../services/siteAdminService';
import { loadSunwingsSettings, saveSunwingsSettings } from './sunwingsAdminService';
import '../../features/work-posts/workPosts.css';

const EMPTY = {
  site_name: 'Sunwings Transport',
  phone: '647-526-5132',
  email: 'dispatch@sunwingstransport.ca',
  seo_title: 'Sunwings Transport | Moving, Delivery & Commercial Transport',
  seo_description: 'Residential moving, furniture delivery, commercial transport, warehouse support and general labour across Toronto, the GTA, Hamilton and Niagara.',
  seo_image: '',
  google_site_verification: '',
  hero_title: '',
  hero_description: '',
  hero_image: '',
  hero_cta_label: 'View Services',
  hero_cta_url: '/services',
};

export default function SunwingsSettingsAdmin() {
  const { accessToken } = useAuth();
  const imageRef = useRef(null);
  const [settings, setSettings] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    setBusy(true);
    loadSunwingsSettings(accessToken)
      .then(value => setSettings({ ...EMPTY, ...value }))
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  }, [accessToken]);

  const update = (key, value) => setSettings(current => ({ ...current, [key]: value }));

  const save = async event => {
    event?.preventDefault?.();
    setBusy(true); setError(''); setMessage('');
    try {
      await saveSunwingsSettings(accessToken, settings);
      setMessage('Sunwings settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadHero = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const url = await uploadSunwingsImage(accessToken, file);
      update('hero_image', url);
      setMessage('Homepage banner uploaded. Save settings to keep it.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Sunwings Transport</p>
        <h1>Website Settings</h1>
        <p>These settings belong only to the Sunwings frontend.</p>
      </div>
      <button className="site-admin-btn" type="button" onClick={save} disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save Settings'}</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <form className="work-post-editor-grid" onSubmit={save}>
      <section className="work-post-editor-main">
        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head"><div><span>1</span><div><h2>Contact</h2><p>Contact details used by the Sunwings site.</p></div></div></div>
          <div className="site-admin-form work-post-fields">
            <label>Business name<input value={settings.site_name} onChange={event => update('site_name', event.target.value)}/></label>
            <label>Phone<input value={settings.phone} onChange={event => update('phone', event.target.value)}/></label>
            <label>Email<input type="email" value={settings.email} onChange={event => update('email', event.target.value)}/></label>
          </div>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>2</span><div><h2>Global SEO</h2><p>Default search and social metadata for the main Sunwings website.</p></div></div>
          </div>
          <label>SEO title<input value={settings.seo_title} onChange={event => update('seo_title', event.target.value)}/></label>
          <label>Meta description<textarea rows="5" value={settings.seo_description} onChange={event => update('seo_description', event.target.value)}/></label>
          <label>Social / OG image URL<input value={settings.seo_image} onChange={event => update('seo_image', event.target.value)}/></label>
          <label>Google site verification<input value={settings.google_site_verification} onChange={event => update('google_site_verification', event.target.value)} placeholder="Paste verification token only"/></label>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>3</span><div><h2>Homepage Banner</h2><p>Same full-width banner style used across the new Sunwings frontend.</p></div></div>
            <button className="site-admin-btn secondary small" type="button" onClick={() => imageRef.current?.click()} disabled={uploading}><Upload size={13}/>{uploading ? 'Uploading…' : 'Upload Image'}</button>
          </div>
          <input ref={imageRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadHero}/>
          {settings.hero_image && <div className="work-post-hero-image-preview" style={{maxWidth:'620px', marginBottom:'14px'}}><img src={settings.hero_image} alt=""/></div>}
          <label>Banner image URL<input value={settings.hero_image} onChange={event => update('hero_image', event.target.value)}/></label>
          <label>H1 / banner heading<input value={settings.hero_title} onChange={event => update('hero_title', event.target.value)}/></label>
          <label>Banner description<textarea rows="5" value={settings.hero_description} onChange={event => update('hero_description', event.target.value)}/></label>
          <div className="site-admin-form work-post-fields">
            <label>Button text<input value={settings.hero_cta_label} onChange={event => update('hero_cta_label', event.target.value)}/></label>
            <label>Button URL<input value={settings.hero_cta_url} onChange={event => update('hero_cta_url', event.target.value)}/></label>
          </div>
        </div>
      </section>

      <aside className="work-post-editor-side">
        <div className="site-admin-card site-admin-side-card">
          <h2>Publishing</h2>
          <p>Service Posts and Location Posts have their own Draft / Published control. These global settings update the Sunwings site only.</p>
          <button className="site-admin-btn work-post-side-save" type="button" onClick={save} disabled={busy}><Save size={14}/> {busy ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </aside>
    </form>
  </>;
}
