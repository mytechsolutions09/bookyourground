import React, { useState } from 'react';
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
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, CheckCircle, ChevronDown, Users, Smartphone } from 'lucide-react-native';
import PasswordRequirement from '@/components/ui/PasswordRequirement';
import { generateOTP, sendSMSOTP } from '@/utils/sms';

let TurnstileComponent: any = null;
if (Platform.OS === 'web') {
  try {
    const TurnstileModule = require('@marsidev/react-turnstile');
    TurnstileComponent = TurnstileModule.Turnstile;
  } catch (e) {
    console.warn('Turnstile module could not be loaded:', e);
  }
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", 
  "Lakshadweep", "Puducherry"
];

export default function SignupScreen() {
  const [signupMethod, setSignupMethod] = useState<'email' | 'phone'>('phone');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Inline OTP states for Phone Registration
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpVal, setPhoneOtpVal] = useState('');
  const [phoneGeneratedOtp, setPhoneGeneratedOtp] = useState('');
  const [phoneOtpTimer, setPhoneOtpTimer] = useState(0);
  const [phoneOtpFocused, setPhoneOtpFocused] = useState(false);

  const firstNameRef = React.useRef<TextInput>(null);
  const lastNameRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const phoneRef = React.useRef<TextInput>(null);
  const phoneOtpRef = React.useRef<TextInput>(null);
  const addressRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const confirmPasswordRef = React.useRef<TextInput>(null);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // OTP Verification States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  
  const otpRefs = [
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
    React.useRef<TextInput>(null),
  ];

  // OTP Timer countdown
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showOtpModal && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showOtpModal, otpTimer]);

  const { signUp } = useAuth();
  const { width } = useWindowDimensions();
  const showHeroImage = Platform.OS === 'web' && width >= 900;

  // Phone OTP timer countdown for Phone Registration
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phoneOtpTimer > 0) {
      interval = setInterval(() => {
        setPhoneOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phoneOtpTimer]);

  const sendSignupPhoneOtp = async () => {
    if (!phone) {
      const msg = 'Please enter your mobile number first';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }
    
    // Check if phone number is already registered
    const cleaned = phone.replace(/[^0-9]/g, '');
    const { data: resolvedEmail } = await supabase.rpc('get_email_by_phone', { p_phone: cleaned });
    if (resolvedEmail) {
      const msg = 'This mobile number is already registered with another account. Please sign in instead.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }
    
    setSendingOtp(true);
    const newOtp = generateOTP();
    const res = await sendSMSOTP(phone, newOtp);
    setSendingOtp(false);

    if (res.success) {
      setPhoneGeneratedOtp(newOtp);
      setPhoneOtpTimer(60);
      setPhoneOtpSent(true);
      setPhoneOtpVal('');
      const msg = 'Verification code sent successfully!';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Success', msg);
      setTimeout(() => {
        phoneOtpRef.current?.focus();
      }, 300);
    } else {
      const msg = res.error || 'Failed to send OTP. Please try again.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleSignup = async () => {
    if (signupMethod === 'email') {
      if (!firstName || !lastName || !address || !stateName) {
        const msg = 'Please fill in all required fields';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Error', msg);
        return;
      }

      const fullName = `${firstName} ${lastName}`.trim();

      if (!email || !password) {
        const msg = 'Please fill in all required fields';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Error', msg);
        return;
      }

      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);

      if (password.length < 8 || !hasLower || !hasUpper || !hasNumber) {
        const msg = 'Password must be at least 8 characters and contain at least one lowercase letter, one uppercase letter, and one number.';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Error', msg);
        return;
      }

      if (password !== confirmPassword) {
        const msg = 'Passwords do not match';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Error', msg);
        return;
      }

      // Standard Email Sign Up
      if (phone) {
        const cleaned = phone.replace(/[^0-9]/g, '');
        const { data: resolvedEmail } = await supabase.rpc('get_email_by_phone', { p_phone: cleaned });
        if (resolvedEmail) {
          const msg = 'This mobile number is already registered with another account. Please sign in instead.';
          if (Platform.OS === 'web') alert(msg);
          else Alert.alert('Error', msg);
          return;
        }
      }

      setLoading(true);
      const { error } = await signUp(
        email,
        password,
        fullName,
        phone || undefined,
        'user',
        undefined,
        address,
        stateName,
        undefined,
        'Player',
        turnstileToken || undefined,
        true
      );
      setLoading(false);

      if (error) {
        let msg = error.message;
        if (msg.includes('confirmation email')) {
          msg = 'Error sending confirmation email. Please check backend SMTP settings.';
        } else if (msg.toLowerCase().includes('already registered')) {
          msg = 'This email address is already registered with another account. Please sign in instead.';
        }
        if (Platform.OS === 'web') alert('Signup Failed: ' + msg);
        else Alert.alert('Signup Failed', msg);
      } else {
        setShowSuccessModal(true);
      }

    } else {
      // Phone Sign Up Method (Passwordless & Frictionless)
      if (!phone) {
        const msg = 'Please enter your mobile number';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Error', msg);
        return;
      }

      if (!phoneOtpSent) {
        await sendSignupPhoneOtp();
        return;
      }

      if (phoneOtpVal.length !== 6) {
        const msg = 'Please enter a 6-digit verification code';
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

      // Verified! Create Supabase player account with phone-linked credentials
      setLoading(true);
      const randomEmail = `${phone}@bookyourground.com`;
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      
      const { error } = await signUp(
        randomEmail,
        randomPassword,
        'Player', // default generic display name for fast registration
        phone,
        'user',
        undefined,
        '', // empty address (user can update in profile later)
        '', // empty state
        undefined,
        'Player',
        undefined, // bypass Turnstile for SMS verified phone flow
        true // marks phone verified!
      );
      setLoading(false);

      if (error) {
        const msg = error.message;
        if (Platform.OS === 'web') alert('Signup Failed: ' + msg);
        else Alert.alert('Signup Failed', msg);
      } else {
        setShowSuccessModal(true);
      }
    }
  };

  const handleResendOtp = async () => {
    setSendingOtp(true);
    setOtpError('');
    const newOtp = generateOTP();
    const res = await sendSMSOTP(phone, newOtp);
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

  const handleVerifyAndSignup = async () => {
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
    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await signUp(email, password, fullName, phone, 'user', undefined, address, stateName, undefined, 'Player', turnstileToken || undefined, true);
    setLoading(false);

    if (error) {
      let msg = error.message;
      if (msg.includes('confirmation email')) {
        msg = 'Error sending confirmation email. This usually means the email provider is not configured correctly in the backend or rate limits were exceeded. Please check your Supabase SMTP settings.';
      } else if (msg.toLowerCase().includes('already registered')) {
        msg = 'This email address is already registered with another account. Please sign in instead.';
      }
      if (Platform.OS === 'web') alert('Signup Failed: ' + msg);
      else Alert.alert('Signup Failed', msg);
    } else {
      setShowSuccessModal(true);
    }
  };

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
            <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>
              {phone ? phone.slice(-4) : 'XXXX'}
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
            <Text style={{ color: '#ff3564', fontSize: 13, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>
              {otpError}
            </Text>
          ) : null}

          {/* Verification & Cancel Buttons */}
          <TouchableOpacity
            style={[
              modalStyles.button, 
              { backgroundColor: '#00ea6b' },
              loading && { opacity: 0.7 }
            ]}
            onPress={handleVerifyAndSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#06392e" />
            ) : (
              <Text style={[modalStyles.buttonText, { color: '#06392e', fontWeight: '800' }]}>VERIFY & SIGN UP</Text>
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

            <TouchableOpacity
              onPress={() => {
                setShowOtpModal(false);
                setOtpError('');
              }}
            >
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600', fontSize: 14 }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  );

  // Web layout
  if (Platform.OS === 'web') {
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
              <BlurView intensity={Platform.OS === 'web' ? 40 : 25} tint="light" style={webStyles.glassCard}>
                <View style={webStyles.header}>
                  <TouchableOpacity onPress={() => router.replace('/')}>
                    <Image
                      source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                      style={webStyles.logoImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Text style={webStyles.formTitle}>Create Account</Text>
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
                      onPress={() => setSignupMethod('email')}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: signupMethod === 'email' ? '#01b854' : 'transparent',
                        borderColor: signupMethod === 'email' ? '#00ea6b' : 'transparent',
                        borderWidth: 1,
                        alignItems: 'center',
                        shadowColor: signupMethod === 'email' ? '#00ea6b' : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: signupMethod === 'email' ? 0.25 : 0,
                        shadowRadius: 8,
                      }}
                    >
                      <Text style={{
                        color: signupMethod === 'email' ? '#FFF' : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                        Email
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setSignupMethod('phone')}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: signupMethod === 'phone' ? '#01b854' : 'transparent',
                        borderColor: signupMethod === 'phone' ? '#00ea6b' : 'transparent',
                        borderWidth: 1,
                        alignItems: 'center',
                        shadowColor: signupMethod === 'phone' ? '#00ea6b' : 'transparent',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: signupMethod === 'phone' ? 0.25 : 0,
                        shadowRadius: 8,
                      }}
                    >
                      <Text style={{
                        color: signupMethod === 'phone' ? '#FFF' : 'rgba(255, 255, 255, 0.7)',
                        fontWeight: '700',
                        fontSize: 13,
                      }}>
                        Phone
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {signupMethod === 'email' ? (
                    <>
                      {/* Name Row */}
                      <View style={[webStyles.row, width < 600 && { flexDirection: 'column', gap: 0 }]}>
                        <View style={webStyles.col}>
                          <WebInput
                            label="First Name"
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="First name"
                          />
                        </View>
                        <View style={webStyles.col}>
                          <WebInput
                            label="Last Name"
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Last name"
                          />
                        </View>
                      </View>

                      {/* Email Field */}
                      <View style={webStyles.row}>
                        <View style={webStyles.col}>
                          <WebInput
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="example@email.com"
                            keyboardType="email-address"
                          />
                        </View>
                      </View>

                      {/* Location Row */}
                      <View style={[webStyles.row, width < 600 && { flexDirection: 'column', gap: 0 }]}>
                        <View style={webStyles.col}>
                          <WebInput
                            label="Address"
                            value={address}
                            onChangeText={setAddress}
                            placeholder="House / Street"
                          />
                        </View>
                        <View style={webStyles.col}>
                          <WebStatePicker
                            label="State"
                            value={stateName}
                            onValueChange={setStateName}
                            placeholder="Select your state"
                          />
                        </View>
                      </View>

                      {/* Password Row */}
                      <View style={[webStyles.row, width < 600 && { flexDirection: 'column', gap: 0 }]}>
                        <View style={webStyles.col}>
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
                        </View>
                        <View style={webStyles.col}>
                          <WebInput
                            label="Confirm Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder=""
                            secureTextEntry={!showConfirmPassword}
                            showToggle={true}
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                            isToggled={showConfirmPassword}
                          />
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                        <PasswordRequirement label="At least 1 lowercase (a-z)" met={/[a-z]/.test(password)} theme="dark" />
                        <PasswordRequirement label="At least 1 uppercase (A-Z)" met={/[A-Z]/.test(password)} theme="dark" />
                        <PasswordRequirement label="At least 1 number (0-9)" met={/[0-9]/.test(password)} theme="dark" />
                        <PasswordRequirement label="At least 8 characters" met={password.length >= 8} theme="dark" />
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Phone Field */}
                      <View style={webStyles.row}>
                        <View style={webStyles.col}>
                          <View style={{ marginBottom: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: '500', color: '#FFFFFF', marginBottom: 4 }}>Mobile Number</Text>
                            <View style={{ position: 'relative', width: '100%' }}>
                              <TextInput
                                style={{
                                  borderWidth: 1.5,
                                  borderColor: 'rgba(255, 255, 255, 0.2)',
                                  borderRadius: 8,
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  paddingRight: 110,
                                  fontSize: 14,
                                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                  color: '#FFFFFF',
                                  fontWeight: '400',
                                  outlineStyle: 'none',
                                } as any}
                                value={phone}
                                onChangeText={(text) => {
                                  setPhone(text);
                                  if (phoneOtpSent) {
                                    setPhoneOtpSent(false);
                                  }
                                }}
                                placeholder="Enter mobile number"
                                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                keyboardType="phone-pad"
                              />
                              <TouchableOpacity
                                onPress={phoneOtpTimer === 0 && !sendingOtp ? sendSignupPhoneOtp : undefined}
                                disabled={phoneOtpTimer > 0 || sendingOtp}
                                style={{
                                  position: 'absolute',
                                  right: 8,
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  backgroundColor: '#01b854',
                                  paddingHorizontal: 10,
                                  paddingVertical: 5,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                                  {sendingOtp ? '...' : phoneOtpTimer > 0 ? `${phoneOtpTimer}s` : phoneOtpSent ? 'RESEND' : 'SEND OTP'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Phone OTP Field (Show only if phoneOtpSent === true) */}
                      {phoneOtpSent && (
                        <View style={webStyles.row}>
                          <View style={webStyles.col}>
                            <WebInput
                              label="Verification Code (OTP)"
                              value={phoneOtpVal}
                              onChangeText={setPhoneOtpVal}
                              placeholder="Enter 6-digit code"
                              keyboardType="number-pad"
                              maxLength={6}
                            />
                          </View>
                        </View>
                      )}
                    </>
                  )}

                  {signupMethod === 'email' && Platform.OS === 'web' && TurnstileComponent && (
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
  
                  <View style={[webStyles.buttonRow, width < 400 && { flexDirection: 'column' }]}>
                    <TouchableOpacity
                      style={[webStyles.button, loading && { opacity: 0.7 }]}
                      onPress={handleSignup}
                      disabled={loading}
                    >
                      <Text style={webStyles.buttonText}>CREATE ACCOUNT</Text>
                    </TouchableOpacity>
  
                    <TouchableOpacity
                      style={webStyles.outlineButton}
                      onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace('/(auth)/login');
                      }}
                    >
                      <Text style={webStyles.outlineButtonText}>SIGN IN</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </View>
          </ScrollView>
        </ImageBackground>
        {renderOtpModal()}
      </View>
    );
  }

  //  Mobile layout 
  const isFocused = (field: string) => focusedField === field;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ImageBackground 
        source={require('../../assets/signup.jpg')} 
        style={styles.background}
        resizeMode="cover"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardHeaderRow}>
            <Pressable 
              style={styles.backBtnRelative}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/(auth)/login');
              }}
            >
              <ArrowLeft size={20} color="#1E293B" strokeWidth={2.5} />
            </Pressable>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={{ width: 40 }} />
          </View>

          <BlurView 
            intensity={90} 
            tint="light" 
            style={styles.card}
          >
            <View style={{ height: 16 }} />

            {/* Toggle Selector */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(15, 23, 42, 0.05)',
              borderRadius: 12,
              padding: 4,
              marginBottom: 16,
            }}>
              <TouchableOpacity
                onPress={() => setSignupMethod('email')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: signupMethod === 'email' ? '#01b854' : 'transparent',
                  borderColor: signupMethod === 'email' ? '#00ea6b' : 'transparent',
                  borderWidth: 1,
                  alignItems: 'center',
                  shadowColor: signupMethod === 'email' ? '#00ea6b' : 'transparent',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: signupMethod === 'email' ? 0.2 : 0,
                  shadowRadius: 8,
                }}
              >
                <Text style={{
                  color: signupMethod === 'email' ? '#FFF' : '#64748B',
                  fontWeight: '700',
                  fontSize: 13,
                }}>
                  Email
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSignupMethod('phone')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: signupMethod === 'phone' ? '#01b854' : 'transparent',
                  borderColor: signupMethod === 'phone' ? '#00ea6b' : 'transparent',
                  borderWidth: 1,
                  alignItems: 'center',
                  shadowColor: signupMethod === 'phone' ? '#00ea6b' : 'transparent',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: signupMethod === 'phone' ? 0.2 : 0,
                  shadowRadius: 8,
                }}
              >
                <Text style={{
                  color: signupMethod === 'phone' ? '#FFF' : '#64748B',
                  fontWeight: '700',
                  fontSize: 13,
                }}>
                  Phone
                </Text>
              </TouchableOpacity>
            </View>

            {signupMethod === 'email' ? (
              <>
                {/* Name Row */}
                <View style={styles.nameRow}>
                  <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Pressable onPress={() => firstNameRef.current?.focus()}>
                      <Text style={styles.fieldLabel}>First Name</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => firstNameRef.current?.focus()}
                      style={[styles.inputRow, isFocused('firstName') && styles.inputRowFocused]}
                    >
                      <User size={15} color={isFocused('firstName') ? '#01b854' : '#6b7280'} strokeWidth={2} />
                      <TextInput
                        ref={firstNameRef}
                        style={styles.textInput}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="First"
                        placeholderTextColor="#94A3B8"
                        onFocus={() => setFocusedField('firstName')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Pressable>
                  </View>
                  <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Pressable onPress={() => lastNameRef.current?.focus()}>
                      <Text style={styles.fieldLabel}>Last Name</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => lastNameRef.current?.focus()}
                      style={[styles.inputRow, isFocused('lastName') && styles.inputRowFocused]}
                    >
                      <TextInput
                        ref={lastNameRef}
                        style={[styles.textInput, { paddingLeft: 2 }]}
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Last"
                        placeholderTextColor="#94A3B8"
                        onFocus={() => setFocusedField('lastName')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Email Field */}
                <View style={styles.fieldWrap}>
                  <Pressable onPress={() => emailRef.current?.focus()}>
                    <Text style={styles.fieldLabel}>Email</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => emailRef.current?.focus()}
                    style={[styles.inputRow, isFocused('email') && styles.inputRowFocused]}
                  >
                    <Mail size={17} color={isFocused('email') ? '#01b854' : '#6b7280'} strokeWidth={2} />
                    <TextInput
                      ref={emailRef}
                      style={styles.textInput}
                      value={email}
                      onChangeText={setEmail}
                      placeholder=""
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </Pressable>
                </View>

                {/* Location Row */}
                <View style={styles.nameRow}>
                  <View style={[styles.fieldWrap, { flex: 1.5 }]}>
                    <Pressable onPress={() => addressRef.current?.focus()}>
                      <Text style={styles.fieldLabel}>Address</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => addressRef.current?.focus()}
                      style={[styles.inputRow, isFocused('address') && styles.inputRowFocused]}
                    >
                      <MapPin size={15} color={isFocused('address') ? '#01b854' : '#6b7280'} strokeWidth={2} />
                      <TextInput
                        ref={addressRef}
                        style={styles.textInput}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Street/Locality"
                        placeholderTextColor="#94A3B8"
                        onFocus={() => setFocusedField('address')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Pressable>
                  </View>
                  <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>State</Text>
                    <TouchableOpacity
                      onPress={() => setShowStatePicker(true)}
                      style={[styles.inputRow, isFocused('state') && styles.inputRowFocused]}
                    >
                      <Text style={[styles.textInput, !stateName && { color: '#94A3B8' }]}>
                        {stateName || "State"}
                      </Text>
                      <ChevronDown size={15} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Fields */}
                <View style={styles.fieldWrap}>
                  <Pressable onPress={() => passwordRef.current?.focus()}>
                    <Text style={styles.fieldLabel}>Password</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => passwordRef.current?.focus()}
                    style={[styles.inputRow, isFocused('password') && styles.inputRowFocused]}
                  >
                    <Lock size={17} color={isFocused('password') ? '#01b854' : '#6b7280'} strokeWidth={2} />
                    <TextInput
                      ref={passwordRef}
                      style={styles.textInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder=""
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                      {showPassword ? (
                        <EyeOff size={17} color="#6b7280" strokeWidth={2} />
                      ) : (
                        <Eye size={17} color="#6b7280" strokeWidth={2} />
                      )}
                    </Pressable>
                  </Pressable>
                  
                  <View style={[styles.passwordRequirements, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                    <PasswordRequirement label="At least 1 lowercase (a-z)" met={/[a-z]/.test(password)} theme="dark" />
                    <PasswordRequirement label="At least 1 uppercase (A-Z)" met={/[A-Z]/.test(password)} theme="dark" />
                    <PasswordRequirement label="At least 1 number (0-9)" met={/[0-9]/.test(password)} theme="dark" />
                    <PasswordRequirement label="At least 8 characters" met={password.length >= 8} theme="dark" />
                  </View>
                </View>

                <View style={styles.fieldWrap}>
                  <Pressable onPress={() => confirmPasswordRef.current?.focus()}>
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => confirmPasswordRef.current?.focus()}
                    style={[styles.inputRow, isFocused('confirmPassword') && styles.inputRowFocused]}
                  >
                    <Lock size={17} color={isFocused('confirmPassword') ? '#01b854' : '#6b7280'} strokeWidth={2} />
                    <TextInput
                      ref={confirmPasswordRef}
                      style={styles.textInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder=""
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirmPassword}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Pressable onPress={() => setShowConfirmPassword((v) => !v)} hitSlop={8}>
                      {showConfirmPassword ? (
                        <EyeOff size={17} color="#6b7280" strokeWidth={2} />
                      ) : (
                        <Eye size={17} color="#6b7280" strokeWidth={2} />
                      )}
                    </Pressable>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {/* Phone Field with Inline SEND OTP button */}
                <View style={styles.fieldWrap}>
                  <Pressable onPress={() => phoneRef.current?.focus()}>
                    <Text style={styles.fieldLabel}>Mobile Number</Text>
                  </Pressable>
                  <Pressable 
                    onPress={() => phoneRef.current?.focus()}
                    style={[styles.inputRow, isFocused('phone') && styles.inputRowFocused]}
                  >
                    <Phone size={15} color={isFocused('phone') ? '#01b854' : '#6b7280'} strokeWidth={2} />
                    <TextInput
                      ref={phoneRef}
                      style={[styles.textInput, { flex: 1 }]}
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text);
                        if (phoneOtpSent) setPhoneOtpSent(false);
                      }}
                      placeholder="Mobile Number"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity
                      onPress={phoneOtpTimer === 0 && !sendingOtp ? sendSignupPhoneOtp : undefined}
                      disabled={phoneOtpTimer > 0 || sendingOtp}
                      style={{
                        backgroundColor: '#01b854',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                        {sendingOtp ? '...' : phoneOtpTimer > 0 ? `${phoneOtpTimer}s` : phoneOtpSent ? 'RESEND' : 'SEND OTP'}
                      </Text>
                    </TouchableOpacity>
                  </Pressable>
                </View>

                {/* Verification Code OTP Field */}
                {phoneOtpSent && (
                  <View style={styles.fieldWrap}>
                    <Pressable onPress={() => phoneOtpRef.current?.focus()}>
                      <Text style={styles.fieldLabel}>Verification Code (OTP)</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => phoneOtpRef.current?.focus()}
                      style={[styles.inputRow, isFocused('phoneOtp') && styles.inputRowFocused]}
                    >
                      <Lock size={15} color={isFocused('phoneOtp') ? '#01b854' : '#6b7280'} strokeWidth={2} />
                      <TextInput
                        ref={phoneOtpRef}
                        style={styles.textInput}
                        value={phoneOtpVal}
                        onChangeText={setPhoneOtpVal}
                        placeholder="Enter 6-digit code"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        onFocus={() => setFocusedField('phoneOtp')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Pressable>
                  </View>
                )}
              </>
            )}

            <View style={[styles.buttonRow, width < 400 && { flexDirection: 'column' }]}>
            <Pressable
              style={[styles.signUpBtn, loading && { opacity: 0.7 }]}
              onPress={handleSignup}
              disabled={loading}
            >
                <Text style={styles.signUpBtnText}>SIGN UP</Text>
            </Pressable>
            <Pressable style={styles.outlineBtn} onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(auth)/login');
            }}>
              <Text style={styles.outlineBtnText}>SIGN IN</Text>
            </Pressable>
          </View>
        </BlurView>
      </ScrollView>
    </ImageBackground>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <View style={modalStyles.iconBg}>
              <CheckCircle size={40} color="#01b854" strokeWidth={2.5} />
            </View>
            <Text style={modalStyles.title}>Success!</Text>
            <Text style={modalStyles.message}>Your account has been created successfully. Welcome to BookYourGround!</Text>
            <TouchableOpacity
              style={modalStyles.button}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(auth)/login');
              }}
            >
              <Text style={modalStyles.buttonText}>SIGN IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderOtpModal()}

      {/* State Picker Modal for Mobile */}
      <Modal visible={showStatePicker} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.card, { padding: 0, maxHeight: '80%' }]}>
            <View style={{ padding: 20, width: '100%', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[modalStyles.title, { marginBottom: 0 }]}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Text style={{ color: '#01b854', fontWeight: '700' }}>DONE</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ width: '100%' }}>
              {INDIAN_STATES.map((state) => (
                <TouchableOpacity
                  key={state}
                  onPress={() => {
                    setStateName(state);
                    setShowStatePicker(false);
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                    backgroundColor: stateName === state ? 'rgba(0,234,107,0.1)' : 'transparent',
                  }}
                >
                  <Text style={{ color: stateName === state ? '#01b854' : '#1E293B', fontSize: 16, fontFamily: 'Inter', fontWeight: '500' }}>{state}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

//  Web state picker component 
function WebStatePicker(props: any) {
  const { label, value, onValueChange } = props;
  return (
    <WebGenericPicker
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={INDIAN_STATES}
      placeholder="Select state"
    />
  );
}

function WebGenericPicker(props: any) {
  const { label, value, onValueChange, options, placeholder = "Select option" } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '500', color: '#FFFFFF', marginBottom: 4 }}>{label}</Text>}
      <View style={{ position: 'relative', width: '100%' }}>
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          style={{
            width: '100%',
            appearance: 'none',
            border: '1.5px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            outline: 'none',
            cursor: 'pointer',
            fontWeight: '400',
          }}
        >
          <option value="" disabled hidden style={{ backgroundColor: '#1e293b', color: '#fff' }}>{placeholder}</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt} style={{ backgroundColor: '#1e293b', color: '#FFFFFF' }}>
              {opt}
            </option>
          ))}
        </select>
        <View style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <ChevronDown size={14} color="#FFFFFF" />
        </View>
      </View>
    </View>
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
          placeholderTextColor="rgba(255, 255, 255, 0.6)"
          {...rest}
        />
        {showToggle && (
          <TouchableOpacity 
            onPress={onToggle}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}
          >
            {isToggled ? <EyeOff size={16} color="#475569" /> : <Eye size={16} color="#475569" />}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#043529' },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  backBtnRelative: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  logo: { width: 240, height: 60 },
  headingWrap: { alignItems: 'center', marginTop: 0, marginBottom: 16 },
  card: { 
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
    borderRadius: 32, 
    padding: 24, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
    overflow: 'hidden',
  },
  nameRow: { flexDirection: 'row', gap: 10 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { 
    fontSize: 11, 
    fontWeight: '500', 
    color: '#FFFFFF', 
    marginBottom: 4, 
    letterSpacing: 0.2,
    fontFamily: 'Inter',
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.5)', 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.3)', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    gap: 8 
  },
  inputRowFocused: { 
    backgroundColor: '#FFFFFF',
    borderColor: 'transparent',
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
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
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  signUpBtn: { 
    flex: 1, 
    backgroundColor: '#01b854', 
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
  signUpBtnText: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: '#FFFFFF', 
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
    justifyContent: 'center' 
  },
  outlineBtnText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  passwordRequirements: {
    marginTop: 8,
    paddingLeft: 4,
  },
});

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
    maxWidth: 580, 
    backgroundColor: 'rgba(15, 23, 42, 0.4)', 
    borderRadius: 32, 
    paddingHorizontal: 32, 
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
    color: '#FFFFFF', 
    marginTop: 4, 
    marginBottom: 0,
    fontFamily: 'Inter',
  },
  form: { },
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  col: { flex: 1 },
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
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
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
    elevation: 10 
  },
  iconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 12, fontFamily: 'Inter' },
  message: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28, fontFamily: 'Inter' },
  button: { backgroundColor: '#01b854', paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1, fontFamily: 'Inter' },
});
