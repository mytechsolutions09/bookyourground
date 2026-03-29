import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Hop as Home, Calendar, User, Building2, Shield, LogOut } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

interface WebLayoutProps {
  children: React.ReactNode;
}

export default function WebLayout({ children }: WebLayoutProps) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    return (
      <TouchableOpacity
        style={[styles.navLink, isActive && styles.navLinkActive]}
        onPress={() => router.push(href as any)}
      >
        <Icon size={20} color={isActive ? '#2196F3' : '#666'} />
        <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.logo}>
            <Text style={styles.logoText}>Cricket Grounds</Text>
          </TouchableOpacity>
          {profile && (
            <View style={styles.headerRight}>
              <Text style={styles.userName}>{profile.full_name}</Text>
              <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                <LogOut size={18} color="#666" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {profile && (
          <View style={styles.sidebar}>
            <NavLink href="/(tabs)" icon={Home} label="Home" />
            <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
            <NavLink href="/(tabs)/profile" icon={User} label="Profile" />

            {profile.role === 'ground_owner' && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sidebarTitle}>Ground Owner</Text>
                <NavLink href="/(owner)/grounds" icon={Building2} label="My Grounds" />
                <NavLink href="/(owner)/bookings" icon={Calendar} label="Ground Bookings" />
              </>
            )}

            {profile.role === 'super_admin' && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sidebarTitle}>Admin</Text>
                <NavLink href="/(admin)/dashboard" icon={Shield} label="Dashboard" />
                <NavLink href="/(admin)/approve-grounds" icon={Building2} label="Approve Grounds" />
                <NavLink href="/(admin)/manage-users" icon={User} label="Manage Users" />
              </>
            )}
          </View>
        )}

        <View style={styles.main}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1000,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1400,
    marginHorizontal: 'auto',
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2196F3',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  signOutText: {
    fontSize: 14,
    color: '#666',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    padding: 16,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 65,
        height: 'calc(100vh - 65px)' as any,
        overflowY: 'auto' as any,
      },
    }),
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  navLinkActive: {
    backgroundColor: '#E3F2FD',
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  navLinkTextActive: {
    color: '#2196F3',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 12,
  },
  main: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: 'calc(100vh - 65px)' as any,
      },
    }),
  },
});
