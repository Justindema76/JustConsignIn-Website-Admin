import { useMemo, useState } from 'react';
import { ExternalLink, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import './sunwingsPages.css';

const PUBLIC_BASE = import.meta.env.VITE_SUNWINGS_PREVIEW_URL || 'https://sunwingstransport.ca';

const STATIC_PAGES = [
  {
    id: 'home',
    title: 'Home',
    path: '/',
    source: 'Sunwings Settings',
    edit: '/admin/sunwings/settings',
  },
  {
    id: 'services-index',
    title: 'Services',
    path: '/services',
    source: 'Service Posts index',
    edit: '/admin/sunwings/services',
  },
  {
    id: 'locations-index',
    title: 'Locations',
    path: '/locations',
    source: 'Location Posts index',
    edit: '/admin/sunwings/locations',
  },
];

export default function PagesAdmin() {
  const [query, setQuery] = useState('');

  const visiblePages = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return STATIC_PAGES;

    return STATIC_PAGES.filter(page =>
      [page.title, page.path, page.source]
        .some(value => String(value || '').toLowerCase().includes(needle)),
    );
  }, [query]);

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Sunwings Website</p>
        <h1>Pages</h1>
        <p>Only static and index pages belong here. Services are managed in Service Posts and locations are managed in Location Posts.</p>
      </div>
    </div>

    <div className="sunwings-page-stats static-only">
      <div className="sunwings-page-stat-card">
        <strong>{STATIC_PAGES.length}</strong>
        <span>Static / Index Pages</span>
      </div>
    </div>

    <div className="site-admin-card sunwings-pages-card">
      <div className="sunwings-pages-toolbar">
        <div className="sunwings-page-search">
          <Search size={16}/>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search static pages…"
          />
        </div>
        <span>{visiblePages.length} shown</span>
      </div>

      <div className="sunwings-pages-table-head">
        <span>Page</span>
        <span>URL</span>
        <span>Source</span>
        <span>Status</span>
        <span>Actions</span>
      </div>

      {visiblePages.map(page => (
        <div className="sunwings-pages-row" key={page.id}>
          <div className="sunwings-page-title">
            <span className="sunwings-page-type-icon">
              <FileText size={16}/>
            </span>
            <div>
              <strong>{page.title}</strong>
            </div>
          </div>

          <code>{page.path}</code>

          <div>
            <strong>Static / Index</strong>
            <small>{page.source}</small>
          </div>

          <span className="site-admin-status system">System</span>

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

      {!visiblePages.length && <div className="site-admin-empty">No static pages match this search.</div>}
    </div>
  </>;
}
