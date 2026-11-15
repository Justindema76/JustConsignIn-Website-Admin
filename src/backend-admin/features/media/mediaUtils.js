// Shared by Admin › Media and the "Choose from Media" picker.
export const FOLDERS = ['Banners', 'Job photos', 'Locations', 'Logos', 'Social', 'Website assets', 'Other'];
// Local preview (vite dev) checks the local site copy.
export const SUNWINGS_SITE = import.meta.env.DEV ? 'http://localhost:3099' : 'https://www.sunwingstransport.ca';
export const keyOf = item => `${item.bucket || 'media'}:${item.path || item.url}`;
export const sizeOf = item => Number(item.metadata?.size || item.metadata?.contentLength || 0) || 0;

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Folder a file starts in until someone moves it.
export function guessFolder(item) {
  const name = String(item.name || '').toLowerCase();
  if (item.mediaType === 'video' || item.mediaType === 'audio' || /social|-\d+x\d+\./.test(name)) return 'Social';
  if (/logo|favicon|icon/.test(name)) return 'Logos';
  if (item.bucket === 'site-assets') return 'Website assets';
  if (/^\d+-(img|dsc|pxl|photo)[_-]?\d+/i.test(name) || /^\d+-image\./.test(name)) return 'Job photos';
  if (/banner|hero|highway|bridge|panorama/.test(name)) return 'Banners';
  return 'Other';
}

// Small preview instead of the full-size original (Supabase image resizing).
export function previewUrl(item) {
  if ((item.mediaType || 'image') !== 'image' || !/\/storage\/v1\/object\/public\//.test(item.url || '') || /\.gif$/i.test(item.url)) return item.url;
  // resize=contain: the whole photo, shrunk (the default crops it to a narrow strip).
  return `${item.url.replace('/object/public/', '/render/image/public/')}?width=480&height=480&resize=contain&quality=70`;
}

