import { WandSparkles } from 'lucide-react';
import { SOCIAL_PUBLISHING_PLATFORMS } from '../../../config/socialPlatforms';

export default function PlatformCopyEditor({ campaign, activePlatform, onActivePlatform, onChange, onStarterCopy }) {
  return <>
    <div className="social-copy-head">
      <div><strong>Platform copy</strong><small>Edit each network separately.</small></div>
      <button className="site-admin-btn secondary small" type="button" onClick={onStarterCopy}><WandSparkles size={13}/> Starter Copy</button>
    </div>
    <div className="social-tabs">{SOCIAL_PUBLISHING_PLATFORMS.map(network => <button type="button" key={network.key} className={activePlatform === network.key ? 'active' : ''} onClick={() => onActivePlatform(network.key)}>{network.label}</button>)}</div>

    {activePlatform === 'instagram' && <label className="social-field"><span>Instagram caption</span><textarea rows="9" value={campaign.instagramCaption} onChange={e => onChange('instagramCaption', e.target.value)}/></label>}
    {activePlatform === 'facebook' && <>
      <label className="social-field"><span>Facebook caption</span><textarea rows="8" value={campaign.facebookCaption} onChange={e => onChange('facebookCaption', e.target.value)}/></label>
      <div className="site-admin-note">Facebook is available for campaign drafting now. Until the Facebook Page is connected in Metricool, Facebook publishing will return a network-specific warning while the other selected networks can still be sent.</div>
    </>}
    {activePlatform === 'tiktok' && <label className="social-field"><span>TikTok caption</span><textarea rows="7" value={campaign.tiktokCaption} onChange={e => onChange('tiktokCaption', e.target.value)}/></label>}
    {activePlatform === 'youtube' && <>
      <label className="social-field"><span>YouTube title</span><input value={campaign.youtubeTitle} onChange={e => onChange('youtubeTitle', e.target.value)}/></label>
      <label className="social-field"><span>YouTube description</span><textarea rows="8" value={campaign.youtubeDescription} onChange={e => onChange('youtubeDescription', e.target.value)}/></label>
      <div className="site-admin-note">YouTube publishing requires a video. Image campaigns can still be saved for Instagram, Facebook and TikTok.</div>
    </>}
  </>;
}
