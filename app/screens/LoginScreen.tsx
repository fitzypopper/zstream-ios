/**
 * LoginScreen - ZStream authentication screen.
 * Supports passkey and passphrase login methods.
 */
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import {
  loginWithPassphrase,
  startPasskeyLogin,
} from '../api/auth';
import { setAuthToken, setUserProfile, setUserId, notifyAuthChanged } from '../config/env';

type LoginMethod = 'passphrase' | 'passkey';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { colors, radii } = useTheme();
  const [method, setMethod] = useState<LoginMethod>('passphrase');
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePassphraseLogin = async () => {
    if (!passphrase.trim()) {
      setError('Please enter your passphrase');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await loginWithPassphrase(passphrase.trim());
      await setAuthToken(response.token);
      await setUserId(response.userId);
      if (response.profile) {
        await setUserProfile(JSON.stringify(response.profile));
      }
      notifyAuthChanged();
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      // Navigation will automatically switch to Main screen
      // because RootNavigator checks authentication state
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your passphrase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await startPasskeyLogin();
      // In a real app, this would trigger iOS passkey flow
      // For now, show an alert that passkey is coming soon
      Alert.alert(
        'Passkey Login',
        'Passkey login will be available in a future update. Please use passphrase login for now.',
      );
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Passkey login failed.');
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if (method === 'passphrase') {
      handlePassphraseLogin();
    } else {
      handlePasskeyLogin();
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
              Your movies, your way
            </ThemedText>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Method Toggle */}
            <View style={[styles.methodToggle, { backgroundColor: colors.SURFACE, borderRadius: radii.md }]}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  method === 'passphrase' && { backgroundColor: colors.PRIMARY },
                  { borderRadius: radii.md },
                ]}
                onPress={() => setMethod('passphrase')}
                activeOpacity={0.8}>
                <ThemedText
                  variant="body"
                  color={method === 'passphrase' ? 'primary' : 'secondary'}>
                  Passphrase
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  method === 'passkey' && { backgroundColor: colors.PRIMARY },
                  { borderRadius: radii.md },
                ]}
                onPress={() => setMethod('passkey')}
                activeOpacity={0.8}>
                <ThemedText
                  variant="body"
                  color={method === 'passkey' ? 'primary' : 'secondary'}>
                  Passkey
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Input Fields */}
            {method === 'passphrase' && (
              <View style={styles.inputContainer}>
                <ThemedText variant="small" color="secondary" style={styles.inputLabel}>
                  Enter your passphrase
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
                  placeholder="word1 word2 word3..."
                  placeholderTextColor={colors.MUTED}
                  value={passphrase}
                  onChangeText={(text) => {
                    setPassphrase(text);
                    setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                {error && (
                  <ThemedText variant="small" color="error" style={styles.errorText}>
                    {error}
                  </ThemedText>
                )}
              </View>
            )}

            {method === 'passkey' && (
              <View style={styles.passkeyInfo}>
                <ThemedText variant="body" color="secondary" style={styles.passkeyInfoText}>
                  Use your device's passkey to sign in securely. This uses Face ID, Touch ID, or your device passcode.
                </ThemedText>
                {error && (
                  <ThemedText variant="small" color="error" style={styles.errorText}>
                    {error}
                  </ThemedText>
                )}
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: colors.PRIMARY, borderRadius: radii.md },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <ActivityIndicator color={colors.TEXT_PRIMARY} size="small" />
              ) : (
                <ThemedText variant="body" style={styles.loginButtonText}>
                  {method === 'passphrase' ? 'Sign In' : 'Continue with Passkey'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText variant="small" color="muted" style={styles.footerText}>
              Don't have an account?{' '}
              <ThemedText variant="small" color="accent">
                Sign Up
              </ThemedText>
            </ThemedText>
          </View>
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
  methodToggle: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 24,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
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
  passkeyInfo: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  passkeyInfoText: {
    textAlign: 'center',
    lineHeight: 22,
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
