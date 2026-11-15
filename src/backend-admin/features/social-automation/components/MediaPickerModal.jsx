import { X } from 'lucide-react';
import MediaAdmin from '../../media/MediaAdmin';
import '../../media/mediaAdmin.css';

// "Choose from Media": opens the full Media page (folders, search, sort, In use tags, upload)
// in a large window; click a photo or "Use this image" to pick it.
// `items` is kept for older callers; the page loads the library itself.
export default function MediaPickerModal({ onSelect, onClose, types = ['image', 'video'] }) {
  return <div className="social-modal media-picker-overlay" onClick={onClose}>
    <div className="social-modal-card media-picker-full" onClick={event => event.stopPropagation()}>
      <button type="button" className="media-picker-close" onClick={onClose} aria-label="Close"><X size={20}/></button>
      <MediaAdmin onPick={item => onSelect(item)} pickTypes={types}/>
    </div>
  </div>;
}
