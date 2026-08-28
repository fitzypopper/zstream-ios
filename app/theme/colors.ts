/**
 * Color tokens for the ZStream app dark theme.
 * Apple-inspired dark palette with native iOS feel.
 */
export const colors = {
  /** Main app background color - OLED black */
  BACKGROUND: '#000000',
  /** Surface color for elevated elements */
  SURFACE: '#1C1C1E',
  /** Card background color */
  CARD: '#2C2C2E',
  /** Grouped background (iOS settings style) */
  GROUPED_BACKGROUND: '#1C1C1E',
  /** Muted/disabled state color */
  MUTED: '#8E8E93',
  /** Primary brand color - iOS blue */
  PRIMARY: '#007AFF',
  /** Accent color - iOS orange */
  ACCENT: '#FF9500',
  /** Primary text color - high contrast for readability */
  TEXT_PRIMARY: '#FFFFFF',
  /** Secondary text color - lower emphasis content */
  TEXT_SECONDARY: '#8E8E93',
  /** Tertiary text color */
  TEXT_TERTIARY: '#636366',
  /** Success state color - iOS green */
  SUCCESS: '#34C759',
  /** Warning state color - iOS yellow */
  WARNING: '#FFCC00',
  /** Error/danger state color - iOS red */
  ERROR: '#FF3B30',
  /** Separator color */
  SEPARATOR: '#38383A',
  /** Fill color */
  FILL: '#787880',
  /** System background for secondary grouped */
  SECONDARY_GROUPED: '#2C2C2E',
} as const;

export type ColorToken = keyof typeof colors;
export type ColorValue = (typeof colors)[ColorToken];
