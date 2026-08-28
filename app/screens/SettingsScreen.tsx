/**
 * SettingsScreen - ZStream settings with Apple-native iOS styling.
 * Uses grouped list style like iOS Settings app.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { clearUserData, notifyAuthChanged } from '../config/env';
import { getTVSyncManager } from '../services/tvSync';
import { RootStackParamList } from '../navigation/types';

interface SettingItemProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showDisclosure?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  rightElement,
  onPress,
  showDisclosure = true,
}) => {
  return (
    <TouchableOpacity
      style={[styles.settingItem, { paddingVertical: 12, paddingHorizontal: 16 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}>
      <View style={styles.settingInfo}>
        <ThemedText variant="body">{title}</ThemedText>
        {subtitle && (
          <ThemedText variant="footnote" color="secondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showDisclosure && onPress && (
          <ThemedText variant="body" color="muted" style={styles.disclosure}>
            ›
          </ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );
};

const SettingsScreen: React.FC = () => {
  const { colors, radii } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [autoPlay, setAutoPlay] = useState(true);
  const [skipCredits, setSkipCredits] = useState(true);
  const [pairedDeviceCount, setPairedDeviceCount] = useState(0);

  useEffect(() => {
    getTVSyncManager()
      .getPairedTVs()
      .then((tvs) => setPairedDeviceCount(tvs.length))
      .catch(() => {});
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearUserData();
            notifyAuthChanged();
            // RootNavigator swaps to Login screen via auth listener
          },
        },
      ],
    );
  };

  return (
    <ThemedView variant="background" style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <ThemedText variant="footnote" color="secondary" style={styles.sectionHeader}>
            ACCOUNT
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
            <SettingItem
              title="Profile"
              subtitle="Manage your account"
              onPress={() => {}}
            />
            <View style={[styles.separator, { backgroundColor: colors.SEPARATOR }]} />
            <SettingItem
              title="Subscription"
              subtitle="Premium • Active"
              rightElement={
                <View style={[styles.badge, { backgroundColor: colors.SUCCESS }]}>
                  <ThemedText variant="caption2" style={styles.badgeText}>Active</ThemedText>
                </View>
              }
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Playback Section */}
        <View style={styles.section}>
          <ThemedText variant="footnote" color="secondary" style={styles.sectionHeader}>
            PLAYBACK
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
            <SettingItem
              title="Auto-play next episode"
              rightElement={
                <Switch
                  value={autoPlay}
                  onValueChange={setAutoPlay}
                  trackColor={{ false: colors.FILL, true: colors.PRIMARY }}
                />
              }
              showDisclosure={false}
            />
            <View style={[styles.separator, { backgroundColor: colors.SEPARATOR }]} />
            <SettingItem
              title="Skip credits"
              rightElement={
                <Switch
                  value={skipCredits}
                  onValueChange={setSkipCredits}
                  trackColor={{ false: colors.FILL, true: colors.PRIMARY }}
                />
              }
              showDisclosure={false}
            />
            <View style={[styles.separator, { backgroundColor: colors.SEPARATOR }]} />
            <SettingItem
              title="Video Quality"
              subtitle="Auto (recommended)"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Integrations Section */}
        <View style={styles.section}>
          <ThemedText variant="footnote" color="secondary" style={styles.sectionHeader}>
            INTEGRATIONS
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
            <SettingItem
              title="Trakt"
              subtitle="Sync your watch history"
              onPress={() => navigation.navigate('Trakt')}
            />
            <View style={[styles.separator, { backgroundColor: colors.SEPARATOR }]} />
            <SettingItem
              title="Debrid Service"
              subtitle="RealDebrid"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Sync Section */}
        <View style={styles.section}>
          <ThemedText variant="footnote" color="secondary" style={styles.sectionHeader}>
            SYNC
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
            <SettingItem
              title="Pair with TV"
              subtitle="Sync content to your TV"
              onPress={() => navigation.navigate('TVSync')}
            />
            <View style={[styles.separator, { backgroundColor: colors.SEPARATOR }]} />
            <SettingItem
              title="Paired Devices"
              subtitle={`${pairedDeviceCount} device${pairedDeviceCount === 1 ? '' : 's'}`}
              onPress={() => navigation.navigate('TVSync')}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <ThemedText variant="footnote" color="secondary" style={styles.sectionHeader}>
            ABOUT
          </ThemedText>
          <View style={[styles.sectionContent, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
            <SettingItem
              title="Version"
              subtitle="1.0.0 (Build 1)"
              showDisclosure={false}
            />
            <View style={[styles.separator, { backgroundColor: colors.SEPARATOR }]} />
            <SettingItem
              title="Terms of Service"
              onPress={() => {}}
            />
            <View style={[styles.separator, { backgroundColor: colors.SEPARATOR }]} />
            <SettingItem
              title="Privacy Policy"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}
          onPress={handleSignOut}
          activeOpacity={0.8}>
          <ThemedText variant="body" color="error" style={styles.signOutText}>
            Sign Out
          </ThemedText>
        </TouchableOpacity>

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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disclosure: {
    marginLeft: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontWeight: '600',
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  signOutText: {
    fontWeight: '600',
  },
});

export default SettingsScreen;
