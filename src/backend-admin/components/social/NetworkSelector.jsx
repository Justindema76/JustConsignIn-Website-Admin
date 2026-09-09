import { SOCIAL_PUBLISHING_PLATFORMS } from '../../config/socialPlatforms';

export default function NetworkSelector({ value = [], onChange, className = 'social-network-pills' }) {
  const toggle = key => {
    const next = value.includes(key) ? value.filter(item => item !== key) : [...value, key];
    onChange?.(next);
  };

  return <div className={className}>
    {SOCIAL_PUBLISHING_PLATFORMS.map(platform => <button
      type="button"
      key={platform.key}
      className={value.includes(platform.key) ? 'selected' : ''}
      onClick={() => toggle(platform.key)}
    >{platform.label}</button>)}
  </div>;
}
