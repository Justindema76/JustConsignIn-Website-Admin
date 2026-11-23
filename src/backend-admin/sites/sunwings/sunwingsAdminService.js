import { adminFetch, parseJsonResponse } from '../../services/apiClient';

export async function loadSunwingsQuotes(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/quote-requests', {}, accessToken),
    'Unable to load Sunwings quote requests.',
  );
  return Array.isArray(payload.requests) ? payload.requests : [];
}

export async function updateSunwingsQuote(accessToken, request) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/quote-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }, accessToken),
    'Unable to update Sunwings quote request.',
  );
  return payload.request || null;
}

// Email a follow-up to the customer (Job Calendar). Returns the updated quote request.
export async function sendSunwingsFollowUp(accessToken, { id, subject, message }) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/quote-follow-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, subject, message }),
    }, accessToken),
    'Unable to send the follow-up email.',
  );
  return payload.request || null;
}

export async function deleteSunwingsQuote(accessToken, id) {
  await parseJsonResponse(
    await adminFetch(`/api/admin/sunwings/quote-requests?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }, accessToken),
    'Unable to delete Sunwings quote request.',
  );
}

export async function loadSunwingsSettings(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/site-settings', {}, accessToken),
    'Unable to load Sunwings settings.',
  );
  return payload.settings || {};
}

export async function saveSunwingsSettings(accessToken, settings) {
  await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    }, accessToken),
    'Unable to save Sunwings settings.',
  );
  return settings;
}

export async function loadSunwingsIntegrations(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/integrations', {}, accessToken),
    'Unable to load Sunwings integrations.',
  );
  return Array.isArray(payload.integrations) ? payload.integrations : [];
}

export async function saveSunwingsIntegration(accessToken, input) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }, accessToken),
    'Unable to save integration.',
  );
  return payload;
}

export async function loadSunwingsFacebookPosts(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/facebook-posts', {}, accessToken),
    'Unable to load Facebook posts.',
  );
  return { enabled: Boolean(payload.enabled), posts: Array.isArray(payload.posts) ? payload.posts : [] };
}

export async function syncSunwingsFacebookPosts(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/facebook-posts', { method: 'POST' }, accessToken),
    'Unable to sync Facebook posts.',
  );
  return { count: payload.count || 0, posts: Array.isArray(payload.posts) ? payload.posts : [] };
}

export async function loadSunwingsGoogleReviews(accessToken) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/sunwings/google-reviews', {}, accessToken),
    'Unable to load Google reviews.',
  );
  return payload.reviews || null;
}

export async function syncSunwingsGoogleReviews(accessToken) {
  return parseJsonResponse(
    await adminFetch('/api/admin/sunwings/google-reviews', { method: 'POST' }, accessToken),
    'Unable to sync Google reviews.',
  );
}

export async function loadCollaborators(accessToken, siteKey) {
  const payload = await parseJsonResponse(
    await adminFetch(`/api/admin/collaborators?site=${encodeURIComponent(siteKey)}`, {}, accessToken),
    'Unable to load team members.',
  );
  return Array.isArray(payload.collaborators) ? payload.collaborators : [];
}

export async function addCollaborator(accessToken, { siteKey, email, role, label }) {
  const payload = await parseJsonResponse(
    await adminFetch('/api/admin/collaborators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteKey, email, role, label }),
    }, accessToken),
    'Unable to add team member.',
  );
  return payload.collaborator || null;
}

export async function removeCollaborator(accessToken, id) {
  await parseJsonResponse(
    await adminFetch(`/api/admin/collaborators?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, accessToken),
    'Unable to remove team member.',
  );
}

// ---- Marius (partner) jobs, partners, investments ----

export async function loadPartnerJobs(accessToken) {
  const payload = await parseJsonResponse(await adminFetch('/api/admin/sunwings/partner-jobs', {}, accessToken), 'Unable to load jobs.');
  return Array.isArray(payload.jobs) ? payload.jobs : [];
}

export async function savePartnerJob(accessToken, job) {
  await parseJsonResponse(await adminFetch('/api/admin/sunwings/partner-jobs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job),
  }, accessToken), 'Unable to save the job.');
}

export async function loadPartners(accessToken) {
  const payload = await parseJsonResponse(await adminFetch('/api/admin/sunwings/partners', {}, accessToken), 'Unable to load partners.');
  return Array.isArray(payload.partners) ? payload.partners : [];
}

export async function addPartner(accessToken, { email, label }) {
  const payload = await parseJsonResponse(await adminFetch('/api/admin/sunwings/partners', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, label }),
  }, accessToken), 'Unable to add partner.');
  return payload.partner;
}

export async function removePartner(accessToken, id) {
  await parseJsonResponse(await adminFetch(`/api/admin/sunwings/partners?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, accessToken), 'Unable to remove partner.');
}

export async function loadInvestments(accessToken) {
  const payload = await parseJsonResponse(await adminFetch('/api/admin/sunwings/investments', {}, accessToken), 'Unable to load investments.');
  return Array.isArray(payload.investments) ? payload.investments : [];
}

export async function addInvestment(accessToken, investment) {
  const payload = await parseJsonResponse(await adminFetch('/api/admin/sunwings/investments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(investment),
  }, accessToken), 'Unable to save investment.');
  return payload.investment;
}

export async function deleteInvestment(accessToken, id) {
  await parseJsonResponse(await adminFetch(`/api/admin/sunwings/investments?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, accessToken), 'Unable to delete investment.');
}

// Price calculator settings (private; see api/admin/sunwings/pricing.js).
export async function loadPricingSettings(accessToken) {
  const payload = await parseJsonResponse(await adminFetch('/api/admin/sunwings/pricing', {}, accessToken), 'Unable to load price settings.');
  return { settings: payload.settings || null, updatedAt: payload.updated_at || null };
}

export async function savePricingSettings(accessToken, settings) {
  return parseJsonResponse(await adminFetch('/api/admin/sunwings/pricing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  }, accessToken), 'Unable to save price settings.');
}

// The back-and-forth on a job: emails, customer replies, notes and quotes.
export async function loadQuoteMessages(accessToken, id) {
  return parseJsonResponse(
    await adminFetch(`/api/admin/sunwings/quote-messages?id=${encodeURIComponent(id)}`, { method: 'GET' }, accessToken),
    'Unable to load the conversation.',
  );
}

// action: 'note' | 'email' | 'quote'. Returns { messages, request }.
export async function postQuoteMessage(accessToken, body) {
  return parseJsonResponse(
    await adminFetch('/api/admin/sunwings/quote-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, accessToken),
    'Nothing was sent.',
  );
}

// Checks the Sunwings mailbox for new customer replies (Home uses this).
export async function checkQuoteReplies(accessToken) {
  return parseJsonResponse(await adminFetch('/api/admin/sunwings/quote-messages', { method: 'GET' }, accessToken), 'Unable to check for replies.');
}
