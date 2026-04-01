import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  TextInput,
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
import { supabase } from '@/lib/supabase';

interface WebLayoutProps {
  children: React.ReactNode;
}

export default function WebLayout({ children }: WebLayoutProps) {
  const { profile, signOut, user } = useAuth();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; city: string | null; state: string | null }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

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

  // Navbar search: fetch ground suggestions as user types on landing pages.
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('grounds')
          .select('id, name, city, state')
          .eq('active', true)
          .eq('approved', true)
          .ilike('name', `%${searchQuery.trim()}%`)
          .limit(6);

        if (cancelled) return;
        if (error) {
          console.warn('Navbar search error:', error);
          setSearchResults([]);
        } else {
          setSearchResults(
            (data || []) as { id: string; name: string; city: string | null; state: string | null }[],
          );
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250); // simple debounce

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  const isCompact = useMemo(() => width < 900, [width]);
  const groundsHref = isCompact ? '/(tabs)/grounds' : '/book-my-ground';
  const cleanPath = pathname.split('?')[0];
  const isLanding = cleanPath === '/' || cleanPath === '';
  const isMarketing = cleanPath === '/book-my-ground';
  // Treat only /grounds/[id] style routes as "ground details".
  // Plain /grounds (lists, dashboards) should use the normal app navbar.
  const isGroundDetails = cleanPath.startsWith('/grounds/');
  const isBookingDetails = cleanPath.startsWith('/bookings/');
  const adminPathnames = [
    '/dashboard',
    '/bookings',
    '/grounds',
    '/earnings',
    '/withdrawals',
    '/locations',
    '/manage-ground-owners',
    '/manage-users',
    '/settings',
  ];
  const isAdminRoute = adminPathnames.includes(cleanPath);
  // On ground info (/grounds/[id]) and booking info (/bookings/[id]) pages,
  // hide the left sidebar for all roles so the content can take full width.
  const isGroundInfoPage = isGroundDetails;
  const isPublicNoSidebar = isLanding || isMarketing || isGroundInfoPage || isBookingDetails;
  const adminEmail = 'invirtualcoin@gmail.com';
  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase();
  const isGroundOwner = profile?.role === 'ground_owner';
  const isOwnerGroundsDashboard = isGroundOwner && cleanPath === '/grounds';
  const isUserRoute =
    !isGroundOwner &&
    !isSuperAdmin &&
    (cleanPath === '/(tabs)/bookings' || cleanPath === '/(tabs)/profile');
  // Treat the presence of a Supabase `user` as authenticated even if `profile`
  // hasn't loaded yet (prevents briefly showing "Sign In").
  const isAuthenticated = !!user || !!profile || isSuperAdmin;
  // App pages: sidebar as before. Public routes (/, book-my-ground): burger opens a small drawer
  // (Sign In / Sign Up when logged out; Profile when logged in).
  const showOwnerMobileMenu = isAuthenticated && isGroundOwner && !isPublicNoSidebar && isCompact;
  const showAdminMobileMenu =
    isAuthenticated && isSuperAdmin && isAdminRoute && !isPublicNoSidebar && isCompact;
  const showUserMobileMenu =
    isAuthenticated &&
    !isGroundOwner &&
    !isSuperAdmin &&
    !isPublicNoSidebar &&
    isCompact;
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
  const showHeroHeader =
    isLanding ||
    isMarketing ||
    (isGroundDetails && !isOwnerGroundsDashboard && !isSuperAdmin);

  return (
    <View
      style={[
        styles.container,
        (isLanding || isMarketing) && styles.containerLanding,
      ]}
    >
      {showHeroHeader && (
        <View
          style={[
            styles.heroHeader,
            isGroundDetails && styles.heroHeaderGround,
            isMarketing && styles.heroHeaderMarketing,
            !isGroundDetails && !isMarketing && scrolled && styles.heroHeaderScrolled,
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
                  {!isCompact && (
                    <View style={styles.headerSearch}>
                      <TextInput
                        placeholder="Search grounds"
                        placeholderTextColor="#E5E7EB"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.headerSearchInput}
                      />

                      {searchQuery.trim().length >= 2 && (
                        <View style={styles.searchDropdown}>
                          {searchLoading && searchResults.length === 0 ? (
                            <Text style={styles.searchDropdownText}>Searching…</Text>
                          ) : searchResults.length === 0 ? (
                            <Text style={styles.searchDropdownText}>No grounds found</Text>
                          ) : (
                            searchResults.map((g) => (
                              <TouchableOpacity
                                key={g.id}
                                style={styles.searchDropdownItem}
                                onPress={() => {
                                  setSearchQuery('');
                                  setSearchResults([]);
                                  router.push(`/grounds/${g.id}` as any);
                                }}
                              >
                                <Text style={styles.searchDropdownItemTitle}>{g.name}</Text>
                                {!!(g.city || g.state) && (
                                  <Text style={styles.searchDropdownItemSubtitle}>
                                    {[g.city, g.state].filter(Boolean).join(', ')}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.headerPrimaryButton}
                    onPress={() => router.push(groundsHref as any)}
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

      {!isLanding && !isMarketing && (!isGroundDetails || isOwnerGroundsDashboard) && (
        <View
          style={[
            styles.header,
            isGroundOwner && !isPublicNoSidebar && styles.ownerHeader,
            isUserRoute && !isPublicNoSidebar && styles.userHeader,
          ]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.replace('/')} style={styles.logo}>
              <Text style={styles.logoText}>Book my ground</Text>
            </TouchableOpacity>

            <View style={styles.headerRight}>
              {showOwnerMobileMenu || showAdminMobileMenu || showUserMobileMenu ? (
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
                !isCompact && (
                  <TouchableOpacity
                    style={styles.headerPrimaryButton}
                    onPress={() => router.push('/book-my-ground' as any)}
                  >
                    <Text style={styles.headerPrimaryButtonText}>Grounds</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        </View>
      )}

      <View style={bodyStyle}>
        {(showLandingMobileMenu ||
          showOwnerMobileMenu ||
          showAdminMobileMenu ||
          showUserMobileMenu) &&
          menuOpen && (
          <>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.mobileOverlay}
              onPress={() => setMenuOpen(false)}
            />
            <View style={styles.sidebarMobile}>
              {showLandingMobileMenu &&
                !showOwnerMobileMenu &&
                !showAdminMobileMenu &&
                !showUserMobileMenu && (
                <>
                  <Text style={styles.sidebarTitle}>Get started</Text>
                  <TouchableOpacity
                    style={styles.mobilePrimaryButton}
                    onPress={() => {
                      setMenuOpen(false);
                      router.push(groundsHref as any);
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
                </>
              )}

              {showOwnerMobileMenu && (
                <>
                  <Text style={styles.sidebarTitle}>Ground owner</Text>
                  <NavLink href="/(owner)/dashboard" icon={Home} label="Dashboard" />
                  <NavLink href="/(owner)/grounds" icon={Building2} label="My grounds" />
                  <NavLink href="/(owner)/bookings" icon={Calendar} label="Bookings" />
                  <NavLink href="/(owner)/earnings" icon={Calendar} label="Earnings" />
                  <NavLink href="/(owner)/add-ground" icon={Building2} label="Add ground" />
                  <NavLink href="/(owner)/settings" icon={Settings} label="Settings" />

                  <View style={styles.sidebarDivider} />
                  <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={async () => {
                      await handleSignOut();
                      setMenuOpen(false);
                    }}
                  >
                    <LogOut size={18} color="#E5E7EB" />
                    <Text style={styles.signOutText}>Sign out</Text>
                  </TouchableOpacity>
                </>
              )}

              {showAdminMobileMenu && (
                <>
                  <Text style={styles.sidebarTitle}>Super admin</Text>
                  <NavLink href="/(admin)/dashboard" icon={Home} label="Dashboard" />
                  <NavLink href="/(admin)/bookings" icon={Calendar} label="Bookings" />
                  <NavLink href="/(admin)/grounds" icon={Building2} label="Grounds" />
                  <NavLink href="/(admin)/earnings" icon={Calendar} label="Earnings" />
                  <NavLink href="/(admin)/withdrawals" icon={Calendar} label="Withdraw" />
                  <NavLink
                    href="/(admin)/manage-ground-owners"
                    icon={Shield}
                    label="Ground owners"
                  />
                  <NavLink href="/(admin)/manage-users" icon={User} label="Users" />
                  <NavLink href="/(admin)/settings" icon={Settings} label="Settings" />

                  <View style={styles.sidebarDivider} />
                  <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={async () => {
                      await handleSignOut();
                      setMenuOpen(false);
                    }}
                  >
                    <LogOut size={18} color="#E5E7EB" />
                    <Text style={styles.signOutText}>Sign out</Text>
                  </TouchableOpacity>
                </>
              )}

              {showUserMobileMenu && (
                <>
                  <Text style={styles.sidebarTitle}>My Account</Text>
                  <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
                  <NavLink href="/(tabs)/profile" icon={User} label="Profile" />

                  <View style={styles.sidebarDivider} />
                  <TouchableOpacity
                    style={[styles.signOutButton, styles.signOutButtonUser]}
                    onPress={async () => {
                      await handleSignOut();
                      setMenuOpen(false);
                    }}
                  >
                    <LogOut size={18} color="#E5E7EB" />
                    <Text style={styles.signOutText}>Sign out</Text>
                  </TouchableOpacity>
                </>
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
                  {isSuperAdmin && isAdminRoute ? (
                    <>
                      <Text style={styles.sidebarSectionTitle}>Super admin</Text>
                      <NavLink href="/(admin)/dashboard" icon={Home} label="Dashboard" />
                      <NavLink href="/(admin)/bookings" icon={Calendar} label="Bookings" />
                      <NavLink href="/(admin)/grounds" icon={Building2} label="Grounds" />
                      <NavLink href="/(admin)/earnings" icon={Calendar} label="Earnings" />
                      <NavLink href="/(admin)/withdrawals" icon={Calendar} label="Withdraw" />
                      <NavLink
                        href="/(admin)/manage-ground-owners"
                        icon={Shield}
                        label="Ground owners"
                      />
                      <NavLink href="/(admin)/manage-users" icon={User} label="Users" />
                      <NavLink href="/(admin)/settings" icon={Settings} label="Settings" />

                      <View style={styles.sidebarDivider} />
                  <TouchableOpacity
                    style={[styles.signOutButton, styles.signOutButtonUser]}
                    onPress={handleSignOut}
                  >
                        <LogOut size={18} color="#E5E7EB" />
                        <Text style={styles.signOutText}>Sign out</Text>
                      </TouchableOpacity>
                    </>
                  ) : isGroundOwner ? (
                    <>
                      <Text style={styles.sidebarSectionTitle}>Ground owner</Text>
                      <NavLink href="/(owner)/dashboard" icon={Home} label="Dashboard" />
                      <NavLink href="/(owner)/grounds" icon={Building2} label="My grounds" />
                      <NavLink href="/(owner)/bookings" icon={Calendar} label="Bookings" />
                      <NavLink href="/(owner)/earnings" icon={Calendar} label="Earnings" />
                      <NavLink href="/(owner)/add-ground" icon={Building2} label="Add ground" />
                      <NavLink href="/(owner)/settings" icon={Settings} label="Settings" />

                      <View style={styles.sidebarDivider} />
                      <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                      >
                        <LogOut size={18} color="#E5E7EB" />
                        <Text style={styles.signOutText}>Sign out</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
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
  containerLanding: {
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2b2f4b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.35)',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1,
      },
    }),
  },
  ownerHeader: {
    backgroundColor: '#2b2f4b',
    borderBottomColor: 'rgba(15,23,42,0.35)',
  },
  userHeader: {
    backgroundColor: '#2b2f4b',
    borderBottomColor: 'rgba(15,23,42,0.35)',
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
  heroHeaderMarketing: {
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
  headerSearch: {
    minWidth: 220,
    maxWidth: 320,
    position: 'relative',
  },
  headerSearchInput: {
    borderWidth: 1,
    borderColor: 'rgba(249,250,251,0.4)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#F9FAFB',
    fontSize: 14,
    fontFamily: 'Inter',
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  searchDropdown: {
    position: 'absolute' as any,
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 2500,
  },
  searchDropdownText: {
    fontSize: 13,
    color: '#6B7280',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchDropdownItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  searchDropdownItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    backgroundColor: '#111827',
  },
  signOutButtonUser: {
    backgroundColor: '#2b2f4b',
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
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
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
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 96,
        alignSelf: 'flex-start',
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
