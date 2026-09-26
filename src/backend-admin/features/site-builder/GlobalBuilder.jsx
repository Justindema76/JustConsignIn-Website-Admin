import { useEffect, useMemo, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { CheckCircle2, ExternalLink, LoaderCircle } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { getAdminSiteKey, loadAdminGlobalSection, loadAdminSocial, saveAdminGlobalSection } from '../../services/siteAdminService';
import { defaultGlobalData, globalConfigFor } from './globalBuilderConfig';
import './globalBuilder.css';

export default function GlobalBuilder() {
  const { section = '' } = useParams();
  const { accessToken } = useAuth();
  const type = section.toLowerCase();
  if (!['header','footer','project-request'].includes(type)) return <Navigate to="/admin/website/pages" replace/>;

  const siteKey = getAdminSiteKey();
  const [socialLinks,setSocialLinks] = useState({});
  const config = useMemo(() => globalConfigFor(type, siteKey, socialLinks), [type, siteKey, socialLinks]);
  const fallback = useMemo(() => defaultGlobalData(type, siteKey), [type, siteKey]);
  const liveUrl = siteKey === 'justindematteis' ? 'https://www.justindematteis.com' : 'https://www.justconsignin.com';
  const sectionLabel = type === 'header' ? 'Header' : type === 'footer' ? 'Footer' : 'Project Request Drawer';
  const [data,setData] = useState(null);
  const [savedAt,setSavedAt] = useState('');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null); setError(''); setMessage('');
    Promise.all([
      loadAdminGlobalSection(accessToken,type),
      loadAdminSocial(accessToken).catch(() => ({})),
    ])
      .then(([result,social]) => {
        if (!active) return;
        setData(result.value || fallback);
        setSavedAt(result.updatedAt || '');
        setSocialLinks(social || {});
      })
      .catch(err => {
        if (!active) return;
        setData(fallback);
        setSocialLinks({});
        setError(err.message || 'Unable to load global section.');
      });
    return () => { active = false; };
  },[accessToken,type,fallback]);

  const publish = async value => {
    setError(''); setMessage('');
    try {
      const result = await saveAdminGlobalSection(accessToken,type,value);
      setData(value);
      setSavedAt(result.updatedAt || new Date().toISOString());
      setMessage(`${sectionLabel} published across the website.`);
    } catch(err) {
      setError(err.message || 'Unable to publish global section.');
      throw err;
    }
  };

  if(!data) return <div className="jci-site-builder-loading"><LoaderCircle className="jci-spin" size={26}/><strong>Loading {sectionLabel.toLowerCase()} editor…</strong></div>;

  return <div className="jci-site-builder-page">
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Website · Global</p>
        <h1>{sectionLabel}</h1>
        <p>Edit this once. It is reused across every public website page.</p>
      </div>
      <div className="site-admin-actions"><a className="site-admin-btn secondary" href={liveUrl} target="_blank" rel="noreferrer">View Website <ExternalLink size={13}/></a></div>
    </div>
    <div className="jci-builder-notice"><strong>Global component.</strong> Puck's <strong>Publish</strong> button updates this {sectionLabel.toLowerCase()} everywhere.{savedAt && <span> Last published {new Date(savedAt).toLocaleString()}.</span>}</div>
    {message && <div className="jci-builder-message success"><CheckCircle2 size={17}/><span>{message}</span></div>}
    {error && <div className="jci-builder-message error"><span>{error}</span></div>}
    <div className="jci-puck-editor"><Puck config={config} data={data} onPublish={publish}/></div>
  </div>;
}
