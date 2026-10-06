import { requireSiteAccess } from '../../_lib/websiteAdmin.js';
import { SERVICE_FIELDS, cleanService, deletePost, listPosts, savePost } from './_lib/content.js';

const TABLE = 'sunwings_services';

export default async function handler(req, res) {
  if (!['GET','POST','DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireSiteAccess(req, res, 'sunwings');
  if (!owner) return;

  try {
    if (req.method === 'GET') {
      const id = String(req.query?.id || '').trim();
      return res.status(200).json({ posts: await listPosts(owner.accessToken, TABLE, SERVICE_FIELDS, id) });
    }
    if (req.method === 'DELETE') {
      return res.status(200).json(await deletePost(owner.accessToken, TABLE, String(req.query?.id || '').trim()));
    }
    const post = await savePost(owner.accessToken, TABLE, SERVICE_FIELDS, req.body || {}, cleanService);
    return res.status(200).json({ post });
  } catch (error) {
    console.error('[sunwings] services failed', error);
    return res.status(500).json({ error: error.message || 'Service post request failed.' });
  }
}
