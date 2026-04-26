import { View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, useWindowDimensions, Pressable, Image } from 'react-native';
import { ExpoImage } from 'expo-image';
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
  Shield,
  CalendarClock,
  Star,
  ShoppingCart,
  ShoppingBag,
  LifeBuoy,
  Info,
  X,
  Swords,
  LayoutGrid,
  Trophy,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import ProfileHeaderTabs from '@/components/profile/ProfileHeaderTabs';
import { useUI } from '@/contexts/UIContext';
import { Modal } from 'react-native';

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

  const [showInfoModal, setShowInfoModal] = useState(false);

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

  const { setTabBarVisible } = useUI();
  const lastScrollY = React.useRef(0);

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

  const iconMuted = themeAccent;
  const chevronColor = isLight ? '#94a3b8' : themeAccent;

  const getFormattedName = (name?: string) => {
    if (!name) return '';
    return name.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
  };

  const profileBody = (
    <View style={[styles.content]}>
      {(!isCompact && isWeb) && (
        <ProfileHeaderTabs
          themeAccent={themeAccent}
          themeText={themeText}
          isCompact={isCompact}
        />
      )}

      {/* 1. PROFILE CARD */}
      <View style={styles.profileCardNew}>
        <View style={styles.profileCardContent}>
          <Image
            source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg' }}
            style={styles.avatarNew}
          />
          <View style={styles.profileTextContainer}>
            <RNText style={styles.nameNew}>{getFormattedName(profile?.full_name)}</RNText>
            <RNText style={styles.roleNew}>
              {profile?.role === 'ground_owner' ? 'Ground Owner & Player' : 'Player'}
            </RNText>
            

          </View>
        </View>
      </View>

      {/* 2. GROUND OWNER HUB (Grid) */}
      {profile?.role === 'ground_owner' && (
        <View style={styles.sectionContainer}>
          <RNText style={styles.sectionTitle}>GROUND OWNER HUB</RNText>
          <View style={styles.hubGrid}>
            <TouchableOpacity 
              style={[styles.hubCard, { width: width > 900 ? '31.5%' : '47.5%' }]}
              onPress={() => router.push('/(owner)/owner-dashboard' as any)}
            >
              <View style={styles.hubIconCircle}>
                <LayoutGrid size={24} color="#10b981" />
              </View>
              <RNText style={styles.hubCardText}>Dashboard</RNText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.hubCard, { width: width > 900 ? '31.5%' : '47.5%' }]}
              onPress={() => router.push('/(owner)/manage-grounds' as any)}
            >
              <View style={styles.hubIconCircle}>
                <MapPin size={24} color="#10b981" />
              </View>
              <RNText style={styles.hubCardText}>My Grounds</RNText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.hubCard, { width: width > 900 ? '31.5%' : '47.5%' }]}
              onPress={() => router.push('/(owner)/ground-bookings' as any)}
            >
              <View style={styles.hubIconCircle}>
                <Calendar size={24} color="#10b981" />
              </View>
              <RNText style={styles.hubCardText}>Bookings</RNText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.hubCard, { width: width > 900 ? '31.5%' : '47.5%' }]}
              onPress={() => router.push('/(owner)/earnings' as any)}
            >
              <View style={styles.hubIconCircle}>
                <IndianRupee size={24} color="#10b981" />
              </View>
              <RNText style={styles.hubCardText}>Earnings</RNText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.hubCard, { width: width > 900 ? '31.5%' : '47.5%' }]}
              onPress={() => router.push('/(owner)/inventory' as any)}
            >
              <View style={styles.hubIconCircle}>
                <CalendarClock size={24} color="#10b981" />
              </View>
              <RNText style={styles.hubCardText}>Inventory</RNText>
            </TouchableOpacity>


            <TouchableOpacity 
              style={[styles.hubCard, { width: width > 900 ? '31.5%' : '47.5%' }]}
              onPress={() => router.push('/(owner)/settings' as any)}
            >
              <View style={styles.hubIconCircle}>
                <Settings size={24} color="#10b981" />
              </View>
              <RNText style={styles.hubCardText}>Settings</RNText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. PLAYER DASHBOARD (Rows) */}
      <View style={styles.sectionContainer}>
        <RNText style={styles.sectionTitle}>PLAYER DASHBOARD</RNText>
        <View style={styles.rowList}>
          <TouchableOpacity 
            style={styles.rowItem}
            onPress={() => router.push('/(tabs)/bookings' as any)}
          >
            <View style={styles.rowLeft}>
              <Trophy size={20} color="#10b981" />
              <RNText style={styles.rowText}>My Bookings</RNText>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.rowItem}
            onPress={() => router.push('/(tabs)/profile/orders' as any)}
          >
            <View style={styles.rowLeft}>
              <ShoppingBag size={20} color="#10b981" />
              <RNText style={styles.rowText}>My Orders</RNText>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.rowItem}
            onPress={() => router.push('/shop/cart' as any)}
          >
            <View style={styles.rowLeft}>
              <ShoppingCart size={20} color="#10b981" />
              <RNText style={styles.rowText}>My Shopping Cart</RNText>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.rowItem}
            onPress={() => router.push('/(tabs)/find-an-opponent' as any)}
          >
            <View style={styles.rowLeft}>
              <Swords size={20} color="#10b981" />
              <RNText style={styles.rowText}>Find Opposition</RNText>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      <Button
        title="Sign Out"
        onPress={handleSignOut}
        variant="danger"
        fullWidth
        style={styles.signOutButtonNew}
      />
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
      <MobileAppNavbar 
        title="PROFILE" 
        titleColor="#0F172A"
        smallerTitle
        rightAction={
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile/notifications' as any)}>
            <View style={styles.headerIconCircle}>
              <Bell size={20} color="#10b981" />
            </View>
          </TouchableOpacity>
        }
      />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.nativeScrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
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
    alignSelf: 'center',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  
  // NEW STYLES
  profileCardNew: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.05)',
  },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarNew: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
  },
  profileTextContainer: {
    flex: 1,
  },
  nameNew: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.3,
    fontFamily: 'Inter',
  },
  roleNew: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  levelContainer: {
    width: '100%',
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  levelPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: 0.5,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  hubCard: {
    width: '47.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  hubIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  hubCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  rowList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonNew: {
    marginBottom: 40,
    borderRadius: 16,
    height: 56,
  },
});
