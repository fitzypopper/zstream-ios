/**
 * Border radius tokens for consistent rounded corners.
 * Based on iOS Human Interface Guidelines.
 */
export const radii = {
  /** Small radius - subtle rounding for buttons and chips */
  sm: 8,
  /** Medium radius - cards and containers (iOS standard) */
  md: 12,
  /** Large radius - prominent elements and modals */
  lg: 16,
  /** Extra large radius - full-width cards */
  xl: 20,
  /** Pill shape - for buttons and badges */
  pill: 9999,
} as const;

export type RadiusToken = keyof typeof radii;
export type RadiusValue = (typeof radii)[RadiusToken];
