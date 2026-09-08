const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

export const supabaseUrl = () => process.env.SUPABASE_URL || 'https://nowsajdmbpxvlvrhopjg.supabase.co';
export const supabaseSecret = () => required('SUPABASE_SECRET_KEY');
export const supabaseAnon = () => process.env.SUPABASE_ANON_KEY || 'sb_publishable_AZbVouJ6gN00dQGdZwPjog_GTQR0J-w';

export function customerAppEnabled() {
  return process.env.CUSTOMER_APP_ENABLED === 'true';
}

export function rejectDisabledCustomerApp(res) {
  if (customerAppEnabled()) return false;
  res.setHeader('Cache-Control', 'no-store');
  res.status(404).json({ error: 'Not found' });
  return true;
}

export async function supabaseAdmin(path, options = {}) {
  const secret = supabaseSecret();
  return fetch(`${supabaseUrl()}${path}`, {
    ...options,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export async function supabaseRest(path, options = {}) {
  return supabaseAdmin(`/rest/v1/${path}`, options);
}

export async function supabaseUserRest(token, path, options = {}) {
  return fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnon(),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export async function supabaseUserStorage(token, path, options = {}) {
  return fetch(`${supabaseUrl()}/storage/v1/${path}`, {
    ...options,
    headers: { apikey: supabaseAnon(), Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
}

export async function getUserFromToken(token) {
  if (!token) return null;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: supabaseAnon(), Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json();
}

export async function getProfile(userId) {
  const response = await supabaseRest(`profiles?user_id=eq.${encodeURIComponent(userId)}&select=*`, { method: 'GET' });
  if (!response.ok) throw new Error('Unable to load profile');
  const rows = await response.json();
  return rows[0] || null;
}
