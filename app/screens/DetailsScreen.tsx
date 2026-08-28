/**
 * DetailsScreen - ZStream media details with Apple-native styling.
 */
import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { fetchDetails } from '../api/pstream';
import { addBookmark, removeBookmark } from '../api/auth';
import { getUserId } from '../config/env';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Details'>;
type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;

const DetailsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailsScreenRouteProp>();
  const { id } = route.params || {};
  const { colors, spacing, radii } = useTheme();
  const [isBookmarked, setIsBookmarked] = React.useState(false);
  const [bookmarkBusy, setBookmarkBusy] = React.useState(false);

  const {
    data: item,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['details', id],
    queryFn: () => fetchDetails(id || ''),
    enabled: !!id,
  });

  const handlePlay = useCallback(async () => {
    if (!item?.tmdbId) return;
    
    navigation.navigate('Player', {
      tmdbId: item.tmdbId,
      type: item.type === 'tv' ? 'tv' : 'movie',
      title: item.title,
      poster: item.poster || undefined,
    });
  }, [item, navigation]);

  const handleToggleBookmark = useCallback(async () => {
    if (!item?.tmdbId || bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      const userId = await getUserId();
      if (!userId) return;
      if (isBookmarked) {
        await removeBookmark(userId, item.tmdbId);
        setIsBookmarked(false);
      } else {
        await addBookmark(userId, item.tmdbId);
        setIsBookmarked(true);
      }
    } catch (err) {
      if (__DEV__) console.error('[Details] Bookmark toggle failed:', err);
    } finally {
      setBookmarkBusy(false);
    }
  }, [item, isBookmarked, bookmarkBusy]);

  if (isLoading) {
    return (
      <ThemedView variant="background" style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.PRIMARY} />
      </ThemedView>
    );
  }

  if (isError || !item) {
    return (
      <ThemedView variant="background" style={styles.centerContainer}>
        <ThemedText variant="title3" style={{ marginBottom: spacing.md }}>
          Failed to load details
        </ThemedText>
        <TouchableOpacity
          onPress={() => refetch()}
          style={[{ backgroundColor: colors.PRIMARY, borderRadius: radii.sm, paddingHorizontal: 20, paddingVertical: 10 }]}>
          <ThemedText variant="headline" style={{ color: '#FFF' }}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const backdrop = item.backdrop || item.poster;

  return (
    <ThemedView variant="background" style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Image */}
        <View style={styles.heroSection}>
          {backdrop ? (
            <Image
              source={{ uri: backdrop }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.SURFACE }]} />
          )}
          <View style={styles.heroOverlay}>
            <View style={[styles.typeBadge, { backgroundColor: colors.PRIMARY }]}>
              <ThemedText variant="caption1" style={styles.typeBadgeText}>
                {item.type === 'tv' ? 'TV SHOW' : 'MOVIE'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Content Info */}
        <View style={styles.contentSection}>
          <ThemedText variant="largeTitle" style={styles.title}>
            {item.title}
          </ThemedText>

          <View style={styles.metaRow}>
            {item.year && (
              <>
                <ThemedText variant="body" color="secondary">
                  {item.year}
                </ThemedText>
                <ThemedText variant="body" color="muted" style={styles.metaDot}>•</ThemedText>
              </>
            )}
            {item.rating && (
              <View style={[styles.ratingBadge, { backgroundColor: colors.SUCCESS }]}>
                <ThemedText variant="caption1" style={styles.ratingText}>
                  {item.rating.toFixed(1)}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.playButton, { backgroundColor: colors.PRIMARY, borderRadius: radii.md }]}
              onPress={handlePlay}
              disabled={!item.tmdbId}
              activeOpacity={0.8}>
              <ThemedText variant="headline" style={styles.playButtonText}>
                {item.tmdbId ? '▶ Play' : 'Unavailable'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.bookmarkButton,
                {
                  backgroundColor: isBookmarked ? colors.PRIMARY : colors.SURFACE,
                  borderRadius: radii.md,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isBookmarked ? colors.PRIMARY : colors.SEPARATOR,
                },
              ]}
              onPress={handleToggleBookmark}
              disabled={bookmarkBusy || !item.tmdbId}
              activeOpacity={0.8}>
              <ThemedText variant="headline" style={{ color: isBookmarked ? '#FFF' : colors.PRIMARY }}>
                {isBookmarked ? '✓' : '🔖'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <ThemedText variant="body" color="secondary" style={styles.overview}>
              {item.overview}
            </ThemedText>
          </View>

          {/* Genres */}
          {item.genres && item.genres.length > 0 && (
            <View style={styles.genresSection}>
              <ThemedText variant="headline" style={styles.genresTitle}>
                Genres
              </ThemedText>
              <View style={styles.genresList}>
                {item.genres.map((genre) => (
                  <View
                    key={genre}
                    style={[styles.genreChip, { backgroundColor: colors.SURFACE, borderRadius: radii.sm }]}>
                    <ThemedText variant="footnote" color="secondary">
                      {genre}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    width: '100%',
    height: 300,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#FFF',
    fontWeight: '600',
  },
  contentSection: {
    padding: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaDot: {
    marginHorizontal: 8,
  },
  ratingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#FFF',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  playButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  bookmarkButton: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  playButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  overview: {
    lineHeight: 24,
  },
  genresSection: {},
  genresTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
});

export default DetailsScreen;
