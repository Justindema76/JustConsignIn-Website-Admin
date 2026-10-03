import { Link } from 'react-router-dom';
import { getAdminSiteKey } from '../../services/siteAdminService';
import { getSiteConfig } from '../../sites/registry';
import { getSiteIcon } from '../../sites/icons';
import './dashboard.css';

export default function Dashboard() {
  const siteConfig = getSiteConfig(getAdminSiteKey());
  const { dashboard } = siteConfig;

  return <>
    <div className="site-admin-page-head dashboard-head">
      <div>
        <p className="site-admin-eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p>{dashboard.intro}</p>
      </div>
    </div>

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
