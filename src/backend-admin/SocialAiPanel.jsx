import { useEffect, useState } from 'react';
import { Film, ImagePlus, Loader2, Music2, Play, Sparkles, Trash2, Upload } from 'lucide-react';
import { uploadBlogImage, uploadSocialAudio, uploadSocialVideo } from './siteAdminService';
import { generateSocialCopy, generateSocialImage, getSocialAiStatus, imageBase64ToFile } from './socialAiService';
import { createImageMusicReel } from './socialReelService';
import './socialAiPanel.css';

const RATIOS = [
  { value: '1:1', label: 'Square', detail: '1080 × 1080' },
  { value: '4:5', label: 'Instagram Feed', detail: '1080 × 1350' },
  { value: '9:16', label: 'Reel / TikTok', detail: '1080 × 1920' },
];

const REEL_DURATIONS = [5, 8, 10, 15];

export default function SocialAiPanel({ accessToken, campaign, setCampaign, setMessage, setError, onMediaRefresh }) {
  const [configured, setConfigured] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [direction, setDirection] = useState('');
  const [ratio, setRatio] = useState(campaign.aspectRatio === '1:1' || campaign.aspectRatio === '9:16' ? campaign.aspectRatio : '4:5');
  const [imageBusy, setImageBusy] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [reelBusy, setReelBusy] = useState(false);
  const [reelDuration, setReelDuration] = useState(10);

  useEffect(() => {
    if (!accessToken) return;
    getSocialAiStatus(accessToken).then(result => setConfigured(Boolean(result.configured))).catch(() => setConfigured(false));
  }, [accessToken]);

  useEffect(() => {
    if (!prompt && (campaign.aiImagePrompt || campaign.title)) setPrompt(campaign.aiImagePrompt || campaign.title || '');
  }, [campaign.aiImagePrompt, campaign.title]);

  const patch = values => setCampaign(current => ({ ...current, ...values }));

  const createImage = async () => {
    if (!prompt.trim()) { setError('Enter an image prompt first.'); return; }
    setImageBusy(true); setError(''); setMessage('');
    try {
      const result = await generateSocialImage(accessToken, { prompt: prompt.trim(), ratio });
      const file = await imageBase64ToFile(result.base64, ratio);
      const url = await uploadBlogImage(accessToken, file);
      patch({ mediaUrl: url, mediaType: 'image', aspectRatio: ratio, aiImagePrompt: prompt.trim() });
      await onMediaRefresh?.();
      setMessage(`AI image created at ${ratio} and saved to your Media Library.`);
    } catch (err) { setError(err.message); }
    finally { setImageBusy(false); }
  };

  const createCopy = async () => {
    if (!campaign.title?.trim()) { setError('Enter the campaign/topic first.'); return; }
    setCopyBusy(true); setError(''); setMessage('');
    try {
      const result = await generateSocialCopy(accessToken, {
        title: campaign.title,
        direction,
        platforms: campaign.platforms,
      });
      const copy = result.copy || {};
      const nextImagePrompt = copy.imagePrompt || campaign.aiImagePrompt || prompt;
      patch({
        instagramCaption: copy.instagram || campaign.instagramCaption,
        facebookCaption: copy.facebook || campaign.facebookCaption,
        tiktokCaption: copy.tiktok || campaign.tiktokCaption,
        youtubeTitle: copy.youtubeTitle || campaign.youtubeTitle,
        youtubeDescription: copy.youtubeDescription || campaign.youtubeDescription,
        aiImagePrompt: nextImagePrompt,
      });
      if (copy.imagePrompt) setPrompt(copy.imagePrompt);
      setMessage('AI created platform-specific copy and prepared a matching image prompt.');
    } catch (err) { setError(err.message); }
    finally { setCopyBusy(false); }
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
    if (!campaign.mediaUrl) { setError('Choose or create an image first.'); return; }
    if (!campaign.audioUrl) { setError('Upload music first.'); return; }
    if (campaign.mediaType === 'video') { setError('This campaign already has a video selected. Choose an image first if you want to rebuild the Reel.'); return; }
    setReelBusy(true); setError(''); setMessage('Creating the MP4 on this device… keep this page open.');
    try {
      const file = await createImageMusicReel({ imageUrl: campaign.mediaUrl, audioUrl: campaign.audioUrl, durationSeconds: reelDuration });
      const url = await uploadSocialVideo(accessToken, file);
      patch({ mediaUrl: url, mediaType: 'video', aspectRatio: '9:16' });
      setMessage(`Reel created: ${reelDuration} seconds, 9:16 MP4 with your uploaded music. It is now the selected campaign media.`);
    } catch (err) { setError(err.message); setMessage(''); }
    finally { setReelBusy(false); }
  };

  const clearAudio = () => patch({ audioUrl: '', audioName: '', audioMode: 'none' });

  return <div className="social-ai-block">
    <div className="social-ai-head">
      <div><strong><Sparkles size={15}/> AI Creator</strong><small>Prompt → image → captions → post</small></div>
      <span className={`social-ai-status ${configured ? 'ok' : configured === false ? 'off' : ''}`}>{configured === null ? 'Checking AI…' : configured ? 'OpenAI ready' : 'OpenAI key needed'}</span>
    </div>

    <div className="social-ai-grid">
      <section className="social-ai-card">
        <div className="social-ai-title"><ImagePlus size={17}/><div><strong>Create an image</strong><small>Generated with GPT-Image-2, resized to the exact social format, and saved into your existing Media Library.</small></div></div>
        <label className="social-field"><span>Image prompt</span><textarea rows="4" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Example: Create a clean JustConsignIn promo showing how a consignment store can create Shopify products from a phone. Modern retail software style. 14-day free trial."/></label>
        <div className="social-ai-ratios">{RATIOS.map(item => <button type="button" key={item.value} className={ratio === item.value ? 'selected' : ''} onClick={() => setRatio(item.value)}><strong>{item.value} · {item.label}</strong><small>{item.detail}</small></button>)}</div>
        <button className="site-admin-btn social-ai-primary" type="button" onClick={createImage} disabled={imageBusy || configured === false}>{imageBusy ? <Loader2 className="spin" size={15}/> : <Sparkles size={15}/>} {imageBusy ? 'Creating image…' : 'Generate Image'}</button>
        {configured === false && <p className="social-audio-note"><b>Setup needed:</b> add <code>OPENAI_API_KEY</code> to the Website Admin Vercel environment. The key stays server-side.</p>}
      </section>

      <section className="social-ai-card">
        <div className="social-ai-title"><Sparkles size={17}/><div><strong>Write the post</strong><small>Creates different copy for Instagram, Facebook, TikTok and YouTube, plus a matching image prompt.</small></div></div>
        <label className="social-field"><span>Optional direction</span><textarea rows="4" value={direction} onChange={e => setDirection(e.target.value)} placeholder="Example: Focus on creating Shopify products from your phone. Make it sales-focused but not cheesy."/></label>
        <button className="site-admin-btn social-ai-primary" type="button" onClick={createCopy} disabled={copyBusy || configured === false}>{copyBusy ? <Loader2 className="spin" size={15}/> : <Sparkles size={15}/>} {copyBusy ? 'Writing copy…' : 'Generate All Captions'}</button>
      </section>
    </div>

    <section className="social-audio-card">
      <div className="social-ai-title"><Music2 size={17}/><div><strong>Music</strong><small>Upload your own MP3/M4A/WAV. It stays attached to this campaign.</small></div></div>
      {campaign.audioUrl ? <div className="social-audio-attached">
        <div><strong>{campaign.audioName || 'Uploaded music'}</strong><audio controls preload="metadata" src={campaign.audioUrl}/></div>
        <button className="site-admin-btn danger small" type="button" onClick={clearAudio}><Trash2 size={13}/> Remove</button>
      </div> : <div className="social-audio-actions">
        <label className="site-admin-btn secondary upload-button"><Upload size={14}/> {audioBusy ? 'Uploading…' : 'Upload Music'}<input type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/x-m4a,audio/ogg,.mp3,.m4a,.wav,.aac,.ogg" onChange={uploadAudio} disabled={audioBusy}/></label>
        <button type="button" className={`site-admin-btn secondary ${campaign.audioMode === 'add-later' ? 'selected-mode' : ''}`} onClick={() => patch({ audioMode: campaign.audioMode === 'add-later' ? 'none' : 'add-later' })}><Music2 size={14}/> {campaign.audioMode === 'add-later' ? 'Music Later ✓' : 'Add Music Later'}</button>
      </div>}
    </section>

    <section className="social-reel-card">
      <div className="social-ai-title"><Film size={18}/><div><strong>Create Reel With Music</strong><small>Combines the selected image and uploaded music into a real 9:16 MP4 for Instagram Reels/TikTok.</small></div></div>
      <div className="social-reel-summary">
        <span className={campaign.mediaUrl && campaign.mediaType === 'image' ? 'ready' : ''}>{campaign.mediaType === 'image' && campaign.mediaUrl ? '✓ Image ready' : campaign.mediaType === 'video' ? 'Video currently selected' : 'Image needed'}</span>
        <span className={campaign.audioUrl ? 'ready' : ''}>{campaign.audioUrl ? '✓ Music ready' : 'Music needed'}</span>
      </div>
      <div className="social-reel-duration"><strong>Length</strong><div>{REEL_DURATIONS.map(seconds => <button type="button" key={seconds} className={reelDuration === seconds ? 'selected' : ''} onClick={() => setReelDuration(seconds)}>{seconds}s</button>)}</div></div>
      <button className="site-admin-btn social-reel-create" type="button" onClick={createReel} disabled={reelBusy || !campaign.mediaUrl || !campaign.audioUrl || campaign.mediaType === 'video'}>{reelBusy ? <Loader2 className="spin" size={15}/> : <Play size={15}/>} {reelBusy ? `Creating ${reelDuration}s MP4…` : 'Create Reel With Music'}</button>
      <p className="social-audio-note">This renders on your phone/browser, then uploads the finished MP4 to Supabase. Keep the page open while it creates the Reel. After it finishes, the live preview switches to the video and Metricool receives the MP4 instead of the static image.</p>
    </section>
  </div>;
}
