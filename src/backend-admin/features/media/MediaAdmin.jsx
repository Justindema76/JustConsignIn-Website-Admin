import { useEffect, useMemo, useState } from 'react';
import { Check, CheckSquare, Copy, ExternalLink, FolderInput, HardDrive, Image, Maximize2, Music2, Square, Trash2, Upload, Video, WandSparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { deleteAdminMedia, getAdminSiteKey, loadAdminMedia, loadMediaInUse, uploadBlogImage, uploadSocialAudio, uploadSocialVideo } from '../../services/siteAdminService';
import { loadSunwingsSettings, saveSunwingsSettings } from '../../sites/sunwings/sunwingsAdminService';
import './mediaAdmin.css';
import { FOLDERS, formatBytes, guessFolder, keyOf, previewUrl, sizeOf } from './mediaUtils';

// Media library: every stored image, video and audio file for this site, with its size, the total
// space used, sorting, folders, "In use / Not used" tags (Sunwings: checked against the live site)
// and bulk select/delete. Big photos are shrunk to web size before uploading.

// Photos bigger than this get resized and saved as WebP before uploading (GIFs are left alone).
const MAX_SIDE = 2000;
const SHRINK_OVER = 700 * 1024;
export async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return { file, saved: 0 };
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { file, saved: 0 };
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SHRINK_OVER) { bitmap.close?.(); return { file, saved: 0 }; }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob || blob.size >= file.size) return { file, saved: 0 };
  const name = file.name.replace(/\.[a-z0-9]+$/i, '') + '.webp';
  return { file: new File([blob], name, { type: 'image/webp' }), saved: file.size - blob.size };
}

// onPick: opened from a "Choose from Media" button. Same page, plus "Use this image" on every file
// (no deleting or bulk actions in that mode).
export default function MediaAdmin({ onPick = null, pickTypes = null }) {
  const { accessToken, user } = useAuth();
  // Space used and file sizes are for the owner only (not partners like Marius).
  const isOwner = !user?.role || user.role === 'owner';
  const siteKey = getAdminSiteKey();
  const isSunwings = siteKey === 'sunwings';
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [folder, setFolder] = useState('all');
  // The photo opened big (click a thumbnail).
  const [viewing, setViewing] = useState(null);
  const [folders, setFolders] = useState({});
  const [inUse, setInUse] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [deletingKey, setDeletingKey] = useState('');

  const refresh = async () => {
    if (!accessToken) return;
    setBusy(true); setError('');
    try { setItems(await loadAdminMedia(accessToken)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  useEffect(() => { refresh(); }, [accessToken]);

  // Sunwings: saved folders, and which files the live site uses.
  useEffect(() => {
    if (!isSunwings || !accessToken) return;
    loadSunwingsSettings(accessToken)
      .then(settings => { try { setFolders(JSON.parse(settings?.media_folders || '{}') || {}); } catch { setFolders({}); } })
      .catch(() => {});
    loadMediaInUse(accessToken)
      .then(data => { if (data?.paths) setInUse({ paths: new Set(data.paths), complete: data.complete !== false }); })
      .catch(() => {});
  }, [isSunwings, accessToken]);

  const folderOf = item => folders[`${item.bucket}/${item.path}`] || guessFolder(item);
  const usedOf = item => (inUse ? inUse.paths.has(`${item.bucket}/${item.path}`) : null);

  const totals = useMemo(() => {
    const all = items.reduce((sum, item) => sum + sizeOf(item), 0);
    const unused = inUse ? items.filter(item => !item.protectedAsset && !usedOf(item)) : [];
    return { all, count: items.length, unusedCount: unused.length, unusedSize: unused.reduce((sum, item) => sum + sizeOf(item), 0) };
  }, [items, inUse]);

  const counts = useMemo(() => {
    const result = {};
    items.forEach(item => { const f = folderOf(item); result[f] = (result[f] || 0) + 1; });
    return result;
  }, [items, folders]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = !term ? items : items.filter(item => `${item.name || ''} ${item.url || ''} ${item.mediaType || ''} ${item.bucket || ''}`.toLowerCase().includes(term));
    if (pickTypes) list = list.filter(item => pickTypes.includes(item.mediaType || 'image'));
    if (folder === 'unused') list = list.filter(item => !item.protectedAsset && usedOf(item) === false);
    else if (folder !== 'all') list = list.filter(item => folderOf(item) === folder);
    const by = {
      newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      oldest: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      largest: (a, b) => sizeOf(b) - sizeOf(a),
      name: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
    }[sort];
    return [...list].sort(by);
  }, [items, q, sort, folder, folders, inUse]);

  const toggle = item => setSelected(current => {
    const next = new Set(current);
    const key = keyOf(item);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const selectedItems = items.filter(item => selected.has(keyOf(item)));
  const allShownSelected = filtered.length > 0 && filtered.every(item => selected.has(keyOf(item)));

  const copyUrl = async item => {
    const key = keyOf(item);
    try { await navigator.clipboard.writeText(item.url); }
    catch {
      const input = document.createElement('textarea');
      input.value = item.url; input.style.position = 'fixed'; input.style.opacity = '0';
      document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(current => current === key ? '' : current), 1800);
  };

  const deleteMany = async list => {
    const deletable = list.filter(item => !item.protectedAsset);
    if (!deletable.length) return;
    const used = deletable.filter(item => usedOf(item));
    const size = deletable.reduce((sum, item) => sum + sizeOf(item), 0);
    const warning = used.length ? `\n\nWARNING: ${used.length} of these ${used.length === 1 ? 'is' : 'are'} used on the live site and will show as broken images.` : '';
    const label = deletable.length === 1 ? `"${deletable[0].name}"` : `${deletable.length} files`;
    if (!window.confirm(`Permanently delete ${label}${isOwner ? ` (${formatBytes(size)})` : ''}? This can't be undone.${warning}`)) return;
    setError(''); setNotice('');
    let done = 0;
    for (const item of deletable) {
      setDeletingKey(keyOf(item));
      try {
        await deleteAdminMedia(accessToken, item);
        done += 1;
        setItems(current => current.filter(existing => keyOf(existing) !== keyOf(item)));
      } catch (err) {
        setError(`${item.name}: ${err.message}`);
        break;
      }
    }
    setDeletingKey('');
    setSelected(new Set());
    if (done) setNotice(`Deleted ${done} file${done === 1 ? '' : 's'}${isOwner ? `, freed ${formatBytes(deletable.slice(0, done).reduce((sum, item) => sum + sizeOf(item), 0))}` : ''}.`);
  };

  const moveTo = async (list, target) => {
    if (!isSunwings || !target) return;
    const next = { ...folders };
    list.forEach(item => { next[`${item.bucket}/${item.path}`] = target; });
    setFolders(next);
    setSelected(new Set());
    try {
      await saveSunwingsSettings(accessToken, { media_folders: JSON.stringify(next) });
      setNotice(`Moved ${list.length} file${list.length === 1 ? '' : 's'} to ${target}.`);
    } catch (err) { setError(err.message); }
  };

  const upload = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true); setError(''); setNotice('');
    let saved = 0;
    try {
      for (const original of files) {
        const type = String(original.type || '').toLowerCase();
        if (type.startsWith('image/')) {
          const { file, saved: less } = await shrinkImage(original);
          saved += less;
          await uploadBlogImage(accessToken, file);
        } else if (type.startsWith('video/')) await uploadSocialVideo(accessToken, original);
        else if (type.startsWith('audio/')) await uploadSocialAudio(accessToken, original);
        else throw new Error(`${original.name}: unsupported media type.`);
      }
      if (saved) setNotice(isOwner ? `Uploaded. Photos were shrunk to web size, saving ${formatBytes(saved)}.` : 'Uploaded.');
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); event.target.value = ''; }
  };

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Assets</p><h1>{onPick ? 'Choose an image' : 'Media'}</h1><p>{onPick ? 'Click a photo, or upload a new one (big photos are shrunk to web size).' : isSunwings ? 'Images and files for the Sunwings website. Big photos are shrunk to web size when you upload them.' : 'Shared Supabase media for blog articles and social campaigns. Store images, MP4 videos and music in one reusable library.'}</p></div>
      <div className="site-admin-actions">{!isSunwings && <Link className="site-admin-btn secondary" to="/admin/social-image"><WandSparkles size={15}/> Image Studio</Link>}<label className="site-admin-btn upload-button"><Upload size={15}/> {uploading ? 'Uploading…' : 'Upload Media'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,.mp4,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/x-m4a,audio/ogg,.mp3,.m4a,.wav,.aac,.ogg" multiple onChange={upload} disabled={uploading}/></label></div>
    </div>

    {isOwner && !onPick ? <div className="media-stats">
      <div><HardDrive size={18}/><span><b>{formatBytes(totals.all)}</b> used by {totals.count} file{totals.count === 1 ? '' : 's'}{isSunwings ? ' (Sunwings only)' : ''}</span></div>
      {inUse ? <button type="button" className={folder === 'unused' ? 'on' : ''} onClick={() => setFolder(folder === 'unused' ? 'all' : 'unused')}><b>{totals.unusedCount}</b> not used on the live site · {formatBytes(totals.unusedSize)} you could free</button> : null}
    </div> : null}

    {error && <div className="site-admin-alert error">{error}</div>}
    {notice && <div className="site-admin-alert success">{notice}</div>}

    <div className="media-folders">
      <button type="button" className={folder === 'all' ? 'on' : ''} onClick={() => setFolder('all')}>All <span>{items.length}</span></button>
      {FOLDERS.filter(name => counts[name]).map(name => <button type="button" key={name} className={folder === name ? 'on' : ''} onClick={() => setFolder(name)}>{name} <span>{counts[name]}</span></button>)}
      {inUse ? <button type="button" className={`unused ${folder === 'unused' ? 'on' : ''}`} onClick={() => setFolder('unused')}>Not used <span>{totals.unusedCount}</span></button> : null}
    </div>

    <div className="site-admin-toolbar media-toolbar">
      <label className="site-admin-search"><input value={q} onChange={event => setQ(event.target.value)} placeholder="Search images, videos or music"/></label>
      <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        {isOwner ? <option value="largest">Largest first</option> : null}
        <option value="name">Name</option>
      </select>
      {onPick ? null : <button type="button" className="site-admin-btn secondary small" onClick={() => setSelected(allShownSelected ? new Set() : new Set(filtered.map(keyOf)))}>{allShownSelected ? <CheckSquare size={14}/> : <Square size={14}/>} {allShownSelected ? 'Unselect all' : 'Select all shown'}</button>}
    </div>

    {selectedItems.length && !onPick ? <div className="media-bulk">
      <b>{selectedItems.length} selected{isOwner ? ` · ${formatBytes(selectedItems.reduce((sum, item) => sum + sizeOf(item), 0))}` : ''}</b>
      {isSunwings ? <label><FolderInput size={14}/><select value="" onChange={event => moveTo(selectedItems, event.target.value)}><option value="">Move to folder…</option>{FOLDERS.map(name => <option key={name} value={name}>{name}</option>)}</select></label> : null}
      <button type="button" className="site-admin-btn secondary small danger" onClick={() => deleteMany(selectedItems)}><Trash2 size={14}/> Delete selected</button>
      <button type="button" className="site-admin-btn secondary small" onClick={() => setSelected(new Set())}>Clear</button>
    </div> : null}

    <div className="site-admin-media-grid">
      {busy && !items.length ? <div className="site-admin-card site-admin-empty large"><Image size={30}/><h2>Loading media…</h2></div> : filtered.map(item => {
        const type = item.mediaType || 'image';
        const key = keyOf(item);
        const used = usedOf(item);
        return <div className={`site-admin-card site-admin-media-card ${selected.has(key) ? 'is-selected' : ''}`} key={key}>
          <div className="site-admin-media-image">
            {onPick ? null : <button type="button" className="media-check" onClick={() => toggle(item)} aria-label={selected.has(key) ? 'Unselect' : 'Select'}>{selected.has(key) ? <CheckSquare size={18}/> : <Square size={18}/>}</button>}
            {used !== null && !item.protectedAsset ? <span className={`media-use ${used ? 'yes' : 'no'}`}>{used ? 'In use' : 'Not used'}</span> : null}
            {type === 'video'
              ? <video src={item.url} controls playsInline preload="metadata"/>
              : type === 'audio'
                ? <div style={{ width: '100%', padding: 18, display: 'grid', gap: 12, justifyItems: 'center' }}><Music2 size={28}/><audio controls preload="metadata" src={item.url} style={{ width: '100%' }}/></div>
                : <>
                  <img src={previewUrl(item)} alt={item.name || 'Uploaded media'} loading="lazy" decoding="async" onClick={() => setViewing(item)} style={{ cursor: 'zoom-in' }}/>
                  <button type="button" className="media-zoom" onClick={() => setViewing(item)} aria-label="View big"><Maximize2 size={15}/></button>
                </>}
          </div>
          <div className="site-admin-media-copy">
            <strong title={item.name}>{item.name || (type === 'audio' ? 'Music' : type === 'video' ? 'Video' : 'Image')}</strong>
            <small>{type === 'video' ? <><Video size={12}/> Video</> : type === 'audio' ? <><Music2 size={12}/> Music</> : <><Image size={12}/> Image</>}{isOwner ? <> · <b className={sizeOf(item) > 1024 * 1024 ? 'media-big' : ''}>{formatBytes(sizeOf(item))}</b></> : null}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}</small>
            {isSunwings ? <small className="media-by">{item.uploadedBy ? `Uploaded by ${item.uploadedBy}` : 'Uploader not recorded (older file)'}</small> : null}
            {isSunwings ? <select className="media-folder-select" value={folderOf(item)} onChange={event => moveTo([item], event.target.value)} aria-label="Folder">{FOLDERS.map(name => <option key={name} value={name}>{name}</option>)}</select> : null}
            {onPick ? null : <div className="site-admin-media-url-row">
              <input className="site-admin-media-url" value={item.url || ''} readOnly aria-label={`Public URL for ${item.name || 'media'}`} onFocus={event => event.target.select()}/>
            </div>}
            {onPick ? <button type="button" className="site-admin-btn media-use-btn" onClick={() => onPick(item)}><Check size={15}/> Use this image</button> : null}
            {onPick ? null : <div className="site-admin-media-actions">
              <button type="button" className="site-admin-media-action" onClick={() => copyUrl(item)} disabled={!item.url}>
                {copiedKey === key ? <Check size={14}/> : <Copy size={14}/>}
                {copiedKey === key ? 'Copied' : 'Copy URL'}
              </button>
              <a className="site-admin-media-action" href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open</a>
              <button
                type="button"
                className="site-admin-media-action danger"
                onClick={() => deleteMany([item])}
                disabled={item.protectedAsset || deletingKey === key}
                title={item.protectedAsset ? 'Website page assets are protected from deletion.' : ''}
              >
                <Trash2 size={14}/> {item.protectedAsset ? 'Protected' : deletingKey === key ? 'Deleting…' : 'Delete'}
              </button>
            </div>}
          </div>
        </div>;
      })}
      {viewing ? <div className="media-viewer" role="dialog" aria-label="Photo" onClick={() => setViewing(null)}>
        <div className="media-viewer-card" onClick={event => event.stopPropagation()}>
          <button type="button" className="media-viewer-close" onClick={() => setViewing(null)} aria-label="Close"><X size={20}/></button>
          <img src={viewing.url} alt={viewing.name || ''}/>
          <div className="media-viewer-bar">
            <span title={viewing.name}>{viewing.name}</span>
            {onPick ? <button type="button" className="site-admin-btn" onClick={() => { const item = viewing; setViewing(null); onPick(item); }}><Check size={15}/> Use this image</button>
              : <a className="site-admin-btn secondary" href={viewing.url} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Open full size</a>}
          </div>
        </div>
      </div> : null}
      {!busy && !filtered.length && <div className="site-admin-card site-admin-empty large"><Image size={30}/><h2>No media found</h2><p>{folder === 'unused' ? 'Everything here is used on the live site.' : 'Upload an image, MP4 video or audio file and it will appear here for reuse.'}</p></div>}
    </div>
  </>;
}
