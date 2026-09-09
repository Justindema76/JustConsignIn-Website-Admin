import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';

const OPENAI_BASE = 'https://api.openai.com/v1';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const COPY_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-5.6-terra';
const VALID_RATIOS = new Set(['1:1', '4:5', '9:16']);
const VALID_QUALITY = new Set(['low', 'medium', 'high']);

function apiKey() {
  return String(process.env.OPENAI_API_KEY || '').trim();
}

async function openai(path, options = {}) {
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

function imageSize(ratio) {
  return ratio === '1:1' ? '1024x1024' : '1024x1536';
}

function cleanPrompt(value) {
  return String(value || '').trim().slice(0, 5000);
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
  throw new Error('OpenAI returned copy in an unexpected format.');
}

function normalizeCopy(value = {}) {
  return {
    instagram: String(value.instagram || '').trim(),
    facebook: String(value.facebook || '').trim(),
    tiktok: String(value.tiktok || '').trim(),
    youtubeTitle: String(value.youtubeTitle || '').trim(),
    youtubeDescription: String(value.youtubeDescription || '').trim(),
    imagePrompt: String(value.imagePrompt || '').trim(),
  };
}

async function generateImage(body = {}) {
  const ratio = VALID_RATIOS.has(body.ratio) ? body.ratio : '4:5';
  const quality = VALID_QUALITY.has(body.quality) ? body.quality : 'medium';
  const prompt = cleanPrompt(body.prompt);
  if (!prompt) throw new Error('Enter an image prompt first.');

  const brandContext = [
    'Create a polished social-media marketing image for JustConsignIn, a Shopify consignment management app.',
    'The product helps stores manage consignors, inventory, Shopify product creation, Shopify POS sales, commissions and payouts.',
    'Brand direction: modern, clean, practical retail software, professional and credible, not stock-photo generic.',
    'Do not invent app screenshots, interface labels, statistics, customer logos or claims that were not requested.',
    'If text is included, keep it short and legible. Prefer a strong visual composition over lots of text.',
    `Compose for a ${ratio} social image with generous safe margins. The app will crop the generated portrait to the exact final social ratio.`,
    `User request: ${prompt}`,
  ].join('\n');

  const data = await openai('/images/generations', {
    method: 'POST',
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt: brandContext,
      size: imageSize(ratio),
      quality,
      output_format: 'jpeg',
      output_compression: 90,
      n: 1,
    }),
  });

  const item = data?.data?.[0] || {};
  let base64 = item.b64_json || item.b64 || '';
  if (!base64 && item.url) {
    const remote = await fetch(item.url);
    if (!remote.ok) throw new Error('OpenAI generated an image but it could not be downloaded.');
    base64 = Buffer.from(await remote.arrayBuffer()).toString('base64');
  }
  if (!base64) throw new Error('OpenAI did not return image data.');

  return {
    base64,
    mimeType: 'image/jpeg',
    model: IMAGE_MODEL,
    ratio,
    size: imageSize(ratio),
    quality,
    revisedPrompt: item.revised_prompt || '',
  };
}

async function generateCopy(body = {}) {
  const title = cleanPrompt(body.title || 'JustConsignIn social campaign');
  const direction = cleanPrompt(body.direction || '');
  const platforms = Array.isArray(body.platforms) ? body.platforms.map(String).filter(Boolean) : [];

  const prompt = `You write social marketing copy for JustConsignIn, a Shopify consignment management app.\n\nFacts you may use:\n- Create and manage consignors.\n- Track consignment inventory from intake through sale and payout.\n- Create Shopify products from the app, including from a phone.\n- Works with Shopify POS workflows.\n- Tracks sales, commissions and payouts.\n- 14-day free trial.\n- Website: https://www.justconsignin.com\n\nCampaign topic: ${title}\nSelected networks: ${platforms.join(', ') || 'Instagram, Facebook, TikTok'}\nAdditional direction: ${direction || 'Sell the benefit clearly without hype.'}\n\nCreate platform-specific copy. Do not use the exact same wording for every platform. Do not claim features outside the facts above. Keep TikTok concise. Instagram may use a short group of relevant hashtags. Facebook should read naturally and not be hashtag-heavy. YouTube should include a useful title and description. Also create one concise image-generation prompt for a matching promotional image.\n\nReturn ONLY valid JSON with exactly these keys:\n{\n  "instagram": "...",\n  "facebook": "...",\n  "tiktok": "...",\n  "youtubeTitle": "...",\n  "youtubeDescription": "...",\n  "imagePrompt": "..."\n}`;

  const data = await openai('/responses', {
    method: 'POST',
    body: JSON.stringify({
      model: COPY_MODEL,
      reasoning: { effort: 'low' },
      input: prompt,
      store: false,
    }),
  });
  const text = outputText(data);
  if (!text) throw new Error('OpenAI did not return campaign copy.');
  return { copy: normalizeCopy(parseJsonText(text)), model: COPY_MODEL };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireWebsiteOwner(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ configured: Boolean(apiKey()), imageModel: IMAGE_MODEL, copyModel: COPY_MODEL });
    }

    const action = String(req.body?.action || '').toLowerCase();
    if (action === 'image') return res.status(200).json(await generateImage(req.body || {}));
    if (action === 'copy') return res.status(200).json(await generateCopy(req.body || {}));
    return res.status(400).json({ error: 'Unknown AI action' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Social AI request failed' });
  }
}
