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
import { Mail, Lock, Eye, EyeOff, CheckCircle, Send, Smartphone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
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
  
  // Inline Phone OTP Login States
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
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

  const { signIn, profile, user, resetPassword } = useAuth();
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

    if (rpcError || !resolvedEmail) {
      setLoading(false);
      const msg = 'No registered account found with this phone number.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    const otp = generateOTP();
    const res = await sendSMSOTP(cleaned, otp, 'login');
    setLoading(false);

    if (res.success) {
      setPhoneGeneratedOtp(otp);
      setPhoneOtpSent(true);
      setPhoneOtpTimer(60);
      setPhoneOtpVal('');
      const msg = 'OTP sent successfully to your registered mobile number.';
      setOtpSuccessMessage(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('OTP Sent', msg);
      }
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
    if (loginMethod === 'phone') {
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

      // Pre-verify OTP to bypass 2FA modal
      setLoginOtpVerified(true);
      
      const { error } = await signIn(resolvedEmail, tempPassword);
      setLoading(false);

      if (error) {
        if (Platform.OS === 'web') alert('Login Failed: ' + error.message);
        else Alert.alert('Login Failed', error.message);
      }
    } else {
      if (!email || !password) {
        if (Platform.OS === 'web') alert('Please fill in all fields');
        else Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      setLoading(true);
      const { error } = await signIn(email, password);
      setLoading(false);

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setShowEmailNotConfirmedModal(true);
        } else if (Platform.OS === 'web') {
          alert('Login Failed: ' + error.message);
        } else {
          Alert.alert('Login Failed', error.message);
        }
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
    if (profile.role === 'super_admin') {
      if (Platform.OS === 'web') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/profile');
      }
    } else {
      // For both players and ground owners, land on the home discovery screen
      // This ensures a consistent entry point as requested
      router.replace('/(tabs)/home_tab');
    }
  }, [user, profile, redirect, date, time, teams, loginOtpVerified, otpSent, sendingOtp]);

  const renderOtpModal = () => (
    <Modal visible={showOtpModal} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <BlurView 
          intensity={Platform.OS === 'web' ? 40 : 80} 
          tint={Platform.OS === 'web' ? 'light' : 'dark'} 
          style={[
            modalStyles.card, 
            Platform.OS !== 'web' && modalStyles.glassCardMobile,
            { maxWidth: 450, padding: 32 }
          ]}
        >
          <View style={[modalStyles.iconBg, { backgroundColor: Platform.OS === 'web' ? 'rgba(1, 184, 84, 0.1)' : 'rgba(0, 234, 107, 0.15)' }]}>
            <Smartphone size={36} color={Platform.OS === 'web' ? '#01b854' : '#00ea6b'} strokeWidth={2.5} />
          </View>
          <Text style={[modalStyles.title, Platform.OS !== 'web' && { color: '#FFFFFF' }]}>Verify Your Mobile</Text>
          <Text style={[modalStyles.message, { marginBottom: 20 }, Platform.OS !== 'web' && { color: 'rgba(255, 255, 255, 0.7)' }]}>
            We've sent a 6-digit verification code to the number ending in{' '}
            <Text style={{ fontWeight: '700', color: Platform.OS === 'web' ? '#1E293B' : '#00ea6b' }}>
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
                  borderColor: val ? '#00ea6b' : (Platform.OS === 'web' ? 'rgba(15, 23, 42, 0.15)' : 'rgba(255, 255, 255, 0.15)'),
                  backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.05)',
                  textAlign: 'center',
                  fontSize: 20,
                  fontWeight: '700',
                  color: Platform.OS === 'web' ? '#0F172A' : '#FFFFFF',
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
            <Text style={{ color: '#ff3564', fontSize: 13, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>
              {otpError}
            </Text>
          ) : null}

          {/* Verification & Cancel Buttons */}
          <TouchableOpacity
            style={[
              modalStyles.button, 
              Platform.OS !== 'web' && { backgroundColor: '#00ea6b' },
              loading && { opacity: 0.7 }
            ]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Platform.OS === 'web' ? '#FFF' : '#06392e'} />
            ) : (
              <Text style={[modalStyles.buttonText, Platform.OS !== 'web' && { color: '#06392e', fontWeight: '800' }]}>VERIFY & SIGN IN</Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
            <TouchableOpacity
              onPress={otpTimer === 0 && !sendingOtp ? handleResendOtp : undefined}
              style={{ opacity: otpTimer > 0 || sendingOtp ? 0.5 : 1 }}
            >
              <Text style={{ color: '#00ea6b', fontWeight: '700', fontSize: 14 }}>
                {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCancelOtp}>
              <Text style={{ color: Platform.OS === 'web' ? '#64748B' : 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: 14 }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );

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
                  {/* Toggle Selector */}
                  <View style={{
                    flexDirection: 'row',
                    backgroundColor: 'rgba(15, 23, 42, 0.3)',
                    borderRadius: 12,
                    padding: 4,
                    marginBottom: 20,
                  }}>
                    <TouchableOpacity
                      onPress={() => setLoginMethod('email')}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: loginMethod === 'email' ? '#01b854' : 'transparent',
                        borderColor: loginMethod === 'email' ? '#00ea6b' : 'transparent',
                        borderWidth: 1,
                        alignItems: 'center',
                        shadowColor: loginMethod === 'email' ? '#00ea6b' : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: loginMethod === 'email' ? 0.25 : 0,
                        shadowRadius: 8,
                      }}
                    >
                      <Text style={{
                        color: loginMethod === 'email' ? '#FFF' : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                        Email
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setLoginMethod('phone')}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: loginMethod === 'phone' ? '#01b854' : 'transparent',
                        borderColor: loginMethod === 'phone' ? '#00ea6b' : 'transparent',
                        borderWidth: 1,
                        alignItems: 'center',
                        shadowColor: loginMethod === 'phone' ? '#00ea6b' : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: loginMethod === 'phone' ? 0.25 : 0,
                        shadowRadius: 8,
                      }}
                    >
                      <Text style={{
                        color: loginMethod === 'phone' ? '#FFF' : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                        Phone
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {loginMethod === 'email' ? (
                    <>
                      <WebInput
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        placeholder=""
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
      
                      <WebInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        placeholder=""
                        secureTextEntry={!showPassword}
                        showToggle={true}
                        onToggle={() => setShowPassword(!showPassword)}
                        isToggled={showPassword}
                      />
                    </>
                  ) : (
                    <>
                       <WebInput
                        label="Phone Number"
                        value={phone}
                        onChangeText={(t: string) => {
                          setPhone(t);
                          if (phoneOtpSent) setPhoneOtpSent(false);
                          if (otpSuccessMessage) setOtpSuccessMessage('');
                        }}
                        placeholder=""
                        keyboardType="phone-pad"
                        autoCapitalize="none"
                        editable={!phoneOtpSent}
                        rightElement={
                          !phoneOtpSent ? (
                            <TouchableOpacity
                              onPress={sendPhoneOtp}
                              disabled={loading}
                              style={{
                                backgroundColor: '#01b854',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                              }}
                            >
                              {loading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                              ) : (
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 11 }}>SEND OTP</Text>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <View style={{ paddingRight: 6 }}>
                              <Text style={{ color: '#01b854', fontWeight: '700', fontSize: 11 }}>SENT</Text>
                            </View>
                          )
                        }
                      />

                      {!phoneOtpSent ? (
                        <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, marginTop: 4, marginBottom: 20 }}>
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
                              marginBottom: 12,
                            }}>
                              <Text style={{ color: '#00ea6b', fontSize: 12, fontWeight: '600', lineHeight: 16 }}>
                                ✓ {otpSuccessMessage}
                              </Text>
                            </View>
                          ) : null}

                          <WebInput
                            ref={phoneOtpRef}
                            label="Enter 6-Digit OTP"
                            value={phoneOtpVal}
                            onChangeText={setPhoneOtpVal}
                            placeholder=""
                            keyboardType="number-pad"
                            maxLength={6}
                          />

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -4, marginBottom: 20 }}>
                            <TouchableOpacity
                              onPress={phoneOtpTimer === 0 && !loading ? sendPhoneOtp : undefined}
                              style={{ opacity: phoneOtpTimer > 0 ? 0.6 : 1 }}
                            >
                              <Text style={{ color: '#01b854', fontWeight: '700', fontSize: 13 }}>
                                {phoneOtpTimer > 0 ? `Resend in ${phoneOtpTimer}s` : 'Resend OTP'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setPhoneOtpSent(false)}>
                              <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 13 }}>
                                Change Phone
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </>
                  )}


  
                  {loginMethod === 'email' && (
                    <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={webStyles.forgotWrap}>
                      <Text style={webStyles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}
  
                  <View style={[webStyles.buttonRow, width < 400 && { flexDirection: 'column' }]}>
                    <TouchableOpacity
                      style={[webStyles.button, loading && { opacity: 0.7 }]}
                      onPress={handleLogin}
                      disabled={loading}
                    >
                      <Text style={webStyles.buttonText}>SIGN IN</Text>
                    </TouchableOpacity>
  
                    {loginMethod !== 'phone' && (
                      <TouchableOpacity
                        style={webStyles.outlineButton}
                        onPress={() => router.push('/(auth)/signup')}
                      >
                        <Text style={webStyles.outlineButtonText}>SIGN UP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </ImageBackground>

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
          {/* Mobile Login Toggle */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            borderRadius: 12,
            padding: 4,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}>
            <TouchableOpacity
              onPress={() => setLoginMethod('email')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: loginMethod === 'email' ? '#00ea6b' : 'transparent',
                borderColor: loginMethod === 'email' ? '#00ea6b' : 'transparent',
                borderWidth: 1,
                alignItems: 'center',
                shadowColor: loginMethod === 'email' ? '#00ea6b' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loginMethod === 'email' ? 0.25 : 0,
                shadowRadius: 8,
              }}
            >
              <Text style={{
                color: loginMethod === 'email' ? '#06392e' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: '700',
                fontSize: 13,
              }}>
                Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLoginMethod('phone')}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: loginMethod === 'phone' ? '#00ea6b' : 'transparent',
                borderColor: loginMethod === 'phone' ? '#00ea6b' : 'transparent',
                borderWidth: 1,
                alignItems: 'center',
                shadowColor: loginMethod === 'phone' ? '#00ea6b' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loginMethod === 'phone' ? 0.25 : 0,
                shadowRadius: 8,
              }}
            >
              <Text style={{
                color: loginMethod === 'phone' ? '#06392e' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: '700',
                fontSize: 13,
              }}>
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          {loginMethod === 'email' ? (
            <>
              {/* Email field */}
              <View style={{ width: '100%' }}>
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
                  <Mail size={17} color={emailFocused ? '#00ea6b' : 'rgba(255, 255, 255, 0.5)'} strokeWidth={2} />
                  <TextInput
                    ref={emailRef}
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder=""
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </Pressable>
              </View>

              {/* Password field */}
              <View style={[styles.fieldWrap, { marginTop: 16 }]}>
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
                  <Lock size={17} color={passwordFocused ? '#00ea6b' : 'rgba(255, 255, 255, 0.5)'} strokeWidth={2} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder=""
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff size={17} color="rgba(255, 255, 255, 0.5)" strokeWidth={2} />
                    ) : (
                      <Eye size={17} color="rgba(255, 255, 255, 0.5)" strokeWidth={2} />
                    )}
                  </Pressable>
                </Pressable>
              </View>

              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
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
                    editable={!phoneOtpSent}
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
                        <Text style={{ color: '#06392e', fontWeight: '800', fontSize: 11 }}>SEND OTP</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={{ marginLeft: 8, paddingHorizontal: 6 }}>
                      <Text style={{ color: '#00ea6b', fontWeight: '800', fontSize: 11 }}>SENT</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {!phoneOtpSent ? (
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, marginTop: 8, marginBottom: 10, width: '100%' }}>
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
                      <Text style={{ color: '#00ea6b', fontSize: 12, fontWeight: '600', lineHeight: 16 }}>
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
                        phoneOtpFocused && styles.inputRowFocused,
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
                      <Text style={{ color: '#00ea6b', fontWeight: '700', fontSize: 13 }}>
                        {phoneOtpTimer > 0 ? `Resend in ${phoneOtpTimer}s` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setPhoneOtpSent(false)}>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: 13 }}>
                        Change Phone
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
  const { label, showToggle, onToggle, isToggled, rightElement, ...rest } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '400', color: '#FFFFFF', marginBottom: 4 }}>{label}</Text>}
      <View style={{ position: 'relative', width: '100%' }}>
        <TextInput
          ref={ref}
          style={{
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            paddingRight: (showToggle || rightElement) ? 100 : 10,
            fontSize: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            fontWeight: '300',
            outlineStyle: 'none',
          } as any}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
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
    borderWidth: 1.5,
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
    fontWeight: '300',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  signInBtn: {
    flex: 1,
    backgroundColor: '#00ea6b',
    borderColor: '#00ea6b',
    borderWidth: 1,
    borderRadius: 10,
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
    color: '#06392e',
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
    borderRadius: 10, 
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
    borderRadius: 10, 
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
