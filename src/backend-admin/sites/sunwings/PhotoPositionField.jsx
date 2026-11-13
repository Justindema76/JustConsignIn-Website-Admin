import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

// Banner photo position, like Code Studio's picture controls, for desktop and for phones.
// Desktop: the photo fills the whole banner (about 2:1 on a laptop). Phones: a full-width 5:4 box
// above the text (globals.css .hero-slide::before). Drag the photo or use the sliders.
// Saves "X% Y%" positions and "W% auto" sizes (blank = just fill the box).

export const VIEWS = {
  desktop: { label: 'Desktop', ratio: 2, def: { x: 50, y: 50 }, posKey: 'desktopPosition', sizeKey: 'desktopSize' },
  phone: { label: 'Phone', ratio: 5 / 4, def: { x: 50, y: 80 }, posKey: 'mobilePosition', sizeKey: 'mobileSize' },
};

const WORDS = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };

// Reads saved values, including the older word presets like "center top" or "70% center".
export function parsePosition(value, DEFAULT = { x: 50, y: 50 }) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { ...DEFAULT };
  const num = part => (part.endsWith('%') ? Number.parseFloat(part) : WORDS[part]);
  if (parts.length === 1) {
    const only = parts[0];
    if (only === 'top' || only === 'bottom') return { x: 50, y: WORDS[only] };
    const n = num(only);
    return { x: Number.isFinite(n) ? n : 50, y: 50 };
  }
  let [a, b] = parts;
  if (a === 'top' || a === 'bottom' || b === 'left' || b === 'right') [a, b] = [b, a];
  const x = num(a);
  const y = num(b);
  return { x: Number.isFinite(x) ? x : 50, y: Number.isFinite(y) ? y : 50 };
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const round = n => Math.round(n);

function PhotoBox({ view, image, position, size, onChange }) {
  const { ratio: BOX_RATIO, def: DEFAULT, posKey, sizeKey } = view;
  const [ratio, setRatio] = useState(null); // photo width / height
  const boxRef = useRef(null);
  const drag = useRef(null);
  const pos = parsePosition(position, DEFAULT);

  useEffect(() => {
    setRatio(null);
    if (!image) return;
    const img = new Image();
    img.onload = () => setRatio(img.naturalWidth / img.naturalHeight);
    img.src = image;
  }, [image]);

  // Width (as % of the box) at which the photo just fills the box; zoom multiplies it.
  const coverWidth = ratio ? Math.max(100, (ratio / BOX_RATIO) * 100) : 100;
  const savedWidth = /^([\d.]+)%/.exec(size || '')?.[1];
  const zoom = savedWidth ? clamp(round((Number(savedWidth) / coverWidth) * 100), 100, 300) : 100;
  const photoWidth = (coverWidth * zoom) / 100;
  const photoHeight = ratio ? (photoWidth / ratio) * BOX_RATIO : 100; // as % of the box height
  const spareX = photoWidth - 100; // how far the photo can move, in % of the box
  const spareY = photoHeight - 100;

  const set = (next = {}) => {
    const x = round(clamp(next.x ?? pos.x, 0, 100));
    const y = round(clamp(next.y ?? pos.y, 0, 100));
    const z = next.zoom ?? zoom;
    onChange({
      [posKey]: x === DEFAULT.x && y === DEFAULT.y ? '' : `${x}% ${y}%`,
      [sizeKey]: z > 100 ? `${(coverWidth * z / 100).toFixed(1)}% auto` : '',
    });
  };

  const onPointerDown = event => {
    if (!ratio) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, x: pos.x, y: pos.y };
  };
  const onPointerMove = event => {
    if (!drag.current || !boxRef.current) return;
    const box = boxRef.current.getBoundingClientRect();
    const dx = ((event.clientX - drag.current.startX) / box.width) * 100;
    const dy = ((event.clientY - drag.current.startY) / box.height) * 100;
    // Dragging the photo right shows more of its left side, so the position goes down.
    set({
      x: spareX > 0.5 ? drag.current.x - (dx / spareX) * 100 : pos.x,
      y: spareY > 0.5 ? drag.current.y - (dy / spareY) * 100 : pos.y,
    });
  };
  const onPointerUp = () => { drag.current = null; };

  const bgSize = zoom > 100 ? `${photoWidth}% auto` : 'cover';

  const phone = view.posKey === VIEWS.phone.posKey;
  return <div className={`phone-photo ${phone ? 'is-phone' : 'is-desktop'}`}>
    <h4>{view.label}</h4>
    <div className="phone-photo-frame" style={phone ? { '--phone-ratio': view.ratio } : undefined}>
      <div className="phone-photo-bar"/>
      <div
        ref={boxRef}
        className={`phone-photo-box${ratio ? ' can-drag' : ''}`}
        style={image ? { backgroundImage: `url("${image}")`, backgroundSize: bgSize, backgroundPosition: `${pos.x}% ${pos.y}%` } : undefined}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      >
        {!image ? <span>Pick a photo above to position it</span> : null}
        <i className="phone-photo-fade"/>
        {!phone ? <div className="phone-photo-text on-photo"><b/><b/><b/></div> : null}
      </div>
      {phone ? <div className="phone-photo-text"><b/><b/><b/></div> : null}
    </div>
    <div className="phone-photo-controls">
            <label>Up / down <input type="range" min="0" max="100" value={pos.y} onChange={event => set({ y: Number(event.target.value) })} disabled={!image || spareY <= 0.5}/><output>{round(pos.y)}%</output></label>
      <label>Left / right <input type="range" min="0" max="100" value={pos.x} onChange={event => set({ x: Number(event.target.value) })} disabled={!image || spareX <= 0.5}/><output>{round(pos.x)}%</output></label>
      <label>Zoom <input type="range" min="100" max="300" step="5" value={zoom} onChange={event => set({ zoom: Number(event.target.value) })} disabled={!image}/><output>{zoom}%</output></label>
      <button type="button" className="site-admin-btn secondary small" onClick={() => onChange({ [posKey]: '', [sizeKey]: '' })}><RotateCcw size={13}/> Reset</button>
    </div>
  </div>;
}

// Both views side by side. `item` holds the four saved values; `onChange` gets the changed ones.
// phoneRatio: 3/2 for slider slides (homepage), 5/4 for single page banners.
export default function PhotoPositionField({ image, item = {}, onChange, phoneRatio = 5 / 4 }) {
  return <div className="photo-position">
    <p className="photo-position-help">Drag a photo, or use its sliders, to choose what shows. Desktop and phones are set separately.</p>
    <div className="photo-position-views">
      {[VIEWS.desktop, VIEWS.phone].map(view => (
        <PhotoBox key={view.posKey} view={view === VIEWS.phone ? { ...view, ratio: phoneRatio } : view} image={image} position={item[view.posKey]} size={item[view.sizeKey]} onChange={onChange}/>
      ))}
    </div>
  </div>;
}
