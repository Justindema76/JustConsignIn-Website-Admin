// JustConsignIn visual website editor prototype.
import { useMemo, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { ExternalLink, Image, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { defaultSiteBuilderData, siteBuilderConfig } from './siteBuilderConfig';
import './siteBuilder.css';

const STORAGE_KEY = 'jci-site-builder-prototype-home-v1';

function loadDraft() {
  if (typeof window === 'undefined') return defaultSiteBuilderData;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultSiteBuilderData;
  } catch {
    return defaultSiteBuilderData;
  }
}

export default function SiteBuilder() {
  const initialData = useMemo(loadDraft, []);
  const [editorKey, setEditorKey] = useState(0);
  const [savedAt, setSavedAt] = useState(() => window.localStorage.getItem(`${STORAGE_KEY}:savedAt`) || '');

  const publish = data => {
    const now = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.localStorage.setItem(`${STORAGE_KEY}:savedAt`, now);
    setSavedAt(now);
  };

  const reset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(`${STORAGE_KEY}:savedAt`);
    setSavedAt('');
    setEditorKey(value => value + 1);
  };

  return <div className="jci-site-builder-page">
    <div className="site-admin-page-head jci-site-builder-head">
      <div>
        <p className="site-admin-eyebrow">Website</p>
        <h1>Visual Site Editor</h1>
        <p>Edit finished page sections, replace images, move blocks and change copy without touching React code.</p>
      </div>
      <div className="site-admin-actions">
        <Link className="site-admin-btn secondary" to="/admin/media"><Image size={15}/> Media Library</Link>
        <a className="site-admin-btn secondary" href="https://www.justconsignin.com" target="_blank" rel="noreferrer">Live Website <ExternalLink size={13}/></a>
        <button className="site-admin-btn secondary" type="button" onClick={reset}><RotateCcw size={14}/> Reset Test</button>
      </div>
    </div>

    <div className="jci-builder-notice">
      <strong>Safe prototype:</strong> publishing here saves this test layout in your browser only. It does not change the live website yet.
      {savedAt && <span> Last saved {new Date(savedAt).toLocaleString()}.</span>}
    </div>

    <div className="jci-puck-editor">
      <Puck
        key={editorKey}
        config={siteBuilderConfig}
        data={editorKey ? defaultSiteBuilderData : initialData}
        onPublish={publish}
      />
    </div>
  </div>;
}
