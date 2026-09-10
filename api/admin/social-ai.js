import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';

const OPENAI_BASE = 'https://api.openai.com/v1';
const COPY_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-5.6-terra';
const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';
const MAX_TRANSCRIBE_BYTES = 24 * 1024 * 1024;

function apiKey() {
  return String(process.env.OPENAI_API_KEY || '').trim();
}

async function openaiJson(path, options = {}) {
  const key = apiKey();
  if (!key) throw new Error('OPENAI_API_KEY is not configured in the Website Admin Vercel project.');
  const response = await fetch(`${OPENAI_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || data?.error || `OpenAI request failed (${response.status})`;
    throw new Error(detail);
  }
  return data;
}

function clean(value, max = 8000) {
  return String(value || '').trim().slice(0, max);
}

function outputText(response = {}) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  return (Array.isArray(response.output) ? response.output : [])
    .flatMap(item => Array.isArray(item?.content) ? item.content : [])
    .map(content => content?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function parseJsonText(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(raw); } catch {}
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1));
  throw new Error('OpenAI returned campaign content in an unexpected format.');
}

function normalizeAnalysis(value = {}) {
  return {
    title: clean(value.title, 180),
    mediaSummary: clean(value.mediaSummary, 1200),
    instagram: clean(value.instagram, 5000),
    facebook: clean(value.facebook, 8000),
    tiktok: clean(value.tiktok, 2200),
    youtubeTitle: clean(value.youtubeTitle, 180),
    youtubeDescription: clean(value.youtubeDescription, 8000),
  };
}

async function transcribeVideo(mediaUrl) {
  const key = apiKey();
  const remote = await fetch(mediaUrl);
  if (!remote.ok) throw new Error(`Unable to load video audio (${remote.status}).`);
  const bytes = await remote.arrayBuffer();
  if (!bytes.byteLength) return { text: '', warning: 'The uploaded video was empty.' };
  if (bytes.byteLength > MAX_TRANSCRIBE_BYTES) {
    return { text: '', warning: 'Video is too large for automatic speech transcription, so the visual frames were analyzed instead.' };
  }

  const mimeType = remote.headers.get('content-type') || 'video/mp4';
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeType }), 'campaign-video.mp4');
  form.append('model', TRANSCRIBE_MODEL);

  const response = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
  if (!response.ok) {
    const detail = data?.error?.message || data?.message || `Transcription failed (${response.status})`;
    throw new Error(detail);
  }
  return { text: clean(data?.text, 12000), warning: '' };
}

async function analyzeMedia(body = {}) {
  const mediaUrl = clean(body.mediaUrl, 12000);
  const mediaType = body.mediaType === 'video' ? 'video' : 'image';
  const platforms = [...new Set((Array.isArray(body.platforms) ? body.platforms : []).map(String).filter(Boolean))];
  const youtubeFormat = body.youtubeFormat === 'short' ? 'short' : 'video';
  const direction = clean(body.direction, 3000);
  const frames = (Array.isArray(body.frames) ? body.frames : []).filter(value => /^data:image\/jpeg;base64,/i.test(String(value || ''))).slice(0, 6);

  if (!mediaUrl) throw new Error('Choose or upload an image or video first.');
  if (!platforms.length) throw new Error('Choose at least one social network to push to.');

  let transcript = '';
  let transcriptWarning = '';
  if (mediaType === 'video') {
    try {
      const result = await transcribeVideo(mediaUrl);
      transcript = result.text;
      transcriptWarning = result.warning;
    } catch (error) {
      transcriptWarning = `Speech transcription was unavailable: ${error.message || String(error)}`;
    }
  }

  const selected = platforms.join(', ');
  const youtubeDirection = platforms.includes('youtube')
    ? youtubeFormat === 'short'
      ? 'YouTube type: SHORT. Write a concise short-form title and compact description suited to a YouTube Short. Use #Shorts only when it reads naturally.'
      : 'YouTube type: VIDEO. Write a searchable tutorial/demo title and a fuller YouTube description that explains what the viewer will learn, includes a clear JustConsignIn call to action, and uses the website when relevant.'
    : '';
  const prompt = `You are the social-media content assistant for JustConsignIn, a Shopify consignment management app. Analyze the supplied ${mediaType} itself and figure out what product feature, workflow, benefit, or message it is actually showing. Then create the social campaign from that evidence.\n\nFacts you may use when they are relevant to what the media shows:\n- JustConsignIn manages consignors and consignment inventory.\n- It tracks items from intake through sale and payout.\n- It can create Shopify products, including from a phone.\n- It supports Shopify POS workflows.\n- It tracks sales, commissions and payouts.\n- It offers a 14-day free trial.\n- Website: https://www.justconsignin.com\n\nSelected networks to create content for: ${selected}.\nOnly create copy for the selected networks. Leave all unselected network fields as empty strings.\n${youtubeDirection ? `${youtubeDirection}\n` : ''}${direction ? `Additional user direction: ${direction}\n` : ''}${transcript ? `Video speech/transcript:\n${transcript}\n` : ''}\nDo not invent app features, statistics, testimonials, or claims that are not visible in the media or listed in the facts above. The campaign title should be concise and based on what the media actually shows. Instagram can use relevant hashtags. Facebook should read naturally. TikTok should be concise and punchy. Follow the selected YouTube type exactly when YouTube is selected.\n\nReturn ONLY valid JSON with exactly these keys:\n{\n  "title": "...",\n  "mediaSummary": "...",\n  "instagram": "...",\n  "facebook": "...",\n  "tiktok": "...",\n  "youtubeTitle": "...",\n  "youtubeDescription": "..."\n}`;

  const visualInputs = mediaType === 'image'
    ? [{ type: 'input_image', image_url: mediaUrl, detail: 'high' }]
    : frames.map(imageUrl => ({ type: 'input_image', image_url: imageUrl, detail: 'auto' }));

  if (mediaType === 'video' && !visualInputs.length) {
    throw new Error('The video could not be sampled for visual analysis on this device.');
  }

  const data = await openaiJson('/responses', {
    method: 'POST',
    body: JSON.stringify({
      model: COPY_MODEL,
      reasoning: { effort: 'low' },
      input: [{
        role: 'user',
        content: [{ type: 'input_text', text: prompt }, ...visualInputs],
      }],
      store: false,
    }),
  });

  const text = outputText(data);
  if (!text) throw new Error('OpenAI did not return campaign content.');
  return {
    analysis: normalizeAnalysis(parseJsonText(text)),
    model: COPY_MODEL,
    transcriptUsed: Boolean(transcript),
    warning: transcriptWarning,
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireWebsiteOwner(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ configured: Boolean(apiKey()), copyModel: COPY_MODEL, transcribeModel: TRANSCRIBE_MODEL });
    }

    const action = String(req.body?.action || '').toLowerCase();
    if (action === 'analyze') return res.status(200).json(await analyzeMedia(req.body || {}));
    return res.status(400).json({ error: 'Unknown AI action' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Social AI request failed' });
  }
}
