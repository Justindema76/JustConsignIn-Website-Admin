export const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook', icon: 'https://www.justconsignin.com/images/brand/social-media-icons/facebook-logo.png' },
  { key: 'instagram', label: 'Instagram', icon: 'https://www.justconsignin.com/images/brand/social-media-icons/instagram-logo.png' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'https://www.justconsignin.com/images/brand/social-media-icons/linkedin-logo.jpeg' },
  { key: 'youtube', label: 'YouTube', icon: 'https://www.justconsignin.com/images/brand/social-media-icons/youtube-logo.png' },
  { key: 'tiktok', label: 'TikTok', icon: 'https://www.justconsignin.com/images/brand/social-media-icons/ticktok-logo.png' },
];

export const FALLBACK_VIDEOS = [
  { id: 'seed-video-1', title: 'JustConsignIn Shopify Product Overview', youtubeUrl: 'https://youtu.be/xt9ltPjKP5g', youtubeId: 'xt9ltPjKP5g', description: '', placement: 'homepage', sortOrder: 1, status: 'active', contentType: 'video', playlistName: 'JustConsignIn' },
  { id: 'seed-video-2', title: 'JustConsignIn Consignment Demo', youtubeUrl: 'https://youtu.be/j1LmKY_OY0Y', youtubeId: 'j1LmKY_OY0Y', description: '', placement: 'homepage', sortOrder: 2, status: 'active', contentType: 'video', playlistName: 'JustConsignIn' },
  { id: 'seed-video-3', title: 'POS Barcode Scanning Available', youtubeUrl: 'https://youtube.com/shorts/N569Bic9Ink', youtubeId: 'N569Bic9Ink', description: '', placement: 'homepage', sortOrder: 1, status: 'active', contentType: 'short', playlistName: 'JustConsignIn' },
];

export function emptySocialLinks() {
  return Object.fromEntries(SOCIAL_NETWORKS.map(({ key }) => [key, { url: '', enabled: true }]));
}

export function normalizeVideo(row = {}) {
  const youtubeUrl = row.youtube_url ?? row.youtubeUrl ?? '';
  const inferredType = /youtube\.com\/shorts\//i.test(youtubeUrl) ? 'short' : 'video';
  const contentType = row.content_type ?? row.contentType ?? inferredType;

  return {
    id: row.id || '',
    title: row.title || '',
    youtubeUrl,
    youtubeId: row.youtube_id ?? row.youtubeId ?? '',
    description: row.description || '',
    placement: row.placement || 'homepage',
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    status: row.status === 'hidden' ? 'hidden' : 'active',
    contentType: contentType === 'short' ? 'short' : 'video',
    playlistName: String(row.playlist_name ?? row.playlistName ?? 'JustConsignIn').trim() || 'JustConsignIn',
    createdAt: row.created_at ?? row.createdAt ?? '',
    updatedAt: row.updated_at ?? row.updatedAt ?? '',
  };
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Website content request failed');
  return payload;
}

export async function loadSiteVideos(placement = 'homepage') {
  try {
    const payload = await parseResponse(await fetch(`/api/blog?resource=videos&placement=${encodeURIComponent(placement)}`));
    const videos = Array.isArray(payload.videos) ? payload.videos.map(normalizeVideo) : [];
    return videos.length ? videos : FALLBACK_VIDEOS.filter(video => video.placement === placement);
  } catch {
    return FALLBACK_VIDEOS.filter(video => video.placement === placement);
  }
}

export async function loadSocialLinks() {
  try {
    const payload = await parseResponse(await fetch('/api/blog?resource=social'));
    return { ...emptySocialLinks(), ...(payload.social || {}) };
  } catch {
    return emptySocialLinks();
  }
}
