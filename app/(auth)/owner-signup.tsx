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
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User, Phone, MapPin, Building2, ChevronDown } from 'lucide-react-native';

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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

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

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName, phone, 'ground_owner', businessName, address, state);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') alert('Error: ' + error.message);
      else Alert.alert('Error', error.message);
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
                  <Text style={webStyles.formTitle}>Partner with Us</Text>
                  <Text style={webStyles.formSubtitle}>List your ground and reach thousands of players</Text>
                </View>

                <View style={webStyles.form}>
                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Ground Name"
                        value={businessName}
                        onChangeText={setBusinessName}
                        placeholder="e.g. Arena Sports Park"
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

                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="business@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Phone Number"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+91..."
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <WebInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create a strong password"
                    secureTextEntry
                  />

                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Business Address"
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Ground street address"
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

                  <View style={webStyles.buttonRow}>
                    <TouchableOpacity
                      style={[webStyles.button, loading && { opacity: 0.7 }]}
                      onPress={handleSignup}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#043529" size="small" />
                      ) : (
                        <Text style={webStyles.buttonText}>REGISTER GROUND</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={webStyles.outlineButton}
                      onPress={() => router.replace('/(auth)/login')}
                    >
                      <Text style={webStyles.outlineButtonText}>OWNER LOGIN</Text>
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
                <View style={{ flex: 1, backgroundColor: 'rgba(4,53,41,0.5)' }} />
              </View>
              <View style={webStyles.heroOverlayContent}>
                <Text style={webStyles.heroOverTitle}>Join the Booking Revolution</Text>
                <Text style={webStyles.heroOverSub}>Monetize your turf with the most advanced sports booking platform.</Text>
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
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headingWrap}>
          <Text style={styles.title}>Partner Signup</Text>
          <Text style={styles.subtitle}>List your ground and start accepting bookings</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Ground Name</Text>
            <View style={styles.inputRow}>
              <Building2 size={17} color="#6b7280" />
              <TextInput
                style={styles.textInput}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Dream Arena"
                placeholderTextColor="#4b5563"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Owner Name</Text>
            <View style={styles.inputRow}>
              <User size={17} color="#6b7280" />
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor="#4b5563"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.inputRow}>
              <Mail size={17} color="#6b7280" />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#4b5563"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <View style={styles.inputRow}>
              <Phone size={17} color="#6b7280" />
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91..."
                placeholderTextColor="#4b5563"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Business Address</Text>
            <View style={styles.inputRow}>
              <MapPin size={17} color="#6b7280" />
              <TextInput
                style={styles.textInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Ground street address"
                placeholderTextColor="#4b5563"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>State</Text>
            <TouchableOpacity 
              onPress={() => setShowStatePicker(true)}
              style={styles.inputRow}
            >
              <MapPin size={17} color="#6b7280" />
              <Text style={[styles.textInput, !state && { color: '#4b5563' }]}>
                {state || "Select State"}
              </Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <ChevronDown size={15} color="#6b7280" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputRow}>
              <Lock size={17} color="#6b7280" />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor="#4b5563"
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.signupBtn, loading && { opacity: 0.7 }]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#043529" /> : <Text style={styles.signupBtnText}>SIGN UP</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.outlineBtnText}>LOGIN</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.replace('/')} style={styles.homeLink}>
          <Text style={styles.homeLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

// ── Web state picker component ─────────────────────────────────────────────
function WebStatePicker(props: any) {
  const { label, value, onValueChange } = props;
  return (
    <View style={{ marginBottom: 12 }}>
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
            padding: '10px 12px',
            fontSize: '14px',
            backgroundColor: '#06392e',
            color: '#f9fafb',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="" disabled hidden>Select state</option>
          {INDIAN_STATES.map(state => (
            <option key={state} value={state} style={{ backgroundColor: '#06392e', color: '#f9fafb' }}>
              {state}
            </option>
          ))}
        </select>
        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <ChevronDown size={14} color="#6b7280" />
        </div>
      </div>
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
    backgroundColor: '#06392e',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: 'rgba(0,234,107,0.25)',
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
    color: '#00ea6b',
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
    color: '#00ea6b',
    fontWeight: '600',
  },
});

function WebInput(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={{ marginBottom: 12 }}>
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
          paddingHorizontal: 12,
          paddingVertical: 10,
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
  screen: { flex: 1, backgroundColor: '#043529' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 180, height: 48 },
  headingWrap: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#f9fafb', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  card: { backgroundColor: '#06392e', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(0,234,107,0.12)' },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#e5e7eb', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#043529', borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(0,234,107,0.18)', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#f9fafb' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  signupBtn: { flex: 1, backgroundColor: '#00ea6b', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  signupBtnText: { fontSize: 15, fontWeight: '700', color: '#043529' },
  outlineBtn: { flex: 1, borderRadius: 12, height: 48, borderWidth: 1.5, borderColor: '#00ea6b', alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 15, fontWeight: '700', color: '#00ea6b' },
  homeLink: { marginTop: 24, alignItems: 'center' },
  homeLinkText: { fontSize: 14, fontWeight: '700', color: '#00ea6b' },
});

const webStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#043529' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', flexDirection: 'row' as any, alignItems: 'stretch' },
  header: { marginBottom: 24, alignItems: 'center' },
  logoImage: { width: 220, height: 44, marginBottom: 16 },
  form: { },
  heroColumn: { flex: 1.2, width: '55%' as any },
  formContainer: { flex: 1, width: '100%', backgroundColor: '#043529', paddingHorizontal: 40, paddingVertical: 40, justifyContent: 'center', alignItems: 'center' },
  formCard: { width: '100%', maxWidth: 540, backgroundColor: '#06392e', borderRadius: 24, padding: 40, borderWidth: 1, borderColor: 'rgba(0,234,107,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.3, shadowRadius: 30 },
  formTitle: { fontSize: 28, fontWeight: '800', color: '#f9fafb', marginTop: 4, marginBottom: 8 },
  formSubtitle: { fontSize: 15, color: '#9ca3af', marginBottom: 0, textAlign: 'center' },
  heroImage: { flex: 1, width: '45%' as any, overflow: 'hidden', position: 'relative' },
  heroOverlayContent: { position: 'absolute', bottom: 60, left: 40, right: 40 },
  heroOverTitle: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 12 },
  heroOverSub: { fontSize: 18, color: 'rgba(255,255,255,0.9)', lineHeight: 26 },
  row: { flexDirection: 'row', gap: 16 },
  col: { flex: 1 },
  buttonRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  button: { flex: 1, backgroundColor: '#10b981', borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#043529', letterSpacing: 0.5 },
  outlineButton: { flex: 1, borderRadius: 10, height: 48, borderWidth: 1.5, borderColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { fontSize: 15, fontWeight: '700', color: '#10b981', textTransform: 'uppercase' as any },
});
