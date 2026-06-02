import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput } from 'react-native';
import { Briefcase, Trophy, Users, Star, CheckCircle2 } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';

export default function CorporateEventsPage() {
  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.badgeContainer}>
          <Briefcase size={16} color="#00ea6b" style={styles.badgeIcon} />
          <Text style={styles.badgeText}>CORPORATE BOOKINGS</Text>
        </View>
        <Text style={styles.title}>Book a Ground for Your Corporate Sports Day</Text>
        <Text style={styles.subtitle}>
          Boost team morale, encourage fitness, and build stronger bonds with hassle-free corporate sports event bookings. From single team outings to full-company tournaments, we handle the venue so you can focus on the game.
        </Text>
      </View>

      <View style={styles.mainContainer}>
        {/* Why BookYourGround */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionHeading}>Why companies choose us</Text>
          
          <View style={styles.featureItem}>
            <View style={styles.iconContainer}>
              <Users size={24} color="#00ea6b" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Bulk & Recurring Bookings</Text>
              <Text style={styles.featureText}>Easily block out multiple grounds or reserve the same time slot every week for your corporate leagues.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.iconContainer}>
              <Trophy size={24} color="#00ea6b" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Premium Verified Venues</Text>
              <Text style={styles.featureText}>Access a curated list of top-tier facilities with essential corporate amenities like parking, washrooms, and floodlights.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.iconContainer}>
              <Star size={24} color="#00ea6b" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Dedicated Support</Text>
              <Text style={styles.featureText}>Get a dedicated account manager to assist with invoicing, custom requirements, and multi-venue coordination.</Text>
            </View>
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Plan your next event</Text>
          <Text style={styles.formSubtitle}>Tell us what you need and our corporate team will get back to you within 24 hours.</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Acme Corp" />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Work Email</Text>
            <TextInput style={styles.input} placeholder="you@company.com" keyboardType="email-address" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Type & Requirements</Text>
            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="e.g. 50-person inter-department cricket tournament in Gurgaon..." 
              multiline={true}
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Request a Quote</Text>
          </TouchableOpacity>
          <View style={styles.secureNote}>
            <CheckCircle2 size={14} color="#64748B" />
            <Text style={styles.secureNoteText}>Your information is secure and confidential</Text>
          </View>
        </View>
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
    maxWidth: 1200,
    marginHorizontal: 'auto',
    alignItems: 'center',
    paddingBottom: 80,
  },
  heroSection: {
    width: '100%',
    maxWidth: 800,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: 'Inter',
    maxWidth: 700,
  },
  mainContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    width: '100%',
    maxWidth: 1000,
    gap: 40,
    justifyContent: 'space-between',
  },
  featuresSection: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 32,
    fontFamily: 'Inter',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  featureText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  formContainer: {
    width: Platform.OS === 'web' ? 400 : '100%',
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'Inter',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    fontFamily: 'Inter',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  secureNoteText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
});
