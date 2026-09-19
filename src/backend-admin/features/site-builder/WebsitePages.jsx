import {
  AppWindow,
  BookOpen,
  ExternalLink,
  FileText,
  FormInput,
  LayoutTemplate,
  Pencil,
  Scale,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { WEBSITE_PAGES, livePageUrl } from './websitePages';
import './websitePages.css';

const kindMeta = {
  marketing: { label: 'Marketing page', icon: LayoutTemplate },
  structured: { label: 'Structured page', icon: FileText },
  content: { label: 'Content page', icon: BookOpen },
  form: { label: 'Form page', icon: FormInput },
  legal: { label: 'Legal page', icon: Scale },
  application: { label: 'Application page', icon: AppWindow },
};

function editTarget(page) {
  if (page.editor === 'blog') return '/admin/blog';
  if (page.editor === 'visual') return `/admin/website/pages/${page.id}`;
  return null;
}

export default function WebsitePages() {
  return <div className="jci-website-pages">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website</p>
        <h1>Pages</h1>
        <p>These are the pages currently created in the public JustConsignIn website codebase.</p>
      </div>
      <div className="site-admin-actions">
        <a className="site-admin-btn secondary" href="https://www.justconsignin.com" target="_blank" rel="noreferrer">
          View Website <ExternalLink size={14}/>
        </a>
      </div>
    </div>

    <div className="jci-page-sync-note">
      <ShieldCheck size={18}/>
      <div>
        <strong>Synced from the current public website routes</strong>
        <span>Duplicate aliases such as /beta and the /demo redirect are attached to their real page instead of being shown as separate pages.</span>
      </div>
    </div>

    <div className="jci-website-page-grid">
      {WEBSITE_PAGES.map(page => {
        const meta = kindMeta[page.kind] || kindMeta.marketing;
        const Icon = meta.icon;
        const target = editTarget(page);
        return <article className="site-admin-card jci-website-page-card" key={page.id}>
          <div className="jci-page-card-top">
            <span className="jci-page-kind"><Icon size={14}/>{meta.label}</span>
            <span className={`jci-page-editor-status ${page.editor}`}>
              {page.editor === 'visual' ? 'Visual editor' : page.editor === 'blog' ? 'Blog manager' : 'Custom page'}
            </span>
          </div>

          <div className="jci-page-card-copy">
            <h2>{page.title}</h2>
            <code>{page.path}</code>
            <p>{page.description}</p>
            {page.aliases?.length ? <small>Also: {page.aliases.join(', ')}</small> : null}
          </div>

          <div className="jci-page-card-actions">
            {target ? <Link className="site-admin-btn" to={target}>
              <Pencil size={14}/> {page.editor === 'blog' ? 'Manage Blog' : 'Edit Page'}
            </Link> : <span className="jci-custom-page-note">Custom conversion required</span>}
            <a className="site-admin-btn secondary" href={livePageUrl(page.path)} target="_blank" rel="noreferrer">
              Open Live <ExternalLink size={13}/>
            </a>
          </div>

          <details className="jci-page-source">
            <summary><Search size={13}/> Source</summary>
            <code>{page.source}</code>
          </details>
        </article>;
      })}
    </div>
  </div>;
}
