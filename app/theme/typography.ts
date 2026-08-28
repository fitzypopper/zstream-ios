/**
 * Typography scale for consistent text styling.
 * Based on iOS Human Interface Guidelines - SF Pro.
 */
export const typography = {
  /** Font sizes in pixels - iOS SF Pro scale */
  fontSize: {
    /** Large Title - 34pt */
    largeTitle: 34,
    /** Title 1 - 28pt */
    title1: 28,
    /** Title 2 - 22pt */
    title2: 22,
    /** Title 3 - 20pt */
    title3: 20,
    /** Headline - 17pt semibold */
    headline: 17,
    /** Body - 17pt */
    body: 17,
    /** Callout - 16pt */
    callout: 16,
    /** Subheadline - 15pt */
    subheadline: 15,
    /** Footnote - 13pt */
    footnote: 13,
    /** Caption 1 - 12pt */
    caption1: 12,
    /** Caption 2 - 11pt */
    caption2: 11,
    /** Small - 12pt (legacy) */
    small: 12,
    /** Heading 1 - legacy */
    h1: 34,
    /** Heading 2 - legacy */
    h2: 22,
  },
  /** Line heights for each font size */
  lineHeight: {
    largeTitle: 41,
    title1: 34,
    title2: 28,
    title3: 25,
    headline: 22,
    body: 22,
    callout: 21,
    subheadline: 20,
    footnote: 18,
    caption1: 16,
    caption2: 13,
    small: 16,
    h1: 41,
    h2: 28,
  },
  /** Font weights */
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export type FontSizeToken = keyof typeof typography.fontSize;
export type FontSizeValue = (typeof typography.fontSize)[FontSizeToken];
