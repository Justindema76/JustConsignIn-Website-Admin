import { useEffect } from 'react';
import { BookOpen, Image, Link2, Video } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/admin' && location.search) {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const modules = [
    { to: '/admin/blog', icon: BookOpen, title: 'Blog Posts', copy: 'View every current article first, then create or edit posts when you need to.' },
    { to: '/admin/videos', icon: Video, title: 'YouTube Videos', copy: 'Add, edit, hide, reorder, or replace website videos without changing source code.' },
    { to: '/admin/social', icon: Link2, title: 'Social Links', copy: 'Manage the social URLs used by the website footer and your admin navigation.' },
    { to: '/admin/media', icon: Image, title: 'Media', copy: 'A home for uploaded blog images and future reusable website assets.' },
  ];

  return <>
    <div className="site-admin-page-head">
      <div><p className="site-admin-eyebrow">Overview</p><h1>Dashboard</h1><p>Open a section to manage it. New website tools can be added here later without crowding the dashboard.</p></div>
      <a className="site-admin-btn secondary" href="/" target="_blank" rel="noreferrer">View website ↗</a>
    </div>
    <div className="site-admin-module-grid">
      {modules.map(({ to, icon: Icon, title, copy }) => <article className="site-admin-module-card" key={to}>
        <span className="site-admin-module-icon"><Icon size={21}/></span>
        <h2>{title}</h2><p>{copy}</p>
        <Link className="site-admin-btn" to={to}>Open {title}</Link>
      </article>)}
      <article className="site-admin-module-card future"><span className="site-admin-module-icon">+</span><h2>Future module</h2><p>Leave room for whatever you decide the website needs next.</p></article>
    </div>
  </>;
}
