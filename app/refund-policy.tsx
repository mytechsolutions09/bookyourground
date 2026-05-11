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
          <Text style={styles.updated}>Last updated: April 23, 2026</Text>

          <Text style={styles.mainSectionTitle}>1. Ground Bookings</Text>

          <Text style={styles.sectionTitle}>1.1. General</Text>
          <Text style={styles.paragraph}>
            Refunds for bookings made through Book my ground are governed by this Refund
            policy, together with each ground&apos;s individual rules. By confirming a
            booking you agree to the applicable cancellation and refund terms.
          </Text>

          <Text style={styles.sectionTitle}>1.2. When refunds are possible</Text>
          <Text style={styles.paragraph}>
            A booking may be eligible for a full or partial refund when:{'\n'}
            {'\u2022'} The ground owner cancels the booking or the ground is unavailable.{'\n'}
            {'\u2022'} The booking is cancelled by the user at least 7 days prior to the slot time.{'\n'}
            {'\u2022'} There is a verified double booking or payment error.
          </Text>

          <Text style={styles.sectionTitle}>1.3. Non-refundable bookings</Text>
          <Text style={styles.paragraph}>
            Some slots may be marked as non-refundable or may have a cut-off time after
            which no refunds are possible. These details are set by the ground owner and
            shown at the time of booking where applicable.
          </Text>

          <Text style={styles.sectionTitle}>1.4. No-shows and late arrivals</Text>
          <Text style={styles.paragraph}>
            If you or your team do not arrive on time or fail to show up, the booking may
            be treated as completed and may not be eligible for a refund. Any exceptions
            are at the discretion of the ground owner.
          </Text>

          <Text style={styles.sectionTitle}>1.5. Weather and Rain Policy</Text>
          <Text style={styles.paragraph}>
            For matches affected by rain or wet ground conditions, the following rules apply:
            {"\n"}{"\u2022"} <Text style={styles.boldText}>Full Refund:</Text> If no ball is bowled during the booked slot due to rain or unplayable wet ground conditions, the entire ground fee will be refunded.
            {"\n"}{"\u2022"} <Text style={styles.boldText}>No Refund:</Text> If even a single ball is bowled and the match is subsequently interrupted or cancelled due to rain, no refund will be issued. The booking is considered utilized once the match commences.
            {"\n"}{"\u2022"} The ground owner or on-site staff have the final authority to decide if the ground is playable.
          </Text>

          <Text style={styles.sectionTitle}>1.6. How refunds are processed</Text>
          <Text style={styles.paragraph}>
            Approved refunds are processed back to the original payment method where
            possible. Timelines may vary depending on your bank or payment provider, but
            typically take 5–7 working days after approval.
          </Text>

          <Text style={styles.mainSectionTitle}>2. Product Purchases</Text>

          <Text style={styles.sectionTitle}>2.1. Returns &amp; Refunds</Text>
          <Text style={styles.paragraph}>
            Products can be returned within 7 days of delivery if they are unused, undamaged, and in their original packaging with all tags intact. Refunds are processed after the returned product passes our quality check.
          </Text>

          <Text style={styles.sectionTitle}>2.2. Order Cancellation</Text>
          <Text style={styles.paragraph}>
            Orders can be cancelled before they are shipped for a full refund. Once the order has been dispatched, cancellations are not allowed, but you may initiate a return after the product is delivered.
          </Text>

          <Text style={styles.sectionTitle}>2.3. Damaged or Defective Items</Text>
          <Text style={styles.paragraph}>
            If you receive a damaged or defective item, please report it to us within 48 hours of delivery with photos of the product. We will arrange a replacement or full refund including shipping costs.
          </Text>

          <Text style={styles.sectionTitle}>2.4. Non-Returnable Items</Text>
          <Text style={styles.paragraph}>
            Certain items such as personalized or custom-made gear, undergarments, and used equipment cannot be returned or refunded unless they arrive damaged.
          </Text>

          <Text style={styles.sectionTitle}>2.5. Processing Time</Text>
          <Text style={styles.paragraph}>
            For products, refunds are initiated within 5-7 business days after the item is received at our warehouse and verified. The amount will be credited to your original payment method.
          </Text>

          <Text style={styles.mainSectionTitle}>3. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about refunds for bookings or products, please contact our support team at support@bookyourground.com with your order/booking ID and details.
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
    width: '100%',
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
  mainSectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#043529',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  paragraph: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
} as const;
