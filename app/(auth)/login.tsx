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
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, CheckCircle, Send, Smartphone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { generateOTP, sendSMSOTP } from '@/utils/sms';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEmailNotConfirmedModal, setShowEmailNotConfirmedModal] = useState(false);
  
  // Login Method Toggle State
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);
  
  // Separate refs for the Web OTP layout
  const webOtpRefs = [
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
  ];

  // Animated shake for email OTP error
  const shakeAnimation = React.useRef(new Animated.Value(0)).current;

  // Inline Phone OTP Login States
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [phoneOtpVal, setPhoneOtpVal] = useState('');
  const [phoneGeneratedOtp, setPhoneGeneratedOtp] = useState('');
  const [phoneOtpTimer, setPhoneOtpTimer] = useState(0);
  const [phoneOtpFocused, setPhoneOtpFocused] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');

  const emailRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const phoneRef = React.useRef<TextInput>(null);
  const phoneOtpRef = React.useRef<TextInput>(null);

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loginOtpVerified, setLoginOtpVerified] = useState(false);
  
  const otpRefs = [
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
  ];

  // OTP Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpModal && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (phoneOtpTimer > 0) {
      interval = setInterval(() => {
        setPhoneOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showOtpModal, otpTimer, phoneOtpTimer]);
  
  const swipeGesture = Gesture.Pan()
    .activeCursor('grabbing')
    .onEnd((e) => {
      // If swipe right (left to right) with enough velocity or distance
      if (e.translationX > 80 && e.velocityX > 400) {
        runOnJS(router.push)('/(tabs)/home_tab' as any);
      }
    });

  const { signIn, signUp, profile, user, resetPassword, signOut } = useAuth();
  const os = Platform.OS as string;
  const { width } = useWindowDimensions();
  const showHeroImage = os === 'web' && width >= 900;

  const { redirect, date, time, teams } = useLocalSearchParams();

  const sendPhoneOtp = async () => {
    if (!phone) {
      const msg = 'Please enter your phone number';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    const cleaned = phone.replace(/[^0-9]/g, '');
    const { data: resolvedEmail, error: rpcError } = await supabase.rpc('get_email_by_phone', { p_phone: cleaned });

    const isNew = Boolean(rpcError || !resolvedEmail);
    if (isNew) {
      setIsNewUser(true);
    } else {
      setIsNewUser(false);
    }

    const otp = generateOTP();
    const res = await sendSMSOTP(cleaned, otp, isNew ? 'signup' : 'login');
    setLoading(false);

    if (res.success) {
      setPhoneGeneratedOtp(otp);
      setPhoneOtpSent(true);
      setPhoneOtpTimer(60);
      setPhoneOtpVal('');
      const msg = isNew 
        ? 'OTP sent successfully! Please verify to create your account.'
        : 'OTP sent successfully to your registered mobile number.';
      setOtpSuccessMessage(msg);
      setTimeout(() => {
        phoneOtpRef.current?.focus();
      }, 300);
    } else {
      setOtpSuccessMessage('');
      const msg = res.error || 'Failed to send OTP. Please try again.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleLogin = async () => {
    if (!phoneOtpSent) {
      await sendPhoneOtp();
      return;
    }

    if (!phone || !phoneOtpVal) {
      const msg = 'Please fill in all fields';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    if (phoneOtpVal !== phoneGeneratedOtp) {
      const msg = 'Incorrect OTP. Please check and try again.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    const cleaned = phone.replace(/[^0-9]/g, '');
    const tempPassword = 'BYGTempOTPAuthPass_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    if (isNewUser) {
      const randomEmail = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@bookyourground.com`;
      const { error } = await signUp(randomEmail, tempPassword, '', cleaned, 'user', undefined, '', '', undefined, 'Player', undefined, true);
      
      if (error) {
        setLoading(false);
        const msg = 'Failed to create account. Please try again.';
        if (Platform.OS === 'web') alert(msg + ' ' + error.message);
        else Alert.alert('Error', msg);
      } else {
        setLoginOtpVerified(true);
        // Do not set loading to false here, keep it spinning while AuthContext loads profile and redirects
      }
    } else {
      const { data: resolvedEmail, error: rpcError } = await supabase.rpc('login_with_otp_auth', {
        p_phone: cleaned,
        p_new_password: tempPassword,
      });

      if (rpcError || !resolvedEmail) {
        setLoading(false);
        const msg = 'Failed to authenticate phone login. Please try again.';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Login Failed', msg);
        return;
      }

      setLoginOtpVerified(true);
      
      const { error } = await signIn(resolvedEmail, tempPassword);
      if (error) {
        setLoading(false);
        if (Platform.OS === 'web') alert('Login Failed: ' + error.message);
        else Alert.alert('Login Failed', error.message);
      } else {
        // Do not set loading to false on success, keep it spinning while redirecting
      }
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

  const sendLoginOtp = async (phone: string) => {
    setSendingOtp(true);
    const newOtp = generateOTP();
    const res = await sendSMSOTP(phone, newOtp, 'login');
    setSendingOtp(false);

    if (res.success) {
      setGeneratedOtp(newOtp);
      setOtpTimer(60);
      setOtpInput(['', '', '', '', '', '']);
      setOtpError('');
      setOtpSent(true);
      setShowOtpModal(true);
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 300);
    } else {
      const msg = res.error || 'Failed to send verification OTP to your registered phone number.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Verification Error', msg);
      // Sign out since 2FA failed to send/initiate
      signOut();
      setOtpSent(false);
    }
  };

  const handleResendOtp = async () => {
    if (!profile || !profile.phone) return;
    setSendingOtp(true);
    setOtpError('');
    const newOtp = generateOTP();
    const res = await sendSMSOTP(profile.phone, newOtp, 'login');
    setSendingOtp(false);

    if (res.success) {
      setGeneratedOtp(newOtp);
      setOtpTimer(60);
      setOtpInput(['', '', '', '', '', '']);
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 100);
    } else {
      setOtpError(res.error || 'Failed to resend OTP.');
    }
  };

  const handleVerifyOtp = () => {
    const enteredOtp = otpInput.join('');
    if (enteredOtp.length !== 6) {
      setOtpError('Please enter a 6-digit verification code.');
      return;
    }

    if (enteredOtp !== generatedOtp) {
      setOtpError('Incorrect OTP. Please check and try again.');
      return;
    }

    setShowOtpModal(false);
    setLoginOtpVerified(true);
  };

  const handleCancelOtp = () => {
    setShowOtpModal(false);
    setOtpError('');
    setOtpSent(false);
    signOut();
  };

  useEffect(() => {
    if (!user || !profile) return;

    // Enforce custom SMS OTP 2FA login verification
    if (profile.phone && !loginOtpVerified) {
      if (!otpSent && !sendingOtp) {
        sendLoginOtp(profile.phone);
      }
      return;
    }

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
    if (Platform.OS === 'web') {
      if (profile.role === 'super_admin') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/home_tab');
      }
    } else {
      // On mobile, everyone (including admins) lands on the home discovery screen
      router.replace('/(tabs)/home_tab');
    }
  }, [user, profile, redirect, date, time, teams, loginOtpVerified, otpSent, sendingOtp]);

  const renderOtpModal = () => (
    <Modal visible={showOtpModal} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <BlurView 
          intensity={80} 
          tint="dark" 
          style={[
            modalStyles.card, 
            modalStyles.glassCardMobile,
            { maxWidth: 450, padding: 32 }
          ]}
        >
          <View style={[modalStyles.iconBg, { backgroundColor: 'rgba(0, 234, 107, 0.15)' }]}>
            <Smartphone size={36} color="#00ea6b" strokeWidth={2.5} />
          </View>
          <Text style={[modalStyles.title, { color: '#FFFFFF' }]}>Verify Your Mobile</Text>
          <Text style={[modalStyles.message, { marginBottom: 20, color: 'rgba(255, 255, 255, 0.7)' }]}>
            We've sent a 6-digit verification code to the number ending in{' '}
            <Text style={{ fontWeight: '700', color: '#00ea6b' }}>
              {profile && profile.phone ? profile.phone.slice(-4) : 'XXXX'}
            </Text>
            . Enter it below to authenticate.
          </Text>

          {/* Custom 6-digit styled OTP Inputs */}
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {otpInput.map((val, idx) => (
              <TextInput
                key={idx}
                ref={otpRefs[idx]}
                style={{
                  width: 42,
                  height: 48,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: val ? '#00ea6b' : 'rgba(255, 255, 255, 0.15)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: '700',
                  color: '#FFFFFF',
                }}
                value={val}
                keyboardType="number-pad"
                maxLength={1}
                onChangeText={(text) => {
                  const newOtp = [...otpInput];
                  newOtp[idx] = text;
                  setOtpInput(newOtp);
                  setOtpError('');

                  // Automatically move focus to next/prev input
                  if (text && idx < 5) {
                    otpRefs[idx + 1].current?.focus();
                  }
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && !val && idx > 0) {
                    otpRefs[idx - 1].current?.focus();
                  }
                }}
              />
            ))}
          </View>

          {otpError ? (
            <Text style={{ color: '#ff3564', fontSize: 13, fontWeight: '600', marginBottom: 16, textAlign: 'center', fontFamily: 'Inter' }}>
              {otpError}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              modalStyles.button, 
              { backgroundColor: '#00ea6b' },
              loading && { opacity: 0.7 }
            ]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#06392e" />
            ) : (
              <Text style={[modalStyles.buttonText, { color: '#06392e', fontWeight: '800' }]}>VERIFY & SIGN IN</Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
            <TouchableOpacity
              onPress={otpTimer === 0 && !sendingOtp ? handleResendOtp : undefined}
              style={{ opacity: otpTimer > 0 || sendingOtp ? 0.5 : 1 }}
            >
              <Text style={{ color: '#00ea6b', fontWeight: '700', fontSize: 14, fontFamily: 'Inter' }}>
                {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCancelOtp}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: 14, fontFamily: 'Inter' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );

  // Web layout (Flipkart style split design)
  if (os === 'web') {
    return (
      <LinearGradient 
        colors={['#0c5746', '#0c5746']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={webStyles.container}
      >
        <ScrollView contentContainerStyle={webStyles.scrollContent}>
          <View style={[webStyles.formContainer, width < 768 && { padding: 16 }]}>
            <View style={[webStyles.glassCard, width < 768 && { flexDirection: 'column', height: 'auto', minHeight: 400 }]}>
              
              {/* Left Pane (Hidden on Mobile/Tablet) */}
              {width >= 768 && (
                <View style={webStyles.leftPane}>
                  <View>
                    <Text style={[webStyles.leftPaneTitle, { fontFamily: 'Inter' }]}>Login</Text>
                    <Text style={[webStyles.leftPaneSubtitle, { fontFamily: 'Inter' }]}>
                      Get access to your Bookings,{'\n'}Favorites and Profile
                    </Text>
                  </View>
                  
                  <View style={webStyles.logoContainer}>
                    <Image
                      source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                      style={webStyles.logoImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              )}

              {/* Right Pane */}
              <View style={[webStyles.rightPane, width < 768 && { flex: 1, padding: 24, alignItems: 'center' }]}>
                {width < 768 && (
                  <View style={{ alignItems: 'center', marginBottom: 32 }}>
                    <Image
                      source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                      style={{ width: 180, height: 45, marginBottom: 12 }}
                      resizeMode="contain"
                    />
                    <Text style={{ fontSize: 24, fontWeight: '800', fontFamily: 'Inter', color: '#0F172A' }}>Login</Text>
                  </View>
                )}
                <View style={[webStyles.form, width < 768 && { width: '100%', maxWidth: 360 }]}>
                  <>
                    {!phoneOtpSent ? (
                      <>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={{ fontSize: 12, fontWeight: '400', color: '#64748B', marginBottom: 0, marginTop: 4, fontFamily: 'Inter' }}>
                            Enter Phone Number
                          </Text>
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            borderBottomWidth: 2, 
                            borderBottomColor: '#cbd5e1', 
                            height: 48 
                          }}>
                            <Text style={{ fontSize: 14, fontWeight: '500', color: '#0F172A', marginRight: 8, marginTop: 2, fontFamily: 'Inter' }}>
                              +91
                            </Text>
                            <TextInput
                              value={phone}
                              onChangeText={(t: string) => {
                                const numericText = t.replace(/[^0-9]/g, '');
                                setPhone(numericText);
                                if (phoneOtpSent) setPhoneOtpSent(false);
                                if (otpSuccessMessage) setOtpSuccessMessage('');
                              }}
                              keyboardType="phone-pad"
                              maxLength={10}
                              style={{
                                flex: 1,
                                height: 48,
                                fontSize: 14,
                                fontFamily: 'Inter',
                                fontWeight: '500',
                                color: '#0F172A',
                                backgroundColor: 'transparent',
                                outlineStyle: 'none',
                                outline: 'none',
                                outlineWidth: 0,
                                boxShadow: 'none',
                                borderWidth: 0,
                                padding: 0,
                                marginTop: 2,
                              } as any}
                            />
                          </View>
                        </View>
                        <Text style={webStyles.termsText}>
                          By continuing, you agree to BookYourGround's{' '}
                          <Text 
                            style={[webStyles.termsLink, { cursor: 'pointer' } as any]} 
                            onPress={() => router.push('/terms' as any)}
                          >
                            Terms of Use
                          </Text>{' '}
                          and{' '}
                          <Text 
                            style={[webStyles.termsLink, { cursor: 'pointer' } as any]} 
                            onPress={() => router.push('/privacy' as any)}
                          >
                            Privacy Policy
                          </Text>.
                        </Text>
                      </>
                    ) : (
                      <View style={{ alignItems: 'center', marginBottom: 24, width: '100%' }}>
                        <Text style={{ fontSize: 15, color: '#334155', fontFamily: 'Inter', marginBottom: 4 }}>
                          Please enter the OTP sent to
                        </Text>
                        <Text style={{ fontSize: 15, color: '#0F172A', fontFamily: 'Inter', fontWeight: '500', marginBottom: 24 }}>
                          {phone}.{' '}
                          <Text 
                            style={{ color: '#ff611d', fontWeight: '600', cursor: 'pointer' } as any}
                            onPress={() => setPhoneOtpSent(false)}
                          >
                            Change
                          </Text>
                        </Text>

                        {/* OTP Boxes */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', height: 60, marginBottom: 16 }}>
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <TextInput
                              key={i}
                              ref={webOtpRefs[i]}
                              value={phoneOtpVal[i] || ''}
                              onChangeText={(text) => {
                                const char = text.slice(-1);
                                let newVal = phoneOtpVal.split('');
                                if (char) {
                                  newVal[i] = char;
                                } else {
                                  newVal[i] = '';
                                }
                                const resultingOtp = newVal.join('').substring(0, 6);
                                setPhoneOtpVal(resultingOtp);
                                
                                // Automatically move focus to next input
                                if (char && i < 5) {
                                  webOtpRefs[i + 1].current?.focus();
                                }
                              }}
                              onKeyPress={({ nativeEvent }) => {
                                if (nativeEvent.key === 'Backspace' && !phoneOtpVal[i] && i > 0) {
                                  webOtpRefs[i - 1].current?.focus();
                                }
                              }}
                              keyboardType="number-pad"
                              maxLength={1}
                              style={{
                                width: '15%',
                                height: 50,
                                borderTopWidth: 0,
                                borderLeftWidth: 0,
                                borderRightWidth: 0,
                                borderBottomWidth: 2,
                                borderColor: phoneOtpVal[i] ? '#0F172A' : '#cbd5e1',
                                textAlign: 'center',
                                fontSize: 24, 
                                fontWeight: '600',
                                color: '#0F172A',
                                outlineStyle: 'none',
                                outline: 'none',
                                outlineWidth: 0,
                                boxShadow: 'none',
                              } as any}
                            />
                          ))}
                        </View>
                      </View>
                    )}
                  </>

                  <View style={[webStyles.buttonRow, width < 400 && { flexDirection: 'column' }]}>
                    <TouchableOpacity
                      style={[webStyles.button, loading && { opacity: 0.7 }]}
                      onPress={!phoneOtpSent ? sendPhoneOtp : handleLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={webStyles.buttonText}>{!phoneOtpSent ? 'Request OTP' : 'Verify'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  
                  {phoneOtpSent && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
                      <Text style={{ color: '#64748B', fontSize: 13, fontFamily: 'Inter' }}>
                        Not received your code?{' '}
                      </Text>
                      <TouchableOpacity
                        onPress={phoneOtpTimer === 0 && !loading ? sendPhoneOtp : undefined}
                        style={{ opacity: phoneOtpTimer > 0 ? 0.5 : 1 }}
                      >
                        <Text style={{ color: '#ff611d', fontWeight: '700', fontSize: 13, fontFamily: 'Inter' }}>
                          Resend code
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <View style={webStyles.createAccountContainer}>
                    <TouchableOpacity onPress={() => router.replace('/(tabs)/home_tab' as any)}>
                      <Text style={webStyles.createAccountText}>
                        Skip for now? Continue to Site
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

            </View>
          </View>
        </ScrollView>

        {/* Email Not Confirmed Modal */}
        <Modal
          visible={showEmailNotConfirmedModal}
          transparent
          animationType="fade"
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.card}>
              <View style={[modalStyles.iconBg, { backgroundColor: 'rgba(0, 234, 107, 0.1)' }]}>
                <Mail size={40} color="#00ea6b" strokeWidth={2.5} />
              </View>
              <Text style={modalStyles.title}>Login Failed!</Text>
              <Text style={modalStyles.message}>Email not confirmed. Please check your inbox for the confirmation link.</Text>
              <TouchableOpacity
                style={[modalStyles.button, { backgroundColor: '#06392e' }]}
                onPress={() => setShowEmailNotConfirmedModal(false)}
              >
                <Text style={[modalStyles.buttonText, { color: '#00ea6b' }]}>GOT IT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {renderOtpModal()}
      </LinearGradient>
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
          intensity={65} 
          tint="dark" 
          style={styles.card}
        >


              {/* Phone field */}
              <View style={{ width: '100%' }}>
                <Pressable style={styles.fieldLabel} onPress={() => phoneRef.current?.focus()}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                </Pressable>
                <Pressable
                  onPress={() => phoneRef.current?.focus()}
                  style={[
                    styles.inputRow,
                    phoneFocused && styles.inputRowFocused,
                  ]}
                >
                  <Smartphone size={17} color={phoneFocused ? '#00ea6b' : 'rgba(255, 255, 255, 0.5)'} strokeWidth={2} />
                  <TextInput
                    ref={phoneRef}
                    style={[styles.textInput, { flex: 1 }]}
                    value={phone}
                    onChangeText={(t: string) => {
                      setPhone(t);
                      if (phoneOtpSent) setPhoneOtpSent(false);
                      if (otpSuccessMessage) setOtpSuccessMessage('');
                    }}
                    placeholder=""
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                  />
                  {!phoneOtpSent ? (
                    <TouchableOpacity
                      onPress={sendPhoneOtp}
                      disabled={loading}
                      style={{
                        backgroundColor: '#00ea6b',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        marginLeft: 8,
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#06392e" />
                      ) : (
                      <Text style={{ color: '#06392e', fontWeight: '800', fontSize: 11, fontFamily: 'Inter' }}>SEND OTP</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={{ marginLeft: 8, paddingHorizontal: 6 }}>
                      <Text style={{ color: '#00ea6b', fontWeight: '800', fontSize: 11, fontFamily: 'Inter' }}>SENT</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {!phoneOtpSent ? (
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, marginTop: 8, marginBottom: 10, width: '100%', fontFamily: 'Inter' }}>
                  Enter your phone number and tap SEND OTP to receive your 6-digit verification code.
                </Text>
              ) : (
                <>
                  {otpSuccessMessage ? (
                    <View style={{
                      backgroundColor: 'rgba(1, 184, 84, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(1, 184, 84, 0.3)',
                      borderRadius: 8,
                      padding: 10,
                      marginTop: 12,
                      width: '100%',
                    }}>
                      <Text style={{ color: '#00ea6b', fontSize: 12, fontWeight: '600', lineHeight: 16, fontFamily: 'Inter' }}>
                        ✓ {otpSuccessMessage}
                      </Text>
                    </View>
                  ) : null}

                  {/* OTP field */}
                  <View style={[styles.fieldWrap, { marginTop: otpSuccessMessage ? 12 : 16, width: '100%' }]}>
                    <Pressable style={styles.fieldLabel} onPress={() => phoneOtpRef.current?.focus()}>
                      <Text style={styles.fieldLabel}>Enter 6-Digit OTP</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => phoneOtpRef.current?.focus()}
                      style={[
                        styles.inputRow,
                        { borderWidth: 0, borderColor: 'transparent' },
                        phoneOtpFocused && { shadowColor: 'transparent', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                      ]}
                    >
                      <Lock size={17} color={phoneOtpFocused ? '#00ea6b' : 'rgba(255, 255, 255, 0.5)'} strokeWidth={2} />
                      <TextInput
                        ref={phoneOtpRef}
                        style={styles.textInput}
                        value={phoneOtpVal}
                        onChangeText={setPhoneOtpVal}
                        placeholder=""
                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                        keyboardType="number-pad"
                        maxLength={6}
                        onFocus={() => setPhoneOtpFocused(true)}
                        onBlur={() => setPhoneOtpFocused(false)}
                      />
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8, marginBottom: 16 }}>
                    <TouchableOpacity
                      onPress={phoneOtpTimer === 0 && !loading ? sendPhoneOtp : undefined}
                      style={{ opacity: phoneOtpTimer > 0 ? 0.6 : 1 }}
                    >
                      <Text style={{ color: '#00ea6b', fontWeight: '700', fontSize: 13, fontFamily: 'Inter' }}>
                        {phoneOtpTimer > 0 ? `Resend in ${phoneOtpTimer}s` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setPhoneOtpSent(false)}>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: 13, fontFamily: 'Inter' }}>
                        Change Phone
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}


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
              {loading ? (
                <ActivityIndicator color="#06392e" />
              ) : (
                <Text style={styles.signInBtnText}>{isNewUser ? 'SIGN UP' : 'SIGN IN'}</Text>
              )}
            </Pressable>
          </View>

          <Pressable 
            onPress={() => router.replace('/(tabs)/home_tab' as any)}
            style={{ marginTop: 24, alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: 14, fontFamily: 'Inter' }}>
              SKIP FOR NOW
            </Text>
          </Pressable>
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

      {/* Email Not Confirmed Modal */}
      <Modal
        visible={showEmailNotConfirmedModal}
        transparent
        animationType="fade"
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <View style={[modalStyles.iconBg, { backgroundColor: 'rgba(0, 234, 107, 0.1)' }]}>
              <Mail size={40} color="#00ea6b" strokeWidth={2.5} />
            </View>
            <Text style={modalStyles.title}>Login Failed!</Text>
            <Text style={modalStyles.message}>Email not confirmed. Please check your inbox for the confirmation link.</Text>
            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: '#06392e' }]}
              onPress={() => setShowEmailNotConfirmedModal(false)}
            >
              <Text style={[modalStyles.buttonText, { color: '#00ea6b' }]}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderOtpModal()}
        </View>
      </GestureDetector>
    </KeyboardAvoidingView>
  </GestureHandlerRootView>
  );
}

const WebInput = React.forwardRef((props: any, ref: any) => {
  const { label, showToggle, onToggle, isToggled, rightElement, leftElement, lightMode, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '400', color: lightMode ? '#64748B' : '#FFFFFF', marginBottom: 0, marginTop: 4, fontFamily: 'Inter' }}>{label}</Text>}
      <View style={{ position: 'relative', width: '100%' }}>
        {leftElement && (
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 }}>
            {leftElement}
          </View>
        )}
        <TextInput
          ref={ref}
          style={[
            {
              borderWidth: 0.5,
              borderColor: lightMode ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)',
              borderRadius: 8,
              height: 48,
              paddingHorizontal: 10,
              paddingLeft: leftElement ? 28 : 10,
              paddingRight: (showToggle || rightElement) ? 100 : 10,
              fontSize: 14,
              fontFamily: 'Inter',
              backgroundColor: lightMode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
              color: lightMode ? '#0F172A' : '#FFFFFF',
              fontWeight: '500',
              outlineStyle: 'none',
              outline: 'none',
              outlineWidth: 0,
              boxShadow: 'none',
            } as any,
            style
          ]}
          placeholderTextColor={lightMode ? "#94a3b8" : "rgba(255, 255, 255, 0.4)"}
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
        {rightElement && (
          <View style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            {rightElement}
          </View>
        )}
      </View>
    </View>
  );
});

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
    paddingTop: Platform.OS === 'web' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 32,
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
    backgroundColor: 'rgba(6, 57, 46, 0.7)',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
    letterSpacing: 0.2,
    fontFamily: 'Inter',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  inputRowFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#00ea6b',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
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
    backgroundColor: '#06392e',
    borderColor: '#00ea6b',
    borderWidth: 0.5,
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  signInBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00ea6b',
    letterSpacing: -0.3,
    fontFamily: 'Inter',
  },
  outlineBtn: {
    flex: 1,
    borderRadius: 10,
    height: 46,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
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
    color: '#00ea6b',
    fontFamily: 'Inter',
  },
});

// --- Web styles (matching original web layout exactly) ---
const webStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  formContainer: { 
    width: '100%', 
    height: '100%',
    padding: 24, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  glassCard: { 
    width: '100%', 
    maxWidth: 850, 
    height: 550,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', 
    borderRadius: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)' }
    }) as any,
  },
  leftPane: {
    flex: 0.4,
    backgroundColor: '#06392e',
    padding: 40,
    justifyContent: 'space-between',
  },
  rightPane: {
    flex: 0.6,
    padding: 48,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  leftPaneTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    marginBottom: 16,
  },
  leftPaneSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  logoImage: { 
    width: 200, 
    height: 50, 
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  formTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#0F172A', 
    marginBottom: 0,
    fontFamily: 'Inter',
  },
  formSubtitle: { 
    fontSize: 14, 
    color: '#64748B', 
    marginTop: 8, 
    marginBottom: 32,
    fontFamily: 'Inter' 
  },
  form: { 
    width: '100%',
  },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { 
    flex: 1, 
    backgroundColor: '#ff611d', // Flipkart orange style, or we can use site green: #00ea6b
    borderRadius: 4, 
    height: 48, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#ff611d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  termsText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 24,
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  termsLink: {
    color: '#01b854',
    fontWeight: '600',
  },
  createAccountContainer: {
    marginTop: 'auto', // Pushes it to the bottom
    paddingTop: 32,
    alignItems: 'center',
  },
  createAccountText: {
    color: '#01b854',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Inter',
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
  glassCardMobile: {
    backgroundColor: 'rgba(6, 57, 46, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
