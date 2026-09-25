import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  ExternalLink,
  Handshake,
  Home,
  Image,
  Inbox,
  Link2,
  LogOut,
  Menu,
  MapPinned,
  PanelsTopLeft,
  LibraryBig,
  PanelTop,
  PanelBottom,
  Palette,
  Settings,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { SOCIAL_NETWORKS, emptySocialLinks } from '../../config/siteContent';
import { getAdminSiteKey, loadAdminSites, loadAdminSocial, setAdminSiteKey } from '../../services/siteAdminService';

const navGroups = [
  {
    id: 'leads',
    label: 'Leads & Growth',
    items: [
      { to: '/admin/service-requests', label: 'Service Requests', icon: Inbox, sites: ['justindematteis'] },
      { to: '/admin/hiring-contacts', label: 'Hiring Contacts', icon: BriefcaseBusiness, sites: ['justindematteis'] },
      { to: '/admin/demo-requests', label: 'Demo Requests', icon: Inbox, sites: ['justconsignin'] },
      { to: '/admin/beta-partners', label: 'Beta Partners', icon: Handshake, sites: ['justconsignin'] },
      { to: '/admin/outreach', label: 'Outreach Map', icon: MapPinned, sites: ['justconsignin'] },
    ],
  },
  {
    id: 'content',
    label: 'Content Management',
    items: [
      { to: '/admin/blog', label: 'Blog Posts', icon: BookOpen },
      { to: '/admin/work-posts', label: 'Work Posts', icon: PanelsTopLeft },
      { to: '/admin/ai-posts', label: 'AI Posts', icon: Sparkles },
      { to: '/admin/videos', label: 'YouTube Videos', icon: Video },
      { to: '/admin/media', label: 'Media', icon: Image },
    ],
  },
  {
    id: 'website',
    label: 'Website',
    items: [
      { to: '/admin/website/pages', label: 'Pages', icon: PanelsTopLeft },
      { to: '/admin/website/blocks', label: 'Block Library', icon: LibraryBig },
      { to: '/admin/website/styles', label: 'Global Styles', icon: Palette },
      { to: '/admin/website/global/header', label: 'Header', icon: PanelTop },
      { to: '/admin/website/global/footer', label: 'Footer', icon: PanelBottom },
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
  const [sites, setSites] = useState([]);
  const [siteKey, setSiteKey] = useState(getAdminSiteKey());
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
    Promise.all([
      loadAdminSocial(accessToken).then(setSocial).catch(() => {}),
      loadAdminSites(accessToken).then(setSites).catch(() => {}),
    ]);
  }, [accessToken, siteKey]);

  useEffect(() => {
    setMobileNavOpen(false);
    if (activeGroupId) {
      setOpenGroups(current => ({ ...current, [activeGroupId]: true }));
    }
  }, [location.pathname, activeGroupId]);

  const activeSite = sites.find(site => site.site_key === siteKey) || {
    site_key: siteKey,
    name: siteKey === 'justindematteis' ? 'Justin DeMatteis' : 'JustConsignIn',
    domain: siteKey === 'justindematteis' ? 'justindematteis.com' : 'justconsignin.com',
    admin_label: siteKey === 'justindematteis' ? 'JustinDeMatteis.com' : 'JustConsignIn',
  };

  const changeSite = event => {
    const nextSite = event.target.value;
    setAdminSiteKey(nextSite);
    setSiteKey(nextSite);
    window.location.reload();
  };

  const logout = () => { signOut(); navigate('/'); };
  const toggleGroup = id => setOpenGroups(current => ({ ...current, [id]: !current[id] }));

  return <div className="site-admin-shell">
    <aside className={`site-admin-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
      <div className="site-admin-mobile-nav-head">
        <Link to="/admin" className="site-admin-brand compact" onClick={() => setMobileNavOpen(false)}>
          <span className="site-admin-brand-mark">J</span>
          <span><strong>{activeSite.name}</strong><small>Website Admin</small></span>
        </Link>
        <button className="site-admin-mobile-close" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X size={22}/></button>
      </div>

      <Link to="/admin" className="site-admin-brand desktop-brand">
        <span className="site-admin-brand-mark">J</span>
        <span><strong>{activeSite.name}</strong><small>Website Admin</small></span>
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
              {group.items.filter(item => !item.sites || item.sites.includes(siteKey)).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileNavOpen(false)}>
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
        <div className="site-admin-header-title"><strong>{activeSite.name} Website Admin</strong><small>Manage {activeSite.domain}</small></div>
        <div className="site-admin-header-actions">
          <label className="site-admin-site-switcher">
            <span>Website</span>
            <select value={siteKey} onChange={changeSite} aria-label="Select website">
              {(sites.length ? sites : [activeSite]).map(site => <option key={site.site_key} value={site.site_key}>{site.admin_label || site.name}</option>)}
            </select>
          </label>
          <a className="site-admin-btn secondary small" href={`https://${activeSite.domain}`} target="_blank" rel="noreferrer">View Website <ExternalLink size={13}/></a>
          <span className="site-admin-user"><strong>{user?.name || 'Admin'}</strong><small>{user?.email}</small></span>
          <button className="site-admin-btn secondary small" type="button" onClick={logout}><LogOut size={13}/> Log out</button>
        </div>
      </header>
      <main className="site-admin-main"><Outlet /></main>
    </div>
  </div>;
}
