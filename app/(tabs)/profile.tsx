import { View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, useWindowDimensions, Pressable, Image, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
  Camera,
  CheckCircle2,
  Users,
  Store,
  Package,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
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
const LIGHT_ACCENT = '#00ea6b';

const LIGHT_TEXT = '#0f172a';
const LIGHT_CARD = '#ffffff';
const LIGHT_BORDER = '#f1f5f9';
const LIGHT_MUTED = '#64748b';

export default function ProfileScreen({ 
  isModal, 
  onClose 
}: { 
  isModal?: boolean; 
  onClose?: () => void;
} = {}) {
  const { user, profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const isUltraNarrow = width < 350;
  const isTablet = width >= 600 && width < 900;
  const isWeb = Platform.OS === 'web';

  const [uploading, setUploading] = useState(false);

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

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;
    try {
      setUploading(true);
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
        
      if (Platform.OS === 'web') {
        alert('Profile photo updated successfully!');
      } else {
        Alert.alert('Success', 'Profile photo updated successfully!');
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      if (Platform.OS === 'web') {
        alert(err.message || 'Failed to upload image.');
      } else {
        Alert.alert('Upload Failed', err.message || 'Failed to upload image.');
      }
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('Error picking image:', err);
      if (Platform.OS !== 'web') {
        Alert.alert('Gallery Error', 'Could not open image gallery.');
      }
    }
  };

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
        return 'Venue Owner';
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
    <View style={[styles.content, isUltraNarrow && { paddingHorizontal: 12, paddingTop: 10 }]}>
      {(!isCompact && isWeb) && (
        <ProfileHeaderTabs
          themeAccent={themeAccent}
          themeText={themeText}
          isCompact={isCompact}
        />
      )}

      {/* 1. PROFILE CARD */}
      <View style={[styles.profileCardNew, isModal && styles.noContainer, isUltraNarrow && { padding: 16, marginBottom: 20 }]}>
        <View style={styles.profileCardContent}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={pickImage} 
            disabled={uploading}
            style={styles.avatarWrapperNew}
          >
            <Image
              source={profile?.avatar_url ? { uri: profile.avatar_url } : require('../../assets/avatar.png')}
              style={[styles.avatarNew, isUltraNarrow && { width: 64, height: 64, borderRadius: 32 }]}
            />
            {uploading ? (
              <View style={styles.avatarOverlayNew}>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            ) : (
              <View style={[styles.avatarOverlayNew, isUltraNarrow && { width: 22, height: 22, borderRadius: 11 }]}>
                <Camera size={isUltraNarrow ? 12 : 16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.profileTextContainer}>
            <RNText style={[styles.nameNew, isUltraNarrow && { fontSize: 16 }]}>{getFormattedName(profile?.full_name)}</RNText>
            <RNText style={[styles.roleNew, isUltraNarrow && { fontSize: 12 }]}>
              {profile?.role === 'ground_owner' ? 'Venue Owner & Player' : 'Player'}
            </RNText>
            
          </View>
        </View>
      </View>

      {/* 2. ADMIN HUB (Grid) */}
      {isSuperAdmin && (
        <View style={styles.sectionContainer}>
          <RNText style={styles.sectionTitle}>SUPER ADMIN HUB</RNText>
          <View style={styles.hubGrid}>
            <TouchableOpacity 
              style={[styles.hubCard, isModal && styles.noContainer, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
              onPress={() => router.push('/(admin)/dashboard' as any)}
            >
              <View style={styles.hubIconCircle}>
              <Shield size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Dashboard</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/manage-users' as any)}
          >
            <View style={styles.hubIconCircle}>
              <User size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Users</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/grounds' as any)}
          >
            <View style={styles.hubIconCircle}>
              <MapPin size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Grounds</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/bookings' as any)}
          >
            <View style={styles.hubIconCircle}>
              <Calendar size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Bookings</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/earnings' as any)}
          >
            <View style={styles.hubIconCircle}>
              <IndianRupee size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Earnings</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/orders' as any)}
          >
            <View style={styles.hubIconCircle}>
              <ShoppingCart size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Shop Orders</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/products' as any)}
          >
            <View style={styles.hubIconCircle}>
              <ShoppingBag size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Products</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/payouts' as any)}
          >
            <View style={styles.hubIconCircle}>
              <IndianRupee size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Payouts</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/inventory' as any)}
          >
            <View style={styles.hubIconCircle}>
              <LayoutGrid size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Inventory</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/messages' as any)}
          >
            <View style={styles.hubIconCircle}>
              <LifeBuoy size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Tickets</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/approve-grounds' as any)}
          >
            <View style={styles.hubIconCircle}>
              <CheckCircle2 size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Approvals</RNText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.hubCard, { width: (width > 900 || isTablet) ? '31.5%' : (isUltraNarrow ? '100%' : '47.5%') }, isUltraNarrow && { padding: 16, borderRadius: 16 }]}
            onPress={() => router.push('/(admin)/manage-ground-owners' as any)}
          >
            <View style={styles.hubIconCircle}>
              <Users size={24} color="#00ea6b" />
            </View>
            <RNText style={styles.hubCardText}>Partners</RNText>
          </TouchableOpacity>
        </View>
      </View>
    )}

    {/* 3. VENUE OWNER HUB (Redesigned) */}
    {(profile?.role === 'ground_owner' || isSuperAdmin) && (
      <View style={styles.venueOwnerSection}>
        {!isModal ? (
          <>
            <View style={styles.venueOwnerHeader}>
              <View style={styles.venueOwnerHeaderIcon}>
                <Store size={24} color="#00ea6b" />
              </View>
              <View style={styles.venueOwnerHeaderText}>
                <RNText style={styles.venueOwnerTitle}>Venue Owner Hub</RNText>
                <RNText style={styles.venueOwnerSubtitle}>Manage your venues, bookings, and business all in one place.</RNText>
              </View>
            </View>

            <View style={styles.venueOwnerGrid}>
              <TouchableOpacity 
                style={[styles.venueOwnerCard, { width: (width > 1200) ? '31.5%' : (width > 700 ? '48.5%' : '100%') }]}
                onPress={() => router.push('/(owner)/owner-dashboard' as any)}
              >
                <View style={styles.venueOwnerCardIconBg}>
                  <LayoutGrid size={28} color="#00ea6b" />
                </View>
                <RNText style={styles.venueOwnerCardTitle}>Dashboard</RNText>
                <RNText style={styles.venueOwnerCardDesc}>Overview of your venues, bookings, and performance.</RNText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.venueOwnerCard, { width: (width > 1200) ? '31.5%' : (width > 700 ? '48.5%' : '100%') }]}
                onPress={() => router.push('/(owner)/manage-grounds' as any)}
              >
                <View style={styles.venueOwnerCardIconBg}>
                  <MapPin size={28} color="#00ea6b" />
                </View>
                <RNText style={styles.venueOwnerCardTitle}>My Grounds</RNText>
                <RNText style={styles.venueOwnerCardDesc}>View and manage your grounds and venues.</RNText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.venueOwnerCard, { width: (width > 1200) ? '31.5%' : (width > 700 ? '48.5%' : '100%') }]}
                onPress={() => router.push('/(owner)/ground-bookings' as any)}
              >
                <View style={styles.venueOwnerCardIconBg}>
                  <Calendar size={28} color="#00ea6b" />
                </View>
                <RNText style={styles.venueOwnerCardTitle}>Bookings</RNText>
                <RNText style={styles.venueOwnerCardDesc}>Manage bookings, availability, and reservations.</RNText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.venueOwnerCard, { width: (width > 1200) ? '31.5%' : (width > 700 ? '48.5%' : '100%') }]}
                onPress={() => router.push('/(owner)/earnings' as any)}
              >
                <View style={styles.venueOwnerCardIconBg}>
                  <IndianRupee size={28} color="#00ea6b" />
                </View>
                <RNText style={styles.venueOwnerCardTitle}>Earnings</RNText>
                <RNText style={styles.venueOwnerCardDesc}>Track your earnings, transactions, and payouts.</RNText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.venueOwnerCard, { width: (width > 1200) ? '31.5%' : (width > 700 ? '48.5%' : '100%') }]}
                onPress={() => router.push('/(owner)/inventory' as any)}
              >
                <View style={styles.venueOwnerCardIconBg}>
                  <Package size={28} color="#00ea6b" />
                </View>
                <RNText style={styles.venueOwnerCardTitle}>Inventory</RNText>
                <RNText style={styles.venueOwnerCardDesc}>Manage your inventory, equipment, and stock.</RNText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.venueOwnerCard, { width: (width > 1200) ? '31.5%' : (width > 700 ? '48.5%' : '100%') }]}
                onPress={() => router.push('/(owner)/settings' as any)}
              >
                <View style={styles.venueOwnerCardIconBg}>
                  <Settings size={28} color="#00ea6b" />
                </View>
                <RNText style={styles.venueOwnerCardTitle}>Settings</RNText>
                <RNText style={styles.venueOwnerCardDesc}>Update your profile, preferences, and account settings.</RNText>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.sectionContainer}>
            <RNText style={styles.sectionTitle}>VENUE OWNER HUB</RNText>
            <View style={[styles.rowList, styles.noContainer]}>
              <TouchableOpacity 
                style={styles.rowItem}
                onPress={() => router.push('/(owner)/owner-dashboard' as any)}
              >
                <View style={styles.rowLeft}>
                  <LayoutGrid size={20} color="#00ea6b" />
                  <RNText style={styles.rowText}>Dashboard</RNText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.rowItem}
                onPress={() => router.push('/(owner)/manage-grounds' as any)}
              >
                <View style={styles.rowLeft}>
                  <MapPin size={20} color="#00ea6b" />
                  <RNText style={styles.rowText}>My Grounds</RNText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.rowItem}
                onPress={() => router.push('/(owner)/ground-bookings' as any)}
              >
                <View style={styles.rowLeft}>
                  <Calendar size={20} color="#00ea6b" />
                  <RNText style={styles.rowText}>Bookings</RNText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.rowItem}
                onPress={() => router.push('/(owner)/earnings' as any)}
              >
                <View style={styles.rowLeft}>
                  <IndianRupee size={20} color="#00ea6b" />
                  <RNText style={styles.rowText}>Earnings</RNText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.rowItem}
                onPress={() => router.push('/(owner)/inventory' as any)}
              >
                <View style={styles.rowLeft}>
                  <CalendarClock size={20} color="#00ea6b" />
                  <RNText style={styles.rowText}>Inventory</RNText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.rowItem}
                onPress={() => router.push('/(owner)/settings' as any)}
              >
                <View style={styles.rowLeft}>
                  <Settings size={20} color="#00ea6b" />
                  <RNText style={styles.rowText}>Settings</RNText>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    )}

    {/* 3. PLAYER DASHBOARD (Rows) */}
    <View style={styles.sectionContainer}>
      <RNText style={styles.sectionTitle}>{profile?.role === 'ground_owner' ? 'PLAYER ACCESS' : 'QUICK ACCESS'}</RNText>
      <View style={[styles.rowList, isModal && styles.noContainer]}>
        <TouchableOpacity 
          style={styles.rowItem}
          onPress={() => router.push('/(tabs)/dashboard' as any)}
        >
          <View style={styles.rowLeft}>
            <LayoutDashboard size={20} color="#00ea6b" />
            <RNText style={styles.rowText}>My Dashboard</RNText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.rowItem}
          onPress={() => router.push('/(tabs)/bookings' as any)}
        >
          <View style={styles.rowLeft}>
            <Trophy size={20} color="#00ea6b" />
            <RNText style={styles.rowText}>My Bookings</RNText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.rowItem}
          onPress={() => router.push('/(tabs)/favorites' as any)}
        >
          <View style={styles.rowLeft}>
            <Star size={20} color="#00ea6b" />
            <RNText style={styles.rowText}>My Favourites</RNText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.rowItem}
          onPress={() => router.push('/(tabs)/profile/orders' as any)}
        >
          <View style={styles.rowLeft}>
            <ShoppingBag size={20} color="#00ea6b" />
            <RNText style={styles.rowText}>My Orders</RNText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.rowItem}
          onPress={() => router.push('/(tabs)/profile/settings' as any)}
        >
          <View style={styles.rowLeft}>
            <Settings size={20} color="#00ea6b" />
            <RNText style={styles.rowText}>Settings</RNText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.rowItem}
          onPress={() => router.push('/wallet' as any)}
        >
          <View style={styles.rowLeft}>
            <IndianRupee size={20} color="#00ea6b" />
            <RNText style={styles.rowText}>My Wallet</RNText>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.rowItem}
          onPress={() => router.push('/(tabs)/support' as any)}
        >
          <View style={styles.rowLeft}>
            <LifeBuoy size={20} color="#00ea6b" />
            <RNText style={styles.rowText}>Contact Us</RNText>
          </View>
        </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleSignOut}
        activeOpacity={0.8}
        style={styles.signOutGlassContainer}
      >
        <BlurView intensity={20} tint="light" style={styles.signOutGlass}>
          <RNText style={styles.signOutText}>Sign Out</RNText>
        </BlurView>
      </TouchableOpacity>
    </View>
  );

  return (Platform.OS === 'web' && !isCompact) ? (
    <WebLayout noCard>
      <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]}>{profileBody}</ScrollView>
    </WebLayout>
  ) : (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar 
        title="PROFILE" 
        titleColor="#0F172A"
        smallerTitle
        rightAction={
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile/notifications' as any)}>
            <View style={styles.headerIconCircle}>
              <Bell size={20} color="#00ea6b" />
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
    fontSize: 20,
    fontWeight: '500',
    color: '#212121',
    fontFamily: 'Inter',
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
  roleNew: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
    marginBottom: 8,
  },
  emailContainerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  emailTextNew: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  content: {
    paddingBottom: 32,
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    ...Platform.select({
      web: {
        paddingHorizontal: 16,
        paddingTop: 16,
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
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 234, 107, 0.05)',
  },
  noContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 0,
  },
  profileCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarNew: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
  },
  avatarWrapperNew: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlayNew: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00ea6b',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileTextContainer: {
    flex: 1,
  },
  nameNew: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.2,
    fontFamily: 'Inter',
  },
  roleNew: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    marginBottom: 10,
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
    backgroundColor: '#00ea6b',
    borderRadius: 3,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: 0.3,
    fontFamily: 'Inter',
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
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 4,
  },
  hubCardText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  rowList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 8,
    overflow: 'hidden',
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
    fontSize: 13,
    fontWeight: '400',
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
  signOutGlassContainer: {
    marginBottom: 40,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  signOutGlass: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // VENUE OWNER HUB REDESIGN
  venueOwnerSection: {
    marginBottom: 40,
    marginTop: 8,
  },
  venueOwnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  venueOwnerHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 234, 107, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueOwnerHeaderText: {
    flex: 1,
  },
  venueOwnerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  venueOwnerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter',
    marginTop: 2,
    lineHeight: 20,
  },
  venueOwnerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  venueOwnerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  venueOwnerCardIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 234, 107, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  venueOwnerCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  venueOwnerCardDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Inter',
    fontWeight: '400',
  },
});
