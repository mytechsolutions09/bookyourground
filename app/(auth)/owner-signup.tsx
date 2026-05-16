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
  ActivityIndicator,
  Modal,
  ImageBackground,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User, Phone, MapPin, Building2, ChevronDown, Eye, EyeOff } from 'lucide-react-native';
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

export default function OwnerSignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const { signUp } = useAuth();
  const { width } = useWindowDimensions();
  const showHeroImage = Platform.OS === 'web' && width >= 1000;

  const handleSignup = async () => {
    if (!email || !password || !fullName || !businessName || !phone || !address || !state) {
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

    setLoading(true);
    const { error } = await signUp(email, password, fullName, phone, 'ground_owner', businessName, address, state, undefined, undefined, turnstileToken || undefined);
    setLoading(false);

    if (error) {
      let msg = error.message;
      if (msg.includes('confirmation email')) {
        msg = 'Error sending confirmation email. This usually means the email provider is not configured correctly in the backend or rate limits were exceeded. Please check your Supabase SMTP settings.';
      }
      if (Platform.OS === 'web') alert('Error: ' + msg);
      else Alert.alert('Error', msg);
    } else {
      const msg = 'Application submitted! Please check your email to verify your account.';
      if (Platform.OS === 'web') {
        alert(msg);
        router.replace('/(auth)/login');
      } else {
        Alert.alert('Success', msg, [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
      }
    }
  };

  // ── Web layout ────────────────────────────────────────────────────────────
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
                  <Text style={webStyles.formTitle}>Partner with Us</Text>
                  <Text style={webStyles.formSubtitle}>List your venue and reach players</Text>
                </View>

                <View style={webStyles.form}>
                  <View style={[webStyles.row, width < 600 && { flexDirection: 'column', gap: 0 }]}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Venue Name"
                        value={businessName}
                        onChangeText={setBusinessName}
                        placeholder="e.g. Dream Arena"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Owner Name"
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Your full name"
                      />
                    </View>
                  </View>

                  <View style={[webStyles.row, width < 600 && { flexDirection: 'column', gap: 0 }]}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        placeholder=""
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Phone"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+91..."
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

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
                        label="Confirm"
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

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12, gap: 4 }}>
                    {password.length > 0 && !/[a-z]/.test(password) && <PasswordRequirement label="1 lower" met={false} theme="light" />}
                    {password.length > 0 && !/[A-Z]/.test(password) && <PasswordRequirement label="1 upper" met={false} theme="light" />}
                    {password.length > 0 && !/[0-9]/.test(password) && <PasswordRequirement label="1 num" met={false} theme="light" />}
                    {password.length > 0 && password.length < 8 && <PasswordRequirement label="8+ chars" met={false} theme="light" />}
                  </View>

                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Address"
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Street address"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebStatePicker
                        label="State"
                        value={state}
                        onValueChange={setState}
                      />
                    </View>
                  </View>

                  {Platform.OS === 'web' && TurnstileComponent && (
                    <View style={{ marginBottom: 12, alignItems: 'center', minHeight: 65 }}>
                      <TurnstileComponent
                        siteKey={process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAA4N2_8m7n6b5v4c'} 
                        onSuccess={(token: string) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken(null)}
                        onError={() => setTurnstileToken(null)}
                        options={{ theme: 'light', size: 'normal' }}
                      />
                    </View>
                  )}

                  <View style={[webStyles.buttonRow, width < 400 && { flexDirection: 'column' }]}>
                    <TouchableOpacity
                      style={[webStyles.button, loading && { opacity: 0.7 }]}
                      onPress={handleSignup}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={webStyles.buttonText}>REGISTER</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={webStyles.outlineButton}
                      onPress={() => router.replace('/(auth)/login')}
                    >
                      <Text style={webStyles.outlineButtonText}>LOGIN</Text>
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

  // ── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <ImageBackground 
        source={require('../../assets/background.jpg')} 
        style={styles.background}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.screen}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <BlurView intensity={90} tint="light" style={styles.card}>
              <View style={styles.headingWrap}>
                <Text style={styles.title}>Partner Signup</Text>
                <Text style={styles.subtitle}>List your venue and start accepting bookings</Text>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Venue Name</Text>
                <View style={styles.inputRow}>
                  <Building2 size={17} color="#475569" />
                  <TextInput
                    style={styles.textInput}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="e.g. Dream Arena"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Owner Name</Text>
                <View style={styles.inputRow}>
                  <User size={17} color="#475569" />
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Your full name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={styles.inputRow}>
                  <Mail size={17} color="#475569" />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder=""
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <View style={styles.inputRow}>
                  <Phone size={17} color="#475569" />
                  <TextInput
                    style={styles.textInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+91..."
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Business Address</Text>
                <View style={styles.inputRow}>
                  <MapPin size={17} color="#475569" />
                  <TextInput
                    style={styles.textInput}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Venue street address"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>State</Text>
                <TouchableOpacity 
                  onPress={() => setShowStatePicker(true)}
                  style={styles.inputRow}
                >
                  <MapPin size={17} color="#475569" />
                  <Text style={[styles.textInput, !state && { color: '#94a3b8' }]}>
                    {state || "Select State"}
                  </Text>
                  <ChevronDown size={15} color="#475569" />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <Lock size={17} color="#475569" />
                  <TextInput
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder=""
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={17} color="#475569" /> : <Eye size={17} color="#475569" />}
                  </TouchableOpacity>
                </View>
                <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {password.length > 0 && !/[a-z]/.test(password) && <PasswordRequirement label="1 lower" met={false} theme="light" />}
                  {password.length > 0 && !/[A-Z]/.test(password) && <PasswordRequirement label="1 upper" met={false} theme="light" />}
                  {password.length > 0 && !/[0-9]/.test(password) && <PasswordRequirement label="1 num" met={false} theme="light" />}
                  {password.length > 0 && password.length < 8 && <PasswordRequirement label="8+ chars" met={false} theme="light" />}
                </View>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <View style={styles.inputRow}>
                  <Lock size={17} color="#475569" />
                  <TextInput
                    style={styles.textInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder=""
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={17} color="#475569" /> : <Eye size={17} color="#475569" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.buttonRow, width < 400 && { flexDirection: 'column' }]}>
                <TouchableOpacity
                  style={[styles.signupBtn, loading && { opacity: 0.7 }]}
                  onPress={handleSignup}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signupBtnText}>SIGN UP</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <Text style={styles.outlineBtnText}>LOGIN</Text>
                </TouchableOpacity>
              </View>
            </BlurView>

            <TouchableOpacity onPress={() => router.replace('/')} style={styles.homeLink}>
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>

      {/* State Picker Modal for Mobile */}
      <Modal visible={showStatePicker} transparent animationType="slide">
        <View style={mobilePickerStyles.overlay}>
          <View style={mobilePickerStyles.card}>
            <View style={mobilePickerStyles.header}>
              <Text style={mobilePickerStyles.title}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Text style={mobilePickerStyles.doneText}>DONE</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ width: '100%', maxHeight: 400 }}>
              {INDIAN_STATES.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => {
                    setState(s);
                    setShowStatePicker(false);
                  }}
                  style={[
                    mobilePickerStyles.item,
                    state === s && mobilePickerStyles.itemActive
                  ]}
                >
                  <Text style={[
                    mobilePickerStyles.itemText,
                    state === s && mobilePickerStyles.itemTextActive
                  ]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Web state picker component ─────────────────────────────────────────────
function WebStatePicker(props: any) {
  const { label, value, onValueChange } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && <Text style={{ fontSize: 12, fontWeight: '500', color: '#F1F5F9', marginBottom: 4 }}>{label}</Text>}
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
            fontWeight: '400',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="" disabled hidden>Select state</option>
          {INDIAN_STATES.map(state => (
            <option key={state} value={state} style={{ backgroundColor: '#FFF', color: '#0F172A' }}>
              {state}
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

const mobilePickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,53,41,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f9fafb',
  },
  doneText: {
    color: '#01b854',
    fontWeight: '700',
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemActive: {
    backgroundColor: 'rgba(0,234,107,0.1)',
  },
  itemText: {
    color: '#f9fafb',
    fontSize: 16,
  },
  itemTextActive: {
    color: '#01b854',
    fontWeight: '600',
  },
});

function WebInput(props: any) {
  const { label, showToggle, onToggle, isToggled, ...rest } = props;
  return (
    <View style={{ marginBottom: 10 }}>
      {label && (
        <Text style={{ fontSize: 12, fontWeight: '500', color: '#F1F5F9', marginBottom: 4 }}>
          {label}
        </Text>
      )}
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
            fontWeight: '400',
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
  screen: { flex: 1 },
  background: { flex: 1, width: '100%', height: '100%' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 240, height: 60 },
  headingWrap: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#E2E8F0', textAlign: 'center' },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 24, padding: 24, overflow: 'hidden' },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '500', color: '#F1F5F9', marginBottom: 6, letterSpacing: 0.3 },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.5)', 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.3)', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    gap: 10 
  },
  textInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  signupBtn: { 
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
  signupBtnText: { 
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
    borderColor: '#475569', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  outlineBtnText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#475569', 
    letterSpacing: 0.5,
    fontFamily: 'Inter',
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
    maxWidth: 520, 
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
  header: { marginBottom: 20, alignItems: 'center' },
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
    color: '#475569', 
    marginTop: 4, 
    fontFamily: 'Inter' 
  },
  form: { },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
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
    borderColor: '#FFFFFF', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  outlineButtonText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    textTransform: 'uppercase' as any,
    fontFamily: 'Inter',
  },
});
