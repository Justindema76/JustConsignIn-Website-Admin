import { supabaseUserRest } from '../../_lib/supabase.js';
import { requireSiteAccess } from '../../_lib/websiteAdmin.js';

// Pulls the Google Business rating and latest reviews (Places API) and saves a copy in
// sunwings_site_settings ("google_reviews"), which the public website already reads.
const SITE_KEY = 'sunwings';

async function parseSupabase(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || fallback);
  return data;
}

export async function fetchGoogleReviews(placeId, apiKey) {
  // languageCode: without it Google can leave the reviews out of the reply.
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en&regionCode=CA`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews,googleMapsUri,pureServiceAreaBusiness' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Google connection failed.');
  return {
    name: data.displayName?.text || '',
    rating: Number(data.rating) || null,
    count: Number(data.userRatingCount) || 0,
    url: data.googleMapsUri || '',
    reviews: (data.reviews || [])
      .map(review => ({
        name: review.authorAttribution?.displayName || 'Google customer',
        photo: review.authorAttribution?.photoUri || '',
        stars: Number(review.rating) || 5,
        text: review.text?.text || review.originalText?.text || '',
        when: review.relativePublishTimeDescription || '',
        published_at: review.publishTime || '',
      }))
      .filter(review => review.text),
    // Why there are no reviews, if Google sent none (shown in the admin).
    note: data.reviews?.length ? '' : (data.pureServiceAreaBusiness
      ? 'Google sent the rating but no review text. It does this for some service-area businesses (no public address).'
      : 'Google sent the rating but no review text this time.'),
    synced_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  const owner = await requireSiteAccess(req, res, SITE_KEY);
  if (!owner) return;

  try {
    if (req.method === 'GET') {
      const rows = await parseSupabase(
        await supabaseUserRest(owner.accessToken, `sunwings_site_settings?site_key=eq.${SITE_KEY}&key=eq.google_reviews&select=value`, { method: 'GET' }),
        'Unable to load saved Google reviews.',
      );
      let saved = null;
      try { saved = rows?.[0]?.value ? JSON.parse(rows[0].value) : null; } catch { saved = null; }
      return res.status(200).json({ reviews: saved });
    }

    const rows = await parseSupabase(
      await supabaseUserRest(owner.accessToken, `sunwings_integrations?site_key=eq.${SITE_KEY}&provider=eq.google_reviews&select=*`, { method: 'GET' }),
      'Unable to load the Google Reviews connection.',
    );
    const row = rows?.[0];
    if (!row?.config?.place_id) throw new Error('Add the Google Place ID above and save first.');
    if (!row?.secrets?.api_key) throw new Error('Add the Google Places API key above and save first.');

    // Turned off: clear the website copy so nothing shows.
    const snapshot = row.enabled ? await fetchGoogleReviews(row.config.place_id, row.secrets.api_key) : null;
    await parseSupabase(
      await supabaseUserRest(owner.accessToken, 'sunwings_site_settings?on_conflict=site_key,key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ site_key: SITE_KEY, key: 'google_reviews', value: snapshot ? JSON.stringify(snapshot) : '', updated_at: new Date().toISOString() }]),
      }),
      'Unable to save Google reviews.',
    );
    return res.status(200).json({ ok: true, reviews: snapshot, enabled: Boolean(row.enabled) });
  } catch (error) {
    console.error('[sunwings] google reviews failed', error);
    return res.status(500).json({ error: error.message || 'Google reviews request failed.' });
  }
}
