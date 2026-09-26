import { requireWebsiteOwner } from '../_lib/websiteAdmin.js';
import { supabaseUserRest } from '../_lib/supabase.js';

const SITE_KEY = 'justindematteis';

function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function parseSupabase(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || fallback);
  return payload;
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const requestId = clean(body.requestId, 80);
  const departmentId = clean(body.departmentId, 80);

  if (!validUuid(requestId) || !validUuid(departmentId)) {
    return res.status(400).json({ error: 'A valid request and department are required.' });
  }

  try {
    const departmentQuery = `agency_departments?id=eq.${encodeURIComponent(departmentId)}&site_key=eq.${encodeURIComponent(SITE_KEY)}&active=eq.true&select=id,name,active&limit=1`;
    const departments = await parseSupabase(
      await supabaseUserRest(owner.accessToken, departmentQuery, { method: 'GET' }),
      'Unable to load department.',
    );
    const department = Array.isArray(departments) ? departments[0] : null;
    if (!department) return res.status(404).json({ error: 'Department not found.' });

    const now = new Date().toISOString();
    const patch = {
      status: 'needs_quote',
      status_changed_at: now,
      assigned_department_id: department.id,
      assigned_department_name: department.name,
      assigned_department_email: '',
      assigned_at: now,
      quote_requested_at: now,
      last_activity: `Assigned to ${department.name}`,
      last_activity_at: now,
      next_action: 'Prepare quote',
      assignment_email_sent_at: null,
      assignment_email_error: null,
      updated_at: now,
    };

    const requestQuery = `service_requests?id=eq.${encodeURIComponent(requestId)}&site_key=eq.${encodeURIComponent(SITE_KEY)}&select=id,status,assigned_department_id,assigned_department_name,assigned_at,quote_requested_at,updated_at`;
    const rows = await parseSupabase(
      await supabaseUserRest(owner.accessToken, requestQuery, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      }),
      'Unable to assign department.',
    );

    if (!rows?.[0]) return res.status(404).json({ error: 'Service request not found.' });

    return res.status(200).json({
      ok: true,
      assigned: true,
      request: rows[0],
      department: { id: department.id, name: department.name },
    });
  } catch (error) {
    console.error('Service request department assignment failed', error);
    return res.status(500).json({ error: 'Unable to assign department.' });
  }
}
