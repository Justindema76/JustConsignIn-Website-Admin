import { supabaseAdmin, supabaseUrl } from './supabase.js';

// Customer photos sent with a Sunwings quote live in the private "sunwings-quote-photos"
// bucket. Only the server key can open them, so links are signed and expire.
const BUCKET = 'sunwings-quote-photos';
const PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-5]\.jpg$/;

export function photoPaths(row) {
  const list = Array.isArray(row?.photos) ? row.photos : [];
  return list.map(String).filter(path => PATH.test(path));
}

// Returns { path: signedUrl } for every path it could sign. Never throws.
export async function signPhotoPaths(paths, expiresIn = 3600) {
  const unique = [...new Set(paths.filter(path => PATH.test(path)))];
  if (!unique.length) return {};
  try {
    const response = await supabaseAdmin(`/storage/v1/object/sign/${BUCKET}`, {
      method: 'POST',
      body: JSON.stringify({ expiresIn, paths: unique }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data)) throw new Error(data?.message || `sign failed (${response.status})`);
    const urls = {};
    for (const item of data) {
      if (item?.path && item?.signedURL) urls[item.path] = `${supabaseUrl()}/storage/v1${item.signedURL}`;
    }
    return urls;
  } catch (error) {
    console.error('[sunwings] could not sign quote photos', error.message || error);
    return {};
  }
}

// Adds photo_urls (signed, short-lived) to each quote row that has photos.
export async function withPhotoUrls(rows, expiresIn = 3600) {
  if (!Array.isArray(rows)) return rows;
  const urls = await signPhotoPaths(rows.flatMap(photoPaths), expiresIn);
  return rows.map(row => {
    const paths = photoPaths(row);
    return paths.length ? { ...row, photo_urls: paths.map(path => urls[path]).filter(Boolean) } : row;
  });
}
