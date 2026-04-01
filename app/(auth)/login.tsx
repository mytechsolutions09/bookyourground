import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, profile, user } = useAuth();
  const os = Platform.OS as string;
  const { width } = useWindowDimensions();
  const showHeroImage = os === 'web' && width >= 900;

  const handleLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        alert('Please fill in all fields');
      } else {
        Alert.alert('Error', 'Please fill in all fields');
      }
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (Platform.OS === 'web') {
        alert('Login Failed: ' + error.message);
      } else {
        Alert.alert('Login Failed', error.message);
      }
    } else {
      // Route by role once profile is loaded.
      const adminEmail = 'invirtualcoin@gmail.com';
      const isSuperAdmin =
        profile?.role === 'super_admin' ||
        (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase() ||
        email.toLowerCase() === adminEmail.toLowerCase();

      if (isSuperAdmin) router.replace('/(admin)/dashboard');
      else if (profile?.role === 'ground_owner') router.replace('/(owner)/grounds');
      else router.replace('/(tabs)/bookings');
    }
  };

  useEffect(() => {
    if (os !== 'web') return;
    if (!user) return;
    if (!profile) return;

    if (profile.role === 'super_admin') router.replace('/(admin)/dashboard');
    else if (profile.role === 'ground_owner') router.replace('/(owner)/grounds');
    else router.replace('/(tabs)/bookings');
  }, [os, user, profile]);

  const contentInner = (
    <>
      <View style={styles.heroColumn}>
        <View style={styles.formContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/')}>
              <Text style={styles.logoText}>Book my ground</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={styles.button}
            />

            <Button
              title="Don't have an account? Sign Up"
              onPress={() => router.push('/(auth)/signup')}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </View>

      {showHeroImage && (
        <View style={styles.heroImage}>
          <Image
            source={require('../../assets/signup-stadium.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      )}
    </>
  );

  const formBody =
    os === 'web' ? (
      <View style={styles.scrollContent}>{contentInner}</View>
    ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {contentInner}
      </ScrollView>
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {formBody}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 24,
    ...Platform.select({
      web: {
        flexDirection: 'row-reverse',
        alignItems: 'stretch',
        width: '100%',
        gap: 0,
        padding: 0,
      },
    }),
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dc8d3c',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 16,
    ...Platform.select({
      web: {
        flex: 1,
      },
    }),
  },
  heroColumn: {
    flex: 1,
    width: '50%',
    paddingVertical: 0,
  },
  formContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  heroImage: {
    display: 'none',
    ...Platform.select({
      web: {
        display: 'flex',
        flex: 1,
        width: '50%',
        borderRadius: 0,
        overflow: 'hidden',
      },
    }),
  },
  button: {
    marginTop: 8,
  },
});
