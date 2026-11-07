import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { PRODUCT_FIELDS, SITE_KEY, TABLES, cleanProduct, crudHandler } from './_lib/content.js';

const handle = crudHandler({ table: TABLES.products, fields: PRODUCT_FIELDS, cleaner: cleanProduct, key: 'products', label: 'Rentals' });

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const access = await requireSiteAccess(req, res, SITE_KEY);
  if (!access) return;
  return handle(req, res, access);
}
