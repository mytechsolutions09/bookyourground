import React, { useCallback, useRef } from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const WELCOME_SEEN_KEY = 'welcome_seen_v1';

async function markWelcomeSeen() {
  await AsyncStorage.setItem(WELCOME_SEEN_KEY, '1');
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    await markWelcomeSeen();
    router.replace('/');
  }, []);

  if (Platform.OS === 'web') {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
      <Video
        source={require('../assets/videos/welcome.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            finish();
          }
        }}
        onError={(error) => {
          console.error('Welcome video error:', error);
          finish(); // Skip on fatal error
        }}
      />
      <Pressable
        style={[styles.skip, { paddingBottom: Math.max(insets.bottom, 16) }]}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  skip: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
