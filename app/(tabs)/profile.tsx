import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { User, Phone, Mail, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';

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

  const content = (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={40} color={Platform.OS === 'web' ? '#dc8d3c' : '#2196F3'} />
            </View>
          </View>
          <Text style={styles.name}>{profile?.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{profile && getRoleLabel(profile.role)}</Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Mail size={20} color="#666" />
            <Text style={styles.infoText}>{user?.email}</Text>
          </View>
          {profile?.phone && (
            <View style={styles.infoRow}>
              <Phone size={20} color="#666" />
              <Text style={styles.infoText}>{profile.phone}</Text>
            </View>
          )}
        </Card>

        <View style={styles.menuCard}>
          {profile?.role === 'ground_owner' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(owner)/grounds')}
            >
              <Text style={styles.menuItemText}>Manage Grounds</Text>
              <ChevronRight size={20} color="#666" />
            </TouchableOpacity>
          )}

          {isSuperAdmin && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(admin)/dashboard')}
            >
              <Text style={styles.menuItemText}>Admin Dashboard</Text>
              <ChevronRight size={20} color="#666" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Favorites</Text>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Notifications</Text>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Settings</Text>
            <ChevronRight size={20} color="#666" />
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
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    backgroundColor: Platform.OS === 'web' ? '#2b2f4b' : '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: Platform.OS === 'web' ? '#2b2f4b' : '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Platform.OS === 'web' ? '#dc8d3c' : '#2196F3',
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
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuCard: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  signOutButton: {
    marginTop: 24,
  },
});
