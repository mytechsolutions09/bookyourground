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
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, CheckCircle, Send } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const { signIn, profile, user, resetPassword } = useAuth();
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
      setShowSuccessModal(true);
      
      const adminEmail = 'invirtualcoin@gmail.com';
      const isSuperAdmin =
        profile?.role === 'super_admin' ||
        (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase() ||
        email.toLowerCase() === adminEmail.toLowerCase();

      const isGroundOwner = profile?.role === 'ground_owner';
      const redirectPath = typeof redirect === 'string' ? redirect : null;

      setTimeout(() => {
        setShowSuccessModal(false);
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
      }, 1500);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      if (Platform.OS === 'web') {
        alert('Please enter your email to reset your password');
      } else {
        Alert.alert('Email Required', 'Please enter your email to reset your password');
      }
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') {
        alert('Error: ' + error.message);
      } else {
        Alert.alert('Error', error.message);
      }
    } else {
      setShowResetModal(true);
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
              <View style={webStyles.formCard}>
                <View style={webStyles.header}>
                  <TouchableOpacity onPress={() => router.replace('/')}>
                    <Image
                      source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                      style={webStyles.logoImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Text style={webStyles.formTitle}>Sign In</Text>
                  <Text style={webStyles.formSubtitle}>Access your account to book grounds</Text>
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
  
                  <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={webStyles.forgotWrap}>
                    <Text style={webStyles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
  
                  <View style={webStyles.buttonRow}>
                    <TouchableOpacity
                      style={[webStyles.button, loading && { opacity: 0.7 }]}
                      onPress={handleLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#043529" size="small" />
                      ) : (
                        <Text style={webStyles.buttonText}>SIGN IN</Text>
                      )}
                    </TouchableOpacity>
  
                    <TouchableOpacity
                      style={webStyles.outlineButton}
                      onPress={() => router.push('/(auth)/signup')}
                    >
                      <Text style={webStyles.outlineButtonText}>SIGN UP</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
              <View style={StyleSheet.absoluteFillObject}>
                <View style={{ flex: 1, backgroundColor: 'rgba(4,53,41,0.4)' }} />
              </View>
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
  
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
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
                <ActivityIndicator color="#043529" size="small" />
              ) : (
                <Text style={styles.signInBtnText}>SIGN IN</Text>
              )}
            </Pressable>
  
            <Pressable
              style={({ pressed }) => [
                styles.outlineBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text style={styles.outlineBtnText}>SIGN UP</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Login Success Modal - Optional but good for consistency */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <View style={[modalStyles.iconBg, { backgroundColor: 'rgba(0,234,107,0.1)' }]}>
              <CheckCircle size={40} color="#00ea6b" strokeWidth={2.5} />
            </View>
            <Text style={modalStyles.title}>Welcome Back!</Text>
            <Text style={modalStyles.message}>Signed in successfully. redirecting you...</Text>
          </View>
        </View>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <View style={[modalStyles.iconBg, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
              <Send size={40} color="#10b981" strokeWidth={2.5} />
            </View>
            <Text style={modalStyles.title}>Email Sent!</Text>
            <Text style={modalStyles.message}>A password reset link has been sent to your email address.</Text>
            <TouchableOpacity
              style={modalStyles.button}
              onPress={() => setShowResetModal(false)}
            >
              <Text style={modalStyles.buttonText}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Simple web-only text input (reuse existing web layout) ─────────────────
function WebInput(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && (
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#E5E7EB', marginBottom: 4 }}>
          {label}
        </Text>
      )}
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#00ea6b',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          fontSize: 14,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  signInBtn: {
    flex: 1,
    backgroundColor: '#00ea6b',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signInBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#043529',
    letterSpacing: 0.5,
  },
  outlineBtn: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#00ea6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00ea6b',
    letterSpacing: 0.5,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginRight: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 16,
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 50,
    marginBottom: 8,
  },
  form: {
    gap: 4,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#06392e',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f9fafb',
    marginTop: 4,
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroImage: {
    flex: 1,
    width: '50%' as any,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#043529',
    letterSpacing: 0.5,
  },
  outlineButton: {
    flex: 1,
    borderRadius: 8,
    height: 40,
    borderWidth: 1.5,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase' as any,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,53,41,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#06392e',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,234,107,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 8,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#00ea6b',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#043529',
    letterSpacing: 1,
  },
});
