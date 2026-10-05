import { useEffect, useMemo, useState } from 'react';
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

export default function AdminLayout() {
  const { user, accessToken, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [social, setSocial] = useState(emptySocialLinks());
  const [sites, setSites] = useState([]);
  const [siteKey, setSiteKey] = useState(getAdminSiteKey());
  const siteConfig = useMemo(() => getSiteConfig(siteKey), [siteKey]);
  const navGroups = siteConfig.navGroups;
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

  const activeSite = sites.find(site => site.site_key === siteKey) || {
    site_key: siteConfig.key,
    name: siteConfig.name,
    domain: siteConfig.domain,
    admin_label: siteConfig.adminLabel,
  };

  const changeSite = event => {
    const nextSite = event.target.value;
    setAdminSiteKey(nextSite);
    setSiteKey(nextSite);
    window.location.assign('/admin');
  };

  const logout = () => { signOut(); navigate('/'); };
  const toggleGroup = id => setOpenGroups(current => ({ ...current, [id]: !current[id] }));

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
