import { useEffect, useMemo, useState } from 'react';
import { Image, Upload, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminMedia, uploadBlogImage } from '../../services/siteAdminService';

export default function MediaAdmin() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!accessToken) return;
    setBusy(true); setError('');
    try { setItems(await loadAdminMedia(accessToken)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  useEffect(() => { refresh(); }, [accessToken]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return !term ? items : items.filter(item => `${item.name || ''} ${item.url || ''}`.toLowerCase().includes(term));
  }, [items, q]);

  const upload = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true); setError('');
    try {
      for (const file of files) await uploadBlogImage(accessToken, file);
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); event.target.value = ''; }
  };

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Assets</p><h1>Media</h1><p>Shared Supabase media for blog articles and social campaigns. Create properly sized social versions in Image Studio.</p></div>
      <div className="site-admin-actions"><Link className="site-admin-btn secondary" to="/admin/social-image"><WandSparkles size={15}/> Image Studio</Link><label className="site-admin-btn upload-button"><Upload size={15}/> {uploading ? 'Uploading…' : 'Upload Images'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={upload} disabled={uploading}/></label></div>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    <div className="site-admin-toolbar"><label className="site-admin-search"><input value={q} onChange={event => setQ(event.target.value)} placeholder="Search media"/></label></div>
    <div className="site-admin-media-grid">
      {busy && !items.length ? <div className="site-admin-card site-admin-empty large"><Image size={30}/><h2>Loading media…</h2></div> : filtered.map(item => <div className="site-admin-card site-admin-media-card" key={item.path || item.url}>
        <div className="site-admin-media-image"><img src={item.url} alt={item.name || 'Uploaded media'}/></div>
        <div className="site-admin-media-copy"><strong title={item.name}>{item.name || 'Image'}</strong><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</small></div>
      </div>)}
      {!busy && !filtered.length && <div className="site-admin-card site-admin-empty large"><Image size={30}/><h2>No media found</h2><p>Upload an image and it will appear here for reuse.</p></div>}
    </div>
  </>;
}
