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
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, User, Mail, Lock, Phone, MapPin, Eye, EyeOff } from 'lucide-react-native';

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [stateName, setStateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { signUp } = useAuth();
  const { width } = useWindowDimensions();
  const showHeroImage = Platform.OS === 'web' && width >= 900;

  const handleSignup = async () => {
    if (!firstName || !lastName || !phone || !stateName || !email || !password) {
      if (Platform.OS === 'web') {
        alert('Please fill in all required fields');
      } else {
        Alert.alert('Error', 'Please fill in all required fields');
      }
      return;
    }

    if (password.length < 6) {
      if (Platform.OS === 'web') {
        alert('Password must be at least 6 characters');
      } else {
        Alert.alert('Error', 'Password must be at least 6 characters');
      }
      return;
    }

    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') {
        alert('Signup Failed: ' + error.message);
      } else {
        Alert.alert('Signup Failed', error.message);
      }
    } else {
      if (Platform.OS === 'web') {
        alert('Account created successfully!');
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') },
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
                        autoComplete="name"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Last Name"
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Last name"
                        autoComplete="name-family"
                      />
                    </View>
                  </View>
  
                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Mobile Number"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="Mobile number"
                        keyboardType="phone-pad"
                        autoComplete="tel"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebInput
                        label="State"
                        value={stateName}
                        onChangeText={setStateName}
                        placeholder="Your state"
                      />
                    </View>
                  </View>
  
                  <View style={webStyles.row}>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Enter your email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />
                    </View>
                    <View style={webStyles.col}>
                      <WebInput
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        secureTextEntry
                        autoComplete="password-new"
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
                        <Text style={webStyles.buttonText}>CREATE ACCOUNT</Text>
                      )}
                    </TouchableOpacity>
  
                    <TouchableOpacity
                      style={webStyles.outlineButton}
                      onPress={() => router.back()}
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join thousands booking their game</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>

          {/* First & Last name row */}
          <View style={styles.nameRow}>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>First Name</Text>
              <View style={[styles.inputRow, isFocused('firstName') && styles.inputRowFocused]}>
                <User size={15} color={isFocused('firstName') ? '#00ea6b' : '#6b7280'} strokeWidth={2} />
                <TextInput
                  style={styles.textInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First"
                  placeholderTextColor="#4b5563"
                  autoComplete="name"
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              <View style={[styles.inputRow, isFocused('lastName') && styles.inputRowFocused]}>
                <TextInput
                  style={[styles.textInput, { paddingLeft: 2 }]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last"
                  placeholderTextColor="#4b5563"
                  autoComplete="name-family"
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.inputRow, isFocused('email') && styles.inputRowFocused]}>
              <Mail size={17} color={isFocused('email') ? '#00ea6b' : '#6b7280'} strokeWidth={2} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#4b5563"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Phone & State row */}
          <View style={styles.nameRow}>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Mobile</Text>
              <View style={[styles.inputRow, isFocused('phone') && styles.inputRowFocused]}>
                <Phone size={15} color={isFocused('phone') ? '#00ea6b' : '#6b7280'} strokeWidth={2} />
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91..."
                  placeholderTextColor="#4b5563"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>State</Text>
              <View style={[styles.inputRow, isFocused('state') && styles.inputRowFocused]}>
                <MapPin size={15} color={isFocused('state') ? '#00ea6b' : '#6b7280'} strokeWidth={2} />
                <TextInput
                  style={styles.textInput}
                  value={stateName}
                  onChangeText={setStateName}
                  placeholder="State"
                  placeholderTextColor="#4b5563"
                  onFocus={() => setFocusedField('state')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.inputRow, isFocused('password') && styles.inputRowFocused]}>
              <Lock size={17} color={isFocused('password') ? '#00ea6b' : '#6b7280'} strokeWidth={2} />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPassword}
                autoComplete="password-new"
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
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.signUpBtn,
                pressed && { opacity: 0.88 },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#043529" size="small" />
              ) : (
                <Text style={styles.signUpBtnText}>SIGN UP</Text>
              )}
            </Pressable>
  
            <Pressable
              style={({ pressed }) => [
                styles.outlineBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.outlineBtnText}>SIGN IN</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Simple web-only text input ─────────────────────────────────────────────
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
    marginBottom: 28,
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
  },
  card: {
    backgroundColor: '#06392e',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.12)',
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043529',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,234,107,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  inputRowFocused: {
    borderColor: '#00ea6b',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#f9fafb',
    paddingVertical: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  signUpBtn: {
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
  signUpBtnText: {
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
});

// ── Web styles ─────────────────────────────────────────────────────────────
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
    width: 180,
    height: 40,
    marginBottom: 8,
  },
  form: {
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
    maxWidth: 580,
    backgroundColor: '#06392e',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.12)',
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
    marginBottom: 4,
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
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  col: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#01e669',
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#043529',
    letterSpacing: 0.5,
  },
  outlineButton: {
    flex: 1,
    borderRadius: 8,
    height: 40,
    borderWidth: 1.5,
    borderColor: '#01e669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#01e669',
    textTransform: 'uppercase' as any,
  },
});
