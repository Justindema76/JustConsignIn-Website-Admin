import { useEffect } from 'react';
import { BookOpen, Handshake, Image, Inbox, Link2, Settings, Sparkles, Video } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './dashboard.css';

const modules = [
  {
    to: '/admin/demo-requests',
    icon: Inbox,
    title: 'Demo Requests',
    copy: 'View every free-demo lead, contact the store, schedule the walkthrough, and keep follow-up notes.',
  },
  {
    to: '/admin/beta-partners',
    icon: Handshake,
    title: 'Beta Partners',
    copy: 'Create tracked partner links and manage Founding Partner applications from outreach through active testing.',
  },
  {
    to: '/admin/blog',
    icon: BookOpen,
    title: 'Blog Posts',
    copy: 'View every current article first, then create or edit posts when you need to.',
  },
  {
    to: '/admin/videos',
    icon: Video,
    title: 'YouTube Videos',
    copy: 'Add, edit, hide, reorder, or replace website videos without changing source code.',
  },
  {
    to: '/admin/social',
    icon: Link2,
    title: 'Social Links',
    copy: 'Manage the social URLs used by the website footer and your admin navigation.',
  },
  {
    to: '/admin/media',
    icon: Image,
    title: 'Media',
    copy: 'Manage uploaded blog images and reusable website media assets from one place.',
  },
  {
    to: '/admin/social-automation',
    icon: Sparkles,
    title: 'Social Automation',
    copy: 'Create, prepare, and manage social content without mixing those tools into the website pages.',
  },
];

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/admin' && location.search) {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p>Manage the website, leads, beta partners, content, media, and social tools from one place.</p>
      </div>
      <a className="site-admin-btn secondary" href="https://www.justconsignin.com" target="_blank" rel="noreferrer">View website ↗</a>
    </div>

    <div className="dashboard-module-grid">
      {modules.map(({ to, icon: Icon, title, copy }) => (
        <article className="site-admin-module-card dashboard-module-card" key={to}>
          <span className="site-admin-module-icon"><Icon size={21}/></span>
          <h2>{title}</h2>
          <p>{copy}</p>
          <Link className="site-admin-btn" to={to}>Open {title}</Link>
        </article>
      ))}
    </div>

    <section className="site-admin-card dashboard-settings-card">
      <div className="dashboard-settings-card-copy">
        <span className="site-admin-module-icon"><Settings size={21}/></span>
        <div>
          <h2>Website Settings</h2>
          <p>Configure reusable services such as outgoing email without changing code or Vercel environment variables.</p>
        </div>
      </div>
      <Link className="site-admin-btn secondary" to="/admin/settings">Open Settings</Link>
    </section>
  </>;
}
