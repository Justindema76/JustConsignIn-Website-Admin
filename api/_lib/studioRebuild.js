// Rebuilds justindematteis.com (Vercel deploy hook) so Shopify Tips get their own SEO page,
// sitemap entry and schema. The hook URL is the private env var STUDIO_SITE_REBUILD_HOOK.
export async function rebuildStudioSite(reason = '') {
  const hook = String(process.env.STUDIO_SITE_REBUILD_HOOK || '').trim();
  if (!hook) return { triggered: false, reason: 'STUDIO_SITE_REBUILD_HOOK not set' };
  try {
    const response = await fetch(hook, { method: 'POST' });
    console.log('[studio] site rebuild', reason, response.status);
    return { triggered: response.ok };
  } catch (error) {
    console.error('[studio] site rebuild failed', reason, error);
    return { triggered: false, reason: error.message };
  }
}
