import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { PRODUCT_FIELDS, SITE_KEY, TABLES, cleanProduct, crudHandler, relinkRental } from './_lib/content.js';

// Renaming a rental's web address moves every package and "related rentals" link to the new address.
const handle = crudHandler({ table: TABLES.products, fields: PRODUCT_FIELDS, cleaner: cleanProduct, key: 'products', label: 'Rentals', onRename: relinkRental });

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const access = await requireSiteAccess(req, res, SITE_KEY);
  if (!access) return;
  return handle(req, res, access);
}
