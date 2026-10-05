import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { getAdminSiteKey } from '../../services/siteAdminService';
import { getSiteConfig } from '../../sites/registry';
import { getSiteIcon } from '../../sites/icons';
import { loadDashboardData } from './dashboardData';
import './dashboard.css';

function BoardStatus({ metrics }) {
  if (!metrics) return null;
  return <section className="dispatch-strip">
    <div className="dispatch-strip-head">
      <h2>Board Status</h2>
    </div>
    <div className="dispatch-metrics">
      {metrics.map(item => <div className={`dispatch-metric ${item.attention ? 'attention' : ''}`} key={item.label}>
        <div className="dispatch-metric-label">{item.label}</div>
        <div className="dispatch-metric-value">{String(item.value).padStart(2, '0')}</div>
        <div className="dispatch-metric-note">{item.note}</div>
      </div>)}
    </div>
  </section>;
}

function LeadsPanel({ leads }) {
  if (!leads) return null;
  return <section className="site-admin-card dashboard-leads-panel">
    <div className="dashboard-leads-head">
      <div>
        <h2>{leads.title}</h2>
        <p>{leads.copy}</p>
      </div>
      <Link className="dashboard-leads-viewall" to={leads.viewAllTo}>View all →</Link>
    </div>
    {!leads.items.length
      ? <div className="site-admin-empty">Nothing new yet.</div>
      : <div className="dashboard-leads-list">
        {leads.items.map(item => <div className="dashboard-leads-row" key={item.id}>
          <div className="dashboard-leads-who">
            <strong>{item.title}</strong>
            <small>{item.meta}</small>
          </div>
          <span className="dashboard-leads-chip">{item.chip}</span>
          <span className="dashboard-leads-time">{item.time}</span>
        </div>)}
      </div>}
  </section>;
}

export default function Dashboard() {
  const { accessToken } = useAuth();
  const siteKey = getAdminSiteKey();
  const siteConfig = getSiteConfig(siteKey);
  const { dashboard } = siteConfig;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    setData(null);
    loadDashboardData(siteKey, accessToken).then(setData).catch(() => setData(null));
  }, [accessToken, siteKey]);

  const metrics = data?.metrics?.map(item => ({
    ...item,
    attention: item.label.toLowerCase().includes('request') && item.value > 0,
  }));

  return <>
    <div className="site-admin-page-head dashboard-head">
      <div>
        <p className="site-admin-eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p>{dashboard.intro}</p>
      </div>
    </div>

    <BoardStatus metrics={metrics}/>

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
      {dashboard.sections.map((section, index) => <details className={`dashboard-section-card ${section.id}`} key={section.id} open={index === 0}>
        <summary className="dashboard-section-heading">
          <div>
            <h2>{section.title}</h2>
            <p>{section.copy}</p>
          </div>
          <span className="dashboard-section-toggle">›</span>
        </summary>

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
      </details>)}
    </div>

    <LeadsPanel leads={data?.leads}/>
  </>;
}
