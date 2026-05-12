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
      // Success. Redirection is handled in useEffect based on user/profile state.
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
      // For both players and ground owners, land on the home discovery screen
      // This ensures a consistent entry point as requested
      router.replace('/(tabs)/home_tab');
    }
  }, [user, profile, redirect, date, time, teams]);

  // Web layout (unchanged split design)
  if (os === 'web') {
    return (
      <View style={webStyles.container}>
        <ImageBackground 
          source={require('../../assets/signup-stadium.png')}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        >
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(4,53,41,0.4)' }]} />
          
          <ScrollView contentContainerStyle={webStyles.scrollContent}>
            <View style={webStyles.formContainer}>
              <BlurView intensity={Platform.OS === 'web' ? 40 : 25} tint="dark" style={webStyles.glassCard}>
                <View style={webStyles.header}>
                  <TouchableOpacity onPress={() => router.replace('/')}>
                    <Image
                      source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                      style={[webStyles.logoImage, width < 480 && { width: 180, height: 45 }]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>

                  <Text style={webStyles.formSubtitle}>Sign in to your account</Text>
                </View>
  
                <View style={webStyles.form}>
                  <WebInput
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
  
                  <WebInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    secureTextEntry={!showPassword}
                    showToggle={true}
                    onToggle={() => setShowPassword(!showPassword)}
                    isToggled={showPassword}
                  />

                  {Platform.OS === 'web' && TurnstileComponent && (
                    <View style={{ marginBottom: 16, alignItems: 'center', minHeight: 65 }}>
                      <TurnstileComponent
                        siteKey={process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAA4N2_8m7n6b5v4c'} 
                        onSuccess={(token: string) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken(null)}
                        onError={() => setTurnstileToken(null)}
                        options={{
                          theme: 'light',
                          size: 'normal',
                        }}
                      />
                    </View>
                  )}
  
                  <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={webStyles.forgotWrap}>
                    <Text style={webStyles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
  
                  <View style={[webStyles.buttonRow, width < 400 && { flexDirection: 'column' }]}>
                    <TouchableOpacity
                      style={[webStyles.button, loading && { opacity: 0.7 }]}
                      onPress={handleLogin}
                      disabled={loading}
                    >
                      <Text style={webStyles.buttonText}>SIGN IN</Text>
                    </TouchableOpacity>
  
                    <TouchableOpacity
                      style={webStyles.outlineButton}
                      onPress={() => router.push('/(auth)/signup')}
                    >
                      <Text style={webStyles.outlineButtonText}>SIGN UP</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </ImageBackground>
      </View>
    );
  }

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
        <View style={[styles.cardHeaderRow, width < 480 && { marginBottom: 32 }]}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
              style={[styles.logo, width < 480 && { width: 200, height: 50 }]}
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
          <View style={[styles.buttonRow, width < 400 && { flexDirection: 'column' }]}>
            <Pressable
              style={({ pressed }) => [
                styles.signInBtn,
                pressed && { opacity: 0.88 },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.signInBtnText}>SIGN IN</Text>
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
  const { label, showToggle, onToggle, isToggled, ...rest } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '500', color: '#FFFFFF', marginBottom: 4 }}>{label}</Text>}
      <View style={{ position: 'relative', width: '100%' }}>
        <TextInput
          style={{
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            paddingRight: showToggle ? 40 : 10,
            fontSize: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            fontWeight: '400',
            outlineStyle: 'none',
          } as any}
          placeholderTextColor="#94A3B8"
          {...rest}
        />
        {showToggle && (
          <TouchableOpacity 
            onPress={onToggle}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}
          >
            {isToggled ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// --- Mobile styles ---
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
    paddingTop: Platform.OS === 'web' ? 60 : 100,
    paddingBottom: 40,
    justifyContent: 'center',
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
  logo: { width: 240, height: 60 },
  headingWrap: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
    fontWeight: '500',
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
    borderColor: 'transparent',
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
    fontWeight: '400',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  signInBtn: {
    flex: 1,
    backgroundColor: '#01b854',
    borderColor: '#00ea6b',
    borderWidth: 1,
    borderRadius: 100,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  signInBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    fontFamily: 'Inter',
  },
  outlineBtn: {
    flex: 1,
    borderRadius: 100,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginRight: 4,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#01b854',
    fontFamily: 'Inter',
  },
});

// --- Web styles (matching original web layout exactly) ---
const webStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#043529' },
  scrollContent: { flexGrow: 1 },
  formContainer: { 
    flex: 1, 
    width: '100%', 
    minHeight: '100vh' as any,
    paddingHorizontal: 24, 
    paddingVertical: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  glassCard: { 
    width: '100%', 
    maxWidth: 420, 
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    borderRadius: 32, 
    paddingHorizontal: Platform.select({ web: 32, default: 24 }), 
    paddingVertical: 32, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    overflow: 'hidden',
  },
  header: { marginBottom: 24, alignItems: 'center' },
  logoImage: { width: 220, height: 55, marginBottom: 8 },
  formTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#0F172A', 
    marginTop: 4, 
    marginBottom: 0,
    fontFamily: 'Inter',
  },
  formSubtitle: { 
    fontSize: 14, 
    color: '#FFFFFF', 
    marginTop: 4, 
    fontFamily: 'Inter' 
  },
  form: { },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { 
    flex: 1, 
    backgroundColor: '#01b854', 
    borderColor: '#00ea6b',
    borderWidth: 1,
    borderRadius: 100, 
    height: 48, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  buttonText: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    letterSpacing: -0.3,
    fontFamily: 'Inter',
  },
  outlineButton: { 
    flex: 1, 
    borderRadius: 100, 
    height: 48, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.4)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  outlineButtonText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    textTransform: 'uppercase' as any,
    fontFamily: 'Inter',
  },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 16 },
  forgotText: { fontSize: 13, fontWeight: '700', color: '#01b854', fontFamily: 'Inter' },
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
