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
  ImageBackground,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, CheckCircle, Send } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

let TurnstileComponent: any = null;
if (Platform.OS === 'web') {
  try {
    // We use a local variable to avoid naming conflicts and ensure clean conditional loading
    const TurnstileModule = require('@marsidev/react-turnstile');
    TurnstileComponent = TurnstileModule.Turnstile;
  } catch (e) {
    console.warn('Turnstile module could not be loaded:', e);
  }
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  
  const swipeGesture = Gesture.Pan()
    .activeCursor('grabbing')
    .onEnd((e) => {
      // If swipe right (left to right) with enough velocity or distance
      if (e.translationX > 80 && e.velocityX > 400) {
        runOnJS(router.push)('/(tabs)/home_tab' as any);
      }
    });

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
    const { error } = await signIn(email, password, turnstileToken || undefined);
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
        
        // Redirection logic is now handled centraly in the useEffect above 
        // to avoid duplicate transitions and ensure consistency across platforms.
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
    if (!user || !profile) return;

    // Check for redirect param
    const redirectPath = typeof redirect === 'string' ? redirect : null;
    
    if (redirectPath) {
      // Re-construct the full URL if params were passed
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

    // Role-based defaults if no redirect path
    if (profile.role === 'super_admin') {
      router.replace('/(admin)/dashboard');
    } else {
      // For all other users (players & ground owners), take to home screen
      // If we can go back, go back to where they were intended to go
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home_tab');
      }
    }
  }, [user, profile, redirect, date, time, teams]);

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
                    onSubmitEditing={handleLogin}
                  />
  
                  <WebInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    autoComplete="password"
                    onSubmitEditing={handleLogin}
                  />

                  {Platform.OS === 'web' && TurnstileComponent && (
                    <View style={{ marginBottom: 16, alignItems: 'center', minHeight: 65 }}>
                      <TurnstileComponent
                        siteKey={process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAA4N2_8m7n6b5v4c'} 
                        onSuccess={(token: string) => {
                          console.log('Turnstile success');
                          setTurnstileToken(token);
                        }}
                        onExpire={() => {
                          console.warn('Turnstile expired');
                          setTurnstileToken(null);
                        }}
                        onError={(error: any) => {
                          console.error('Turnstile error:', error);
                          setTurnstileToken(null);
                        }}
                        options={{
                          theme: 'dark',
                          size: 'normal',
                        }}
                      />
                    </View>
                  )}
  
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
                <View style={{ flex: 1, backgroundColor: 'rgba(30,41,59,0.3)' }} />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <GestureDetector gesture={swipeGesture}>
          <View style={{ flex: 1 }}>
            <ImageBackground 
            source={require('../../assets/background.jpg')} 
            style={styles.background}
            resizeMode="cover"
          >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.cardHeaderRow}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="BookYourGround"
            />
          </View>
        </View>

        <BlurView 
          intensity={90} 
          tint="light" 
          style={styles.card}
        >
          <View style={{ height: 16 }} />
          {/* Email field */}
            <Pressable style={styles.fieldLabel} onPress={() => emailRef.current?.focus()}>
              <Text style={styles.fieldLabel}>Email</Text>
            </Pressable>
            <Pressable
              onPress={() => emailRef.current?.focus()}
              style={[
                styles.inputRow,
                emailFocused && styles.inputRowFocused,
              ]}
            >
              <Mail size={17} color={emailFocused ? '#475569' : '#6b7280'} strokeWidth={2} />
              <TextInput
                ref={emailRef}
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </Pressable>

          {/* Password field */}
          <View style={styles.fieldWrap}>
            <Pressable style={styles.fieldLabel} onPress={() => passwordRef.current?.focus()}>
              <Text style={styles.fieldLabel}>Password</Text>
            </Pressable>
            <Pressable
              onPress={() => passwordRef.current?.focus()}
              style={[
                styles.inputRow,
                passwordFocused && styles.inputRowFocused,
              ]}
            >
              <Lock size={17} color={passwordFocused ? '#475569' : '#6b7280'} strokeWidth={2} />
              <TextInput
                ref={passwordRef}
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
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
            </Pressable>
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
        </BlurView>
      </ScrollView>
    </ImageBackground>

      {/* Login Success Modal - Optional but good for consistency */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <View style={[modalStyles.iconBg, { backgroundColor: 'rgba(71, 85, 105, 0.1)' }]}>
              <CheckCircle size={40} color="#475569" strokeWidth={2.5} />
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
            <View style={[modalStyles.iconBg, { backgroundColor: 'rgba(71, 85, 105, 0.1)' }]}>
              <Send size={40} color="#475569" strokeWidth={2.5} />
            </View>
            <Text style={modalStyles.title}>Email Sent!</Text>
            <Text style={modalStyles.message}>A password reset link has been sent to your email address.</Text>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: '#1e293b' }]}
              onPress={() => setShowResetModal(false)}
            >
              <Text style={modalStyles.buttonText}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
        </View>
      </GestureDetector>
    </KeyboardAvoidingView>
  </GestureHandlerRootView>
  );
}

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
          borderColor: 'rgba(0, 234, 107, 0.12)',
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
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 48,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  logo: { width: 300, height: 75 },
  headingWrap: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
    overflow: 'hidden',
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: 'Inter',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  inputRowFocused: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  signInBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  signInBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  outlineBtn: {
    flex: 1,
    borderRadius: 12,
    height: 42,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginRight: 4,
  },
  forgotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'Inter',
  },
});

// ── Web styles (matching original web layout exactly) ──────────────────────
const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06392e',
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
    width: 240,
    height: 60,
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
    backgroundColor: '#06392e',
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#043529',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f9fafb',
    marginTop: 4,
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  formSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter',
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
    backgroundColor: '#475569',
    borderRadius: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  outlineButton: {
    flex: 1,
    borderRadius: 8,
    height: 36,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase' as any,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
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
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    fontFamily: 'Inter',
  },
  button: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
});
