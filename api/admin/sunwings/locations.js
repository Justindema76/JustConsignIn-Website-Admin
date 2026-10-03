import { requireWebsiteOwner } from '../../_lib/websiteAdmin.js';
import { LOCATION_FIELDS, cleanLocation, deletePost, listPosts, savePost } from './_lib/content.js';

const TABLE = 'sunwings_locations';

export default async function handler(req, res) {
  if (!['GET','POST','DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  try {
    if (req.method === 'GET') {
      const id = String(req.query?.id || '').trim();
      return res.status(200).json({ posts: await listPosts(owner.accessToken, TABLE, LOCATION_FIELDS, id) });
    }
    if (req.method === 'DELETE') {
      return res.status(200).json(await deletePost(owner.accessToken, TABLE, String(req.query?.id || '').trim()));
    }
    const post = await savePost(owner.accessToken, TABLE, LOCATION_FIELDS, req.body || {}, cleanLocation);
    return res.status(200).json({ post });
  } catch (error) {
    console.error('[sunwings] locations failed', error);
    return res.status(500).json({ error: error.message || 'Location post request failed.' });
  }
}
