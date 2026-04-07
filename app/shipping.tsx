import React from 'react';
import { View, Text, ScrollView, Platform, StyleSheet } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function ShippingScreen() {
  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Service Fulfillment (Shipping &amp; Delivery) Policy</Text>
          <Text style={styles.updated}>Last updated: April 7, 2026</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Service Nature</Text>
            <Text style={styles.paragraph}>
              Book my ground provides a digital platform for booking sports facilities like cricket grounds 
              and turfs. As our services are digital in nature, there is no physical "shipping" of goods.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Fulfillment Process</Text>
            <Text style={styles.paragraph}>
              Upon successful payment through our platform, you will receive:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• An instant booking confirmation within the Book my ground app.</Text>
              <Text style={styles.bulletItem}>• A confirmation email sent to your registered email address with the booking details and venue information.</Text>
              <Text style={styles.bulletItem}>• Access to your booking details under the "My Bookings" section of the app.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Service Access</Text>
            <Text style={styles.paragraph}>
              Once a booking is confirmed, you are entitled to use the selected sports facility during 
              the reserved time slot. Please present your booking confirmation (digital or printout) 
              at the venue for verification.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Delays &amp; Cancellations</Text>
            <Text style={styles.paragraph}>
              If you do not receive a confirmation within 15 minutes of payment, please check your 
              internet connection or contact our support team immediately at support@bookyourground.com. 
              Cancellations and refunds are governed by our separate Refund and Cancellation Policy.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Contact for Fulfillment Queries</Text>
            <Text style={styles.paragraph}>
              For any questions regarding your booking status or service fulfillment, 
              please reach out to us at:
            </Text>
            <Text style={[styles.paragraph, styles.bold]}>Email: support@bookyourground.com</Text>
          </View>
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

const styles = StyleSheet.create({
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
    padding: 24,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  updated: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#043529',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  bold: {
    fontWeight: '700',
    marginTop: 8,
  },
  bulletList: {
    marginTop: 10,
    paddingLeft: 8,
  },
  bulletItem: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 6,
  },
});
