/**
 * DownloadsScreen - Manages offline downloads for ZStream.
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { colors as themeColors } from '../theme/colors';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useDownloads } from '../hooks/useDownloads';
import type { DownloadItem } from '../services/downloads';
import type { RootStackParamList } from '../navigation/types';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function statusLabel(item: DownloadItem): string {
  switch (item.status) {
    case 'downloading':
      return item.format === 'hls'
        ? `Downloading ${item.segmentsDone}/${item.segmentsTotal} segments`
        : `Downloading ${formatBytes(item.receivedBytes)}`;
    case 'queued':
      return 'Queued';
    case 'paused':
      return item.format === 'hls'
        ? `Paused (${item.segmentsDone}/${item.segmentsTotal} segments)`
        : `Paused (${formatBytes(item.receivedBytes)})`;
    case 'error':
      return item.error ?? 'Failed';
    case 'completed':
      return 'Ready to play';
    default:
      return item.status;
  }
}

function progressPercent(item: DownloadItem): number {
  if (item.status === 'completed') return 100;
  if (item.format === 'hls') {
    if (item.segmentsTotal <= 0) return 0;
    return Math.min(Math.round((item.segmentsDone / item.segmentsTotal) * 100), 100);
  }
  if (item.totalBytes <= 0) return 0;
  return Math.min(Math.round((item.receivedBytes / item.totalBytes) * 100), 100);
}

const DownloadsScreen: React.FC = () => {
  const { colors, radii, spacing } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { items, loading, pause, resume, remove, clear } = useDownloads();
  const [busy, setBusy] = useState<string | null>(null);

  const handleRemove = (item: DownloadItem) => {
    Alert.alert(
      'Remove Download',
      `Remove "${item.title}" from your device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(item.id);
            await remove(item.id);
            setBusy(null);
          },
        },
      ],
    );
  };

  const clearAll = () => {
    Alert.alert('Clear Downloads', 'Remove all downloads from this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          setBusy('__all__');
          await clear();
          setBusy(null);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: DownloadItem }) => {
    const isActive = item.status === 'downloading' || item.status === 'queued';
    const isCompleted = item.status === 'completed';
    const pct = progressPercent(item);

    return (
      <View style={[styles.item, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
        <TouchableOpacity
          style={styles.itemMain}
          activeOpacity={isCompleted ? 0.7 : 1}
          disabled={!isCompleted}
          onPress={() =>
            navigation.navigate('Player', {
              tmdbId: item.tmdbId,
              type: item.mediaType === 'tv' ? 'tv' : 'movie',
              title: item.title,
              poster: item.poster ?? undefined,
              season: item.season ?? undefined,
              episode: item.episode ?? undefined,
            })
          }>
          <View style={styles.thumbPlaceholder}>
            <ThemedText variant="headline" style={{ color: colors.TEXT_PRIMARY }}>
              {item.title.slice(0, 1).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.itemInfo}>
            <ThemedText variant="body" numberOfLines={1} style={styles.itemTitle}>
              {item.title}
              {item.episodeTitle ? ` — ${item.episodeTitle}` : ''}
            </ThemedText>
            <ThemedText variant="caption2" color="secondary">
              {item.quality} • {item.provider} • {statusLabel(item)}
            </ThemedText>
            {!isCompleted && (
              <View style={[styles.progressTrack, { backgroundColor: colors.FILL }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.PRIMARY,
                      width: `${pct}%`,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.itemActions}>
          {isActive ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => pause(item.id)}
              disabled={busy === item.id}>
              <ThemedText variant="caption1" color="secondary">Pause</ThemedText>
            </TouchableOpacity>
          ) : item.status === 'paused' || item.status === 'error' ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => resume(item.id)}
              disabled={busy === item.id}>
              <ThemedText variant="caption1" color="primary">Resume</ThemedText>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemove(item)}
            disabled={busy === item.id}>
            <ThemedText variant="caption1" color="error">Remove</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ThemedView variant="background" style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.PRIMARY} />
          <ThemedText style={{ marginTop: spacing.md }} color="secondary">
            Loading downloads…
          </ThemedText>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <ThemedText variant="title3" style={{ marginBottom: spacing.sm }}>
            No downloads yet
          </ThemedText>
          <ThemedText variant="body" color="secondary" style={styles.emptyHint}>
            Use the ⬇ button in the player to save a title for offline viewing.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            items.length > 0 ? (
              <View style={styles.headerRow}>
                <ThemedText variant="caption1" color="secondary">
                  {items.length} download{items.length === 1 ? '' : 's'}
                </ThemedText>
                <TouchableOpacity onPress={clearAll} disabled={busy !== null}>
                  <ThemedText variant="caption1" color="error">Clear All</ThemedText>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyHint: {
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  item: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  itemMain: {
    flexDirection: 'row',
    padding: 12,
  },
  thumbPlaceholder: {
    width: 48,
    height: 64,
    borderRadius: 6,
    backgroundColor: themeColors.CARD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    marginBottom: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: themeColors.SEPARATOR,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

export default DownloadsScreen;