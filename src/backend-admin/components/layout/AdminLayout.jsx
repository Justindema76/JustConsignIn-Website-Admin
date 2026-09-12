import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Handshake,
  Home,
  Image,
  Inbox,
  Link2,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { SOCIAL_NETWORKS, emptySocialLinks } from '../../config/siteContent';
import { loadAdminSocial } from '../../services/siteAdminService';

const navGroups = [
  {
    id: 'leads',
    label: 'Leads & Growth',
    items: [
      { to: '/admin/demo-requests', label: 'Demo Requests', icon: Inbox },
      { to: '/admin/beta-partners', label: 'Beta Partners', icon: Handshake },
    ],
  },
  {
    id: 'content',
    label: 'Content Management',
    items: [
      { to: '/admin/blog', label: 'Blog Posts', icon: BookOpen },
      { to: '/admin/videos', label: 'YouTube Videos', icon: Video },
      { to: '/admin/media', label: 'Media', icon: Image },
    ],
  },
  {
    id: 'social',
    label: 'Social & Marketing',
    items: [
      { to: '/admin/social', label: 'Social Links', icon: Link2 },
      { to: '/admin/social-automation', label: 'Social Automation', icon: Sparkles },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { to: '/admin/settings', label: 'Website Settings', icon: Settings },
    ],
  },
];

const desktopDefaults = Object.fromEntries(navGroups.map(group => [group.id, true]));

function isPathInGroup(pathname, group) {
  return group.items.some(item => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

export default function AdminLayout() {
  const { user, accessToken, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [social, setSocial] = useState(emptySocialLinks());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches) {
      const active = navGroups.find(group => isPathInGroup(window.location.pathname, group));
      return active ? { [active.id]: true } : {};
    }
    return desktopDefaults;
  });

  const activeGroupId = useMemo(
    () => navGroups.find(group => isPathInGroup(location.pathname, group))?.id || '',
    [location.pathname],
  );

  useEffect(() => {
    if (!accessToken) return;
    loadAdminSocial(accessToken).then(setSocial).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    setMobileNavOpen(false);
    if (activeGroupId) {
      setOpenGroups(current => ({ ...current, [activeGroupId]: true }));
    }
  }, [location.pathname, activeGroupId]);

  const logout = () => { signOut(); navigate('/'); };
  const toggleGroup = id => setOpenGroups(current => ({ ...current, [id]: !current[id] }));

  return <div className="site-admin-shell">
    <aside className={`site-admin-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
      <div className="site-admin-mobile-nav-head">
        <Link to="/admin" className="site-admin-brand compact" onClick={() => setMobileNavOpen(false)}>
          <span className="site-admin-brand-mark">J</span>
          <span><strong>JustConsignIn</strong><small>Website Admin</small></span>
        </Link>
        <button className="site-admin-mobile-close" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X size={22}/></button>
      </div>

      <Link to="/admin" className="site-admin-brand desktop-brand">
        <span className="site-admin-brand-mark">J</span>
        <span><strong>JustConsignIn</strong><small>Website Admin</small></span>
      </Link>

      <nav className="site-admin-nav organized-nav">
        <NavLink end to="/admin" className="site-admin-dashboard-link" onClick={() => setMobileNavOpen(false)}>
          <Home size={17}/><span>Dashboard</span>
        </NavLink>

        {navGroups.map(group => {
          const open = Boolean(openGroups[group.id]);
          const active = group.id === activeGroupId;
          return <section className={`site-admin-nav-group ${group.id === 'settings' ? 'settings-group' : ''}`} key={group.id}>
            <button
              className={`site-admin-nav-group-toggle ${active ? 'active-group' : ''}`}
              type="button"
              onClick={() => toggleGroup(group.id)}
              aria-expanded={open}
            >
              <span>{group.label}</span>
              <ChevronDown size={15} className={open ? 'open' : ''}/>
            </button>
            <div className={`site-admin-nav-group-links ${open ? 'open' : ''}`}>
              {group.items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileNavOpen(false)}>
                <Icon size={17}/><span>{label}</span>
              </NavLink>)}
            </div>
          </section>;
        })}
      </nav>

      <div className="site-admin-sidebar-social">
        <small>Social links</small>
        <div className="site-admin-social-icons">{SOCIAL_NETWORKS.map(network => {
          const value = social[network.key];
          const image = <img src={network.icon} alt={network.label}/>;
          return value?.url && value?.enabled !== false ? <a key={network.key} href={value.url} target="_blank" rel="noreferrer" title={network.label}>{image}</a> : <span key={network.key} className="disabled" title={`${network.label} not linked`}>{image}</span>;
        })}</div>
      </div>
    </aside>

    {mobileNavOpen && <button className="site-admin-mobile-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}/>}

    <div className="site-admin-workspace">
      <header className="site-admin-header">
        <button className="site-admin-mobile-menu" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu size={22}/></button>
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
