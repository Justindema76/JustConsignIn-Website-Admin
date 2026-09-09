import { supabaseUserRest } from '../_lib/supabase.js';
import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import {
  beginMetricoolOAuth,
  callMetricoolTool,
  getMetricoolTools,
  metricoolToolText,
  refreshMetricoolOAuth,
} from '../_lib/metricoolMcp.js';

const ALLOWED_STATUS = new Set(['draft', 'ready', 'scheduled', 'published', 'failed']);
const ALLOWED_PLATFORMS = new Set(['instagram', 'tiktok', 'youtube', 'facebook']);
const ALLOWED_RATIO = new Set(['1:1', '4:5', '9:16', 'original']);
const ALLOWED_AUDIO_MODE = new Set(['none', 'uploaded', 'add-later']);
const CALLBACK_COOKIE = 'jci_metricool_callback_session';

function normalizeCampaign(row = {}) {
  return {
    id: row.id || '', title: row.title || '', status: row.status || 'draft',
    platforms: Array.isArray(row.platforms) ? row.platforms : [],
    instagramCaption: row.instagram_caption || '', facebookCaption: row.facebook_caption || '', tiktokCaption: row.tiktok_caption || '',
    youtubeTitle: row.youtube_title || '', youtubeDescription: row.youtube_description || '',
    mediaUrl: row.media_url || '', mediaType: row.media_type || 'image', aspectRatio: row.aspect_ratio || '1:1',
    audioUrl: row.audio_url || '', audioName: row.audio_name || '', audioMode: row.audio_mode || 'none',
    aiImagePrompt: row.ai_image_prompt || '',
    scheduledAt: row.scheduled_at || '', autoPublish: Boolean(row.auto_publish),
    metricoolPosts: Array.isArray(row.metricool_posts) ? row.metricool_posts : [], lastError: row.last_error || '',
    createdAt: row.created_at || '', updatedAt: row.updated_at || '',
  };
}

function cleanCampaign(input = {}) {
  const platforms = [...new Set((Array.isArray(input.platforms) ? input.platforms : []).map(String).filter(x => ALLOWED_PLATFORMS.has(x)))];
  const mediaType = ['image', 'video', 'none'].includes(input.mediaType) ? input.mediaType : 'image';
  const scheduled = input.scheduledAt ? new Date(input.scheduledAt) : null;
  return {
    title: String(input.title || '').trim(),
    status: ALLOWED_STATUS.has(input.status) ? input.status : 'draft',
    platforms,
    instagram_caption: String(input.instagramCaption || ''),
    facebook_caption: String(input.facebookCaption || ''),
    tiktok_caption: String(input.tiktokCaption || ''),
    youtube_title: String(input.youtubeTitle || ''),
    youtube_description: String(input.youtubeDescription || ''),
    media_url: String(input.mediaUrl || '').trim(),
    media_type: mediaType,
    aspect_ratio: ALLOWED_RATIO.has(input.aspectRatio) ? input.aspectRatio : '1:1',
    audio_url: String(input.audioUrl || '').trim(),
    audio_name: String(input.audioName || '').trim().slice(0, 255),
    audio_mode: ALLOWED_AUDIO_MODE.has(input.audioMode) ? input.audioMode : 'none',
    ai_image_prompt: String(input.aiImagePrompt || '').trim().slice(0, 5000),
    scheduled_at: scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled.toISOString() : null,
    auto_publish: Boolean(input.autoPublish),
    updated_at: new Date().toISOString(),
  };
}

async function readIntegration(userToken) {
  const response = await supabaseUserRest(userToken, 'social_integrations?provider=eq.metricool&select=*&limit=1', { method: 'GET' });
  const rows = await response.json();
  if (!response.ok) throw new Error(rows?.message || 'Unable to load Metricool connection');
  return rows[0] || null;
}

function publicIntegration(row) {
  return {
    provider: 'metricool', connected: Boolean(row?.connected), accountLabel: row?.account_label || 'JustConsignIn',
    userId: row?.external_user_id || '5309805', brandId: row?.external_brand_id || '6893759',
    connectedAt: row?.connected_at || '', updatedAt: row?.updated_at || '', metadata: row?.metadata || {},
  };
}

async function writeIntegration(userToken, payload) {
  const response = await supabaseUserRest(userToken, 'social_integrations?on_conflict=provider', {
    method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || 'Unable to save Metricool connection');
  return data?.[0] || payload;
}

async function loadCampaign(userToken, id) {
  const response = await supabaseUserRest(userToken, `social_campaigns?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, { method: 'GET' });
  const rows = await response.json();
  if (!response.ok) throw new Error(rows?.message || 'Unable to load campaign');
  if (!rows[0]) throw new Error('Campaign not found');
  return rows[0];
}

function torontoLocal(iso) {
  const date = new Date(iso || Date.now() + 3600000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function toolName(tools = []) {
  const names = tools.map(tool => tool?.name).filter(Boolean);
  return names.find(name => name === 'createScheduledPost')
    || names.find(name => name === 'create_scheduled_post')
    || names.find(name => name === 'post_schedule_post')
    || names.find(name => /create.*scheduled.*post/i.test(name) && !/review/i.test(name))
    || names.find(name => /schedule.*post/i.test(name) && !/review/i.test(name));
}

function networkInfo(campaign, network) {
  const base = {
    autoPublish: Boolean(campaign.auto_publish), draft: !campaign.auto_publish,
    descendants: [], firstCommentText: '', hasNotReadNotes: false,
    media: campaign.media_url ? [campaign.media_url] : [],
    mediaAltText: campaign.media_url ? ['JustConsignIn social media graphic'] : [],
    providers: [{ network }],
    publicationDate: { dateTime: torontoLocal(campaign.scheduled_at), timezone: 'America/Toronto' },
    shortener: false, smartLinkData: { ids: [] },
  };
  if (network === 'instagram') return { ...base, text: campaign.instagram_caption, instagramData: { type: 'POST', collaborators: [], showReelOnFeed: true, isAiGenerated: false } };
  if (network === 'facebook') return { ...base, text: campaign.facebook_caption || campaign.instagram_caption, facebookData: { type: 'POST', title: '' } };
  if (network === 'tiktok') return { ...base, text: campaign.tiktok_caption, tiktokData: { disableComment: false, disableDuet: false, disableStitch: false, privacyOption: 'PUBLIC_TO_EVERYONE', commercialContentThirdParty: false, commercialContentOwnBrand: true, title: campaign.title, autoAddMusic: false, photoCoverIndex: 0, isAigc: false } };
  if (network === 'youtube') return { ...base, text: campaign.youtube_description, youtubeData: { title: campaign.youtube_title || campaign.title, type: 'short', privacy: 'public', tags: ['JustConsignIn', 'Shopify', 'Consignment'], madeForKids: false, isAiGeneratedContent: false } };
  return base;
}

function validateForNetwork(campaign, network) {
  if (['instagram', 'tiktok'].includes(network) && !campaign.media_url) throw new Error(`${network} requires an image or video`);
  if (network === 'youtube' && campaign.media_type !== 'video') throw new Error('YouTube publishing requires a video');
  if (network === 'instagram' && !campaign.instagram_caption) throw new Error('Instagram caption is empty');
  if (network === 'facebook' && !(campaign.facebook_caption || campaign.instagram_caption)) throw new Error('Facebook caption is empty');
  if (network === 'tiktok' && !campaign.tiktok_caption) throw new Error('TikTok caption is empty');
}

async function saveCredentials(userToken, row, credentials) {
  return writeIntegration(userToken, {
    provider: 'metricool', connected: true,
    account_label: row?.account_label || 'JustConsignIn', external_user_id: row?.external_user_id || '5309805', external_brand_id: row?.external_brand_id || '6893759',
    credentials,
    secret_ciphertext: '', secret_iv: '', secret_tag: '',
    metadata: { ...(row?.metadata || {}), timezone: 'America/Toronto', mcp_url: 'https://ai.metricool.com/mcp', oauth: true },
    connected_at: row?.connected_at || new Date().toISOString(), updated_at: new Date().toISOString(),
  });
}

function callbackCookie(token, secure) {
  return `${CALLBACK_COOKIE}=${encodeURIComponent(token)}; Max-Age=1200; Path=/api/admin/metricool-callback; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireWebsiteOwner(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const [campaignResponse, integration] = await Promise.all([
        supabaseUserRest(user.accessToken, 'social_campaigns?select=*&order=scheduled_at.asc.nullslast,created_at.desc', { method: 'GET' }),
        readIntegration(user.accessToken),
      ]);
      const campaigns = await campaignResponse.json();
      if (!campaignResponse.ok) throw new Error(campaigns?.message || 'Unable to load social campaigns');
      return res.status(200).json({ campaigns: campaigns.map(normalizeCampaign), integration: publicIntegration(integration) });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing campaign id' });
      const response = await supabaseUserRest(user.accessToken, `social_campaigns?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (!response.ok) throw new Error('Unable to delete campaign');
      return res.status(200).json({ ok: true });
    }

    const action = String(req.body?.action || 'save').toLowerCase();

    if (action === 'save') {
      const input = req.body?.campaign || {};
      const payload = cleanCampaign(input);
      if (!payload.title) return res.status(400).json({ error: 'Campaign title is required' });
      const id = String(input.id || '').trim();
      const response = await supabaseUserRest(user.accessToken, id ? `social_campaigns?id=eq.${encodeURIComponent(id)}` : 'social_campaigns', {
        method: id ? 'PATCH' : 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Unable to save campaign');
      return res.status(200).json({ campaign: normalizeCampaign(Array.isArray(data) ? data[0] : data) });
    }

    if (action === 'metricool-start') {
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
      const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
      if (!host) throw new Error('Unable to determine admin hostname');
      const callbackUrl = `${proto}://${host}/api/admin/metricool-callback`;
      const { authUrl, transaction } = await beginMetricoolOAuth({ callbackUrl });
      const row = await readIntegration(user.accessToken);
      await writeIntegration(user.accessToken, {
        provider: 'metricool', connected: false,
        account_label: row?.account_label || 'JustConsignIn', external_user_id: row?.external_user_id || '5309805', external_brand_id: row?.external_brand_id || '6893759',
        credentials: { oauthTransaction: transaction },
        secret_ciphertext: '', secret_iv: '', secret_tag: '',
        metadata: { ...(row?.metadata || {}), timezone: 'America/Toronto', mcp_url: 'https://ai.metricool.com/mcp', oauth_state: transaction.state },
        connected_at: null, updated_at: new Date().toISOString(),
      });
      res.setHeader('Set-Cookie', callbackCookie(user.accessToken, proto === 'https'));
      return res.status(200).json({ authUrl });
    }

    if (action === 'metricool-disconnect') {
      const row = await readIntegration(user.accessToken);
      const saved = await writeIntegration(user.accessToken, {
        provider: 'metricool', connected: false, account_label: row?.account_label || 'JustConsignIn',
        external_user_id: row?.external_user_id || '5309805', external_brand_id: row?.external_brand_id || '6893759',
        credentials: {}, secret_ciphertext: '', secret_iv: '', secret_tag: '',
        metadata: { ...(row?.metadata || {}), oauth_state: null }, connected_at: null, updated_at: new Date().toISOString(),
      });
      return res.status(200).json({ integration: publicIntegration(saved) });
    }

    if (action === 'metricool-test') {
      const row = await readIntegration(user.accessToken);
      if (!row?.connected) return res.status(400).json({ error: 'Metricool is not connected to this admin yet' });
      let credentials = row.credentials || {};
      if (!credentials.accessToken) return res.status(400).json({ error: 'Metricool authorization is incomplete. Reconnect Metricool.' });
      if (credentials.expiresAt && credentials.expiresAt < Date.now() + 60000 && credentials.refreshToken) {
        credentials = await refreshMetricoolOAuth(credentials);
        await saveCredentials(user.accessToken, row, credentials);
      }
      const { tools } = await getMetricoolTools(credentials.accessToken);
      return res.status(200).json({ ok: true, toolCount: tools.length, tools: tools.map(tool => tool.name) });
    }

    if (action === 'send') {
      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing campaign id' });
      const [campaign, row] = await Promise.all([loadCampaign(user.accessToken, id), readIntegration(user.accessToken)]);
      if (!row?.connected) return res.status(400).json({ error: 'Connect Metricool to the backend first.' });
      if (!campaign.platforms?.length) return res.status(400).json({ error: 'Choose at least one social network' });
      if (!campaign.scheduled_at) return res.status(400).json({ error: 'Choose a schedule date and time' });

      let credentials = row.credentials || {};
      if (!credentials.accessToken) return res.status(400).json({ error: 'Metricool authorization is incomplete. Reconnect Metricool.' });
      if (credentials.expiresAt && credentials.expiresAt < Date.now() + 60000 && credentials.refreshToken) {
        credentials = await refreshMetricoolOAuth(credentials);
        await saveCredentials(user.accessToken, row, credentials);
      }
      const { tools } = await getMetricoolTools(credentials.accessToken);
      const createTool = toolName(tools);
      if (!createTool) throw new Error('Metricool scheduling tool was not found');
      const brandId = row.external_brand_id || '6893759';
      const results = [];
      const errors = [];

      for (const network of campaign.platforms) {
        try {
          validateForNetwork(campaign, network);
          const info = networkInfo(campaign, network);
          const tool = tools.find(item => item.name === createTool) || {};
          const props = tool.inputSchema?.properties || {};
          const args = {
            date: campaign.scheduled_at,
            ...(props.blog_id ? { blog_id: Number(brandId) } : { blogId: String(brandId) }),
            info,
          };
          const result = await callMetricoolTool(credentials.accessToken, createTool, args);
          const text = metricoolToolText(result);
          let parsed = null;
          try { parsed = text ? JSON.parse(text) : null; } catch {}
          results.push({ network, tool: createTool, response: parsed || text || result });
        } catch (error) { errors.push({ network, error: error.message || String(error) }); }
      }

      const status = results.length ? 'scheduled' : 'failed';
      const update = await supabaseUserRest(user.accessToken, `social_campaigns?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status, metricool_posts: results, last_error: errors.map(e => `${e.network}: ${e.error}`).join(' | '), updated_at: new Date().toISOString() }),
      });
      const updated = await update.json();
      if (!update.ok) throw new Error(updated?.message || 'Metricool result could not be saved');
      if (!results.length) return res.status(502).json({ error: errors.map(e => `${e.network}: ${e.error}`).join(' | '), campaign: normalizeCampaign(updated[0]) });
      return res.status(200).json({ campaign: normalizeCampaign(updated[0]), results, errors });
    }

    return res.status(400).json({ error: 'Unknown social automation action' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Social automation request failed' });
  }
}
