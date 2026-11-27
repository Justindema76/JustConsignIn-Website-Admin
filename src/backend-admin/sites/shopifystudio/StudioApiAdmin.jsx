import { useEffect, useState } from 'react';
import { Copy, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';

// ChatGPT / API access for Shopify Studio. Keys are made here and shown once; only a hash is stored.
// The API (Supabase function "studio-api") reads brand, pricing and content and creates DRAFTS only.
const API_BASE = 'https://nowsajdmbpxvlvrhopjg.supabase.co/functions/v1/studio-api';

const CAN = [
  ['Read', 'Business details, brand rules and the design collection'],
  ['Read', 'Services, packages and prices (CAD) — always the current pricing'],
  ['Read', 'Blog articles, social posts, the content calendar and Studio media'],
  ['Read', 'Lead and content counts (no names or emails)'],
  ['Write', 'New blog and social drafts, and edits to anything still a draft'],
];
const GPT_INSTRUCTIONS = `You are Shopify Studio — Marketing & Growth, the marketing department for Shopify Studio (Justin DeMatteis), a Canadian-owned, Ontario-based Shopify design and development business in Hamilton, Ontario, serving retailers across Canada.

Before creating any content, call getBrand, getServices and listPosts so you use the current business details, brand rules, pricing (CAD) and avoid repeating existing articles.

Positioning (always): Canadian-owned. Ontario-based. Built around your business. Total customization from storefront to backend. The decade designs are examples of range, not templates — the collection is unlimited and growing. Every promotional social post clearly says we are Canadian and Ontario-based.

Rules: Canadian English. Prices only from getServices, always in CAD. Verified facts only — no invented statistics, certifications, awards or client results. Real client work only (Jill & The Beanstalk, JustConsignIn). Blog articles are educational and search-driven, written for Canadian retailers, and end with a relevant call to action (free store review or the related service). The goal is attracting paying customers.

Publishing: you create drafts only (createBlogDraft, createSocialDraft). Justin reviews and publishes everything in the admin. Never claim something is published. If a call fails, explain the error and fix the request rather than retrying blindly. Use updateBlogDraft / updateSocialDraft instead of creating duplicates.`;

const CANNOT = ['Publish, schedule or post anything', 'Delete anything', 'See customer names, emails or messages', 'Touch the main site, JustConsignIn, Sunwings or Rent & Rally'];

async function call(accessToken, method, body) {
  const response = await fetch('/api/admin/studio-api-keys', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

export default function StudioApiAdmin() {
  const { accessToken } = useAuth();
  const [keys, setKeys] = useState([]);
  const [fresh, setFresh] = useState('');
  const [label, setLabel] = useState('ChatGPT');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');

  const refresh = () => call(accessToken, 'GET').then(p => setKeys(p.keys || [])).catch(e => setError(e.message));
  useEffect(() => { if (accessToken) refresh(); }, [accessToken]);

  const create = async () => {
    setBusy(true); setError(''); setFresh('');
    try { const p = await call(accessToken, 'POST', { action: 'create', label }); setFresh(p.key); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const revoke = async k => {
    if (!window.confirm(`Turn off the key “${k.label}” (…${k.key_hint})? Anything using it stops working right away.`)) return;
    setBusy(true); setError('');
    try { await call(accessToken, 'POST', { action: 'revoke', id: k.id }); await refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const copy = (value, what) => { navigator.clipboard?.writeText(value); setCopied(what); setTimeout(() => setCopied(''), 1500); };

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Settings</p><h1>ChatGPT / API Access</h1><p>Lets ChatGPT (as a Custom GPT) read Shopify Studio's brand, pricing and content and save <b>drafts</b> for you to approve. It can never publish.</p></div>
    </div>
    {error && <div className="site-admin-alert error">{error}</div>}

    <div className="site-admin-card site-admin-side-card" style={{ maxWidth: 900 }}>
      <h2><ShieldCheck size={16} style={{ verticalAlign: -2 }} /> What it can and can't do</h2>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{CAN.map(([k, v], i) => <li key={i}><b>{k}:</b> {v}</li>)}</ul>
      <p style={{ marginBottom: 4 }}><b>Never:</b> {CANNOT.join(' · ')}.</p>
    </div>

    <div className="site-admin-card site-admin-side-card" style={{ maxWidth: 900 }}>
      <h2><KeyRound size={16} style={{ verticalAlign: -2 }} /> Keys</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 240px' }}>Name<input value={label} onChange={e => setLabel(e.target.value)} style={{ border: '1px solid #d7dce1', borderRadius: 8, padding: '9px 11px' }} /></label>
        <button className="site-admin-btn" type="button" onClick={create} disabled={busy}>Create key</button>
      </div>
      {fresh && <div className="site-admin-alert success" style={{ marginTop: 12 }}>
        Copy this key now — it won't be shown again.
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}><code style={{ background: '#fff', padding: '6px 8px', borderRadius: 6, overflowWrap: 'anywhere', flex: 1 }}>{fresh}</code><button className="site-admin-btn secondary small" type="button" onClick={() => copy(fresh, 'key')}><Copy size={13} /> {copied === 'key' ? 'Copied' : 'Copy'}</button></div>
      </div>}
      <div className="site-admin-table" style={{ marginTop: 12 }}>
        {keys.length ? keys.map(k => <div key={k.id} className="site-admin-table-row" style={{ display: 'grid', gridTemplateColumns: '1fr 140px 160px 110px', gap: 10 }}>
          <div><strong>{k.label}</strong><small>…{k.key_hint} · created {new Date(k.created_at).toLocaleDateString()}</small></div>
          <span className={`site-admin-status ${k.revoked_at ? 'hidden' : 'published'}`}>{k.revoked_at ? 'turned off' : 'active'}</span>
          <span style={{ fontSize: 12 }}>{k.last_used_at ? `Used ${new Date(k.last_used_at).toLocaleString()}` : 'Never used'}</span>
          {!k.revoked_at ? <button className="site-admin-btn secondary small" type="button" onClick={() => revoke(k)} disabled={busy}>Turn off</button> : <span />}
        </div>) : <div className="site-admin-empty">No keys yet.</div>}
      </div>
    </div>

    <div className="site-admin-card site-admin-side-card" style={{ maxWidth: 900 }}>
      <h2>Custom GPT instructions</h2>
      <p>Name it <b>Shopify Studio — Marketing &amp; Growth</b> and paste this into its Instructions box.</p>
      <textarea readOnly rows={12} value={GPT_INSTRUCTIONS} style={{ width: '100%', border: '1px solid #d7dce1', borderRadius: 8, padding: 10, font: 'inherit', fontSize: 13 }} />
      <button className="site-admin-btn secondary small" type="button" onClick={() => copy(GPT_INSTRUCTIONS, 'gpt')} style={{ marginTop: 8 }}><Copy size={12} /> {copied === 'gpt' ? 'Copied' : 'Copy instructions'}</button>
    </div>

    <div className="site-admin-card site-admin-side-card" style={{ maxWidth: 900 }}>
      <h2>Connect ChatGPT (Custom GPT)</h2>
      <ol style={{ lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
        <li>In ChatGPT: Explore GPTs → Create → Configure → <b>Create new action</b>.</li>
        <li>Authentication: <b>API Key</b>, Auth Type <b>Bearer</b>, paste a key from above.</li>
        <li>Schema: <b>Import from URL</b> and paste <code>{API_BASE}/openapi.json</code> <button className="site-admin-btn secondary small" type="button" onClick={() => copy(`${API_BASE}/openapi.json`, 'url')}><Copy size={12} /> {copied === 'url' ? 'Copied' : 'Copy'}</button></li>
        <li>Privacy policy URL: <code>https://www.justindematteis.com/shopify-studio/privacy</code></li>
        <li>Test it: ask the GPT to “get the brand rules”, then “create a blog draft”. The draft shows up in Blog Posts and the Content Calendar marked “AI”.</li>
      </ol>
    </div>
  </>;
}
