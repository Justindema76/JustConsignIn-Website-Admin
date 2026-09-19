import { useMemo, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { ArrowLeft, ExternalLink, Image, RotateCcw } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { siteBuilderConfig } from './siteBuilderConfig';
import { getInitialPageBuilderData, getWebsitePage, livePageUrl } from './websitePages';
import './siteBuilder.css';

function storageKey(pageId) {
  return `jci-site-builder-page-${pageId}-v1`;
}

function loadDraft(pageId, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = window.localStorage.getItem(storageKey(pageId));
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export default function SiteBuilder() {
  const { pageId = '' } = useParams();
  const page = getWebsitePage(pageId);

  if (!page) return <Navigate to="/admin/website/pages" replace />;
  if (page.editor !== 'visual') return <Navigate to="/admin/website/pages" replace />;

  const fallbackData = useMemo(() => getInitialPageBuilderData(page.id), [page.id]);
  const initialData = useMemo(() => loadDraft(page.id, fallbackData), [page.id, fallbackData]);
  const [editorKey, setEditorKey] = useState(0);
  const [savedAt, setSavedAt] = useState(() => window.localStorage.getItem(`${storageKey(page.id)}:savedAt`) || '');

  const publish = data => {
    const now = new Date().toISOString();
    window.localStorage.setItem(storageKey(page.id), JSON.stringify(data));
    window.localStorage.setItem(`${storageKey(page.id)}:savedAt`, now);
    setSavedAt(now);
  };

  const reset = () => {
    window.localStorage.removeItem(storageKey(page.id));
    window.localStorage.removeItem(`${storageKey(page.id)}:savedAt`);
    setSavedAt('');
    setEditorKey(value => value + 1);
  };

  return <div className="jci-site-builder-page">
    <div className="jci-builder-breadcrumb">
      <Link to="/admin/website/pages"><ArrowLeft size={14}/> Website Pages</Link>
      <span>/</span>
      <strong>{page.title}</strong>
    </div>

    <div className="site-admin-page-head jci-site-builder-head">
      <div>
        <p className="site-admin-eyebrow">Website · {page.path}</p>
        <h1>Edit {page.title}</h1>
        <p>The editable content below was pulled from the current React page in the live website codebase.</p>
      </div>
      <div className="site-admin-actions">
        <Link className="site-admin-btn secondary" to="/admin/media"><Image size={15}/> Media Library</Link>
        <a className="site-admin-btn secondary" href={livePageUrl(page.path)} target="_blank" rel="noreferrer">
          Open Live Page <ExternalLink size={13}/>
        </a>
        <button className="site-admin-btn secondary" type="button" onClick={reset}>
          <RotateCcw size={14}/> Reset Imported Content
        </button>
      </div>
    </div>

    <div className="jci-builder-notice">
      <strong>Imported from the existing website:</strong> this editor is now page-specific instead of using sample content. Publishing still saves a draft in the admin only while we connect the final publish step to the public site.
      {savedAt && <span> Last saved {new Date(savedAt).toLocaleString()}.</span>}
    </div>

    <div className="jci-puck-editor">
      <Puck
        key={editorKey}
        config={siteBuilderConfig}
        data={editorKey ? fallbackData : initialData}
        onPublish={publish}
      />
    </div>
  </div>;
}
