import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../../_lib/supabase.js';
import { SITE_KEY, TABLES, parseSupabase } from './_lib/content.js';
import { STARTER_CATEGORIES, STARTER_PACKAGES, STARTER_PRODUCTS } from './_lib/starterCatalogue.js';

// One-time load of the prototype catalogue. Rows whose slug already exists are
// left untouched (on_conflict ... ignore-duplicates), so running it twice, or after
// editing in the admin, never overwrites your changes.
async function insertMissing(token, table, rows) {
  const now = new Date().toISOString();
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  try {
    const categories = await insertMissing(owner.accessToken, TABLES.categories, STARTER_CATEGORIES);
    const products = await insertMissing(owner.accessToken, TABLES.products, STARTER_PRODUCTS);
    const packages = await insertMissing(owner.accessToken, TABLES.packages, STARTER_PACKAGES);
    return res.status(200).json({
      ok: true,
      added: { categories, products, packages },
      available: { categories: STARTER_CATEGORIES.length, products: STARTER_PRODUCTS.length, packages: STARTER_PACKAGES.length },
    });
  } catch (error) {
    console.error('[rentrally] starter import failed', error);
    return res.status(500).json({ error: error.message || 'Starter import failed.' });
  }
}
