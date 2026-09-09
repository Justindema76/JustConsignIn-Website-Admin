import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Home, Image, Link2, LogOut, Sparkles, Video } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { SOCIAL_NETWORKS, emptySocialLinks } from '../../config/siteContent';
import { loadAdminSocial } from '../../services/siteAdminService';

const nav = [
  { to: '/admin', label: 'Dashboard', icon: Home, end: true },
  { to: '/admin/blog', label: 'Blog Posts', icon: BookOpen },
  { to: '/admin/videos', label: 'YouTube Videos', icon: Video },
  { to: '/admin/social', label: 'Social Links', icon: Link2 },
  { to: '/admin/media', label: 'Media', icon: Image },
  { to: '/admin/social-automation', label: 'Social Automation', icon: Sparkles },
];

export default function AdminLayout() {
  const { user, accessToken, signOut } = useAuth();
  const navigate = useNavigate();
  const [social, setSocial] = useState(emptySocialLinks());

  useEffect(() => {
    if (!accessToken) return;
    loadAdminSocial(accessToken).then(setSocial).catch(() => {});
  }, [accessToken]);

  const logout = () => { signOut(); navigate('/'); };

  return <div className="site-admin-shell">
    <aside className="site-admin-sidebar">
      <Link to="/admin" className="site-admin-brand">
        <span className="site-admin-brand-mark">J</span>
        <span><strong>JustConsignIn</strong><small>Website Admin</small></span>
      </Link>
      <span className="site-admin-nav-label">Website</span>
      <nav className="site-admin-nav">{nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} end={end} to={to}><Icon size={17}/><span>{label}</span></NavLink>)}</nav>
      <div className="site-admin-sidebar-social">
        <small>Social links</small>
        <div className="site-admin-social-icons">{SOCIAL_NETWORKS.map(network => {
          const value = social[network.key];
          const image = <img src={network.icon} alt={network.label}/>;
          return value?.url && value?.enabled !== false ? <a key={network.key} href={value.url} target="_blank" rel="noreferrer" title={network.label}>{image}</a> : <span key={network.key} className="disabled" title={`${network.label} not linked`}>{image}</span>;
        })}</div>
      </div>
    </aside>
    <div className="site-admin-workspace">
      <header className="site-admin-header">
        <div><strong>JustConsignIn Website Admin</strong><small>Manage justconsignin.com</small></div>
        <div className="site-admin-header-actions">
          <a className="site-admin-btn secondary small" href="https://www.justconsignin.com" target="_blank" rel="noreferrer">View Website <ExternalLink size={13}/></a>
          <span className="site-admin-user"><strong>{user?.name || 'Admin'}</strong><small>{user?.email}</small></span>
          <button className="site-admin-btn secondary small" type="button" onClick={logout}><LogOut size={13}/> Log out</button>
        </div>
      </header>
      <main className="site-admin-main"><Outlet /></main>
    </div>
  </div>;
}
