import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
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
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '../../components/MobileAppNavbar';

const BG = '#043529';
const ACCENT = '#02c259';
const TEXT = '#dcc093';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const adminEmail = 'invirtualcoin@gmail.com';
  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase();

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
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

  const iconMuted = Platform.OS === 'web' ? '#666' : ACCENT;
  const chevronColor = Platform.OS === 'web' ? '#666' : ACCENT;

  const profileBody = (
    <View style={styles.content}>
      <Card style={[styles.profileCard, styles.cardThemed]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={40} color={Platform.OS === 'web' ? '#dc8d3c' : ACCENT} />
          </View>
        </View>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <View style={[styles.roleBadge, styles.roleBadgeThemed]}>
          <Text style={styles.roleText}>{profile && getRoleLabel(profile.role)}</Text>
        </View>
      </Card>

      <Card style={[styles.infoCard, styles.cardThemed]}>
        <View style={styles.infoRow}>
          <Mail size={20} color={iconMuted} />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>
        {profile?.phone && (
          <View style={styles.infoRow}>
            <Phone size={20} color={iconMuted} />
            <Text style={styles.infoText}>{profile.phone}</Text>
          </View>
        )}
      </Card>

      {Platform.OS !== 'web' && profile?.role === 'ground_owner' ? (
        <View style={[styles.menuCard, styles.ownerNavCard, styles.cardThemed]}>
          <Text style={styles.ownerNavTitle}>Ground owner</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/dashboard' as any)}
          >
            <View style={styles.menuItemLeft}>
              <LayoutDashboard size={20} color={ACCENT} />
              <Text style={styles.menuItemText}>Dashboard</Text>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/grounds' as any)}
          >
            <View style={styles.menuItemLeft}>
              <MapPin size={20} color={ACCENT} />
              <Text style={styles.menuItemText}>My grounds</Text>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/bookings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Calendar size={20} color={ACCENT} />
              <Text style={styles.menuItemText}>Bookings</Text>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/earnings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <IndianRupee size={20} color={ACCENT} />
              <Text style={styles.menuItemText}>Earnings</Text>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/add-ground' as any)}
          >
            <View style={styles.menuItemLeft}>
              <PlusCircle size={20} color={ACCENT} />
              <Text style={styles.menuItemText}>Add ground</Text>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/settings' as any)}
          >
            <View style={styles.menuItemLeft}>
              <Settings size={20} color={ACCENT} />
              <Text style={styles.menuItemText}>Settings</Text>
            </View>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
        </View>
      ) : null}

      {Platform.OS === 'web' && profile?.role === 'ground_owner' ? (
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(owner)/grounds')}
          >
            <Text style={styles.menuItemText}>Manage Grounds</Text>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.menuCard, styles.cardThemed]}>
        {isSuperAdmin && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(admin)/dashboard')}
          >
            <Text style={styles.menuItemText}>Admin Dashboard</Text>
            <ChevronRight size={20} color={chevronColor} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/favorites' as any)}
        >
          <Text style={styles.menuItemText}>Favorites</Text>
          <ChevronRight size={20} color={chevronColor} />
        </TouchableOpacity>
 
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/profile/notifications' as any)}
        >
          <Text style={styles.menuItemText}>Notifications</Text>
          <ChevronRight size={20} color={chevronColor} />
        </TouchableOpacity>
 
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/profile/settings' as any)}
        >
          <Text style={styles.menuItemText}>Settings</Text>
          <ChevronRight size={20} color={chevronColor} />
        </TouchableOpacity>
      </View>

      {Platform.OS !== 'web' && (
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

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <ScrollView style={styles.container}>{profileBody}</ScrollView>
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar />
      <ScrollView style={styles.container} contentContainerStyle={styles.nativeScrollContent}>
        {profileBody}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardThemed: Platform.select({
    web: {},
    default: {
      backgroundColor: '#06392e',
      borderWidth: 1,
      borderColor: 'rgba(0,234,107,0.2)',
      borderRadius: 12,
      elevation: 0,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
    },
  }),
  roleBadgeThemed: Platform.select({
    web: {},
    default: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: 'rgba(0,234,107,0.4)',
    },
  }),
  nativeScreen: {
    flex: 1,
    backgroundColor: '#043529',
  },
  nativeScrollContent: {
    paddingBottom: 24,
  },
  container: {
    flex: 1,
    backgroundColor: '#043529',
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
  content: {
    paddingBottom: 32,
    width: '100%',
    maxWidth: 1200,
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
    ...Platform.select({
      web: { backgroundColor: '#2b2f4b' },
      default: {
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: ACCENT,
      },
    }),
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    ...Platform.select({
      web: { color: '#212121' },
      default: { color: TEXT },
    }),
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    ...Platform.select({
      web: { backgroundColor: '#2b2f4b' },
      default: {},
    }),
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    ...Platform.select({
      web: { color: '#dc8d3c' },
      default: { color: TEXT },
    }),
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
    ...Platform.select({
      web: { color: '#333' },
      default: { color: TEXT },
    }),
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
    ...Platform.select({
      web: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      default: {},
    }),
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
    ...Platform.select({
      web: { color: '#6B7280' },
      default: { color: TEXT },
    }),
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    ...Platform.select({
      web: { color: '#333' },
      default: { color: TEXT },
    }),
  },
  signOutButton: {
    marginTop: 24,
  },
});
