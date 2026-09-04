/**
 * LoginScreen - ZStream authentication screen.
 * Username + password login against the ZStream backend.
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { loginWithPassword, registerWithPassword } from '../api/auth';
import { setAuthToken, setUserProfile, setUserId, notifyAuthChanged } from '../config/env';
import { BUILD_TAG } from '../config/buildInfo';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { colors, radii } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const persistSession = async (response: {
    token: string;
    session?: { user?: string };
    user?: { id: string; nickname?: string; profile?: unknown };
  }) => {
    await setAuthToken(response.token);
    const userId = response.session?.user;
    if (userId) {
      await setUserId(userId);
    }
    if (response.user) {
      await setUserProfile(
        JSON.stringify({
          id: response.user.id,
          userId,
          nickname: response.user.nickname,
          profile: response.user.profile,
        }),
      );
    }
    notifyAuthChanged();
  };

  const handleSubmit = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError('Please enter your username and password');
      return;
    }
    if (isRegister && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = isRegister
        ? await registerWithPassword(trimmedUsername, password)
        : await loginWithPassword(trimmedUsername, password);
      await persistSession(response);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      // Navigation will automatically switch to Main screen
      // because RootNavigator checks authentication state
    } catch (err: any) {
      setError(
        isRegister
          ? err.message || 'Registration failed. Try a different username.'
          : err.message || 'Login failed. Please check your username and password.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView variant="background" style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Logo / Brand */}
          <View style={styles.brandContainer}>
            <View style={[styles.logoContainer, { backgroundColor: colors.PRIMARY }]}>
              <ThemedText variant="h1" style={styles.logoText}>
                Z
              </ThemedText>
            </View>
            <ThemedText variant="h1" style={styles.appName}>
              ZStream
            </ThemedText>
            <ThemedText variant="body" color="secondary" style={styles.tagline}>
              {isRegister ? 'Create your account' : 'Your movies, your way'}
            </ThemedText>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Input Fields */}
            <View style={styles.inputContainer}>
              <ThemedText variant="small" color="secondary" style={styles.inputLabel}>
                Username
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.SURFACE,
                    color: colors.TEXT_PRIMARY,
                    borderRadius: radii.md,
                    borderColor: error ? colors.ERROR : colors.CARD,
                  },
                ]}
                placeholder="username"
                placeholderTextColor={colors.MUTED}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText variant="small" color="secondary" style={styles.inputLabel}>
                Password
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.SURFACE,
                    color: colors.TEXT_PRIMARY,
                    borderRadius: radii.md,
                    borderColor: error ? colors.ERROR : colors.CARD,
                  },
                ]}
                placeholder="password"
                placeholderTextColor={colors.MUTED}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
              {error && (
                <ThemedText variant="small" color="error" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: colors.PRIMARY, borderRadius: radii.md },
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator color={colors.TEXT_PRIMARY} size="small" />
              ) : (
                <ThemedText variant="body" style={styles.loginButtonText}>
                  {isRegister ? 'Create Account' : 'Sign In'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {isRegister ? (
            <ThemedText variant="small" color="muted" style={styles.footerText}>
              Already have an account?{' '}
              <ThemedText
                variant="small"
                color="accent"
                onPress={() => {
                  setMode('login');
                  setError(null);
                }}>
                Sign In
              </ThemedText>
            </ThemedText>
          ) : (
            <ThemedText variant="small" color="muted" style={styles.footerText}>
              Don't have an account?{' '}
              <ThemedText
                variant="small"
                color="accent"
                onPress={() => {
                  setMode('register');
                  setError(null);
                }}>
                Sign Up
              </ThemedText>
            </ThemedText>
          )}
          </View>
          <ThemedText variant="small" color="muted" style={styles.footerText}>
            build {BUILD_TAG}
          </ThemedText>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  errorText: {
    marginTop: 8,
    marginLeft: 4,
  },
  loginButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    lineHeight: 20,
  },
});

export default LoginScreen;
