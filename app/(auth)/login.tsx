import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
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
      </ScrollView>
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
    justifyContent: 'center',
    padding: 24,
    ...Platform.select({
      web: {
        maxWidth: 500,
        marginHorizontal: 'auto',
        width: '100%',
      },
    }),
  },
  header: {
    marginBottom: 32,
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
  },
  button: {
    marginTop: 8,
  },
});
