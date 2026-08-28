/**
 * ThemedText - A Text component that uses theme colors and typography.
 * Apple-native text styling following iOS HIG.
 */
import React, { type ReactNode } from 'react';
import { Text, StyleSheet, type TextStyle, type TextProps, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type TextVariant =
  | 'largeTitle' | 'title1' | 'title2' | 'title3'
  | 'headline' | 'body' | 'callout' | 'subheadline'
  | 'footnote' | 'caption1' | 'caption2'
  | 'small' | 'h1' | 'h2';

type TextColor = 'primary' | 'secondary' | 'muted' | 'accent' | 'error' | 'success';

interface ThemedTextProps extends TextProps {
  children: ReactNode;
  variant?: TextVariant;
  color?: TextColor;
  style?: TextStyle;
}

const ThemedText: React.FC<ThemedTextProps> = ({
  children,
  variant = 'body',
  color = 'primary',
  style,
  ...props
}) => {
  const { colors, typography } = useTheme();

  const colorMap: Record<TextColor, string> = {
    primary: colors.TEXT_PRIMARY,
    secondary: colors.TEXT_SECONDARY,
    muted: colors.MUTED,
    accent: colors.ACCENT,
    error: colors.ERROR,
    success: colors.SUCCESS,
  };

  const variantStyles: Record<TextVariant, TextStyle> = {
    largeTitle: {
      fontSize: typography.fontSize.largeTitle,
      lineHeight: typography.lineHeight.largeTitle,
      fontWeight: '300',
    },
    title1: {
      fontSize: typography.fontSize.title1,
      lineHeight: typography.lineHeight.title1,
      fontWeight: '400',
    },
    title2: {
      fontSize: typography.fontSize.title2,
      lineHeight: typography.lineHeight.title2,
      fontWeight: '400',
    },
    title3: {
      fontSize: typography.fontSize.title3,
      lineHeight: typography.lineHeight.title3,
      fontWeight: '400',
    },
    headline: {
      fontSize: typography.fontSize.headline,
      lineHeight: typography.lineHeight.headline,
      fontWeight: '600',
    },
    body: {
      fontSize: typography.fontSize.body,
      lineHeight: typography.lineHeight.body,
      fontWeight: '400',
    },
    callout: {
      fontSize: typography.fontSize.callout,
      lineHeight: typography.lineHeight.callout,
      fontWeight: '400',
    },
    subheadline: {
      fontSize: typography.fontSize.subheadline,
      lineHeight: typography.lineHeight.subheadline,
      fontWeight: '400',
    },
    footnote: {
      fontSize: typography.fontSize.footnote,
      lineHeight: typography.lineHeight.footnote,
      fontWeight: '400',
    },
    caption1: {
      fontSize: typography.fontSize.caption1,
      lineHeight: typography.lineHeight.caption1,
      fontWeight: '400',
    },
    caption2: {
      fontSize: typography.fontSize.caption2,
      lineHeight: typography.lineHeight.caption2,
      fontWeight: '400',
    },
    small: {
      fontSize: typography.fontSize.small,
      lineHeight: typography.lineHeight.small,
      fontWeight: '400',
    },
    h1: {
      fontSize: typography.fontSize.h1,
      lineHeight: typography.lineHeight.h1,
      fontWeight: '700',
    },
    h2: {
      fontSize: typography.fontSize.h2,
      lineHeight: typography.lineHeight.h2,
      fontWeight: '600',
    },
  };

  return (
    <Text
      style={[
        styles.base,
        variantStyles[variant],
        { color: colorMap[color] },
        style,
      ]}
      {...props}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      default: {},
    }),
  },
});

export { ThemedText };
export default ThemedText;
