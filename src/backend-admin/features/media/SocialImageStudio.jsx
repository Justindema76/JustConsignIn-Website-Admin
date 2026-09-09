import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Image, Loader2, Save, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminMedia, uploadBlogImage } from '../../services/siteAdminService';

const SIZES = {
  '1:1': { width: 1080, height: 1080, label: 'Square · 1080 × 1080' },
  '4:5': { width: 1080, height: 1350, label: 'Feed · 1080 × 1350' },
  '9:16': { width: 1080, height: 1920, label: 'Reel / TikTok · 1080 × 1920' },
};

async function loadBitmap(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Unable to load that image for editing.');
  const blob = await response.blob();
  return createImageBitmap(blob);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
  ctx.closePath();
}

async function renderVariant({ url, ratio, zoom, focusX, focusY, headline, trialBadge }) {
  const bitmap = await loadBitmap(url);
  const target = SIZES[ratio];
  const targetRatio = target.width / target.height;
  const sourceRatio = bitmap.width / bitmap.height;
  let baseW;
  let baseH;
  if (sourceRatio > targetRatio) { baseH = bitmap.height; baseW = baseH * targetRatio; }
  else { baseW = bitmap.width; baseH = baseW / targetRatio; }

  const scale = Math.max(1, Number(zoom) || 1);
  const cropW = baseW / scale;
  const cropH = baseH / scale;
  const maxX = Math.max(0, bitmap.width - cropW);
  const maxY = Math.max(0, bitmap.height - cropH);
  const sx = maxX * (Number(focusX) / 100);
  const sy = maxY * (Number(focusY) / 100);

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const safeHeadline = String(headline || '').trim();
  if (safeHeadline || trialBadge) {
    const gradient = ctx.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,.78)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height * 0.48, canvas.width, canvas.height * 0.52);

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 38px Arial, sans-serif';
    ctx.fillText('JustConsignIn', 70, canvas.height - 315);

    if (safeHeadline) {
      ctx.font = `800 ${ratio === '9:16' ? 62 : 54}px Arial, sans-serif`;
      const maxWidth = canvas.width - 140;
      const words = safeHeadline.split(/\s+/);
      const lines = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((text, index) => ctx.fillText(text, 70, canvas.height - 255 + index * (ratio === '9:16' ? 72 : 64)));
    }

    if (trialBadge) {
      const badgeW = 365;
      const badgeH = 72;
      const bx = canvas.width - badgeW - 70;
      const by = 62;
      ctx.fillStyle = '#1f67b2';
      roundedRect(ctx, bx, by, badgeW, badgeH, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 31px Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText('14-Day Free Trial', bx + badgeW / 2, by + badgeH / 2 + 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    }
  }

  const output = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!output) throw new Error('Unable to create the social image.');
  return new File([output], `justconsignin-social-${ratio.replace(':', 'x')}-${Date.now()}.jpg`, { type: 'image/jpeg' });
}

export default function SocialImageStudio() {
  const { accessToken } = useAuth();
  const [media, setMedia] = useState([]);
  const [selected, setSelected] = useState('');
  const [ratio, setRatio] = useState('4:5');
  const [zoom, setZoom] = useState(1);
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(50);
  const [headline, setHeadline] = useState('Create Shopify products from your phone');
  const [trialBadge, setTrialBadge] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    if (!accessToken) return;
    try {
      const items = await loadAdminMedia(accessToken);
      setMedia(items || []);
      setSelected(current => current || items?.[0]?.url || '');
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { refresh(); }, [accessToken]);
  const target = SIZES[ratio];
  const previewStyle = useMemo(() => ({
    objectPosition: `${focusX}% ${focusY}%`, transform: `scale(${zoom})`,
  }), [focusX, focusY, zoom]);

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const url = await uploadBlogImage(accessToken, file);
      setSelected(url); await refresh(); setMessage('Image uploaded and ready to edit.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); event.target.value = ''; }
  };

  const saveVariant = async () => {
    if (!selected) { setError('Choose an image first.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const file = await renderVariant({ url: selected, ratio, zoom, focusX, focusY, headline, trialBadge });
      const url = await uploadBlogImage(accessToken, file);
      setSelected(url); setZoom(1); setFocusX(50); setFocusY(50);
      await refresh();
      setMessage(`${target.label} image created and saved to your Supabase Media Library.`);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Social Media</p><h1>Image Studio</h1><p>Crop and brand an existing image, create the correct social ratio, and save the finished version back into the shared Media Library.</p></div>
      <div className="site-admin-actions"><Link className="site-admin-btn secondary" to="/admin/social-automation"><ArrowLeft size={14}/> Social Automation</Link><label className="site-admin-btn upload-button"><Upload size={14}/> Upload Image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={busy}/></label></div>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}

    <div className="social-image-layout">
      <section className="site-admin-card social-image-workbench">
        <div className="social-image-stage-wrap">
          <div className={`social-image-stage ratio-${ratio.replace(':','')}`}>
            {selected ? <img src={selected} alt="Social crop preview" style={previewStyle}/> : <div className="social-image-empty"><Image size={34}/><span>Choose an image below</span></div>}
            {(headline || trialBadge) && <div className="social-image-overlay"><strong>JustConsignIn</strong>{headline && <b>{headline}</b>}</div>}
            {trialBadge && <span className="social-image-badge">14-Day Free Trial</span>}
          </div>
        </div>
        <div className="social-image-controls">
          <div className="social-image-ratios">{Object.entries(SIZES).map(([key, item]) => <button key={key} className={ratio === key ? 'active' : ''} onClick={() => setRatio(key)}><strong>{key}</strong><small>{item.label}</small></button>)}</div>
          <label><span>Zoom <b>{zoom.toFixed(2)}×</b></span><input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))}/></label>
          <label><span>Move left / right</span><input type="range" min="0" max="100" value={focusX} onChange={e => setFocusX(Number(e.target.value))}/></label>
          <label><span>Move up / down</span><input type="range" min="0" max="100" value={focusY} onChange={e => setFocusY(Number(e.target.value))}/></label>
          <label className="social-image-text"><span>Headline overlay</span><input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Optional headline"/></label>
          <label className="social-image-check"><input type="checkbox" checked={trialBadge} onChange={e => setTrialBadge(e.target.checked)}/><span>Add 14-Day Free Trial badge</span></label>
          <button className="site-admin-btn social-image-save" onClick={saveVariant} disabled={busy || !selected}>{busy ? <Loader2 className="spin" size={15}/> : <Save size={15}/>} Create & Save {ratio} Image</button>
          <small className="social-image-help">The saved output is a real 1080px JPEG. It immediately appears in Media and can be selected in Social Automation for Metricool.</small>
        </div>
      </section>

      <aside className="site-admin-card social-image-library">
        <div className="social-image-library-head"><strong>Media Library</strong><small>{media.length} images</small></div>
        <div className="social-image-thumbs">{media.map(item => <button className={selected === item.url ? 'selected' : ''} key={item.path || item.url} onClick={() => { setSelected(item.url); setZoom(1); setFocusX(50); setFocusY(50); }}><img src={item.url} alt={item.name || ''}/><span>{item.name}</span></button>)}</div>
        {!media.length && <div className="site-admin-empty"><Image size={26}/><p>Upload an image to start.</p></div>}
      </aside>
    </div>
  </>;
}
