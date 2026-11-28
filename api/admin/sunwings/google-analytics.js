import { requireSiteAccess } from '../../_lib/websiteAdmin.js';

// Sunwings Google Analytics (GA4) report for the admin Analytics page (helpers in api/_lib/ga4.js).

import { batch, byRange, config, eventFilter, googleAccessToken, isoDate, rows } from '../../_lib/ga4.js';

const LEAD_EVENTS = ['phone_click', 'generate_lead', 'email_click'];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireSiteAccess(req, res, 'sunwings');
  if (!user) return;

  const { values: cfg, missing } = config();
  if (missing.length) return res.status(200).json({ connected: false, reason: 'Google Analytics isn’t connected yet.', missing });

  const days = [7, 30, 90, 365].includes(Number(req.query?.days)) ? Number(req.query.days) : 30;
  const current = { startDate: `${days - 1}daysAgo`, endDate: 'today', name: 'current' };
  const previous = { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo`, name: 'previous' };
  const both = [current, previous];
  // ?area=hn: only Hamilton & Niagara pages (/hamilton-niagara…); ?area=main: every other page.
  const area = ['hn', 'main'].includes(req.query?.area) ? req.query.area : 'all';
  const hnPages = { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/hamilton-niagara' } } };
  const areaFilter = area === 'hn' ? hnPages : area === 'main' ? { notExpression: hnPages } : null;
  const inArea = request => {
    if (!areaFilter) return request;
    const own = request.dimensionFilter;
    return { ...request, dimensionFilter: own ? { andGroup: { expressions: [own, areaFilter] } } : areaFilter };
  };
  const now = [current];
  const top = (dimension, metric, limit = 10, extra = {}) => ({
    dateRanges: now, dimensions: [{ name: dimension }], metrics: [{ name: metric }],
    orderBys: [{ metric: { metricName: metric }, desc: true }], limit, ...extra,
  });

  try {
    const token = await googleAccessToken(req, cfg);
    const [[totals, events, trend, phoneTrend, channels], [pages, sources, phonePages, devices, cities]] = await Promise.all([
      batch(cfg.propertyId, token, [
        { dateRanges: both, metrics: ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration'].map(name => ({ name })) },
        { dateRanges: both, dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter(LEAD_EVENTS) },
        { dateRanges: now, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 400 },
        { dateRanges: now, dimensions: [{ name: 'date' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventFilter(['phone_click']), limit: 400 },
        top('sessionDefaultChannelGroup', 'sessions', 8),
      ].map(inArea)),
      batch(cfg.propertyId, token, [
        { ...top('pagePath', 'screenPageViews', 10), metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }] },
        top('sessionSourceMedium', 'sessions', 8),
        top('pagePath', 'eventCount', 10, { dimensionFilter: eventFilter(['phone_click']) }),
        top('deviceCategory', 'activeUsers', 5),
        top('city', 'activeUsers', 8),
      ].map(inArea)),
    ]);

    const totalRows = byRange(totals);
    const metricNames = ['visitors', 'newVisitors', 'sessions', 'pageViews', 'engagementRate', 'avgSessionSeconds'];
    const pick = list => Object.fromEntries(metricNames.map((name, index) => [name, list[0]?.values[index] || 0]));
    const eventRows = byRange(events);
    const eventsFor = list => Object.fromEntries(list.map(row => [row.dims[0], row.values[0]]));
    const nowEvents = eventsFor(eventRows.current || []);
    const prevEvents = eventsFor(eventRows.previous || []);
    const phoneByDay = Object.fromEntries(rows(phoneTrend).map(row => [row.dims[0], row.values[0]]));

    return res.status(200).json({
      connected: true,
      days,
      area,
      current: { ...pick(totalRows.current), phoneClicks: nowEvents.phone_click || 0, formLeads: nowEvents.generate_lead || 0, emailClicks: nowEvents.email_click || 0 },
      previous: { ...pick(totalRows.previous), phoneClicks: prevEvents.phone_click || 0, formLeads: prevEvents.generate_lead || 0, emailClicks: prevEvents.email_click || 0 },
      daily: rows(trend).map(row => ({ date: isoDate(row.dims[0]), visitors: row.values[0], pageViews: row.values[1], phoneClicks: phoneByDay[row.dims[0]] || 0 })),
      channels: rows(channels).map(row => ({ name: row.dims[0], sessions: row.values[0] })),
      sources: rows(sources).map(row => ({ name: row.dims[0], sessions: row.values[0] })),
      topPages: rows(pages).map(row => ({ path: row.dims[0], views: row.values[0], visitors: row.values[1] })),
      phoneByPage: rows(phonePages).map(row => ({ path: row.dims[0], clicks: row.values[0] })),
      devices: rows(devices).map(row => ({ name: row.dims[0], visitors: row.values[0] })),
      cities: rows(cities).map(row => ({ name: row.dims[0], visitors: row.values[0] })),
    });
  } catch (error) {
    console.error('[sunwings] google analytics failed', error);
    return res.status(200).json({ connected: false, reason: error.message || 'Unable to reach Google Analytics.' });
  }
}
