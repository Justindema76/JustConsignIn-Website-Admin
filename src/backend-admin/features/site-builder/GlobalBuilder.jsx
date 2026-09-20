import { useEffect, useMemo, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { CheckCircle2, ExternalLink, LoaderCircle } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { loadAdminGlobalSection, saveAdminGlobalSection } from '../../services/siteAdminService';
import { defaultGlobalData, globalConfigFor } from './globalBuilderConfig';
import './globalBuilder.css';

export default function GlobalBuilder() {
  const { section = '' } = useParams();
  const { accessToken } = useAuth();
  const type = section.toLowerCase();
  if (!['header','footer'].includes(type)) return <Navigate to="/admin/website/pages" replace/>;

  const config = useMemo(() => globalConfigFor(type), [type]);
  const fallback = useMemo(() => defaultGlobalData(type), [type]);
  const [data,setData] = useState(null);
  const [savedAt,setSavedAt] = useState('');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null); setError(''); setMessage('');
    loadAdminGlobalSection(accessToken,type)
      .then(result => { if(active){ setData(result.value || fallback); setSavedAt(result.updatedAt || ''); }})
      .catch(err => { if(active){ setData(fallback); setError(err.message || 'Unable to load global section.'); }});
    return () => { active = false; };
  },[accessToken,type,fallback]);

  const publish = async value => {
    setError(''); setMessage('');
    try {
      const result = await saveAdminGlobalSection(accessToken,type,value);
      setData(value);
      setSavedAt(result.updatedAt || new Date().toISOString());
      setMessage(`${type === 'header' ? 'Header' : 'Footer'} published across the website.`);
    } catch(err) {
      setError(err.message || 'Unable to publish global section.');
      throw err;
    }
  };

  if(!data) return <div className="jci-site-builder-loading"><LoaderCircle className="jci-spin" size={26}/><strong>Loading {type} editor…</strong></div>;

  return <div className="jci-site-builder-page">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website · Global</p>
        <h1>{type === 'header' ? 'Header' : 'Footer'}</h1>
        <p>Edit this once. It is reused across every public website page.</p>
      </div>
      <div className="site-admin-actions"><a className="site-admin-btn secondary" href="https://www.justconsignin.com" target="_blank" rel="noreferrer">View Website <ExternalLink size={13}/></a></div>
    </div>
    <div className="jci-builder-notice"><strong>Global component.</strong> Puck's <strong>Publish</strong> button updates this {type} everywhere.{savedAt && <span> Last published {new Date(savedAt).toLocaleString()}.</span>}</div>
    {message && <div className="jci-builder-message success"><CheckCircle2 size={17}/><span>{message}</span></div>}
    {error && <div className="jci-builder-message error"><span>{error}</span></div>}
    <div className="jci-puck-editor"><Puck config={config} data={data} onPublish={publish}/></div>
  </div>;
}
