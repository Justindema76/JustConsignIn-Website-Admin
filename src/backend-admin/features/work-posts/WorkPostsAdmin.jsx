import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Image, Plus, Save, Trash2, Upload, Video, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import ProjectMediaFields from './ProjectMediaFields';
import CaseStudyButtonFields from './CaseStudyButtonFields';
import './workPosts.css';

const PORTFOLIO_PREVIEW_BASE = import.meta.env.VITE_PORTFOLIO_PREVIEW_URL || 'https://justin-de-matteis-main-site.vercel.app';

function tagsFrom(value) {
  return String(value || '').split(',').map(tag => tag.trim()).filter(Boolean);
}

function previewUrl(slug = '') {
  return `${PORTFOLIO_PREVIEW_BASE}/work/${encodeURIComponent(slug)}`;
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
  const galleryRef = useRef(null);
  const videoRef = useRef(null);

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
      setDraft(createEmptyWorkPost());
      return;
    }
    loadAdminWorkPost(accessToken, id)
      .then(setDraft)
      .catch(err => setError(err.message));
  }, [editing, id, accessToken, siteKey]);

  if (siteKey !== 'justindematteis') {
    return <div className="site-admin-card site-admin-empty">
      <p>Work Posts belong to the JustinDeMatteis.com portfolio. Switch the website selector to JustinDeMatteis.com to manage them.</p>
    </div>;
  }

  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const updateSection = (key, value) => setDraft(current => ({
    ...current,
    sections: { ...current.sections, [key]: value },
  }));

  const updateArrayItem = (key, index, patch) => {
    const next = [...(draft.sections?.[key] || [])];
    next[index] = typeof patch === 'function'
      ? patch(next[index])
      : patch && typeof patch === 'object' && !Array.isArray(patch)
        ? { ...(next[index] || {}), ...patch }
        : patch;
    updateSection(key, next);
  };

  const removeArrayItem = (key, index) => {
    updateSection(key, (draft.sections?.[key] || []).filter((_, itemIndex) => itemIndex !== index));
  };

  const uploadGallery = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading('gallery'); setError('');
    try {
      const uploaded = [];
      for (const file of files) {
        const url = await uploadWorkImage(accessToken, file);
        uploaded.push({ url, alt: '', caption: '' });
      }
      updateSection('gallery', [...(draft.sections.gallery || []), ...uploaded]);
      setMessage(`${uploaded.length} image${uploaded.length === 1 ? '' : 's'} added. Save the Work Post to keep them.`);
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
      updateSection('videos', [
        ...(draft.sections.videos || []),
        { url, title: file.name.replace(/\.[^.]+$/, ''), caption: '' },
      ]);
      setMessage('Video uploaded. Save the Work Post to keep it.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const save = async event => {
    event?.preventDefault?.();
    if (!draft.title.trim()) return setError('Add the Work Post title.');
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await saveAdminWorkPost(accessToken, {
        ...draft,
        slug: draft.slug || slugifyWork(draft.title),
      });
      setDraft(saved);
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
          <p>Each project has one permanent case study made from structured fields.</p>
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
            {post.slug && <a className="site-admin-btn secondary small" href={previewUrl(post.slug)} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View</a>}
          </div>
        </div>)}
        {!busy && !posts.length && <div className="site-admin-empty">No Work Posts yet.</div>}
      </div>
    </>;
  }

  const sections = draft.sections || {};

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Portfolio · Work Post</p>
        <h1>{id === 'new' ? 'New Work Post' : 'Edit Work Post'}</h1>
        <p>Edit the case study by field. Each section maps directly to the finished portfolio page.</p>
      </div>
      <div className="site-admin-actions">
        <Link className="site-admin-btn secondary" to="/admin/work-posts">← Work Posts</Link>
        {draft.slug && <a className="site-admin-btn secondary" href={previewUrl(draft.slug)} target="_blank" rel="noreferrer">Preview <ExternalLink size={13}/></a>}
        <button className="site-admin-btn" type="button" onClick={save} disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save Work Post'}</button>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <form id="work-post-form" className="work-post-editor-grid" onSubmit={save}>
      <section className="work-post-editor-main">
        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>1</span><div><h2>Project information</h2><p>Hero and project snapshot.</p></div></div>
          </div>
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

          <ProjectMediaFields
            accessToken={accessToken}
            draft={draft}
            update={update}
            updateSection={updateSection}
            uploading={uploading}
            setUploading={setUploading}
            setError={setError}
            setMessage={setMessage}
            postLabel="Work Post"
          />
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head"><div><span>2</span><div><h2>{sections.overviewHeading || 'Overview'}</h2><p>The opening of the case study.</p></div></div></div>
          <label>Section title<input value={sections.overviewHeading || ''} onChange={event => updateSection('overviewHeading', event.target.value)}/></label>
          <label>Overview<textarea rows="6" value={sections.overview || ''} onChange={event => updateSection('overview', event.target.value)}/></label>
          <label>Second paragraph<textarea rows="4" value={sections.overviewSecondary || ''} onChange={event => updateSection('overviewSecondary', event.target.value)}/></label>
          <label>Pull quote<textarea rows="3" value={sections.quote || ''} onChange={event => updateSection('quote', event.target.value)}/></label>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head"><div><span>3</span><div><h2>{sections.problemHeading || 'The business problem'}</h2><p>Use this for the problem, business context, challenge, or environment.</p></div></div></div>
          <label>Section title<input value={sections.problemHeading || ''} onChange={event => updateSection('problemHeading', event.target.value)}/></label>
          <label>Section content<textarea rows="6" value={sections.problem || ''} onChange={event => updateSection('problem', event.target.value)}/></label>
          <div className="work-post-repeat-list">
            {(sections.problemPoints || []).map((point, index) => <div className="work-post-repeat-row" key={index}>
              <input value={point} onChange={event => updateArrayItem('problemPoints', index, event.target.value)} placeholder="Problem point"/>
              <button type="button" onClick={() => removeArrayItem('problemPoints', index)} aria-label="Remove problem point"><X size={14}/></button>
            </div>)}
          </div>
          <button className="site-admin-btn secondary small" type="button" onClick={() => updateSection('problemPoints', [...(sections.problemPoints || []), ''])}><Plus size={13}/> Add problem point</button>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head"><div><span>4</span><div><h2>{sections.builtHeading || 'What I built'}</h2><p>Describe the implementation, responsibilities, or solution.</p></div></div></div>
          <label>Section title<input value={sections.builtHeading || ''} onChange={event => updateSection('builtHeading', event.target.value)}/></label>
          <label>Section content<textarea rows="6" value={sections.built || ''} onChange={event => updateSection('built', event.target.value)}/></label>
          <label>Connected workflow <small>(optional)</small><input value={sections.connectedWorkflow || ''} onChange={event => updateSection('connectedWorkflow', event.target.value)} placeholder="Leave blank if this project does not have a workflow"/></label>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>5</span><div><h2>{sections.visualsHeading || 'Product visuals'}</h2><p>Optional screenshots and project visuals.</p></div></div>
            <button className="site-admin-btn secondary small" type="button" onClick={() => galleryRef.current?.click()} disabled={uploading === 'gallery'}><Upload size={13}/>{uploading === 'gallery' ? 'Uploading…' : 'Add Images'}</button>
          </div>
          <label>Section title<input value={sections.visualsHeading || ''} onChange={event => updateSection('visualsHeading', event.target.value)}/></label>
          <label>Section intro<textarea rows="3" value={sections.visualsIntro || ''} onChange={event => updateSection('visualsIntro', event.target.value)}/></label>
          <input ref={galleryRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadGallery}/>
          <div className="work-post-media-editor-grid">
            {(sections.gallery || []).map((item, index) => <article className="work-post-media-edit" key={item.url || index}>
              <img src={item.url} alt=""/>
              <label>Alt text<input value={item.alt || ''} onChange={event => updateArrayItem('gallery', index, { alt: event.target.value })}/></label>
              <label>Caption<input value={item.caption || ''} onChange={event => updateArrayItem('gallery', index, { caption: event.target.value })}/></label>
              <button className="site-admin-btn danger small" type="button" onClick={() => removeArrayItem('gallery', index)}><Trash2 size={13}/> Remove</button>
            </article>)}
          </div>
          {!(sections.gallery || []).length && <div className="work-post-empty-field">No screenshots yet. Click <strong>Add Images</strong>.</div>}
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head"><div><span>6</span><div><h2>YouTube demo</h2><p>Paste the public YouTube link. No YouTube account connection is required.</p></div></div></div>
          <label>Heading<input value={sections.youtubeHeading || ''} onChange={event => updateSection('youtubeHeading', event.target.value)}/></label>
          <label>Description<textarea rows="3" value={sections.youtubeIntro || ''} onChange={event => updateSection('youtubeIntro', event.target.value)}/></label>
          <label>YouTube URL<input value={sections.youtubeUrl || ''} onChange={event => updateSection('youtubeUrl', event.target.value)} placeholder="https://youtu.be/..."/></label>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>7</span><div><h2>Uploaded videos</h2><p>Optional MP4/WebM videos stored with the project.</p></div></div>
            <button className="site-admin-btn secondary small" type="button" onClick={() => videoRef.current?.click()} disabled={uploading === 'video'}><Video size={13}/>{uploading === 'video' ? 'Uploading…' : 'Add Video'}</button>
          </div>
          <input ref={videoRef} hidden type="file" accept="video/mp4,video/quicktime,video/x-m4v,video/webm" onChange={uploadVideo}/>
          <div className="work-post-video-fields">
            {(sections.videos || []).map((item, index) => <div className="work-post-repeat-card" key={item.url || index}>
              <video controls preload="metadata" src={item.url}/>
              <label>Video title<input value={item.title || ''} onChange={event => updateArrayItem('videos', index, { title: event.target.value })}/></label>
              <label>Caption<textarea rows="2" value={item.caption || ''} onChange={event => updateArrayItem('videos', index, { caption: event.target.value })}/></label>
              <button className="site-admin-btn danger small" type="button" onClick={() => removeArrayItem('videos', index)}><Trash2 size={13}/> Remove</button>
            </div>)}
          </div>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>8</span><div><h2>Workflow</h2><p>Each step is its own editable field.</p></div></div>
            <button className="site-admin-btn secondary small" type="button" onClick={() => updateSection('workflow', [...(sections.workflow || []), { title: '', text: '' }])}><Plus size={13}/> Add Step</button>
          </div>
          <div className="work-post-step-editor">
            {(sections.workflow || []).map((step, index) => <article className="work-post-repeat-card" key={index}>
              <div className="work-post-repeat-card-head"><strong>Step {index + 1}</strong><button type="button" onClick={() => removeArrayItem('workflow', index)}><X size={14}/></button></div>
              <label>Step title<input value={step.title || ''} onChange={event => updateArrayItem('workflow', index, { title: event.target.value })}/></label>
              <label>Description<textarea rows="3" value={step.text || ''} onChange={event => updateArrayItem('workflow', index, { text: event.target.value })}/></label>
            </article>)}
          </div>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head"><div><span>9</span><div><h2>{sections.ongoingHeading || 'Ongoing work'}</h2><p>Optional closing section for active or continuing work.</p></div></div></div>
          <label>Section title<input value={sections.ongoingHeading || ''} onChange={event => updateSection('ongoingHeading', event.target.value)}/></label>
          <label>Section content<textarea rows="6" value={sections.ongoing || ''} onChange={event => updateSection('ongoing', event.target.value)}/></label>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>+</span><div><h2>Additional sections</h2><p>Add more sections without changing the template.</p></div></div>
            <button className="site-admin-btn secondary small" type="button" onClick={() => updateSection('extras', [...(sections.extras || []), { heading: '', text: '' }])}><Plus size={13}/> Add Section</button>
          </div>
          <div className="work-post-step-editor">
            {(sections.extras || []).map((section, index) => <article className="work-post-repeat-card" key={index}>
              <div className="work-post-repeat-card-head"><strong>Extra section {index + 1}</strong><button type="button" onClick={() => removeArrayItem('extras', index)}><X size={14}/></button></div>
              <label>Heading<input value={section.heading || ''} onChange={event => updateArrayItem('extras', index, { heading: event.target.value })}/></label>
              <label>Content<textarea rows="5" value={section.text || ''} onChange={event => updateArrayItem('extras', index, { text: event.target.value })}/></label>
            </article>)}
          </div>
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
          <button className="site-admin-btn work-post-side-save" type="button" onClick={save} disabled={busy}><Save size={14}/> {busy ? 'Saving…' : 'Save'}</button>
        </div>

        <div className="site-admin-card site-admin-side-card">
          <h2>Project details</h2>
          <label>Technology tags<textarea rows="5" value={(draft.tags || []).join(', ')} onChange={event => update('tags', tagsFrom(event.target.value))}/></label>
          <label>Secondary project URL<input value={draft.secondaryUrl} onChange={event => update('secondaryUrl', event.target.value)} placeholder="YouTube, GitHub, demo…"/></label>
        </div>

        <CaseStudyButtonFields
          draft={draft}
          update={update}
          updateSection={updateSection}
          backLabel="Back to Work"
          backUrl="/work"
        />

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
