import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Image, Images, Link2, List, Plus, Quote, Save, Trash2, Upload, Video } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { getAdminSiteKey, uploadWorkImage, uploadWorkVideo } from '../../services/siteAdminService';
import {
  WORK_STATUS,
  createEmptyWorkPost,
  deleteAdminWorkPost,
  loadAdminWorkPost,
  loadAdminWorkPosts,
  saveAdminWorkPost,
  slugifyWork,
} from './workPostStore';
import './workPosts.css';

function tagsFrom(value) {
  return String(value || '').split(',').map(tag => tag.trim()).filter(Boolean);
}

function youtubeId(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    const direct = url.searchParams.get('v');
    if (direct) return direct;
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex(part => ['embed', 'shorts', 'live'].includes(part));
    if (marker >= 0) return parts[marker + 1] || '';
  } catch {}
  return /^[A-Za-z0-9_-]{6,}$/.test(raw) ? raw : '';
}

function escAttr(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export default function WorkPostsAdmin() {
  const siteKey = getAdminSiteKey();
  const { accessToken } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState(() => createEmptyWorkPost());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const editorRef = useRef(null);
  const bodyHtmlRef = useRef('');
  const inlineImageRef = useRef(null);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);
  const projectLogoRef = useRef(null);

  const sorted = useMemo(
    () => [...posts].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    [posts],
  );

  const refresh = async () => {
    if (!accessToken) return [];
    const rows = await loadAdminWorkPosts(accessToken);
    setPosts(rows);
    return rows;
  };

  useEffect(() => {
    if (!accessToken || siteKey !== 'justindematteis') return;
    setBusy(true);
    refresh().catch(err => setError(err.message)).finally(() => setBusy(false));
  }, [accessToken, siteKey]);

  useEffect(() => {
    if (!editing || !accessToken || siteKey !== 'justindematteis') return;
    setError('');
    setMessage('');
    if (id === 'new') {
      const fresh = createEmptyWorkPost();
      setDraft(fresh);
      bodyHtmlRef.current = '';
      if (editorRef.current) editorRef.current.innerHTML = '';
      return;
    }
    loadAdminWorkPost(accessToken, id)
      .then(post => {
        setDraft(post);
        bodyHtmlRef.current = post.bodyHtml || '';
        requestAnimationFrame(() => {
          if (editorRef.current) editorRef.current.innerHTML = post.bodyHtml || '';
        });
      })
      .catch(err => setError(err.message));
  }, [editing, id, accessToken, siteKey]);

  if (siteKey !== 'justindematteis') {
    return <div className="site-admin-card site-admin-empty">
      <p>Work Posts belong to the JustinDeMatteis.com portfolio. Switch the website selector to JustinDeMatteis.com to manage them.</p>
    </div>;
  }

  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));

  const runCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    bodyHtmlRef.current = editorRef.current?.innerHTML || bodyHtmlRef.current;
  };

  const formatBlock = tag => runCommand('formatBlock', tag);

  const insertHtml = html => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    if (selection && selection.rangeCount && anchor && editor.contains(anchor)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const fragment = range.createContextualFragment(html);
      const last = fragment.lastChild;
      range.insertNode(fragment);
      if (last) {
        range.setStartAfter(last);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      editor.insertAdjacentHTML('beforeend', html);
    }

    bodyHtmlRef.current = editor.innerHTML;
    setMessage('Content inserted. Save the Work Post when you are ready.');
  };

  const addLink = () => {
    const url = window.prompt('Paste the link URL');
    if (!url) return;
    runCommand('createLink', url.trim());
  };

  const addYouTube = () => {
    const raw = window.prompt('Paste a YouTube URL');
    const videoId = youtubeId(raw || '');
    if (!videoId) {
      setError('That does not look like a valid YouTube URL.');
      return;
    }
    insertHtml(`<div class="work-post-video"><iframe src="https://www.youtube.com/embed/${escAttr(videoId)}" title="Project video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p></p>`);
  };

  const uploadProjectLogo = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading('logo'); setError('');
    try {
      const url = await uploadWorkImage(accessToken, file);
      update('featuredImage', url);
      setMessage('Project logo uploaded. Save the Work Post to keep it.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const uploadInlineImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading('image'); setError('');
    try {
      const url = await uploadWorkImage(accessToken, file);
      insertHtml(`<figure><img src="${escAttr(url)}" alt=""><figcaption></figcaption></figure><p></p>`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const uploadGallery = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading('gallery'); setError('');
    try {
      const urls = [];
      for (const file of files) urls.push(await uploadWorkImage(accessToken, file));
      const figures = urls.map(url => `<figure><img src="${escAttr(url)}" alt=""><figcaption></figcaption></figure>`).join('');
      insertHtml(`<div class="work-post-gallery">${figures}</div><p></p>`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const uploadVideo = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading('video'); setError('');
    try {
      const url = await uploadWorkVideo(accessToken, file);
      insertHtml(`<video controls preload="metadata" src="${escAttr(url)}"></video><p></p>`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const save = async event => {
    event.preventDefault();
    if (!draft.title.trim()) return setError('Add the Work Post title.');
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await saveAdminWorkPost(accessToken, {
        ...draft,
        slug: draft.slug || slugifyWork(draft.title),
        bodyHtml: editorRef.current?.innerHTML || bodyHtmlRef.current || draft.bodyHtml,
      });
      setDraft(saved);
      bodyHtmlRef.current = saved.bodyHtml || '';
      setMessage('Work Post saved.');
      await refresh();
      if (id === 'new') navigate(`/admin/work-posts/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async post => {
    if (!post?.id || !window.confirm(`Delete "${post.title}"?`)) return;
    setBusy(true); setError('');
    try {
      await deleteAdminWorkPost(accessToken, post.id);
      await refresh();
      navigate('/admin/work-posts');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return <>
      <div className="site-admin-page-head">
        <div>
          <p className="site-admin-eyebrow">Portfolio Content</p>
          <h1>Work Posts</h1>
          <p>Each project has one permanent case-study post that can keep growing over time.</p>
        </div>
        <Link className="site-admin-btn" to="/admin/work-posts/new"><Plus size={15}/> New Work Post</Link>
      </div>
      {error && <div className="site-admin-alert error">{error}</div>}
      <div className="site-admin-card site-admin-table">
        <div className="site-admin-table-head work-post-list"><span>Project</span><span>Type</span><span>Status</span><span>Updated</span><span>Actions</span></div>
        {busy && !posts.length ? <div className="site-admin-empty">Loading Work Posts…</div> : sorted.map(post => <div className="site-admin-table-row work-post-list" key={post.id}>
          <div><strong>{post.title}</strong><small>/work/{post.slug}</small></div>
          <span>{post.workType || '—'}</span>
          <span className={`site-admin-status ${post.status}`}>{post.status}</span>
          <span>{post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : '—'}</span>
          <div className="site-admin-actions right">
            <Link className="site-admin-btn secondary small" to={`/admin/work-posts/${post.id}`}>Edit</Link>
            {post.slug && <a className="site-admin-btn secondary small" href={`https://www.justindematteis.com/work/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View</a>}
          </div>
        </div>)}
        {!busy && !posts.length && <div className="site-admin-empty">No Work Posts yet.</div>}
      </div>
    </>;
  }

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Portfolio · Work Post</p>
        <h1>{id === 'new' ? 'New Work Post' : 'Edit Work Post'}</h1>
        <p>Write the case study as one article. Add images, galleries, YouTube, uploaded video and new sections whenever you need them.</p>
      </div>
      <div className="site-admin-actions">
        <Link className="site-admin-btn secondary" to="/admin/work-posts">← Work Posts</Link>
        {draft.slug && <a className="site-admin-btn secondary" href={`https://www.justindematteis.com/work/${draft.slug}`} target="_blank" rel="noreferrer">Preview <ExternalLink size={13}/></a>}
        <button className="site-admin-btn" form="work-post-form" type="submit" disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save Work Post'}</button>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <form id="work-post-form" className="work-post-editor-grid" onSubmit={save}>
      <section className="site-admin-card work-post-editor-main">
        <h2>Project information</h2>
        <div className="site-admin-form work-post-fields">
          <label className="wide">Work post title<input value={draft.title} onChange={event => {
            const title = event.target.value;
            setDraft(current => ({ ...current, title, slug: current.id ? current.slug : slugifyWork(title) }));
          }}/></label>
          <label>URL slug<input value={draft.slug} onChange={event => update('slug', slugifyWork(event.target.value))}/><small>/work/{draft.slug || 'project-slug'}</small></label>
          <label>Work type<input value={draft.workType} onChange={event => update('workType', event.target.value)} placeholder="Product Development"/></label>
          <label>Company / project<input value={draft.company} onChange={event => update('company', event.target.value)}/></label>
          <label>Platform<input value={draft.platform} onChange={event => update('platform', event.target.value)} placeholder="Shopify · React · Supabase"/></label>
          <label className="wide">My role<input value={draft.role} onChange={event => update('role', event.target.value)}/></label>
          <label className="wide">Built for<input value={draft.audience} onChange={event => update('audience', event.target.value)}/></label>
          <label className="wide">Short summary<textarea rows="4" value={draft.excerpt} onChange={event => update('excerpt', event.target.value)}/></label>
        </div>

        <div className="work-post-logo-field">
          <div className="work-post-logo-preview">
            {draft.featuredImage ? <img src={draft.featuredImage} alt="Project logo preview"/> : <><Image size={24}/><span>No logo</span></>}
          </div>
          <div>
            <strong>Project logo</strong>
            <p>Small logo shown in the Work Post hero.</p>
            <div className="site-admin-actions">
              <button className="site-admin-btn secondary small" type="button" onClick={() => projectLogoRef.current?.click()} disabled={uploading === 'logo'}><Upload size={13}/>{uploading === 'logo' ? 'Uploading…' : 'Upload Logo'}</button>
              {draft.featuredImage && <button className="site-admin-btn secondary small" type="button" onClick={() => update('featuredImage', '')}>Remove</button>}
            </div>
            <input ref={projectLogoRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadProjectLogo}/>
          </div>
        </div>

        <div className="work-post-story-head">
          <div><h2>Work story</h2><p>One article. Add to it whenever the project changes.</p></div>
        </div>

        <div className="work-post-rich-editor">
          <div className="work-post-toolbar">
            <button type="button" onClick={() => formatBlock('h2')}>H2</button>
            <button type="button" onClick={() => formatBlock('h3')}>H3</button>
            <button type="button" onClick={() => formatBlock('p')}>Paragraph</button>
            <button type="button" onClick={() => runCommand('bold')}><strong>B</strong></button>
            <button type="button" onClick={addLink}><Link2 size={14}/> Link</button>
            <button type="button" onClick={() => runCommand('insertUnorderedList')}><List size={14}/> Bullets</button>
            <button type="button" onClick={() => formatBlock('blockquote')}><Quote size={14}/> Quote</button>
            <button type="button" onClick={() => inlineImageRef.current?.click()}><Image size={14}/> {uploading === 'image' ? 'Uploading…' : 'Image'}</button>
            <button type="button" onClick={() => galleryRef.current?.click()}><Images size={14}/> {uploading === 'gallery' ? 'Uploading…' : 'Gallery'}</button>
            <button type="button" onClick={addYouTube}><Video size={14}/> YouTube</button>
            <button type="button" onClick={() => videoRef.current?.click()}><Upload size={14}/> {uploading === 'video' ? 'Uploading…' : 'Video File'}</button>
            <input ref={inlineImageRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadInlineImage}/>
            <input ref={galleryRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadGallery}/>
            <input ref={videoRef} hidden type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/webm" onChange={uploadVideo}/>
          </div>
          <div
            ref={editorRef}
            className="work-post-content-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={event => { bodyHtmlRef.current = event.currentTarget.innerHTML; }}
          />
        </div>
      </section>

      <aside className="work-post-editor-side">
        <div className="site-admin-card site-admin-side-card">
          <h2>Publishing</h2>
          <label>Status<select value={draft.status} onChange={event => update('status', event.target.value)}>
            <option value={WORK_STATUS.DRAFT}>Draft</option>
            <option value={WORK_STATUS.PUBLISHED}>Published</option>
          </select></label>
          {draft.publishedAt && <p>Published {new Date(draft.publishedAt).toLocaleDateString()}</p>}
        </div>

        <div className="site-admin-card site-admin-side-card">
          <h2>Project details</h2>
          <label>Technology tags<textarea rows="5" value={(draft.tags || []).join(', ')} onChange={event => update('tags', tagsFrom(event.target.value))}/></label>
          <label>Primary project URL<input value={draft.projectUrl} onChange={event => update('projectUrl', event.target.value)}/></label>
          <label>Secondary URL<input value={draft.secondaryUrl} onChange={event => update('secondaryUrl', event.target.value)} placeholder="YouTube, GitHub, demo…"/></label>
        </div>

        <div className="site-admin-card site-admin-side-card">
          <h2>SEO</h2>
          <label>SEO title<input value={draft.seoTitle} onChange={event => update('seoTitle', event.target.value)}/></label>
          <label>Meta description<textarea rows="4" value={draft.seoDescription} onChange={event => update('seoDescription', event.target.value)}/></label>
          <label>Social image URL<input value={draft.ogImage} onChange={event => update('ogImage', event.target.value)}/></label>
          <div className="work-post-seo-preview">
            <small>justindematteis.com/work/{draft.slug || 'project'}</small>
            <strong>{draft.seoTitle || draft.title || 'Work Post title'}</strong>
            <p>{draft.seoDescription || draft.excerpt || 'Meta description preview.'}</p>
          </div>
        </div>

        {draft.id && <div className="site-admin-card site-admin-side-card danger-zone">
          <h2>Danger Zone</h2>
          <p>Delete this Work Post permanently.</p>
          <button className="site-admin-btn danger small" type="button" onClick={() => remove(draft)} disabled={busy}><Trash2 size={13}/> Delete Work Post</button>
        </div>}
      </aside>
    </form>
  </>;
}
