import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadInventorySources } from '../../services/inventorySourcesService';
import './inventorySources.css';

export default function InventorySources() {
  const { accessToken } = useAuth();
  const [sources, setSources] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    loadInventorySources(accessToken).then(setSources).catch(err => setError(err.message || 'Unable to load Inventory Sources.'));
  }, [accessToken]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sources;
    return sources.filter(source => Object.values(source).flat().join(' ').toLowerCase().includes(needle));
  }, [query, sources]);

  return <div className="inventory-sources-page">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Resale Inventory</p>
        <h1>Inventory Sources</h1>
        <p>Permanent database of places we use to find resale inventory.</p>
      </div>
    </div>

    {error && <div className="site-admin-error">{error}</div>}

    <div className="inventory-sources-toolbar">
      <label><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search source, category, location…"/></label>
      <span>{visible.length} sources</span>
    </div>

    <div className="inventory-sources-guide">
      <strong>Sourcing focus:</strong> fixed-price inventory, liquidation, wholesale, closeouts, customer returns, shelf pulls, overstock, bulk lots, case packs and direct-buy pallets. Auctions and bidding sites are not sourcing targets.
    </div>

    <div className="inventory-sources-grid">
      {visible.map(source => <article className="inventory-source-card" key={source.id}>
        <div className="inventory-source-top"><div><span className="inventory-source-type">{source.source_type}</span><h2>{source.name}</h2></div><span className="inventory-source-priority">{source.priority >= 85 ? 'Priority' : source.priority >= 60 ? 'Active' : 'Research'}</span></div>
        <dl>
          <div><dt>Location</dt><dd>{[source.city, source.address].filter(Boolean).join(' · ') || 'Ontario'}</dd></div>
          <div><dt>Categories</dt><dd>{Array.isArray(source.categories) ? source.categories.join(', ') : source.categories || 'General'}</dd></div>
        </dl>
        <p>{source.notes || 'No notes yet.'}</p>
        {source.website && <a className="site-admin-btn secondary small" href={source.website} target="_blank" rel="noreferrer">Open website <ExternalLink size={13}/></a>}
      </article>)}
    </div>
  </div>;
}
