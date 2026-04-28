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
  Pressable,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const emailRef = React.useRef<TextInput>(null);

  const { resetPassword } = useAuth();
  const { width } = useWindowDimensions();
  const showHeroImage = Platform.OS === 'web' && width >= 900;

  const handleSendReset = async () => {
    if (!email) {
      const msg = 'Please enter your email';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') alert('Error: ' + error.message);
      else Alert.alert('Error', error.message);
    } else {
      const msg = 'Password reset link sent to your email! Please check your inbox.';
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
                  <Text style={webStyles.formTitle}>Forgot Password</Text>
                  <Text style={webStyles.formSubtitle}>We'll send a reset link to your email</Text>
                </View>

                <View style={webStyles.form}>
                  <WebInput
                    label="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[webStyles.button, loading && { opacity: 0.7 }]}
                    onPress={handleSendReset}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#043529" size="small" />
                    ) : (
                      <Text style={webStyles.buttonText}>SEND RESET LINK</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={webStyles.outlineButton}
                    onPress={() => router.replace('/(auth)/login')}
                  >
                    <Text style={webStyles.outlineButtonText}>BACK TO LOGIN</Text>
                  </TouchableOpacity>
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
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ImageBackground 
        source={require('../../assets/forgot-password.jpg')} 
        style={styles.background}
        resizeMode="cover"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="BookYourGround"
              />
            </View>
          </View>

          <BlurView intensity={90} tint="light" style={styles.card}>
            <View style={{ height: 8 }} />
            <Text style={styles.cardTitle}>Forgot Password</Text>
            <Text style={styles.cardSubtitle}>We'll send a reset link to your email</Text>
            
            <View style={styles.fieldWrap}>
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
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </Pressable>
            </View>

            <TouchableOpacity
              style={[styles.resetBtn, loading && { opacity: 0.7 }]}
              onPress={handleSendReset}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.resetBtnText}>SEND RESET LINK</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
              <Text style={styles.loginLinkText}>Back to Sign In</Text>
            </TouchableOpacity>
          </BlurView>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

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
          borderColor: 'rgba(255, 255, 255, 0.1)',
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
  screen: { flex: 1, backgroundColor: '#0f172a' },
  background: { flex: 1, width: '100%', height: '100%' },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 24, 
    paddingTop: 120, 
    paddingBottom: 40 
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 48,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  logo: { width: 200, height: 50 },
  card: { 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    borderRadius: 32, 
    padding: 24, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  fieldWrap: { marginBottom: 16 },
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
    borderRadius: 14, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.3)', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    gap: 10 
  },
  inputRowFocused: {
    backgroundColor: '#FFFFFF',
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
    fontWeight: '500',
  },
  resetBtn: { 
    marginTop: 8, 
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
  resetBtnText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginLinkText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#475569',
    fontFamily: 'Inter',
  },
});

const webStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06392e' },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    flexDirection: 'row-reverse' as any, 
    alignItems: 'stretch' 
  },
  header: { marginBottom: 16, alignItems: 'center' },
  logoImage: { width: 180, height: 45, marginBottom: 8 },
  form: { },
  heroColumn: { flex: 1, width: '50%' as any },
  formContainer: { 
    flex: 1, 
    width: '100%', 
    backgroundColor: '#06392e', 
    paddingHorizontal: 24, 
    paddingVertical: 32, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  formCard: { 
    width: '100%', 
    maxWidth: 420, 
    backgroundColor: '#043529', 
    borderRadius: 20, 
    padding: 32, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 20 
  },
  formTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#f9fafb', 
    marginTop: 4, 
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  formSubtitle: { 
    fontSize: 14, 
    color: '#9ca3af', 
    marginBottom: 12, 
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  heroImage: { flex: 1, width: '50%' as any, overflow: 'hidden' },
  button: { 
    marginTop: 8, 
    backgroundColor: '#475569', 
    borderRadius: 8, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '100%' 
  },
  buttonText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#ffffff', 
    letterSpacing: 0.5 
  },
  outlineButton: { 
    marginTop: 8, 
    borderRadius: 8, 
    height: 40, 
    borderWidth: 1.5, 
    borderColor: '#475569', 
    alignItems: 'center', 
    justifyContent: 'center', 
    width: '100%' 
  },
  outlineButtonText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#475569', 
    textTransform: 'uppercase' as any 
  },
});
