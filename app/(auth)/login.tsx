import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { signIn, profile, user } = useAuth();
  const os = Platform.OS as string;
  const { width } = useWindowDimensions();
  const showHeroImage = os === 'web' && width >= 900;

  const { redirect, date, time, teams } = useLocalSearchParams();

  const handleLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        alert('Please fill in all fields');
      } else {
        Alert.alert('Error', 'Please fill in all fields');
      }
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') {
        alert('Login Failed: ' + error.message);
      } else {
        Alert.alert('Login Failed', error.message);
      }
    } else {
      const adminEmail = 'invirtualcoin@gmail.com';
      const isSuperAdmin =
        profile?.role === 'super_admin' ||
        (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase() ||
        email.toLowerCase() === adminEmail.toLowerCase();

      const isGroundOwner = profile?.role === 'ground_owner';
      const redirectPath = typeof redirect === 'string' ? redirect : null;

      if (!isSuperAdmin && !isGroundOwner && redirectPath) {
        let finalUrl = redirectPath;
        const extraParams = new URLSearchParams();
        if (typeof date === 'string' && date) extraParams.set('date', date);
        if (typeof time === 'string' && time) extraParams.set('time', time);
        if (typeof teams === 'string' && teams) extraParams.set('teams', teams);

        if (Array.from(extraParams.keys()).length > 0) {
          const hasQuery = redirectPath.includes('?');
          finalUrl += (hasQuery ? '&' : '?') + extraParams.toString();
        }

        router.replace(finalUrl as any);
        return;
      }

      if (isSuperAdmin) router.replace('/(admin)/dashboard');
      else if (isGroundOwner) router.replace('/(owner)/grounds');
      else router.replace('/(tabs)/bookings');
    }
  };

  useEffect(() => {
    if (os !== 'web') return;
    if (!user) return;
    if (!profile) return;

    if (profile.role === 'super_admin') router.replace('/(admin)/dashboard');
    else if (profile.role === 'ground_owner') router.replace('/(owner)/grounds');
    else router.replace('/(tabs)/bookings');
  }, [os, user, profile]);

  // ── Web layout (unchanged split design) ──────────────────────────────────
  if (os === 'web') {
    return (
      <KeyboardAvoidingView behavior="height" style={webStyles.container}>
        <View style={webStyles.scrollContent}>
          <View style={webStyles.heroColumn}>
            <View style={webStyles.formContainer}>
              <View style={webStyles.header}>
                <TouchableOpacity onPress={() => router.replace('/')}>
                  <Text style={webStyles.logoText}>Book my ground</Text>
                </TouchableOpacity>
              </View>

              <View style={webStyles.form}>
                <WebInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <WebInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoComplete="password"
                />

                <TouchableOpacity
                  style={[webStyles.button, loading && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#043529" />
                  ) : (
                    <Text style={webStyles.buttonText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={webStyles.outlineButton}
                  onPress={() => router.push('/(auth)/signup')}
                >
                  <Text style={webStyles.outlineButtonText}>
                    Don't have an account? Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {showHeroImage && (
            <View style={webStyles.heroImage}>
              <Image
                source={require('../../assets/signup-stadium.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#f9fafb" strokeWidth={2.5} />
        </Pressable>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="BookYourGround"
          />
        </View>

        {/* Heading */}
        <View style={styles.headingWrap}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to book your next game</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          {/* Email field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View
              style={[
                styles.inputRow,
                emailFocused && styles.inputRowFocused,
              ]}
            >
              <Mail size={17} color={emailFocused ? '#00ea6b' : '#6b7280'} strokeWidth={2} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#4b5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View
              style={[
                styles.inputRow,
                passwordFocused && styles.inputRowFocused,
              ]}
            >
              <Lock size={17} color={passwordFocused ? '#00ea6b' : '#6b7280'} strokeWidth={2} />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPassword}
                autoComplete="password"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                {showPassword ? (
                  <EyeOff size={17} color="#6b7280" strokeWidth={2} />
                ) : (
                  <Eye size={17} color="#6b7280" strokeWidth={2} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Sign In button */}
          <Pressable
            style={({ pressed }) => [
              styles.signInBtn,
              pressed && { opacity: 0.88 },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#043529" />
            ) : (
              <Text style={styles.signInBtnText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Sign up link */}
        <View style={styles.signUpRow}>
          <Text style={styles.signUpHint}>Don't have an account?</Text>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signUpLink}> Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Simple web-only text input (reuse existing web layout) ─────────────────
function WebInput(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#E5E7EB', marginBottom: 8 }}>
          {label}
        </Text>
      )}
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#00ea6b',
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          backgroundColor: '#06392e',
          color: '#f9fafb',
        }}
        placeholderTextColor="#6b7280"
        {...rest}
      />
    </View>
  );
}

// ── Mobile styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#043529',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#06392e',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 8,
  },
  logo: {
    width: 180,
    height: 48,
  },
  headingWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '400',
  },
  card: {
    backgroundColor: '#06392e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.12)',
    gap: 4,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043529',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,234,107,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  inputRowFocused: {
    borderColor: '#00ea6b',
    backgroundColor: 'rgba(4,53,41,0.9)',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#f9fafb',
    paddingVertical: 0,
  },
  signInBtn: {
    marginTop: 8,
    backgroundColor: '#00ea6b',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  signInBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#043529',
    letterSpacing: 0.2,
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  signUpHint: {
    fontSize: 14,
    color: '#6b7280',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00ea6b',
  },
});

// ── Web styles (matching original web layout exactly) ──────────────────────
const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#043529',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    flexDirection: 'row-reverse' as any,
    alignItems: 'stretch',
    width: '100%',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#02c259',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  form: {
    gap: 4,
    flex: 1,
  },
  heroColumn: {
    flex: 1,
    width: '50%' as any,
  },
  formContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#043529',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  heroImage: {
    flex: 1,
    width: '50%' as any,
    overflow: 'hidden',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#01e669',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outlineButton: {
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#01e669',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#01e669',
  },
});
