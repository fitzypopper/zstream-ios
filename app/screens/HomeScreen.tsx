/**
 * HomeScreen - ZStream home experience with Apple-native styling.
 * Large title, hero banner, horizontal carousels.
 */
import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { fetchHome } from '../api/pstream';
import type { MediaItem } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import PosterCard from '../components/PosterCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;

interface RowData {
  key: string;
  title: string;
  items: MediaItem[];
  showProgress?: boolean;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, spacing, radii } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const viewportWidth = windowWidth || SCREEN_WIDTH;

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<MediaItem[]>({
    queryKey: ['home'],
    queryFn: fetchHome,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    networkMode: 'offlineFirst',
    retry: 1,
  });

  const heroItem = data?.[0];
  const libraryItems = useMemo(() => data?.slice(1) ?? [], [data]);
  const continueWatching = useMemo(
    () => libraryItems.filter(item => typeof item.progress === 'number' && item.progress > 0),
    [libraryItems],
  );

  const posterWidth = useMemo(() => {
    const baseColumns = Math.max(2, Math.floor((viewportWidth - spacing.md * 2) / 140));
    const gap = spacing.sm;
    return Math.floor((viewportWidth - spacing.md * 2 - gap * (baseColumns - 1)) / baseColumns);
  }, [viewportWidth, spacing]);

  const rows: RowData[] = useMemo(() => {
    if (!libraryItems || libraryItems.length === 0) return [];

    const trending = libraryItems.slice(0, 12);
    const popular = libraryItems.slice(12, 24);
    const newReleases = libraryItems.slice(24, 36);

    const list: RowData[] = [];
    if (continueWatching.length) {
      list.push({ key: 'continue', title: 'Continue Watching', items: continueWatching, showProgress: true });
    }
    if (trending.length) list.push({ key: 'trending', title: 'Trending', items: trending });
    if (popular.length) list.push({ key: 'popular', title: 'Popular', items: popular });
    if (newReleases.length) list.push({ key: 'new', title: 'New Releases', items: newReleases });

    return list;
  }, [libraryItems, continueWatching]);

  const onPressCard = useCallback((item: MediaItem) => {
    navigation.navigate('Details', { id: item.id });
  }, [navigation]);

  const handleWatchHero = useCallback(async () => {
    if (!heroItem) return;
    if (heroItem.tmdbId) {
      navigation.navigate('Player', {
        tmdbId: heroItem.tmdbId,
        type: heroItem.type === 'tv' ? 'tv' : 'movie',
        title: heroItem.title,
        poster: heroItem.poster || undefined,
      });
    }
  }, [heroItem, navigation]);

  const renderHero = useCallback(() => {
    if (!heroItem) return null;

    const backdrop = heroItem.backdrop ?? heroItem.poster ?? undefined;

    return (
      <View style={[styles.heroContainer, { marginBottom: spacing.lg }]}>
        {backdrop ? (
          <Image
            source={{ uri: backdrop }}
            style={[styles.heroImage, { height: Math.round(SCREEN_WIDTH * 0.56) }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.heroImage,
              {
                height: Math.round(SCREEN_WIDTH * 0.56),
                backgroundColor: colors.SURFACE,
              },
            ]}
          />
        )}
        <View style={styles.heroOverlay}>
          <View style={styles.heroContent}>
            <ThemedText variant="title1" numberOfLines={1} style={styles.heroTitle}>
              {heroItem.title}
            </ThemedText>
            <ThemedText variant="body" color="secondary" numberOfLines={2} style={styles.heroOverview}>
              {heroItem.overview || ''}
            </ThemedText>
            <View style={styles.heroButtons}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.PRIMARY, borderRadius: radii.sm }]}
                onPress={handleWatchHero}
                activeOpacity={0.8}>
                <ThemedText variant="headline" style={styles.primaryButtonText}>
                  ▶ Play
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.SURFACE, borderRadius: radii.sm }]}
                onPress={() => navigation.navigate('Details', { id: heroItem.id })}
                activeOpacity={0.8}>
                <ThemedText variant="headline" color="secondary">
                  More Info
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }, [heroItem, colors, spacing, radii, handleWatchHero, navigation]);

  const renderRow = useCallback(({ item }: { item: RowData }) => {
    return (
      <View style={[styles.rowContainer, { marginBottom: spacing.lg }]}>
        <ThemedText variant="title3" style={{ ...styles.rowTitle, marginBottom: spacing.sm, marginLeft: spacing.md }}>
          {item.title}
        </ThemedText>
        <FlatList
          data={item.items}
          keyExtractor={(m) => m.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={{ paddingHorizontal: spacing.md }}
          getItemLayout={(_, index) => ({
            length: posterWidth + spacing.sm,
            offset: (posterWidth + spacing.sm) * index,
            index,
          })}
          renderItem={({ item: media }) => (
            <PosterCard
              item={media}
              width={posterWidth}
              onPress={onPressCard}
              showProgress={item.showProgress ?? typeof media.progress === 'number'}
              progress={media.progress ?? 0}
              containerStyle={{ marginRight: spacing.sm }}
            />
          )}
        />
      </View>
    );
  }, [onPressCard, posterWidth, spacing]);

  const keyExtractor = useCallback((row: RowData) => row.key, []);

  if (isLoading) {
    return (
      <ThemedView variant="background" style={styles.centerContainer}>
        <ThemedText color="secondary">Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (isError && !data) {
    return (
      <ThemedView variant="background" style={styles.centerContainer}>
        <ThemedText variant="title3" style={{ marginBottom: spacing.md }}>
          Unable to load content
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
          Check your connection and try again.
        </ThemedText>
        <TouchableOpacity
          style={[{ backgroundColor: colors.PRIMARY, borderRadius: radii.sm, paddingHorizontal: 24, paddingVertical: 12 }]}
          onPress={() => refetch()}
          activeOpacity={0.8}>
          <ThemedText variant="headline" style={{ color: '#FFF' }}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="background" style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHero}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.TEXT_PRIMARY}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { padding: spacing.lg }]}>
            <ThemedText variant="title3" style={{ marginBottom: spacing.sm }}>
              Nothing to show yet
            </ThemedText>
            <ThemedText variant="body" color="secondary">
              Content will appear when we can reach the service.
            </ThemedText>
          </View>
        }
      />
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
  heroContainer: {
    overflow: 'hidden',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  heroImage: {
    width: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroContent: {
    padding: 16,
  },
  heroTitle: {
    marginBottom: 4,
  },
  heroOverview: {
    marginBottom: 12,
    lineHeight: 20,
  },
  heroButtons: {
    flexDirection: 'row',
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  rowContainer: {},
  rowTitle: {
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
