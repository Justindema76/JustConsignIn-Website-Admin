import { ArrowRight, BriefcaseBusiness, Boxes, ExternalLink, Image, LayoutGrid, ListChecks, Megaphone, MonitorPlay, MousePointerClick, PanelTop, Rows3, Type } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAdminSiteKey } from '../../services/siteAdminService';
import './blockLibrary.css';

const groups = [
  {
    title: 'Core reusable blocks',
    description: 'Use these on any page.',
    blocks: [
      { name: 'Hero', icon: Megaphone, description: 'Eyebrow, headline, copy, image, button and background.' },
      { name: 'Image + Text', icon: Image, description: 'Two-column image/content block with left/right image positioning.' },
      { name: 'Feature / Card Grid', icon: LayoutGrid, description: '2–3 column cards with alignment, backgrounds and optional images.' },
      { name: 'Heading', icon: Type, description: 'Reusable heading block with size and alignment controls.' },
      { name: 'Text', icon: Rows3, description: 'Reusable copy block with alignment controls.' },
      { name: 'Image', icon: Image, description: 'Standalone responsive image from Media, upload or URL.' },
      { name: 'Call to Action', icon: MousePointerClick, description: 'Headline, copy and button for conversion sections.' },
      { name: 'Project Card', icon: BriefcaseBusiness, description: 'Reusable work/project card with logo, semantic H1–H4 heading control, SEO summary, role, audience, technology tags, case-study link and left/right alternating dark panel.' },
      { name: 'JUSTIN · Project Showcase', icon: LayoutGrid, description: 'Reusable three-project showcase with image, title, description, internal project button and live website button for each project.' },
      { name: 'Project Request Drawer', icon: MousePointerClick, description: 'Global slide-out service request form. Edit the heading, copy, field labels, next-step text, submit button, success message and colours from Website → Project Request Drawer.' },
    ],
  },
  {
    title: 'JustConsignIn designed blocks',
    description: 'Finished designs already used by this site. They can be dragged into other JustConsignIn pages.',
    blocks: [
      { name: 'Shopify Hero', icon: PanelTop, description: 'Shopify-branded hero with metrics, buttons and workflow highlights.' },
      { name: 'Shopify Integration', icon: Boxes, description: 'Three-card Shopify/POS/product workflow section.' },
      { name: 'Video Gallery', icon: MonitorPlay, description: 'Connects to the existing YouTube video manager automatically.' },
      { name: 'Explore Links', icon: ArrowRight, description: 'Three reusable navigation cards.' },
      { name: 'Store Types Grid', icon: ListChecks, description: 'Audience/store-type cards with images, columns and alignment controls.' },
    ],
  },
];

export default function BlockLibrary() {
  const siteKey = getAdminSiteKey();
  const sunwingsGroups = [
    groups[0],
    {
      title: 'Sunwings designed blocks',
      description: 'Dynamic blocks used by the Sunwings website. Service and location grids stay connected to their post types.',
      blocks: [
        { name: 'Sunwings Hero', icon: PanelTop, description: 'Navy/orange Sunwings hero with heading, accent text, image and quote/call buttons.' },
        { name: 'Trust Strip', icon: ListChecks, description: 'Trust signals for reviews, pricing, scheduling and service coverage.' },
        { name: 'Service Posts Grid', icon: LayoutGrid, description: 'Automatically renders the published Service Posts.' },
        { name: 'How It Works', icon: Rows3, description: 'Three-step booking process with editable titles and descriptions.' },
        { name: 'Image + Checklist Feature', icon: Image, description: 'Business/commercial split section with media picker, checklist and button.' },
        { name: 'Price Band', icon: LayoutGrid, description: 'Dark homepage pricing band with two summary cards and CTA.' },
        { name: 'Pricing Factors + Guarantee', icon: ListChecks, description: 'Pricing factors checklist beside the price-match guarantee panel.' },
        { name: 'Pricing Cards', icon: LayoutGrid, description: 'Three fully editable pricing cards with featured-card control.' },
        { name: 'Location Posts Grid', icon: LayoutGrid, description: 'Automatically renders published Location Posts by region.' },
        { name: 'Reviews', icon: Rows3, description: 'Customer review section.' },
        { name: 'Moving Tips Grid', icon: LayoutGrid, description: 'Published Moving Tips Posts pulled automatically from the Sunwings blog.' },
        { name: 'FAQ', icon: Rows3, description: 'Up to eight editable questions and answers.' },
        { name: 'Contact + Quote Panel', icon: MousePointerClick, description: 'Quote form plus phone, email, hours and service-area contact cards.' },
        { name: 'Quote Form', icon: MousePointerClick, description: 'Sunwings quote-request form connected to Quote Requests.' },
        { name: 'Rich Text / Policy', icon: Type, description: 'Long-form text or HTML for privacy and information pages.' },
      ],
    },
  ];
  const visibleGroups = siteKey === 'sunwings' ? sunwingsGroups : groups;
  const pagesUrl = siteKey === 'sunwings' ? '/admin/sunwings/pages' : '/admin/website/pages';

  return <div className="jci-block-library">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website</p>
        <h1>Block Library</h1>
        <p>Design once, reuse everywhere. These are the pre-designed components available in the page builder.</p>
      </div>
      <div className="site-admin-actions"><Link className="site-admin-btn" to={pagesUrl}>Open Pages <ExternalLink size={13}/></Link></div>
    </div>
    <div className="jci-block-library-note"><strong>This is the system going forward.</strong> New designs get added here once, then become reusable blocks in the page editor.</div>
    {visibleGroups.map(group => <section className="jci-block-group" key={group.title}>
      <div className="jci-block-group-head"><h2>{group.title}</h2><p>{group.description}</p></div>
      <div className="jci-block-grid">{group.blocks.map(({name,icon:Icon,description}) => <article className="site-admin-card jci-block-card" key={name}><span className="jci-block-icon"><Icon size={22}/></span><h3>{name}</h3><p>{description}</p><span className="jci-block-ready">Available in builder</span></article>)}</div>
    </section>)}
  </div>;
}
