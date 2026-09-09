import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Plus, Save, Trash2, Video } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AdminAuthContext';
import { deleteAdminVideo, loadAdminVideos, saveAdminVideo } from './siteAdminService';

const emptyVideo = { id: '', title: '', youtubeUrl: '', description: '', placement: 'homepage', sortOrder: 1, status: 'active' };

export default function VideosAdmin() {
  const { accessToken } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [videos, setVideos] = useState([]);
  const [draft, setDraft] = useState(emptyVideo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sorted = useMemo(() => [...videos].sort((a, b) => a.placement.localeCompare(b.placement) || a.sortOrder - b.sortOrder), [videos]);

  const refresh = async () => {
    if (!accessToken) return;
    const rows = await loadAdminVideos(accessToken);
    setVideos(rows);
    return rows;
  };

  useEffect(() => {
    setBusy(true); setError('');
    refresh().catch(err => setError(err.message)).finally(() => setBusy(false));
  }, [accessToken]);

  useEffect(() => {
    if (!editing) return;
    if (id === 'new') { setDraft(emptyVideo); return; }
    const current = videos.find(video => video.id === id);
    if (current) setDraft(current);
  }, [editing, id, videos]);

  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));

  const save = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      await saveAdminVideo(accessToken, draft);
      await refresh();
      navigate('/admin/videos');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const remove = async video => {
    if (!window.confirm(`Delete \"${video.title}\"?`)) return;
    setBusy(true); setError('');
    try { await deleteAdminVideo(accessToken, video.id); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (editing) return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Video manager</p><h1>{id === 'new' ? 'Add YouTube Video' : 'Edit YouTube Video'}</h1><p>Upload the video to YouTube, then manage where it appears on JustConsignIn from here.</p></div>
      <Link className="site-admin-btn secondary" to="/admin/videos">← Videos</Link>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}
    <form className="site-admin-card site-admin-form" onSubmit={save}>
      <div className="site-admin-note wide">Paste a YouTube URL here. Direct video-file uploading to YouTube can be added later if you want it, but it requires YouTube API authorization.</div>
      <label className="wide">Video title<input value={draft.title} onChange={e => update('title', e.target.value)} placeholder="Product creation from your phone" required/></label>
      <label className="wide">YouTube URL<input value={draft.youtubeUrl} onChange={e => update('youtubeUrl', e.target.value)} placeholder="https://youtu.be/..." required/></label>
      <label className="wide">Description<textarea rows="4" value={draft.description} onChange={e => update('description', e.target.value)} /></label>
      <label>Placement<select value={draft.placement} onChange={e => update('placement', e.target.value)}><option value="homepage">Homepage</option><option value="features">Features</option><option value="how-it-works">How It Works</option><option value="blog">Blog</option></select></label>
      <label>Sort order<input type="number" min="0" value={draft.sortOrder} onChange={e => update('sortOrder', Number(e.target.value))}/></label>
      <label>Status<select value={draft.status} onChange={e => update('status', e.target.value)}><option value="active">Active</option><option value="hidden">Hidden</option></select></label>
      <div className="wide site-admin-actions"><button className="site-admin-btn" disabled={busy} type="submit"><Save size={15}/> {busy ? 'Saving…' : 'Save Video'}</button><Link className="site-admin-btn secondary" to="/admin/videos">Cancel</Link></div>
    </form>
  </>;

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Content</p><h1>YouTube Videos</h1><p>Manage the videos currently used on the public website.</p></div>
      <Link className="site-admin-btn" to="/admin/videos/new"><Plus size={15}/> Add Video</Link>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    <div className="site-admin-card site-admin-table">
      <div className="site-admin-table-head videos"><span>Preview</span><span>Video</span><span>YouTube URL</span><span>Status</span><span>Actions</span></div>
      {busy && !videos.length ? <div className="site-admin-empty">Loading videos…</div> : sorted.map(video => <div className="site-admin-table-row videos" key={video.id}>
        <div className="site-admin-video-thumb">{video.youtubeId ? <img src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} alt=""/> : <Video size={22}/>}</div>
        <div><strong>{video.title}</strong><small>{video.placement} · order {video.sortOrder}</small></div>
        <div className="site-admin-url">{video.youtubeUrl}</div>
        <span className={`site-admin-status ${video.status}`}>{video.status}</span>
        <div className="site-admin-actions right"><Link className="site-admin-btn secondary small" to={`/admin/videos/${video.id}`}>Edit</Link><a className="site-admin-btn secondary small" href={video.youtubeUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View</a><button className="site-admin-btn danger small" type="button" onClick={() => remove(video)} disabled={busy}><Trash2 size={13}/></button></div>
      </div>)}
      {!busy && !videos.length && <div className="site-admin-empty">No videos yet.</div>}
    </div>
  </>;
}
