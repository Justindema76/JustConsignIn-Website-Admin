import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, MapPinned, Search, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadLocationPosts, loadServicePosts } from './sunwingsPostStore';
import './sunwingsPages.css';

const PUBLIC_BASE = import.meta.env.VITE_SUNWINGS_PREVIEW_URL || 'https://sunwingstransport.ca';

const STATIC_PAGES = [
  {
    id: 'home',
    title: 'Home',
    path: '/',
    type: 'Static',
    status: 'system',
    source: 'Sunwings Settings',
    edit: '/admin/sunwings/settings',
  },
  {
    id: 'services-index',
    title: 'Services',
    path: '/services',
    type: 'Static',
    status: 'system',
    source: 'Service Posts index',
    edit: '/admin/sunwings/services',
  },
  {
    id: 'locations-index',
    title: 'Locations',
    path: '/locations',
    type: 'Static',
    status: 'system',
    source: 'Location Posts index',
    edit: '/admin/sunwings/locations',
  },
];

function PageTypeIcon({ type }) {
  if (type === 'Service') return <Truck size={16}/>;
  if (type === 'Location') return <MapPinned size={16}/>;
  return <FileText size={16}/>;
}

export default function PagesAdmin() {
  const { accessToken } = useAuth();
  const [services, setServices] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    setBusy(true);
    setError('');

    Promise.all([
      loadServicePosts(accessToken),
      loadLocationPosts(accessToken),
    ])
      .then(([serviceRows, locationRows]) => {
        setServices(serviceRows);
        setLocations(locationRows);
      })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  }, [accessToken]);

  const pages = useMemo(() => {
    const servicePages = services.map(post => ({
      id: post.id,
      title: post.title,
      path: `/services/${post.slug}`,
      type: 'Service',
      status: post.status,
      source: 'Service Post',
      edit: `/admin/sunwings/services/${post.id}`,
      updatedAt: post.updatedAt,
    }));

    const locationPages = locations.map(post => ({
      id: post.id,
      title: post.title,
      path: `/locations/${post.slug}`,
      type: 'Location',
      status: post.status,
      source: post.region || 'Location Post',
      edit: `/admin/sunwings/locations/${post.id}`,
      updatedAt: post.updatedAt,
    }));

    return [...STATIC_PAGES, ...servicePages, ...locationPages];
  }, [services, locations]);

  const visiblePages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pages.filter(page => {
      const typeMatch = filter === 'all'
        || (filter === 'static' && page.type === 'Static')
        || (filter === 'services' && page.type === 'Service')
        || (filter === 'locations' && page.type === 'Location')
        || (filter === 'draft' && page.status === 'draft')
        || (filter === 'published' && page.status === 'published');

      if (!typeMatch) return false;
      if (!needle) return true;

      return [page.title, page.path, page.type, page.source, page.status]
        .some(value => String(value || '').toLowerCase().includes(needle));
    });
  }, [pages, filter, query]);

  const counts = {
    total: pages.length,
    static: STATIC_PAGES.length,
    services: services.length,
    locations: locations.length,
    draft: pages.filter(page => page.status === 'draft').length,
    published: pages.filter(page => page.status === 'published').length,
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Sunwings Website</p>
        <h1>Pages</h1>
        <p>See the entire Sunwings page structure in one place. Service and location pages are generated from their posts.</p>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}

    <div className="sunwings-page-stats">
      <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
        <strong>{counts.total}</strong><span>All Pages</span>
      </button>
      <button type="button" className={filter === 'static' ? 'active' : ''} onClick={() => setFilter('static')}>
        <strong>{counts.static}</strong><span>Static</span>
      </button>
      <button type="button" className={filter === 'services' ? 'active' : ''} onClick={() => setFilter('services')}>
        <strong>{counts.services}</strong><span>Services</span>
      </button>
      <button type="button" className={filter === 'locations' ? 'active' : ''} onClick={() => setFilter('locations')}>
        <strong>{counts.locations}</strong><span>Locations</span>
      </button>
      <button type="button" className={filter === 'draft' ? 'active' : ''} onClick={() => setFilter('draft')}>
        <strong>{counts.draft}</strong><span>Draft</span>
      </button>
      <button type="button" className={filter === 'published' ? 'active' : ''} onClick={() => setFilter('published')}>
        <strong>{counts.published}</strong><span>Published</span>
      </button>
    </div>

    <div className="site-admin-card sunwings-pages-card">
      <div className="sunwings-pages-toolbar">
        <div className="sunwings-page-search">
          <Search size={16}/>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search title, URL, region or type…"
          />
        </div>
        <span>{visiblePages.length} shown</span>
      </div>

      <div className="sunwings-pages-table-head">
        <span>Page</span>
        <span>URL</span>
        <span>Type / Source</span>
        <span>Status</span>
        <span>Actions</span>
      </div>

      {busy ? <div className="site-admin-empty">Loading Sunwings pages…</div> : visiblePages.map(page => (
        <div className="sunwings-pages-row" key={`${page.type}-${page.id}`}>
          <div className="sunwings-page-title">
            <span className={`sunwings-page-type-icon ${page.type.toLowerCase()}`}>
              <PageTypeIcon type={page.type}/>
            </span>
            <div>
              <strong>{page.title}</strong>
              {page.updatedAt ? <small>Updated {new Date(page.updatedAt).toLocaleDateString()}</small> : null}
            </div>
          </div>

          <code>{page.path}</code>

          <div>
            <strong>{page.type}</strong>
            <small>{page.source}</small>
          </div>

          <span className={`site-admin-status ${page.status}`}>
            {page.status === 'system' ? 'System' : page.status}
          </span>

          <div className="site-admin-actions right">
            <Link className="site-admin-btn secondary small" to={page.edit}>Edit</Link>
            <a
              className="site-admin-btn secondary small"
              href={`${PUBLIC_BASE}${page.path}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={13}/> View
            </a>
          </div>
        </div>
      ))}

      {!busy && !visiblePages.length && <div className="site-admin-empty">No pages match this filter.</div>}
    </div>
  </>;
}
