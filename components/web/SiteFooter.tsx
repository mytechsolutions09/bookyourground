import React from 'react';
import { View, Text, StyleSheet, Platform, Linking, Image } from 'react-native';
import { router } from 'expo-router';

export default function SiteFooter() {
  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.footer}>
      <View style={styles.footerMain}>
        <View style={styles.footerColumns}>
          <View style={styles.footerBrand}>
            <Image
              source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
              style={styles.footerLogo}
              resizeMode="contain"
            />
            <Text style={styles.footerBrandSubtitle}>
              Your sport. Your venue. Booked in seconds.
            </Text>
            <Image
              source={require('@/assets/payment_logo.png')}
              style={styles.paymentLogos}
              resizeMode="contain"
            />
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>Product</Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/book-my-ground' as any)}
            >
              Browse venues
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/bookings' as any)}
            >
              My bookings
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/profile' as any)}
            >
              My profile
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/cricket' as any)}
            >
              Cricket
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/match-strategies' as any)}
            >
              Match strategies
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/shop' as any)}
            >
              Shop
            </Text>
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>For venue owners</Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/owner-signup' as any)}
            >
              Become a partner
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/login' as any)}
            >
              Owner login
            </Text>
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>Company</Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/about' as any)}
            >
              About Us
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/contact' as any)}
            >
              Contact
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/blog' as any)}
            >
              Blog
            </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/faq' as any)}
            >
              FAQ
            </Text>
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerHeading}>Legal &amp; Policies</Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/shipping' as any)}
            >
              Shipping &amp; Delivery
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
          © {new Date().getFullYear()} Book your ground. All rights reserved.
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerMain: {
    maxWidth: 1280,
    alignSelf: 'stretch',
    width: '100%',
    paddingTop: 32,
    paddingHorizontal: 0,
  },
  footerBrand: {
    minWidth: 240,
    maxWidth: 460,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  footerLogo: {
    height: 48,
    width: 200,
    marginLeft: -54,
    marginBottom: 8,
  },
  footerBrandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  paymentLogos: {
    width: 320,
    height: 50,
    marginTop: 6,
    marginLeft: -78,
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
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 6,
  },
  footerBottom: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerBottomText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

