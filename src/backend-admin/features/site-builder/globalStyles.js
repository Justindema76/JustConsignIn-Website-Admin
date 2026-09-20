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
    '--site-content-width': `${styles.contentWidth}px`,
    '--site-section-space': `${styles.sectionSpacing}px`,
    '--site-card-radius': `${styles.cardRadius}px`,
    '--site-button-radius': `${styles.buttonRadius}px`,
    '--site-button-height': `${styles.buttonHeight}px`,
  };
}
