async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || 'Social automation request failed');
  return payload;
}

function headers(accessToken) {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

export async function loadSocialAutomation(accessToken) {
  return parseResponse(await fetch('/api/admin/social-automation', { headers: { Authorization: `Bearer ${accessToken}` } }));
}

export async function saveSocialCampaign(accessToken, campaign) {
  const payload = await parseResponse(await fetch('/api/admin/social-automation', {
    method: 'POST', headers: headers(accessToken), body: JSON.stringify({ action: 'save', campaign }),
  }));
  return payload.campaign;
}

export async function deleteSocialCampaign(accessToken, id) {
  return parseResponse(await fetch(`/api/admin/social-automation?id=${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
  }));
}

export async function startMetricoolConnection(accessToken) {
  return parseResponse(await fetch('/api/admin/social-automation', {
    method: 'POST', headers: headers(accessToken), body: JSON.stringify({ action: 'metricool-start' }),
  }));
}

export async function disconnectMetricool(accessToken) {
  return parseResponse(await fetch('/api/admin/social-automation', {
    method: 'POST', headers: headers(accessToken), body: JSON.stringify({ action: 'metricool-disconnect' }),
  }));
}

export async function testMetricoolConnection(accessToken) {
  return parseResponse(await fetch('/api/admin/social-automation', {
    method: 'POST', headers: headers(accessToken), body: JSON.stringify({ action: 'metricool-test' }),
  }));
}

export async function sendCampaignToMetricool(accessToken, id) {
  return parseResponse(await fetch('/api/admin/social-automation', {
    method: 'POST', headers: headers(accessToken), body: JSON.stringify({ action: 'send', id }),
  }));
}
