function supportedMp4Mime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
    'video/mp4',
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported?.(type)) || '';
}

async function fetchBlob(url, label) {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`Unable to load ${label} (${response.status}).`);
  return response.blob();
}

function drawCover(ctx, image, width, height, zoom = 1) {
  const scale = Math.max(width / image.width, height / image.height) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function recorderFor(stream, mimeType) {
  const options = { mimeType, videoBitsPerSecond: 4_500_000, audioBitsPerSecond: 160_000 };
  try { return new MediaRecorder(stream, options); }
  catch { return new MediaRecorder(stream, { mimeType }); }
}

export async function createImageMusicReel({ imageUrl, audioUrl, durationSeconds = 10 }) {
  if (!imageUrl) throw new Error('Choose an image first.');
  if (!audioUrl) throw new Error('Upload music first.');
  if (!HTMLCanvasElement.prototype.captureStream) throw new Error('This browser cannot create video from an image. Update iOS/Safari and try again.');

  const mimeType = supportedMp4Mime();
  if (!mimeType) throw new Error('This browser cannot create an MP4 Reel. Use current Safari on iPhone/iPad or a browser with MP4 MediaRecorder support.');

  const [imageBlob, audioBlob] = await Promise.all([
    fetchBlob(imageUrl, 'the selected image'),
    fetchBlob(audioUrl, 'the uploaded music'),
  ]);

  const image = await createImageBitmap(imageBlob);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('This browser cannot process the uploaded music.');
  const audioContext = new AudioContextClass();
  await audioContext.resume();
  const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());

  const width = 1080;
  const height = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Unable to prepare the Reel canvas.');
  drawCover(ctx, image, width, height, 1);

  const canvasStream = canvas.captureStream(30);
  const audioDestination = audioContext.createMediaStreamDestination();
  const audioSource = audioContext.createBufferSource();
  audioSource.buffer = audioBuffer;
  audioSource.loop = true;
  audioSource.connect(audioDestination);

  // Keep the audio graph alive without blasting the music through the device while rendering.
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  audioSource.connect(silentGain);
  silentGain.connect(audioContext.destination);

  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDestination.stream.getAudioTracks(),
  ]);
  const recorder = recorderFor(combined, mimeType);
  const chunks = [];
  recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };

  const requested = Math.max(3, Math.min(30, Number(durationSeconds) || 10));
  const duration = Math.max(3, Math.min(requested, 30));
  let animationFrame = 0;
  const startedAt = performance.now();

  const render = now => {
    const progress = Math.min(1, (now - startedAt) / (duration * 1000));
    drawCover(ctx, image, width, height, 1 + progress * 0.035);
    if (progress < 1) animationFrame = requestAnimationFrame(render);
  };

  const done = new Promise((resolve, reject) => {
    recorder.onerror = event => reject(event.error || new Error('The browser could not render the Reel.'));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/mp4' });
      if (!blob.size) reject(new Error('The Reel renderer returned an empty video.'));
      else resolve(blob);
    };
  });

  try {
    recorder.start(500);
    audioSource.start(0);
    animationFrame = requestAnimationFrame(render);
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
    if (recorder.state !== 'inactive') recorder.stop();
    try { audioSource.stop(); } catch {}
    const blob = await done;
    const mp4 = blob.type.includes('mp4') ? blob : new Blob([blob], { type: 'video/mp4' });
    return new File([mp4], `justconsignin-reel-${Date.now()}.mp4`, { type: 'video/mp4' });
  } finally {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    combined.getTracks().forEach(track => track.stop());
    canvasStream.getTracks().forEach(track => track.stop());
    image.close?.();
    await audioContext.close().catch(() => {});
  }
}
