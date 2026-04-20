import React, { useCallback, useRef, useEffect } from 'react';
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

import { Trophy, ChevronRight } from 'lucide-react-native';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const finishedRef = useRef(false);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    await markWelcomeSeen();
    router.replace('/');
  }, []);

  // On web, we skip the welcome video intro and go straight to the landing page.
  // However, we avoid an immediate Redirect here to prevent loops with the root index.
  // Instead, we mark it seen and move on if we ever land here on web.
  useEffect(() => {
    if (Platform.OS === 'web') {
      markWelcomeSeen().then(() => {
        router.replace('/');
      });
    }
  }, []);

  if (Platform.OS === 'web') {
    return null; // Let the useEffect handle the transition
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#043529' }]}>
        <View style={styles.fallbackContent}>
          <View style={styles.logoCircle}>
             <Trophy size={48} color="#10B981" />
          </View>
          <Text style={styles.welcomeTitle}>BOOK YOUR GROUND</Text>
          <Text style={styles.welcomeSubtitle}>Your game, your ground, instantly.</Text>
        </View>
      </View>
      
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
          console.warn('Welcome video error:', error);
          // Don't auto-finish immediately on error unless it's fatal, 
          // allow user to see the fallback UI for a second.
          setTimeout(finish, 2000); 
        }}
      />

      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}>
        <Pressable
          style={styles.getStartedBtn}
          onPress={finish}
          accessibilityRole="button"
        >
          <Text style={styles.getStartedText}>Get Started</Text>
          <ChevronRight size={20} color="#043529" strokeWidth={3} />
        </Pressable>
        
        <Pressable
          style={styles.skipBtn}
          onPress={finish}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip Intro</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#043529',
  },
  fallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
  },
  getStartedBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 20,
    width: '100%',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  getStartedText: {
    color: '#043529',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  skipBtn: {
    paddingVertical: 12,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    textDecorationLine: 'underline',
  },
});
