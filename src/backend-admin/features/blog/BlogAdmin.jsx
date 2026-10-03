import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Image, Plus, Save, Trash2 } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { BLOG_STATUS, createEmptyPost, deleteAdminBlogPost, loadAdminBlogPosts, saveAdminBlogPost, slugify } from './blogStore';
import { getAdminSiteKey, loadAdminMedia, uploadBlogImage } from '../../services/siteAdminService';

function toTags(value) {
  return String(value || '').split(',').map(tag => tag.trim()).filter(Boolean);
}

export default function BlogAdmin() {
  const { user, accessToken } = useAuth();
  const siteKey = getAdminSiteKey();
  const liveBaseUrl = siteKey === 'justindematteis'
    ? 'https://www.justindematteis.com'
    : siteKey === 'sunwings'
      ? (import.meta.env.VITE_SUNWINGS_PREVIEW_URL || 'https://sunwingstransport.ca')
      : 'https://www.justconsignin.com';
  const blogAdminBase = siteKey === 'sunwings' ? '/admin/sunwings/blog' : '/admin/blog';
  const { id } = useParams();
  const navigate = useNavigate();
  const adminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  const isAdmin = Boolean(user?.isAdmin) || adminEmails.includes(String(user?.email || '').toLowerCase());
  const editing = Boolean(id);
  const isSunwings = siteKey === 'sunwings';
  const contentLabel = isSunwings ? 'Moving Tips Posts' : 'Blog Posts';
  const singularLabel = isSunwings ? 'Moving Tip' : 'Article';
  const [posts, setPosts] = useState([]);
  const [media, setMedia] = useState([]);
  const [draft, setDraft] = useState(() => createEmptyPost());
  const [q, setQ] = useState('');
  const [mediaQ, setMediaQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sorted = useMemo(() => [...posts].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)), [posts]);
  const filtered = useMemo(() => sorted.filter(post => {
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    const term = q.trim().toLowerCase();
    const matchesTerm = !term || `${post.title} ${post.slug} ${post.category} ${(post.tags || []).join(' ')}`.toLowerCase().includes(term);
    return matchesStatus && matchesTerm;
  }), [sorted, q, statusFilter]);

  const filteredMedia = useMemo(() => {
    const term = mediaQ.trim().toLowerCase();
    return !term ? media : media.filter(item => `${item.name || ''} ${item.url || ''}`.toLowerCase().includes(term));
  }, [media, mediaQ]);

  const refresh = async () => {
    if (!accessToken) return [];
    const rows = await loadAdminBlogPosts(accessToken);
    setPosts(rows);
    return rows;
  };

  const refreshMedia = async () => {
    if (!accessToken) return [];
    setMediaBusy(true);
    try {
      const rows = await loadAdminMedia(accessToken);
      setMedia(rows);
      return rows;
    } finally {
      setMediaBusy(false);
    }
  };

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    setBusy(true); setError('');
    refresh().catch(err => setError(err.message)).finally(() => setBusy(false));
  }, [isAdmin, accessToken]);

  useEffect(() => {
    if (!isAdmin || !accessToken || !editing) return;
    refreshMedia().catch(err => setError(err.message));
  }, [isAdmin, accessToken, editing]);

  useEffect(() => {
    if (!editing) return;
    setMessage(''); setError('');
    if (id === 'new') { setDraft(createEmptyPost()); return; }
    const current = posts.find(post => post.id === id);
    if (current) setDraft({ ...current, tags: current.tags || [] });
  }, [editing, id, posts]);

  if (!isAdmin) return <Navigate to="/admin-login" replace state={{ from: blogAdminBase }} />;

  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));

  const save = async event => {
    event.preventDefault();
    if (!draft.title.trim()) return setError('Add a title first.');
    setBusy(true); setError(''); setMessage('');
    try {
      await saveAdminBlogPost(accessToken, {
        ...draft,
        slug: draft.slug || slugify(draft.title),
        tags: Array.isArray(draft.tags) ? draft.tags : toTags(draft.tags),
      });
      await refresh();
      navigate(blogAdminBase);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const remove = async post => {
    if (!post?.id || !window.confirm(`Delete \"${post.title || 'this article'}\"?`)) return;
    setBusy(true); setError('');
    try {
      await deleteAdminBlogPost(accessToken, post.id);
      await refresh();
      if (editing) navigate(blogAdminBase);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(''); setMessage('');
    try {
      const url = await uploadBlogImage(accessToken, file);
      if (!url) throw new Error('Supabase did not return an image URL.');
      update('featuredImage', url);
      await refreshMedia();
      setMessage('Image uploaded to Supabase Media and selected for this article. Save the article to keep it attached.');
    } catch (err) { setError(err.message); }
    finally { setUploading(false); event.target.value = ''; }
  };

  const chooseMedia = item => {
    if (!item?.url) return;
    update('featuredImage', item.url);
    setMessage('Supabase Media image selected. Save the article to keep this change.');
    setError('');
  };

  if (editing) return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">{isSunwings ? 'Moving Tips Editor' : 'Blog Editor'}</p><h1>{id === 'new' ? `New ${singularLabel}` : `Edit ${singularLabel}`}</h1><p>Save drafts or publish articles without changing the public URL unless you intentionally change the slug.</p></div>
      <div className="site-admin-actions"><Link className="site-admin-btn secondary" to={blogAdminBase}>← {contentLabel}</Link><button className="site-admin-btn" type="submit" form="blog-editor-form" disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save'}</button></div>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}
    <div className="site-admin-editor-grid">
      <form id="blog-editor-form" className="site-admin-card site-admin-form" onSubmit={save}>
        <label className="wide">Article title<input value={draft.title} onChange={event => { const title = event.target.value; setDraft(current => ({ ...current, title, slug: current.id ? current.slug : slugify(title) })); }} placeholder="Article title" required/></label>
        <label className="wide">URL slug<input value={draft.slug} onChange={event => update('slug', slugify(event.target.value))} placeholder="article-url-slug"/><small>Public URL: /blog/{draft.slug || 'article-slug'}</small></label>
        <label className="wide">Excerpt<textarea rows="4" value={draft.excerpt} onChange={event => update('excerpt', event.target.value)} placeholder="Short summary used on the blog card."/></label>
        {isSunwings
          ? <label>Category<select value={draft.category || 'Guides'} onChange={event => update('category', event.target.value)}>
              {['Pricing','Guides','Delivery','Business'].map(category => <option value={category} key={category}>{category}</option>)}
            </select></label>
          : <label>Category<input value={draft.category} onChange={event => update('category', event.target.value)}/></label>}
        <label>Tags<input value={(draft.tags || []).join(', ')} onChange={event => update('tags', toTags(event.target.value))} placeholder={isSunwings ? 'Toronto movers, condo moving, furniture delivery' : 'Shopify, POS, consignors'}/></label>

        <div className="site-admin-upload wide">
          <div className="site-admin-image-preview">{draft.featuredImage ? <img src={draft.featuredImage} alt="Featured preview"/> : <><Image size={24}/><span>No featured image</span></>}</div>
          <div>
            <strong>Featured image</strong>
            <p>Upload a new image to Supabase Storage or choose one already in the shared Media Library. New posts start with no image selected.</p>
            <div className="site-admin-actions">
              <label className="site-admin-btn secondary upload-button">{uploading ? 'Uploading to Supabase…' : 'Upload New'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading}/></label>
              {draft.featuredImage && <button className="site-admin-btn secondary small" type="button" onClick={() => { update('featuredImage', ''); setMessage('Featured image removed. Save the article to keep this change.'); }}>Remove Image</button>}
            </div>
          </div>
        </div>

        <div className="wide">
          <div className="site-admin-toolbar">
            <label className="site-admin-search"><input value={mediaQ} onChange={event => setMediaQ(event.target.value)} placeholder="Search Supabase Media"/></label>
            <button className="site-admin-btn secondary small" type="button" onClick={() => refreshMedia().catch(err => setError(err.message))} disabled={mediaBusy}>{mediaBusy ? 'Loading…' : 'Refresh Media'}</button>
          </div>
          <div className="site-admin-media-grid">
            {mediaBusy && !media.length ? <div className="site-admin-card site-admin-empty"><Image size={24}/><p>Loading Supabase Media…</p></div> : filteredMedia.map(item => {
              const selected = draft.featuredImage === item.url;
              return <div className="site-admin-card site-admin-media-card" key={item.path || item.url}>
                <div className="site-admin-media-image"><img src={item.url} alt={item.name || 'Supabase media'}/></div>
                <div className="site-admin-media-copy">
                  <strong title={item.name}>{item.name || 'Image'}</strong>
                  <small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Supabase Storage'}</small>
                  <button className={`site-admin-btn ${selected ? '' : 'secondary'} small`} type="button" onClick={() => chooseMedia(item)}>{selected ? <><Check size={13}/> Selected</> : 'Use Image'}</button>
                </div>
              </div>;
            })}
            {!mediaBusy && !filteredMedia.length && <div className="site-admin-card site-admin-empty"><Image size={24}/><p>No Supabase images found.</p></div>}
          </div>
        </div>

        <label className="wide">SEO title<input value={draft.seoTitle} onChange={event => update('seoTitle', event.target.value)} placeholder="Leave blank to use the article title"/></label>
        <label className="wide">Meta description<textarea rows="3" value={draft.seoDescription} onChange={event => update('seoDescription', event.target.value)}/></label>
        <label className="wide">Article body<textarea rows="20" value={draft.body} onChange={event => update('body', event.target.value)} placeholder={isSunwings ? 'Write the article here. Use ## for main section headings, ### for subheadings, and - for bullet points.' : 'Write the article here. Separate paragraphs with a blank line.'}/>{isSunwings && <small>Sunwings turns ## headings into the article’s “On this page” table of contents automatically.</small>}</label>
      </form>
      <aside>
        <div className="site-admin-card site-admin-side-card"><h2>Publishing</h2><label>Status<select value={draft.status} onChange={event => update('status', event.target.value)}><option value={BLOG_STATUS.DRAFT}>Draft</option><option value={BLOG_STATUS.PUBLISHED}>Published</option></select></label>{draft.publishedAt && <p>Published {new Date(draft.publishedAt).toLocaleDateString()}</p>}</div>
        <div className="site-admin-card site-admin-side-card"><h2>Live URL</h2><p>/blog/{draft.slug || 'article-slug'}</p>{draft.slug && <a className="site-admin-btn secondary small" href={`${liveBaseUrl}/blog/${draft.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View Live</a>}</div>
        {draft.id && <div className="site-admin-card site-admin-side-card danger-zone"><h2>Danger Zone</h2><p>Delete this article permanently.</p><button className="site-admin-btn danger small" type="button" onClick={() => remove(draft)} disabled={busy}><Trash2 size={13}/> Delete Article</button></div>}
      </aside>
    </div>
  </>;

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Content</p><h1>{contentLabel}</h1><p>{isSunwings ? 'Each Moving Tip is its own post. The main Moving Tips page pulls published posts automatically.' : 'Every article is listed here first. Open one only when you want to edit it.'}</p></div>
      <Link className="site-admin-btn" to={`${blogAdminBase}/new`}><Plus size={15}/> New {singularLabel}</Link>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    <div className="site-admin-toolbar"><label className="site-admin-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder={isSunwings ? 'Search Moving Tips' : 'Search articles'}/></label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></div>
    <div className="site-admin-card site-admin-table">
      <div className="site-admin-table-head blogs"><span>Image</span><span>Article</span><span>Status</span><span>Published</span><span>Actions</span></div>
      {busy && !posts.length ? <div className="site-admin-empty">Loading articles…</div> : filtered.map(post => <div className="site-admin-table-row blogs" key={post.id}>
        <div className="site-admin-blog-thumb">{post.featuredImage ? <img src={post.featuredImage} alt=""/> : <Image size={20}/>}</div>
        <div><strong>{post.title || 'Untitled article'}</strong><small>/blog/{post.slug || 'no-slug'}</small></div>
        <span className={`site-admin-status ${post.status}`}>{post.status}</span>
        <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}</span>
        <div className="site-admin-actions right"><Link className="site-admin-btn secondary small" to={`${blogAdminBase}/${post.id}`}>Edit</Link>{post.slug && <a className="site-admin-btn secondary small" href={`${liveBaseUrl}/blog/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View</a>}<button className="site-admin-btn danger small" type="button" onClick={() => remove(post)} disabled={busy}><Trash2 size={13}/></button></div>
      </div>)}
      {!busy && !filtered.length && <div className="site-admin-empty">{isSunwings ? 'No Moving Tips found.' : 'No articles found.'}</div>}
    </div>
  </>;
}
