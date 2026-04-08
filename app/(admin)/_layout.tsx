import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';

export default function AdminLayout() {
  const { user, profile, loading } = useAuth();
  const adminEmail = 'invirtualcoin@gmail.com';
  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/(auth)/login');
      } else if (!isSuperAdmin) {
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [user, profile, loading]);

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Platform.OS === 'web' ? '#10b981' : '#2196F3'} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isSuperAdmin) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>You do not have permission to access this area.</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="grounds" />
      <Stack.Screen name="bookings" />
      <Stack.Screen name="earnings" />
      <Stack.Screen name="withdrawals" />
      <Stack.Screen name="manage-ground-owners" />
      <Stack.Screen name="manage-users" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="locations" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
