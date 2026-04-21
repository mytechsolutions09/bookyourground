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
  Shield,
  CalendarClock,
  Star,
  ShoppingCart,
  LifeBuoy,
  Info,
  X,
  Swords,
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

      <Modal
        visible={showInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowInfoModal(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: themeBg }]}>
            <View style={styles.modalHeader}>
              <RNText style={[styles.modalTitle, { color: themeText }]}>Profile Info</RNText>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <X size={24} color={themeText} />
              </TouchableOpacity>
            </View>

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
              <View style={{ height: 8 }} />
              <RNText style={[styles.name, { color: themeText }]}>{getFormattedName(profile?.full_name)}</RNText>
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
            
            <View style={{ height: 40 }} />
          </View>
        </View>
      </Modal>


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
            onPress={() => router.push('/shop/cart' as any)}
          >
            <View style={styles.menuItemLeft}>
              <ShoppingCart size={20} color={themeAccent} />
              <RNText style={[styles.menuItemText, { color: themeText }]}>My Shopping Cart</RNText>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/favorites' as any)}
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
      <MobileAppNavbar 
        title="Profile" 
        rightAction={
          <TouchableOpacity onPress={() => setShowInfoModal(true)}>
            <Info size={22} color="#01b854" strokeWidth={2.5} />
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
});
