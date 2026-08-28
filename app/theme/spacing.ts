/**
 * Spacing scale for consistent layout throughout the app.
 * Based on iOS Human Interface Guidelines.
 */
export const spacing = {
  /** Extra small spacing - 4px */
  xs: 4,
  /** Small spacing - 8px */
  sm: 8,
  /** Medium spacing - 16px (default) */
  md: 16,
  /** Large spacing - 20px (iOS standard section padding) */
  lg: 20,
  /** Extra large spacing - 32px */
  xl: 32,
  /** Section spacing - 40px */
  xxl: 40,
} as const;

export type SpacingToken = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingToken];
