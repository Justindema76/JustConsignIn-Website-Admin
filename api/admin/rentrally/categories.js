import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { CATEGORY_FIELDS, SITE_KEY, TABLES, cleanCategory, crudHandler } from './_lib/content.js';

const handle = crudHandler({ table: TABLES.categories, fields: CATEGORY_FIELDS, cleaner: cleanCategory, key: 'categories', label: 'Categories' });

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const access = await requireSiteAccess(req, res, SITE_KEY);
  if (!access) return;
  return handle(req, res, access);
}
