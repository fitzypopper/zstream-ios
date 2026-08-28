/**
 * TraktScreen - Trakt.tv OAuth device-flow authorization and sync status.
 * Apple-native iOS styling.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import * as trakt from '../services/trakt';
import type { TraktSession, TraktProfile } from '../services/trakt';

const TraktScreen: React.FC = () => {
  const { colors, spacing, radii } = useTheme();

  const [session, setSession] = useState<TraktSession | null>(null);
  const [profile, setProfile] = useState<TraktProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await trakt.loadTraktSession();
      setSession(stored);
      if (stored) {
        const p = await trakt
          .fetchTraktProfile(stored.accessToken)
          .catch(() => null);
        setProfile(p);
      }
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAuthorize = useCallback(async () => {
    setIsAuthorizing(true);
    try {
      const deviceCode = await trakt.requestDeviceCode();
      setUserCode(deviceCode.userCode);
      setVerificationUrl(deviceCode.verificationUrl);

      Alert.alert(
        'Authorize Trakt',
        `Go to:\n${deviceCode.verificationUrl}\n\nand enter code:\n${deviceCode.userCode}\n\nThe app will detect authorization automatically.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => { setIsAuthorizing(false); setUserCode(null); } },
          { text: 'I entered it', onPress: () => { /* continue polling below */ } },
        ],
      );

      const newSession = await trakt.pollForToken(
        deviceCode.deviceCode,
        deviceCode.interval * 1000,
        deviceCode.expiresIn * 1000,
      );
      await trakt.saveTraktSession(newSession);

      const p = await trakt
        .fetchTraktProfile(newSession.accessToken)
        .catch(() => null);

      setSession(newSession);
      setProfile(p);
      setUserCode(null);
      setVerificationUrl(null);
      Alert.alert('Connected', p?.name ? `Signed in as ${p.name}.` : 'Trakt is connected.');
    } catch (err: any) {
      setUserCode(null);
      Alert.alert('Authorization Failed', err.message || 'Could not connect to Trakt.');
    } finally {
      setIsAuthorizing(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect Trakt?',
      'Your Trakt account will be disconnected from ZStream.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await trakt.clearTraktSession();
            setSession(null);
            setProfile(null);
          },
        },
      ],
    );
  }, []);

  if (isLoading) {
    return (
      <ThemedView variant="background" style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.PRIMARY} />
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="background" style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <View
          style={[
            styles.statusCard,
            { backgroundColor: colors.SURFACE, borderRadius: radii.md, padding: spacing.md },
          ]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: session ? colors.SUCCESS : colors.MUTED }]} />
            <ThemedText variant="headline">
              {session ? 'Connected' : 'Not Connected'}
            </ThemedText>
          </View>
          <ThemedText variant="footnote" color="secondary" style={styles.statusSubtitle}>
            {session
              ? profile
                ? `Signed in as ${profile.name ?? profile.username ?? 'Trakt user'}`
                : 'Trakt is active'
              : 'Connect Trakt to sync your watch history and progress.'}
          </ThemedText>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { marginTop: spacing.lg }]}>
          {session ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.disconnectButton,
                { borderRadius: radii.md, paddingVertical: 14 },
              ]}
              onPress={handleDisconnect}
              disabled={isAuthorizing}>
              <ThemedText variant="headline" color="error">Disconnect Trakt</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.PRIMARY, borderRadius: radii.md, paddingVertical: 14 },
              ]}
              onPress={handleAuthorize}
              disabled={isAuthorizing}>
              {isAuthorizing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <ThemedText variant="headline" style={styles.actionButtonText}>
                  Connect Trakt
                </ThemedText>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Code display while authorizing */}
        {isAuthorizing && userCode && verificationUrl && !session && (
          <View
            style={[
              styles.codeCard,
              { backgroundColor: colors.SURFACE, borderRadius: radii.md, padding: spacing.lg, marginTop: spacing.lg },
            ]}>
            <ThemedText variant="footnote" color="secondary" style={styles.codeLabel}>
              VISIT
            </ThemedText>
            <ThemedText variant="body" style={styles.codeUrl}>{verificationUrl}</ThemedText>
            <ThemedText variant="footnote" color="secondary" style={{ ...styles.codeLabel, marginTop: spacing.md }}>
              AND ENTER
            </ThemedText>
            <ThemedText variant="h1" color="primary" style={styles.codeValue}>
              {userCode}
            </ThemedText>
            <ActivityIndicator
              size="small"
              color={colors.PRIMARY}
              style={{ marginTop: spacing.md }}
            />
            <ThemedText variant="footnote" color="muted" style={styles.waitingText}>
              Waiting for authorization...
            </ThemedText>
          </View>
        )}

        {/* Info */}
        <View style={[styles.infoCard, { marginTop: spacing.lg }]}>
          <ThemedText variant="footnote" color="secondary">
            Connecting Trakt lets ZStream read your watch history, bookmarks, and
            sync playback progress between devices.
          </ThemedText>
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
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  statusCard: {},
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusSubtitle: {
    lineHeight: 18,
  },
  actions: {},
  actionButton: {
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  disconnectButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
  },
  codeCard: {
    alignItems: 'center',
  },
  codeLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  codeUrl: {
    fontWeight: '600',
  },
  codeValue: {
    fontSize: 40,
    letterSpacing: 4,
    marginTop: 4,
  },
  waitingText: {
    marginTop: 8,
  },
  infoCard: {
    paddingHorizontal: 8,
  },
});

export default TraktScreen;