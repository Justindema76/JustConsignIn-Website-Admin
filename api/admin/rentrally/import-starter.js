import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { SITE_KEY, TABLES, parseSupabase } from './_lib/content.js';
import { STARTER_CATEGORIES, STARTER_PACKAGES, STARTER_PRODUCTS } from './_lib/starterCatalogue.js';

// One-time load of the prototype catalogue. Rows whose slug already exists are
// left untouched (on_conflict ... ignore-duplicates), so running it twice, or after
// editing in the admin, never overwrites your changes.
async function insertMissing(token, table, rows) {
  const now = new Date().toISOString();
  // A rental whose web address was renamed in the admin is still the same rental: match it by SKU.
  if (table === TABLES.products) {
    const have = await parseSupabase(await supabaseUserRest(token, `${table}?site_key=eq.${SITE_KEY}&select=slug,sku`), `Unable to read ${table}.`);
    const slugs = new Set((have || []).map(r => r.slug));
    const skus = new Set((have || []).map(r => r.sku).filter(Boolean));
    rows = rows.filter(row => slugs.has(row.slug) || !row.sku || !skus.has(row.sku));
  }
  const payload = rows.map(row => ({
    ...row,
    site_key: SITE_KEY,
    ...(row.status === 'published' && table !== TABLES.categories ? { published_at: now } : {}),
  }));
  const inserted = await parseSupabase(
    await supabaseUserRest(token, `${table}?on_conflict=site_key,slug&select=slug`, {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(payload),
    }),
    `Unable to import into ${table}.`,
  );
  return Array.isArray(inserted) ? inserted.length : 0;
}

// Rentals whose catalogue content was rebuilt in the starter list (stock-only flag slogans,
// banner/sign choices with one-time custom charges). Importing refreshes their content from the
// starter list; day rate, status, featured, sort order and SEO set in the admin are kept.
// Empty on purpose: the button only ADDS missing rentals now. It never overwrites anything edited in the admin.
const REFRESH_FROM_STARTER = [];
const REFRESH_FIELDS = ['category_slug', 'sku', 'name', 'images', 'buy_price', 'buy_note', 'buy_url', 'description', 'features', 'specs', 'options', 'related'];

// Packages rebuilt around the full catalogue: refreshed from the starter list (status, sort order and SEO kept).
const REFRESH_PACKAGES = ['grand-opening', 'dealership-weekend', 'lot-dress-up', 'tire-promo', 'attention-grabber', 'offsite-tent-sale', 'vendor-market', 'backyard-party', 'event-entry'];
const PACKAGE_FIELDS = ['tag', 'name', 'hero_image', 'day_rate', 'items', 'description', 'good_for'];

async function patchRows(token, table, slugs, starter, fields) {
  let refreshed = 0;
  for (const slug of slugs) {
    const row = starter.find(p => p.slug === slug);
    if (!row) continue;
    const where = `${table}?site_key=eq.${SITE_KEY}&slug=eq.${encodeURIComponent(slug)}`;
    const found = await parseSupabase(await supabaseUserRest(token, `${where}&select=hero_image`), `Unable to read ${slug}.`);
    const existing = Array.isArray(found) ? found[0] : null;
    if (!existing) continue;
    const patch = Object.fromEntries(fields.map(key => [key, row[key]]));
    // Keep a main photo uploaded in the admin; only swap the starter photos.
    if (existing.hero_image && !/rent-and-rally\.vercel\.app\/img\//.test(existing.hero_image)) delete patch.hero_image;
    const updated = await parseSupabase(
      await supabaseUserRest(token, `${where}&select=slug`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      }),
      `Unable to refresh ${slug}.`,
    );
    refreshed += Array.isArray(updated) ? updated.length : 0;
  }
  return refreshed;
}

// Photos edited in the admin are kept. Option choices then point at the same picture by URL,
// or keep the photo number the admin already set for a choice with the same name.
function keepAdminPhotos(row, existing) {
  const mine = Array.isArray(existing?.images) ? existing.images : [];
  if (!mine.length) return { images: row.images, options: row.options };
  const setBefore = new Map();
  (existing.options || []).forEach(o => (o.values || []).forEach(v => { if (v?.img) setBefore.set(`${o.label}|${v.v}`, v.img); }));
  const options = (row.options || []).map(o => ({
    ...o,
    values: (o.values || []).map(v => {
      const { img, find, ...rest } = v;
      const byUrl = img ? mine.indexOf(row.images[img - 1]) + 1 : 0;
      // Last resort: a photo whose file name contains one of the choice's keywords (e.g. "auto-sale").
      const byName = (v.find || []).map(k => mine.findIndex(src => String(src).toLowerCase().includes(k)) + 1).find(Boolean);
      const kept = byUrl || setBefore.get(`${o.label}|${v.v}`) || byName;
      return kept && kept <= mine.length ? { ...rest, img: kept } : rest;
    }),
  }));
  return { images: mine, options };
}

async function refreshContent(token) {
  let refreshed = 0;
  for (const slug of REFRESH_FROM_STARTER) {
    const row = STARTER_PRODUCTS.find(p => p.slug === slug);
    if (!row) continue;
    // Update the rental found by its web address or by SKU (the address may have been changed in the admin).
    const base = `${TABLES.products}?site_key=eq.${SITE_KEY}`;
    const filter = row.sku ? `or=(slug.eq.${encodeURIComponent(slug)},sku.eq.${encodeURIComponent(row.sku)})` : `slug=eq.${encodeURIComponent(slug)}`;
    const found = await parseSupabase(await supabaseUserRest(token, `${base}&${filter}&select=slug,images,options`), `Unable to read ${slug}.`);
    let updated = [];
    for (const existing of Array.isArray(found) ? found : []) {
      const patch = { ...Object.fromEntries(REFRESH_FIELDS.map(key => [key, row[key]])), ...keepAdminPhotos(row, existing) };
      const done = await parseSupabase(
        await supabaseUserRest(token, `${base}&slug=eq.${encodeURIComponent(existing.slug)}&select=slug`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        }),
        `Unable to refresh ${existing.slug}.`,
      );
      if (Array.isArray(done)) updated = updated.concat(done);
    }
    refreshed += Array.isArray(updated) ? updated.length : 0;
  }
  return refreshed;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  try {
    const categories = await insertMissing(owner.accessToken, TABLES.categories, STARTER_CATEGORIES);
    const products = await insertMissing(owner.accessToken, TABLES.products, STARTER_PRODUCTS);
    const packages = await insertMissing(owner.accessToken, TABLES.packages, STARTER_PACKAGES);
    const refreshed = await refreshContent(owner.accessToken);
    const refreshedPackages = await patchRows(owner.accessToken, TABLES.packages, REFRESH_PACKAGES, STARTER_PACKAGES, PACKAGE_FIELDS);
    return res.status(200).json({
      ok: true,
      added: { categories, products, packages },
      refreshed: { products: refreshed, packages: refreshedPackages },
      available: { categories: STARTER_CATEGORIES.length, products: STARTER_PRODUCTS.length, packages: STARTER_PACKAGES.length },
    });
  } catch (error) {
    console.error('[rentrally] starter import failed', error);
    return res.status(500).json({ error: error.message || 'Starter import failed.' });
  }
}
