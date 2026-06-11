import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Briefcase, Trophy, Users, Star, CheckCircle2 } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import Head from 'expo-router/head';

export default function CorporateEventsPage() {
  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [requirements, setRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!companyName.trim() || !workEmail.trim() || !requirements.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('contact_queries').insert({
      name: companyName.trim(),
      email: workEmail.trim(),
      subject: 'Corporate Booking Request',
      message: requirements.trim()
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Failed to submit request. Please try again.');
      console.error('Submission error:', error);
    } else {
      setSubmitted(true);
      setCompanyName('');
      setWorkEmail('');
      setRequirements('');
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Your request has been submitted successfully! We will get back to you within 24 hours.');
      }
    }
  };
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
          
          {submitted ? (
            <View style={styles.successMessage}>
              <CheckCircle2 size={48} color="#00ea6b" />
              <Text style={styles.successTitle}>Request Submitted!</Text>
              <Text style={styles.successText}>Thank you for your interest. Our corporate team will reach out to you within 24 hours.</Text>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={() => setSubmitted(false)}
              >
                <Text style={styles.submitButtonText}>Submit Another Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company Name</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="e.g. Acme Corp" 
                  value={companyName}
                  onChangeText={setCompanyName}
                  editable={!submitting}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Work Email</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="you@company.com" 
                  keyboardType="email-address" 
                  autoCapitalize="none"
                  value={workEmail}
                  onChangeText={setWorkEmail}
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Event Type & Requirements</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="e.g. 50-person inter-department cricket tournament in Gurgaon..." 
                  multiline={true}
                  numberOfLines={4}
                  value={requirements}
                  onChangeText={setRequirements}
                  editable={!submitting}
                />
              </View>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Request a Quote</Text>
                )}
              </TouchableOpacity>
              <View style={styles.secureNote}>
                <CheckCircle2 size={14} color="#64748B" />
                <Text style={styles.secureNoteText}>Your information is secure and confidential</Text>
              </View>
            </>
          )}
        </View>
      </View>

    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <>
        <Head>
          <title>Corporate Event Ground Booking | BookYourGround</title>
          <meta name="description" content="Plan and book sports venues for corporate tournaments, team outings, and recurring leagues. Get customized corporate packages and assistance." />
          <link rel="canonical" href="https://bookyourground.com/corporate" />
        </Head>
        <WebLayout isPublicNoSidebar={true}>{content}</WebLayout>
      </>
    );
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
    maxWidth: 1000,
    marginHorizontal: 'auto',
    alignItems: 'center',
    paddingBottom: 60,
  },
  heroSection: {
    width: '100%',
    maxWidth: 800,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeIcon: {
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter',
    maxWidth: 700,
  },
  mainContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    width: '100%',
    maxWidth: 1000,
    gap: 32,
    justifyContent: 'space-between',
  },
  featuresSection: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 234, 107, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  featureText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  formContainer: {
    width: Platform.OS === 'web' ? 360 : '100%',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'Inter',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  secureNoteText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  successMessage: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  successText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter',
    marginBottom: 24,
  },
});
