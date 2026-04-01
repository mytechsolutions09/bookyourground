import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function RefundPolicyScreen() {
  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Refund policy</Text>
          <Text style={styles.updated}>Last updated: April 1, 2026</Text>

          <Text style={styles.sectionTitle}>1. General</Text>
          <Text style={styles.paragraph}>
            Refunds for bookings made through Book my ground are governed by this Refund
            policy, together with each ground&apos;s individual rules. By confirming a
            booking you agree to the applicable cancellation and refund terms.
          </Text>

          <Text style={styles.sectionTitle}>2. When refunds are possible</Text>
          <Text style={styles.paragraph}>
            A booking may be eligible for a full or partial refund when:{'\n'}
            {'\u2022'} The ground owner cancels the booking or the ground is unavailable.{'\n'}
            {'\u2022'} The booking is cancelled within the allowed time window defined by the
            ground owner.{'\n'}
            {'\u2022'} There is a verified double booking or payment error.
          </Text>

          <Text style={styles.sectionTitle}>3. Non-refundable bookings</Text>
          <Text style={styles.paragraph}>
            Some slots may be marked as non-refundable or may have a cut-off time after
            which no refunds are possible. These details are set by the ground owner and
            shown at the time of booking where applicable.
          </Text>

          <Text style={styles.sectionTitle}>4. No-shows and late arrivals</Text>
          <Text style={styles.paragraph}>
            If you or your team do not arrive on time or fail to show up, the booking may
            be treated as completed and may not be eligible for a refund. Any exceptions
            are at the discretion of the ground owner.
          </Text>

          <Text style={styles.sectionTitle}>5. Weather and safety</Text>
          <Text style={styles.paragraph}>
            In case of severe weather or safety issues, the ground owner may offer to
            reschedule your booking or provide a refund or credit as per their policy. Book
            my ground will assist in coordinating but is not responsible for final
            decisions made by ground owners.
          </Text>

          <Text style={styles.sectionTitle}>6. How refunds are processed</Text>
          <Text style={styles.paragraph}>
            Approved refunds are processed back to the original payment method where
            possible. Timelines may vary depending on your bank or payment provider, but
            typically take 5–7 working days after approval.
          </Text>

          <Text style={styles.sectionTitle}>7. Contact</Text>
          <Text style={styles.paragraph}>
            If you believe you are entitled to a refund or there is an issue with your
            booking, please contact us with your booking ID and details. We will review
            your request in coordination with the ground owner.
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

