import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../_lib/supabase.js';

// Banner Studio: Code Studio banners for any website in the admin (owner only).
// Rows live in code_studio_banners (shared with standalone Code Studio), tagged with site_key.
// See backend/migrations/20261112_code_studio_site_banners.sql.
//
//   GET    ?site=sunwings            list the site's banners
//   GET    ?site=sunwings&id=…        one banner with its slides
//   POST   { site, action: 'create' | 'duplicate' | 'save' | 'place', … }
//   DELETE ?site=sunwings&id=…

// Websites that have Banner Studio switched on. Add a key here (and in the site's admin config) to turn it on.
const SITES = new Set(['sunwings']);
const LANGS = ['en', 'fr', 'us'];
const TABLE = 'code_studio_banners';
const MAX_HTML = 2_000_000;
const MAX_SLIDES = 40;

const isUuid = value => /^[0-9a-f-]{36}$/i.test(String(value || ''));
const isPlacement = value => /^[a-z0-9][a-z0-9-]{0,39}$/.test(String(value || ''));
const cleanTitle = value => String(value ?? '').trim().slice(0, 200) || 'New banner';

async function rest(owner, path, options = {}, fallback = 'Banner Studio request failed.') {
  const response = await supabaseUserRest(owner.accessToken, path, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || data?.error || fallback);
  return data;
}

function firstImage(slides) {
  const slide = Array.isArray(slides) ? slides[0] : null;
  return slide ? String(slide.desktopImage || slide.mobileImage || '') : '';
}

function summary(row) {
  return {
    id: row.id,
    title: row.title,
    placements: row.placements || [],
    slideCount: Array.isArray(row.en) ? row.en.length : 0,
    image: firstImage(row.en),
    saved: Boolean(row.html_en),
    updated_at: row.updated_at,
  };
}

async function listBanners(owner, site) {
  const rows = await rest(owner,
    `${TABLE}?site_key=eq.${site}&select=id,title,placements,en,html_en,updated_at&order=updated_at.desc`,
    { method: 'GET' }, 'Unable to load banners.');
  return (rows || []).map(summary);
}

async function getBanner(owner, site, id) {
  const rows = await rest(owner,
    `${TABLE}?site_key=eq.${site}&id=eq.${id}&select=id,title,placements,en,fr,us,updated_at&limit=1`,
    { method: 'GET' }, 'Unable to load the banner.');
  return rows?.[0] || null;
}

async function insertBanner(owner, row) {
  const rows = await rest(owner, TABLE, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ...row, owner_id: owner.id }),
  }, 'Unable to create the banner.');
  return rows?.[0];
}

async function patchBanner(owner, site, id, values) {
  await rest(owner, `${TABLE}?site_key=eq.${site}&id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
  }, 'Unable to save the banner.');
}

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  const site = String(req.query?.site || req.body?.site || '');
  if (!SITES.has(site)) return res.status(404).json({ error: 'Banner Studio is not switched on for this site.' });

  try {
    if (req.method === 'GET') {
      const id = String(req.query.id || '');
      if (!id) return res.status(200).json({ banners: await listBanners(owner, site) });
      if (!isUuid(id)) return res.status(400).json({ error: 'Invalid banner id.' });
      const banner = await getBanner(owner, site, id);
      if (!banner) return res.status(404).json({ error: 'Banner not found.' });
      return res.status(200).json({ banner });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!isUuid(id)) return res.status(400).json({ error: 'Invalid banner id.' });
      await rest(owner, `${TABLE}?site_key=eq.${site}&id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, 'Unable to delete the banner.');
      return res.status(200).json({ ok: true });
    }

    const body = req.body || {};
    const action = String(body.action || '');

    if (action === 'create') {
      const row = await insertBanner(owner, { site_key: site, title: cleanTitle(body.title), en: [] });
      return res.status(200).json({ banner: summary(row) });
    }

    if (action === 'duplicate') {
      if (!isUuid(body.id)) return res.status(400).json({ error: 'Invalid banner id.' });
      const source = await getBanner(owner, site, body.id);
      if (!source) return res.status(404).json({ error: 'Banner not found.' });
      const html = (await rest(owner, `${TABLE}?site_key=eq.${site}&id=eq.${body.id}&select=html_en,html_fr,html_us&limit=1`, { method: 'GET' }))?.[0] || {};
      // The copy shows nowhere until it is placed; its first save gives it its own HTML id.
      const row = await insertBanner(owner, {
        site_key: site,
        title: cleanTitle(`${source.title} (copy)`),
        en: source.en || [], fr: source.fr, us: source.us,
        html_en: html.html_en || null, html_fr: html.html_fr || null, html_us: html.html_us || null,
      });
      return res.status(200).json({ banner: summary(row) });
    }

    if (action === 'save') {
      if (!isUuid(body.id)) return res.status(400).json({ error: 'Invalid banner id.' });
      const lang = LANGS.includes(body.lang) ? body.lang : 'en';
      const slides = body.data;
      const html = String(body.code || '');
      if (!Array.isArray(slides) || !slides.length || slides.length > MAX_SLIDES) return res.status(400).json({ error: 'A banner needs 1 to 40 slides.' });
      if (!html || html.length > MAX_HTML) return res.status(400).json({ error: 'The banner code is missing or too large.' });
      await patchBanner(owner, site, body.id, { title: cleanTitle(body.title), [lang]: slides, [`html_${lang}`]: html });
      return res.status(200).json({ ok: true });
    }

    if (action === 'place') {
      // { placements: { home: '<banner id>' | '', contact: … } }: one banner per spot.
      const wanted = body.placements && typeof body.placements === 'object' ? body.placements : {};
      const entries = Object.entries(wanted).filter(([spot, id]) => isPlacement(spot) && (!id || isUuid(id)));
      const banners = await listBanners(owner, site);
      const spots = new Set(entries.map(([spot]) => spot));
      for (const banner of banners) {
        const keep = banner.placements.filter(spot => !spots.has(spot));
        const add = entries.filter(([, id]) => id === banner.id).map(([spot]) => spot);
        const next = [...new Set([...keep, ...add])].sort();
        if (next.join() !== [...banner.placements].sort().join()) {
          await rest(owner, `${TABLE}?site_key=eq.${site}&id=eq.${banner.id}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ placements: next }),
          }, 'Unable to save where banners show.');
        }
      }
      return res.status(200).json({ banners: await listBanners(owner, site) });
    }

    return res.status(400).json({ error: 'Unknown Banner Studio action.' });
  } catch (error) {
    console.error('[code-studio] request failed', error);
    return res.status(500).json({ error: error.message || 'Banner Studio request failed.' });
  }
}
