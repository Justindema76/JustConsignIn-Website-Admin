import { useEffect } from 'react';
import { BookOpen, Handshake, Image, Inbox, Link2, Settings, Sparkles, Video } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './dashboard.css';

const groups = [
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
        to: '/admin/beta-partners',
        icon: Handshake,
        title: 'Beta Partners',
        copy: 'Manage Founding Partner applications, tracked links, outreach, and active testing.',
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
    <div className="site-admin-page-head dashboard-head">
      <div>
        <p className="site-admin-eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p>Your admin tools are grouped by what you are trying to manage, instead of one long list.</p>
      </div>
    </div>

    <div className="dashboard-groups">
      {groups.map(group => <section className={`dashboard-group ${group.id}`} key={group.id}>
        <div className="dashboard-group-head">
          <div>
            <h2>{group.title}</h2>
            <p>{group.copy}</p>
          </div>
        </div>
        <div className="dashboard-module-grid">
          {group.modules.map(({ to, icon: Icon, title, copy }) => <Link className="dashboard-module-link" to={to} key={to}>
            <span className="site-admin-module-icon"><Icon size={20}/></span>
            <span className="dashboard-module-copy">
              <strong>{title}</strong>
              <small>{copy}</small>
            </span>
            <span className="dashboard-module-arrow">›</span>
          </Link>)}
        </div>
      </section>)}
    </div>

    <section className="dashboard-group settings dashboard-settings-card">
      <div className="dashboard-group-head">
        <div>
          <h2>Settings</h2>
          <p>Website configuration stays separated at the bottom.</p>
        </div>
      </div>
      <Link className="dashboard-module-link dashboard-settings-link" to="/admin/settings">
        <span className="site-admin-module-icon"><Settings size={20}/></span>
        <span className="dashboard-module-copy">
          <strong>Website Settings</strong>
          <small>Configure outgoing email and reusable website services without changing code or Vercel variables.</small>
        </span>
        <span className="dashboard-module-arrow">›</span>
      </Link>
    </section>
  </>;
}
