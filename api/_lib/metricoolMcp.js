import crypto from 'node:crypto';
import { supabaseSecret } from './supabase.js';

export const METRICOOL_MCP_URL = 'https://ai.metricool.com/mcp';
const MCP_PROTOCOL_VERSION = '2026-07-28';

function key() {
  return crypto.createHash('sha256').update(`justconsignin:metricool:${supabaseSecret()}`).digest();
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value || ''), 'utf8'), cipher.final()]);
  return {
    secret_ciphertext: encrypted.toString('base64'),
    secret_iv: iv.toString('base64'),
    secret_tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(row = {}) {
  if (!row.secret_ciphertext || !row.secret_iv || !row.secret_tag) return '';
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(row.secret_iv, 'base64'));
  decipher.setAuthTag(Buffer.from(row.secret_tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(row.secret_ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function randomUrlSafe(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function challenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function parseWwwAuthenticate(header = '') {
  const match = String(header).match(/resource_metadata="([^"]+)"/i);
  return match?.[1] || '';
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error_description || data?.error || data?.message || `Request failed (${response.status})`);
  return { response, data };
}

function authorizationMetadataUrl(issuer) {
  const url = new URL(issuer);
  const path = url.pathname.replace(/\/$/, '');
  if (!path) return `${url.origin}/.well-known/oauth-authorization-server`;
  return `${url.origin}/.well-known/oauth-authorization-server${path}`;
}

export async function discoverMetricoolOAuth() {
  let resourceMetadataUrl = '';
  try {
    const probe = await fetch(METRICOOL_MCP_URL, { headers: { Accept: 'application/json, text/event-stream' }, redirect: 'manual' });
    resourceMetadataUrl = parseWwwAuthenticate(probe.headers.get('www-authenticate'));
  } catch {}

  const candidates = [
    resourceMetadataUrl,
    'https://ai.metricool.com/.well-known/oauth-protected-resource/mcp',
    'https://ai.metricool.com/.well-known/oauth-protected-resource',
  ].filter(Boolean);

  let resourceMetadata;
  let lastError;
  for (const url of [...new Set(candidates)]) {
    try {
      const { data } = await jsonFetch(url, { headers: { Accept: 'application/json' } });
      if (data?.authorization_servers?.length) { resourceMetadata = data; break; }
    } catch (error) { lastError = error; }
  }
  if (!resourceMetadata) throw lastError || new Error('Metricool OAuth discovery failed');

  const issuer = resourceMetadata.authorization_servers[0];
  const metadataCandidates = [
    authorizationMetadataUrl(issuer),
    `${String(issuer).replace(/\/$/, '')}/.well-known/oauth-authorization-server`,
    `${new URL(issuer).origin}/.well-known/oauth-authorization-server`,
  ];
  let authMetadata;
  for (const url of [...new Set(metadataCandidates)]) {
    try {
      const { data } = await jsonFetch(url, { headers: { Accept: 'application/json' } });
      if (data?.authorization_endpoint && data?.token_endpoint) { authMetadata = data; break; }
    } catch (error) { lastError = error; }
  }
  if (!authMetadata) throw lastError || new Error('Metricool authorization server metadata unavailable');
  return { resourceMetadata, authMetadata };
}

export async function beginMetricoolOAuth({ callbackUrl }) {
  const { authMetadata } = await discoverMetricoolOAuth();
  const verifier = randomUrlSafe(48);
  const state = randomUrlSafe(32);

  let client = null;
  if (authMetadata.registration_endpoint) {
    const { data } = await jsonFetch(authMetadata.registration_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_name: 'JustConsignIn Website Admin',
        redirect_uris: [callbackUrl],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      }),
    });
    client = data;
  }
  if (!client?.client_id) throw new Error('Metricool did not provide a dynamic OAuth client.');

  const scopes = Array.isArray(authMetadata.scopes_supported)
    ? ['mcp:read', 'mcp:write'].filter(scope => authMetadata.scopes_supported.includes(scope))
    : ['mcp:read', 'mcp:write'];

  const authUrl = new URL(authMetadata.authorization_endpoint);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', client.client_id);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('code_challenge', challenge(verifier));
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('resource', METRICOOL_MCP_URL);
  if (scopes.length) authUrl.searchParams.set('scope', scopes.join(' '));

  return {
    authUrl: authUrl.toString(),
    transaction: {
      state,
      verifier,
      callbackUrl,
      clientId: client.client_id,
      clientSecret: client.client_secret || '',
      tokenEndpoint: authMetadata.token_endpoint,
      resource: METRICOOL_MCP_URL,
      createdAt: Date.now(),
    },
  };
}

export async function finishMetricoolOAuth(transaction, code) {
  if (!transaction?.clientId || !transaction?.verifier || !transaction?.tokenEndpoint) throw new Error('Metricool OAuth transaction is incomplete');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: String(code || ''),
    redirect_uri: transaction.callbackUrl,
    client_id: transaction.clientId,
    code_verifier: transaction.verifier,
    resource: transaction.resource || METRICOOL_MCP_URL,
  });
  if (transaction.clientSecret) body.set('client_secret', transaction.clientSecret);
  const { data } = await jsonFetch(transaction.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!data.access_token) throw new Error('Metricool did not return an access token');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    tokenType: data.token_type || 'Bearer',
    expiresAt: data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : 0,
    clientId: transaction.clientId,
    clientSecret: transaction.clientSecret || '',
    tokenEndpoint: transaction.tokenEndpoint,
    resource: transaction.resource || METRICOOL_MCP_URL,
    scope: data.scope || '',
  };
}

export async function refreshMetricoolOAuth(credentials) {
  if (!credentials?.refreshToken || !credentials?.tokenEndpoint || !credentials?.clientId) return credentials;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
    client_id: credentials.clientId,
    resource: credentials.resource || METRICOOL_MCP_URL,
  });
  if (credentials.clientSecret) body.set('client_secret', credentials.clientSecret);
  const { data } = await jsonFetch(credentials.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  return {
    ...credentials,
    accessToken: data.access_token || credentials.accessToken,
    refreshToken: data.refresh_token || credentials.refreshToken,
    expiresAt: data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : credentials.expiresAt,
    scope: data.scope || credentials.scope,
  };
}

function parseMcpBody(text) {
  const raw = String(text || '').trim();
  if (!raw) return {};
  if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
  const events = raw.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(Boolean);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    try { return JSON.parse(events[i]); } catch {}
  }
  throw new Error('Metricool MCP returned an unreadable response');
}

async function mcpPost(accessToken, payload, sessionId = '') {
  const response = await fetch(METRICOOL_MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(sessionId ? { 'MCP-Session-Id': sessionId } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try { const parsed = JSON.parse(text); detail = parsed?.error?.message || parsed?.error || text; } catch {}
    const error = new Error(detail || `Metricool MCP request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return { data: parseMcpBody(text), sessionId: response.headers.get('mcp-session-id') || sessionId };
}

async function mcpSession(accessToken) {
  const response = await mcpPost(accessToken, {
    jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'JustConsignIn Website Admin', version: '1.0.0' },
    },
  });
  const sessionId = response.sessionId;
  await mcpPost(accessToken, { jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, sessionId);
  return sessionId;
}

export async function getMetricoolTools(accessToken) {
  const sessionId = await mcpSession(accessToken);
  const response = await mcpPost(accessToken, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, sessionId);
  return { tools: response.data?.result?.tools || [], sessionId };
}

export async function callMetricoolTool(accessToken, toolName, args = {}) {
  const sessionId = await mcpSession(accessToken);
  const response = await mcpPost(accessToken, {
    jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: toolName, arguments: args },
  }, sessionId);
  if (response.data?.error) throw new Error(response.data.error.message || 'Metricool tool call failed');
  return response.data?.result || {};
}

export function metricoolToolText(result = {}) {
  const pieces = Array.isArray(result.content) ? result.content : [];
  return pieces.map(item => item?.text || '').filter(Boolean).join('\n').trim();
}
