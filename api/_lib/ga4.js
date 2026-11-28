// Google Analytics (GA4) Data API helpers shared by the admin Analytics pages (Sunwings, Shopify Studio).
// Keyless: Vercel's OIDC token is swapped for a Google token through Workload Identity Federation,
// then the read-only analytics service account is impersonated. No JSON key file exists anywhere.
// Each site has its own GA4 property id env var; the Google sign-in settings are shared.

const ENV = {
  propertyId: 'GA4_PROPERTY_ID',
  projectNumber: 'GCP_PROJECT_NUMBER',
  poolId: 'GCP_WORKLOAD_IDENTITY_POOL_ID',
  providerId: 'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID',
  serviceAccount: 'GCP_SERVICE_ACCOUNT_EMAIL',
};

let cachedToken = { value: '', expires: 0 };

export function config(propertyEnv = 'GA4_PROPERTY_ID') {
  const values = {};
  const missing = [];
  for (const [key, name] of Object.entries({ ...ENV, propertyId: propertyEnv })) {
    values[key] = String(process.env[name] || '').trim();
    if (!values[key]) missing.push(name);
  }
  return { values, missing };
}

export async function googleJson(response, step) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || data?.error_description || data?.error || response.statusText;
    throw new Error(`${step}: ${detail}`);
  }
  return data;
}

export async function googleAccessToken(req, cfg) {
  if (cachedToken.value && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const oidc = String(req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN || '');
  if (!oidc) throw new Error('Vercel OIDC token missing. Turn on OIDC Federation for this Vercel project.');

  const sts = await googleJson(await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: `//iam.googleapis.com/projects/${cfg.projectNumber}/locations/global/workloadIdentityPools/${cfg.poolId}/providers/${cfg.providerId}`,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      subjectToken: oidc,
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
    }),
  }), 'Google sign-in (token exchange)');

  const impersonated = await googleJson(await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(cfg.serviceAccount)}:generateAccessToken`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sts.access_token}` },
      body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/analytics.readonly'] }),
    },
  ), 'Google sign-in (service account)');

  cachedToken = { value: impersonated.accessToken, expires: new Date(impersonated.expireTime).getTime() || Date.now() + 30 * 60_000 };
  return cachedToken.value;
}

export const eventFilter = names => ({ filter: { fieldName: 'eventName', inListFilter: { values: names } } });

export function rows(report) {
  return (report?.rows || []).map(row => ({
    dims: (row.dimensionValues || []).map(item => item.value),
    values: (row.metricValues || []).map(item => Number(item.value) || 0),
  }));
}

// Rows from a two-range request: the last dimension is the range name.
export function byRange(report) {
  const out = { current: [], previous: [] };
  for (const row of rows(report)) {
    const range = row.dims[row.dims.length - 1];
    (out[range] || (out[range] = [])).push({ dims: row.dims.slice(0, -1), values: row.values });
  }
  return out;
}

export function isoDate(value) {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

export async function batch(propertyId, token, requests) {
  const data = await googleJson(await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:batchRunReports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ requests }),
  }), 'Google Analytics report');
  return data.reports || [];
}

