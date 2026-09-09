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

export async function generateSocialImage(accessToken, { prompt, ratio }) {
  return parseResponse(await fetch('/api/admin/social-ai', {
    method: 'POST',
    headers: headers(accessToken),
    body: JSON.stringify({ action: 'image', prompt, ratio }),
  }));
}

export async function generateSocialCopy(accessToken, { title, direction, platforms }) {
  return parseResponse(await fetch('/api/admin/social-ai', {
    method: 'POST',
    headers: headers(accessToken),
    body: JSON.stringify({ action: 'copy', title, direction, platforms }),
  }));
}

export async function imageBase64ToFile(base64, ratio = '4:5') {
  const source = new Image();
  source.decoding = 'async';
  source.src = `data:image/jpeg;base64,${base64}`;
  await source.decode();

  const targets = {
    '1:1': [1080, 1080],
    '4:5': [1080, 1350],
    '9:16': [1080, 1920],
  };
  const [width, height] = targets[ratio] || targets['4:5'];
  const targetRatio = width / height;
  const sourceRatio = source.naturalWidth / source.naturalHeight;
  let sx = 0, sy = 0, sw = source.naturalWidth, sh = source.naturalHeight;

  if (sourceRatio > targetRatio) {
    sw = source.naturalHeight * targetRatio;
    sx = (source.naturalWidth - sw) / 2;
  } else if (sourceRatio < targetRatio) {
    sh = source.naturalWidth / targetRatio;
    sy = (source.naturalHeight - sh) / 2;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) throw new Error('Unable to prepare generated image for upload.');
  return new File([blob], `justconsignin-ai-${ratio.replace(':', 'x')}-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
