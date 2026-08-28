/**
 * LibraryScreen - ZStream library with Apple-native iOS styling.
 * Uses segmented control style tabs populated with real user data.
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useLibraryData, LibraryEntry } from '../hooks/useLibraryData';
import { RootStackParamList } from '../navigation/types';

type TabType = 'bookmarks' | 'progress' | 'history';

const LIBRARY_TABS: Array<{ key: TabType; label: string }> = [
  { key: 'bookmarks', label: 'Bookmarks' },
  { key: 'progress', label: 'In Progress' },
  { key: 'history', label: 'History' },
];

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors, spacing, radii } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('bookmarks');

  const {
    bookmarks,
    progress,
    history,
    isLoading,
    isError,
    reload,
    removeBookmarkItem,
    clearProgressItem,
  } = useLibraryData();

  const dataByTab: Record<TabType, LibraryEntry[]> = {
    bookmarks,
    progress,
    history,
  };

  const emptyMessage: Record<TabType, string> = {
    bookmarks: 'No bookmarks yet. Tap the bookmark icon on any title to save it.',
    progress: 'Nothing in progress. Start watching something to see it here.',
    history: 'No watch history yet. Your watched titles will appear here.',
  };

  const handleItemPress = (item: LibraryEntry) => {
    navigation.navigate('Details', { id: item.tmdbId });
  };

  const handleItemLongPress = (item: LibraryEntry) => {
    if (activeTab === 'bookmarks') {
      removeBookmarkItem(item.tmdbId);
    } else if (activeTab === 'progress') {
      clearProgressItem(item.tmdbId);
    }
  };

  const entries = dataByTab[activeTab];

  return (
    <ThemedView variant="background" style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            tintColor={colors.TEXT_PRIMARY}
          />
        }>
        {/* Segmented Control */}
        <View style={[styles.segmentedControl, { backgroundColor: colors.SURFACE, borderRadius: radii.sm }]}>
          {LIBRARY_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.segment,
                activeTab === tab.key && { backgroundColor: colors.CARD, borderRadius: radii.sm },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}>
              <ThemedText
                variant="footnote"
                color={activeTab === tab.key ? 'primary' : 'secondary'}
                style={styles.segmentText}>
                {tab.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <View style={[styles.sectionContent, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.PRIMARY} />
                <ThemedText variant="body" color="secondary" style={styles.emptyText}>
                  Loading your library...
                </ThemedText>
              </View>
            ) : isError ? (
              <View style={styles.emptyState}>
                <ThemedText variant="body" color="secondary" style={styles.emptyText}>
                  Failed to load your library.
                </ThemedText>
                <TouchableOpacity
                  onPress={reload}
                  style={[styles.retryButton, { backgroundColor: colors.PRIMARY, borderRadius: radii.sm }]}>
                  <ThemedText variant="headline" style={styles.retryText}>Retry</ThemedText>
                </TouchableOpacity>
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText variant="body" color="secondary" style={styles.emptyText}>
                  {emptyMessage[activeTab]}
                </ThemedText>
              </View>
            ) : (
              entries.map((item, index) => (
                <React.Fragment key={item.key}>
                  {index > 0 && <View style={[styles.separator, { backgroundColor: colors.SEPARATOR }]} />}
                  <TouchableOpacity
                    style={styles.libraryItem}
                    onPress={() => handleItemPress(item)}
                    onLongPress={() => handleItemLongPress(item)}
                    activeOpacity={0.6}>
                    {item.poster ? (
                      <Image source={{ uri: item.poster }} style={[styles.thumbnail, { borderRadius: radii.sm }]} />
                    ) : (
                      <View style={[styles.thumbnail, { backgroundColor: colors.CARD, borderRadius: radii.sm }]} />
                    )}
                    <View style={styles.itemInfo}>
                      <ThemedText variant="body" numberOfLines={1}>{item.title}</ThemedText>
                      <ThemedText variant="footnote" color="secondary" numberOfLines={1}>
                        {item.subtitle}
                      </ThemedText>
                      {activeTab === 'progress' && item.progress > 0 && (
                        <View style={[styles.miniProgressTrack, { backgroundColor: colors.FILL }]}>
                          <View
                            style={[
                              styles.miniProgressFill,
                              { backgroundColor: colors.PRIMARY, width: `${Math.min(item.progress, 100)}%` },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                    <ThemedText variant="body" color="muted">›</ThemedText>
                  </TouchableOpacity>
                </React.Fragment>
              ))
            )}
          </View>
        </View>

        {!isLoading && !isError && (
          <ThemedText variant="footnote" color="secondary" style={styles.hint}>
            Long-press an item to remove it
          </ThemedText>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingHorizontal: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontWeight: '500',
  },
  section: {},
  sectionContent: {
    overflow: 'hidden',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  libraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
  },
  thumbnail: {
    width: 48,
    height: 64,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
  },
  miniProgressTrack: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  hint: {
    textAlign: 'center',
    marginTop: 16,
  },
});

export default LibraryScreen;