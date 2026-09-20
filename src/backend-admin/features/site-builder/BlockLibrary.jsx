import { ArrowRight, Boxes, ExternalLink, Image, LayoutGrid, ListChecks, Megaphone, MonitorPlay, MousePointerClick, PanelTop, Rows3, Type } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  return <div className="jci-block-library">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website</p>
        <h1>Block Library</h1>
        <p>Design once, reuse everywhere. These are the pre-designed components available in the page builder.</p>
      </div>
      <div className="site-admin-actions"><Link className="site-admin-btn" to="/admin/website/pages">Open Pages <ExternalLink size={13}/></Link></div>
    </div>
    <div className="jci-block-library-note"><strong>This is the system going forward.</strong> New designs get added here once, then become reusable blocks in the page editor.</div>
    {groups.map(group => <section className="jci-block-group" key={group.title}>
      <div className="jci-block-group-head"><h2>{group.title}</h2><p>{group.description}</p></div>
      <div className="jci-block-grid">{group.blocks.map(({name,icon:Icon,description}) => <article className="site-admin-card jci-block-card" key={name}><span className="jci-block-icon"><Icon size={22}/></span><h3>{name}</h3><p>{description}</p><span className="jci-block-ready">Available in builder</span></article>)}</div>
    </section>)}
  </div>;
}
