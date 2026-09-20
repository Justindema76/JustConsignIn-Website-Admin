import { useEffect, useMemo, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { ArrowLeft, CheckCircle2, ExternalLink, Image, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import {
  loadAdminSitePage,
  publishAdminSitePage,
  saveAdminSitePageDraft,
} from '../../services/siteAdminService';
import { siteBuilderConfig } from './siteBuilderConfig';
import { getInitialPageBuilderData, getWebsitePage, livePageUrl } from './websitePages';
import './siteBuilder.css';

function storageKey(pageId) {
  const version = pageId === 'features' ? 'v3' : 'v2';
  return `jci-site-builder-page-${pageId}-${version}`;
}

function readLocalDraft(pageId) {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(storageKey(pageId));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function writeLocalDraft(pageId, data) {
  try {
    window.localStorage.setItem(storageKey(pageId), JSON.stringify(data));
  } catch {}
}

function validatePublishData(page, data) {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  const types = new Set(blocks.map(block => block?.type).filter(Boolean));

  const requiredByPage = {
    home: ['HomeHeroBlock', 'HomeIntegrationBlock', 'HomeVideosBlock', 'HomeLinksBlock'],
    features: ['FeaturesHeroBlock', 'FeaturesGridBlock', 'FeaturesAudienceBlock', 'FeaturesCtaBlock'],
  };

  const required = requiredByPage[page.id];
  if (!required) return;

  const missing = required.filter(type => !types.has(type));
  if (missing.length) {
    throw new Error(`${page.title} publish blocked: restore the live page sections before publishing.`);
  }
}

export default function SiteBuilder() {
  const { pageId = '' } = useParams();
  const page = getWebsitePage(pageId);
  const { accessToken } = useAuth();

  if (!page) return <Navigate to="/admin/website/pages" replace />;
  if (page.editor !== 'visual') return <Navigate to="/admin/website/pages" replace />;

  const fallbackData = useMemo(() => getInitialPageBuilderData(page.id), [page.id]);
  const [initialData, setInitialData] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [editorKey, setEditorKey] = useState(0);
  const [savedAt, setSavedAt] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const state = await loadAdminSitePage(accessToken, page.id);
        if (!active) return;

        let data = state.draft?.content || null;
        let migratedLocal = false;

        if (!data) {
          const localDraft = readLocalDraft(page.id);
          if (localDraft) {
            data = localDraft;
            migratedLocal = true;
          }
        }

        data ||= fallbackData;
        setInitialData(data);
        setCurrentData(data);
        setSavedAt(state.draft?.updated_at || '');
        setPublishedAt(state.published?.published_at || '');

        if (migratedLocal) {
          try {
            const saved = await saveAdminSitePageDraft(accessToken, page, data);
            if (!active) return;
            setSavedAt(saved.draft?.updated_at || new Date().toISOString());
            setMessage('Your existing browser draft was moved into the website database.');
          } catch (migrationError) {
            if (!active) return;
            setError(migrationError.message || 'The local draft is loaded, but it could not be moved to the website database yet.');
          }
        }
      } catch (loadError) {
        if (!active) return;
        const localDraft = readLocalDraft(page.id);
        const data = localDraft || fallbackData;
        setInitialData(data);
        setCurrentData(data);
        setError(loadError.message || 'Unable to load the saved website page.');
      } finally {
        if (active) setLoading(false);
      }
    }

    if (accessToken) load();
    return () => { active = false; };
  }, [accessToken, page.id, fallbackData]);

  const handleChange = data => {
    setCurrentData(data);
    writeLocalDraft(page.id, data);
  };

  const saveDraft = async () => {
    const data = currentData || initialData || fallbackData;
    setSavingDraft(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveAdminSitePageDraft(accessToken, page, data);
      const when = saved.draft?.updated_at || new Date().toISOString();
      setSavedAt(when);
      writeLocalDraft(page.id, data);
      setMessage('Draft saved. The live website has not changed.');
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  const publish = async data => {
    setPublishing(true);
    setError('');
    setMessage('');
    try {
      validatePublishData(page, data);
      const saved = await publishAdminSitePage(accessToken, page, data);
      const draftWhen = saved.draft?.updated_at || new Date().toISOString();
      const publishWhen = saved.published?.published_at || new Date().toISOString();
      setCurrentData(data);
      setSavedAt(draftWhen);
      setPublishedAt(publishWhen);
      writeLocalDraft(page.id, data);
      setMessage('Published. This page is now using this version on the public website.');
    } catch (publishError) {
      setError(publishError.message || 'Unable to publish the page.');
      throw publishError;
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    setInitialData(fallbackData);
    setCurrentData(fallbackData);
    writeLocalDraft(page.id, fallbackData);
    setMessage('Live website template content restored in the editor. Save Draft or Publish when you are ready.');
    setError('');
    setEditorKey(value => value + 1);
  };

  if (loading || !initialData) {
    return <div className="jci-site-builder-loading">
      <LoaderCircle className="jci-spin" size={26}/>
      <strong>Loading {page.title} editor…</strong>
    </div>;
  }

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
        <p>Edit the page, save a private draft, and publish it to the live website when it is ready.</p>
      </div>
      <div className="site-admin-actions">
        <button className="site-admin-btn" type="button" onClick={saveDraft} disabled={savingDraft || publishing}>
          {savingDraft ? <LoaderCircle className="jci-spin" size={14}/> : <Save size={14}/>}
          {savingDraft ? 'Saving…' : 'Save Draft'}
        </button>
        <Link className="site-admin-btn secondary" to="/admin/media"><Image size={15}/> Media Library</Link>
        <a className="site-admin-btn secondary" href={livePageUrl(page.path)} target="_blank" rel="noreferrer">
          Open Live Page <ExternalLink size={13}/>
        </a>
        <button className="site-admin-btn secondary" type="button" onClick={reset}>
          <RotateCcw size={14}/> Restore Imported Content
        </button>
      </div>
    </div>

    <div className="jci-builder-notice">
      <strong>Live publishing is connected to the page template.</strong> The builder preview uses the same public layout and CSS. Use <strong>Save Draft</strong> for private changes and <strong>Publish</strong> only when the preview is correct.
      {savedAt && <span> Draft saved {new Date(savedAt).toLocaleString()}.</span>}
      {publishedAt && <span> Published {new Date(publishedAt).toLocaleString()}.</span>}
    </div>

    {message && <div className="jci-builder-message success"><CheckCircle2 size={17}/><span>{message}</span></div>}
    {error && <div className="jci-builder-message error"><span>{error}</span></div>}
    {publishing && <div className="jci-builder-message publishing"><LoaderCircle className="jci-spin" size={17}/><span>Publishing {page.title}…</span></div>}

    <div className="jci-puck-editor">
      <Puck
        key={`${page.id}-${editorKey}`}
        config={siteBuilderConfig}
        data={initialData}
        headerTitle={page.title}
        headerPath={page.path}
        onChange={handleChange}
        onPublish={publish}
      />
    </div>
  </div>;
}
