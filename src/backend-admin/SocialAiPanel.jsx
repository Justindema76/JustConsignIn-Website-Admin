import { useEffect, useState } from 'react';
import { Film, Loader2, Music2, Play, Sparkles, Trash2, Upload } from 'lucide-react';
import { uploadSocialAudio, uploadSocialVideo } from './siteAdminService';
import { generateSocialCopy, getSocialAiStatus } from './socialAiService';
import { createImageMusicReel } from './socialReelService';
import './socialAiPanel.css';

const REEL_DURATIONS = [5, 8, 10, 15];

export default function SocialAiPanel({ accessToken, campaign, setCampaign, setMessage, setError }) {
  const [configured, setConfigured] = useState(null);
  const [direction, setDirection] = useState('');
  const [copyBusy, setCopyBusy] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [reelBusy, setReelBusy] = useState(false);
  const [reelDuration, setReelDuration] = useState(10);

  useEffect(() => {
    if (!accessToken) return;
    getSocialAiStatus(accessToken).then(result => setConfigured(Boolean(result.configured))).catch(() => setConfigured(false));
  }, [accessToken]);

  const patch = values => setCampaign(current => ({ ...current, ...values }));

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
      patch({
        instagramCaption: copy.instagram || campaign.instagramCaption,
        facebookCaption: copy.facebook || campaign.facebookCaption,
        tiktokCaption: copy.tiktok || campaign.tiktokCaption,
        youtubeTitle: copy.youtubeTitle || campaign.youtubeTitle,
        youtubeDescription: copy.youtubeDescription || campaign.youtubeDescription,
      });
      setMessage('AI created platform-specific copy for this campaign.');
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
    if (!campaign.mediaUrl) { setError('Choose an image first.'); return; }
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
      <div><strong><Sparkles size={15}/> Content Assistant</strong><small>Write the campaign copy, attach music, and build a simple Reel.</small></div>
      <span className={`social-ai-status ${configured ? 'ok' : configured === false ? 'off' : ''}`}>{configured === null ? 'Checking AI…' : configured ? 'OpenAI ready' : 'OpenAI key needed'}</span>
    </div>

    <div className="social-ai-grid" style={{ gridTemplateColumns: '1fr' }}>
      <section className="social-ai-card">
        <div className="social-ai-title"><Sparkles size={17}/><div><strong>Write the post</strong><small>Creates different copy for Instagram, Facebook, TikTok and YouTube from the campaign topic above.</small></div></div>
        <label className="social-field"><span>Optional direction</span><textarea rows="4" value={direction} onChange={e => setDirection(e.target.value)} placeholder="Example: Focus on creating Shopify products from your phone. Make it sales-focused but not cheesy."/></label>
        <button className="site-admin-btn social-ai-primary" type="button" onClick={createCopy} disabled={copyBusy || configured === false}>{copyBusy ? <Loader2 className="spin" size={15}/> : <Sparkles size={15}/>} {copyBusy ? 'Writing copy…' : 'Generate All Captions'}</button>
        {configured === false && <p className="social-audio-note"><b>Optional AI setup:</b> add <code>OPENAI_API_KEY</code> to the Website Admin Vercel environment if you want one-click campaign copy.</p>}
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
      <div className="social-ai-title"><Film size={18}/><div><strong>Create Reel With Music</strong><small>Combines the selected image and uploaded music into a 9:16 MP4 for Instagram Reels/TikTok.</small></div></div>
      <div className="social-reel-summary">
        <span className={campaign.mediaUrl && campaign.mediaType === 'image' ? 'ready' : ''}>{campaign.mediaType === 'image' && campaign.mediaUrl ? '✓ Image ready' : campaign.mediaType === 'video' ? 'Video currently selected' : 'Image needed'}</span>
        <span className={campaign.audioUrl ? 'ready' : ''}>{campaign.audioUrl ? '✓ Music ready' : 'Music needed'}</span>
      </div>
      <div className="social-reel-duration"><strong>Length</strong><div>{REEL_DURATIONS.map(seconds => <button type="button" key={seconds} className={reelDuration === seconds ? 'selected' : ''} onClick={() => setReelDuration(seconds)}>{seconds}s</button>)}</div></div>
      <button className="site-admin-btn social-reel-create" type="button" onClick={createReel} disabled={reelBusy || !campaign.mediaUrl || !campaign.audioUrl || campaign.mediaType === 'video'}>{reelBusy ? <Loader2 className="spin" size={15}/> : <Play size={15}/>} {reelBusy ? `Creating ${reelDuration}s MP4…` : 'Create Reel With Music'}</button>
      <p className="social-audio-note">This renders on your phone/browser, then uploads the finished MP4 to Supabase. Keep the page open while it creates the Reel.</p>
    </section>
  </div>;
}
