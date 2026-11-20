import { useState } from 'react';
import { ImagePlus, Library, Upload, X } from 'lucide-react';
import MediaPickerModal from '../../features/social-automation/components/MediaPickerModal';
import { uploadSunwingsImage } from '../../services/siteAdminService';

// "Job photos" for a Location Post: real photos of jobs. On the website they show as a gallery of
// 3 (click to see big; more behind "View more"). Kept in the page text as
// <section id="job-photos"><img …></section>, so no HTML editing is needed.
const SECTION_RE = /<section id="job-photos">([\s\S]*?)<\/section>/i;
const esc = text => String(text || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function readJobPhotos(html = '') {
  const inner = (String(html || '').match(SECTION_RE) || [])[1] || '';
  return [...inner.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*?(?:alt="([^"]*)")?[^>]*>/gi)].map(m => ({ url: m[1].replace(/&amp;/g, '&'), alt: (m[2] || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&') }));
}

export function writeJobPhotos(html = '', photos = []) {
  const rest = String(html || '').replace(SECTION_RE, '').trim();
  if (!photos.length) return rest;
  const section = `<section id="job-photos">${photos.map(p => `<img src="${esc(p.url)}" alt="${esc(p.alt || 'Sunwings Transport job photo')}"/>`).join('')}</section>`;
  return `${rest}\n${section}`.trim();
}

export default function JobPhotosField({ html, onChange, accessToken, place = '' }) {
  const photos = readJobPhotos(html);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = next => onChange(writeJobPhotos(html, next));
  const add = (url, alt = '') => { if (url && !photos.some(p => p.url === url)) set([...photos, { url, alt: alt || 'Sunwings Transport job photo' }]); };

  const upload = async event => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      let next = photos;
      for (const file of files) {
        const url = await uploadSunwingsImage(accessToken, file);
        if (url) next = [...next, { url, alt: 'Sunwings Transport job photo' }];
      }
      set(next);
    } catch (err) { setError(err.message || 'Upload failed.'); } finally { setBusy(false); }
  };

  return <div className="job-photos-field">
    <div className="job-photos-head">
      <div><b><ImagePlus size={15}/> Job photos</b><small>Real photos of your jobs. The website shows 3 in a row (click to see big); the rest open with “View more”. Furniture, the van, the crew at work: no stock pictures.</small></div>
      <div className="job-photos-actions">
        <button type="button" className="site-admin-btn secondary small" onClick={() => setPicking(true)}><Library size={13}/> Choose from Media</button>
        <label className="site-admin-btn secondary small">{busy ? 'Uploading…' : <><Upload size={13}/> Upload photos</>}<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={upload} disabled={busy}/></label>
      </div>
    </div>
    {error ? <div className="site-admin-alert error">{error}</div> : null}
    {photos.length ? <div className="job-photos-grid">
      {photos.map((p, i) => <div className="job-photo" key={p.url}>
        <img src={p.url} alt={p.alt}/>
        <span>{i + 1}</span>
        <button type="button" onClick={() => set(photos.filter(item => item.url !== p.url))} aria-label="Remove photo"><X size={14}/></button>
      </div>)}
    </div> : <p className="job-photos-empty">No job photos yet. Add 3 or more.</p>}
    {picking ? <MediaPickerModal types={['image']} onClose={() => setPicking(false)} onSelect={item => { setPicking(false); add(item.url, item.name); }}/> : null}
  </div>;
}
