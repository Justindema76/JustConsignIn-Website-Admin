import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Link2, Loader2, Plus, RefreshCw, Send } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import MediaPreview from '../../components/media/MediaPreview';
import NetworkSelector from '../../components/social/NetworkSelector';
import { ensureTikTokCompatibleImage, loadAdminMedia, uploadSocialImage } from '../../services/siteAdminService';
import {
  deleteSocialCampaign,
  disconnectMetricool,
  loadSocialAutomation,
  saveSocialCampaign,
  sendCampaignToMetricool,
  startMetricoolConnection,
  testMetricoolConnection,
} from '../../services/socialAutomationService';
import CampaignList from './components/CampaignList';
import CampaignMediaEditor from './components/CampaignMediaEditor';
import MediaPickerModal from './components/MediaPickerModal';
import PlatformCopyEditor from './components/PlatformCopyEditor';
import SocialAssistant from './SocialAssistant';
import { EMPTY_CAMPAIGN, dateTimeLocal, starterCopy, torontoIso } from './socialCampaignConfig';

export default function SocialAutomation() {
  const { accessToken } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = Boolean(id);
  const [campaigns, setCampaigns] = useState([]);
  const [integration, setIntegration] = useState(null);
  const [media, setMedia] = useState([]);
  const [campaign, setCampaign] = useState(EMPTY_CAMPAIGN);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activePreview, setActivePreview] = useState('instagram');

  const refresh = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [social, items] = await Promise.all([
        loadSocialAutomation(accessToken),
        loadAdminMedia(accessToken),
      ]);
      const nextCampaigns = social.campaigns || [];
      setCampaigns(nextCampaigns);
      setIntegration(social.integration || null);
      setMedia(items || []);
      if (editing) {
        const found = nextCampaigns.find(item => item.id === id);
        if (found) setCampaign(found);
        else if (id === 'new') setCampaign({ ...EMPTY_CAMPAIGN, scheduledAt: new Date(Date.now() + 86400000).toISOString() });
        else setError('Campaign not found');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [accessToken, id]);

  useEffect(() => {
    const metricool = searchParams.get('metricool');
    if (metricool === 'connected') {
      setMessage('Metricool is connected to the Website Admin.');
      setSearchParams({}, { replace: true });
      refresh();
    }
    if (metricool === 'error') {
      setError(searchParams.get('message') || 'Metricool connection failed');
      setSearchParams({}, { replace: true });
    }
  }, []);

  const stats = useMemo(() => ({
    drafts: campaigns.filter(item => item.status === 'draft' || item.status === 'ready').length,
    scheduled: campaigns.filter(item => item.status === 'scheduled').length,
  }), [campaigns]);

  const setField = (key, value) => setCampaign(current => ({ ...current, [key]: value }));

  const save = async (status = campaign.status) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const saved = await saveSocialCampaign(accessToken, {
        ...campaign,
        status,
        scheduledAt: campaign.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
      });
      setCampaign(saved);
      setMessage('Campaign saved.');
      if (id === 'new') navigate(`/admin/social-automation/${saved.id}`, { replace: true });
      await refresh();
      return saved;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!campaign.platforms?.length) {
      setError('Choose at least one social network to publish to.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      let prepared = {
        ...campaign,
        status: 'ready',
        scheduledAt: campaign.scheduledAt || new Date(Date.now() + 86400000).toISOString(),
      };
      if (prepared.platforms.includes('tiktok') && prepared.mediaType === 'image' && prepared.mediaUrl) {
        setMessage('Preparing a TikTok-compatible JPEG…');
        prepared = { ...prepared, mediaUrl: await ensureTikTokCompatibleImage(accessToken, prepared.mediaUrl) };
      }
      const saved = await saveSocialCampaign(accessToken, prepared);
      setCampaign(saved);
      if (id === 'new') navigate(`/admin/social-automation/${saved.id}`, { replace: true });
      const result = await sendCampaignToMetricool(accessToken, saved.id);
      setCampaign(result.campaign);
      setMessage(result.errors?.length
        ? `Sent with warnings: ${result.errors.map(item => item.error).join(' | ')}`
        : 'Campaign sent to Metricool.');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const connectMetricool = async () => {
    setBusy(true); setError('');
    try {
      const result = await startMetricoolConnection(accessToken);
      if (!result.authUrl) throw new Error('Metricool authorization URL was not returned');
      window.location.href = result.authUrl;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const testMetricool = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await testMetricoolConnection(accessToken);
      setMessage(`Metricool connection is working. ${result.toolCount || 0} tools available.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect Metricool from this admin?')) return;
    setBusy(true); setError('');
    try {
      const result = await disconnectMetricool(accessToken);
      setIntegration(result.integration);
      setMessage('Metricool disconnected from the backend.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try {
      const mediaUrl = await uploadSocialImage(accessToken, file);
      setCampaign(current => ({ ...current, mediaUrl, mediaType: 'image' }));
      setMessage(String(file.type || '').toLowerCase() === 'image/png'
        ? 'PNG converted to JPEG, uploaded to Supabase, and selected.'
        : 'Image uploaded to Supabase and selected.');
      setMedia(await loadAdminMedia(accessToken));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const removeCampaign = async item => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setBusy(true); setError('');
    try {
      await deleteSocialCampaign(accessToken, item.id);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!editing) return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Social Automation</p><h1>Create here. Send to Metricool.</h1><p>Build posts with your own media, save campaigns in Supabase, and hand approved content to Metricool for publishing.</p></div>
      <button className="site-admin-btn" type="button" onClick={() => navigate('/admin/social-automation/new')}><Plus size={15}/> Create Campaign</button>
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
        {integration?.connected
          ? <><button className="site-admin-btn secondary small" onClick={testMetricool} disabled={busy}><RefreshCw size={13}/> Test</button><button className="site-admin-btn secondary small" onClick={disconnect} disabled={busy}>Disconnect</button></>
          : <button className="site-admin-btn small" onClick={connectMetricool} disabled={busy}>{busy ? <Loader2 className="spin" size={14}/> : <Link2 size={14}/>} Connect Metricool</button>}
      </div>
    </div>

    <CampaignList campaigns={campaigns} loading={loading} busy={busy} onDelete={removeCampaign}/>
  </>;

  const previewText = activePreview === 'instagram'
    ? campaign.instagramCaption
    : activePreview === 'facebook'
      ? campaign.facebookCaption
      : activePreview === 'tiktok'
        ? campaign.tiktokCaption
        : campaign.youtubeDescription;

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Social Automation</p><h1>{campaign.id ? 'Edit Campaign' : 'Create Campaign'}</h1><p>Choose the media and networks, build the content, then hand the approved campaign to Metricool.</p></div>
      <button className="site-admin-btn secondary" type="button" onClick={() => navigate('/admin/social-automation')}><ArrowLeft size={14}/> Back</button>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}

    <div className="social-editor-grid">
      <section className="site-admin-card social-editor">
        <label className="social-field"><span>Campaign / topic</span><input value={campaign.title} onChange={e => setField('title', e.target.value)} placeholder="Create Shopify products from your phone"/></label>
        <div className="social-field"><span>Publish to</span><NetworkSelector value={campaign.platforms} onChange={platforms => setField('platforms', platforms)}/></div>

        <CampaignMediaEditor
          campaign={campaign}
          busy={busy}
          onChooseMedia={() => setMediaOpen(true)}
          onUploadImage={uploadImage}
          onRatioChange={ratio => setField('aspectRatio', ratio)}
        />

        <SocialAssistant accessToken={accessToken} campaign={campaign} setCampaign={setCampaign} setMessage={setMessage} setError={setError}/>

        <PlatformCopyEditor
          campaign={campaign}
          activePlatform={activePreview}
          onActivePlatform={setActivePreview}
          onChange={setField}
          onStarterCopy={() => {
            const copy = starterCopy(campaign.title);
            setCampaign(current => ({
              ...current,
              instagramCaption: copy.instagram,
              facebookCaption: copy.facebook,
              tiktokCaption: copy.tiktok,
              youtubeTitle: copy.youtubeTitle,
              youtubeDescription: copy.youtubeDescription,
            }));
          }}
        />

        <div className="social-schedule-grid">
          <label className="social-field"><span>Toronto date & time</span><input type="datetime-local" value={dateTimeLocal(campaign.scheduledAt)} onChange={e => setField('scheduledAt', torontoIso(e.target.value))}/></label>
          <label className="social-checkbox"><input type="checkbox" checked={campaign.autoPublish} onChange={e => setField('autoPublish', e.target.checked)}/><span><strong>Auto publish</strong><small>Off = send to Metricool as a draft for review.</small></span></label>
        </div>
        <div className="social-editor-actions">
          <button className="site-admin-btn secondary" type="button" onClick={() => save()} disabled={busy}>{busy ? <Loader2 className="spin" size={14}/> : null} Save Draft</button>
          <button className="site-admin-btn" type="button" onClick={send} disabled={busy}><Send size={14}/> Send to Metricool</button>
        </div>
      </section>

      <aside className="social-editor-side">
        <div className="site-admin-card social-live-card">
          <h2>Live preview</h2>
          <div className="social-phone-preview">
            <div className="social-phone-head"><span>J</span><div><strong>JustConsignIn</strong><small>{activePreview}</small></div></div>
            <div className={`social-phone-media ratio-${campaign.aspectRatio.replace(':','')}`}><MediaPreview url={campaign.mediaUrl} type={campaign.mediaType}/></div>
            <div className="social-phone-copy"><strong>JustConsignIn</strong> {previewText || 'Your caption will appear here.'}</div>
          </div>
          {campaign.audioUrl && <div className="site-admin-note" style={{marginTop:10}}>Music attached: <b>{campaign.audioName || 'Uploaded audio'}</b>{campaign.mediaType === 'video' ? ' · embedded in Reel' : ''}</div>}
        </div>
        <div className="site-admin-card social-live-card">
          <h2>Metricool</h2>
          {integration?.connected
            ? <><div className="social-connected"><CheckCircle2 size={18}/> Backend connected</div><p>Brand {integration.brandId} · America/Toronto</p><button className="site-admin-btn secondary small" type="button" onClick={testMetricool}>Test connection</button></>
            : <><p>The admin needs its own OAuth connection to Metricool. Your ChatGPT connection remains separate.</p><button className="site-admin-btn small" type="button" onClick={connectMetricool}>Connect Metricool</button></>}
        </div>
      </aside>
    </div>

    {mediaOpen && <MediaPickerModal
      items={media}
      onClose={() => setMediaOpen(false)}
      onSelect={item => {
        setCampaign(current => ({ ...current, mediaUrl: item.url, mediaType: item.mediaType || 'image' }));
        setMediaOpen(false);
      }}
    />}
  </>;
}
