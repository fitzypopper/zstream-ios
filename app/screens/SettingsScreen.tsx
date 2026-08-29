/**
 * SettingsScreen - ZStream settings with Apple-native iOS styling.
 * Settings are loaded from and persisted to the ZStream backend.
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import {
  SettingItem,
  Separator,
  SwitchRow,
  ChoiceRow,
  KeyRow,
  type Option,
} from '../components/settings/SettingsRows';
import { clearUserData, notifyAuthChanged } from '../config/env';
import { getUIPreference, setUIPreference } from '../native/nativeAuth';
import { getTVSyncManager } from '../services/tvSync';
import { RootStackParamList } from '../navigation/types';
import { useSettingsActions } from '../hooks/useUserSettings';
import {
  THEME_OPTIONS,
  FONT_OPTIONS,
  VIDEO_SCALE_OPTIONS,
  PLAYBACK_SPEED_OPTIONS,
  GRID_ROWS_OPTIONS,
  SUBTITLE_LANGUAGE_OPTIONS,
  KEY_SETTINGS,
} from '../services/settings';
import type { UserSettings } from '../api/types';

function labelize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const SettingsScreen: React.FC = () => {
  const { colors, radii, spacing } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { settings, isLoading, update } = useSettingsActions();
  const [pairedDeviceCount, setPairedDeviceCount] = useState(0);

  React.useEffect(() => {
    getTVSyncManager()
      .getPairedTVs()
      .then((tvs) => setPairedDeviceCount(tvs.length))
      .catch(() => {});
  }, []);

  const setSetting = (patch: Partial<UserSettings>) => update(patch);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearUserData();
          notifyAuthChanged();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <ThemedView variant="background" style={styles.container}>
        <ThemedText style={{ textAlign: 'center', marginTop: 120 }} color="secondary">
          Loading settings…
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SettingsSections
          settings={settings}
          setSetting={setSetting}
          pairedDeviceCount={pairedDeviceCount}
          onNavigate={navigation.navigate as never}
          colors={colors}
          radii={radii}
        />
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.SURFACE, borderRadius: radii.md, marginTop: spacing.lg }]}
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

interface SectionProps {
  settings: UserSettings;
  setSetting: (patch: Partial<UserSettings>) => void;
  pairedDeviceCount: number;
  onNavigate: (screen: keyof RootStackParamList, params?: unknown) => void;
  colors: Record<string, string>;
  radii: Record<string, number>;
}

const SettingsSections: React.FC<SectionProps> = ({
  settings: s,
  setSetting: u,
  pairedDeviceCount,
  onNavigate,
  colors,
  radii,
}) => {
  return (
    <>
      <SectionHeader>ACCOUNT</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <SettingItem title="Profile" subtitle="Manage your account" onPress={() => {}} />
        <Separator />
        <SettingItem
          title="Subscription"
          subtitle="Premium • Active"
          rightElement={
            <View style={[styles.badge, { backgroundColor: colors.SUCCESS }]}>
              <ThemedText variant="caption2" style={styles.badgeText}>
                Active
              </ThemedText>
            </View>
          }
          onPress={() => {}}
        />
      </SectionBody>

      <SectionHeader>INTERFACE</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <InterfaceRow colors={colors} radii={radii} />
      </SectionBody>

      <SectionHeader>APPEARANCE</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <ChoiceRow
          title="Theme"
          value={s.applicationTheme ?? 'dark'}
          options={asOptions(THEME_OPTIONS)}
          onSelect={(value) => u({ applicationTheme: String(value) })}
        />
        <Separator />
        <ChoiceRow
          title="Font"
          value={s.applicationFont ?? 'system'}
          options={asOptions(FONT_OPTIONS)}
          onSelect={(value) => u({ applicationFont: String(value) })}
        />
        <Separator />
        <ChoiceRow
          title="Grid Rows"
          value={s.gridRows ?? 3}
          options={GRID_ROWS_OPTIONS.map((value) => ({ value, label: `${value} rows` }))}
          onSelect={(value) => u({ gridRows: Number(value) })}
        />
        <Separator />
        <SwitchRow
          title="Image Logos"
          subtitle="Show brand logos on cards"
          value={Boolean(s.enableImageLogos)}
          onChange={(value) => u({ enableImageLogos: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Minimal Cards"
          subtitle="Compact poster tiles"
          value={Boolean(s.enableMinimalCards)}
          onChange={(value) => u({ enableMinimalCards: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Carousel View"
          value={Boolean(s.enableCarouselView)}
          onChange={(value) => u({ enableCarouselView: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Thumbnails"
          subtitle="Preview images on seek bar"
          value={Boolean(s.enableThumbnails)}
          onChange={(value) => u({ enableThumbnails: value })}
          tint={colors.PRIMARY}
        />
      </SectionBody>

      <SectionHeader>PLAYBACK</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <SwitchRow
          title="Auto-play next episode"
          value={Boolean(s.enableAutoplay)}
          onChange={(value) => u({ enableAutoplay: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Skip credits"
          subtitle="Automatically skip closing credits"
          value={Boolean(s.enableSkipCredits)}
          onChange={(value) => u({ enableSkipCredits: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Auto-skip segments"
          subtitle="Skip intros, recaps and filler"
          value={Boolean(s.enableAutoSkipSegments)}
          onChange={(value) => u({ enableAutoSkipSegments: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Resume on playback error"
          value={Boolean(s.enableAutoResumeOnPlaybackError)}
          onChange={(value) => u({ enableAutoResumeOnPlaybackError: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Double-tap to seek"
          value={Boolean(s.enableDoubleClickToSeek)}
          onChange={(value) => u({ enableDoubleClickToSeek: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Hold to boost"
          subtitle="Press-hold for temporary 2x speed"
          value={Boolean(s.enableHoldToBoost)}
          onChange={(value) => u({ enableHoldToBoost: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Number-key seeking"
          value={Boolean(s.enableNumberKeySeeking)}
          onChange={(value) => u({ enableNumberKeySeeking: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Pause overlay"
          subtitle="Show pause overlay on screen lock"
          value={Boolean(s.enablePauseOverlay)}
          onChange={(value) => u({ enablePauseOverlay: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Side gestures"
          subtitle="Brightness/volume swipe gestures"
          value={Boolean(s.enableSideGestures)}
          onChange={(value) => u({ enableSideGestures: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <ChoiceRow
          title="Default Playback Speed"
          value={s.defaultPlaybackSpeed ?? 1}
          options={PLAYBACK_SPEED_OPTIONS.map((value) => ({ value, label: `${value}×` }))}
          onSelect={(value) => u({ defaultPlaybackSpeed: Number(value) })}
        />
        <Separator />
        <ChoiceRow
          title="Video Scale"
          value={s.videoScaleMode ?? 'contain'}
          options={asOptions(VIDEO_SCALE_OPTIONS)}
          onSelect={(value) => u({ videoScaleMode: String(value) })}
        />
        <Separator />
        <SwitchRow
          title="Picture-in-Picture"
          value={Boolean(s.autoPipEnabled)}
          onChange={(value) => u({ autoPipEnabled: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Background playback"
          subtitle="Keep playing on screen lock"
          value={Boolean(s.enableBackgroundPlaybackOnScreenLock)}
          onChange={(value) => u({ enableBackgroundPlaybackOnScreenLock: value })}
          tint={colors.PRIMARY}
        />
      </SectionBody>

      <SectionHeader>SUBTITLES</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <SwitchRow
          title="Native subtitles"
          subtitle="Use built-in subtitle rendering"
          value={Boolean(s.enableNativeSubtitles)}
          onChange={(value) => u({ enableNativeSubtitles: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <ChoiceRow
          title="Default Language"
          value={s.defaultSubtitleLanguage || 'off'}
          options={SUBTITLE_LANGUAGE_OPTIONS}
          onSelect={(value) =>
            u({ defaultSubtitleLanguage: value === 'off' ? '' : String(value) })
          }
        />
      </SectionBody>

      <SectionHeader>INTEGRATIONS</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <SettingItem
          title="Trakt"
          subtitle="Sync your watch history"
          onPress={() => onNavigate('Trakt')}
        />
        <Separator />
        <SettingItem
          title="Debrid Service"
          subtitle={s.debridService || 'Not configured'}
          onPress={() => {}}
        />
        {KEY_SETTINGS.map(({ key, label }, index) => (
          <React.Fragment key={key}>
            {index > 0 && <Separator />}
            <KeyRow
              label={label}
              value={s[key] as string | undefined}
              isSecret={
                key === 'debridToken' ||
                key === 'febboxKey' ||
                key === 'tidbKey' ||
                key === 'wyzieKey'
              }
              onSave={(value) => u({ [key]: value } as Partial<UserSettings>)}
            />
          </React.Fragment>
        ))}
      </SectionBody>

      <SectionHeader>SOURCES</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <SwitchRow
          title="Manual source selection"
          subtitle="Choose a source before playback"
          value={Boolean(s.manualSourceSelection)}
          onChange={(value) => u({ manualSourceSelection: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Remember last source"
          value={Boolean(s.enableLastSuccessfulSource)}
          onChange={(value) => u({ enableLastSuccessfulSource: value })}
          tint={colors.PRIMARY}
        />
        <Separator />
        <SwitchRow
          title="Use proxy for TMDB"
          value={Boolean(s.proxyTmdb)}
          onChange={(value) => u({ proxyTmdb: value })}
          tint={colors.PRIMARY}
        />
      </SectionBody>

      <SectionHeader>DOWNLOADS</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <SettingItem
          title="Manage Downloads"
          subtitle="View, resume, remove offline titles"
          onPress={() => onNavigate('Downloads')}
        />
      </SectionBody>

      <SectionHeader>SYNC</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <SettingItem
          title="Pair with TV"
          subtitle="Sync content to your TV"
          onPress={() => onNavigate('TVSync')}
        />
        <Separator />
        <SettingItem
          title="Paired Devices"
          subtitle={`${pairedDeviceCount} device${pairedDeviceCount === 1 ? '' : 's'}`}
          onPress={() => onNavigate('TVSync')}
        />
      </SectionBody>

      <SectionHeader>ABOUT</SectionHeader>
      <SectionBody colors={colors} radii={radii}>
        <SettingItem title="Version" subtitle="1.0.0 (Build 1)" showDisclosure={false} />
        <Separator />
        <SettingItem title="Terms of Service" onPress={() => {}} />
        <Separator />
        <SettingItem title="Privacy Policy" onPress={() => {}} />
      </SectionBody>
    </>
  );
};

const asOptions = (values: readonly string[] | readonly number[]): Option[] =>
  values.map((value) => ({ value, label: labelize(String(value)) }));

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemedText variant="footnote" color="secondary" style={styles.sectionHeader}>
    {children}
  </ThemedText>
);

const SectionBody: React.FC<{ colors: Record<string, string>; radii: Record<string, number>; children: React.ReactNode }> = ({
  colors,
  radii,
  children,
}) => (
  <View style={[styles.sectionContent, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
    {children}
  </View>
);

/**
 * Lets the user pick the launched UI (React Native vs SwiftUI).
 * Backed by the native ZStreamAuth module (UserDefaults); needs a restart.
 */
const InterfaceRow: React.FC<{ colors: Record<string, string>; radii: Record<string, number> }> = ({
  colors,
  radii,
}) => {
  const [uiSelection, setUiSelection] = React.useState<'reactNative' | 'swiftUI'>('reactNative');

  React.useEffect(() => {
    let mounted = true;
    getUIPreference()
      .then((value) => {
        if (mounted) setUiSelection(value);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SectionBody colors={colors} radii={radii}>
      <ChoiceRow
        title="UI"
        value={uiSelection}
        options={[
          { value: 'reactNative', label: 'React Native' },
          { value: 'swiftUI', label: 'SwiftUI' },
        ]}
        onSelect={(value) => {
          const next: 'reactNative' | 'swiftUI' = value === 'swiftUI' ? 'swiftUI' : 'reactNative';
          setUiSelection(next);
          setUIPreference(next)
            .then(() => {
              Alert.alert(
                'Restart required',
                'Fully close and reopen ZStream to switch the interface.',
              );
            })
            .catch(() => {});
        }}
      />
    </SectionBody>
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
  sectionHeader: {
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 24,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    overflow: 'hidden',
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