import { Image } from 'lucide-react';

export default function MediaPreview({
  url,
  type = 'image',
  className = '',
  alt = 'Selected media',
  controls = true,
  muted = false,
  fallbackSize = 28,
}) {
  if (!url) return <Image size={fallbackSize}/>;
  if (type === 'video') {
    return <video className={className} src={url} controls={controls} muted={muted} playsInline preload="metadata"/>;
  }
  return <img className={className} src={url} alt={alt}/>;
}
