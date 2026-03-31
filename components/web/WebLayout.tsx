import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
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
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  useEffect(() => {
    const handleScroll = () => {
      const y = (window as any).scrollY || 0;
      setScrolled(y > 8);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isCompact = useMemo(() => width < 900, [width]);
  const isLanding = pathname === '/' || pathname === '';
  const isMarketing = pathname === '/book-my-ground';
  const isGroundDetails = pathname.startsWith('/grounds');
  const isPublicNoSidebar = isLanding || isMarketing || isGroundDetails;
  const adminEmail = 'invirtualcoin@gmail.com';
  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase();
  // Treat the presence of a Supabase `user` as authenticated even if `profile`
  // hasn't loaded yet (prevents briefly showing "Sign In").
  const isAuthenticated = !!user || !!profile || isSuperAdmin;
  // App pages: sidebar as before. Public routes (/, book-my-ground): burger opens a small drawer
  // (Sign In / Sign Up when logged out; Profile when logged in).
  const showMenuPanel = !isPublicNoSidebar && isAuthenticated && !isCompact;
  const showLandingMobileMenu = isPublicNoSidebar && isCompact;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    return (
      <TouchableOpacity
        style={[styles.navLink, isActive && styles.navLinkActive]}
        onPress={() => {
          if (href === '/' || href === '') {
            router.replace('/' as any);
          } else {
            router.push(href as any);
          }
          setMenuOpen(false);
        }}
      >
        <Icon size={20} color={isActive ? '#dc8d3c' : '#666'} />
        <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const bodyStyle = isPublicNoSidebar ? styles.bodyFull : styles.body;

  return (
    <View style={styles.container}>
      {(isLanding || isMarketing || isGroundDetails) && (
        <View
          style={[
            styles.heroHeader,
            isGroundDetails && styles.heroHeaderGround,
            !isGroundDetails && scrolled && styles.heroHeaderScrolled,
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.replace('/')}
              style={[styles.logo, scrolled && styles.logoScrolled]}
            >
              <Text style={styles.logoText}>Book my ground</Text>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              {showLandingMobileMenu ? (
                <TouchableOpacity
                  style={styles.burgerButton}
                  onPress={() => setMenuOpen((prev) => !prev)}
                >
                  {menuOpen ? (
                    <X size={20} color="#F9FAFB" />
                  ) : (
                    <Menu size={20} color="#F9FAFB" />
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.headerPrimaryButton}
                    onPress={() => router.push('/book-my-ground' as any)}
                  >
                    <Text style={styles.headerPrimaryButtonText}>Grounds</Text>
                  </TouchableOpacity>

                  {!isAuthenticated ? (
                    <TouchableOpacity
                      style={styles.headerSecondaryButton}
                      onPress={() => router.push('/(auth)/login' as any)}
                    >
                      <Text style={styles.headerSecondaryButtonText}>Sign in</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.headerSecondaryButton}
                      onPress={() => router.push('/(tabs)/profile' as any)}
                    >
                      <Text style={styles.headerSecondaryButtonText}>Profile</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      )}

      {!isLanding && !isMarketing && !isGroundDetails && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.replace('/')} style={styles.logo}>
              <Text style={styles.logoText}>Book my ground</Text>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerPrimaryButton}
                onPress={() => router.push('/book-my-ground' as any)}
              >
                <Text style={styles.headerPrimaryButtonText}>Grounds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={bodyStyle}>
        {showLandingMobileMenu && menuOpen && (
          <>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.mobileOverlay}
              onPress={() => setMenuOpen(false)}
            />
            <View style={styles.sidebarMobile}>
              <Text style={styles.sidebarTitle}>Get started</Text>
              <TouchableOpacity
                style={styles.mobilePrimaryButton}
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/book-my-ground' as any);
                }}
              >
                <Text style={styles.mobilePrimaryButtonText}>Grounds</Text>
              </TouchableOpacity>

              {!isAuthenticated ? (
                <TouchableOpacity
                  style={styles.mobileSecondaryButton}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push('/(auth)/login' as any);
                  }}
                >
                  <Text style={styles.mobileSecondaryButtonText}>Sign in</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.mobileSecondaryButton}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push('/(tabs)/profile' as any);
                  }}
                >
                  <Text style={styles.mobileSecondaryButtonText}>Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {showMenuPanel ? (
          <View style={styles.sidebarContainer}>
            <View
              style={[
                styles.sidebar,
                isLanding && styles.sidebarHeaderOffset,
              ]}
            >
              {isAuthenticated && !isPublicNoSidebar && (
                <>
                  <Text style={styles.sidebarSectionTitle}>My Account</Text>
                  <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
                  <NavLink href="/(tabs)/profile" icon={User} label="Profile" />

                  <View style={styles.sidebarDivider} />
                  <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                  >
                    <LogOut size={18} color="#E5E7EB" />
                    <Text style={styles.signOutText}>Sign out</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.main}>{children}</View>
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
  heroHeaderGround: {
    position: 'fixed' as any,
    backgroundColor: '#2b2f4b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  heroHeaderScrolled: {
    position: 'fixed' as any,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.35)',
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
  logoScrolled: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.85)',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dc8d3c',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sidebarBrand: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sidebarBrandText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#dc8d3c',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  bodyFull: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
  },
  sidebarContainer: {
    paddingRight: 16,
  },
  sidebar: {
    width: 220,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
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
  sidebarSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  headerPrimaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#dc8d3c',
  },
  headerPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  headerSecondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(249,250,251,0.6)',
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  headerSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
    fontFamily: 'Inter',
  },
  mobilePrimaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#dc8d3c',
    width: '100%',
  },
  mobilePrimaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  mobileSecondaryButton: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  mobileSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
});
