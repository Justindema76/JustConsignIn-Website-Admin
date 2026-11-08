import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { SITE_KEY, TABLES, parseSupabase } from './_lib/content.js';
import { STARTER_CATEGORIES, STARTER_PACKAGES, STARTER_PRODUCTS } from './_lib/starterCatalogue.js';

// One-time load of the prototype catalogue. Rows whose slug already exists are
// left untouched (on_conflict ... ignore-duplicates), so running it twice, or after
// editing in the admin, never overwrites your changes.
async function insertMissing(token, table, rows) {
  const now = new Date().toISOString();
  // Only fills an EMPTY table (first-time setup). Once anything exists, nothing is ever added back,
  // so rentals, packages or categories you deleted stay deleted.
  const any = await parseSupabase(await supabaseUserRest(token, `${table}?site_key=eq.${SITE_KEY}&select=id&limit=1`), `Unable to read ${table}.`);
  if (Array.isArray(any) && any.length) return 0;
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
const REFRESH_PACKAGES = [];
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

// Puts back how options SHOW (tiles / cards / tick boxes, "only show when" rules, hints, choice notes
// and price tags) where an older admin save dropped them. Matches by option name and choice text.
// Never changes names, choices, prices, photos or anything else edited in the admin.
async function repairOptionLooks(token) {
  const rows = await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&select=id,slug,sku,options`), 'Unable to read rentals.');
  let repaired = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const starter = STARTER_PRODUCTS.find(p => p.slug === row.slug) || STARTER_PRODUCTS.find(p => p.sku && p.sku === row.sku);
    if (!starter?.options?.length || !Array.isArray(row.options)) continue;
    const seen = {};
    let changed = false;
    const options = row.options.map(o => {
      const n = seen[o.label] = (seen[o.label] || 0) + 1;
      const src = starter.options.filter(x => x.label === o.label)[n - 1];
      if (!src) return o;
      const out = { ...o };
      for (const key of ['style', 'when', 'hint']) if (src[key] && !out[key]) { out[key] = src[key]; changed = true; }
      out.values = (o.values || []).map(v => {
        const sv = (src.values || []).find(x => x.v === v.v);
        if (!sv) return v;
        const nv = { ...v };
        for (const key of ['note', 'tag']) if (sv[key] && !nv[key]) { nv[key] = sv[key]; changed = true; }
        return nv;
      });
      return out;
    });
    if (!changed) continue;
    await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(row.id)}&select=id`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ options }),
    }), `Unable to repair ${row.slug}.`);
    repaired += 1;
  }
  return repaired;
}

// New packages to add once (only if that web address isn't already used). Emptied after it has run.
const ADD_PACKAGES = [];
async function addPackages(token) {
  let added = 0;
  for (const slug of ADD_PACKAGES) {
    const row = STARTER_PACKAGES.find(p => p.slug === slug);
    if (!row) continue;
    const have = await parseSupabase(await supabaseUserRest(token, `${TABLES.packages}?site_key=eq.${SITE_KEY}&slug=eq.${encodeURIComponent(slug)}&select=id`), `Unable to read ${slug}.`);
    if (Array.isArray(have) && have.length) continue;
    const { hero_image, ...rest } = row;
    await parseSupabase(await supabaseUserRest(token, `${TABLES.packages}?select=id`, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...rest, hero_image: '', site_key: SITE_KEY, published_at: new Date().toISOString() }),
    }), `Unable to add ${slug}.`);
    added += 1;
  }
  return added;
}

// Links to a rental whose web address was changed before renames were handled: find the rental by
// its SKU and point packages and "related rentals" at its current address.
async function repairRenamedLinks(token) {
  const live = await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&select=id,slug,sku,related`), 'Unable to read rentals.');
  const slugs = new Set((live || []).map(p => p.slug));
  const now = old => {
    if (slugs.has(old)) return old;
    const sku = STARTER_PRODUCTS.find(p => p.slug === old)?.sku;
    return (sku && (live || []).find(p => p.sku === sku)?.slug) || old;
  };
  let fixed = 0;
  const packages = await parseSupabase(await supabaseUserRest(token, `${TABLES.packages}?site_key=eq.${SITE_KEY}&select=id,items`), 'Unable to read packages.');
  for (const pk of packages || []) {
    const items = (pk.items || []).map(i => ({ ...i, product: now(i.product) }));
    if (JSON.stringify(items) === JSON.stringify(pk.items)) continue;
    await parseSupabase(await supabaseUserRest(token, `${TABLES.packages}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(pk.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ items }) }), 'Unable to fix a package.');
    fixed += 1;
  }
  for (const p of live || []) {
    const related = [...new Set((p.related || []).map(now))];
    if (JSON.stringify(related) === JSON.stringify(p.related || [])) continue;
    await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(p.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ related }) }), 'Unable to fix related rentals.');
    fixed += 1;
  }
  return fixed;
}

// One-time content update for specific rentals, found by SKU (so a renamed web address still matches).
// Keeps the name, category, photos, related rentals, status and SEO set in the admin. Emptied after it has run.
const UPDATE_ONCE = [];
const UPDATE_ONCE_FIELDS = ['description', 'features', 'specs', 'options'];
async function updateOnce(token) {
  let done = 0;
  for (const slug of UPDATE_ONCE) {
    const row = STARTER_PRODUCTS.find(p => p.slug === slug);
    if (!row) continue;
    const rows = await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&sku=eq.${encodeURIComponent(row.sku)}&select=id,images`), `Unable to read ${slug}.`);
    for (const live of Array.isArray(rows) ? rows : []) {
      const patch = Object.fromEntries(UPDATE_ONCE_FIELDS.map(k => [k, row[k]]));
      // choices that switch the photo keep pointing at the same picture, if the photos were changed
      patch.options = (row.options || []).map(o => ({ ...o, values: (o.values || []).map(v => {
        if (!v.img) return v;
        const n = (live.images || []).indexOf(row.images[v.img - 1]) + 1;
        const { img, ...rest } = v;
        return n ? { ...rest, img: n } : (live.images || []).length >= v.img ? v : rest;
      }) }));
      await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(live.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) }), `Unable to update ${slug}.`);
      done += 1;
    }
  }
  return done;
}

// One-time price change for add-on choices, matched by rental SKU and choice name. Only the
// "(+$N/day)" price in that choice changes. Emptied after it has run.
const REPRICE_ONCE = {};
async function repriceOnce(token) {
  let changed = 0;
  for (const [slug, prices] of Object.entries(REPRICE_ONCE)) {
    const sku = STARTER_PRODUCTS.find(p => p.slug === slug)?.sku;
    if (!sku) continue;
    const rows = await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&sku=eq.${encodeURIComponent(sku)}&select=id,options`), `Unable to read ${slug}.`);
    for (const row of Array.isArray(rows) ? rows : []) {
      let touched = false;
      const options = (row.options || []).map(o => ({ ...o, values: (o.values || []).map(v => {
        const name = Object.keys(prices).find(n => String(v.v).startsWith(n));
        if (!name) return v;
        const base = String(v.v).replace(/\s*\(\+\$\d+(?:\.\d+)?\/day\)/, '');
        const next = `${base} (+$${prices[name]}/day)`;
        if (next === v.v) return v;
        touched = true;
        return { ...v, v: next };
      }) }));
      if (!touched) continue;
      await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ options }) }), `Unable to reprice ${slug}.`);
      changed += 1;
    }
  }
  return changed;
}

// New rentals to add once (skipped if that SKU is already there). Category follows a
// sibling rental's category in the admin. Emptied after it has run.
const ADD_PRODUCTS_ONCE = ['pennants', 'metalpennant', 'fluorpennant', 'gatorpennant', 'pullbow', 'giantbow', 'holidaybow'].map(slug => ({ slug }));
async function addProductsOnce(token) {
  let added = 0;
  for (const { slug, categoryLike } of ADD_PRODUCTS_ONCE) {
    const row = STARTER_PRODUCTS.find(p => p.slug === slug);
    if (!row) continue;
    const have = await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&sku=eq.${encodeURIComponent(row.sku)}&select=id`), `Unable to read ${slug}.`);
    if (Array.isArray(have) && have.length) continue;
    const sib = categoryLike ? await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&sku=eq.${encodeURIComponent(categoryLike)}&select=category_slug,day_rate`), 'Unable to read rentals.') : [];
    const like = Array.isArray(sib) ? sib[0] : null;
    await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?select=id`, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...row, category_slug: like?.category_slug || row.category_slug, day_rate: like?.day_rate ?? row.day_rate, site_key: SITE_KEY, status: 'published', published_at: new Date().toISOString() }),
    }), `Unable to add ${slug}.`);
    added += 1;
  }
  return added;
}

// Fixes "$$34.95" typos in choice names and notes (a "$" right before another "$" and a number).
// Safe to run any time: it only removes the extra "$".
async function fixDoubleDollars(token) {
  const rows = await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&select=id,options`), 'Unable to read rentals.');
  let fixed = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const before = JSON.stringify(row.options || []);
    const after = before.replace(/\$\$(\d)/g, '$$$1');
    if (after === before) continue;
    await parseSupabase(await supabaseUserRest(token, `${TABLES.products}?site_key=eq.${SITE_KEY}&id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ options: JSON.parse(after) }) }), 'Unable to fix prices.');
    fixed += 1;
  }
  return fixed;
}

// New categories to add once (skipped if already there). Emptied after it has run.
const ADD_CATEGORIES_ONCE = ['decorations'];
async function addCategoriesOnce(token) {
  let added = 0;
  for (const slug of ADD_CATEGORIES_ONCE) {
    const row = STARTER_CATEGORIES.find(c => c.slug === slug);
    if (!row) continue;
    const have = await parseSupabase(await supabaseUserRest(token, `${TABLES.categories}?site_key=eq.${SITE_KEY}&slug=eq.${encodeURIComponent(slug)}&select=slug`), `Unable to read ${slug}.`);
    if (Array.isArray(have) && have.length) continue;
    await parseSupabase(await supabaseUserRest(token, `${TABLES.categories}?select=slug`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...row, site_key: SITE_KEY }) }), `Unable to add ${slug}.`);
    added += 1;
  }
  return added;
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
    const repaired = await repairOptionLooks(owner.accessToken);
    const newPackages = await addPackages(owner.accessToken);
    const relinked = await repairRenamedLinks(owner.accessToken);
    const updated = await updateOnce(owner.accessToken);
    const repriced = await repriceOnce(owner.accessToken);
    const newCategories = await addCategoriesOnce(owner.accessToken);
    const newProducts = await addProductsOnce(owner.accessToken);
    const dollars = await fixDoubleDollars(owner.accessToken);
    return res.status(200).json({
      ok: true,
      repaired,
      relinked,
      dollars,
      updated,
      repriced,
      added: { categories: categories + newCategories, products: products + newProducts, packages: packages + newPackages },
      refreshed: { products: refreshed, packages: refreshedPackages },
      available: { categories: STARTER_CATEGORIES.length, products: STARTER_PRODUCTS.length, packages: STARTER_PACKAGES.length },
    });
  } catch (error) {
    console.error('[rentrally] starter import failed', error);
    return res.status(500).json({ error: error.message || 'Starter import failed.' });
  }
}
