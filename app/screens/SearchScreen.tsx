/**
 * SearchScreen - ZStream search with Apple-native iOS styling.
 * Uses native search bar and grid layout.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { search } from '../api/pstream';
import type { MediaItem } from '../api/types';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import PosterCard from '../components/PosterCard';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DEBOUNCE_MS = 350;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors, spacing, radii } = useTheme();
  const { width } = useWindowDimensions();
  const viewportWidth = width || 390;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery.trim()), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const {
    data,
    isFetching,
    isError,
    refetch,
  } = useQuery<MediaItem[]>({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const columns = useMemo(
    () => Math.max(2, Math.floor((viewportWidth - spacing.md * 2) / 150)),
    [viewportWidth, spacing],
  );
  const posterWidth = useMemo(() => {
    const gap = spacing.sm;
    return Math.floor((viewportWidth - spacing.md * 2 - gap * (columns - 1)) / columns);
  }, [viewportWidth, spacing, columns]);

  const results = debouncedQuery.length > 0 ? data ?? [] : [];
  const showIdle = debouncedQuery.length === 0;
  const showLoading = isFetching && debouncedQuery.length > 0 && results.length === 0;
  const showEmpty = !showLoading && !isError && debouncedQuery.length > 0 && results.length === 0;
  const showError = isError && results.length === 0;

  const handlePress = useCallback((item: MediaItem) => {
    navigation.navigate('Details', { id: item.id });
  }, [navigation]);

  const clearQuery = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  return (
    <ThemedView variant="background" style={styles.container}>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        numColumns={columns}
        columnWrapperStyle={[
          styles.columnWrapper,
          columns > 1 ? styles.columnMulti : styles.columnSingle,
          { marginBottom: spacing.md },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: 100,
        }}
        ListHeaderComponent={
          <View style={[styles.header, { paddingVertical: spacing.md }]}>
            <ThemedText variant="largeTitle" style={{ marginBottom: spacing.md }}>
              Search
            </ThemedText>
            <View
              style={[
                styles.searchInputContainer,
                {
                  backgroundColor: colors.SURFACE,
                  borderRadius: radii.md,
                },
              ]}>
              <ThemedText variant="body" color="muted" style={styles.searchIcon}>
                🔍
              </ThemedText>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    color: colors.TEXT_PRIMARY,
                  },
                ]}
                placeholder="Movies, shows, genres..."
                placeholderTextColor={colors.MUTED}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={() => setDebouncedQuery(searchQuery.trim())}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearQuery} accessibilityRole="button" accessibilityLabel="Clear search">
                  <View style={[styles.clearButton, { backgroundColor: colors.FILL }]}>
                    <ThemedText variant="caption1" style={styles.clearButtonText}>✕</ThemedText>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            width={posterWidth}
            onPress={handlePress}
            showProgress={typeof item.progress === 'number'}
            progress={item.progress ?? 0}
            containerStyle={{ marginRight: spacing.sm }}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyState, { paddingVertical: spacing.xl }]}>
            {showIdle && (
              <>
                <ThemedText variant="title3" style={{ marginBottom: spacing.sm }}>
                  Find something to watch
                </ThemedText>
                <ThemedText variant="body" color="secondary">
                  Start typing to search the catalogue.
                </ThemedText>
              </>
            )}
            {showLoading && <ActivityIndicator color={colors.PRIMARY} size="large" />}
            {showEmpty && (
              <>
                <ThemedText variant="title3" style={{ marginBottom: spacing.sm }}>
                  No matches
                </ThemedText>
                <ThemedText variant="body" color="secondary">
                  Try a different title or keyword.
                </ThemedText>
              </>
            )}
            {showError && (
              <>
                <ThemedText variant="title3" style={{ marginBottom: spacing.sm }}>
                  Unable to search
                </ThemedText>
                <ThemedText variant="body" color="secondary" style={{ marginBottom: spacing.md }}>
                  Check your connection or try again.
                </ThemedText>
                <TouchableOpacity
                  style={[{ backgroundColor: colors.SURFACE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radii.sm }]}
                  onPress={() => refetch()}
                  accessibilityRole="button"
                  accessibilityLabel="Retry search">
                  <ThemedText variant="headline" color="accent">Retry</ThemedText>
                </TouchableOpacity>
              </>
            )}
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
  header: {},
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  columnWrapper: {},
  columnMulti: {
    justifyContent: 'space-between',
  },
  columnSingle: {
    justifyContent: 'flex-start',
  },
});

export default SearchScreen;
