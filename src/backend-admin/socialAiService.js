async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || 'Social AI request failed');
  return payload;
}

function headers(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

export async function getSocialAiStatus(accessToken) {
  return parseResponse(await fetch('/api/admin/social-ai', { headers: { Authorization: `Bearer ${accessToken}` } }));
}

function waitFor(target, event, errorEvent = 'error') {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, onDone);
      if (errorEvent) target.removeEventListener(errorEvent, onError);
    };
    const onDone = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Unable to read the selected video.')); };
    target.addEventListener(event, onDone, { once: true });
    if (errorEvent) target.addEventListener(errorEvent, onError, { once: true });
  });
}

async function videoFrames(videoUrl, count = 4) {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = videoUrl;
  video.load();

  if (video.readyState < 1) await waitFor(video, 'loadedmetadata');
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
  const sourceWidth = video.videoWidth || 720;
  const sourceHeight = video.videoHeight || 1280;
  const maxWidth = 720;
  const scale = Math.min(1, maxWidth / sourceWidth);
  const width = Math.max(2, Math.round(sourceWidth * scale));
  const height = Math.max(2, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to analyze video frames on this device.');

  const percentages = count <= 1 ? [0.5] : Array.from({ length: count }, (_, i) => 0.08 + (i * 0.84 / (count - 1)));
  const frames = [];
  for (const percent of percentages) {
    const target = Math.max(0, Math.min(duration - 0.05, duration * percent));
    if (Math.abs(video.currentTime - target) > 0.02) {
      const seeked = waitFor(video, 'seeked');
      video.currentTime = target;
      await seeked;
    }
    ctx.drawImage(video, 0, 0, width, height);
    frames.push(canvas.toDataURL('image/jpeg', 0.72));
  }

  video.pause();
  video.removeAttribute('src');
  video.load();
  return frames;
}

export async function analyzeSocialMedia(accessToken, { mediaUrl, mediaType = 'image', platforms = [], direction = '' }) {
  if (!mediaUrl) throw new Error('Choose or upload an image or video first.');
  if (!platforms.length) throw new Error('Choose at least one social network to push to.');

  let frames = [];
  if (mediaType === 'video') {
    frames = await videoFrames(mediaUrl, 4);
  }

  return parseResponse(await fetch('/api/admin/social-ai', {
    method: 'POST',
    headers: headers(accessToken),
    body: JSON.stringify({ action: 'analyze', mediaUrl, mediaType, platforms, direction, frames }),
  }));
}
