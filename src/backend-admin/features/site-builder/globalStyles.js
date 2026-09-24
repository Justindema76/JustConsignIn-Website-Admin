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

export function normalizeGlobalStyles(value = {}) {
  return {
    ...DEFAULT_GLOBAL_STYLES,
    ...(value || {}),
    h1Size: Number(value?.h1Size || DEFAULT_GLOBAL_STYLES.h1Size),
    h2Size: Number(value?.h2Size || DEFAULT_GLOBAL_STYLES.h2Size),
    h3Size: Number(value?.h3Size || DEFAULT_GLOBAL_STYLES.h3Size),
    h4Size: Number(value?.h4Size || DEFAULT_GLOBAL_STYLES.h4Size),
    contentWidth: Number(value?.contentWidth || DEFAULT_GLOBAL_STYLES.contentWidth),
    sectionSpacing: Number(value?.sectionSpacing || DEFAULT_GLOBAL_STYLES.sectionSpacing),
    cardRadius: Number(value?.cardRadius || DEFAULT_GLOBAL_STYLES.cardRadius),
    buttonRadius: Number(value?.buttonRadius || DEFAULT_GLOBAL_STYLES.buttonRadius),
    buttonHeight: Number(value?.buttonHeight || DEFAULT_GLOBAL_STYLES.buttonHeight),
  };
}

export function globalStyleVars(value = {}) {
  const styles = normalizeGlobalStyles(value);
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
