/**
 * PlayerScreen - ZStream video player with Apple-native iOS styling.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import Video, { VideoRef, OnLoadData, OnProgressData, TextTrackType, ISO639_1 } from 'react-native-video';
import { fetchSources } from '../api/pstream';
import { updateProgress, updateWatchHistory } from '../api/auth';
import { getUserId } from '../config/env';
import { Source } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

const PlayerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PlayerScreenRouteProp>();
  const { tmdbId, type, title } = route.params;
  const { colors, spacing, radii } = useTheme();

  const videoRef = useRef<VideoRef>(null);
  const seekOnLoad = useRef<number | null>(null);
  const [currentSource, setCurrentSource] = useState<Source | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data: sourcesResponse,
    isLoading: isSourcesLoading,
    isError: isSourcesError,
    refetch,
  } = useQuery({
    queryKey: ['sources', tmdbId, type],
    queryFn: () => fetchSources(tmdbId, type),
    gcTime: 0,
    staleTime: 0,
  });

  useEffect(() => {
    if (sourcesResponse && sourcesResponse.sources.length > 0) {
      const sourcesData = sourcesResponse.sources;
      const hlsSources = sourcesData.filter(s => s.type === 'hls' || s.url.includes('.m3u8'));
      const sorted = hlsSources.sort((a, b) => {
        if (a.quality === 'auto') return -1;
        if (b.quality === 'auto') return 1;
        const qA = parseInt(a.quality, 10);
        const qB = parseInt(b.quality, 10);
        if (isNaN(qA) && isNaN(qB)) return 0;
        if (isNaN(qA)) return 1;
        if (isNaN(qB)) return -1;
        return qB - qA;
      });

      const bestSource = sorted[0] || sourcesData[0];
      
      if (bestSource) {
        setCurrentSource(bestSource);
        setError(null);
      } else {
        setError('No playable sources found');
      }
    } else if (sourcesResponse && sourcesResponse.sources.length === 0) {
      setError('No sources available');
    }
  }, [sourcesResponse]);

  const textTracks = React.useMemo(() => {
    if (!sourcesResponse?.subtitles) return undefined;
    return sourcesResponse.subtitles.map((sub) => ({
      title: sub.label,
      language: (sub.language && sub.language.length === 2 ? sub.language : 'en') as ISO639_1,
      type: TextTrackType.VTT,
      uri: sub.url,
    }));
  }, [sourcesResponse]);

  const filteredTextTracks = React.useMemo(() => {
    if (!textTracks || textTracks.length === 0) return undefined;
    if (activeSubtitleIndex === null) return undefined;
    const idx = Math.min(activeSubtitleIndex, textTracks.length - 1);
    return [textTracks[idx]];
  }, [textTracks, activeSubtitleIndex]);

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setIsLoading(false);
    if (seekOnLoad.current !== null) {
      videoRef.current?.seek(seekOnLoad.current);
      seekOnLoad.current = null;
    }
  };

  const handleProgress = (data: OnProgressData) => {
    setProgress(data.currentTime);
  };

  const handleError = (videoError: any) => {
    console.error('Video Error:', videoError);
    const sources = sourcesResponse?.sources;
    if (sources && currentSource) {
      const currentIndex = sources.indexOf(currentSource);
      if (currentIndex < sources.length - 1) {
        setIsLoading(true);
        setCurrentSource(sources[currentIndex + 1]);
      } else {
        setError('Playback failed for all sources');
        setIsLoading(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  useEffect(() => {
    if (showControls && isPlaying) {
      const timer = setTimeout(() => setShowControls(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showControls, isPlaying]);

  const itemTmd = tmdbId;

  const saveProgressRef = useRef<() => void>(() => {});
  saveProgressRef.current = () => {
    if (!progress || !duration) return;
    const userIdPromise = getUserId();
    userIdPromise.then((userId) => {
      if (!userId || !itemTmd) return;
      const pct = Math.min(Math.round((progress / duration) * 100), 100);
      if (pct > 1) {
        updateProgress(userId, itemTmd, { progress: pct, duration }).catch(() => {});
      }
      if (pct > 5) {
        updateWatchHistory(userId, itemTmd, { progress: pct }).catch(() => {});
      }
    }).catch(() => {});
  };

  // Save progress periodically every 15s
  useEffect(() => {
    const interval = setInterval(() => saveProgressRef.current(), 15000);
    return () => clearInterval(interval);
  }, []);

  // Flush progress on unmount
  useEffect(() => {
    return () => {
      saveProgressRef.current();
    };
  }, []);

  if (isSourcesLoading) {
    return (
      <ThemedView variant="background" style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.PRIMARY} />
        <ThemedText style={{ marginTop: spacing.md }}>Loading sources...</ThemedText>
      </ThemedView>
    );
  }

  if (isSourcesError || error) {
    return (
      <ThemedView variant="background" style={styles.centerContainer}>
        <ThemedText variant="title3" style={styles.errorText}>
          {error || 'Failed to load stream'}
        </ThemedText>
        <TouchableOpacity
          onPress={() => {
            setError(null);
            refetch();
          }}
          style={[styles.button, { backgroundColor: colors.PRIMARY, borderRadius: radii.sm }]}>
          <ThemedText variant="headline" style={{ color: '#FFF' }}>Retry</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.button, { marginTop: spacing.md }]}>
          <ThemedText variant="headline" color="secondary">Go Back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="background" style={styles.container}>
      <StatusBar hidden />

      {currentSource && (
        <Video
          ref={videoRef}
          source={{ uri: currentSource.url }}
          style={styles.video}
          resizeMode="contain"
          onLoad={handleLoad}
          onProgress={handleProgress}
          onError={handleError}
          paused={!isPlaying}
          onBuffer={() => setIsLoading(true)}
          onReadyForDisplay={() => setIsLoading(false)}
          textTracks={filteredTextTracks}
        />
      )}

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={toggleControls}>
        
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.PRIMARY} />
          </View>
        )}

        {showControls && (
          <View style={styles.controlsOverlay}>
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.goBack()}>
                <ThemedText variant="title1" style={{ color: '#FFF' }}>‹</ThemedText>
              </TouchableOpacity>
              
              <View style={styles.topRightControls}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowSettingsModal(true)}>
                  <ThemedText variant="body" style={{ color: '#FFF' }}>⚙</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.centerControls}>
              <TouchableOpacity
                onPress={() => videoRef.current?.seek(progress - 10)}
                style={styles.skipButton}>
                <ThemedText variant="headline" style={{ color: '#FFF' }}>-10s</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsPlaying(!isPlaying)}
                style={[styles.playButton, { backgroundColor: colors.PRIMARY }]}>
                <ThemedText variant="largeTitle" style={{ color: '#FFF' }}>
                  {isPlaying ? '⏸' : '▶'}
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => videoRef.current?.seek(progress + 10)}
                style={styles.skipButton}>
                <ThemedText variant="headline" style={{ color: '#FFF' }}>+10s</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomBar}>
              <ThemedText variant="body" style={{ color: '#FFF', marginBottom: spacing.xs }}>
                {title}
              </ThemedText>
              <View style={styles.timeRow}>
                <ThemedText variant="caption1" style={{ color: '#FFF' }}>
                  {formatTime(progress)}
                </ThemedText>
                <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: colors.PRIMARY,
                        width: `${duration > 0 ? (progress / duration) * 100 : 0}%` 
                      }
                    ]} 
                  />
                </View>
                <ThemedText variant="caption1" style={{ color: '#FFF' }}>
                  {formatTime(duration)}
                </ThemedText>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsModal(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: colors.SURFACE, borderRadius: radii.lg }]}>
            <ThemedText variant="title2" style={{ marginBottom: spacing.md }}>
              Settings
            </ThemedText>

            {/* Quality */}
            <ThemedText variant="footnote" color="secondary" style={styles.modalSectionTitle}>
              QUALITY
            </ThemedText>
            <FlatList
              data={sourcesResponse?.sources || []}
              keyExtractor={(item, index) => `q-${item.quality}-${index}`}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.qualityOption,
                    {
                      borderBottomColor: colors.SEPARATOR,
                      backgroundColor: currentSource?.url === item.url ? colors.CARD : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    seekOnLoad.current = progress;
                    setCurrentSource(item);
                  }}>
                  <ThemedText variant="body">
                    {item.quality} ({item.provider})
                  </ThemedText>
                  {currentSource?.url === item.url && (
                    <ThemedText color="primary">✓</ThemedText>
                  )}
                </TouchableOpacity>
              )}
            />

            {/* Subtitles */}
            <ThemedText variant="footnote" color="secondary" style={{ ...styles.modalSectionTitle, marginTop: spacing.lg }}>
              SUBTITLES
            </ThemedText>
            {textTracks && textTracks.length > 0 ? (
              <FlatList
                data={[{ label: 'Off' }, ...textTracks.map((t) => ({ label: t.title }))]}
                keyExtractor={(item, index) => `s-${index}`}
                style={styles.modalList}
                renderItem={({ item, index }) => {
                  const isOff = index === 0;
                  const isActive = isOff ? activeSubtitleIndex === null : activeSubtitleIndex === index - 1;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.qualityOption,
                        { borderBottomColor: colors.SEPARATOR, backgroundColor: isActive ? colors.CARD : 'transparent' },
                      ]}
                      onPress={() => {
                        setActiveSubtitleIndex(isOff ? null : index - 1);
                      }}>
                      <ThemedText variant="body">
                        {isOff ? 'Off' : item.label}
                      </ThemedText>
                      {isActive && <ThemedText color="primary">✓</ThemedText>}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <ThemedText variant="footnote" color="muted" style={styles.noSubtitles}>
                No subtitles available
              </ThemedText>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 10,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 40,
  },
  skipButton: {
    padding: 10,
  },
  bottomBar: {
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    flex: 1,
    height: 4,
    marginHorizontal: 10,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    padding: 20,
  },
  modalSectionTitle: {
    marginLeft: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalList: {
    flexGrow: 0,
  },
  noSubtitles: {
    marginLeft: 8,
    marginTop: 4,
  },
  qualityOption: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default PlayerScreen;
