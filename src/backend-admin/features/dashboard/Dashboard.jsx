import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { getAdminSiteKey } from '../../services/siteAdminService';
import { getSiteConfig } from '../../sites/registry';
import { getSiteIcon } from '../../sites/icons';
import { loadDashboardData } from './dashboardData';
import './dashboard.css';

// Permanent safety net: this account always gets the full admin, no matter
// what the server-reported role says.
const WEBSITE_OWNER_EMAIL = 'justindema76@gmail.com';
function isOwnerUser(user) {
  return user?.role === 'owner' || !user?.role || String(user?.email || '').trim().toLowerCase() === WEBSITE_OWNER_EMAIL;
}

function BoardStatus({ metrics }) {
  if (!metrics) return null;
  return <section className="dispatch-strip">
    <div className="dispatch-metrics">
      {metrics.map(item => <div className={`dispatch-metric ${item.attention ? 'attention' : ''}`} key={item.label}>
        <span className="dispatch-metric-label">{item.label}</span>
        <span className="dispatch-metric-value">{String(item.value).padStart(2, '0')}</span>
      </div>)}
    </div>
  </section>;
}

function timeOfDayGreeting(now) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
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
  const { accessToken, user } = useAuth();
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

  const firstName = (user?.name || 'there').split(' ')[0];
  const now = useLiveClock();
  const today = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
  const clock = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

  return <>
    <div className="site-admin-page-head dashboard-head">
      <div>
        <p className="site-admin-eyebrow">Overview</p>
        <h1>{timeOfDayGreeting(now)}, {firstName}</h1>
        <p>{dashboard.intro}</p>
      </div>
      <div className="dashboard-date">
        <span>{today}</span>
        <span className="dashboard-clock">{clock}</span>
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
        {(isOwnerUser(user) ? dashboard.quick : dashboard.quick.filter(item => !item.ownerOnly)).map(item => {
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
      {dashboard.sections.map(section => {
        const items = isOwnerUser(user) ? section.items : section.items.filter(item => !item.ownerOnly);
        if (!items.length) return null;
        return <section className="group-card" key={section.id}>
          <h3>{section.title}</h3>
          {items.map(item => {
            const Icon = getSiteIcon(item.icon);
            return <Link className="group-link" to={item.to} key={item.to}>
              <Icon size={15}/> {item.title}
            </Link>;
          })}
        </section>;
      })}
    </div>

    {siteKey !== 'sunwings' && <LeadsPanel leads={data?.leads}/>}
  </>;
}
