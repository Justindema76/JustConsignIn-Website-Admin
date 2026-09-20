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
import { getWebsitePages, livePageUrl } from './websitePages';
import { getAdminSiteKey } from '../../services/siteAdminService';
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

function editorLabel(page) {
  if (page.editor === 'visual') return 'Visual editor';
  if (page.editor === 'blog') return 'Blog manager';
  if (page.id === 'faq') return 'Structured FAQ';
  if (page.kind === 'form') return 'Form-specific page';
  if (page.kind === 'application') return 'Application UI';
  return 'Custom page';
}

function customPageNote(page) {
  if (page.id === 'faq') return 'Dedicated FAQ editor needed to preserve FAQ structured data.';
  if (page.kind === 'form') return 'Dedicated form editor needed.';
  if (page.kind === 'application') return 'Managed as application UI, not page-builder content.';
  return 'Dedicated editor required.';
}

export default function WebsitePages() {
  const siteKey = getAdminSiteKey();
  const pages = getWebsitePages(siteKey);
  const websiteUrl = livePageUrl('/', siteKey);

  return <div className="jci-website-pages">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website</p>
        <h1>Pages</h1>
        <p>Edit visual pages here. Structured, form, and application pages stay separate when they require special behaviour.</p>
      </div>
      <div className="site-admin-actions">
        <a className="site-admin-btn secondary" href={websiteUrl} target="_blank" rel="noreferrer">
          View Website <ExternalLink size={14}/>
        </a>
      </div>
    </div>

    <div className="jci-page-sync-note">
      <ShieldCheck size={18}/>
      <div>
        <strong>Connected to the current public website routes</strong>
        <span>Visual pages use the page builder. Special pages keep their own editor when they need structured data, forms, or application behaviour.</span>
      </div>
    </div>

    <div className="jci-website-page-grid">
      {pages.map(page => {
        const meta = kindMeta[page.kind] || kindMeta.marketing;
        const Icon = meta.icon;
        const target = editTarget(page);

        return <article className="site-admin-card jci-website-page-card" key={page.id}>
          <div className="jci-page-card-top">
            <span className="jci-page-kind"><Icon size={14}/>{meta.label}</span>
            <span className={`jci-page-editor-status ${page.editor}`}>{editorLabel(page)}</span>
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
            </Link> : <span className="jci-custom-page-note">{customPageNote(page)}</span>}
            <a className="site-admin-btn secondary" href={livePageUrl(page.path, siteKey)} target="_blank" rel="noreferrer">
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
