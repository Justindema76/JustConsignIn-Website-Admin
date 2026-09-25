import { useRef, useState } from 'react';
import { Image, Upload, X } from 'lucide-react';
import { loadAdminMedia, uploadWorkImage } from '../../services/siteAdminService';

export default function ProjectMediaFields({
  accessToken,
  draft,
  update,
  updateSection,
  uploading,
  setUploading,
  setError,
  setMessage,
  postLabel = 'Post',
}) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const logoRef = useRef(null);
  const heroRef = useRef(null);
  const sections = draft?.sections || {};

  const uploadLogo = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading('logo');
    setError('');
    try {
      const url = await uploadWorkImage(accessToken, file);
      update('featuredImage', url);
      update('featuredImageAlt', draft.featuredImageAlt || `${draft.company || draft.title || 'Project'} logo`);
      setMessage(`Project logo uploaded. Save the ${postLabel} to keep it.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const uploadHero = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading('hero');
    setError('');
    try {
      const url = await uploadWorkImage(accessToken, file);
      updateSection('heroImage', url);
      updateSection('heroImageAlt', sections.heroImageAlt || `${draft.company || draft.title || 'Project'} case study hero image`);
      setMessage(`Hero image uploaded. Save the ${postLabel} to keep it.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
      event.target.value = '';
    }
  };

  const openMedia = async () => {
    setMediaOpen(true);
    if (mediaItems.length) return;
    setMediaBusy(true);
    setError('');
    try {
      const items = await loadAdminMedia(accessToken);
      setMediaItems((items || []).filter(item => (item.mediaType || 'image') === 'image' && item.url));
    } catch (err) {
      setError(err.message || 'Unable to load the media library.');
      setMediaOpen(false);
    } finally {
      setMediaBusy(false);
    }
  };

  const chooseMedia = item => {
    updateSection('heroImage', item.url || '');
    updateSection('heroImageAlt', sections.heroImageAlt || item.name || `${draft.company || draft.title || 'Project'} case study hero image`);
    setMediaOpen(false);
    setMessage(`Hero image selected from Media. Save the ${postLabel} to keep it.`);
  };

  return <>
    <div className="work-post-project-media">
      <div className="work-post-logo-field">
        <div className="work-post-logo-preview">
          {draft.featuredImage ? <img src={draft.featuredImage} alt="Project logo preview"/> : <><Image size={24}/><span>No logo</span></>}
        </div>
        <div>
          <strong>Project logo</strong>
          <p>Small logo used in the Project card.</p>
          <div className="site-admin-actions">
            <button className="site-admin-btn secondary small" type="button" onClick={() => logoRef.current?.click()} disabled={uploading === 'logo'}>
              <Upload size={13}/>{uploading === 'logo' ? 'Uploading…' : 'Upload Logo'}
            </button>
            {draft.featuredImage && <button className="site-admin-btn secondary small" type="button" onClick={() => update('featuredImage', '')}>Remove</button>}
          </div>
          <input ref={logoRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadLogo}/>
        </div>
      </div>

      <div className="work-post-hero-image-field">
        <div className="work-post-hero-image-preview">
          {sections.heroImage ? <img src={sections.heroImage} alt={sections.heroImageAlt || 'Hero image preview'}/> : <><Image size={28}/><span>No hero image</span></>}
        </div>
        <div className="work-post-hero-image-controls">
          <strong>Hero image</strong>
          <p>Large image shown in the case study header beside the title and summary.</p>
          <label>Image URL
            <input
              value={sections.heroImage || ''}
              onChange={event => updateSection('heroImage', event.target.value)}
              placeholder="Paste an existing image URL"
            />
          </label>
          <label>Alt text
            <input
              value={sections.heroImageAlt || ''}
              onChange={event => updateSection('heroImageAlt', event.target.value)}
              placeholder="Describe the hero image"
            />
          </label>
          <div className="site-admin-actions">
            <button className="site-admin-btn secondary small" type="button" onClick={openMedia}>Choose Media</button>
            <button className="site-admin-btn secondary small" type="button" onClick={() => heroRef.current?.click()} disabled={uploading === 'hero'}>
              <Upload size={13}/>{uploading === 'hero' ? 'Uploading…' : 'Upload New'}
            </button>
            {sections.heroImage && <button className="site-admin-btn secondary small" type="button" onClick={() => updateSection('heroImage', '')}>Remove</button>}
          </div>
          <input ref={heroRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadHero}/>
        </div>
      </div>
    </div>

    {mediaOpen && <div className="work-post-media-modal" onClick={() => setMediaOpen(false)}>
      <div className="work-post-media-modal-card" onClick={event => event.stopPropagation()}>
        <div className="work-post-media-modal-head">
          <div><strong>Choose from Media</strong><span>Select an image that is already uploaded.</span></div>
          <button type="button" onClick={() => setMediaOpen(false)} aria-label="Close media picker"><X size={18}/></button>
        </div>
        {mediaBusy ? <div className="work-post-empty-field">Loading media…</div> : <div className="work-post-media-library-grid">
          {mediaItems.map(item => <button key={`${item.bucket || 'media'}:${item.path || item.url}`} type="button" onClick={() => chooseMedia(item)}>
            <img src={item.url} alt=""/>
            <span>{item.name || 'Image'}</span>
          </button>)}
          {!mediaItems.length && <div className="work-post-empty-field">No uploaded images found.</div>}
        </div>}
      </div>
    </div>}
  </>;
}
