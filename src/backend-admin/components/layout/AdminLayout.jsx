import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  Home,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { SOCIAL_NETWORKS, emptySocialLinks } from '../../config/siteContent';
import { getAdminSiteKey, loadAdminSites, loadAdminSocial, setAdminSiteKey } from '../../services/siteAdminService';
import { getSiteConfig } from '../../sites/registry';
import { getSiteIcon } from '../../sites/icons';
import '../../sites/sunwings/sunwingsTheme.css';

function isPathInGroup(pathname, group) {
  return group.items.some(item => pathname === item.to || pathname.startsWith(`${item.to}/`));
}

// Permanent safety net: this account always gets the full admin, no matter
// what the server-reported role says.
const WEBSITE_OWNER_EMAIL = 'justindema76@gmail.com';
function isOwnerUser(user) {
  return user?.role === 'owner' || !user?.role || String(user?.email || '').trim().toLowerCase() === WEBSITE_OWNER_EMAIL;
}

export default function AdminLayout() {
  const { user, accessToken, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [social, setSocial] = useState(emptySocialLinks());
  const [sites, setSites] = useState([]);
  const [siteKey, setSiteKey] = useState(getAdminSiteKey());
  const siteConfig = useMemo(() => getSiteConfig(siteKey), [siteKey]);
  const navGroups = useMemo(() => {
    if (isOwnerUser(user)) return siteConfig.navGroups;
    return siteConfig.navGroups
      .map(group => ({ ...group, items: group.items.filter(item => !item.ownerOnly) }))
      .filter(group => group.items.length > 0);
  }, [siteConfig.navGroups, user]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(() => {
    const config = getSiteConfig(getAdminSiteKey());
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches) {
      const active = config.navGroups.find(group => isPathInGroup(window.location.pathname, group));
      return active ? { [active.id]: true } : {};
    }
    return Object.fromEntries(config.navGroups.map(group => [group.id, true]));
  });

  const activeGroupId = useMemo(
    () => navGroups.find(group => isPathInGroup(location.pathname, group))?.id || '',
    [location.pathname, navGroups],
  );

  useEffect(() => {
    if (!accessToken) return;
    loadAdminSites(accessToken).then(setSites).catch(() => {});
    if (siteConfig.showSocialSidebar !== false) {
      loadAdminSocial(accessToken).then(setSocial).catch(() => {});
    } else {
      setSocial(emptySocialLinks());
    }
  }, [accessToken, siteKey, siteConfig.showSocialSidebar]);

  useEffect(() => {
    setOpenGroups(current => ({
      ...Object.fromEntries(navGroups.map(group => [group.id, true])),
      ...current,
    }));
  }, [siteKey, navGroups]);

  useEffect(() => {
    setMobileNavOpen(false);
    if (activeGroupId) {
      setOpenGroups(current => ({ ...current, [activeGroupId]: true }));
    }
  }, [location.pathname, activeGroupId]);

  const visibleSites = useMemo(() => {
    if (isOwnerUser(user) || !user?.sites) return sites;
    return sites.filter(site => user.sites.includes(site.site_key));
  }, [sites, user?.role, user?.sites]);

  const activeSite = sites.find(site => site.site_key === siteKey) || {
    site_key: siteConfig.key,
    name: siteConfig.name,
    domain: siteConfig.domain,
    admin_label: siteConfig.adminLabel,
  };

  const changeSite = nextSite => {
    setAdminSiteKey(nextSite);
    setSiteKey(nextSite);
    window.location.assign('/admin');
  };

  const logout = () => { signOut(); navigate('/'); };
  const toggleGroup = id => setOpenGroups(current => ({ ...current, [id]: !current[id] }));

  const [openMenu, setOpenMenu] = useState('');
  const headerActionsRef = useRef(null);
  useEffect(() => {
    if (!openMenu) return;
    const onClickAway = event => {
      if (headerActionsRef.current && !headerActionsRef.current.contains(event.target)) setOpenMenu('');
    };
    const onEscape = event => { if (event.key === 'Escape') setOpenMenu(''); };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onEscape);
    };
  }, [openMenu]);

  return <div className={`site-admin-shell site-${siteKey}`}>
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
              {group.items.map(item => {
                const Icon = getSiteIcon(item.icon);
                return <NavLink key={item.to} to={item.to} onClick={() => setMobileNavOpen(false)}>
                  <Icon size={17}/><span>{item.label}</span>
                </NavLink>;
              })}
            </div>
          </section>;
        })}
      </nav>

      {siteConfig.showSocialSidebar !== false && <div className="site-admin-sidebar-social">
        <small>Social links</small>
        <div className="site-admin-social-icons">{SOCIAL_NETWORKS.map(network => {
          const value = social[network.key];
          const image = <img src={network.icon} alt={network.label}/>;
          return value?.url && value?.enabled !== false ? <a key={network.key} href={value.url} target="_blank" rel="noreferrer" title={network.label}>{image}</a> : <span key={network.key} className="disabled" title={`${network.label} not linked`}>{image}</span>;
        })}</div>
      </div>}
    </aside>

    {mobileNavOpen && <button className="site-admin-mobile-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}/>}

    <div className="site-admin-workspace">
      <header className="site-admin-header">
        <button className="site-admin-mobile-menu" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open menu"><Menu size={22}/></button>
        <div className="site-admin-header-title"><strong>{activeSite.name} Website Admin</strong><small>Manage {activeSite.domain}</small></div>
        <div className="site-admin-header-actions" ref={headerActionsRef}>
          <div className={`site-admin-dd ${openMenu === 'site' ? 'open' : ''}`}>
            <button
              className="site-admin-dd-trigger"
              type="button"
              aria-expanded={openMenu === 'site'}
              onClick={() => setOpenMenu(current => (current === 'site' ? '' : 'site'))}
            >
              <span className="site-admin-dd-dot"/>
              <span className="site-admin-dd-name">{activeSite.admin_label || activeSite.name}</span>
              <ChevronDown size={13} className="site-admin-dd-chevron"/>
            </button>
            <div className="site-admin-dd-panel">
              <a className="site-admin-dd-item" href={`https://${activeSite.domain}`} target="_blank" rel="noreferrer">
                <ExternalLink size={14}/> View Website
              </a>
              <div className="site-admin-dd-divider"/>
              {visibleSites.length > 1 && <p className="site-admin-dd-label">Switch Site</p>}
              {(visibleSites.length ? visibleSites : [activeSite]).map(site => (
                <button
                  key={site.site_key}
                  type="button"
                  className={`site-admin-dd-item ${site.site_key === siteKey ? 'active' : ''}`}
                  onClick={() => { setOpenMenu(''); if (site.site_key !== siteKey) changeSite(site.site_key); }}
                >
                  <span className="site-admin-dd-dot"/> {site.admin_label || site.name}
                </button>
              ))}
            </div>
          </div>

          <div className={`site-admin-dd ${openMenu === 'user' ? 'open' : ''}`}>
            <button
              className="site-admin-dd-trigger site-admin-dd-trigger-avatar"
              type="button"
              aria-expanded={openMenu === 'user'}
              onClick={() => setOpenMenu(current => (current === 'user' ? '' : 'user'))}
              aria-label="Account menu"
            >
              <span className="site-admin-avatar">{(user?.name || 'A').slice(0, 2).toUpperCase()}</span>
            </button>
            <div className="site-admin-dd-panel site-admin-dd-panel-right">
              <div className="site-admin-dd-who">
                <span className="site-admin-avatar">{(user?.name || 'A').slice(0, 2).toUpperCase()}</span>
                <span className="site-admin-dd-who-text"><strong>{user?.name || 'Admin'}</strong><small>{user?.email}</small></span>
              </div>
              <div className="site-admin-dd-divider"/>
              <button className="site-admin-dd-item danger" type="button" onClick={logout}><LogOut size={14}/> Log out</button>
            </div>
          </div>
        </div>
      </header>
      <main className="site-admin-main"><Outlet /></main>
    </div>
  </div>;
}
