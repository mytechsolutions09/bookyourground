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
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, Mail, Lock, Phone, MapPin, Eye, EyeOff, CheckCircle, ChevronDown, Users } from 'lucide-react-native';

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
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [playerType, setPlayerType] = useState('Player');
  const [showPlayerTypePicker, setShowPlayerTypePicker] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const firstNameRef = React.useRef<TextInput>(null);
  const lastNameRef = React.useRef<TextInput>(null);
  const emailRef = React.useRef<TextInput>(null);
  const phoneRef = React.useRef<TextInput>(null);
  const teamRef = React.useRef<TextInput>(null);
  const addressRef = React.useRef<TextInput>(null);
  const passwordRef = React.useRef<TextInput>(null);

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

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await signUp(email, password, fullName, phone, 'user', undefined, address, stateName, teamName, playerType, turnstileToken || undefined);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') alert('Signup Failed: ' + error.message);
      else Alert.alert('Signup Failed', error.message);
    } else {
      setShowSuccessModal(true);
    }
  };

  // ── Web layout ────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
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
  
                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Team Name"
                        value={teamName}
                        onChangeText={setTeamName}
                        placeholder="e.g. Yankees XI"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebGenericPicker
                        label="I am a"
                        value={playerType}
                        onValueChange={setPlayerType}
                        options={['Captain', 'Player']}
                      />
                    </View>
                  </View>

                  <WebInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Min 6 characters"
                    secureTextEntry
                  />

                  {Platform.OS === 'web' && TurnstileComponent && (
                    <View style={{ marginBottom: 16, alignItems: 'center', minHeight: 65 }}>
                      <TurnstileComponent
                        siteKey={process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAA4N2_8m7n6b5v4c'} 
                        onSuccess={(token: string) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken(null)}
                        onError={() => setTurnstileToken(null)}
                        options={{
                          theme: 'dark',
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
                        <ActivityIndicator color="#043529" size="small" />
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
  const isFocused = (field: string) => focusedField === field;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(auth)/login');
        }}>
          <ArrowLeft size={20} color="#1E293B" strokeWidth={2.5} />
        </Pressable>

        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Spacing between logo and card */}
        <View style={{ height: 16 }} />

        <View style={styles.card}>
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

          <View style={styles.nameRow}>
            <View style={[styles.fieldWrap, { flex: 1.5 }]}>
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
            <View style={[styles.fieldWrap, { flex: 1 }]}>
               <Text style={styles.fieldLabel}>Role</Text>
               <TouchableOpacity
                 onPress={() => setShowPlayerTypePicker(true)}
                 style={[styles.inputRow, isFocused('playerType') && styles.inputRowFocused]}
               >
                 <Text style={styles.textInput}>{playerType}</Text>
                 <ChevronDown size={15} color="#6b7280" />
               </TouchableOpacity>
            </View>
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
        </View>
      </ScrollView>

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

      {/* Player Type Picker Modal for Mobile */}
      <Modal visible={showPlayerTypePicker} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.card, { padding: 0, maxHeight: '40%' }]}>
            <View style={{ padding: 20, width: '100%', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[modalStyles.title, { marginBottom: 0 }]}>Select Role</Text>
              <TouchableOpacity onPress={() => setShowPlayerTypePicker(false)}>
                <Text style={{ color: '#01b854', fontWeight: '700' }}>DONE</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ width: '100%' }}>
              {['Captain', 'Player'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setPlayerType(type);
                    setShowPlayerTypePicker(false);
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                    backgroundColor: playerType === type ? 'rgba(0,234,107,0.1)' : 'transparent',
                  }}
                >
                  <Text style={{ color: playerType === type ? '#10B981' : '#1E293B', fontSize: 16, fontFamily: 'Inter', fontWeight: '500' }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
                  <Text style={{ color: stateName === state ? '#10B981' : '#1E293B', fontSize: 16, fontFamily: 'Inter', fontWeight: '500' }}>{state}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Web state picker component ─────────────────────────────────────────────
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
      {label && <Text style={{ fontSize: 12, fontWeight: '600', color: '#E5E7EB', marginBottom: 4 }}>{label}</Text>}
      <div style={{ position: 'relative', width: '100%' }}>
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          style={{
            width: '100%',
            appearance: 'none',
            border: '1px solid rgba(0, 234, 107, 0.12)',
            borderRadius: '8px',
            padding: '8px 10px',
            fontSize: '14px',
            backgroundColor: '#06392e',
            color: '#f9fafb',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="" disabled hidden>{placeholder}</option>
          {options.map((opt: string) => (
            <option key={opt} value={opt} style={{ backgroundColor: '#06392e', color: '#f9fafb' }}>
              {opt}
            </option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <ChevronDown size={14} color="#6b7280" />
        </div>
      </div>
    </View>
  );
}

function WebInput(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '600', color: '#E5E7EB', marginBottom: 4 }}>{label}</Text>}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },
  backBtn: { 
    position: 'absolute', 
    top: 52, 
    left: 20, 
    zIndex: 10, 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoWrap: { alignItems: 'center', marginTop: 48, marginBottom: 8 },
  logo: { width: 240, height: 60 },
  headingWrap: { alignItems: 'center', marginTop: 0, marginBottom: 16 },
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 28, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  nameRow: { flexDirection: 'row', gap: 10 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#334155', 
    marginBottom: 6, 
    letterSpacing: 0.2,
    fontFamily: 'Inter',
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC', 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    paddingHorizontal: 12, 
    paddingVertical: 11, 
    gap: 8 
  },
  inputRowFocused: { 
    backgroundColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  textInput: { 
    flex: 1, 
    fontSize: 14, 
    color: '#0F172A', 
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  signUpBtn: { 
    flex: 1, 
    backgroundColor: '#10B981', 
    borderRadius: 12, 
    height: 48, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  signUpBtnText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  outlineBtn: { 
    flex: 1, 
    borderRadius: 12, 
    height: 48, 
    borderWidth: 1.5, 
    borderColor: '#10B981', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  outlineBtnText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#059669', 
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
});

const webStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#043529' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', flexDirection: 'row-reverse' as any, alignItems: 'stretch', width: '100%' },
  header: { marginBottom: 16, alignItems: 'center' },
  logoImage: { width: 180, height: 40, marginBottom: 8 },
  form: { },
  heroColumn: { flex: 1, width: '50%' as any },
  formContainer: { flex: 1, width: '100%', backgroundColor: '#043529', paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center', alignItems: 'center' },
  formCard: { width: '100%', maxWidth: 580, backgroundColor: '#06392e', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 20, borderWidth: 1, borderColor: 'rgba(0,234,107,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  formTitle: { fontSize: 22, fontWeight: '800', color: '#f9fafb', marginTop: 4, marginBottom: 4 },
  heroImage: { flex: 1, width: '50%' as any, overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  col: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1, backgroundColor: '#01b854', borderRadius: 8, height: 40, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 13, fontWeight: '700', color: '#043529', letterSpacing: 0.5 },
  outlineButton: { flex: 1, borderRadius: 8, height: 40, borderWidth: 1.5, borderColor: '#01b854', alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { fontSize: 13, fontWeight: '700', color: '#01b854', textTransform: 'uppercase' as any },
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
  button: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1, fontFamily: 'Inter' },
});
