export const SOCIAL_PUBLISHING_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', accepts: ['image', 'video'] },
  { key: 'facebook', label: 'Facebook', accepts: ['image', 'video'] },
  { key: 'tiktok', label: 'TikTok', accepts: ['image', 'video'] },
  { key: 'youtube', label: 'YouTube', accepts: ['video'] },
];

export const SOCIAL_PLATFORM_LABELS = Object.fromEntries(
  SOCIAL_PUBLISHING_PLATFORMS.map(({ key, label }) => [key, label]),
);

export function platformLabel(key) {
  return SOCIAL_PLATFORM_LABELS[key] || key;
}
