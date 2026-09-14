import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, MapPinned, RotateCcw } from 'lucide-react';
import './outreachMap.css';

const STORAGE_KEY = 'jci-fb-outreach-v1';

const groups = [
  { id: 'g1', category: 'Consignment & resale owner communities', name: 'Shop My WORK Closet – Toronto Designer Resale', url: 'https://www.facebook.com/groups/1987418448193177/', badge: 'Public', figures: ['4.9K members', '90+ posts/day'], why: 'Local Toronto resale community with very high activity. Sellers here are the audience most likely to understand the need for better consignment workflows.' },
  { id: 'g2', category: 'Consignment & resale owner communities', name: 'Boutique, Resale & Consignment Ideas & Inspiration', url: 'https://www.facebook.com/groups/649348616486312/', badge: 'Public', figures: ['462 members'], why: 'Small but highly targeted: shop owners sharing operational ideas where a useful software recommendation can fit naturally.' },
  { id: 'g3', category: 'Consignment & resale owner communities', name: 'Furniture Consignment Shop Owners', url: 'https://www.facebook.com/groups/furnitureconsignmentowners/', badge: 'Public', figures: ['34 members'], why: 'A small owner-only niche where JustConsignIn can be positioned around tracking higher-value furniture inventory and payouts.' },
  { id: 'g4', category: 'Consignment & resale owner communities', name: 'Over the Rainbow (One Stop Consignment Shop)', url: 'https://www.facebook.com/groups/648345098836780/', badge: 'Public', figures: ['684 members'], why: 'A working consignment shop community whose members already understand consignment inventory and payout challenges.' },
  { id: 'g5', category: 'Consignment & resale owner communities', name: 'NEPA Consignment Shops', url: 'https://www.facebook.com/groups/161914894308082/', badge: 'Public', figures: ['1.9K members'], why: 'A consignment-specific regional audience that can help test messaging outside Ontario before a wider rollout.' },
  { id: 'g6', category: 'Ontario & Canadian small-business networks', name: 'Hamilton Networking For Business Owners & Entrepreneurs', url: 'https://www.facebook.com/groups/1753235494956566/', badge: 'Public', figures: ['6.4K members', '8 posts/day'], why: 'Your local market and warmest audience. Hamilton credibility makes a founder story more personal than a cold product pitch.' },
  { id: 'g7', category: 'Ontario & Canadian small-business networks', name: 'Small Business Owners – Ontario (Support & Networking)', url: 'https://www.facebook.com/groups/sboontario/', badge: 'Public', figures: ['14K members', '90+ posts/day'], why: 'Province-wide reach with a support and networking focus that suits a transparent “here is what I built” post.' },
  { id: 'g8', category: 'Ontario & Canadian small-business networks', name: 'Toronto Small Business Owners', url: 'https://www.facebook.com/groups/smallbusinessownersTO/', badge: 'Public', figures: ['73K members', '60 posts/day'], why: 'The largest local pool. Posts have a short shelf life, so timing and a strong opening matter.' },
  { id: 'g9', category: 'Ontario & Canadian small-business networks', name: 'Canadian Entrepreneurs', url: 'https://www.facebook.com/groups/370231967704681/', badge: 'Public', figures: ['33K members', '90+ posts/day'], why: 'National reach for the founder story and future standalone product, beyond only Ontario Shopify merchants.' },
  { id: 'g10', category: 'Shopify merchant communities', name: "The Shopify Store Owner's Network", url: 'https://www.facebook.com/groups/182811227011330/', badge: 'Public', figures: ['13K members', '80+ posts/day'], why: 'A more owner-focused Shopify audience where merchants actively ask for app and workflow recommendations.' },
  { id: 'g11', category: 'Shopify merchant communities', name: 'Shopify Store Owners | Ads, Sales & Growth', url: 'https://www.facebook.com/groups/shopifyowner/', badge: 'Public', figures: ['49K members'], why: 'Large reach for the Shopify integration tier once testimonials and beta results are ready to share.' },
];

const shops = [
  { id: 's1', name: 'Forget Me Not Consignment Boutique', url: 'https://www.facebook.com/forgetmenotinkw', badge: 'Kids/Baby', figures: ['Brantford, ON', '4.2K followers'], why: "An established children's consignment business where high consignor volume makes intake and payout tracking especially valuable." },
  { id: 's2', name: 'Sweet Bee Consignment Shop', url: 'https://www.facebook.com/profile.php?id=61561133031227', badge: 'Kids/Baby', figures: ['Arnprior, ON'], why: 'A newer small shop that may still be choosing its systems, making the timing stronger than with a business locked into older software.' },
  { id: 's3', name: 'Once Upon A Child – Toronto East York', url: 'https://www.facebook.com/OnceUponAChildTorontoEastYork', badge: 'Franchise', figures: ['East York, ON'], why: 'A major resale franchise location. Approach as workflow research first because franchise technology decisions may be centralized.' },
  { id: 's4', name: 'Time after Time Furniture Consignment', url: 'https://www.facebook.com/profile.php?id=100080876462699', badge: 'Furniture', figures: ['Guelph / Cambridge / KW, ON'], why: 'Furniture consignment creates a distinct pitch around accuracy and accountability for fewer, higher-value items.' },
  { id: 's5', name: 'Round Two Toronto Consignment Boutique', url: 'https://www.facebook.com/roundtwotoronto', badge: 'Designer', figures: ['Toronto, ON'], why: 'A designer resale boutique where accurate status and payout tracking matters because each item carries more value.' },
  { id: 's6', name: 'Sharafli Upscale Consignment Boutique', url: 'https://www.facebook.com/Sharafli.Upscale.Consignment.Boutique', badge: 'Designer', figures: ['Location needs confirmation'], why: 'Upscale resale is a good fit for higher-value inventory tracking. Confirm the location and current operation before contacting.' },
  { id: 's7', name: 'Bloom Consignment Boutique', url: 'https://www.facebook.com/bloomconsignmentboutique', badge: 'Boutique', figures: ['Location needs confirmation'], why: 'A general consignment boutique and potential fit for the streamlined manual intake and payout workflow.' },
  { id: 's8', name: 'Twice As Nice Ladies Consignment Boutique', url: 'https://www.facebook.com/btwiceasnice', badge: 'Boutique', figures: ['Location needs confirmation'], why: "A women's consignment specialist where frequent apparel intake matches JustConsignIn's core workflow." },
  { id: 's9', name: 'Preloved Consignment Boutique', url: 'https://www.facebook.com/prelovedconsignmentboutique', badge: 'Boutique', figures: ['Location needs confirmation'], why: 'Another apparel consignment lead to qualify after the stronger Ontario targets have been contacted.' },
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
  return <article className={`outreach-card ${checked ? 'complete' : ''}`}>
    <div className="outreach-card-top">
      <h3><a href={lead.url} target="_blank" rel="noreferrer">{lead.name}</a></h3>
      <span className="outreach-badge">{lead.badge}</span>
    </div>
    <div className="outreach-figures">{lead.figures.map(figure => <span key={figure}>{figure}</span>)}</div>
    <p>{lead.why}</p>
    <div className="outreach-card-actions">
      <a href={lead.url} target="_blank" rel="noreferrer">Open on Facebook <ExternalLink size={14}/></a>
      <label><input type="checkbox" checked={checked} onChange={() => onToggle(lead.id)}/>{action}</label>
    </div>
  </article>;
}

export default function OutreachMap() {
  const [progress, setProgress] = useState(loadProgress);
  const [copied, setCopied] = useState(null);
  const categories = useMemo(() => [...new Set(groups.map(group => group.category))], []);
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
      <div><strong>11</strong><span>Groups mapped</span></div>
      <div><strong>~236K</strong><span>Combined reach</span></div>
      <div><strong>9</strong><span>Shop leads</span></div>
      <div><strong>{groupCount + shopCount}/20</strong><span>Actions completed</span></div>
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
      <div className="outreach-grid">{shops.map(shop => <LeadCard key={shop.id} lead={shop} checked={Boolean(progress[shop.id])} onToggle={toggle} action="Contacted"/>)}</div>
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
