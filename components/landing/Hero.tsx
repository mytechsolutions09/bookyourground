import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Calendar, Shield } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';

export default function Hero() {
  // Expo can only bundle local assets inside this repo.
  // Copy your video to: `h:\site\bookyourground\assets\videos\hero.mp4`
  const heroVideoModule = require('../../assets/videos/hero.mp4');
  const heroVideoUri = Asset.fromModule(heroVideoModule).uri;

  // Web: use a real HTML5 <video> element.
  // Native: render the same video via WebView HTML (since we don't have `expo-av`).
  const VideoTag = 'video' as any;

  const escapedVideoUri = heroVideoUri
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const videoHtml = `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: #000;
              overflow: hidden;
            }
            video {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          </style>
        </head>
        <body>
          <video autoplay muted loop playsinline>
            <source src="${escapedVideoUri}" type="video/mp4" />
          </video>
        </body>
      </html>
    `;

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <VideoTag
          src={heroVideoUri}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          // RN-web understands RN style objects, but intrinsic DOM elements are typed as `any`.
          style={styles.video}
        />
      ) : (
        <WebView
          style={styles.video}
          originWhitelist={['*']}
          source={{ html: videoHtml }}
          javaScriptEnabled
          scrollEnabled={false}
          automaticallyAdjustContentInsets={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
        />
      )}
      <View style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.badge}>
          <MapPin
            size={16}
            color={Platform.OS === 'web' ? '#dc8d3c' : '#D1FAE5'}
            strokeWidth={2.5}
          />
          <Text style={styles.badgeText}>Book Sports Grounds Instantly</Text>
        </View>

        <Text style={styles.title}>
          Find & Book{'\n'}Premium Sports{'\n'}Grounds Near You
        </Text>

        <Text style={styles.subtitle}>
          Discover top-quality cricket, football, and multi-sport grounds in your city. Easy booking, verified venues, instant confirmation.
        </Text>

        <View style={styles.buttonGroup}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Calendar size={20} color="#D1D5DB" strokeWidth={2} />
            <Text style={styles.featureText}>Instant Booking</Text>
          </View>
          <View style={styles.feature}>
            <Shield size={20} color="#D1D5DB" strokeWidth={2} />
            <Text style={styles.featureText}>Verified Grounds</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Platform.OS === 'web' ? '#2b2f4b' : '#000000',
    paddingVertical: Platform.OS === 'web' ? 80 : 60,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'web' ? 'rgba(43,47,75,0.45)' : 'rgba(0,0,0,0.35)',
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Platform.OS === 'web' ? 'rgba(220,141,60,0.18)' : 'rgba(16,185,129,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#D1FAE5',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 56 : 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 64 : 50,
    marginBottom: 20,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
    maxWidth: 600,
  },
  buttonGroup: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    width: Platform.OS === 'web' ? 'auto' : '100%',
    marginBottom: 48,
  },
  primaryButton: {
    backgroundColor: Platform.OS === 'web' ? '#dc8d3c' : '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    shadowColor: Platform.OS === 'web' ? '#dc8d3c' : '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  features: {
    flexDirection: 'row',
    gap: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#D1D5DB',
    fontWeight: '500',
  },
});
