import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Library, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import MediaPickerModal from '../../features/social-automation/components/MediaPickerModal';
import { loadAdminMedia, uploadSunwingsImage } from '../../services/siteAdminService';
import {
  POST_STATUS,
  createEmptyLocationPost,
  createEmptyServicePost,
  deleteLocationPost,
  deleteServicePost,
  loadLocationPost,
  loadLocationPosts,
  loadServicePost,
  loadServicePosts,
  saveLocationPost,
  saveServicePost,
  slugifySunwings,
} from './sunwingsPostStore';
import '../../features/work-posts/workPosts.css';

const PUBLIC_BASE = import.meta.env.VITE_SUNWINGS_PREVIEW_URL || 'https://sunwingstransport.ca';

const TYPE_CONFIG = {
  service: {
    singular: 'Service Post',
    plural: 'Service Posts',
    eyebrow: 'Sunwings Services',
    route: '/admin/sunwings/services',
    publicPath: 'services',
    create: createEmptyServicePost,
    list: loadServicePosts,
    load: loadServicePost,
    save: saveServicePost,
    remove: deleteServicePost,
  },
  location: {
    singular: 'Location Post',
    plural: 'Location Posts',
    eyebrow: 'Sunwings Locations',
    route: '/admin/sunwings/locations',
    publicPath: 'locations',
    create: createEmptyLocationPost,
    list: loadLocationPosts,
    load: loadLocationPost,
    save: saveLocationPost,
    remove: deleteLocationPost,
  },
};

function RepeatableText({ values = [], onChange, addLabel, placeholder }) {
  const update = (index, value) => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };
  const remove = index => onChange(values.filter((_, itemIndex) => itemIndex !== index));
  return <div className="work-post-repeat-list">
    {values.map((value, index) => <div className="work-post-repeat-row" key={index}>
      <input value={value} onChange={event => update(index, event.target.value)} placeholder={placeholder}/>
      <button type="button" onClick={() => remove(index)} aria-label="Remove"><X size={14}/></button>
    </div>)}
    <button className="site-admin-btn secondary small" type="button" onClick={() => onChange([...values, ''])}>
      <Plus size={13}/> {addLabel}
    </button>
  </div>;
}

export default function SunwingsPostEditor({ type }) {
  const config = TYPE_CONFIG[type];
  const { accessToken } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const imageRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState(() => config.create());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState([]);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const sorted = useMemo(
    () => [...posts].sort((a, b) => (a.sortOrder - b.sortOrder) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)),
    [posts],
  );

  const refresh = async () => {
    const rows = await config.list(accessToken);
    setPosts(rows);
    return rows;
  };

  useEffect(() => {
    if (!accessToken) return;
    if (!editing) {
      setBusy(true);
      refresh().catch(err => setError(err.message)).finally(() => setBusy(false));
      return;
    }

    setError('');
    setMessage('');
    if (id === 'new') {
      setDraft(config.create());
      return;
    }
    setBusy(true);
    config.load(accessToken, id)
      .then(setDraft)
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  }, [accessToken, editing, id, type]);

  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));

  const save = async event => {
    event?.preventDefault?.();
    if (!draft.title.trim()) return setError(`Add the ${config.singular.toLowerCase()} title.`);
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await config.save(accessToken, {
        ...draft,
        slug: draft.slug || slugifySunwings(draft.title),
      });
      setDraft(saved);
      setMessage(`${config.singular} saved.`);
      if (id === 'new') navigate(`${config.route}/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removePost = async post => {
    if (!post?.id || !window.confirm(`Delete "${post.title}"?`)) return;
    setBusy(true); setError('');
    try {
      await config.remove(accessToken, post.id);
      navigate(config.route);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadBanner = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const url = await uploadSunwingsImage(accessToken, file);
      setDraft(current => ({
        ...current,
        bannerImage: url,
        ogImage: current.ogImage || url,
      }));
      setMessage('Banner image uploaded. Save the post to keep it.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const chooseMedia = async () => {
    setMediaOpen(true);
    if (media.length) return;
    setMediaLoading(true);
    setError('');
    try {
      const items = await loadAdminMedia(accessToken);
      setMedia(items.filter(item => (item.mediaType || 'image') === 'image'));
    } catch (err) {
      setError(err.message || 'Unable to load media.');
    } finally {
      setMediaLoading(false);
    }
  };

  const selectBannerMedia = item => {
    const url = item?.url || '';
    if (!url) return;
    setDraft(current => ({
      ...current,
      bannerImage: url,
      ogImage: current.ogImage || url,
    }));
    setMediaOpen(false);
    setMessage('Banner image selected. Save the post to keep it.');
  };

  if (!editing) {
    return <>
      <div className="site-admin-page-head">
        <div>
          <p className="site-admin-eyebrow">{config.eyebrow}</p>
          <h1>{config.plural}</h1>
          <p>Each {type} is its own structured post. Add it once here and the Sunwings frontend builds the page from it.</p>
        </div>
        <Link className="site-admin-btn" to={`${config.route}/new`}><Plus size={15}/> New {config.singular}</Link>
      </div>
      {error && <div className="site-admin-alert error">{error}</div>}
      <div className="site-admin-card site-admin-table">
        <div className="site-admin-table-head work-post-list"><span>Post</span><span>Type / Region</span><span>Status</span><span>Updated</span><span>Actions</span></div>
        {busy && !posts.length ? <div className="site-admin-empty">Loading {config.plural}…</div> : sorted.map(post => <div className="site-admin-table-row work-post-list" key={post.id}>
          <div><strong>{post.title}</strong><small>/{config.publicPath}/{post.slug}</small></div>
          <span>{type === 'location' ? (post.region || 'Location') : 'Service'}</span>
          <span className={`site-admin-status ${post.status}`}>{post.status}</span>
          <span>{post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : '—'}</span>
          <div className="site-admin-actions right">
            <Link className="site-admin-btn secondary small" to={`${config.route}/${post.id}`}>Edit</Link>
            {post.slug && <a className="site-admin-btn secondary small" href={`${PUBLIC_BASE}/${config.publicPath}/${post.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> View</a>}
          </div>
        </div>)}
        {!busy && !posts.length && <div className="site-admin-empty">No {config.plural} yet.</div>}
      </div>
    </>;
  }

  return <>
    {mediaOpen && <MediaPickerModal
      items={media}
      onClose={() => setMediaOpen(false)}
      onSelect={selectBannerMedia}
    />}
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">{config.eyebrow} · {config.singular}</p>
        <h1>{id === 'new' ? `New ${config.singular}` : `Edit ${config.singular}`}</h1>
        <p>Structured fields feed the permanent Sunwings {type} page.</p>
      </div>
      <div className="site-admin-actions">
        <Link className="site-admin-btn secondary" to={config.route}>← {config.plural}</Link>
        {draft.slug && <a className="site-admin-btn secondary" href={`${PUBLIC_BASE}/${config.publicPath}/${draft.slug}`} target="_blank" rel="noreferrer">Preview <ExternalLink size={13}/></a>}
        <button className="site-admin-btn" type="button" onClick={save} disabled={busy}><Save size={15}/> {busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <form className="work-post-editor-grid" onSubmit={save}>
      <section className="work-post-editor-main">
        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>1</span><div><h2>{type === 'service' ? 'Service information' : 'Location information'}</h2><p>Page identity, URL and regional information.</p></div></div>
          </div>
          <div className="site-admin-form work-post-fields">
            <label className="wide">{config.singular} title<input value={draft.title} onChange={event => {
              const title = event.target.value;
              setDraft(current => ({ ...current, title, slug: current.id ? current.slug : slugifySunwings(title) }));
            }}/></label>
            <label>URL slug<input value={draft.slug} onChange={event => update('slug', slugifySunwings(event.target.value))}/><small>/{config.publicPath}/{draft.slug || 'slug'}</small></label>
            {type === 'location' && <label>Region<input value={draft.region} onChange={event => update('region', event.target.value)} placeholder="Hamilton Region"/></label>}
            <label>Eyebrow<input value={draft.eyebrow} onChange={event => update('eyebrow', event.target.value)} placeholder="Hamilton Moving & Transport"/></label>
            <label>Sort order<input type="number" value={draft.sortOrder} onChange={event => update('sortOrder', Number(event.target.value) || 0)}/></label>
          </div>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>2</span><div><h2>Banner</h2><p>Uses the Sunwings full-width image banner template.</p></div></div>
            <div className="site-admin-actions">
              <button className="site-admin-btn secondary small" type="button" onClick={chooseMedia} disabled={mediaLoading}><Library size={13}/>{mediaLoading ? 'Loading…' : 'Choose Media'}</button>
              <button className="site-admin-btn secondary small" type="button" onClick={() => imageRef.current?.click()} disabled={uploading}><Upload size={13}/>{uploading ? 'Uploading…' : 'Upload Banner'}</button>
            </div>
          </div>
          <input ref={imageRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadBanner}/>
          {draft.bannerImage && <div className="work-post-hero-image-preview" style={{maxWidth: '520px', marginBottom: '14px'}}><img src={draft.bannerImage} alt=""/></div>}
          <label>Banner image URL<input value={draft.bannerImage} onChange={event => update('bannerImage', event.target.value)}/></label>
          <label>Image alt text<input value={draft.bannerAlt} onChange={event => update('bannerAlt', event.target.value)}/></label>
          <label>H1 / banner heading<input value={draft.heroTitle} onChange={event => update('heroTitle', event.target.value)}/></label>
          <label>Banner description<textarea rows="4" value={draft.heroDescription} onChange={event => update('heroDescription', event.target.value)}/></label>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head"><div><span>3</span><div><h2>Page content</h2><p>Unique copy for this {type}; do not reuse thin location text.</p></div></div></div>
          <label>Opening paragraph<textarea rows="5" value={draft.intro} onChange={event => update('intro', event.target.value)}/></label>
          <label>Main content HTML<textarea rows="12" value={draft.bodyHtml} onChange={event => update('bodyHtml', event.target.value)} placeholder="<h2>...</h2>"/></label>

          {type === 'service' && <>
            <label>Service points</label>
            <RepeatableText values={draft.bullets} onChange={value => update('bullets', value)} addLabel="Add service point" placeholder="Loading, unloading and placement"/>
          </>}

          {type === 'location' && <>
            <label>Areas / neighbourhoods served</label>
            <RepeatableText values={draft.neighbourhoods} onChange={value => update('neighbourhoods', value)} addLabel="Add area" placeholder="Stoney Creek"/>
            <label>Service slugs <small>Comma-separated; connects this location to published Service Posts.</small>
              <textarea rows="4" value={(draft.serviceSlugs || []).join(', ')} onChange={event => update('serviceSlugs', event.target.value.split(',').map(value => value.trim()).filter(Boolean))}/>
            </label>
          </>}
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head">
            <div><span>4</span><div>
              <h2>{type === 'service' ? 'Service FAQs' : 'Local FAQs'}</h2>
              <p>{type === 'service' ? 'Questions and answers specific to this service.' : 'Questions and answers unique to this service area.'}</p>
            </div></div>
            <button className="site-admin-btn secondary small" type="button" onClick={() => update('faq', [...(draft.faq || []), { question: '', answer: '' }])}><Plus size={13}/> Add FAQ</button>
          </div>
          <div className="work-post-step-editor">
            {(draft.faq || []).map((item, index) => <div className="work-post-repeat-card" key={index}>
              <div className="work-post-repeat-card-head"><strong>FAQ {index + 1}</strong><button type="button" onClick={() => update('faq', draft.faq.filter((_, itemIndex) => itemIndex !== index))}><X size={14}/></button></div>
              <label>Question<input value={item.question || ''} onChange={event => {
                const next=[...(draft.faq || [])]; next[index]={...next[index],question:event.target.value}; update('faq',next);
              }}/></label>
              <label>Answer<textarea rows="4" value={item.answer || ''} onChange={event => {
                const next=[...(draft.faq || [])]; next[index]={...next[index],answer:event.target.value}; update('faq',next);
              }}/></label>
            </div>)}
            {!(draft.faq || []).length && <div className="site-admin-empty">No FAQs yet. Add the questions customers actually ask about this {type}.</div>}
          </div>
        </div>

        <div className="site-admin-card work-post-panel">
          <div className="work-post-panel-head"><div><span>5</span><div><h2>Call to action</h2><p>Closing conversion section for this page.</p></div></div></div>
          <label>CTA heading<input value={draft.ctaTitle} onChange={event => update('ctaTitle', event.target.value)}/></label>
          <label>CTA text<textarea rows="4" value={draft.ctaText} onChange={event => update('ctaText', event.target.value)}/></label>
        </div>
      </section>

      <aside className="work-post-editor-side">
        <div className="site-admin-card site-admin-side-card">
          <h2>Publishing</h2>
          <label>Status<select value={draft.status} onChange={event => update('status', event.target.value)}>
            <option value={POST_STATUS.DRAFT}>Draft</option>
            <option value={POST_STATUS.PUBLISHED}>Published</option>
          </select></label>
          {draft.publishedAt && <p>Published {new Date(draft.publishedAt).toLocaleDateString()}</p>}
          <button className="site-admin-btn work-post-side-save" type="button" onClick={save} disabled={busy}><Save size={14}/> {busy ? 'Saving…' : 'Save'}</button>
        </div>

        <div className="site-admin-card site-admin-side-card">
          <h2>SEO</h2>
          <label>SEO title<input value={draft.seoTitle} onChange={event => update('seoTitle', event.target.value)}/></label>
          <label>Meta description<textarea rows="5" value={draft.seoDescription} onChange={event => update('seoDescription', event.target.value)}/></label>
          <label>Social image URL<input value={draft.ogImage} onChange={event => update('ogImage', event.target.value)}/></label>
          <div className="work-post-seo-preview">
            <small>sunwingstransport.ca/{config.publicPath}/{draft.slug || 'slug'}</small>
            <strong>{draft.seoTitle || draft.title || `${config.singular} title`}</strong>
            <p>{draft.seoDescription || draft.intro || 'Meta description preview.'}</p>
          </div>
        </div>

        {draft.id && <div className="site-admin-card site-admin-side-card danger-zone">
          <h2>Danger Zone</h2>
          <p>Delete this {config.singular} permanently.</p>
          <button className="site-admin-btn danger small" type="button" onClick={() => removePost(draft)} disabled={busy}><Trash2 size={13}/> Delete {config.singular}</button>
        </div>}
      </aside>
    </form>
  </>;
}
