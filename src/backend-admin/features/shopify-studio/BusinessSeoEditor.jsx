import { Plus, Trash2 } from 'lucide-react';

// Business details, SEO overrides and extra footer links for Shopify Studio.
// The website fills anything left blank from its built-in defaults (src/features/shopify-studio/studioSite.js),
// so blank fields are fine. Saved inside the "global_shopify-studio" setting.

const BUSINESS_FIELDS = [
  ['name', 'Business name', 'Shopify Studio'],
  ['owner', 'Owner', 'Justin DeMatteis'],
  ['tagline', 'Brand statement', 'Canadian-owned. Ontario-based. Built around your business.', true],
  ['description', 'Short description (footer, Google)', 'Fully customized Shopify design, development and business solutions for Canadian retailers. From storefront to backend, your vision drives everything we build.', true],
  ['city', 'City', 'Hamilton'],
  ['region', 'Province', 'Ontario'],
  ['regionCode', 'Province code', 'ON'],
  ['country', 'Country', 'Canada'],
  ['serviceArea', 'Service area', 'Serving clients across Canada'],
  ['currency', 'Currency', 'CAD'],
  ['businessLine', 'Extra footer line', 'Canadian-owned · Prices in CAD', true],
  ['reviewResponse', 'Free store review reply time (emails)', 'within 48 hours'],
  ['quoteResponse', 'Quote reply time (emails)', 'within 2 business days'],
];

const EMAIL_FIELDS = [
  ['reviewSubject', 'Free store review · subject', 'We received your free store review request ({reference})'],
  ['reviewIntro', 'Free store review · message', "Thanks, {name}. Your free store review request is in. I'll go through your store and send your review {response}. It's complimentary, with no obligation.", 3],
  ['quoteSubject', 'Quote request · subject', 'We received your quote request ({reference})'],
  ['quoteIntro', 'Quote request · message', "Thanks for reaching out, {name}. Your quote request is in. I'll review what you need and reply {response} with questions or a written quote. Nothing is booked or charged until you approve a proposal.", 3],
  ['signature', 'Signature', 'Justin DeMatteis\nShopify Studio · Hamilton, Ontario, Canada', 2],
];

const FOOTER_COLUMNS = ['Shopify Services', 'Marketing & Growth', 'Design Showcase', 'Industries', 'Portfolio', 'Resources', 'Work With Us', 'Company'];

export default function BusinessSeoEditor({ values, set, eras, site }) {
  const business = values.business || {};
  const pages = values.seo?.pages || {};
  const links = values.footerLinks || [];
  const setBiz = (key, v) => set('business', { ...business, [key]: v });
  const setEmail = (key, v) => set('emails', { ...(values.emails || {}), [key]: v });
  const setPage = (path, key, v) => set('seo', { ...(values.seo || {}), pages: { ...pages, [path]: { ...(pages[path] || {}), [key]: v } } });
  const setLink = (i, key, v) => set('footerLinks', links.map((l, n) => n === i ? { ...l, [key]: v } : l));
  const seoPages = [
    ['/shopify-studio', 'Main Shopify Studio page'],
    ['/shopify-studio/pricing', 'Pricing'],
    ['/shopify-studio/case-study', 'Jill & The Beanstalk case study'],
    ['/shopify-studio/about', 'About'],
    ...eras.map(([key, label]) => [`/shopify-studio/${key}`, `${label} design`]),
  ];

  return <>
    <div className="email-settings-section-head compact"><div><h2>Business details</h2><p>Used everywhere at once: footer, About page, Google business data and customer emails. Blank = the built-in text shown in grey.</p></div></div>
    <div className="email-settings-fields">
      {BUSINESS_FIELDS.map(([key, label, fallback, wide]) => <label key={key} className={wide ? 'wide' : ''}>{label}
        <input value={business[key] || ''} placeholder={fallback} onChange={e => setBiz(key, e.target.value)} />
      </label>)}
    </div>

    <div className="email-settings-divider" />
    <div className="email-settings-section-head compact"><div><h2>Customer confirmation emails</h2><p>Sent to the customer right after a free store review or quote request, with a reference number and a copy of what they sent. Replies come to you. Use {'{name}'}, {'{reference}'}, {'{response}'} (reply time above) and {'{business}'}. Blank = the wording shown in grey. They confirm receipt only — never a price or a booking.</p></div></div>
    <div className="email-settings-fields">
      <label className="wide email-settings-checkbox-field"><span className="email-settings-checkbox-row">
        <input type="checkbox" checked={values.emails?.confirmations !== false} onChange={e => setEmail('confirmations', e.target.checked)} /> Send confirmation emails to customers
      </span></label>
      {EMAIL_FIELDS.map(([key, label, fallback, rows]) => <label key={key} className="wide">{label}
        {rows ? <textarea rows={rows} value={values.emails?.[key] || ''} placeholder={fallback} onChange={e => setEmail(key, e.target.value)} />
          : <input value={values.emails?.[key] || ''} placeholder={fallback} onChange={e => setEmail(key, e.target.value)} />}
      </label>)}
    </div>

    <div className="email-settings-divider" />
    <div className="email-settings-section-head compact"><div><h2>SEO</h2><p>Google title and description for each page. Design pages are written automatically from one template (each one describes its own style); fill a box only to override that page. Changes reach Google after the next deploy.</p></div></div>
    <div className="email-settings-fields">
      {seoPages.map(([path, label]) => <div key={path} className="wide" style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
        <b style={{ fontSize: 13 }}>{label}</b> <a href={`${site}${path}`} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>{path}</a>
        <label style={{ marginTop: 6 }}>Title <small>{(pages[path]?.title || '').length}/60</small>
          <input value={pages[path]?.title || ''} placeholder="Automatic" onChange={e => setPage(path, 'title', e.target.value)} />
        </label>
        <label style={{ marginTop: 6 }}>Description <small>{(pages[path]?.description || '').length}/160</small>
          <textarea rows={2} value={pages[path]?.description || ''} placeholder="Automatic" onChange={e => setPage(path, 'description', e.target.value)} />
        </label>
      </div>)}
    </div>

    <div className="email-settings-divider" />
    <div className="email-settings-section-head compact"><div><h2>Footer</h2><p>The footer builds itself: services come from Pricing, designs from Eras, plus the portfolio and company pages. Add extra links here (only to pages that exist).</p></div></div>
    <div className="email-settings-fields">
      {links.map((link, i) => <div key={i} className="wide" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr auto', gap: 8, alignItems: 'end' }}>
        <label>Column<select value={link.column || FOOTER_COLUMNS[0]} onChange={e => setLink(i, 'column', e.target.value)}>{FOOTER_COLUMNS.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Link text<input value={link.label || ''} onChange={e => setLink(i, 'label', e.target.value)} /></label>
        <label>Address<input value={link.href || ''} placeholder="/shopify-studio/..." onChange={e => setLink(i, 'href', e.target.value)} /></label>
        <button type="button" className="site-admin-btn secondary" onClick={() => set('footerLinks', links.filter((_, n) => n !== i))} aria-label="Remove link"><Trash2 size={14} /></button>
      </div>)}
      <button type="button" className="site-admin-btn secondary" onClick={() => set('footerLinks', [...links, { column: FOOTER_COLUMNS[0], label: '', href: '' }])}><Plus size={14} /> Add footer link</button>
    </div>
  </>;
}
