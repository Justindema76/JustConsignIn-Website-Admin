import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { getAdminSiteKey } from '../../services/siteAdminService';
import { getSiteConfig } from '../../sites/registry';
import { getSiteIcon } from '../../sites/icons';
import { loadAdminBlogPosts } from '../blog/blogStore';
import { loadSunwingsQuotes } from '../../sites/sunwings/sunwingsAdminService';
import { loadLocationPosts, loadServicePosts } from '../../sites/sunwings/sunwingsPostStore';
import './dashboard.css';

function SunwingsMetrics() {
  const { accessToken } = useAuth();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([loadServicePosts(accessToken), loadLocationPosts(accessToken), loadAdminBlogPosts(accessToken), loadSunwingsQuotes(accessToken)])
      .then(([services, locations, blog, quotes]) => setCounts({
        services: services.length,
        locations: locations.length,
        blog: blog.length,
        newQuotes: quotes.filter(item => item.status === 'new').length,
      }))
      .catch(() => setCounts(null));
  }, [accessToken]);

  if (!counts) return null;

  const items = [
    { label: 'Service Posts', value: counts.services },
    { label: 'Location Posts', value: counts.locations },
    { label: 'Moving Tips Posts', value: counts.blog },
    { label: 'New Quote Requests', value: counts.newQuotes },
  ];

  return <div className="dashboard-metrics">
    {items.map(item => <div className="dashboard-metric-card" key={item.label}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
    </div>)}
  </div>;
}

export default function Dashboard() {
  const siteKey = getAdminSiteKey();
  const siteConfig = getSiteConfig(siteKey);
  const { dashboard } = siteConfig;

  return <>
    <div className="site-admin-page-head dashboard-head">
      <div>
        <p className="site-admin-eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p>{dashboard.intro}</p>
      </div>
    </div>

    {siteKey === 'sunwings' && <SunwingsMetrics />}

    <section className="dashboard-quick">
      <div className="dashboard-section-heading">
        <div>
          <p className="site-admin-eyebrow">Quick Access</p>
          <h2>Open what you are working on</h2>
        </div>
      </div>
      <div className="dashboard-quick-grid">
        {dashboard.quick.map(item => {
          const Icon = getSiteIcon(item.icon);
          return <Link className="dashboard-quick-card" to={item.to} key={item.to}>
            <span className="dashboard-quick-icon"><Icon size={20}/></span>
            <span>
              <strong>{item.title}</strong>
              <small>{item.copy}</small>
            </span>
            <span className="dashboard-link-arrow">›</span>
          </Link>;
        })}
      </div>
    </section>

    <div className="dashboard-section-grid">
      {dashboard.sections.map(section => <section className={`dashboard-section-card ${section.id}`} key={section.id}>
        <div className="dashboard-section-heading">
          <div>
            <h2>{section.title}</h2>
            <p>{section.copy}</p>
          </div>
        </div>

        <div className="dashboard-link-list">
          {section.items.map(item => {
            const Icon = getSiteIcon(item.icon);
            return <Link className="dashboard-link-row" to={item.to} key={item.to}>
              <span className="dashboard-row-icon"><Icon size={17}/></span>
              <span className="dashboard-row-copy">
                <strong>{item.title}</strong>
                <small>{item.copy}</small>
              </span>
              <span className="dashboard-link-arrow">›</span>
            </Link>;
          })}
        </div>
      </section>)}
    </div>
  </>;
}
