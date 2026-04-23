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
import { ArrowLeft, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, CheckCircle, ChevronDown, Users } from 'lucide-react-native';
import PasswordRequirement from '@/components/ui/PasswordRequirement';

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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const firstNameRef = React.useRef<TextInput>(null);
  const lastNameRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const phoneRef = React.useRef<TextInput>(null);
  const teamRef = React.useRef<TextInput>(null);
  const addressRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);
  const confirmPasswordRef = React.useRef<TextInput>(null);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { signUp } = useAuth();
  const { width } = useWindowDimensions();
  const showHeroImage = Platform.OS === 'web' && width >= 900;

  const handleSignup = async () => {
    if (!firstName || !lastName || !phone || !address || !stateName || !email || !password) {
      const msg = 'Please fill in all required fields';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < 6 || !hasLower || !hasUpper || !hasNumber) {
      const msg = 'Password must be at least 6 characters and contain at least one lowercase letter, one uppercase letter, and one number.';
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

    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await signUp(email, password, fullName, phone, 'user', undefined, address, stateName, teamName, 'Player', turnstileToken || undefined);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') alert('Signup Failed: ' + error.message);
      else Alert.alert('Signup Failed', error.message);
    } else {
      setShowSuccessModal(true);
    }
  };

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
              <BlurView intensity={Platform.OS === 'web' ? 25 : 90} tint="light" style={webStyles.glassCard}>
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
                  <View style={webStyles.row}>
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
  
                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Mobile Number"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="..."
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="email@example.com"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>
 
                  <View style={webStyles.row}>
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
  
                  <WebInput
                    label="Team Name (Squad)"
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="e.g. Yankees XI"
                  />
 
                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Min 6 characters"
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
                        placeholder="Repeat password"
                        secureTextEntry={!showConfirmPassword}
                        showToggle={true}
                        onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                        isToggled={showConfirmPassword}
                      />
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                    <PasswordRequirement label="At least 1 lowercase (a-z)" met={/[a-z]/.test(password)} theme="light" />
                    <PasswordRequirement label="At least 1 uppercase (A-Z)" met={/[A-Z]/.test(password)} theme="light" />
                    <PasswordRequirement label="At least 1 number (0-9)" met={/[0-9]/.test(password)} theme="light" />
                    <PasswordRequirement label="At least 6 characters" met={password.length >= 6} theme="light" />
                  </View>
 
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
  
                  <View style={webStyles.buttonRow}>
                    <TouchableOpacity
                      style={[webStyles.button, loading && { opacity: 0.7 }]}
                      onPress={handleSignup}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={webStyles.buttonText}>CREATE ACCOUNT</Text>
                      )}
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
                placeholder="Enter your email"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </Pressable>
          </View>

          <View style={styles.fieldWrap}>
            <Pressable onPress={() => phoneRef.current?.focus()}>
              <Text style={styles.fieldLabel}>Mobile</Text>
            </Pressable>
            <Pressable 
              onPress={() => phoneRef.current?.focus()}
              style={[styles.inputRow, isFocused('phone') && styles.inputRowFocused]}
            >
              <Phone size={15} color={isFocused('phone') ? '#01b854' : '#6b7280'} strokeWidth={2} />
              <TextInput
                ref={phoneRef}
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="..."
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
              />
            </Pressable>
          </View>

          <View style={styles.fieldWrap}>
            <Pressable onPress={() => teamRef.current?.focus()}>
              <Text style={styles.fieldLabel}>Team Name (Squad)</Text>
            </Pressable>
            <Pressable 
              onPress={() => teamRef.current?.focus()}
              style={[styles.inputRow, isFocused('teamName') && styles.inputRowFocused]}
            >
              <Users size={15} color={isFocused('teamName') ? '#01b854' : '#6b7280'} strokeWidth={2} />
              <TextInput
                ref={teamRef}
                style={styles.textInput}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Yankees XI"
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('teamName')}
                onBlur={() => setFocusedField(null)}
              />
            </Pressable>
          </View>

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
                placeholder="Min 6 characters"
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
              <PasswordRequirement label="At least 1 lowercase (a-z)" met={/[a-z]/.test(password)} theme="light" />
              <PasswordRequirement label="At least 1 uppercase (A-Z)" met={/[A-Z]/.test(password)} theme="light" />
              <PasswordRequirement label="At least 1 number (0-9)" met={/[0-9]/.test(password)} theme="light" />
              <PasswordRequirement label="At least 6 characters" met={password.length >= 6} theme="light" />
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
                placeholder="Repeat password"
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

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.signUpBtn, loading && { opacity: 0.7 }]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#043529" size="small" />
              ) : (
                <Text style={styles.signUpBtnText}>SIGN UP</Text>
              )}
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
                router.replace('/(tabs)/dashboard');
              }}
            >
              <Text style={modalStyles.buttonText}>GET STARTED</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>



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
      {label && <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>{label}</Text>}
      <View style={{ position: 'relative', width: '100%' }}>
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          style={{
            width: '100%',
            appearance: 'none',
            border: '1.5px solid rgba(15, 23, 42, 0.2)',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: '#0F172A',
            outline: 'none',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt} style={{ backgroundColor: '#fff', color: '#0F172A' }}>
              {opt}
            </option>
          ))}
        </select>
        <View style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <ChevronDown size={14} color="#475569" />
        </View>
      </View>
    </View>
  );
}

function WebInput(props: any) {
  const { label, showToggle, onToggle, isToggled, ...rest } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>{label}</Text>}
      <View style={{ position: 'relative', width: '100%' }}>
        <TextInput
          style={{
            borderWidth: 1.5,
            borderColor: 'rgba(15, 23, 42, 0.2)',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            paddingRight: showToggle ? 40 : 10,
            fontSize: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: '#0F172A',
            fontWeight: '600',
            outlineStyle: 'none',
          } as any}
          placeholderTextColor="#64748B"
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
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
    fontWeight: '500',
  },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  signUpBtn: { 
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
  signUpBtnText: { 
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
    justifyContent: 'center' 
  },
  outlineBtnText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#475569', 
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
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
  logoImage: { width: 240, height: 60, marginBottom: 8 },
  formTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: '#0F172A', 
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
    backgroundColor: '#1E293B', 
    borderRadius: 12, 
    height: 48, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  buttonText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  outlineButton: { 
    flex: 1, 
    borderRadius: 12, 
    height: 48, 
    borderWidth: 1.5, 
    borderColor: '#475569', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  outlineButtonText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#475569', 
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
