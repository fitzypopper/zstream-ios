/**
 * TVSyncScreen - Phone-to-TV pairing and device management.
 * Uses manual IP entry for now (Bonjour discovery via native module coming later).
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { getTVSyncManager } from '../services/tvSync';
import type { PairedTV } from '../api/types';

interface TVRowProps {
  tv: PairedTV;
  onRemove: (tv: PairedTV) => void;
}

const TVRow: React.FC<TVRowProps> = ({ tv, onRemove }) => {
  const { colors, spacing, radii } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.SURFACE,
          borderRadius: radii.md,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginBottom: spacing.sm,
        },
      ]}>
      <View style={styles.rowLeft}>
        <View style={[styles.tvIcon, { backgroundColor: colors.CARD, borderRadius: radii.sm }]}>
          <ThemedText variant="headline" color="primary">TV</ThemedText>
        </View>
        <View style={styles.rowInfo}>
          <ThemedText variant="body" numberOfLines={1}>{tv.tvName}</ThemedText>
          <ThemedText variant="footnote" color="secondary" numberOfLines={1}>
            {tv.host}:{tv.port} • {new Date(tv.pairedAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Unpair TV',
            `Remove "${tv.tvName}" from your devices?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => onRemove(tv) },
            ],
          );
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <ThemedText variant="body" color="error">✕</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const TVSyncScreen: React.FC = () => {
  const { colors, spacing, radii } = useTheme();
  const manager = getTVSyncManager();

  const [pairedTVs, setPairedTVs] = useState<PairedTV[]>([]);
  const [showPairModal, setShowPairModal] = useState(false);
  const [tvIp, setTvIp] = useState('');
  const [tvPort, setTvPort] = useState('8282');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTVs = useCallback(async () => {
    const tvs = await manager.getPairedTVs();
    setPairedTVs(tvs);
  }, [manager]);

  useEffect(() => {
    loadTVs();
  }, [loadTVs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    loadTVs();
    setRefreshing(false);
  }, [loadTVs]);

  const handleRemoveTV = useCallback(
    async (tv: PairedTV) => {
      await manager.removePairedTV(tv.id);
      loadTVs();
    },
    [manager, loadTVs],
  );

  const handleInitiatePair = useCallback(async () => {
    if (!tvIp.trim()) {
      Alert.alert('Missing IP', 'Enter your TV IP address to start pairing.');
      return;
    }

    setIsPairing(true);
    try {
      const port = parseInt(tvPort || '8282', 10);
      const { pairingCode: code } = await manager.initiatePairing(tvIp.trim(), port);
      setPairingCode(code);
    } catch (err: any) {
      Alert.alert('Pairing Failed', err.message || 'Could not reach the TV.');
    } finally {
      setIsPairing(false);
    }
  }, [manager, tvIp, tvPort]);

  const handleConfirmPairing = useCallback(async () => {
    if (!pairingCode || !tvIp.trim()) return;

    setIsPairing(true);
    try {
      const port = parseInt(tvPort || '8282', 10);
      const tv = await manager.completePairing(
        tvIp.trim(),
        port,
        'manual-session',
        pairingCode,
        `ZStream TV (${tvIp.trim()})`,
      );
      setTvIp('');
      setPairingCode(null);
      setShowPairModal(false);
      loadTVs();
      Alert.alert('Paired!', `${tv.tvName} is now connected.`);
    } catch (err: any) {
      Alert.alert('Pairing Failed', err.message || 'Something went wrong.');
    } finally {
      setIsPairing(false);
    }
  }, [manager, pairingCode, tvIp, tvPort, loadTVs]);

  const handleCopyCode = useCallback(() => {
    if (pairingCode) {
      Alert.alert('Pairing Code', `Enter ${pairingCode} on your TV.`);
    }
  }, [pairingCode]);

  return (
    <ThemedView variant="background" style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.TEXT_PRIMARY}
          />
        }>
        {/* Info */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.SURFACE, borderRadius: radii.md, padding: spacing.md },
          ]}>
          <ThemedText variant="headline" style={styles.infoTitle}>
            Sync your phone to your TV
          </ThemedText>
          <ThemedText variant="footnote" color="secondary" style={styles.infoBody}>
            Pair a ZStream TV on your local network to sync your watch history,
            bookmarks, and cast content directly to your screen.
          </ThemedText>
        </View>

        {/* Paired TVs */}
        <View style={[styles.section, { marginTop: spacing.lg }]}>
          <ThemedText variant="footnote" color="secondary" style={styles.sectionHeader}>
            PAIRED DEVICES ({pairedTVs.length})
          </ThemedText>

          {pairedTVs.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.SURFACE, borderRadius: radii.md, padding: spacing.lg },
              ]}>
              <ThemedText variant="body" color="secondary" style={styles.emptyText}>
                No paired devices yet.
              </ThemedText>
              <ThemedText variant="footnote" color="muted" style={styles.emptyText}>
                Tap "Pair New Device" to connect.
              </ThemedText>
            </View>
          ) : (
            pairedTVs.map((tv) => (
              <TVRow key={tv.id} tv={tv} onRemove={handleRemoveTV} />
            ))
          )}
        </View>

        {/* Pair button */}
        <TouchableOpacity
          style={[
            styles.pairButton,
            { backgroundColor: colors.PRIMARY, borderRadius: radii.md, paddingVertical: 14 },
          ]}
          onPress={() => setShowPairModal(true)}
          activeOpacity={0.8}>
          <ThemedText variant="headline" style={styles.pairButtonText}>
            + Pair New Device
          </ThemedText>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Pair Modal */}
      <Modal
        visible={showPairModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowPairModal(false);
          setPairingCode(null);
        }}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.BACKGROUND, borderRadius: radii.lg },
            ]}>
            <ThemedText variant="title2" style={styles.modalTitle}>
              Pair a New Device
            </ThemedText>

            {pairingCode ? (
              <View style={styles.codeContainer}>
                <ThemedText variant="body" color="secondary" style={styles.codeLabel}>
                  Enter this code on your TV:
                </ThemedText>
                <TouchableOpacity onPress={handleCopyCode}>
                  <ThemedText variant="h1" color="primary" style={styles.codeText}>
                    {pairingCode}
                  </ThemedText>
                </TouchableOpacity>
                <ThemedText variant="footnote" color="muted" style={styles.codeHint}>
                  The TV should be open to the pairing screen and on the same Wi-Fi network.
                </ThemedText>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.PRIMARY, borderRadius: radii.sm }]}
                    onPress={handleConfirmPairing}
                    disabled={isPairing}>
                    {isPairing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <ThemedText variant="headline" style={{ color: '#FFF' }}>Confirm</ThemedText>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { borderRadius: radii.sm }]}
                    onPress={() => {
                      setPairingCode(null);
                      setTvIp('');
                    }}>
                    <ThemedText variant="headline" color="secondary">Back</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <ThemedText variant="footnote" color="secondary" style={styles.inputLabel}>
                  TV IP ADDRESS
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.SURFACE,
                      color: colors.TEXT_PRIMARY,
                      borderRadius: radii.md,
                      borderColor: colors.SEPARATOR,
                    },
                  ]}
                  placeholder="e.g. 192.168.1.42"
                  placeholderTextColor={colors.MUTED}
                  value={tvIp}
                  onChangeText={setTvIp}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numeric"
                  returnKeyType="next"
                />

                <ThemedText variant="footnote" color="secondary" style={styles.inputLabel}>
                  PORT
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.SURFACE,
                      color: colors.TEXT_PRIMARY,
                      borderRadius: radii.md,
                      borderColor: colors.SEPARATOR,
                    },
                  ]}
                  placeholder="8282"
                  placeholderTextColor={colors.MUTED}
                  value={tvPort}
                  onChangeText={setTvPort}
                  autoCapitalize="none"
                  keyboardType="numeric"
                  returnKeyType="go"
                  onSubmitEditing={handleInitiatePair}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.PRIMARY, borderRadius: radii.sm }]}
                    onPress={handleInitiatePair}
                    disabled={isPairing}>
                    {isPairing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <ThemedText variant="headline" style={{ color: '#FFF' }}>Start Pairing</ThemedText>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { borderRadius: radii.sm }]}
                    onPress={() => setShowPairModal(false)}>
                    <ThemedText variant="headline" color="secondary">Cancel</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  infoCard: {},
  infoTitle: {
    marginBottom: 6,
  },
  infoBody: {
    lineHeight: 18,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  tvIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowInfo: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 18,
  },
  pairButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  pairButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    marginBottom: 16,
  },
  inputLabel: {
    marginLeft: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    marginRight: 8,
  },
  cancelButton: {
    marginRight: 0,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  codeContainer: {
    alignItems: 'center',
  },
  codeLabel: {
    marginBottom: 8,
    textAlign: 'center',
  },
  codeText: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 6,
    marginVertical: 12,
  },
  codeHint: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
});

export default TVSyncScreen;