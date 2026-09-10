import { useEffect, useState } from 'react';
import { Film, Loader2, Music2, Play, Sparkles, Trash2, Upload, Video } from 'lucide-react';
import { SOCIAL_PLATFORM_LABELS } from '../../config/socialPlatforms';
import { uploadSocialAudio, uploadSocialVideo } from '../../services/siteAdminService';
import { analyzeSocialMedia, getSocialAiStatus } from '../../services/socialAiService';
import { createImageMusicReel } from '../../services/socialReelService';

const REEL_DURATIONS = [5, 8, 10, 15];

async function videoOrientation(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Unable to read video dimensions.'));
    });
    return video.videoHeight > video.videoWidth ? 'vertical' : 'landscape';
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

export default function SocialAssistant({ accessToken, campaign, setCampaign, setMessage, setError }) {
  const [configured, setConfigured] = useState(null);
  const [direction, setDirection] = useState('');
  const [analyzeBusy, setAnalyzeBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [reelBusy, setReelBusy] = useState(false);
  const [reelDuration, setReelDuration] = useState(10);

  useEffect(() => {
    if (!accessToken) return;
    getSocialAiStatus(accessToken).then(result => setConfigured(Boolean(result.configured))).catch(() => setConfigured(false));
  }, [accessToken]);

  const patch = values => setCampaign(current => ({ ...current, ...values }));

  const analyzeMedia = async () => {
    if (!campaign.mediaUrl) { setError('Choose or upload an image or video first.'); return; }
    if (!campaign.platforms?.length) { setError('Choose at least one social network to push to.'); return; }
    setAnalyzeBusy(true); setError(''); setMessage(campaign.mediaType === 'video' ? 'Reading the video, sampling frames and checking its audio…' : 'Analyzing the selected image…');
    try {
      const result = await analyzeSocialMedia(accessToken, {
        mediaUrl: campaign.mediaUrl,
        mediaType: campaign.mediaType,
        platforms: campaign.platforms,
        youtubeFormat: campaign.youtubeFormat || 'video',
        direction,
      });
      const analysis = result.analysis || {};
      patch({
        title: analysis.title || campaign.title,
        instagramCaption: campaign.platforms.includes('instagram') ? (analysis.instagram || campaign.instagramCaption) : campaign.instagramCaption,
        facebookCaption: campaign.platforms.includes('facebook') ? (analysis.facebook || campaign.facebookCaption) : campaign.facebookCaption,
        tiktokCaption: campaign.platforms.includes('tiktok') ? (analysis.tiktok || campaign.tiktokCaption) : campaign.tiktokCaption,
        youtubeTitle: campaign.platforms.includes('youtube') ? (analysis.youtubeTitle || campaign.youtubeTitle) : campaign.youtubeTitle,
        youtubeDescription: campaign.platforms.includes('youtube') ? (analysis.youtubeDescription || campaign.youtubeDescription) : campaign.youtubeDescription,
      });
      const networks = campaign.platforms.map(key => SOCIAL_PLATFORM_LABELS[key] || key).join(', ');
      setMessage(`Media analyzed and posts created for ${networks}.${result.warning ? ` ${result.warning}` : ''}`);
    } catch (err) { setError(err.message); setMessage(''); }
    finally { setAnalyzeBusy(false); }
  };

  const uploadVideo = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setVideoBusy(true); setError(''); setMessage('');
    try {
      let orientation = 'landscape';
      try { orientation = await videoOrientation(file); } catch {}
      const url = await uploadSocialVideo(accessToken, file);
      const youtubeFormat = orientation === 'vertical' ? 'short' : 'video';
      patch({ mediaUrl: url, mediaType: 'video', aspectRatio: 'original', youtubeFormat });
      setMessage(`Video uploaded and selected. ${orientation === 'vertical' ? 'Vertical video defaults to YouTube Short.' : 'Landscape video defaults to YouTube Video.'} You can change the YouTube type before analyzing.`);
    } catch (err) { setError(err.message); }
    finally { setVideoBusy(false); event.target.value = ''; }
  };

  const uploadAudio = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAudioBusy(true); setError(''); setMessage('');
    try {
      const url = await uploadSocialAudio(accessToken, file);
      patch({ audioUrl: url, audioName: file.name, audioMode: 'uploaded' });
      setMessage('Music uploaded and attached to this campaign.');
    } catch (err) { setError(err.message); }
    finally { setAudioBusy(false); event.target.value = ''; }
  };

  const createReel = async () => {
    if (!campaign.mediaUrl) { setError('Choose an image first.'); return; }
    if (!campaign.audioUrl) { setError('Upload music first.'); return; }
    if (campaign.mediaType === 'video') { setError('A video is already selected. Create Reel With Music is for turning a still image into a video.'); return; }
    setReelBusy(true); setError(''); setMessage('Creating the MP4 on this device… keep this page open.');
    try {
      const file = await createImageMusicReel({ imageUrl: campaign.mediaUrl, audioUrl: campaign.audioUrl, durationSeconds: reelDuration });
      const url = await uploadSocialVideo(accessToken, file);
      patch({ mediaUrl: url, mediaType: 'video', aspectRatio: '9:16', youtubeFormat: 'short' });
      setMessage(`Reel created: ${reelDuration} seconds, 9:16 MP4 with your uploaded music. You can now analyze it or send it.`);
    } catch (err) { setError(err.message); setMessage(''); }
    finally { setReelBusy(false); }
  };

  const clearAudio = () => patch({ audioUrl: '', audioName: '', audioMode: 'none' });
  const selectedNetworks = (campaign.platforms || []).map(key => SOCIAL_PLATFORM_LABELS[key] || key);

  return <div className="social-ai-block">
    <div className="social-ai-head">
      <div><strong><Sparkles size={15}/> Content Assistant</strong><small>Give it the media. It figures out the post.</small></div>
      <span className={`social-ai-status ${configured ? 'ok' : configured === false ? 'off' : ''}`}>{configured === null ? 'Checking AI…' : configured ? 'OpenAI ready' : 'OpenAI key needed'}</span>
    </div>

    <div className="social-ai-grid" style={{ gridTemplateColumns: '1fr' }}>
      <section className="social-ai-card">
        <div className="social-ai-title"><Sparkles size={17}/><div><strong>Analyze media & build the posts</strong><small>Uses the selected image or video to determine what is being shown, then writes the campaign for only the networks you selected above.</small></div></div>
        <div className="social-reel-summary">
          <span className={campaign.mediaUrl ? 'ready' : ''}>{campaign.mediaUrl ? `✓ ${campaign.mediaType === 'video' ? 'Video' : 'Image'} ready` : 'Media needed'}</span>
          <span className={selectedNetworks.length ? 'ready' : ''}>{selectedNetworks.length ? `✓ Push to: ${selectedNetworks.join(', ')}` : 'Choose social networks above'}</span>
        </div>
        <div className="site-admin-actions" style={{ marginBottom: 12 }}>
          <label className="site-admin-btn secondary upload-button"><Video size={14}/> {videoBusy ? 'Uploading video…' : 'Upload Video'}<input type="file" accept="video/mp4,.mp4" onChange={uploadVideo} disabled={videoBusy}/></label>
        </div>
        {campaign.platforms?.includes('youtube') && <div className="social-reel-duration" style={{ marginBottom: 14 }}>
          <strong>YouTube type</strong>
          <div>
            <button type="button" className={(campaign.youtubeFormat || 'video') === 'video' ? 'selected' : ''} onClick={() => patch({ youtubeFormat: 'video' })}>Video</button>
            <button type="button" className={campaign.youtubeFormat === 'short' ? 'selected' : ''} onClick={() => patch({ youtubeFormat: 'short' })}>Short</button>
          </div>
          <p className="social-audio-note" style={{ margin: '8px 0 0' }}>Video creates a standard YouTube upload with a full title and description. Short creates short-form YouTube copy and publishes through Metricool as a Short.</p>
        </div>}
        <label className="social-field"><span>Optional direction</span><textarea rows="3" value={direction} onChange={e => setDirection(e.target.value)} placeholder="Optional. Example: Focus on how quickly a store can create the Shopify product from a phone."/></label>
        <button className="site-admin-btn social-ai-primary" type="button" onClick={analyzeMedia} disabled={analyzeBusy || configured === false || !campaign.mediaUrl || !selectedNetworks.length}>{analyzeBusy ? <Loader2 className="spin" size={15}/> : <Sparkles size={15}/>} {analyzeBusy ? 'Analyzing media…' : 'Analyze Media & Build Posts'}</button>
        <p className="social-audio-note">For an image, AI reads the image itself. For a video, it samples frames across the clip and also transcribes the spoken audio when the file size allows it.</p>
        {configured === false && <p className="social-audio-note"><b>AI setup:</b> add credits to the OpenAI API account before using media analysis.</p>}
      </section>
    </div>

    <section className="social-audio-card">
      <div className="social-ai-title"><Music2 size={17}/><div><strong>Music</strong><small>Upload your own MP3/M4A/WAV if you want to turn a still image into a simple Reel.</small></div></div>
      {campaign.audioUrl ? <div className="social-audio-attached">
        <div><strong>{campaign.audioName || 'Uploaded music'}</strong><audio controls preload="metadata" src={campaign.audioUrl}/></div>
        <button className="site-admin-btn danger small" type="button" onClick={clearAudio}><Trash2 size={13}/> Remove</button>
      </div> : <div className="social-audio-actions">
        <label className="site-admin-btn secondary upload-button"><Upload size={14}/> {audioBusy ? 'Uploading…' : 'Upload Music'}<input type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/x-m4a,audio/ogg,.mp3,.m4a,.wav,.aac,.ogg" onChange={uploadAudio} disabled={audioBusy}/></label>
        <button type="button" className={`site-admin-btn secondary ${campaign.audioMode === 'add-later' ? 'selected-mode' : ''}`} onClick={() => patch({ audioMode: campaign.audioMode === 'add-later' ? 'none' : 'add-later' })}><Music2 size={14}/> {campaign.audioMode === 'add-later' ? 'Music Later ✓' : 'Add Music Later'}</button>
      </div>}
    </section>

    <section className="social-reel-card">
      <div className="social-ai-title"><Film size={18}/><div><strong>Create Reel With Music</strong><small>Optional: combines a selected still image and uploaded music into a 9:16 MP4 for Instagram Reels/TikTok.</small></div></div>
      <div className="social-reel-summary">
        <span className={campaign.mediaUrl && campaign.mediaType === 'image' ? 'ready' : ''}>{campaign.mediaType === 'image' && campaign.mediaUrl ? '✓ Image ready' : campaign.mediaType === 'video' ? 'Video already selected' : 'Image needed'}</span>
        <span className={campaign.audioUrl ? 'ready' : ''}>{campaign.audioUrl ? '✓ Music ready' : 'Music needed'}</span>
      </div>
      <div className="social-reel-duration"><strong>Length</strong><div>{REEL_DURATIONS.map(seconds => <button type="button" key={seconds} className={reelDuration === seconds ? 'selected' : ''} onClick={() => setReelDuration(seconds)}>{seconds}s</button>)}</div></div>
      <button className="site-admin-btn social-reel-create" type="button" onClick={createReel} disabled={reelBusy || !campaign.mediaUrl || !campaign.audioUrl || campaign.mediaType === 'video'}>{reelBusy ? <Loader2 className="spin" size={15}/> : <Play size={15}/>} {reelBusy ? `Creating ${reelDuration}s MP4…` : 'Create Reel With Music'}</button>
    </section>
  </div>;
}
