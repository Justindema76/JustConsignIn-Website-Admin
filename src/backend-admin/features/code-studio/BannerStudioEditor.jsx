import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AdminAuthContext';
import { currentAccessToken } from '../../services/apiClient';
import { loadBanner, saveBanner } from './codeStudioService';
import './bannerStudio.css';

const LANGUAGE_LABELS = { en: 'English', fr: 'French', us: 'USA' };
const ASSET_DIR = '/code-studio';

// Opens the Code Studio editor (public/code-studio/editor.js, synced from the Code Studio repo
// by scripts/sync-code-studio-editor.sh) full screen. The editor reads window.JCS_EDITOR_DATA,
// the same hook the WordPress and Magento versions use, so the editor code is never changed here.
export default function BannerStudioEditor({ studio }) {
  const { id } = useParams();
  const [search] = useSearchParams();
  const { accessToken } = useAuth();
  // Latest token for saves; a token refresh must not restart the editor (that would lose work).
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;
  const signedIn = Boolean(accessToken);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const lang = studio.languages.includes(search.get('lang')) ? search.get('lang') : studio.languages[0];
  const editorPath = `${studio.basePath}/${id}`;

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;
    let link; let script;
    (async () => {
      try {
        const banner = await loadBanner(tokenRef.current, studio.site, id);
        const version = await fetch(`${ASSET_DIR}/VERSION`, { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).catch(() => '');
        // React's dev mode mounts twice; only the last mount starts the editor (it must run once).
        if (cancelled) return;
        const v = encodeURIComponent(version.trim() || Date.now());
        const langUrl = code => (studio.languages.includes(code) ? `${editorPath}?lang=${code}` : '');
        const token = () => currentAccessToken(tokenRef.current);

        window.JCS_EDITOR_DATA = {
          slides: Array.isArray(banner[lang]) && banner[lang].length ? banner[lang] : (Array.isArray(banner.en) && banner.en.length ? banner.en : []),
          title: banner.title || '',
          language: lang,
          languageLabel: LANGUAGE_LABELS[lang] || lang,
          // Gives the banner a steady HTML id (jcs + first 8 characters of the banner id).
          postId: String(id).replace(/-/g, '').slice(0, 8),
          settings: studio.settings || {},
          listUrl: studio.basePath,
          englishUrl: langUrl('en'),
          frenchUrl: langUrl('fr'),
          usaUrl: langUrl('us'),
          save: payload => saveBanner(token(), studio.site, { id, lang, title: payload.title, data: payload.data, code: payload.code }),
          upload: studio.uploadImage ? file => studio.uploadImage(token(), file) : undefined,
        };

        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${ASSET_DIR}/editor.css?v=${v}`;
        document.head.appendChild(link);
        await new Promise(resolve => { link.onload = resolve; link.onerror = resolve; });
        if (cancelled) return;
        setReady(true);
        script = document.createElement('script');
        script.src = `${ASSET_DIR}/editor.js?v=${v}`;
        script.onerror = () => setError('The Code Studio editor could not be loaded.');
        document.body.appendChild(script);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
      link?.remove(); script?.remove();
      // The editor adds page-wide listeners (Cmd+S, resize, leave warning). When you leave it
      // with the browser's Back button, reload so none of them stay behind.
      if (window.location.pathname !== editorPath) window.location.reload();
    };
  }, [signedIn, id, lang, editorPath, studio]);

  if (error) {
    return <div className="banner-studio">
      <div className="site-admin-alert error">{error}</div>
      <Link className="site-admin-btn secondary" to={studio.basePath}>Back to Banner Studio</Link>
    </div>;
  }

  return <div className={`bs-editor-shell ${studio.languages.length < 2 ? 'bs-one-lang' : ''}`}>
    {!ready ? <div className="bs-editor-loading">Opening Code Studio…</div> : null}
    <div id="jcs-root"/>
  </div>;
}
