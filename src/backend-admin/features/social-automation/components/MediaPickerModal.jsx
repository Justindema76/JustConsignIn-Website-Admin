import { X } from 'lucide-react';
import MediaPreview from '../../../components/media/MediaPreview';

export default function MediaPickerModal({ items = [], onSelect, onClose }) {
  const selectable = items.filter(item => (item.mediaType || 'image') !== 'audio');

  return <div className="social-modal" onClick={onClose}>
    <div className="social-modal-card" onClick={event => event.stopPropagation()}>
      <div className="social-modal-head">
        <div><strong>Supabase Media Library</strong><small>{selectable.length} images & videos</small></div>
        <button type="button" onClick={onClose}><X size={18}/></button>
      </div>
      <div className="social-media-grid">
        {selectable.map(item => <button key={`${item.bucket || 'media'}:${item.path || item.url}`} type="button" onClick={() => onSelect(item)}>
          <MediaPreview url={item.url} type={item.mediaType || 'image'} controls={false} muted/>
          <span>{item.name}</span>
        </button>)}
      </div>
    </div>
  </div>;
}
