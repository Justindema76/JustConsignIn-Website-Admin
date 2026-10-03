import justin from './justindematteis/config';
import justConsignIn from './justconsignin/config';
import sunwings from './sunwings/config';

export const SITE_CONFIGS = Object.freeze({
  [justin.key]: justin,
  [justConsignIn.key]: justConsignIn,
  [sunwings.key]: sunwings,
});

export function getSiteConfig(siteKey) {
  return SITE_CONFIGS[String(siteKey || '').trim().toLowerCase()] || justConsignIn;
}

export function getAllowedPaths(siteKey) {
  const config = getSiteConfig(siteKey);
  return new Set(config.navGroups.flatMap(group => group.items.map(item => item.to)));
}
