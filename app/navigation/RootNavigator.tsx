/**
 * RootNavigator - Main navigation configuration for ZStream.
 * Sets up bottom tabs and stack navigation with iOS-native styling.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, ActivityIndicator, Text, View, StyleSheet } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import LatestScreen from '../screens/LatestScreen';
import LatestTvScreen from '../screens/LatestTvScreen';
import SearchScreen from '../screens/SearchScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import TraktScreen from '../screens/TraktScreen';
import TVSyncScreen from '../screens/TVSyncScreen';
import DetailsScreen from '../screens/DetailsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import { RootStackParamList, TabParamList } from './types';
import { colors } from '../theme/colors';
import { isAuthenticated, addAuthListener } from '../config/env';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * TabNavigator - Bottom tab navigation with iOS-native styling.
 */
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.SURFACE,
          borderTopColor: colors.SEPARATOR,
          borderTopWidth: 0.5,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.PRIMARY,
        tabBarInactiveTintColor: colors.MUTED,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          ...Platform.select({ ios: { fontFamily: 'System' } }),
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="house.fill" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Latest"
        component={LatestScreen}
        options={{
          tabBarLabel: 'Movies',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="film" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="LatestTV"
        component={LatestTvScreen}
        options={{
          tabBarLabel: 'TV Shows',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="tv" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="magnifyingglass" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="square.stack" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Simple tab icon component using Unicode symbols.
 * In production, you'd use react-native-sfsymbols or similar.
 */
const TabIcon: React.FC<{ name: string; color: string; size: number }> = ({
  name,
  color,
  size,
}) => {
  const iconMap: Record<string, string> = {
    'house.fill': '🏠',
    'film': '🎬',
    'tv': '📺',
    'magnifyingglass': '🔍',
    'square.stack': '📚',
    'gearshape': '⚙️',
  };

  return (
    <React.Fragment>
      {React.createElement(
        require('react-native').Text,
        { style: { fontSize: size - 4, color } },
        iconMap[name] || '•',
      )}
    </React.Fragment>
  );
};

/**
 * RootNavigator - Main stack navigator wrapping tab navigation.
 */
const RootNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [bootTimedOut, setBootTimedOut] = useState(false);

  const checkAuth = useCallback(async () => {
    const authenticated = await isAuthenticated();
    setIsLoggedIn(authenticated);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for auth state changes (login/logout)
  useEffect(() => {
    const removeListener = addAuthListener((authenticated) => {
      setIsLoggedIn(authenticated);
    });
    return () => removeListener();
  }, []);

  // If the auth check hangs on a physical device (e.g. native storage bridge
  // dead), isLoggedIn stays null forever -> previously a permanent black
  // screen. Surface it so sideloaded builds can be diagnosed without a Mac.
  useEffect(() => {
    const timer = setTimeout(() => setBootTimedOut(true), 6000);
    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  if (isLoggedIn === null) {
    return (
      <View style={styles.bootContainer}>
        {!bootTimedOut && <ActivityIndicator color={colors.PRIMARY} />}
        {bootTimedOut && (
          <Text style={styles.bootStuck}>
            Startup stuck: auth check did not resolve after 6s (native storage
            bridge may not be responding).
          </Text>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.BACKGROUND,
          },
          headerTintColor: colors.PRIMARY,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.TEXT_PRIMARY,
          },
          contentStyle: {
            backgroundColor: colors.BACKGROUND,
          },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}>
        {!isLoggedIn ? (
          <Stack.Screen
            name="Login"
            options={{ headerShown: false }}
            component={LoginScreen}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Details"
              component={DetailsScreen}
              options={{
                headerTitle: '',
                headerTransparent: true,
                headerTintColor: colors.TEXT_PRIMARY,
              }}
            />
            <Stack.Screen
              name="Player"
              component={PlayerScreen}
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerTitle: 'Settings',
                headerLargeTitle: true,
              }}
            />
            <Stack.Screen
              name="Downloads"
              component={DownloadsScreen}
              options={{
                headerTitle: 'Downloads',
                headerLargeTitle: true,
              }}
            />
            <Stack.Screen
              name="TVSync"
              component={TVSyncScreen}
              options={{
                headerTitle: 'Sync with TV',
              }}
            />
            <Stack.Screen
              name="Trakt"
              component={TraktScreen}
              options={{
                headerTitle: 'Trakt',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  bootStuck: {
    color: colors.WARNING,
    fontSize: 14,
    textAlign: 'center',
  },
});
