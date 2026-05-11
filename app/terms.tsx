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
          <Text style={styles.updated}>Last updated: April 23, 2026</Text>

          <Text style={styles.mainSectionTitle}>1. Ground Bookings</Text>

          <Text style={styles.sectionTitle}>1.1. Introduction</Text>
          <Text style={styles.paragraph}>
            These Terms &amp; Conditions govern your use of the Book my ground platform to
            search, book, and manage cricket grounds and box cricket turfs. By creating an
            account or making a booking you agree to these terms.
          </Text>

          <Text style={styles.sectionTitle}>1.2. Roles</Text>
          <Text style={styles.paragraph}>
            There are two primary roles on the platform: players (users who book grounds)
            and ground owners (partners who list and manage grounds). Ground owners are
            responsible for the accuracy of their listings, prices, and availability.
          </Text>

          <Text style={styles.sectionTitle}>1.3. Bookings &amp; payments</Text>
          <Text style={styles.paragraph}>
            All bookings are subject to ground owner approval and the ground&apos;s
            individual rules, including pricing, cancellation policies, and any additional
            charges at the venue. Where online payments are enabled, you authorize us and
            our payment partners to charge the displayed amount for your booking.
          </Text>

          <Text style={styles.sectionTitle}>1.4. Cancellations &amp; refunds</Text>
          <Text style={styles.paragraph}>
            Cancellation and refund eligibility may vary by ground. Some bookings may be
            non-refundable or subject to cut-offs. Please review the ground&apos;s
            cancellation policy before confirming your booking.
          </Text>

          <Text style={styles.sectionTitle}>1.5. Conduct at grounds</Text>
          <Text style={styles.paragraph}>
            You agree to follow ground rules, respect staff and other players, and use the
            facilities responsibly. Ground owners may refuse entry or stop play in case of
            unsafe or inappropriate behaviour, without a right to refund.
          </Text>

          <Text style={styles.sectionTitle}>1.6. Liability</Text>
          <Text style={styles.paragraph}>
            While we aim to provide a reliable service, Book my ground does not guarantee
            ground availability, conditions, or safety, and is not liable for injuries,
            damages, or losses arising from your use of a ground, except where required by
            law.
          </Text>

          <Text style={styles.sectionTitle}>1.7. Changes to these terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms &amp; Conditions from time to time. Continued use of
            the platform after changes take effect will constitute acceptance of the
            updated terms.
          </Text>

          <Text style={styles.mainSectionTitle}>2. Product Purchases</Text>

          <Text style={styles.sectionTitle}>2.1. Product Information</Text>
          <Text style={styles.paragraph}>
            We strive to provide accurate descriptions and high-quality images of our products. However, slight variations in color and appearance may occur due to screen settings or manufacturing batches.
          </Text>

          <Text style={styles.sectionTitle}>2.2. Shipping &amp; Delivery</Text>
          <Text style={styles.paragraph}>
            Standard shipping takes 3-7 business days depending on your location. We provide tracking information once the order is dispatched. Free shipping is available on orders above ₹1,000.
          </Text>

          <Text style={styles.sectionTitle}>2.3. Returns &amp; Refunds</Text>
          <Text style={styles.paragraph}>
            Products can be returned within 7 days of delivery if they are unused and in original packaging. Refunds are processed within 5-7 business days after the quality check.
          </Text>

          <Text style={styles.sectionTitle}>2.4. Quality Guarantee</Text>
          <Text style={styles.paragraph}>
            All sports gear and equipment sold on our platform are sourced from authorized distributors and carry a manufacturer warranty where applicable.
          </Text>

          <Text style={styles.sectionTitle}>2.5. Order Cancellation</Text>
          <Text style={styles.paragraph}>
            Orders can be cancelled before they are shipped. Once dispatched, cancellations are not allowed, but you may initiate a return after delivery.
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
} as const;
