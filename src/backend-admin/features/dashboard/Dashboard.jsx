import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Handshake,
  Image,
  Inbox,
  LayoutTemplate,
  Link2,
  MapPinned,
  Palette,
  Settings,
  Sparkles,
  Video,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAdminSiteKey } from '../../services/siteAdminService';
import './dashboard.css';

const groups = [
  {
    id: 'website',
    title: 'Website & Page Builder',
    copy: 'Edit public website pages and publish visual changes.',
    modules: [
      {
        to: '/admin/website/pages',
        icon: LayoutTemplate,
        title: 'Page Builder',
        copy: 'Open every public page, edit visual pages, and publish changes to the live website.',
      },
      {
        to: '/admin/website/styles',
        icon: Palette,
        title: 'Global Styles',
        copy: 'Control site-wide colours, typography, spacing, widths, cards and buttons.',
      },
    ],
  },
  {
    id: 'leads',
    title: 'Leads & Growth',
    copy: 'Capture leads and manage beta partnerships.',
    modules: [
      {
        to: '/admin/demo-requests',
        icon: Inbox,
        title: 'Demo Requests',
        copy: 'Review free-demo leads, contact stores, schedule walkthroughs, and manage follow-up.',
      },
      {
        to: '/admin/service-requests',
        icon: Inbox,
        title: 'Service Requests',
        copy: 'Review portfolio enquiries, AI routing, project details, email follow-up, and status.',
        site: 'justindematteis',
      },
      {
        to: '/admin/beta-partners',
        icon: Handshake,
        title: 'Beta Partners',
        copy: 'Manage Founding Partner applications, tracked links, outreach, and active testing.',
      },
      {
        to: '/admin/outreach',
        icon: MapPinned,
        title: 'Outreach Map',
        copy: 'Work through Facebook groups and consignment-shop leads while tracking every contact.',
      },
    ],
  },
  {
    id: 'content',
    title: 'Content Management',
    copy: 'Create and manage the content and media used by the website.',
    modules: [
      {
        to: '/admin/blog',
        icon: BookOpen,
        title: 'Blog Posts',
        copy: 'Create, edit, review, and manage website articles.',
      },
      {
        to: '/admin/videos',
        icon: Video,
        title: 'YouTube Videos',
        copy: 'Add, edit, hide, reorder, or replace videos shown on the website.',
      },
      {
        to: '/admin/media',
        icon: Image,
        title: 'Media',
        copy: 'Manage reusable images, videos, music, and other uploaded assets.',
      },
    ],
  },
  {
    id: 'social',
    title: 'Social & Marketing',
    copy: 'Manage social channels and create campaigns from one place.',
    modules: [
      {
        to: '/admin/social',
        icon: Link2,
        title: 'Social Links',
        copy: 'Manage the social URLs used by the website and admin tools.',
      },
      {
        to: '/admin/social-automation',
        icon: Sparkles,
        title: 'Social Automation',
        copy: 'Create, prepare, schedule, and publish social content through Metricool.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    copy: 'Website configuration and reusable services.',
    modules: [
      {
        to: '/admin/settings',
        icon: Settings,
        title: 'Website Settings',
        copy: 'Configure outgoing email and reusable website services without changing code or Vercel variables.',
      },
    ],
  },
];

function initialOpenGroups() {
  const compact = typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
  return Object.fromEntries(groups.map(group => [group.id, !compact]));
}

export default function Dashboard() {
  const siteKey = getAdminSiteKey();
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState(initialOpenGroups);

  useEffect(() => {
    if (location.pathname === '/admin' && location.search) {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const toggleGroup = id => {
    setOpenGroups(current => ({ ...current, [id]: !current[id] }));
  };

  return <>
    <div className="site-admin-page-head dashboard-head">
      <div>
        <p className="site-admin-eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p>Open only the section you need. Website editing and the page builder are available directly here.</p>
      </div>
    </div>

    <div className="dashboard-groups">
      {groups.map(group => {
        const open = Boolean(openGroups[group.id]);

        return <section className={`dashboard-group ${group.id} ${open ? 'open' : 'collapsed'}`} key={group.id}>
          <button
            className="dashboard-group-toggle"
            type="button"
            onClick={() => toggleGroup(group.id)}
            aria-expanded={open}
            aria-controls={`dashboard-group-${group.id}`}
          >
            <span className="dashboard-group-head-copy">
              <strong>{group.title}</strong>
              <small>{group.copy}</small>
            </span>
            <ChevronDown className={open ? 'open' : ''} size={20}/>
          </button>

          {open && <div className="dashboard-module-grid" id={`dashboard-group-${group.id}`}>
            {group.modules.filter(module => !module.site || module.site === siteKey).map(({ to, icon: Icon, title, copy }) => <Link className="dashboard-module-link" to={to} key={to}>
              <span className="site-admin-module-icon"><Icon size={20}/></span>
              <span className="dashboard-module-copy">
                <strong>{title}</strong>
                <small>{copy}</small>
              </span>
              <span className="dashboard-module-arrow">›</span>
            </Link>)}
          </div>}
        </section>;
      })}
    </div>
  </>;
}
