import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import {
  Hop as Home,
  Calendar,
  User,
  Building2,
  Shield,
  LogOut,
  Menu,
  X,
  Settings,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

interface WebLayoutProps {
  children: React.ReactNode;
}

export default function WebLayout({ children }: WebLayoutProps) {
  const { profile, signOut, user } = useAuth();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const isCompact = useMemo(() => width < 900, [width]);
  const isLanding = pathname === '/' || pathname === '';
  const adminEmail = 'invirtualcoin@gmail.com';
  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase();
  const isAuthenticated = !!profile || isSuperAdmin;
  const shouldShowSidebar = isAuthenticated ? (!isCompact || menuOpen) : menuOpen;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    return (
      <TouchableOpacity
        style={[styles.navLink, isActive && styles.navLinkActive]}
        onPress={() => {
          router.push(href as any);
          setMenuOpen(false);
        }}
      >
        <Icon size={20} color={isActive ? '#dc8d3c' : '#666'} />
        <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isLanding && (
        <View style={styles.heroHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.push(isAuthenticated ? '/(tabs)' : '/')}
              style={styles.logo}
            >
              <Text style={styles.logoText}>Book my ground</Text>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
                onPress={() => setMenuOpen((v) => !v)}
                style={styles.burgerButton}
              >
                {menuOpen ? <X size={20} color="#dc8d3c" /> : <Menu size={20} color="#dc8d3c" />}
              </TouchableOpacity>

              {profile && (
                <>
                  <Text style={styles.userName}>{profile.full_name}</Text>
                  <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                    <LogOut size={18} color="#dc8d3c" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      <View style={styles.body}>
          {shouldShowSidebar ? (
          <>
              {!isAuthenticated && menuOpen && (
                <TouchableOpacity
                  style={styles.mobileOverlay}
                  activeOpacity={1}
                  onPress={() => setMenuOpen(false)}
                />
              )}

              <View
                style={[
                  menuOpen ? styles.sidebarMobile : styles.sidebar,
                  isLanding && styles.sidebarHeaderOffset,
                ]}
              >
                {isAuthenticated ? (
                  <>
                    <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
                    <View style={styles.itemSpacer} />
                    <NavLink href="/(tabs)/profile" icon={User} label="Profile" />

                    {profile?.role === 'ground_owner' && (
                      <>
                        <View style={styles.divider} />
                        <Text style={styles.sidebarTitle}>Ground Owner</Text>
                        <NavLink href="/(owner)/grounds" icon={Building2} label="My Grounds" />
                        <NavLink
                          href="/(owner)/bookings"
                          icon={Calendar}
                          label="Ground Bookings"
                        />
                      </>
                    )}

                    {isSuperAdmin && (
                      <>
                        <View style={styles.divider} />
                        <Text style={styles.sidebarTitle}>Admin</Text>
                        <NavLink href="/(admin)/dashboard" icon={Shield} label="Dashboard" />
                        <NavLink
                          href="/(admin)/grounds"
                          icon={Building2}
                          label="Grounds"
                        />
                        <NavLink
                          href="/(admin)/bookings"
                          icon={Calendar}
                          label="All Bookings"
                        />
                        <NavLink
                          href="/(admin)/manage-ground-owners"
                          icon={Building2}
                          label="Ground Owners"
                        />
                        <NavLink
                          href="/(admin)/settings"
                          icon={Settings}
                          label="Settings"
                        />
                        <NavLink
                          href="/(admin)/manage-users"
                          icon={User}
                          label="Manage Users"
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <NavLink href="/" icon={Home} label="Home" />
                    <View style={styles.divider} />
                    <NavLink href="/(auth)/login" icon={User} label="Sign In" />
                    <NavLink href="/(auth)/signup" icon={User} label="Sign Up" />
                  </>
                )}
              </View>
          </>
        ) : null}

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
    backgroundColor: '#2b2f4b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1,
      },
    }),
  },
  heroHeader: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2000,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
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
    color: '#dc8d3c',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  signOutText: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    position: 'relative',
  },
  sidebar: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    padding: 16,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        height: '100vh' as any,
        overflowY: 'auto' as any,
      },
    }),
  },
  sidebarMobile: {
    position: 'absolute' as any,
    top: 0,
    right: 0,
    left: 'auto' as any,
    width: 220,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    borderLeftWidth: 0,
    padding: 16,
    zIndex: 3000,
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
    backgroundColor: '#2b2f4b',
  },
  sidebarHeaderOffset: {
    // Keep sidebar content below the landing hero header (logo + burger).
    // Prevents visual overlap when hero header is absolute.
    paddingTop: 78,
  },
  itemSpacer: {
    height: 14,
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  navLinkTextActive: {
    color: '#dc8d3c',
  },
  burgerButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
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
  mobileOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 2500,
  },
});
