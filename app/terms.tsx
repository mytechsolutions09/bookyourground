import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function TermsScreen() {
  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Terms &amp; Conditions</Text>
          <Text style={styles.updated}>Last updated: April 1, 2026</Text>

          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            These Terms &amp; Conditions govern your use of the Book my ground platform to
            search, book, and manage cricket grounds and box cricket turfs. By creating an
            account or making a booking you agree to these terms.
          </Text>

          <Text style={styles.sectionTitle}>2. Roles</Text>
          <Text style={styles.paragraph}>
            There are two primary roles on the platform: players (users who book grounds)
            and ground owners (partners who list and manage grounds). Ground owners are
            responsible for the accuracy of their listings, prices, and availability.
          </Text>

          <Text style={styles.sectionTitle}>3. Bookings &amp; payments</Text>
          <Text style={styles.paragraph}>
            All bookings are subject to ground owner approval and the ground&apos;s
            individual rules, including pricing, cancellation policies, and any additional
            charges at the venue. Where online payments are enabled, you authorize us and
            our payment partners to charge the displayed amount for your booking.
          </Text>

          <Text style={styles.sectionTitle}>4. Cancellations &amp; refunds</Text>
          <Text style={styles.paragraph}>
            Cancellation and refund eligibility may vary by ground. Some bookings may be
            non-refundable or subject to cut-offs. Please review the ground&apos;s
            cancellation policy before confirming your booking.
          </Text>

          <Text style={styles.sectionTitle}>5. Conduct at grounds</Text>
          <Text style={styles.paragraph}>
            You agree to follow ground rules, respect staff and other players, and use the
            facilities responsibly. Ground owners may refuse entry or stop play in case of
            unsafe or inappropriate behaviour, without a right to refund.
          </Text>

          <Text style={styles.sectionTitle}>6. Liability</Text>
          <Text style={styles.paragraph}>
            While we aim to provide a reliable service, Book my ground does not guarantee
            ground availability, conditions, or safety, and is not liable for injuries,
            damages, or losses arising from your use of a ground, except where required by
            law.
          </Text>

          <Text style={styles.sectionTitle}>7. Changes to these terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms &amp; Conditions from time to time. Continued use of
            the platform after changes take effect will constitute acceptance of the
            updated terms.
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

