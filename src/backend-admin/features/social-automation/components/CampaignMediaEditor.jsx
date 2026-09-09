import { Upload } from 'lucide-react';
import MediaPreview from '../../../components/media/MediaPreview';

const RATIOS = ['1:1', '4:5', '9:16', 'original'];

export default function CampaignMediaEditor({ campaign, busy, onChooseMedia, onUploadImage, onRatioChange }) {
  return <div className="social-field">
    <span>Media</span>
    <div className="social-media-editor">
      <div className={`social-media-preview ratio-${campaign.aspectRatio.replace(':','')}`}><MediaPreview url={campaign.mediaUrl} type={campaign.mediaType}/></div>
      <div>
        <div className="site-admin-actions">
          <button className="site-admin-btn secondary small" type="button" onClick={onChooseMedia}>Choose Media</button>
          <label className="site-admin-btn secondary small upload-button"><Upload size={13}/> Upload Image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUploadImage} disabled={busy}/></label>
        </div>
        <div className="social-ratios">{RATIOS.map(ratio => <button key={ratio} type="button" className={campaign.aspectRatio === ratio ? 'selected' : ''} onClick={() => onRatioChange(ratio)}>{ratio}</button>)}</div>
        <small>{campaign.mediaType === 'video' ? 'MP4 video selected.' : 'Images are stored in the shared Supabase media library. PNG/GIF files are converted to JPEG when TikTok requires it.'}</small>
      </div>
    </div>
  </div>;
}
