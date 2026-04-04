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
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, User, Phone, MapPin, Building2 } from 'lucide-react-native';

export default function OwnerSignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const { width } = useWindowDimensions();
  const showHeroImage = Platform.OS === 'web' && width >= 1000;

  const handleSignup = async () => {
    if (!email || !password || !fullName || !businessName) {
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
    const { error } = await signUp(email, password, fullName, 'ground_owner', businessName);
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
    </KeyboardAvoidingView>
  );
}

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
          borderColor: '#00ea6b',
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
  button: { flex: 1, backgroundColor: '#01e669', borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#043529', letterSpacing: 0.5 },
  outlineButton: { flex: 1, borderRadius: 10, height: 48, borderWidth: 1.5, borderColor: '#01e669', alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { fontSize: 15, fontWeight: '700', color: '#01e669', textTransform: 'uppercase' as any },
});
