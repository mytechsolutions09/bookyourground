import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TextInput, Alert, ActivityIndicator, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import { Mail, Phone, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import ProfileHeaderTabs from '@/components/profile/ProfileHeaderTabs';

const IS_WEB = Platform.OS === 'web';

function UserSettingsInner() {
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [teamName, setTeamName] = useState(profile?.team_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || '');
      setTeamName(profile.team_name || '');
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to update your profile.');
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Required', 'Full name is required.');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        team_name: teamName.trim() || null,
      });

      if (error) throw error;

      if (error) throw error;
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inner}>
        {IS_WEB && (
          <ProfileHeaderTabs
            themeAccent="#00ea6b"
            themeText={IS_WEB ? '#111827' : '#FFFFFF'}
            isCompact={!IS_WEB}
          />
        )}

        <Card style={styles.panel}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.sectionSubtitle}>
            These details will be used for your bookings and contact information.
          </Text>

          <View style={styles.formRow}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Enter your phone number"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Team Name</Text>
            <TextInput
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Enter your team name (e.g. Dream XI)"
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={submitting ? 'Saving...' : 'Save Changes'}
              onPress={handleUpdateProfile}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
            />
          </View>
        </Card>

        <Card style={[styles.panel, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <Text style={styles.sectionSubtitle}>
            Manage your password and security settings.
          </Text>
          
          <Text style={styles.infoMuted}>
            Password change and two-factor authentication features are coming soon.
          </Text>
        </Card>

        <Card style={[styles.panel, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <Text style={styles.sectionSubtitle}>
            Find answers to common questions and get help.
          </Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/faq' as any)}
          >
            <View>
              <Text style={styles.menuItemTitle}>Frequently Asked Questions</Text>
              <Text style={styles.menuItemSubtitle}>How to book, cancellations, and more.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomWidth: 0, paddingBottom: 0 }]}
            onPress={() => router.push('/contact' as any)}
          >
            <View>
              <Text style={styles.menuItemTitle}>Contact Us</Text>
              <Text style={styles.menuItemSubtitle}>Get in touch with our support team.</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </View>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <View style={modalStyles.iconBg}>
              <CheckCircle size={40} color="#00ea6b" strokeWidth={2.5} />
            </View>
            <Text style={modalStyles.title}>Update Successful!</Text>
            <Text style={modalStyles.message}>Your profile information has been saved successfully.</Text>
            <TouchableOpacity
              style={modalStyles.button}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={modalStyles.buttonText}>CONTINUE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

export default function UserSettingsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;

  if (IS_WEB && !isCompact) {
    return (
      <WebLayout noCard>
        <UserSettingsInner />
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar title="Settings" titleColor="#00ea6b" />
      <UserSettingsInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#043529',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inner: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: IS_WEB ? '#111827' : '#FFFFFF',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 12,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
    marginBottom: 16,
  },
  panel: {
    padding: 24,
    backgroundColor: IS_WEB ? '#FFFFFF' : '#06392e',
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.15)',
    borderWidth: 1,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: IS_WEB ? '#111827' : '#FFFFFF',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: IS_WEB ? '#6B7280' : '#9ca3af',
    marginBottom: 24,
  },
  formRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: IS_WEB ? '#374151' : '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: IS_WEB ? '#E5E7EB' : 'rgba(0,234,107,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    backgroundColor: IS_WEB ? '#F9FAFB' : '#043529',
    fontSize: 15,
    color: IS_WEB ? '#111827' : '#FFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#01b854',
    borderWidth: 0,
    paddingHorizontal: 32,
  },
  infoMuted: {
    fontSize: 14,
    fontStyle: 'italic',
    color: IS_WEB ? '#9CA3AF' : '#6B7280',
  },
  desktopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: IS_WEB ? '#F3F4F6' : 'rgba(0,234,107,0.1)',
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: IS_WEB ? '#111827' : '#FFFFFF',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: IS_WEB ? '#6B7280' : '#9CA3AF',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,53,41,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#06392e',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,234,107,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 10,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,234,107,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#00ea6b',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#043529',
    letterSpacing: 1,
  },
});
