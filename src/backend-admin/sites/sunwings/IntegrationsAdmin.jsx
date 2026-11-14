import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Facebook, RefreshCw, Star } from 'lucide-react';
import { useAuth } from '../../auth/AdminAuthContext';
import {
  loadSunwingsFacebookPosts,
  loadSunwingsGoogleReviews,
  loadSunwingsSettings,
  saveSunwingsSettings,
  syncSunwingsGoogleReviews,
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
      // Sunwings' Google Business listing (same ID the site's "Google reviews" link uses).
      { key: 'place_id', label: 'Google Place ID', default: 'ChIJXTBVHE3zTkcRiUEmU5P3CsI' },
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
    const defaults = Object.fromEntries(meta.configFields.filter(field => field.default).map(field => [field.key, field.default]));
    const saved = Object.fromEntries(Object.entries(data?.config || {}).filter(([, value]) => value !== '' && value != null));
    setForm({ config: { ...defaults, ...saved }, secret: '', enabled: Boolean(data?.enabled) });
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

// Facebook page tokens made the quick way expire after ~60 days. Explain how to get one that doesn't.
const FB_TOKEN_EXPIRED = /access token|session has expired|OAuthException/i;

function FacebookTokenHelp({ detail }) {
  return <div className="site-admin-alert error sunwings-fb-help">
    <div>
      <strong>Facebook stopped working: the saved Facebook token has expired.</strong>
      <p>Posts can't sync until a new token is saved. Get one that never expires:</p>
      <ol>
        <li>Open the <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer">Facebook Graph API Explorer</a>, pick your app, click <b>Generate Access Token</b> and allow <code>pages_show_list</code>, <code>pages_read_engagement</code> and <code>pages_read_user_content</code>.</li>
        <li>Click the ⓘ next to the token → <b>Open in Access Token Tool</b> → <b>Extend Access Token</b>. Copy the long one it gives you.</li>
        <li>Back in the Explorer, paste it in the token box and run <code>me/accounts</code>. Copy the <code>access_token</code> under Sunwings. That one never expires.</li>
        <li>Paste it into <b>Page access token</b> below, then <b>Test Connection</b> → <b>Save</b> → <b>Sync Facebook Posts</b>.</li>
      </ol>
      {detail ? <small>Facebook said: {detail}</small> : null}
    </div>
  </div>;
}

export default function IntegrationsAdmin() {
  const { accessToken } = useAuth();
  const [integrations, setIntegrations] = useState({});
  const [facebookPosts, setFacebookPosts] = useState([]);
  const [feedEnabled, setFeedEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [googleReviews, setGoogleReviews] = useState(null);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [trustindex, setTrustindex] = useState('');
  const [trustSaving, setTrustSaving] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [featuredSaving, setFeaturedSaving] = useState(false);
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
    loadSunwingsGoogleReviews(accessToken).then(setGoogleReviews).catch(() => {});
    loadSunwingsSettings(accessToken).then(settings => {
      setTrustindex(settings.trustindex_widget_id || '');
      try { setFeatured(JSON.parse(settings.featured_reviews || '[]')); } catch { setFeatured([]); }
    }).catch(() => {});
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

  // Accepts the widget ID or the whole embed code Trustindex gives you.
  const saveTrustindex = async () => {
    const text = trustindex.trim();
    const id = (text.match(/loader\.js\?([a-z0-9]+)/i) || [])[1] || (/^[a-z0-9]{6,}$/i.test(text) ? text : '');
    if (text && !id) return setError('That doesn’t look like Trustindex code. Paste the code from Trustindex (it contains “loader.js?”).');
    setTrustSaving(true); setError(''); setMessage('');
    try {
      await saveSunwingsSettings(accessToken, { trustindex_widget_id: id });
      setTrustindex(id);
      setMessage(id ? 'Trustindex reviews saved. They show on the homepage within about a minute.' : 'Trustindex removed from the homepage.');
    } catch (err) {
      setError(err.message);
    } finally {
      setTrustSaving(false);
    }
  };

  // Featured reviews: real Google reviews copied in by hand (Google's feed leaves the text out for Sunwings).
  const updateReview = (index, changes) => setFeatured(list => list.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  const saveFeatured = async () => {
    const clean = featured
      .map(item => ({ name: String(item.name || '').trim(), stars: Math.min(5, Math.max(1, Number(item.stars) || 5)), text: String(item.text || '').trim(), when: String(item.when || '').trim() }))
      .filter(item => item.name && item.text);
    setFeaturedSaving(true); setError(''); setMessage('');
    try {
      await saveSunwingsSettings(accessToken, { featured_reviews: JSON.stringify(clean) });
      setFeatured(clean);
      setMessage(clean.length ? `${clean.length} reviews saved. They show on the homepage within about a minute.` : 'Featured reviews cleared.');
    } catch (err) {
      setError(err.message);
    } finally {
      setFeaturedSaving(false);
    }
  };

  const syncGoogle = async () => {
    setGoogleSyncing(true); setError(''); setMessage('');
    try {
      const result = await syncSunwingsGoogleReviews(accessToken);
      setGoogleReviews(result.reviews || null);
      setMessage(result.enabled
        ? `Google reviews updated: ${result.reviews?.rating ?? '–'}★ from ${result.reviews?.count ?? 0} ratings, ${result.reviews?.reviews?.length ?? 0} reviews on the website.`
        : 'Google reviews are off ("Show this on the Sunwings website" is unticked), so they were removed from the website.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGoogleSyncing(false);
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

    {error && (FB_TOKEN_EXPIRED.test(error) ? <FacebookTokenHelp detail={error}/> : <div className="site-admin-alert error">{error}</div>)}
    {message && <div className="site-admin-alert success"><CheckCircle2 size={16}/>{message}</div>}

    <div className="sunwings-integration-grid">
      <IntegrationCard provider="google_reviews" data={integrations.google_reviews} accessToken={accessToken} onSave={handleSave}/>
      <IntegrationCard provider="facebook" data={integrations.facebook} accessToken={accessToken} onSave={handleSave}/>
    </div>

    <div className="site-admin-card sunwings-social-sync-card">
      <div className="sunwings-social-sync-head">
        <div>
          <h3>Google Reviews on the website</h3>
          <small>{googleReviews?.rating
            ? `Showing ${googleReviews.rating}★ (${googleReviews.count} ratings) on the homepage. Last updated ${new Date(googleReviews.synced_at).toLocaleString()}.`
            : 'Save the Place ID and API key above, tick "Show this on the Sunwings website", then press Sync.'}</small>
        </div>
        <button className="site-admin-btn secondary" type="button" disabled={googleSyncing} onClick={syncGoogle}>
          <RefreshCw size={14}/> {googleSyncing ? 'Syncing…' : 'Sync Google Reviews'}
        </button>
      </div>
      {googleReviews?.reviews?.length
        ? <div className="sunwings-social-feed-preview">
          {googleReviews.reviews.map((review, index) => <article className="sunwings-social-preview-card" key={index}>
            <div>
              <small>{'★'.repeat(review.stars)} · {review.name}{review.when ? ` · ${review.when}` : ''}</small>
              <p>{review.text}</p>
            </div>
          </article>)}
        </div>
        : <div className="site-admin-empty">{googleReviews?.note || 'No Google reviews synced yet.'}</div>}
      <div className="sunwings-featured-reviews">
        <h4>Featured reviews on the homepage</h4>
        <small>Copy your best Google reviews here. The homepage shows the first 3 next to your live Google rating.</small>
        {featured.map((review, index) => <div className="sunwings-featured-review" key={index}>
          <div className="sunwings-featured-row">
            <label>Name<input value={review.name || ''} onChange={event => updateReview(index, { name: event.target.value })} placeholder="e.g. Robert S."/></label>
            <label>Stars<select value={review.stars || 5} onChange={event => updateReview(index, { stars: Number(event.target.value) })}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select></label>
            <label>When<input value={review.when || ''} onChange={event => updateReview(index, { when: event.target.value })} placeholder="e.g. Aug 2026"/></label>
          </div>
          <label>Review<textarea rows="3" value={review.text || ''} onChange={event => updateReview(index, { text: event.target.value })}/></label>
          <div className="sunwings-featured-actions">
            <button type="button" className="site-admin-btn secondary small" disabled={index === 0} onClick={() => setFeatured(list => { const next = [...list]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}>Move up</button>
            <button type="button" className="site-admin-btn secondary small" onClick={() => setFeatured(list => list.filter((_, i) => i !== index))}>Remove</button>
          </div>
        </div>)}
        <div className="sunwings-featured-actions">
          <button type="button" className="site-admin-btn secondary" onClick={() => setFeatured(list => [...list, { name: '', stars: 5, text: '', when: '' }])}>Add a review</button>
          <button type="button" className="site-admin-btn" disabled={featuredSaving} onClick={saveFeatured}>{featuredSaving ? 'Saving…' : 'Save reviews'}</button>
        </div>
      </div>
      <div className="site-admin-form sunwings-trustindex">
        <label>
          Trustindex widget (shows the review text)
          <input value={trustindex} onChange={event => setTrustindex(event.target.value)} placeholder="Paste the Trustindex code or widget ID"/>
        </label>
        <small>{trustindex ? 'The homepage shows your Google reviews through Trustindex. Clear the box and save to remove it.' : 'Google leaves out review text for Sunwings, so the homepage uses Trustindex for it. Paste the code Trustindex gives you and save.'}</small>
        <button className="site-admin-btn" type="button" disabled={trustSaving} onClick={saveTrustindex}>{trustSaving ? 'Saving…' : 'Save Trustindex'}</button>
      </div>
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
