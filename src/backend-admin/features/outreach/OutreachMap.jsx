import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, MapPinned, RotateCcw } from 'lucide-react';
import './outreachMap.css';

const STORAGE_KEY = 'jci-fb-outreach-v1';

const groups = [
  { id: 'g1', category: 'Consignment & resale communities', name: 'Shop My WORK Closet – Toronto Designer Resale', url: 'https://www.facebook.com/groups/1987418448193177/', badge: 'Facebook', figures: ['Toronto resale community', 'Sign-in required to verify current size'], why: 'A local resale audience likely to understand the need for better inventory workflows. Check current rules before mentioning the app.' },
  { id: 'g2', category: 'Consignment & resale communities', name: 'Boutique, Resale & Consignment Ideas & Inspiration', url: 'https://www.facebook.com/groups/649348616486312/', badge: 'Facebook', figures: ['Resale-business niche', 'Sign-in required to verify current size'], why: 'A targeted community for operational discussions. Only post if its current rules permit software recommendations.' },
  { id: 'g6', category: 'Ontario & Canadian small-business networks', name: 'Hamilton Networking For Business Owners & Entrepreneurs', url: 'https://www.facebook.com/groups/1753235494956566/', badge: 'Facebook', figures: ['Hamilton-area businesses', 'Sign-in required to verify current size'], why: 'Your local market and warmest general-business audience. The Stoney Creek founder connection makes outreach more personal.' },
  { id: 'g7', category: 'Ontario & Canadian small-business networks', name: 'Small Business Owners – Ontario (Support & Networking)', url: 'https://www.facebook.com/groups/sboontario/', badge: 'Facebook', figures: ['Ontario businesses', 'Sign-in required to verify current size'], why: 'Province-wide networking reach for a transparent founder story, subject to the group’s current promotion rules.' },
  { id: 'g8', category: 'Ontario & Canadian small-business networks', name: 'Toronto Small Business Owners', url: 'https://www.facebook.com/groups/smallbusinessownersTO/', badge: 'Facebook', figures: ['Toronto businesses', 'Sign-in required to verify current size'], why: 'A broad Toronto audience where the Jill & the Beanstalk origin story provides relevant local context.' },
  { id: 'g9', category: 'Ontario & Canadian small-business networks', name: 'Canadian Entrepreneurs', url: 'https://www.facebook.com/groups/370231967704681/', badge: 'Facebook', figures: ['Canadian businesses', 'Sign-in required to verify current size'], why: 'National founder and product reach beyond Ontario, provided vendor or promotional posts are allowed.' },
  { id: 'g10', category: 'Shopify merchant communities', name: "The Shopify Store Owner's Network", url: 'https://www.facebook.com/groups/182811227011330/', badge: 'Facebook', figures: ['Shopify merchants', 'Sign-in required to verify current size'], why: 'An owner-focused audience where merchants discuss Shopify apps and operational workflows.' },
  { id: 'g11', category: 'Shopify merchant communities', name: 'Shopify Store Owners | Ads, Sales & Growth', url: 'https://www.facebook.com/groups/shopifyowner/', badge: 'Facebook', figures: ['Shopify merchants', 'Sign-in required to verify current size'], why: 'Useful Shopify reach once the post includes a concrete workflow result instead of a generic product pitch.' },
];

const shops = [
  { id: 's10', category: 'Nearby — contact first', name: 'The Reloved Boutique', url: 'https://therelovedboutique.com/', links: [{ label: 'Website', type: 'website', url: 'https://therelovedboutique.com/' }, { label: 'Facebook', type: 'facebook', url: 'https://www.facebook.com/the.reloved.boutique/' }, { label: 'Contact form', type: 'contact', url: 'https://therelovedboutique.com/pages/contact' }, { label: '289-389-2667', type: 'phone', url: 'tel:+12893892667' }], badge: 'Shopify verified', badgeTone: 'shopify', figures: ['Hamilton, ON', '226 James St N, L8R 2L3', 'Shopify storefront'], why: 'The strongest local fit: a high-volume women’s consignment shop with scheduled intake, consignor accounts, store credit, and payout requests. Its online shop is planned for fall 2026.' },
  { id: 's12', category: 'Nearby — contact first', name: 'Treasures and Trends', url: 'https://treasuresandtrends.ca/', links: [{ label: 'Website', type: 'website', url: 'https://treasuresandtrends.ca/' }, { label: 'Contact form', type: 'contact', url: 'https://treasuresandtrends.ca/contact-us' }, { label: '289-337-9337', type: 'phone', url: 'tel:+12893379337' }], badge: 'Non-Shopify', badgeTone: 'local', figures: ['Burlington, ON', '3300 Fairview St, Unit 6B, L7N 3N7', 'GoDaddy Website Builder'], why: 'A local mixed-inventory consignment store. It is not currently on Shopify, so qualify its ecommerce plans before pitching the integrated tier.' },
  { id: 's13', category: 'Nearby — contact first', name: "Zoey's Consignment", url: 'https://zoeys.ca/', links: [{ label: 'Website', type: 'website', url: 'https://zoeys.ca/' }, { label: 'Contact form', type: 'contact', url: 'https://zoeys.ca/pages/contact-us' }, { label: 'info@zoeys.ca', type: 'email', url: 'mailto:info@zoeys.ca' }, { label: '905-681-9639', type: 'phone', url: 'tel:+19056819639' }], badge: 'Shopify verified', badgeTone: 'shopify', figures: ['Burlington, ON', '4155 Fairview St, Units 13–14, L7L 2A4', 'Shopify storefront'], why: 'A confirmed Shopify storefront and an especially strong integration prospect for higher-value furniture inventory.' },
  { id: 's14', category: 'Ontario Shopify prospects', name: 'Doorstep Consignment', url: 'https://doorstepconsignment.com/', links: [{ label: 'Website', type: 'website', url: 'https://doorstepconsignment.com/' }, { label: 'Facebook group', type: 'facebook', url: 'https://www.facebook.com/groups/308289843386397/' }, { label: 'shop.info.dsc@gmail.com', type: 'email', url: 'mailto:shop.info.dsc@gmail.com' }], badge: 'Shopify verified', badgeTone: 'shopify', figures: ['Mitchell / St. Marys, ON', '5405 Line 32 / 4920 Line 16', 'Shopify storefront'], why: 'A confirmed Shopify consignment store that started as a Facebook group. Its online inventory and store-credit workflow make this a high-priority product-fit lead.' },
  { id: 's15', category: 'Ontario Shopify prospects', name: 'CWK Consignment', url: 'https://cwkconsignment.ca/', links: [{ label: 'Website', type: 'website', url: 'https://cwkconsignment.ca/' }, { label: 'Contact form', type: 'contact', url: 'https://cwkconsignment.ca/pages/contact' }], badge: 'Shopify verified', badgeTone: 'shopify', figures: ['Southwestern Ontario', '7 pickup locations', '15,000+ Shopify listings'], why: 'A very large catalogue spanning children, adults, housewares and local vendors. The volume and multi-location pickup workflow make it a high-value integration prospect.' },
  { id: 's16', category: 'Ontario Shopify prospects', name: 'The Dress Exchange', url: 'https://thedress-exchange.myshopify.com/', links: [{ label: 'Website', type: 'website', url: 'https://thedress-exchange.myshopify.com/' }, { label: 'Contact form', type: 'contact', url: 'https://thedress-exchange.myshopify.com/pages/contact' }, { label: 'TracyLCole@outlook.com', type: 'email', url: 'mailto:TracyLCole@outlook.com' }], badge: 'Shopify verified', badgeTone: 'shopify', figures: ['East Garafraxa, ON', '232375 County Road 24', 'Shopify storefront'], why: 'An appointment-based bridal and formalwear consignment store selling unique, higher-value inventory online—well matched to item ownership and payout tracking.' },
  { id: 's17', category: 'Ontario Shopify prospects', name: 'KW Consignment Inc.', url: 'https://www.kwconsignment.com/', links: [{ label: 'Website', type: 'website', url: 'https://www.kwconsignment.com/' }, { label: 'Contact form', type: 'contact', url: 'https://www.kwconsignment.com/pages/contact-us' }, { label: 'info@kwconsignment.com', type: 'email', url: 'mailto:info@kwconsignment.com' }, { label: '519-778-4415', type: 'phone', url: 'tel:+15197784415' }], badge: 'Shopify verified', badgeTone: 'shopify', figures: ['Waterloo, ON', '86 Rankin St, Unit 4', 'Shopify storefront'], why: 'An active multi-category consignment business covering luxury fashion, furniture, décor, collectibles and auctions. It is an excellent fit for linked consignor and inventory records.' },
  { id: 's18', category: 'Ontario Shopify prospects', name: 'Fashionably Yours', url: 'https://fashionablyyours.com/', links: [{ label: 'Website', type: 'website', url: 'https://fashionablyyours.com/' }, { label: 'Contact form', type: 'contact', url: 'https://fashionablyyours.com/pages/contact-us' }, { label: 'sell@fashionablyyours.com', type: 'email', url: 'mailto:sell@fashionablyyours.com' }, { label: '647-802-9687', type: 'phone', url: 'tel:+16478029687' }], badge: 'Shopify verified', badgeTone: 'shopify', figures: ['Toronto, ON', '707 Queen St W, M6J 1E6', 'Shopify storefront'], why: 'A mature luxury-consignment operation with online and physical sales, item-by-item inventory and consignor intake. Lead with workflow efficiency rather than basic ecommerce.' },
  { id: 's19', category: 'Ontario Shopify prospects', name: 'Closet Cravings Consignment', url: 'https://closetcravings.ca/', links: [{ label: 'Website', type: 'website', url: 'https://closetcravings.ca/' }, { label: 'Contact page', type: 'contact', url: 'https://closetcravings.ca/pages/hours-1' }, { label: 'Closetcravingsinc@gmail.com', type: 'email', url: 'mailto:Closetcravingsinc@gmail.com' }, { label: '519-956-9977', type: 'phone', url: 'tel:+15199569977' }], badge: 'Shopify + ConsignTill', badgeTone: 'shopify', figures: ['Tecumseh, ON', '25 Amy Croft Dr, N9K 1C7', 'Uses ConsignTill'], why: 'A verified Shopify consignment store with more than 1,200 products. Its public contact page confirms an existing ConsignTill account, making this a competitor-replacement lead rather than a greenfield prospect.' },
  { id: 's20', category: 'Ontario Shopify prospects', name: 'Designer Exchange Consignment', url: 'https://www.designerexchange.ca/', links: [{ label: 'Website', type: 'website', url: 'https://www.designerexchange.ca/' }, { label: 'Contact form', type: 'contact', url: 'https://www.designerexchange.ca/pages/contact-us' }, { label: '647-342-8500', type: 'phone', url: 'tel:+16473428500' }], badge: 'Shopify verified', badgeTone: 'shopify', figures: ['Toronto, ON', '3A–3 Wendover Rd, M8X 2L1', 'Shopify storefront'], why: 'An established luxury-consignment store with active online inventory and local pickup. Strong fit for accurate product ownership, sale status and payouts.' },
  { id: 's4', category: 'Ontario follow-up leads', name: 'Time after Time Furniture Consignment', url: 'https://www.facebook.com/profile.php?id=100080876462699', links: [{ label: 'Facebook', type: 'facebook', url: 'https://www.facebook.com/profile.php?id=100080876462699' }, { label: '519-265-0702', type: 'phone', url: 'tel:+15192650702' }], badge: 'Facebook only', figures: ['Guelph, ON', '666 Woolwich St, N1H 7G5', 'Shopify not found'], why: 'Furniture consignment creates a distinct pitch around accuracy and accountability for fewer, higher-value items.' },
  { id: 's5', category: 'Ontario follow-up leads', name: 'Round Two Toronto Consignment Boutique', url: 'https://www.roundtwotoronto.com/', links: [{ label: 'Website', type: 'website', url: 'https://www.roundtwotoronto.com/' }, { label: 'Facebook', type: 'facebook', url: 'https://www.facebook.com/roundtwotoronto' }, { label: 'round2toronto@gmail.com', type: 'email', url: 'mailto:round2toronto@gmail.com' }], badge: 'Platform unclear', figures: ['Toronto, ON', 'Designer resale'], why: 'A designer resale boutique where accurate status and payout tracking matters because each item carries more value.' },
  { id: 's6', category: 'Ontario follow-up leads', name: 'Sharafli Upscale Consignment Boutique', url: 'https://www.facebook.com/Sharafli.Upscale.Consignment.Boutique', links: [{ label: 'Facebook', type: 'facebook', url: 'https://www.facebook.com/Sharafli.Upscale.Consignment.Boutique' }, { label: '226-246-9775', type: 'phone', url: 'tel:+12262469775' }], badge: 'Facebook only', figures: ['Windsor, ON', '1395 Tecumseh Rd E', 'Shopify not found'], why: 'An upscale Windsor consignment lead. Use Facebook or phone because no current standalone website was found.' },
];

const templates = [
  {
    title: 'For owner groups — a post, not an ad',
    guidance: 'Lead with the problem and your founder story. Check the group rules before mentioning the free trial or website.',
    text: `I built JustConsignIn after seeing how much time a busy consignment store was losing to paper tags and spreadsheets. It keeps consignors, inventory, sales and payouts connected, with Shopify and Shopify POS integration for stores that need it.\n\nI’m currently looking for a small group of consignment-store owners to help beta test it while it goes through the Shopify App Store process. If this sounds like your workflow, I’d be happy to show you what we’ve built and learn how your store handles intake and payouts: https://www.justconsignin.com/`,
  },
  {
    title: 'For a specific shop — a personalized DM',
    guidance: 'Replace both bracketed sections with something real from the shop’s page before sending.',
    text: `Hi [Shop Name] team — I was looking at your page and really liked [specific detail from their page]. I’m the developer of JustConsignIn, a Shopify consignment-management app built to simplify consignor intake, item tracking, sales and payouts.\n\nWe’re preparing for beta testing while the app goes through the Shopify App Store process. I’d be happy to give you a personal walkthrough, learn about your current workflow and invite you to test it if it looks like a good fit. There’s no pressure or obligation: https://www.justconsignin.com/`,
  },
];

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function LeadCard({ lead, checked, onToggle, action }) {
  const links = lead.links || [{ label: 'Facebook', type: 'facebook', url: lead.url }];
  return <article className={`outreach-card ${checked ? 'complete' : ''}`}>
    <div className="outreach-card-top">
      <h3><a href={lead.url} target="_blank" rel="noreferrer">{lead.name}</a></h3>
      <span className={`outreach-badge ${lead.badgeTone || ''}`}>{lead.badge}</span>
    </div>
    <div className="outreach-figures">{lead.figures.map(figure => <span key={figure}>{figure}</span>)}</div>
    <p>{lead.why}</p>
    <div className="outreach-card-actions">
      <div className="outreach-card-links">{links.map(link => <a className={link.type || 'website'} key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} <ExternalLink size={14}/></a>)}</div>
      <label><input type="checkbox" checked={checked} onChange={() => onToggle(lead.id)}/>{action}</label>
    </div>
  </article>;
}

export default function OutreachMap() {
  const [progress, setProgress] = useState(loadProgress);
  const [copied, setCopied] = useState(null);
  const categories = useMemo(() => [...new Set(groups.map(group => group.category))], []);
  const shopCategories = useMemo(() => [...new Set(shops.map(shop => shop.category || 'Ontario follow-up leads'))], []);
  const groupCount = groups.filter(group => progress[group.id]).length;
  const shopCount = shops.filter(shop => progress[shop.id]).length;

  const toggle = id => setProgress(current => {
    const next = { ...current, [id]: !current[id] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  });

  const copyTemplate = async (text, index) => {
    await navigator.clipboard.writeText(text);
    setCopied(index);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const resetProgress = () => {
    if (!window.confirm('Clear every joined, posted, and contacted checkbox?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setProgress({});
  };

  return <div className="outreach-page">
    <div className="site-admin-page-head outreach-head">
      <div>
        <p className="site-admin-eyebrow">Leads & Growth</p>
        <h1>Facebook Outreach Map</h1>
        <p>Facebook groups and real consignment shops to approach for JustConsignIn beta testing.</p>
      </div>
      <button className="site-admin-btn secondary" type="button" onClick={resetProgress}><RotateCcw size={15}/> Reset progress</button>
    </div>

    <div className="outreach-stats">
      <div><strong>{groups.length}</strong><span>Groups mapped</span></div>
      <div><strong>Sep 28</strong><span>Last verified</span></div>
      <div><strong>{shops.length}</strong><span>Shop leads</span></div>
      <div><strong>{groupCount + shopCount}/{groups.length + shops.length}</strong><span>Actions completed</span></div>
    </div>

    <section className="outreach-section">
      <div className="outreach-section-head"><div><h2>Groups to join and post in</h2><p>Ranked by fit. Read every group’s pinned rules before posting—some prohibit vendor promotion.</p></div><span>{groupCount} / {groups.length} joined</span></div>
      {categories.map(category => <div className="outreach-category" key={category}>
        <h3>{category}</h3>
        <div className="outreach-grid">{groups.filter(group => group.category === category).map(group => <LeadCard key={group.id} lead={group} checked={Boolean(progress[group.id])} onToggle={toggle} action="Joined / posted"/>)}</div>
      </div>)}
    </section>

    <section className="outreach-section">
      <div className="outreach-section-head"><div><h2>Shops to contact directly</h2><p>Research the shop first, personalize the message, and approach them as potential beta partners—not as names on a mass-DM list.</p></div><span>{shopCount} / {shops.length} contacted</span></div>
      {shopCategories.map(category => <div className="outreach-category" key={category}>
        <h3>{category}</h3>
        <div className="outreach-grid">{shops.filter(shop => (shop.category || 'Ontario follow-up leads') === category).map(shop => <LeadCard key={shop.id} lead={shop} checked={Boolean(progress[shop.id])} onToggle={toggle} action="Contacted"/>)}</div>
      </div>)}
    </section>

    <section className="outreach-section">
      <div className="outreach-section-head"><div><h2>Outreach messages</h2><p>Use a different approach for owner communities and individual businesses.</p></div></div>
      <div className="outreach-template-grid">{templates.map((template, index) => <article className="outreach-template" key={template.title}>
        <div><span>Message {index + 1}</span><h3>{template.title}</h3><p>{template.guidance}</p></div>
        <pre>{template.text}</pre>
        <button className="site-admin-btn secondary" type="button" onClick={() => copyTemplate(template.text, index)}>{copied === index ? <Check size={15}/> : <Copy size={15}/>} {copied === index ? 'Copied' : 'Copy message'}</button>
      </article>)}</div>
    </section>

    <div className="outreach-reminder"><MapPinned size={20}/><div><strong>Start local and specific.</strong><span>Begin with Hamilton and the niche consignment-owner groups. Never post the identical message across several groups on the same day.</span></div></div>
  </div>;
}
