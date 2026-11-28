import { requireSiteAccess } from '../_lib/websiteAdmin.js';
import { batch, byRange, config, eventFilter, googleAccessToken, isoDate, rows } from '../_lib/ga4.js';

// Shopify Studio Analytics: Google Analytics (GA4) for justindematteis.com, only the /shopify-studio pages.
// Same keyless Google sign-in as Sunwings (api/_lib/ga4.js); the property is STUDIO_GA4_PROPERTY_ID
// (the JustinDeMatteis.com GA4 property, measurement id G-66VTKST2J0).

// Events the Studio pages send (studioShared.js / serviceRequests.js).
const LEAD_EVENTS = ['free_review_submit', 'quote_submit', 'generate_lead'];
const INTEREST_EVENTS = ['cta_free_review', 'select_package', 'pricing_click', 'demo_store_open', 'design_click', 'contact_click', 'social_click'];

const begins = value => ({ filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value } } });
const STUDIO_PAGES = begins('/shopify-studio');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireSiteAccess(req, res, 'shopifystudio');
  if (!user) return;

  const { values: cfg, missing } = config('STUDIO_GA4_PROPERTY_ID');
  if (missing.length) return res.status(200).json({ connected: false, reason: 'Google Analytics isn’t connected yet.', missing });

  const days = [7, 30, 90, 365].includes(Number(req.query?.days)) ? Number(req.query.days) : 30;
  const current = { startDate: `${days - 1}daysAgo`, endDate: 'today', name: 'current' };
  const previous = { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo`, name: 'previous' };
  const both = [current, previous];
  const now = [current];
  const studio = (request, extra) => {
    const filters = [STUDIO_PAGES, request.dimensionFilter, extra].filter(Boolean);
    return { ...request, dimensionFilter: filters.length > 1 ? { andGroup: { expressions: filters } } : filters[0] };
  };
  const top = (dimension, metric, limit = 10, extra = {}) => ({
    dateRanges: now, dimensions: [{ name: dimension }], metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }], limit, ...extra,
  });

  try {
    const token = await googleAccessToken(req, cfg);
    const [[totals, events, trend, leadTrend, channels], [pages, tips, sources, devices, cities]] = await Promise.all([
      batch(cfg.propertyId, token, [
        studio({ dateRanges: both, metrics: ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration'].map(name => ({ name })) }),
        studio({ dateRanges: both, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter([...LEAD_EVENTS, ...INTEREST_EVENTS]) }),
        studio({ dateRanges: now, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 }),
        studio({ dateRanges: now, dimensions: [{ name: 'date' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter(['free_review_submit', 'quote_submit']), limit: 400 }),
        studio(top('sessionDefaultChannelGroup', 'sessions', 8)),
      ]),
      batch(cfg.propertyId, token, [
        studio({ ...top('pagePath', 'screenPageViews', 12), metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }] }),
        studio({ ...top('pagePath', 'screenPageViews', 10), metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }] }, begins('/shopify-studio/tips/')),
        studio(top('sessionSourceMedium', 'sessions', 8)),
        studio(top('deviceCategory', 'activeUsers', 5)),
        studio(top('city', 'activeUsers', 8)),
      ]),
    ]);

    const totalRows = byRange(totals);
    const metricNames = ['visitors', 'newVisitors', 'sessions', 'pageViews', 'engagementRate', 'avgSessionSeconds'];
    const pick = list => Object.fromEntries(metricNames.map((name, index) => [name, list[0]?.values[index] || 0]));
    const eventRows = byRange(events);
    const eventsFor = list => Object.fromEntries(list.map(row => [row.dims[0], row.values[0]]));
    const withEvents = (base, ev) => ({ ...base, freeReviews: ev.free_review_submit || 0, quotes: ev.quote_submit || 0, events: ev });
    const leadsByDay = Object.fromEntries(rows(leadTrend).map(row => [row.dims[0], row.values[0]]));

    return res.status(200).json({
      connected: true,
      days,
      current: withEvents(pick(totalRows.current), eventsFor(eventRows.current || [])),
      previous: withEvents(pick(totalRows.previous), eventsFor(eventRows.previous || [])),
      daily: rows(trend).map(row => ({ date: isoDate(row.dims[0]), visitors: row.values[0], pageViews: row.values[1], leads: leadsByDay[row.dims[0]] || 0 })),
      channels: rows(channels).map(row => ({ name: row.dims[0], sessions: row.values[0] })),
      sources: rows(sources).map(row => ({ name: row.dims[0], sessions: row.values[0] })),
      topPages: rows(pages).map(row => ({ path: row.dims[0], views: row.values[0], visitors: row.values[1] })),
      topTips: rows(tips).map(row => ({ path: row.dims[0], views: row.values[0], visitors: row.values[1] })),
      devices: rows(devices).map(row => ({ name: row.dims[0], visitors: row.values[0] })),
      cities: rows(cities).map(row => ({ name: row.dims[0], visitors: row.values[0] })),
    });
  } catch (error) {
    console.error('[shopifystudio] google analytics failed', error);
    return res.status(200).json({ connected: false, reason: error.message || 'Unable to reach Google Analytics.' });
  }
}
