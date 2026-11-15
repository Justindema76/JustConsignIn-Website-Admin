import { useEffect, useMemo, useState } from 'react';
import { Copy, Plus, Printer, Save, Store, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadSunwingsQuotes, loadSunwingsSettings, saveSunwingsSettings } from './sunwingsAdminService';
import { commissionFor, money } from './commission';
import { BOOKED_STATUSES } from './branch';
import './storePartners.css';

// Store partners: furniture stores and shops that send customers to Sunwings. Each store gets a
// short link (sunwingstransport.ca/r/<code>) and a printable QR card. Quotes that came through a
// store's link are counted here. Saved in the `referral_partners` site setting; the site reads it
// to send each QR code to the right furniture quote page.

const SITE = 'https://www.sunwingstransport.ca';
const AREAS = [['main', 'Toronto & GTA'], ['hn', 'Hamilton & Niagara']];
const EMPTY = { name: '', contact: '', phone: '', area: 'main', notes: '' };

const slug = text => String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const linkFor = code => `${SITE}/r/${code}`;
// Local preview (vite dev) draws QR codes from the local site copy.
const QR_SITE = import.meta.env.DEV ? 'http://localhost:3099' : SITE;
const qrFor = code => `${QR_SITE}/api/qr?code=${encodeURIComponent(code)}`;

// A quote counts for a store when it came through the store's link (?ref=<code>).
const fromStore = (request, code) => {
  const text = `${request.message || ''} ${request.lead_source || ''}`;
  return text.includes(`Store partner: ${code}`) || text.includes(`ref=${code}`) || text.includes(`utm_source=${code}`);
};

function parseList(raw) {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Sign-ups from the /partners page arrive as messages starting "STORE PARTNER SIGN-UP".
function signupFrom(request) {
  const message = String(request.message || '');
  if (!/STORE PARTNER SIGN-UP/.test(message)) return null;
  const line = label => (message.match(new RegExp(`${label}: (.+)`)) || [])[1]?.trim() || '';
  return {
    id: request.id,
    name: line('Business'),
    contact: request.name || '',
    phone: request.phone || '',
    area: /hamilton-niagara|Hamilton & Niagara/i.test(request.lead_source || '') ? 'hn' : 'main',
    notes: [line('Store location'), line('Deliveries'), line('Furniture they sell')].filter(Boolean).join(' · '),
    at: request.created_at,
  };
}

function printCard(partner, phone) {
  const win = window.open('', '_blank', 'width=720,height=900');
  if (!win) return;
  const esc = text => String(text || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR card · ${esc(partner.name)}</title>
<style>
@page{size:5in 7in;margin:0}
*{box-sizing:border-box}body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#eee}
.card{width:5in;height:7in;margin:0 auto;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:.45in .4in;text-align:center;color:#111}
.top img{height:.9in}
.kicker{margin-top:.15in;font-size:11pt;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#b07800}
h1{margin:.08in 0 0;font-size:26pt;line-height:1.05}
.sub{margin:.1in 0 0;font-size:11.5pt;color:#444}
.qr{width:2.5in;height:2.5in;padding:.08in;border:3px solid #111;border-radius:.18in}
.qr img{width:100%;height:100%}
.scan{font-size:13pt;font-weight:800;margin-top:.08in}
.foot{font-size:10.5pt;color:#333}.foot b{font-size:13pt;color:#111}
.by{margin-top:.06in;font-size:9.5pt;color:#666}
@media print{body{background:#fff}.no-print{display:none}}
.no-print{text-align:center;padding:12px;font:600 14px system-ui}
</style></head><body>
<div class="no-print"><button onclick="print()">Print this card</button> &nbsp; Prints at 5×7 in. One card per page.</div>
<div class="card">
  <div class="top"><img src="https://nowsajdmbpxvlvrhopjg.supabase.co/storage/v1/object/public/site-assets/sunwings/1791151104850-Sunwings-Transport-Logo.png" alt="Sunwings Transport">
    <div class="kicker">Furniture delivery</div>
    <h1>Bought it here?<br>We'll bring it home.</h1>
    <p class="sub">Pickup from ${esc(partner.name)} and delivery to your door. Written quote before you book.</p>
  </div>
  <div><div class="qr"><img src="${qrFor(partner.code)}" alt="QR code"></div><div class="scan">Scan for a free delivery quote</div></div>
  <div class="foot">or call <b>${esc(phone)}</b><div class="by">sunwingstransport.ca/r/${esc(partner.code)}</div></div>
</div></body></html>`);
  win.document.close();
}

export default function StorePartnersAdmin() {
  const { accessToken } = useAuth();
  const [partners, setPartners] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [phone, setPhone] = useState('');
  const [draft, setDraft] = useState(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([loadSunwingsSettings(accessToken), loadSunwingsQuotes(accessToken).catch(() => [])])
      .then(([settings, rows]) => {
        setPartners(parseList(settings?.referral_partners));
        setPhone(settings?.phone || '');
        setQuotes(rows || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  }, [accessToken]);

  const stats = useMemo(() => Object.fromEntries(partners.map(partner => {
    const rows = quotes.filter(request => request.request_type !== 'contact' && fromStore(request, partner.code));
    const booked = rows.filter(request => BOOKED_STATUSES.has(String(request.status || '').toLowerCase()));
    const revenue = booked.reduce((sum, request) => sum + (commissionFor(request).price || 0), 0);
    return [partner.code, { quotes: rows.length, booked: booked.length, revenue }];
  })), [partners, quotes]);

  const signups = useMemo(() => {
    const added = new Set(partners.map(partner => slug(partner.name)));
    return quotes.map(signupFrom).filter(item => item && item.name && !added.has(slug(item.name)));
  }, [quotes, partners]);

  const change = next => { setPartners(next); setDirty(true); setMessage(''); };

  const add = from => {
    const source = from || draft;
    const name = source.name.trim();
    if (!name) return setError('Enter the store name.');
    let code = slug(name) || 'store';
    for (let n = 2; partners.some(partner => partner.code === code); n += 1) code = `${slug(name)}-${n}`;
    change([...partners, { ...EMPTY, ...source, name, code, active: true, addedAt: new Date().toISOString().slice(0, 10) }]);
    if (!from) setDraft(EMPTY);
    setError('');
  };

  const save = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      await saveSunwingsSettings(accessToken, { referral_partners: JSON.stringify(partners) });
      setDirty(false);
      setMessage('Saved. Store links work on the live site within about a minute.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = text => navigator.clipboard?.writeText(text).then(() => setMessage(`Copied ${text}`)).catch(() => {});

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Sunwings Transport</p>
        <h1>Store partners</h1>
        <p>Furniture stores and shops that send you customers. Each store gets its own link and QR card; quotes from it are counted here. Stores sign up at <a href={`${SITE}/partners`} target="_blank" rel="noreferrer">sunwingstransport.ca/partners</a>.</p>
      </div>
      <button className="site-admin-btn" type="button" onClick={save} disabled={busy || !dirty}><Save size={15}/> {busy ? 'Working…' : dirty ? 'Save changes' : 'Saved'}</button>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success">{message}</div>}

    {signups.length ? <div className="site-admin-card sp-signups">
      <h2><UserPlus size={16}/> New sign-ups from the website</h2>
      {signups.map(item => (
        <div className="sp-signup" key={item.id}>
          <div><b>{item.name}</b><span>{[item.contact, item.phone, item.notes].filter(Boolean).join(' · ')}</span></div>
          <button className="site-admin-btn secondary small" type="button" onClick={() => add(item)}><Plus size={13}/> Add as partner</button>
        </div>
      ))}
    </div> : null}

    <div className="site-admin-card sp-add">
      <h2><Store size={16}/> Add a store</h2>
      <div className="sp-form">
        <label>Store name<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Grimsby Consignment"/></label>
        <label>Contact<input value={draft.contact} onChange={e => setDraft({ ...draft, contact: e.target.value })} placeholder="Name"/></label>
        <label>Phone<input value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })}/></label>
        <label>QR code opens<select value={draft.area} onChange={e => setDraft({ ...draft, area: e.target.value })}>{AREAS.map(([v, l]) => <option key={v} value={v}>{l} furniture page</option>)}</select></label>
        <button className="site-admin-btn" type="button" onClick={() => add()}><Plus size={14}/> Add</button>
      </div>
      <small>Then click <b>Save changes</b> at the top. Its link and QR card appear below.</small>
    </div>

    <div className="site-admin-card">
      {!partners.length && !busy ? <p className="sp-empty">No stores yet. Add your first one above.</p> : null}
      <div className="sp-list">
        {partners.map((partner, index) => {
          const stat = stats[partner.code] || { quotes: 0, booked: 0, revenue: 0 };
          return <div className={`sp-row ${partner.active === false ? 'off' : ''}`} key={partner.code}>
            <img className="sp-qr" src={qrFor(partner.code)} alt={`QR code for ${partner.name}`} loading="lazy"/>
            <div className="sp-main">
              <b>{partner.name}</b>
              <span>{[partner.contact, partner.phone, AREAS.find(([v]) => v === partner.area)?.[1]].filter(Boolean).join(' · ')}</span>
              <button className="sp-link" type="button" onClick={() => copy(linkFor(partner.code))} title="Copy link"><Copy size={12}/> {linkFor(partner.code).replace('https://www.', '')}</button>
            </div>
            <div className="sp-stats">
              <div><b>{stat.quotes}</b><span>quotes</span></div>
              <div><b>{stat.booked}</b><span>booked</span></div>
              <div><b>{money(stat.revenue)}</b><span>job value</span></div>
            </div>
            <div className="sp-actions">
              <button className="site-admin-btn secondary small" type="button" onClick={() => printCard(partner, phone)}><Printer size={13}/> QR card</button>
              <label className="sp-toggle"><input type="checkbox" checked={partner.active !== false} onChange={e => change(partners.map((p, i) => i === index ? { ...p, active: e.target.checked } : p))}/> Active</label>
              <button className="site-admin-btn secondary small" type="button" aria-label="Remove store" onClick={() => { if (window.confirm(`Remove ${partner.name}? Its QR code will then open the normal furniture page without crediting the store.`)) change(partners.filter((_, i) => i !== index)); }}><Trash2 size={13}/></button>
            </div>
          </div>;
        })}
      </div>
    </div>
  </>;
}
