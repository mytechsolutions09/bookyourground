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
import { Lock, Eye, EyeOff } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { changePassword } = useAuth();
  const { width } = useWindowDimensions();
  const showHeroImage = Platform.OS === 'web' && width >= 900;

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      const msg = 'Please fill in all fields';
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

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    const { error } = await changePassword(password);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') alert('Error: ' + error.message);
      else Alert.alert('Error', error.message);
    } else {
      const msg = 'Password updated successfully! Please sign in with your new password.';
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
                  <Text style={webStyles.formTitle}>Reset Password</Text>
                  <Text style={webStyles.formSubtitle}>Enter your new password below</Text>
                </View>

                <View style={webStyles.form}>
                  <WebInput
                    label="New Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter new password"
                    secureTextEntry
                  />

                  <WebInput
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    secureTextEntry
                  />

                  <TouchableOpacity
                    style={[webStyles.button, loading && { opacity: 0.7 }]}
                    onPress={handleReset}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#043529" size="small" />
                    ) : (
                      <Text style={webStyles.buttonText}>UPDATE PASSWORD</Text>
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
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Secure your account with a new password</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.inputRow}>
              <Lock size={17} color="#6b7280" />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={17} color="#6b7280" /> : <Eye size={17} color="#6b7280" />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Confirm Password</Text>
            <View style={styles.inputRow}>
              <Lock size={17} color="#6b7280" />
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.resetBtn, loading && { opacity: 0.7 }]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#043529" /> : <Text style={styles.resetBtnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
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
          borderColor: '#01b854',
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
  screen: { flex: 1, backgroundColor: '#043529' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60 },
  logoWrap: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 180, height: 48 },
  headingWrap: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 26, fontWeight: '800', color: '#f9fafb', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: { backgroundColor: '#06392e', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(0,234,107,0.12)' },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#e5e7eb', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#043529', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,234,107,0.18)', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#f9fafb' },
  resetBtn: { marginTop: 8, backgroundColor: '#01b854', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  resetBtnText: { fontSize: 16, fontWeight: '700', color: '#043529' },
  loginLink: { marginTop: 30, alignItems: 'center' },
  loginLinkText: { fontSize: 14, fontWeight: '700', color: '#01b854' },
});

const webStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#043529' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', flexDirection: 'row-reverse' as any, alignItems: 'stretch' },
  header: { marginBottom: 16, alignItems: 'center' },
  logoImage: { width: 180, height: 40, marginBottom: 8 },
  form: { },
  heroColumn: { flex: 1, width: '50%' as any },
  formContainer: { flex: 1, width: '100%', backgroundColor: '#043529', paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center', alignItems: 'center' },
  formCard: { width: '100%', maxWidth: 420, backgroundColor: '#06392e', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: 'rgba(0,234,107,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  formTitle: { fontSize: 22, fontWeight: '800', color: '#f9fafb', marginTop: 4, marginBottom: 4 },
  formSubtitle: { fontSize: 14, color: '#9ca3af', marginBottom: 12, textAlign: 'center' },
  heroImage: { flex: 1, width: '50%' as any, overflow: 'hidden' },
  button: { marginTop: 8, backgroundColor: '#01b854', borderRadius: 8, height: 40, alignItems: 'center', justifyContent: 'center', width: '100%' },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#043529', letterSpacing: 0.5 },
  outlineButton: { marginTop: 8, borderRadius: 8, height: 40, borderWidth: 1.5, borderColor: '#01b854', alignItems: 'center', justifyContent: 'center', width: '100%' },
  outlineButtonText: { fontSize: 14, fontWeight: '700', color: '#01b854', textTransform: 'uppercase' as any },
});
