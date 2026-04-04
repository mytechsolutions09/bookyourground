import React from 'react';
import { View, Text, StyleSheet, Platform, Linking } from 'react-native';
import { router } from 'expo-router';

export default function SiteFooter() {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.footer}>
      <View style={styles.footerMain}>
        <View style={styles.footerBrand}>
          <Text style={styles.footerBrandTitle}>Book my ground</Text>
          <Text style={styles.footerBrandSubtitle}>
            Simple online bookings for cricket grounds and box cricket turfs.
          </Text>
        </View>

        <View style={styles.footerColumns}>
          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>Product</Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/book-my-ground' as any)}
            >
              Browse grounds
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/(tabs)/bookings' as any)}
            >
              My bookings
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/(tabs)/profile' as any)}
            >
              My profile
            </Text>
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>For ground owners</Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/(auth)/owner-signup' as any)}
            >
              Become a partner
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/(auth)/login' as any)}
            >
              Owner login
            </Text>
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>Company</Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/contact' as any)}
            >
              Contact
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/terms' as any)}
            >
              Terms &amp; Conditions
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/privacy' as any)}
            >
              Privacy policy
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/refund-policy' as any)}
            >
              Refund policy
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footerBottom}>
        <Text style={styles.footerBottomText}>
          © {new Date().getFullYear()} Book my ground. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: '#043529',
  },
  footerMain: {
    maxWidth: 1280,
    alignSelf: 'stretch',
    width: '100%',
    paddingTop: 32,
    paddingHorizontal: 0,
  },
  footerBrand: {
    marginBottom: 20,
  },
  footerBrandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#02c259',
  },
  footerBrandSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#9CA3AF',
    maxWidth: 480,
  },
  footerColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  footerColumn: {
    minWidth: 140,
    flexShrink: 0,
  },
  footerHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E7EB',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 13,
    color: '#CBD5F5',
    marginBottom: 6,
  },
  footerBottom: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.25)',
  },
  footerBottomText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

