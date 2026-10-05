import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Facebook, RefreshCw, Star } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import {
  loadSunwingsFacebookPosts,
  loadSunwingsIntegrations,
  saveSunwingsIntegration,
  syncSunwingsFacebookPosts,
} from './sunwingsAdminService';
import './sunwingsIntegrations.css';

const PROVIDERS = {
  google_reviews: {
    label: 'Google Reviews',
    description: 'Show live Google Business Profile reviews on the Sunwings website.',
    icon: Star,
    secretKey: 'api_key',
    secretLabel: 'Google Places API key',
    configFields: [
      { key: 'place_id', label: 'Google Place ID' },
    ],
  },
  facebook: {
    label: 'Facebook Page',
    description: 'Connect the Sunwings Facebook Page so recent posts can sync to the website.',
    icon: Facebook,
    secretKey: 'page_access_token',
    secretLabel: 'Page access token',
    configFields: [
      { key: 'page_id', label: 'Facebook Page ID' },
      { key: 'graph_version', label: 'Meta Graph API version', placeholder: 'v21.0' },
      { key: 'display_limit', label: 'Posts to display', placeholder: '6' },
    ],
  },
};

function emptyFormState() {
  return { config: {}, secret: '', enabled: false };
}

function IntegrationCard({ provider, data, accessToken, onSave }) {
  const meta = PROVIDERS[provider];
  const Icon = meta.icon;
  const [form, setForm] = useState(emptyFormState());
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setForm({ config: { ...(data?.config || {}) }, secret: '', enabled: Boolean(data?.enabled) });
  }, [data]);

  const updateConfig = (key, value) => setForm(current => ({ ...current, config: { ...current.config, [key]: value } }));

  const run = async action => {
    setBusy(action); setLocalError('');
    try {
      const payload = await saveSunwingsIntegration(accessToken, {
        provider,
        action,
        enabled: form.enabled,
        config: form.config,
        secrets: { [meta.secretKey]: form.secret },
      });
      onSave(provider, payload.integration);
      setPreview(payload.preview || null);
      setForm(current => ({ ...current, secret: '' }));
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setBusy('');
    }
  };

  const secretConfigured = data?.secretConfigured?.[meta.secretKey];
  const status = data?.last_test_ok === true ? 'connected' : data?.last_test_ok === false ? 'failed' : '';
  const statusLabel = data?.last_test_ok === true ? 'Connected' : data?.last_test_ok === false ? 'Connection failed' : 'Not tested';

  return <div className="site-admin-card sunwings-integration-card">
    <div className="sunwings-integration-head">
      <div>
        <span className="sunwings-provider-mark"><Icon size={18}/></span>
        <div>
          <h3>{meta.label}</h3>
          <p>{meta.description}</p>
        </div>
      </div>
      <span className={`sunwings-connection-badge ${status}`}>{statusLabel}</span>
    </div>

    {localError && <div className="site-admin-alert error">{localError}</div>}

    <div className="site-admin-form sunwings-integration-fields">
      {meta.configFields.map(field => <label key={field.key}>
        {field.label}
        <input
          value={form.config[field.key] ?? ''}
          placeholder={field.placeholder || ''}
          onChange={event => updateConfig(field.key, event.target.value)}
        />
      </label>)}
      <label className="wide">
        {meta.secretLabel}
        <input
          type="password"
          value={form.secret}
          placeholder={secretConfigured ? 'Saved securely · enter a new value only to replace it' : 'Not saved yet'}
          onChange={event => setForm(current => ({ ...current, secret: event.target.value }))}
        />
      </label>
      <label className="sunwings-toggle-row wide">
        <input type="checkbox" checked={form.enabled} onChange={event => setForm(current => ({ ...current, enabled: event.target.checked }))}/>
        Show this on the Sunwings website
      </label>
    </div>

    <div className="sunwings-connection-detail">
      {data?.last_test_message || (data?.last_tested_at ? `Last tested ${new Date(data.last_tested_at).toLocaleString()}` : 'Enter the required information, then test the connection.')}
    </div>

    <div className="site-admin-actions sunwings-integration-actions">
      <button className="site-admin-btn secondary" type="button" disabled={busy !== ''} onClick={() => run('test')}>{busy === 'test' ? 'Testing…' : 'Test Connection'}</button>
      <button className="site-admin-btn" type="button" disabled={busy !== ''} onClick={() => run('save')}>{busy === 'save' ? 'Saving…' : 'Save'}</button>
    </div>

    {preview && <div className="sunwings-integration-preview">
      <strong>Live test preview</strong>
      {provider === 'google_reviews'
        ? <>
          <small>{preview.displayName?.text || 'Google business'} · {preview.rating || '—'} stars · {preview.userRatingCount || 0} ratings</small>
          {(preview.reviews || []).slice(0, 3).map((review, index) => <p key={index}>★ {review.authorAttribution?.displayName || 'Reviewer'}: {(review.text?.text || '').slice(0, 180)}</p>)}
        </>
        : <>
          <small>{preview.name || 'Facebook Page'}</small>
          {(preview.posts?.data || []).slice(0, 3).map((post, index) => <p key={index}>{(post.message || 'Post with media').slice(0, 220)}</p>)}
        </>}
    </div>}
  </div>;
}

export default function IntegrationsAdmin() {
  const { accessToken } = useAuth();
  const [integrations, setIntegrations] = useState({});
  const [facebookPosts, setFacebookPosts] = useState([]);
  const [feedEnabled, setFeedEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([loadSunwingsIntegrations(accessToken), loadSunwingsFacebookPosts(accessToken)])
      .then(([list, feed]) => {
        setIntegrations(Object.fromEntries(list.map(item => [item.provider, item])));
        setFacebookPosts(feed.posts);
        setFeedEnabled(feed.enabled);
      })
      .catch(err => setError(err.message));
  }, [accessToken]);

  const handleSave = (provider, integration) => {
    setIntegrations(current => ({ ...current, [provider]: integration }));
    setMessage('Integration settings saved.');
  };

  const sync = async () => {
    setSyncing(true); setError(''); setMessage('');
    try {
      const result = await syncSunwingsFacebookPosts(accessToken);
      setMessage(`Synced ${result.count} Facebook posts.`);
      const feed = await loadSunwingsFacebookPosts(accessToken);
      setFacebookPosts(feed.posts);
      setFeedEnabled(feed.enabled);
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return <>
    <div className="site-admin-page-head">
      <div>
        <p className="site-admin-eyebrow">Connections</p>
        <h1>Integrations</h1>
        <p>Connect Google Reviews and the Sunwings Facebook Page to the website. These settings are specific to Sunwings only.</p>
      </div>
    </div>

    {error && <div className="site-admin-alert error">{error}</div>}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="sunwings-integration-grid">
      <IntegrationCard provider="google_reviews" data={integrations.google_reviews} accessToken={accessToken} onSave={handleSave}/>
      <IntegrationCard provider="facebook" data={integrations.facebook} accessToken={accessToken} onSave={handleSave}/>
    </div>

    <div className="site-admin-card sunwings-social-sync-card">
      <div className="sunwings-social-sync-head">
        <div>
          <h3>Facebook Feed Sync</h3>
          <small>{feedEnabled ? 'Live on the website.' : 'Enable the Facebook Page connection above to show this on the website.'}</small>
        </div>
        <button className="site-admin-btn secondary" type="button" disabled={syncing} onClick={sync}>
          <RefreshCw size={14}/> {syncing ? 'Syncing…' : 'Sync Facebook Posts'}
        </button>
      </div>

      {!facebookPosts.length
        ? <div className="site-admin-empty">No Facebook posts synced yet.</div>
        : <div className="sunwings-social-feed-preview">
          {facebookPosts.map(post => <article className="sunwings-social-preview-card" key={post.external_id}>
            {post.image_url && <img src={post.image_url} alt=""/>}
            <div>
              <small>{post.published_at ? new Date(post.published_at).toLocaleDateString() : '—'}</small>
              <p>{post.message || 'Facebook post'}</p>
              {post.permalink_url && <a href={post.permalink_url} target="_blank" rel="noreferrer">View on Facebook <ExternalLink size={12}/></a>}
            </div>
          </article>)}
        </div>}
    </div>
  </>;
}
