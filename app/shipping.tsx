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

          <Text style={styles.mainTitle}>Part A: Venue Bookings</Text>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Service Nature</Text>
            <Text style={styles.paragraph}>
              Book Your Ground provides a digital platform for booking sports facilities like cricket grounds, 
              turfs, and nets. As these services are digital in nature, there is no physical "shipping" involved.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Fulfillment Process</Text>
            <Text style={styles.paragraph}>
              Upon successful payment, you will receive:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Instant booking confirmation within the app.</Text>
              <Text style={styles.bulletItem}>• Confirmation email with venue details and access instructions.</Text>
              <Text style={styles.bulletItem}>• Digital booking pass under the "My Bookings" section.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Service Access</Text>
            <Text style={styles.paragraph}>
              Once a booking is confirmed, you are entitled to use the selected venue during 
              the reserved time slot. Please present your digital booking confirmation 
              at the venue for verification.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.divider} />
            <Text style={styles.mainTitle}>Part B: Physical Products</Text>
            <Text style={styles.sectionTitle}>4. Shipping &amp; Delivery</Text>
            <Text style={styles.paragraph}>
              For sports gear, apparel, and equipment purchased through our shop:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Timeline:</Text> Orders are processed within 24–48 hours and typically delivered within 3–7 business days.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Tracking:</Text> Once shipped, a tracking ID will be sent to your email and visible in your order history.</Text>
              <Text style={styles.bulletItem}>• <Text style={styles.boldText}>Shipping Charges:</Text> Free shipping is available on orders above ₹1,000. For orders below this amount, a flat shipping fee of ₹50–₹100 may apply based on location.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Delivery Issues</Text>
            <Text style={styles.paragraph}>
              If your product is not delivered within the expected timeline, or if you receive a damaged package, 
              please contact us within 48 hours of the delivery attempt at support@bookyourground.com.
            </Text>
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
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#043529',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
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
