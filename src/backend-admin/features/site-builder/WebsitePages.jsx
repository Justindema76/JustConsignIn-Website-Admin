import {
  AppWindow,
  BookOpen,
  ExternalLink,
  FileText,
  FormInput,
  Image,
  LayoutTemplate,
  Pencil,
  Scale,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SUNWINGS_HN_PAGES, getWebsitePages, livePageUrl } from './websitePagesData';
import { getAdminSiteKey } from '../../services/siteAdminService';
import './websitePages.css';
import HnSeoPages, { HN_PAGES } from '../../sites/sunwings/HnSeoPages';

const kindMeta = {
  marketing: { label: 'Marketing page', icon: LayoutTemplate },
  structured: { label: 'Structured page', icon: FileText },
  content: { label: 'Content page', icon: BookOpen },
  form: { label: 'Form page', icon: FormInput },
  legal: { label: 'Legal page', icon: Scale },
  application: { label: 'Application page', icon: AppWindow },
};

function editTarget(page) {
  if (page.editorTarget) return page.editorTarget;
  if (page.editor === 'blog') return '/admin/blog';
  if (page.editor === 'visual') return `/admin/website/pages/${page.id}`;
  return null;
}

function editorLabel(page) {
  if (page.editor === 'section') return 'Hamilton & Niagara';
  if (page.editor === 'visual') return 'Visual editor';
  if (page.editor === 'blog') return 'Blog manager';
  if (page.editor === 'work-post') return 'Work Post editor';
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
  // Sunwings: switch between the main site (Toronto & GTA) and the Hamilton & Niagara section.
  const [params, setParams] = useSearchParams();
  const area = siteKey === 'sunwings' && params.get('area') === 'hn' ? 'hn' : 'main';
  const setArea = next => setParams(next === 'hn' ? { area: 'hn' } : {}, { replace: true });
  const [seoOpen, setSeoOpen] = useState('');
  const [hnSeo, setHnSeo] = useState({});
  // Google title and description for a Hamilton & Niagara page: saved text, or the default.
  const seoFor = id => { const def = HN_PAGES.find(row => row[0] === id) || []; return { title: hnSeo[id]?.title || def[3] || '', description: hnSeo[id]?.description || def[4] || '', custom: Boolean(hnSeo[id]?.title || hnSeo[id]?.description) }; };
  const openSeo = id => {
    setSeoOpen(id);
    setTimeout(() => document.getElementById('hamilton-niagara')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const pages = area === 'hn' ? SUNWINGS_HN_PAGES : getWebsitePages(siteKey);
  const websiteUrl = livePageUrl('/', siteKey);
  const workChildren = siteKey === 'justindematteis'
    ? pages.filter(page => page.path.startsWith('/work/') && page.path !== '/work')
    : [];
  const visiblePages = workChildren.length
    ? pages.filter(page => !workChildren.some(child => child.id === page.id))
    : pages;

  const renderPageCard = page => {
    const meta = kindMeta[page.kind] || kindMeta.marketing;
    const Icon = meta.icon;
    const target = editTarget(page);
    const isWorkPage = siteKey === 'justindematteis' && page.path === '/work';

    return <article className={`site-admin-card jci-website-page-card ${isWorkPage ? 'jci-work-parent-card' : ''}`} key={page.id}>
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

      {page.seo ? (() => { const seo = seoFor(page.seo); return <button type="button" className="jci-seo-preview" onClick={() => openSeo(page.seo)} title="Edit SEO">
        <span>Google shows{seo.custom ? '' : ' (default)'}</span>
        <strong>{seo.title}</strong>
        <em>{seo.description}</em>
      </button>; })() : null}

      <div className="jci-page-card-actions">
        {target ? <Link className="site-admin-btn" to={target}>
          <Pencil size={14}/> {page.editLabel || (page.editor === 'blog' ? 'Manage Blog' : 'Edit Page')}
        </Link> : <span className="jci-custom-page-note">{customPageNote(page)}</span>}
        {page.bannerTarget ? <Link className="site-admin-btn" to={page.bannerTarget}>
          <Image size={14}/> Edit banner
        </Link> : null}
        {page.seo ? <button className="site-admin-btn secondary" type="button" onClick={() => openSeo(page.seo)}>
          <Search size={14}/> Edit SEO
        </button> : null}
        <a className="site-admin-btn secondary" href={livePageUrl(page.path, siteKey)} target="_blank" rel="noreferrer">
          Open Live <ExternalLink size={13}/>
        </a>
      </div>

      {isWorkPage && workChildren.length > 0 && <details className="jci-work-page-dropdown">
        <summary>
          <span>Work pages</span>
          <strong>{workChildren.length}</strong>
        </summary>
        <div className="jci-work-page-list">
          {workChildren.map(child => {
            const childTarget = editTarget(child);
            return <div className="jci-work-page-row" key={child.id}>
              <div>
                <strong>{child.title.replace(/^Case Study — /, '')}</strong>
                <code>{child.path}</code>
              </div>
              <div className="jci-work-page-row-actions">
                {childTarget && <Link className="site-admin-btn secondary small" to={childTarget}><Pencil size={13}/> Edit</Link>}
                <a className="site-admin-btn secondary small" href={livePageUrl(child.path, siteKey)} target="_blank" rel="noreferrer">Open <ExternalLink size={12}/></a>
              </div>
            </div>;
          })}
          <Link className="jci-work-post-manager-link" to="/admin/work-posts">
            Manage article-style Work Posts →
          </Link>
        </div>
      </details>}

      <details className="jci-page-source">
        <summary><Search size={13}/> Source</summary>
        <code>{page.source}</code>
      </details>
    </article>;
  };

  return <div className="jci-website-pages">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website</p>
        <h1>{area === 'hn' ? 'Hamilton & Niagara pages' : 'Pages'}</h1>
        <p>Edit visual pages here. Structured, form, and application pages stay separate when they require special behaviour.</p>
      </div>
      <div className="site-admin-actions">
        <a className="site-admin-btn secondary" href={websiteUrl} target="_blank" rel="noreferrer">
          View Website <ExternalLink size={14}/>
        </a>
      </div>
    </div>

    {siteKey === 'sunwings' ? <div className="jci-area-switch" role="tablist" aria-label="Which site">
      <button type="button" role="tab" aria-selected={area === 'main'} className={area === 'main' ? 'active' : ''} onClick={() => setArea('main')}>Toronto &amp; GTA</button>
      <button type="button" role="tab" aria-selected={area === 'hn'} className={area === 'hn' ? 'active' : ''} onClick={() => setArea('hn')}>Hamilton &amp; Niagara</button>
    </div> : null}

    <div className="jci-page-sync-note">
      <ShieldCheck size={18}/>
      <div>
        <strong>Connected to the current public website routes</strong>
        <span>Visual pages use the page builder. Special pages keep their own editor when they need structured data, forms, or application behaviour.</span>
      </div>
    </div>

    <div className="jci-website-page-grid">
      {visiblePages.map(renderPageCard)}
    </div>

    {area === 'hn' ? <HnSeoPages open={seoOpen} onOpen={setSeoOpen} onLoaded={setHnSeo}/> : null}
  </div>;
}
