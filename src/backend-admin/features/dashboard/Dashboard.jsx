import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Handshake,
  Image,
  Inbox,
  LibraryBig,
  Link2,
  MapPinned,
  PanelBottom,
  PanelTop,
  Palette,
  PanelsTopLeft,
  Settings,
  Sparkles,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAdminSiteKey } from '../../services/siteAdminService';
import './dashboard.css';

const justinSections = [
  {
    id: 'leads',
    title: 'Leads & Workflow',
    copy: 'Incoming work, hiring enquiries and internal routing.',
    items: [
      { to: '/admin/service-requests', icon: Inbox, title: 'Service Requests', copy: 'Review project enquiries, assign departments, track status and prepare quotes.' },
      { to: '/admin/hiring-contacts', icon: BriefcaseBusiness, title: 'Hiring Contacts', copy: 'Review job opportunities, recruiter messages and interview requests.' },
      { to: '/admin/departments', icon: Building2, title: 'Departments', copy: 'Manage the departments used to route incoming project requests.' },
    ],
  },
  {
    id: 'content',
    title: 'Content',
    copy: 'Manage the content that feeds JustinDeMatteis.com.',
    items: [
      { to: '/admin/blog', icon: BookOpen, title: 'Blog Posts', copy: 'Create and manage articles.' },
      { to: '/admin/work-posts', icon: PanelsTopLeft, title: 'Work Posts', copy: 'Manage work experience, case studies and project content.' },
      { to: '/admin/ai-posts', icon: Sparkles, title: 'AI Posts', copy: 'Manage AI + development project content.' },
      { to: '/admin/videos', icon: Video, title: 'YouTube Videos', copy: 'Manage videos and Shorts used by the site.' },
      { to: '/admin/media', icon: Image, title: 'Media', copy: 'Manage reusable images, videos and uploaded assets.' },
    ],
  },
  {
    id: 'website',
    title: 'Website',
    copy: 'Pages, reusable blocks and global website controls.',
    items: [
      { to: '/admin/website/pages', icon: PanelsTopLeft, title: 'Pages', copy: 'Open and edit public pages.' },
      { to: '/admin/website/blocks', icon: LibraryBig, title: 'Block Library', copy: 'See the reusable blocks available to the page builder.' },
      { to: '/admin/website/styles', icon: Palette, title: 'Global Styles', copy: 'Control colours, typography, spacing, cards and buttons.' },
      { to: '/admin/website/global/header', icon: PanelTop, title: 'Header', copy: 'Edit the global website header.' },
      { to: '/admin/website/global/project-request', icon: Inbox, title: 'Project Request Drawer', copy: 'Edit the global Start a Project drawer and form copy.' },
      { to: '/admin/website/global/footer', icon: PanelBottom, title: 'Footer', copy: 'Edit the global website footer.' },
    ],
  },
  {
    id: 'tools',
    title: 'Social & Settings',
    copy: 'Social links, automation and website configuration.',
    items: [
      { to: '/admin/social', icon: Link2, title: 'Social Links', copy: 'Manage the social links used by the website.' },
      { to: '/admin/social-automation', icon: Sparkles, title: 'Social Automation', copy: 'Create, schedule and publish social content.' },
      { to: '/admin/settings', icon: Settings, title: 'Website Settings', copy: 'Manage email, notification routing and website services.' },
    ],
  },
];

const justConsignInSections = [
  {
    id: 'leads',
    title: 'Leads & Growth',
    copy: 'Demo requests, beta partners and outreach.',
    items: [
      { to: '/admin/demo-requests', icon: Inbox, title: 'Demo Requests', copy: 'Review demo leads, contact stores and manage follow-up.' },
      { to: '/admin/beta-partners', icon: Handshake, title: 'Beta Partners', copy: 'Manage Founding Partner applications and active testing.' },
      { to: '/admin/outreach', icon: MapPinned, title: 'Outreach Map', copy: 'Track consignment-shop leads and outreach activity.' },
    ],
  },
  {
    id: 'content',
    title: 'Content',
    copy: 'Manage website content and media.',
    items: [
      { to: '/admin/blog', icon: BookOpen, title: 'Blog Posts', copy: 'Create and manage articles.' },
      { to: '/admin/work-posts', icon: PanelsTopLeft, title: 'Work Posts', copy: 'Manage reusable work content.' },
      { to: '/admin/ai-posts', icon: Sparkles, title: 'AI Posts', copy: 'Manage AI-related content.' },
      { to: '/admin/videos', icon: Video, title: 'YouTube Videos', copy: 'Manage videos and Shorts.' },
      { to: '/admin/media', icon: Image, title: 'Media', copy: 'Manage reusable images and uploaded assets.' },
    ],
  },
  {
    id: 'website',
    title: 'Website',
    copy: 'Pages, reusable blocks and global website controls.',
    items: [
      { to: '/admin/website/pages', icon: PanelsTopLeft, title: 'Pages', copy: 'Open and edit public pages.' },
      { to: '/admin/website/blocks', icon: LibraryBig, title: 'Block Library', copy: 'Browse reusable page-builder blocks.' },
      { to: '/admin/website/styles', icon: Palette, title: 'Global Styles', copy: 'Control site-wide visual styles.' },
      { to: '/admin/website/global/header', icon: PanelTop, title: 'Header', copy: 'Edit the global header.' },
      { to: '/admin/website/global/footer', icon: PanelBottom, title: 'Footer', copy: 'Edit the global footer.' },
    ],
  },
  {
    id: 'tools',
    title: 'Social & Settings',
    copy: 'Social tools and website configuration.',
    items: [
      { to: '/admin/social', icon: Link2, title: 'Social Links', copy: 'Manage website social links.' },
      { to: '/admin/social-automation', icon: Sparkles, title: 'Social Automation', copy: 'Create and schedule social content.' },
      { to: '/admin/settings', icon: Settings, title: 'Website Settings', copy: 'Manage email and shared website services.' },
    ],
  },
];

const quickJustin = [
  { to: '/admin/service-requests', icon: Inbox, title: 'Service Requests', copy: 'Project and quote workflow' },
  { to: '/admin/hiring-contacts', icon: BriefcaseBusiness, title: 'Hiring Contacts', copy: 'Jobs, recruiters and interviews' },
  { to: '/admin/website/pages', icon: PanelsTopLeft, title: 'Pages', copy: 'Edit the live portfolio' },
  { to: '/admin/website/global/project-request', icon: Inbox, title: 'Project Request Drawer', copy: 'Edit the Start a Project form' },
];

const quickJustConsignIn = [
  { to: '/admin/demo-requests', icon: Inbox, title: 'Demo Requests', copy: 'New demo leads' },
  { to: '/admin/beta-partners', icon: Handshake, title: 'Beta Partners', copy: 'Founding Partner workflow' },
  { to: '/admin/website/pages', icon: PanelsTopLeft, title: 'Pages', copy: 'Edit public pages' },
  { to: '/admin/social-automation', icon: Sparkles, title: 'Social Automation', copy: 'Create and schedule content' },
];

export default function Dashboard() {
  const siteKey = getAdminSiteKey();
  const isJustin = siteKey === 'justindematteis';
  const sections = isJustin ? justinSections : justConsignInSections;
  const quick = isJustin ? quickJustin : quickJustConsignIn;

  return <>
    <div className="site-admin-page-head dashboard-head">
      <div>
        <p className="site-admin-eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p>{isJustin ? 'Everything currently available in the JustinDeMatteis.com admin, organized in one place.' : 'Everything currently available in the JustConsignIn admin, organized in one place.'}</p>
      </div>
    </div>

    <section className="dashboard-quick">
      <div className="dashboard-section-heading">
        <div>
          <p className="site-admin-eyebrow">Quick Access</p>
          <h2>Open what you are working on</h2>
        </div>
      </div>
      <div className="dashboard-quick-grid">
        {quick.map(({ to, icon: Icon, title, copy }) => <Link className="dashboard-quick-card" to={to} key={to}>
          <span className="dashboard-quick-icon"><Icon size={20}/></span>
          <span>
            <strong>{title}</strong>
            <small>{copy}</small>
          </span>
          <span className="dashboard-link-arrow">›</span>
        </Link>)}
      </div>
    </section>

    <div className="dashboard-section-grid">
      {sections.map(section => <section className={`dashboard-section-card ${section.id}`} key={section.id}>
        <div className="dashboard-section-heading">
          <div>
            <h2>{section.title}</h2>
            <p>{section.copy}</p>
          </div>
        </div>

        <div className="dashboard-link-list">
          {section.items.map(({ to, icon: Icon, title, copy }) => <Link className="dashboard-link-row" to={to} key={to}>
            <span className="dashboard-row-icon"><Icon size={17}/></span>
            <span className="dashboard-row-copy">
              <strong>{title}</strong>
              <small>{copy}</small>
            </span>
            <span className="dashboard-link-arrow">›</span>
          </Link>)}
        </div>
      </section>)}
    </div>
  </>;
}
