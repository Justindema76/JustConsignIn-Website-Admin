import crypto from 'node:crypto';
import { supabaseSecret } from './supabase.js';

export const METRICOOL_MCP_URL = 'https://ai.metricool.com/mcp';
const DEFAULT_PROTOCOL = '2025-11-25';
const RESOURCE_METADATA = 'https://ai.metricool.com/.well-known/oauth-protected-resource';
const AUTH_METADATA = 'https://ai.metricool.com/.well-known/oauth-authorization-server';
const FALLBACK_AUTH = 'https://app.metricool.com/oauth/authorize';
const FALLBACK_TOKEN = 'https://app.metricool.com/oauth/token';
const FALLBACK_REGISTER = 'https://app.metricool.com/oauth/register';

const toolCache = new Map();

function encryptionKey() {
  return crypto.createHash('sha256').update(`justconsignin:metricool:${supabaseSecret()}`).digest();
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value || ''), 'utf8'), cipher.final()]);
  return {
    secret_ciphertext: encrypted.toString('base64'),
    secret_iv: iv.toString('base64'),
    secret_tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(row = {}) {
  if (!row.secret_ciphertext || !row.secret_iv || !row.secret_tag) return '';
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(row.secret_iv, 'base64'));
  decipher.setAuthTag(Buffer.from(row.secret_tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(row.secret_ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function randomUrlSafe(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function pkceChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error_description || data?.error || data?.message || `Request failed (${response.status})`);
  return data;
}

export async function discoverMetricoolOAuth() {
  let resource = {};
  let auth = {};
  try { resource = await jsonRequest(RESOURCE_METADATA, { headers: { Accept: 'application/json' } }); } catch {}
  try { auth = await jsonRequest(AUTH_METADATA, { headers: { Accept: 'application/json' } }); } catch {}
  return {
    resourceMetadata: resource,
    authMetadata: {
      ...auth,
      authorization_endpoint: auth.authorization_endpoint || FALLBACK_AUTH,
      token_endpoint: auth.token_endpoint || FALLBACK_TOKEN,
      registration_endpoint: auth.registration_endpoint || FALLBACK_REGISTER,
      scopes_supported: auth.scopes_supported || ['mcp:read', 'mcp:write'],
    },
  };
}

export async function beginMetricoolOAuth({ callbackUrl }) {
  const { authMetadata } = await discoverMetricoolOAuth();
  const verifier = randomUrlSafe(48);
  const state = randomUrlSafe(32);
  const client = await jsonRequest(authMetadata.registration_endpoint || FALLBACK_REGISTER, {
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
  if (!client?.client_id) throw new Error('Metricool did not provide an OAuth client ID.');

  const supported = Array.isArray(authMetadata.scopes_supported) ? authMetadata.scopes_supported : [];
  const scopes = ['mcp:read', 'mcp:write'].filter(scope => !supported.length || supported.includes(scope));
  const authUrl = new URL(authMetadata.authorization_endpoint || FALLBACK_AUTH);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', client.client_id);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('code_challenge', pkceChallenge(verifier));
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
      tokenEndpoint: authMetadata.token_endpoint || FALLBACK_TOKEN,
      resource: METRICOOL_MCP_URL,
      createdAt: Date.now(),
    },
  };
}

export async function finishMetricoolOAuth(transaction, code) {
  if (!transaction?.clientId || !transaction?.verifier) throw new Error('Metricool authorization transaction is incomplete.');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: String(code || ''),
    redirect_uri: transaction.callbackUrl,
    client_id: transaction.clientId,
    code_verifier: transaction.verifier,
    resource: transaction.resource || METRICOOL_MCP_URL,
  });
  if (transaction.clientSecret) body.set('client_secret', transaction.clientSecret);
  const data = await jsonRequest(transaction.tokenEndpoint || FALLBACK_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!data.access_token) throw new Error('Metricool did not return an access token.');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    tokenType: data.token_type || 'Bearer',
    expiresAt: data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : 0,
    clientId: transaction.clientId,
    clientSecret: transaction.clientSecret || '',
    tokenEndpoint: transaction.tokenEndpoint || FALLBACK_TOKEN,
    resource: transaction.resource || METRICOOL_MCP_URL,
    scope: data.scope || '',
  };
}

export async function refreshMetricoolOAuth(credentials) {
  if (!credentials?.refreshToken) return credentials;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
    client_id: credentials.clientId,
    resource: credentials.resource || METRICOOL_MCP_URL,
  });
  if (credentials.clientSecret) body.set('client_secret', credentials.clientSecret);
  const data = await jsonRequest(credentials.tokenEndpoint || FALLBACK_TOKEN, {
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

function parseMcp(text) {
  const raw = String(text || '').trim();
  if (!raw) return {};
  if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
  const dataLines = raw.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(Boolean);
  for (let i = dataLines.length - 1; i >= 0; i -= 1) {
    try { return JSON.parse(dataLines[i]); } catch {}
  }
  throw new Error('Metricool MCP returned an unreadable response.');
}

async function mcpRequest(accessToken, payload, { sessionId = '', protocol = DEFAULT_PROTOCOL } = {}) {
  const response = await fetch(METRICOOL_MCP_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': protocol,
      ...(sessionId ? { 'MCP-Session-Id': sessionId } : {}),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text;
    try { const parsed = JSON.parse(text); detail = parsed?.error?.message || parsed?.error || text; } catch {}
    throw new Error(detail || `Metricool MCP request failed (${response.status})`);
  }
  return {
    data: parseMcp(text),
    sessionId: response.headers.get('mcp-session-id') || sessionId,
    protocol,
  };
}

async function openSession(accessToken) {
  const init = await mcpRequest(accessToken, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: DEFAULT_PROTOCOL,
      capabilities: {},
      clientInfo: { name: 'JustConsignIn Website Admin', version: '1.0.0' },
    },
  });
  const protocol = init.data?.result?.protocolVersion || DEFAULT_PROTOCOL;
  const sessionId = init.sessionId;
  await mcpRequest(accessToken, {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {},
  }, { sessionId, protocol });
  return { sessionId, protocol };
}

export async function getMetricoolTools(accessToken) {
  const session = await openSession(accessToken);
  const response = await mcpRequest(accessToken, {
    jsonrpc: '2.0', id: 2, method: 'tools/list', params: {},
  }, session);
  const tools = response.data?.result?.tools || [];
  toolCache.clear();
  tools.forEach(tool => tool?.name && toolCache.set(tool.name, tool));
  return { tools, sessionId: session.sessionId, protocol: session.protocol };
}

function firstNetwork(info = {}) {
  return info.providers?.map(provider => provider?.network).filter(Boolean)?.[0] || '';
}

function adaptCreateScheduledArgs(toolName, args = {}) {
  const schema = toolCache.get(toolName)?.inputSchema?.properties || {};
  if (!schema.networks || !args.info) return args;
  const info = args.info || {};
  const network = firstNetwork(info);
  const publication = info.publicationDate || {};
  const flat = {
    blog_id: String(args.blog_id ?? args.blogId ?? ''),
    date: String(publication.dateTime || args.date || '').replace(/(?:Z|[+-]\d\d:\d\d)$/i, ''),
    timezone: publication.timezone || 'America/Toronto',
    networks: network ? [network] : [],
    text: info.text || '',
    media: Array.isArray(info.media) ? info.media : [],
    draft: Boolean(info.draft),
    content_type: info.instagramData?.type || info.facebookData?.type || 'POST',
    first_comment: info.firstCommentText || '',
    youtube_title: info.youtubeData?.title || '',
    youtube_made_for_kids: Boolean(info.youtubeData?.madeForKids),
    tiktok_title: info.tiktokData?.title || '',
  };
  return Object.fromEntries(Object.entries(flat).filter(([key]) => Object.prototype.hasOwnProperty.call(schema, key)));
}

export async function callMetricoolTool(accessToken, toolName, args = {}) {
  const session = await openSession(accessToken);
  if (!toolCache.size) {
    const list = await mcpRequest(accessToken, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, session);
    const tools = list.data?.result?.tools || [];
    tools.forEach(tool => tool?.name && toolCache.set(tool.name, tool));
  }
  const adapted = adaptCreateScheduledArgs(toolName, args);
  const response = await mcpRequest(accessToken, {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: toolName, arguments: adapted },
  }, session);
  if (response.data?.error) throw new Error(response.data.error.message || 'Metricool tool call failed.');
  const result = response.data?.result || {};
  if (result?.isError) {
    const detail = metricoolToolText(result) || 'Metricool tool call failed.';
    throw new Error(detail);
  }
  return result;
}

export function metricoolToolText(result = {}) {
  return (Array.isArray(result.content) ? result.content : []).map(item => item?.text || '').filter(Boolean).join('\n').trim();
}
