/**
 * PosterCard - Reusable media poster component for ZStream.
 * Apple-native styling with smooth transitions and subtle effects.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { MediaItem } from '../api/types';
import { useTheme } from '../theme/ThemeProvider';
import placeholderImg from '../assets/poster-placeholder.png';

export interface PosterCardProps {
  item: MediaItem;
  width: number;
  onPress: (item: MediaItem) => void;
  showProgress?: boolean;
  progress?: number; // 0 - 1
  containerStyle?: StyleProp<ViewStyle>;
}

const PosterCard: React.FC<PosterCardProps> = ({
  item,
  width,
  onPress,
  showProgress = false,
  progress = 0,
  containerStyle,
}) => {
  const { colors, radii, typography } = useTheme();
  const [loaded, setLoaded] = useState(false);

  const height = Math.round(width * 1.5);
  const posterUri = item.poster ?? undefined;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. Open details`}
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      style={[
        styles.container,
        containerStyle,
        { width, height, borderRadius: radii.md, backgroundColor: colors.CARD },
      ]}>
      <View style={[styles.imageWrapper, { borderRadius: radii.md }]}>
        <Image
          source={posterUri ? { uri: posterUri } : placeholderImg}
          defaultSource={placeholderImg}
          style={[styles.image, loaded ? styles.imageLoaded : styles.imageLoading]}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <View
            style={[
              styles.image,
              styles.loadingOverlay,
              { backgroundColor: colors.SURFACE },
            ]}
          />
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.TEXT_PRIMARY,
            fontSize: typography.fontSize.footnote,
            fontWeight: '500',
          }}>
          {item.title}
        </Text>
        {item.year && (
          <Text
            style={{
              color: colors.TEXT_SECONDARY,
              fontSize: typography.fontSize.caption1,
              marginTop: 2,
            }}>
            {item.year}
          </Text>
        )}
      </View>

      {showProgress && (
        <View
          style={[
            styles.progressBarContainer,
            {
              backgroundColor: colors.FILL,
              borderBottomLeftRadius: radii.md,
              borderBottomRightRadius: radii.md,
            },
          ]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
                backgroundColor: colors.PRIMARY,
                borderBottomLeftRadius: radii.md,
                borderBottomRightRadius: radii.md,
              },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  imageWrapper: {
    overflow: 'hidden',
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoaded: {
    opacity: 1,
  },
  imageLoading: {
    opacity: 0,
  },
  loadingOverlay: {
    position: 'absolute',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  progressBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  progressBarFill: {
    height: '100%',
  },
});

export default PosterCard;
