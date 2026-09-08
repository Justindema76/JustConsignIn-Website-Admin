import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image, Plus, Save, Trash2 } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './AdminAuthContext';
import { BLOG_STATUS, createEmptyPost, deleteAdminBlogPost, loadAdminBlogPosts, saveAdminBlogPost, slugify } from './blogStore';
import { uploadBlogImage } from './siteAdminService';

function toTags(value) {
  return String(value || '').split(',').map(tag => tag.trim()).filter(Boolean);
}

export default function BlogAdmin() {
  const { user, accessToken } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const adminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  const isAdmin = Boolean(user?.isAdmin) || adminEmails.includes(String(user?.email || '').toLowerCase());
  const editing = Boolean(id);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState(() => createEmptyPost());
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sorted = useMemo(() => [...posts].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)), [posts]);
  const filtered = useMemo(() => sorted.filter(post => {
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    const term = q.trim().toLowerCase();
    const matchesTerm = !term || `${post.title} ${post.slug} ${post.category} ${(post.tags || []).join(' ')}`.toLowerCase().includes(term);
    return matchesStatus && matchesTerm;
  }), [sorted, q, statusFilter]);

  const refresh = async () => {
    if (!accessToken) return [];
    const rows = await loadAdminBlogPosts(accessToken);
    setPosts(rows);
    return rows;
  };

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    setBusy(true); setError('');
    refresh().catch(err => setError(err.message)).finally(() => setBusy(false));
  }, [isAdmin, accessToken]);

  useEffect(() => {
    if (!editing) return;
    setMessage(''); setError('');
    if (id === 'new') { setDraft(createEmptyPost()); return; }
    const current = posts.find(post => post.id === id);
    if (current) setDraft({ ...current, tags: current.tags || [] });
  }, [editing, id, posts]);

  if (!isAdmin) return <Navigate to="/admin-login" replace state={{ from: '/admin/blog' }} />;

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
      navigate('/admin/blog');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const remove = async post => {
    if (!post?.id || !window.confirm(`Delete \"${post.title || 'this article'}\"?`)) return;
    setBusy(true); setError('');
    try {
      await deleteAdminBlogPost(accessToken, post.id);
      await refresh();
      if (editing) navigate('/admin/blog');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError(''); setMessage('');
    try {
      const url = await uploadBlogImage(accessToken, file);
      update('featuredImage', url);
      setMessage('Image uploaded. Save the article to keep it attached to this post.');
    } catch (err) { setError(err.message); }
    finally { setUploading(false); event.target.value = ''; }
  };

  if (editing) return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Blog Editor</p><h1>{id === 'new' ? 'New Article' : 'Edit Article'}</h1><p>Save drafts or publish articles without changing the public URL unless you intentionally change the slug.</p></div>
      <div className="site-admin-actions"><Link className="site-admin-btn secondary" to="/admin/blog">← Blog Posts</Link><button className="site-admin-btn" type="submit" form="blog-editor-form" disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save'}</button></div>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}
    <div className="site-admin-editor-grid">
      <form id="blog-editor-form" className="site-admin-card site-admin-form" onSubmit={save}>
        <label className="wide">Article title<input value={draft.title} onChange={event => { const title = event.target.value; setDraft(current => ({ ...current, title, slug: current.id ? current.slug : slugify(title) })); }} placeholder="Article title" required/></label>
        <label className="wide">URL slug<input value={draft.slug} onChange={event => update('slug', slugify(event.target.value))} placeholder="article-url-slug"/><small>Public URL: /blog/{draft.slug || 'article-slug'}</small></label>
        <label className="wide">Excerpt<textarea rows="4" value={draft.excerpt} onChange={event => update('excerpt', event.target.value)} placeholder="Short summary used on the blog card."/></label>
        <label>Category<input value={draft.category} onChange={event => update('category', event.target.value)}/></label>
        <label>Tags<input value={(draft.tags || []).join(', ')} onChange={event => update('tags', toTags(event.target.value))} placeholder="Shopify, POS, consignors"/></label>
        <div className="site-admin-upload wide">
          <div className="site-admin-image-preview">{draft.featuredImage ? <img src={draft.featuredImage} alt="Featured preview"/> : <><Image size={24}/><span>No featured image</span></>}</div>
          <div><strong>Featured image</strong><p>Upload a JPG, PNG, WebP, or GIF up to 2 MB. It goes into the shared blog image storage automatically.</p><label className="site-admin-btn secondary upload-button">{uploading ? 'Uploading…' : 'Choose Image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading}/></label>{draft.featuredImage && <button className="site-admin-text-button" type="button" onClick={() => update('featuredImage', '')}>Remove image</button>}</div>
        </div>
        <label className="wide">SEO title<input value={draft.seoTitle} onChange={event => update('seoTitle', event.target.value)} placeholder="Leave blank to use the article title"/></label>
        <label className="wide">Meta description<textarea rows="3" value={draft.seoDescription} onChange={event => update('seoDescription', event.target.value)}/></label>
        <label className="wide">Article body<textarea rows="20" value={draft.body} onChange={event => update('body', event.target.value)} placeholder="Write the article here. Separate paragraphs with a blank line."/></label>
      </form>
      <aside>
        <div className="site-admin-card site-admin-side-card"><h2>Publishing</h2><label>Status<select value={draft.status} onChange={event => update('status', event.target.value)}><option value={BLOG_STATUS.DRAFT}>Draft</option><option value={BLOG_STATUS.PUBLISHED}>Published</option></select></label>{draft.publishedAt && <p>Published {new Date(draft.publishedAt).toLocaleDateString()}</p>}</div>
        <div className="site-admin-card site-admin-side-card"><h2>Live URL</h2><p>/blog/{draft.slug || 'article-slug'}</p>{draft.slug && <a className="site-admin-btn secondary small" href={`https://www.justconsignin.com/blog/${draft.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View Live</a>}</div>
        {draft.id && <div className="site-admin-card site-admin-side-card danger-zone"><h2>Danger Zone</h2><p>Delete this article permanently.</p><button className="site-admin-btn danger small" type="button" onClick={() => remove(draft)} disabled={busy}><Trash2 size={13}/> Delete Article</button></div>}
      </aside>
    </div>
  </>;

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Content</p><h1>Blog Posts</h1><p>Every article is listed here first. Open one only when you want to edit it.</p></div>
      <Link className="site-admin-btn" to="/admin/blog/new"><Plus size={15}/> New Article</Link>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    <div className="site-admin-toolbar"><label className="site-admin-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles"/></label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></div>
    <div className="site-admin-card site-admin-table">
      <div className="site-admin-table-head blogs"><span>Image</span><span>Article</span><span>Status</span><span>Published</span><span>Actions</span></div>
      {busy && !posts.length ? <div className="site-admin-empty">Loading articles…</div> : filtered.map(post => <div className="site-admin-table-row blogs" key={post.id}>
        <div className="site-admin-blog-thumb">{post.featuredImage ? <img src={post.featuredImage} alt=""/> : <Image size={20}/>}</div>
        <div><strong>{post.title || 'Untitled article'}</strong><small>/blog/{post.slug || 'no-slug'}</small></div>
        <span className={`site-admin-status ${post.status}`}>{post.status}</span>
        <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}</span>
        <div className="site-admin-actions right"><Link className="site-admin-btn secondary small" to={`/admin/blog/${post.id}`}>Edit</Link>{post.slug && <a className="site-admin-btn secondary small" href={`https://www.justconsignin.com/blog/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View</a>}<button className="site-admin-btn danger small" type="button" onClick={() => remove(post)} disabled={busy}><Trash2 size={13}/></button></div>
      </div>)}
      {!busy && !filtered.length && <div className="site-admin-empty">No articles found.</div>}
    </div>
  </>;
}
