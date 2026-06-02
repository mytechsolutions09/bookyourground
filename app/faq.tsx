import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { HelpCircle, CalendarCheck, ShieldCheck, RefreshCcw } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';

export default function FAQPage() {
  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroSection}>
        <Text style={styles.title}>Frequently Asked Questions</Text>
        <Text style={styles.subtitle}>
          Everything you need to know about booking your ground online securely.
        </Text>
      </View>

      <View style={styles.faqList}>
        
        {/* Availability FAQ */}
        <View style={styles.faqItem}>
          <View style={styles.iconContainer}>
            <CalendarCheck size={28} color="#00ea6b" />
          </View>
          <View style={styles.faqContent}>
            <Text style={styles.question}>Is the slot actually available or will the venue cancel?</Text>
            <Text style={styles.answer}>
              Every slot shown on BookYourGround is 100% accurate and instantly confirmed. Our real-time syncing technology connects directly to the venue's master calendar. When you book a slot online, it is automatically locked in the venue's system. There is absolutely zero risk of double-booking, and venue owners cannot manually cancel a confirmed, paid booking without violating our service guarantee.
            </Text>
          </View>
        </View>

        {/* Payment FAQ */}
        <View style={styles.faqItem}>
          <View style={styles.iconContainer}>
            <ShieldCheck size={28} color="#00ea6b" />
          </View>
          <View style={styles.faqContent}>
            <Text style={styles.question}>How do I pay for a ground booking?</Text>
            <Text style={styles.answer}>
              You pay directly through our secure platform at the time of booking. We accept UPI, Credit/Debit cards, and Net Banking. By paying upfront, you secure your spot instantly without needing to transfer cash informally or worrying about "cash on arrival" mix-ups. We hold the payment securely and handle the venue settlement for you—with 0% markup or hidden booking fees for players.
            </Text>
          </View>
        </View>

        {/* Cancellation FAQ */}
        <View style={styles.faqItem}>
          <View style={styles.iconContainer}>
            <RefreshCcw size={28} color="#00ea6b" />
          </View>
          <View style={styles.faqContent}>
            <Text style={styles.question}>What happens if I need to cancel my booking?</Text>
            <Text style={styles.answer}>
              We offer transparent, standardized cancellation policies. If you cancel your booking before the venue's cut-off period (usually 24-48 hours prior to the slot), your refund is automatically processed back to your original payment method. The exact cancellation window is clearly displayed on the checkout page before you finalize your payment, ensuring there are no surprises.
            </Text>
          </View>
        </View>

      </View>

      <View style={styles.contactCard}>
        <HelpCircle size={24} color="#64748B" style={{ marginBottom: 12 }} />
        <Text style={styles.contactTitle}>Still have questions?</Text>
        <Text style={styles.contactText}>
          Our support team is here to help. Reach out to us anytime at support@bookyourground.com
        </Text>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout isPublicNoSidebar={true}>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    maxWidth: 900,
    marginHorizontal: 'auto',
    alignItems: 'center',
    paddingBottom: 60,
  },
  heroSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter',
    maxWidth: 600,
  },
  faqList: {
    width: '100%',
    gap: 20,
    marginBottom: 40,
  },
  faqItem: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 234, 107, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 0 : 12,
    marginRight: Platform.OS === 'web' ? 20 : 0,
  },
  faqContent: {
    flex: 1,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    fontFamily: 'Inter',
  },
  contactCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  contactText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter',
  },
});
