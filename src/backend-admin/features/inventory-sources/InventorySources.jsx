import { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import './inventorySources.css';

const SOURCES = [
  {
    name: 'AmazeDeals',
    url: 'https://amazedeals.ca/',
    location: 'Kitchener, Ontario',
    type: 'Liquidation / wholesale',
    categories: 'Apparel, footwear, toys, home & kitchen, sports & outdoors, tools & hardware',
    buying: 'Fixed-price lots, manifested pallets, local pickup and shipping',
    note: 'Priority source. Check category lots and manifested inventory for landed cost and resale margin before buying.',
    priority: 'Priority',
  },
  {
    name: 'AmazeDeals Liquidation Radar',
    url: 'https://amazedeals.ca/pages/liquidation-radar',
    location: 'Ontario',
    type: 'Source directory',
    categories: 'Liquidation and wholesale suppliers',
    buying: 'Research directory — verify each supplier before buying',
    note: 'Useful starting point for finding additional Ontario inventory sources. Do not assume every listed supplier is fixed-price.',
    priority: 'Research',
  },
  {
    name: 'Kijiji',
    url: 'https://www.kijiji.ca/',
    location: 'Ontario / local',
    type: 'Classifieds',
    categories: 'Used goods, reseller lots, moving clear-outs, sports, tools, toys, home goods',
    buying: 'Fixed-price local listings',
    note: 'Best for local bundles and clear-outs. Evaluate each listing individually rather than applying category-wide buy rules.',
    priority: 'Active',
  },
  {
    name: 'Facebook Marketplace',
    url: 'https://www.facebook.com/marketplace/',
    location: 'Ontario / local',
    type: 'Marketplace',
    categories: 'Used goods, bundles, garage-sale lots, sporting goods, clothing, home goods',
    buying: 'Fixed-price local listings',
    note: 'High-value local source when listings are accessible. Public/indexed access can be inconsistent, so never create or assume unavailable listings.',
    priority: 'Active',
  },
];

export default function InventorySources() {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return SOURCES;
    return SOURCES.filter(source => Object.values(source).join(' ').toLowerCase().includes(needle));
  }, [query]);

  return <div className="inventory-sources-page">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Outreach Program · Inventory Research</p>
        <h1>Inventory Sources</h1>
        <p>Permanent source list for places we use to find resale inventory. Keep the source here so we do not have to remember or rediscover it later.</p>
      </div>
    </div>

    <div className="inventory-sources-toolbar">
      <label><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search source, category, location…"/></label>
      <span>{visible.length} sources</span>
    </div>

    <div className="inventory-sources-guide">
      <strong>Sourcing focus:</strong> fixed-price inventory, liquidation, wholesale, closeouts, customer returns, shelf pulls, overstock, bulk lots, case packs and direct-buy pallets. Auctions and bidding sites are not sourcing targets.
    </div>

    <div className="inventory-sources-grid">
      {visible.map(source => <article className="inventory-source-card" key={source.name}>
        <div className="inventory-source-top"><div><span className="inventory-source-type">{source.type}</span><h2>{source.name}</h2></div><span className="inventory-source-priority">{source.priority}</span></div>
        <dl>
          <div><dt>Location</dt><dd>{source.location}</dd></div>
          <div><dt>Categories</dt><dd>{source.categories}</dd></div>
          <div><dt>Buying</dt><dd>{source.buying}</dd></div>
        </dl>
        <p>{source.note}</p>
        <a className="site-admin-btn secondary small" href={source.url} target="_blank" rel="noreferrer">Open website <ExternalLink size={13}/></a>
      </article>)}
    </div>
  </div>;
}
