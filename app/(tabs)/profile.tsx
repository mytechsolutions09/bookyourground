import { View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Phone,
  Mail,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Calendar,
  IndianRupee,
  PlusCircle,
  Settings,
  Bell,
  Swords,
  Shield,
  CalendarClock,
  LifeBuoy,
  Star,
} from 'lucide-react-native';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import ProfileHeaderTabs from '@/components/profile/ProfileHeaderTabs';

const IS_WEB = Platform.OS === 'web';
const IS_DARK = Platform.OS !== 'web' || (typeof window !== 'undefined' && window.innerWidth < 900);
const DARK_BG = '#043529';
const DARK_ACCENT = '#00ea6b';
const DARK_TEXT = '#dcc093';
const DARK_CARD = '#06392e';
const DARK_BORDER = 'rgba(0,234,107,0.2)';

const LIGHT_BG = '#f8fafc';
const LIGHT_ACCENT = '#10b981';
const LIGHT_TEXT = '#0f172a';
const LIGHT_CARD = '#ffffff';
const LIGHT_BORDER = '#f1f5f9';
const LIGHT_MUTED = '#64748b';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const isWeb = Platform.OS === 'web';

  const adminEmail = 'invirtualcoin@gmail.com';
  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase();

  const isLight = true;
  const themeBg = isLight ? LIGHT_BG : DARK_BG;
  const themeAccent = isLight ? LIGHT_ACCENT : DARK_ACCENT;
  const themeText = isLight ? LIGHT_TEXT : DARK_TEXT;
  const themeCard = isLight ? LIGHT_CARD : DARK_CARD;
  const themeBorder = isLight ? LIGHT_BORDER : DARK_BORDER;
  const themeMuted = isLight ? LIGHT_MUTED : DARK_TEXT;

  const handleSignOut = () => {
    if (isWeb) {
      if (confirm('Are you sure you want to sign out?')) {
        void signOut().then(() => router.replace('/'));
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ]);
    }
  };

  const handleDeleteAccount = () => {
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
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ground_owner':
        return 'Ground Owner';
      case 'super_admin':
        return 'Super Admin';
      default:
        return 'Player';
    }
  };

  const iconMuted = themeAccent;
  const chevronColor = isLight ? '#94a3b8' : themeAccent;

  const profileBody = (
    <View style={[styles.content]}>
      {(!isCompact && isWeb) && (
        <ProfileHeaderTabs
          themeAccent={themeAccent}
          themeText={themeText}
          isCompact={isCompact}
        />
      )}
      <Card
        style={[
          styles.profileCard,
          {
            backgroundColor: themeCard,
            borderColor: themeBorder,
            borderWidth: isLight ? 1 : styles.cardThemed.borderWidth,
            shadowColor: isLight ? '#000' : 'transparent',
            shadowOpacity: isLight ? 0.04 : 0,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: isLight ? '#f1f5f9' : DARK_BG, borderColor: themeAccent }]}>
            <User size={40} color={themeAccent} />
          </View>
        </View>
        <RNText style={[styles.name, { color: themeText }]}>{profile?.full_name}</RNText>
        <View style={[styles.roleBadge, { borderColor: themeAccent, backgroundColor: isLight ? 'rgba(16, 185, 129, 0.08)' : 'transparent', marginBottom: 16 }]}>
          <RNText style={[styles.roleText, { color: isLight ? themeAccent : themeText }]}>
            {profile && getRoleLabel(profile.role)}
          </RNText>
        </View>

        <View style={styles.overviewInfo}>
          <View style={styles.overviewInfoItem}>
            <Mail size={14} color={themeAccent} />
            <RNText style={[styles.overviewInfoText, { color: isLight ? '#475569' : themeText }]}>
              {user?.email}
            </RNText>
          </View>
          {profile?.phone && (
            <View style={styles.overviewInfoItem}>
              <Phone size={14} color={themeAccent} />
              <RNText style={[styles.overviewInfoText, { color: isLight ? '#475569' : themeText }]}>
                {profile.phone}
              </RNText>
            </View>
          )}
          {profile?.team_name && (
            <View style={styles.overviewInfoItem}>
              <Swords size={14} color={themeAccent} />
              <RNText style={[styles.overviewInfoText, { color: isLight ? '#475569' : themeText }]}>
                Team: {profile.team_name}
              </RNText>
            </View>
          )}
        </View>
      </Card>


      {(profile?.role === 'ground_owner' && (!isWeb || isCompact)) ? (
        <View style={[styles.menuCard, styles.ownerNavCard, { backgroundColor: themeCard, borderColor: themeBorder }]}>
          <RNText style={[styles.ownerNavTitle, { color: isLight ? themeMuted : themeText }]}>Ground owner</RNText>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/owner-dashboard' as any)}
          >
            <View style={styles.menuItemLeft}>
              <LayoutDashboard size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Dashboard</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/manage-grounds' as any)}
          >
            <View style={styles.menuItemLeft}>
              <MapPin size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>My grounds</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/ground-bookings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Calendar size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Bookings</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/inventory' as any)}
          >
            <View style={styles.menuItemLeft}>
              <CalendarClock size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Inventory Plan</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/bookings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Calendar size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>My Bookings</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/earnings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <IndianRupee size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Earnings</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/add-ground' as any)}
          >
            <View style={styles.menuItemLeft}>
              <PlusCircle size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Add ground</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/settings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Settings size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Settings</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/support' as any)}
          >
            <View style={styles.menuItemLeft}>
              <LifeBuoy size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Contact Us</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
        </View>
      ) : profile?.role === 'ground_owner' && isWeb && !isCompact ? ( // Only for desktop owners, mobile owners use the compact menu above
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/grounds')}
          >
            <RNText style={styles.menuItemText}>Manage Grounds</RNText>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
        </View>
      ) : null}

      {(isCompact || !isWeb) && (
        <View style={styles.menuContainer}>
          <RNText style={styles.ownerNavTitle}>MY ACCOUNT</RNText>
          <View style={[styles.menuCard, { backgroundColor: themeCard, borderColor: themeBorder }]}>
            {isSuperAdmin && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(admin)/dashboard')}
            >
              <View style={styles.menuItemLeft}>
                <Shield size={20} color={themeAccent} />
                <RNText style={[styles.menuItemText, { color: themeText }]}>Admin Dashboard</RNText>
              </View>
              <ChevronRight size={20} color={chevronColor} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/dashboard' as any)}
          >
            <View style={styles.menuItemLeft}>
              <LayoutDashboard size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>My Dashboard</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/bookings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Calendar size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>My Bookings</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/grounds?tab=favorite' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Star size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Favorites</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/profile/notifications' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Bell size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Notifications</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
  
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/profile/settings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Settings size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Settings</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/support' as any)}
          >
            <View style={styles.menuItemLeft}>
              <LifeBuoy size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>Contact Us</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>

          {!isWeb && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleDeleteAccount}
            >
              <View style={styles.menuItemLeft}>
                <RNText style={[styles.menuItemText, { color: '#EF4444' }]}>Delete Account</RNText>
              </View>
              <ChevronRight size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
          </View>
        </View>
      )}

      {(isCompact || !isWeb) && (
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          fullWidth
          style={styles.signOutButton}
        />
      )}
    </View>
  );

  if (Platform.OS === 'web' && !isCompact) {
    return (
      <WebLayout noCard>
        <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]}>{profileBody}</ScrollView>
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar title="Profile" />
      <ScrollView style={styles.container} contentContainerStyle={styles.nativeScrollContent}>
        {profileBody}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardThemed: {
    backgroundColor: '#06392e',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.2)',
    borderRadius: 12,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  roleBadgeThemed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.4)',
  },
  nativeScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  nativeScrollContent: {
    paddingBottom: 24,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  webHeader: {
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: IS_WEB ? '#111827' : '#FFFFFF',
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    paddingBottom: 32,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'flex-start',
    ...Platform.select({
      web: {
        paddingHorizontal: 16,
        paddingTop: 0,
      },
      default: {
        padding: 16,
      },
    }),
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  overviewInfo: {
    gap: 8,
    alignItems: 'center',
  },
  overviewInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewInfoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    marginTop: 16,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuCard: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  ownerNavCard: {
    paddingTop: 12,
  },
  ownerNavTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
    paddingHorizontal: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  menuContainer: {
    marginTop: 24,
  },
  settingsIcon: {
    marginLeft: 4,
  },
  signOutButton: {
    marginTop: 24,
  },
  desktopHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
});
