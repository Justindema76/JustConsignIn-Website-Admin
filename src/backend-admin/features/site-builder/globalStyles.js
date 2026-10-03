export const DEFAULT_GLOBAL_STYLES = {
  primary: '#1f67b2',
  primaryDark: '#185892',
  text: '#202223',
  muted: '#5c6268',
  pageBackground: '#f7f8fa',
  surface: '#ffffff',
  lightSurface: '#eef5fc',
  border: '#dfe3e8',
  darkSurface: '#111b27',
  headingFont: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  bodyFont: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h1Size: 64,
  h2Size: 48,
  h3Size: 36,
  h4Size: 24,
  contentWidth: 1180,
  sectionSpacing: 76,
  cardRadius: 14,
  buttonRadius: 8,
  buttonHeight: 40,
};

export const SUNWINGS_GLOBAL_STYLES = {
  primary: '#F7931E',
  primaryDark: '#D97706',
  text: '#14213D',
  muted: '#5B6B82',
  pageBackground: '#F6F8FB',
  surface: '#FFFFFF',
  lightSurface: '#E8F1FB',
  border: '#E3E9F2',
  darkSurface: '#0B2545',
  headingFont: '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  bodyFont: '"Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h1Size: 64,
  h2Size: 42,
  h3Size: 30,
  h4Size: 20,
  contentWidth: 1200,
  sectionSpacing: 88,
  cardRadius: 18,
  buttonRadius: 12,
  buttonHeight: 48,
};

export function globalStylesForSite(siteKey = 'justconsignin') {
  return siteKey === 'sunwings' ? SUNWINGS_GLOBAL_STYLES : DEFAULT_GLOBAL_STYLES;
}

export function normalizeGlobalStyles(value = {}, siteKey = 'justconsignin') {
  const defaults = globalStylesForSite(siteKey);
  return {
    ...defaults,
    ...(value || {}),
    h1Size: Number(value?.h1Size || defaults.h1Size),
    h2Size: Number(value?.h2Size || defaults.h2Size),
    h3Size: Number(value?.h3Size || defaults.h3Size),
    h4Size: Number(value?.h4Size || defaults.h4Size),
    contentWidth: Number(value?.contentWidth || defaults.contentWidth),
    sectionSpacing: Number(value?.sectionSpacing || defaults.sectionSpacing),
    cardRadius: Number(value?.cardRadius || defaults.cardRadius),
    buttonRadius: Number(value?.buttonRadius || defaults.buttonRadius),
    buttonHeight: Number(value?.buttonHeight || defaults.buttonHeight),
  };
}

export function globalStyleVars(value = {}, siteKey = 'justconsignin') {
  const styles = normalizeGlobalStyles(value, siteKey);
  return {
    '--site-primary': styles.primary,
    '--site-primary-dark': styles.primaryDark,
    '--site-text': styles.text,
    '--site-muted': styles.muted,
    '--site-page-bg': styles.pageBackground,
    '--site-surface': styles.surface,
    '--site-light-surface': styles.lightSurface,
    '--site-border': styles.border,
    '--site-dark-surface': styles.darkSurface,
    '--site-heading-font': styles.headingFont,
    '--site-body-font': styles.bodyFont,
    '--site-h1-size': `${styles.h1Size}px`,
    '--site-h2-size': `${styles.h2Size}px`,
    '--site-h3-size': `${styles.h3Size}px`,
    '--site-h4-size': `${styles.h4Size}px`,
    '--site-content-width': `${styles.contentWidth}px`,
    '--site-section-space': `${styles.sectionSpacing}px`,
    '--site-card-radius': `${styles.cardRadius}px`,
    '--site-button-radius': `${styles.buttonRadius}px`,
    '--site-button-height': `${styles.buttonHeight}px`,
  };
}
