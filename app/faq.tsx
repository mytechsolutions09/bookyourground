import React from 'react';
import { View, Text, ScrollView, Platform, StyleSheet } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function FAQScreen() {
  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Frequently Asked Questions</Text>
          <Text style={styles.updated}>Last updated: April 7, 2026</Text>

          <View style={styles.faqSection}>
            <Text style={styles.question}>How do I book a venue?</Text>
            <Text style={styles.answer}>
              Browse available cricket grounds, box cricket, or cricket nets, select your preferred date and time slot, and confirm your booking. 
              If online payment is enabled, you can pay directly on the platform. Once confirmed, you'll receive a booking summary.
            </Text>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.question}>Can I cancel my booking?</Text>
            <Text style={styles.answer}>
              Cancellation policies vary by venue owner. You can view the cancellation policy on the venue's listing page 
              or in your booking details. To cancel, go to "My Bookings" and select the booking you wish to cancel.
            </Text>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.question}>What happens if it rains?</Text>
            <Text style={styles.answer}>
              Our rain policy is simple: 
              {"\n"}{"\u2022"} If <Text style={{ fontWeight: '700', color: '#111827' }}>no ball is bowled</Text> during your slot due to wet venues or rain, you will receive a <Text style={{ fontWeight: '700', color: '#111827' }}>Full Refund</Text>.
              {"\n"}{"\u2022"} If even a <Text style={{ fontWeight: '700', color: '#111827' }}>single ball is bowled</Text> and then it rains, the booking is considered utilized and <Text style={{ fontWeight: '700', color: '#111827' }}>no refund</Text> will be issued. 
              {"\n\n"}The decision on whether a venue is playable rests with the venue owner or site staff.
            </Text>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.question}>How do I list my venue?</Text>
            <Text style={styles.answer}>
              If you own a cricket ground, box cricket, or cricket nets, click on "Become a partner" in the footer. 
              Complete the registration process, and once approved, you can start listing your facilities and managing bookings.
            </Text>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.question}>Are there any hidden charges?</Text>
            <Text style={styles.answer}>
              No, transparency is important to us. The price displayed at the time of booking is what you pay. 
              Some venues may offer optional on-site services like equipment rental or refreshments, which are paid for separately.
            </Text>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.question}>Is my payment secure?</Text>
            <Text style={styles.answer}>
              Yes, we use industry-standard encryption and secure payment gateways to ensure your transactions 
              are protected. We do not store your full card details on our servers.
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
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  updated: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 24,
  },
  faqSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  question: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  answer: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
});
