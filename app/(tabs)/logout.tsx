import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function LogoutScreen() {
  const { signOut } = useAuth();

  useEffect(() => {
    const run = async () => {
      try {
        await signOut();
      } finally {
        router.replace('/');
      }
    };
    run();
  }, [signOut]);

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="small"
        color={Platform.OS === 'web' ? '#10b981' : '#2196F3'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

