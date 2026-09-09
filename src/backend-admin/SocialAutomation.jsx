import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ExternalLink, Image, Link2, Loader2, Plus, RefreshCw, Send, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from './AdminAuthContext';
import { ensureTikTokCompatibleImage, loadAdminMedia, uploadSocialImage } from './siteAdminService';
import {
  deleteSocialCampaign, disconnectMetricool, loadSocialAutomation, saveSocialCampaign,
  sendCampaignToMetricool, startMetricoolConnection, testMetricoolConnection,
} from './socialAutomationService';
import SocialAiPanel from './SocialAiPanel';
import './socialAutomation.css';

const EMPTY = {
  id: '', title: '', status: 'draft', platforms: ['instagram', 'tiktok'], instagramCaption: '', facebookCaption: '', tiktokCaption: '',
  youtubeTitle: '', youtubeDescription: '', mediaUrl: '', mediaType: 'image', aspectRatio: '1:1',
  audioUrl: '', audioName: '', audioMode: 'none', aiImagePrompt: '', scheduledAt: '',
  autoPublish: false, metricoolPosts: [], lastError: '', createdAt: '', updatedAt: '',
};

const NETWORKS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
];

function dateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function torontoIso(local) {
  if (!local) return '';
  const [date, time] = local.split('T');
  if (!date || !time) return '';
  const probe = new Date(`${date}T${time}:00-04:00`);
  return Number.isNaN(probe.getTime()) ? '' : probe.toISOString();
}

function starterCopy(title) {
  const topic = title || 'Manage consignment inventory with Shopify';
  return {
    instagram: `${topic} with JustConsignIn.\n\nKeep consignors, inventory, Shopify products, POS sales and payouts connected in one workflow — without duplicate entry or spreadsheets.\n\nSee the live demo and start a 14-day free trial at justconsignin.com\n\n#Shopify #ShopifyPOS #Consignment #ConsignmentSoftware #RetailTech`,
    facebook: `${topic} with JustConsignIn.\n\nManage consignors, inventory, Shopify products, POS sales and payouts in one connected workflow. No duplicate entry. No spreadsheet juggling.\n\nSee the live demo and start a 14-day free trial at justconsignin.com`,
    tiktok: `${topic}. JustConsignIn keeps the consignment workflow connected to Shopify from intake to payout. Live demo + 14-day free trial at justconsignin.com. #Shopify #Consignment #ShopifyPOS #RetailTech`,
    youtubeTitle: `${topic} | JustConsignIn`,
    youtubeDescription: `${topic} with JustConsignIn.\n\nManage consignors, inventory, Shopify POS sales and payouts in one workflow.\n\nLive demo: https://www.justconsignin.com\n14-day free trial available.`,
  };
}

export default function SocialAutomation() {
  const { accessToken } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = Boolean(id);
  const [campaigns, setCampaigns] = useState([]);
  const [integration, setIntegration] = useState(null);
  const [media, setMedia] = useState([]);
  const [campaign, setCampaign] = useState(EMPTY);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activePreview, setActivePreview] = useState('instagram');

  const refresh = async () => {
    if (!accessToken) return;
    setLoading(true); setError('');
    try {
      const [social, items] = await Promise.all([loadSocialAutomation(accessToken), loadAdminMedia(accessToken)]);
      setCampaigns(social.campaigns || []); setIntegration(social.integration || null); setMedia(items || []);
      if (editing) {
        const found = (social.campaigns || []).find(item => item.id === id);
        if (found) setCampaign(found); else if (id === 'new') setCampaign({ ...EMPTY, scheduledAt: new Date(Date.now() + 86400000).toISOString() });
        else setError('Campaign not found');
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const refreshMedia = async () => {
    if (!accessToken) return;
    setMedia(await loadAdminMedia(accessToken));
  };

  useEffect(() => { refresh(); }, [accessToken, id]);

  useEffect(() => {
    const metricool = searchParams.get('metricool');
    if (metricool === 'connected') { setMessage('Metricool is connected to the Website Admin.'); setSearchParams({}, { replace: true }); refresh(); }
    if (metricool === 'error') { setError(searchParams.get('message') || 'Metricool connection failed'); setSearchParams({}, { replace: true }); }
  }, []);

  const stats = useMemo(() => ({
    drafts: campaigns.filter(x => x.status === 'draft' || x.status === 'ready').length,
    scheduled: campaigns.filter(x => x.status === 'scheduled').length,
    failed: campaigns.filter(x => x.status === 'failed').length,
  }), [campaigns]);

  const set = (key, value) => setCampaign(current => ({ ...current, [key]: value }));

  const save = async (status = campaign.status) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await saveSocialCampaign(accessToken, { ...campaign, status, scheduledAt: campaign.scheduledAt || new Date(Date.now() + 86400000).toISOString() });
      setCampaign(saved); setMessage('Campaign saved.');
      if (id === 'new') navigate(`/admin/social-automation/${saved.id}`, { replace: true });
      await refresh();
      return saved;
    } catch (err) { setError(err.message); return null; }
    finally { setBusy(false); }
  };

  const send = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      let prepared = {
        ...campaign,
        status: 'ready',
        scheduledAt: campaign.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
      };

      if (prepared.platforms.includes('tiktok') && prepared.mediaType === 'image' && prepared.mediaUrl) {
        setMessage('Preparing a TikTok-compatible JPEG…');
        const mediaUrl = await ensureTikTokCompatibleImage(accessToken, prepared.mediaUrl);
        prepared = { ...prepared, mediaUrl };
      }

      const saved = await saveSocialCampaign(accessToken, prepared);
      setCampaign(saved);
      if (id === 'new') navigate(`/admin/social-automation/${saved.id}`, { replace: true });

      const result = await sendCampaignToMetricool(accessToken, saved.id);
      setCampaign(result.campaign);
      setMessage(result.errors?.length ? `Sent with warnings: ${result.errors.map(x => x.error).join(' | ')}` : 'Campaign sent to Metricool.');
      await refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const connectMetricool = async () => {
    setBusy(true); setError('');
    try {
      const result = await startMetricoolConnection(accessToken);
      if (!result.authUrl) throw new Error('Metricool authorization URL was not returned');
      window.location.href = result.authUrl;
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const testMetricool = async () => {
    setBusy(true); setError(''); setMessage('');
    try { const result = await testMetricoolConnection(accessToken); setMessage(`Metricool connection is working. ${result.toolCount || 0} tools available.`); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect Metricool from this admin?')) return;
    setBusy(true); setError('');
    try { const result = await disconnectMetricool(accessToken); setIntegration(result.integration); setMessage('Metricool disconnected from the backend.'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try {
      const url = await uploadSocialImage(accessToken, file);
      set('mediaUrl', url); set('mediaType', 'image');
      setMessage(String(file.type || '').toLowerCase() === 'image/png' ? 'PNG converted to JPEG, uploaded to Supabase, and selected.' : 'Image uploaded to Supabase and selected.');
      setMedia(await loadAdminMedia(accessToken));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); event.target.value = ''; }
  };

  const remove = async item => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setBusy(true); setError('');
    try { await deleteSocialCampaign(accessToken, item.id); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  if (!editing) return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Social Automation</p><h1>Create here. Send to Metricool.</h1><p>Build posts with your own media, save campaigns in Supabase, and hand approved content to Metricool for publishing.</p></div>
      <button className="site-admin-btn" onClick={() => navigate('/admin/social-automation/new')}><Plus size={15}/> Create Campaign</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}

    <div className="social-stats">
      <div className="site-admin-card social-stat"><small>Backend Metricool</small><strong>{integration?.connected ? 'Connected' : 'Not connected'}</strong><span>{integration?.connected ? 'OAuth MCP connection active' : 'Connect once to send from this admin'}</span></div>
      <div className="site-admin-card social-stat"><small>Drafts</small><strong>{stats.drafts}</strong><span>Still editable</span></div>
      <div className="site-admin-card social-stat"><small>Scheduled</small><strong>{stats.scheduled}</strong><span>Sent to Metricool</span></div>
      <div className="site-admin-card social-stat"><small>Media</small><strong>{media.length}</strong><span>Supabase assets</span></div>
    </div>

    <div className="social-connect-card site-admin-card">
      <div><div className={`social-connection-dot ${integration?.connected ? 'ok' : ''}`}/><div><strong>Metricool backend connection</strong><small>Brand {integration?.brandId || '6893759'} · America/Toronto</small></div></div>
      <div className="site-admin-actions">
        {integration?.connected ? <><button className="site-admin-btn secondary small" onClick={testMetricool} disabled={busy}><RefreshCw size={13}/> Test</button><button className="site-admin-btn secondary small" onClick={disconnect} disabled={busy}>Disconnect</button></> : <button className="site-admin-btn small" onClick={connectMetricool} disabled={busy}>{busy ? <Loader2 className="spin" size={14}/> : <Link2 size={14}/>} Connect Metricool</button>}
      </div>
    </div>

    <div className="site-admin-card social-campaign-list">
      <div className="social-list-head"><strong>Campaigns</strong><span>Instagram · Facebook · TikTok · YouTube</span></div>
      {loading && !campaigns.length ? <div className="site-admin-empty">Loading campaigns…</div> : campaigns.map(item => <div className="social-campaign-row" key={item.id}>
        <div className="social-campaign-thumb">{item.mediaUrl ? <img src={item.mediaUrl} alt=""/> : <Image size={22}/>}</div>
        <div className="social-campaign-copy"><strong>{item.title}</strong><small>{item.platforms.join(' · ') || 'No networks'}{item.scheduledAt ? ` · ${new Date(item.scheduledAt).toLocaleString()}` : ''}</small>{item.lastError && <small className="error-copy">{item.lastError}</small>}</div>
        <span className={`site-admin-status ${item.status}`}>{item.status}</span>
        <div className="site-admin-actions right"><button className="site-admin-btn secondary small" onClick={() => navigate(`/admin/social-automation/${item.id}`)}>Edit</button>{item.metricoolPosts?.[0]?.response?.plannerUrl && <a className="site-admin-btn secondary small" href={item.metricoolPosts[0].response.plannerUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/></a>}<button className="site-admin-btn danger small" onClick={() => remove(item)}><Trash2 size={13}/></button></div>
      </div>)}
      {!loading && !campaigns.length && <div className="site-admin-empty large"><WandSparkles size={30}/><h2>No campaigns yet</h2><p>Create the first campaign and choose an image from the media library.</p></div>}
    </div>
  </>;

  const previewText = activePreview === 'instagram' ? campaign.instagramCaption : activePreview === 'facebook' ? campaign.facebookCaption : activePreview === 'tiktok' ? campaign.tiktokCaption : campaign.youtubeDescription;
  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Social Automation</p><h1>{campaign.id ? 'Edit Campaign' : 'Create Campaign'}</h1><p>Build the content once, then tailor each network before it goes to Metricool.</p></div>
      <button className="site-admin-btn secondary" onClick={() => navigate('/admin/social-automation')}><ArrowLeft size={14}/> Back</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}

    <div className="social-editor-grid">
      <section className="site-admin-card social-editor">
        <label className="social-field"><span>Campaign / topic</span><input value={campaign.title} onChange={e => set('title', e.target.value)} placeholder="Create Shopify products from your phone"/></label>
        <div className="social-field"><span>Publish to</span><div className="social-network-pills">{NETWORKS.map(network => <button type="button" key={network.key} className={campaign.platforms.includes(network.key) ? 'selected' : ''} onClick={() => set('platforms', campaign.platforms.includes(network.key) ? campaign.platforms.filter(x => x !== network.key) : [...campaign.platforms, network.key])}>{network.label}</button>)}</div></div>

        <div className="social-field"><span>Media</span>
          <div className="social-media-editor">
            <div className={`social-media-preview ratio-${campaign.aspectRatio.replace(':','')}`}>{campaign.mediaUrl ? <img src={campaign.mediaUrl} alt="Selected social media"/> : <><Image size={28}/><small>No image selected</small></>}</div>
            <div><div className="site-admin-actions"><button className="site-admin-btn secondary small" type="button" onClick={() => setMediaOpen(true)}>Choose Media</button><label className="site-admin-btn secondary small upload-button"><Upload size={13}/> Upload<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload}/></label></div>
              <div className="social-ratios">{['1:1','4:5','9:16','original'].map(ratio => <button key={ratio} type="button" className={campaign.aspectRatio === ratio ? 'selected' : ''} onClick={() => set('aspectRatio', ratio)}>{ratio}</button>)}</div>
              <small>Images are stored in the same Supabase media library used by your blog. PNG/GIF images are automatically converted to JPEG when needed for TikTok.</small>
            </div>
          </div>
        </div>

        <SocialAiPanel accessToken={accessToken} campaign={campaign} setCampaign={setCampaign} setMessage={setMessage} setError={setError} onMediaRefresh={refreshMedia}/>

        <div className="social-copy-head"><div><strong>Platform copy</strong><small>Edit each network separately.</small></div><button className="site-admin-btn secondary small" type="button" onClick={() => { const copy = starterCopy(campaign.title); setCampaign(current => ({ ...current, instagramCaption: copy.instagram, facebookCaption: copy.facebook, tiktokCaption: copy.tiktok, youtubeTitle: copy.youtubeTitle, youtubeDescription: copy.youtubeDescription })); }}><WandSparkles size={13}/> Starter Copy</button></div>
        <div className="social-tabs">{NETWORKS.map(network => <button type="button" key={network.key} className={activePreview === network.key ? 'active' : ''} onClick={() => setActivePreview(network.key)}>{network.label}</button>)}</div>
        {activePreview === 'instagram' && <label className="social-field"><span>Instagram caption</span><textarea rows="9" value={campaign.instagramCaption} onChange={e => set('instagramCaption', e.target.value)}/></label>}
        {activePreview === 'facebook' && <><label className="social-field"><span>Facebook caption</span><textarea rows="8" value={campaign.facebookCaption} onChange={e => set('facebookCaption', e.target.value)}/></label><div className="site-admin-note">Facebook is available for campaign drafting now. Until the Facebook Page is connected in Metricool, Facebook publishing will return a network-specific warning while the other selected networks can still be sent.</div></>}
        {activePreview === 'tiktok' && <label className="social-field"><span>TikTok caption</span><textarea rows="7" value={campaign.tiktokCaption} onChange={e => set('tiktokCaption', e.target.value)}/></label>}
        {activePreview === 'youtube' && <><label className="social-field"><span>YouTube title</span><input value={campaign.youtubeTitle} onChange={e => set('youtubeTitle', e.target.value)}/></label><label className="social-field"><span>YouTube description</span><textarea rows="8" value={campaign.youtubeDescription} onChange={e => set('youtubeDescription', e.target.value)}/></label><div className="site-admin-note">YouTube publishing requires a video. Image campaigns can still be saved for Instagram, Facebook and TikTok.</div></>}

        <div className="social-schedule-grid"><label className="social-field"><span>Toronto date & time</span><input type="datetime-local" value={dateTimeLocal(campaign.scheduledAt)} onChange={e => set('scheduledAt', torontoIso(e.target.value))}/></label><label className="social-checkbox"><input type="checkbox" checked={campaign.autoPublish} onChange={e => set('autoPublish', e.target.checked)}/><span><strong>Auto publish</strong><small>Off = send to Metricool as a draft for review.</small></span></label></div>
        <div className="social-editor-actions"><button className="site-admin-btn secondary" onClick={() => save()} disabled={busy}>{busy ? <Loader2 className="spin" size={14}/> : null} Save Draft</button><button className="site-admin-btn" onClick={send} disabled={busy}><Send size={14}/> Send to Metricool</button></div>
      </section>

      <aside className="social-editor-side">
        <div className="site-admin-card social-live-card"><h2>Live preview</h2><div className="social-phone-preview"><div className="social-phone-head"><span>J</span><div><strong>JustConsignIn</strong><small>{activePreview}</small></div></div><div className={`social-phone-media ratio-${campaign.aspectRatio.replace(':','')}`}>{campaign.mediaUrl ? <img src={campaign.mediaUrl} alt=""/> : <Image size={28}/>}</div><div className="social-phone-copy"><strong>JustConsignIn</strong> {previewText || 'Your caption will appear here.'}</div></div>{campaign.audioUrl && <div className="site-admin-note" style={{marginTop:10}}>Music attached: <b>{campaign.audioName || 'Uploaded audio'}</b></div>}</div>
        <div className="site-admin-card social-live-card"><h2>Metricool</h2>{integration?.connected ? <><div className="social-connected"><CheckCircle2 size={18}/> Backend connected</div><p>Brand {integration.brandId} · America/Toronto</p><button className="site-admin-btn secondary small" onClick={testMetricool}>Test connection</button></> : <><p>The admin needs its own OAuth connection to Metricool. Your ChatGPT connection remains separate.</p><button className="site-admin-btn small" onClick={connectMetricool}>Connect Metricool</button></>}</div>
      </aside>
    </div>

    {mediaOpen && <div className="social-modal" onClick={() => setMediaOpen(false)}><div className="social-modal-card" onClick={e => e.stopPropagation()}><div className="social-modal-head"><div><strong>Supabase Media Library</strong><small>{media.length} assets</small></div><button onClick={() => setMediaOpen(false)}><X size={18}/></button></div><div className="social-media-grid">{media.map(item => <button key={item.path || item.url} onClick={() => { set('mediaUrl', item.url); set('mediaType', 'image'); setMediaOpen(false); }}><img src={item.url} alt={item.name || ''}/><span>{item.name}</span></button>)}</div></div></div>}
  </>;
}
