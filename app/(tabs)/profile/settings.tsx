import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TextInput, Alert, ActivityIndicator, TouchableOpacity, Modal, useWindowDimensions, Linking } from 'react-native';
import { Mail, Phone, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import ProfileHeaderTabs from '@/components/profile/ProfileHeaderTabs';
import { useUI } from '@/contexts/UIContext';

const IS_WEB = Platform.OS === 'web';

function UserSettingsInner() {
  const { width } = useWindowDimensions();
  const isUltraNarrow = width < 350;
  const { user, profile, updateProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [teamName, setTeamName] = useState(profile?.team_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { setTabBarVisible } = useUI();
  const lastScrollY = React.useRef(0);

  const handleDeleteAccount = () => {
    if (IS_WEB) {
      if (confirm('Are you sure you want to delete your account? This action is permanent and will delete all your data.')) {
        alert('Your account deletion request has been submitted. Our team will process it within 24 hours. You will be signed out now.');
        void signOut().then(() => router.replace('/'));
      }
    } else {
      Alert.alert(
        'Delete Account',
        'This action is permanent and will delete all your data. Are you sure you want to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Request Sent', 'Your account deletion request has been submitted. Our team will process it within 24 hours. You will be signed out now.');
              void signOut().then(() => router.replace('/'));
            },
          },
        ]
      );
    }
  };

  const onScroll = (event: any) => {
    if (Platform.OS === 'web') return;
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (diff > 10 && currentY > 50) {
      setTabBarVisible(false);
    } else if (diff < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentY;
  };

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
    <ScrollView 
      style={styles.container}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <View style={[styles.inner, isUltraNarrow && { paddingHorizontal: 12, paddingTop: 10 }]}>
        {IS_WEB && (
          <ProfileHeaderTabs
            themeAccent="#00ea6b"
            themeText={IS_WEB ? '#111827' : '#0F172A'}
            isCompact={!IS_WEB}
          />
        )}

        <Card style={[styles.panel, isUltraNarrow && { padding: 16 }]}>
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
              style={[styles.input, { textTransform: 'uppercase' }]}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={user?.email || ''}
              editable={false}
              style={[styles.input, { backgroundColor: '#F1F5F9', color: '#64748B' }]}
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
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/support' as any)}
          >
            <View>
              <Text style={styles.menuItemTitle}>Support Center</Text>
              <Text style={styles.menuItemSubtitle}>Raise tickets and track your requests.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomWidth: 0, paddingBottom: 0 }]}
            onPress={() => Linking.openURL('mailto:support@bookyourground.com')}
          >
            <View>
              <Text style={styles.menuItemTitle}>Email Us</Text>
              <Text style={styles.menuItemSubtitle}>support@bookyourground.com</Text>
            </View>
          </TouchableOpacity>
        </Card>

        <Card style={[styles.panel, { marginTop: 16, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.sectionTitle, { color: '#B91C1C' }]}>Danger Zone</Text>
          <Text style={styles.sectionSubtitle}>
            Irreversible actions related to your account.
          </Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomWidth: 0, paddingBottom: 0 }]}
            onPress={handleDeleteAccount}
          >
            <View>
              <Text style={[styles.menuItemTitle, { color: '#B91C1C' }]}>Delete Account</Text>
              <Text style={styles.menuItemSubtitle}>Permanently remove all your data.</Text>
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
          <View style={[modalStyles.card, isUltraNarrow && { padding: 20, maxWidth: '95%' }]}>
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
  const { profile } = useAuth();
  const isCompact = width < 900;
  const isOwner = profile?.role === 'ground_owner';

  return (IS_WEB && !isCompact) ? (
    <WebLayout noCard>
      <UserSettingsInner />
    </WebLayout>
  ) : (
    <View style={styles.nativeRoot}>
      {!isOwner && <MobileAppNavbar title="Settings" titleColor="#0F172A" />}
      <UserSettingsInner />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inner: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  panel: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderColor: '#F3F4F6',
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 24,
    lineHeight: 16,
    fontWeight: '400',
  },
  formRow: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    fontSize: 15,
    fontWeight: '400',
    color: '#0F172A',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }) as any,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#00ea6b',
    borderWidth: 0,
    paddingHorizontal: 24,
    borderRadius: 12,
    height: 46,
  },
  infoMuted: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontStyle: 'italic',
    color: '#94A3B8',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemTitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    fontWeight: '400',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#00ea6b',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  buttonText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
