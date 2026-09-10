import { useEffect, useMemo, useState } from 'react';
import { Image, Music2, Upload, Video, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminMedia, uploadBlogImage, uploadSocialAudio, uploadSocialVideo } from '../../services/siteAdminService';

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
    return !term ? items : items.filter(item => `${item.name || ''} ${item.url || ''} ${item.mediaType || ''} ${item.bucket || ''}`.toLowerCase().includes(term));
  }, [items, q]);

  const upload = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true); setError('');
    try {
      for (const file of files) {
        const type = String(file.type || '').toLowerCase();
        if (type.startsWith('image/')) await uploadBlogImage(accessToken, file);
        else if (type.startsWith('video/')) await uploadSocialVideo(accessToken, file);
        else if (type.startsWith('audio/')) await uploadSocialAudio(accessToken, file);
        else throw new Error(`${file.name}: unsupported media type.`);
      }
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); event.target.value = ''; }
  };

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Assets</p><h1>Media</h1><p>Shared Supabase media for blog articles and social campaigns. Store images, MP4 videos and music in one reusable library.</p></div>
      <div className="site-admin-actions"><Link className="site-admin-btn secondary" to="/admin/social-image"><WandSparkles size={15}/> Image Studio</Link><label className="site-admin-btn upload-button"><Upload size={15}/> {uploading ? 'Uploading…' : 'Upload Media'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,.mp4,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/x-m4a,audio/ogg,.mp3,.m4a,.wav,.aac,.ogg" multiple onChange={upload} disabled={uploading}/></label></div>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    <div className="site-admin-toolbar"><label className="site-admin-search"><input value={q} onChange={event => setQ(event.target.value)} placeholder="Search images, videos or music"/></label></div>
    <div className="site-admin-media-grid">
      {busy && !items.length ? <div className="site-admin-card site-admin-empty large"><Image size={30}/><h2>Loading media…</h2></div> : filtered.map(item => {
        const type = item.mediaType || 'image';
        return <div className="site-admin-card site-admin-media-card" key={`${item.bucket || 'media'}:${item.path || item.url}`}>
          <div className="site-admin-media-image">
            {type === 'video'
              ? <video src={item.url} controls playsInline preload="metadata"/>
              : type === 'audio'
                ? <div style={{ width: '100%', padding: 18, display: 'grid', gap: 12, justifyItems: 'center' }}><Music2 size={28}/><audio controls preload="metadata" src={item.url} style={{ width: '100%' }}/></div>
                : <img src={item.url} alt={item.name || 'Uploaded media'}/>} 
          </div>
          <div className="site-admin-media-copy"><strong title={item.name}>{item.name || (type === 'audio' ? 'Music' : type === 'video' ? 'Video' : 'Image')}</strong><small>{type === 'video' ? <><Video size={12}/> Video</> : type === 'audio' ? <><Music2 size={12}/> Music</> : <><Image size={12}/> Image</>} {item.createdAt ? `· ${new Date(item.createdAt).toLocaleDateString()}` : ''}</small></div>
        </div>;
      })}
      {!busy && !filtered.length && <div className="site-admin-card site-admin-empty large"><Image size={30}/><h2>No media found</h2><p>Upload an image, MP4 video or audio file and it will appear here for reuse.</p></div>}
    </div>
  </>;
}
