import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function PrivacyScreen() {
  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Privacy policy</Text>
          <Text style={styles.updated}>Last updated: April 1, 2026</Text>

          <Text style={styles.sectionTitle}>1. What we collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us, such as your name, email
            address, phone number, and booking details. When you use certain features
            of the App, we may also request access to your device's **Camera** and
            **Photo Library** to allow you to take and upload photos of sports venues
            or update your profile picture. We also collect technical
            information like device type and basic usage analytics to improve the product.
          </Text>

          <Text style={styles.sectionTitle}>2. How we use your data</Text>
          <Text style={styles.paragraph}>
            We use your information to create and manage bookings, operate the platform,
            communicate with you about your account, and notify you about changes or
            important updates. Venue owners can access booking details relevant to their
            own venues only.
          </Text>

          <Text style={styles.sectionTitle}>3. Sharing with third parties</Text>
          <Text style={styles.paragraph}>
            We may share limited information with trusted service providers such as payment
            gateways, analytics providers, and communication tools, strictly for operating
            the service. We do not sell your personal data.
          </Text>

          <Text style={styles.sectionTitle}>4. Data retention</Text>
          <Text style={styles.paragraph}>
            We retain your data for as long as your account is active or as needed to
            provide the service and comply with legal obligations. You may request deletion
            of your account, subject to any records that must be kept for legal or
            accounting purposes.
          </Text>

          <Text style={styles.sectionTitle}>5. Security</Text>
          <Text style={styles.paragraph}>
            We use reasonable technical and organizational measures to protect your
            information. However, no online service can guarantee absolute security, and
            you share information at your own risk.
          </Text>

          <Text style={styles.sectionTitle}>6. Your rights</Text>
          <Text style={styles.paragraph}>
            Depending on your location, you may have rights to access, correct, or delete
            your personal data, or object to certain types of processing. You can contact
            us via support to exercise these rights.
          </Text>

          <Text style={styles.sectionTitle}>7. Changes to this policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy policy from time to time. We will indicate the date
            of the latest update at the top of this page. Continued use of the platform
            after changes take effect will constitute acceptance of the updated policy.
          </Text>
        </View>

        <SiteFooter />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = {
  page: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 32 : 64,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxWidth: 900,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  paragraph: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
} as const;

