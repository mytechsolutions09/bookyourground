import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  TextInput,
  ScrollView,
} from 'react-native';
import { router, usePathname, useSegments } from 'expo-router';
import {
  Hop as Home, // still used for some public nav
  LayoutDashboard,
  Calendar,
  User,
  Building2,
  Shield,
  LogOut,
  Menu,
  X,
  Settings,
  IndianRupee,
  Wallet2,
  MapPin,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Swords,
  CalendarClock,
  Star,
  Mail,
  LifeBuoy,
  Search,
  Ticket,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { makeGroundPath } from '@/utils/groundSlug';

interface WebLayoutProps {
  children: React.ReactNode;
  noCard?: boolean;
}

export default function WebLayout({ children, noCard }: WebLayoutProps) {
  const { profile, signOut, user } = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<{ grounds: any[], matches: any[] }>({ grounds: [], matches: [] });
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults({ grounds: [], matches: [] });
      return;
    }
    
    setIsSearching(true);
    try {
      const q = `%${query}%`;
      
      // 1. Search Grounds
      const { data: groundsData } = await supabase
        .from('grounds')
        .select('*, ground_images(*)')
        .or(`name.ilike.${q},city.ilike.${q},state.ilike.${q}`)
        .eq('active', true)
        .eq('approved', true)
        .limit(5);

      // 2. Search Matches (Matchmaking)
      // Note: We search profiles (full_name, team_name) and grounds (name, city) for the matches
      const { data: matchesData } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds(*, ground_images(*)),
          user:profiles(*)
        `)
        .eq('status', 'confirmed') // Assume matchmaking is only for confirmed slots
        .or(`notes.ilike.${q},opponent_team_name.ilike.${q}`) // Basic filter on booking notes/team_name if exists
        // Since we can't easily join-filter across tables in a single .or() call without complex RPCs,
        // we'll primarily search on the user's team/name in the profile join if possible, 
        // or just depend on the ground info which is already covered by the grounds search.
        .limit(5);

      // Advanced matchmaking search: include captain/team name from profiles
      const { data: profilesWithMatch } = await supabase
        .from('profiles')
        .select(`
          team_name,
          full_name,
          bookings!user_id(
            *,
            ground:grounds(*, ground_images(*))
          )
        `)
        .or(`team_name.ilike.${q},full_name.ilike.${q}`)
        .limit(5);

      // Flatten and filter profilesWithMatch into matches if the booking is active
      const additionalMatches = (profilesWithMatch || [])
        .flatMap(p => (p.bookings || []).map(b => ({ ...b, user: { team_name: p.team_name, full_name: p.full_name } })))
        .filter(b => b.ground); // Ensure ground data exists

      setSearchResults({
        grounds: groundsData || [],
        matches: matchesData || additionalMatches
      });
    } catch (err) {
      console.error('Global search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim());
      } else {
        setSearchResults({ grounds: [], matches: [] });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleResultPress = (type: 'ground' | 'match', item: any) => {
    setSearchQuery('');
    setSearchFocused(false);
    
    if (type === 'ground') {
      router.push(makeGroundPath(item) as any);
    } else {
      // Direct join for Matches found in search
      const citySlug = (item.ground?.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const nameSlug = (item.ground?.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      router.push({
        pathname: `/ground/${citySlug}/${nameSlug}`,
        params: {
          date: item.booking_date,
          time: item.start_time?.slice(0, 5),
          teams: 'one',
          lock: 'true'
        }
      } as any);
    }
  };

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

  const isCompact = useMemo(() => width < 900, [width]);
  const groundsHref = isCompact ? '/(tabs)/grounds' : '/book-my-ground';
  const cleanPath = pathname.split('?')[0];
  const isLanding = cleanPath === '/' || cleanPath === '';
  const isMarketing = cleanPath === '/book-my-ground';
  // Treat only ground detail routes as "ground details" (hide sidebar, use hero header).
  // Plain /grounds (lists, dashboards) should use the normal app navbar.
  const isGroundDetails =
    cleanPath.startsWith('/grounds/') || cleanPath.startsWith('/ground/');
  const isBookingDetails = cleanPath.startsWith('/bookings/');
  const isCheckoutPage = cleanPath.startsWith('/checkout/');
  const isLegalOrInfoPage =
    cleanPath === '/terms' ||
    cleanPath === '/privacy' ||
    cleanPath === '/refund-policy' ||
    cleanPath === '/contact' ||
    cleanPath === '/cricket';
  const adminPathnames = [
    '/dashboard',
    '/bookings',
    '/grounds',
    '/earnings',
    '/withdrawals',
    '/inventory',
    '/locations',
    '/manage-ground-owners',
    '/manage-users',
    '/messages',
    '/settings',
    '/settings/coupons',
    '/settings/locations',
    '/settings/ground-types',
    '/settings/payment',
    '/settings/support',
  ];
  const isAdminRoute =
    adminPathnames.includes(cleanPath) ||
    cleanPath.startsWith('/(admin)/') ||
    cleanPath.startsWith('/settings/') ||
    cleanPath === '/add-ground' ||
    cleanPath === '/(owner)/add-ground' ||
    cleanPath === '/matches' ||
    cleanPath === '/find-an-opponent' ||
    cleanPath === '/(tabs)/matches' ||
    cleanPath === '/(tabs)/find-an-opponent';
  // On ground info (/grounds/[id]) and booking info (/bookings/[id]) pages,
  // hide the left sidebar for all roles so the content can take full width.
  const isGroundInfoPage = isGroundDetails;
  const adminEmail = 'invirtualcoin@gmail.com';
  const isSuperAdmin =
    profile?.role === 'super_admin' ||
    (user?.email?.toLowerCase() ?? '') === adminEmail.toLowerCase();
  const isGroundOwner = profile?.role === 'ground_owner';
  const isOwnerGroundsDashboard = isGroundOwner && cleanPath === '/grounds';
  const isUserRoute =
    !isGroundOwner &&
    !isSuperAdmin &&
    (cleanPath === '/(tabs)/dashboard' ||
      cleanPath === '/(tabs)/bookings' ||
      cleanPath === '/(tabs)/profile');

  // On ground info (/grounds/[id]) and booking info (/bookings/[id]) pages,
  // hide the left sidebar for all roles so the content can take full width.
  const isPublicNoSidebar =
    isLanding || isMarketing || isGroundInfoPage || isBookingDetails || isCheckoutPage || isLegalOrInfoPage || (cleanPath === '/find-an-opponent' && !isSuperAdmin) || cleanPath === '/(tabs)/grounds' || cleanPath === '/search' || cleanPath.startsWith('/live/');
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

  const NavLink = ({
    href,
    icon: Icon,
    label,
    hideLabel = false,
  }: {
    href: string;
    icon: any;
    label: string;
    hideLabel?: boolean;
  }) => {
    const normalize = (value: string) => {
      if (value.length > 1 && value.endsWith('/')) {
        return value.slice(0, -1);
      }
      return value;
    };

    const clean = (p: string) => p.replace(/\/\([^)]+\)/g, '');
    const currentPath = clean(normalize(pathname));
    const targetHref = clean(normalize(href));

    const hrefSegments = href.split('/').filter(Boolean);
    const isActive =
      hrefSegments.length > 0
        ? hrefSegments.length === segments.length &&
          hrefSegments.every((seg, i) => segments[i] === seg)
        : currentPath === targetHref;
    const iconColor = isActive
      ? (!isCompact ? '#043529' : '#00ea6b')
      : (isCompact ? '#dcc093' : '#6B7280');
    const activeStyle = isCompact ? styles.navLinkActiveMobile : styles.navLinkActive;

    return (
      <TouchableOpacity
        style={[
          styles.navLink,
          isActive && activeStyle,
          hideLabel && styles.navLinkCollapsed,
        ]}
        onPress={() => {
          if (href === '/' || href === '') {
            router.replace('/' as any);
          } else {
            router.push(href as any);
          }
          setMenuOpen(false);
        }}
      >
        <Icon size={18} color={iconColor} />
        <Text
          numberOfLines={1}
          style={[
            styles.navLinkText,
            isCompact && styles.navLinkTextMobile,
            isActive && (isCompact ? styles.navLinkTextActiveMobile : styles.navLinkTextActive),
            !isCompact && hideLabel && { opacity: 0, width: 0, marginLeft: 0 } as any,
            !isCompact && { transition: 'all 0.3s ease-in-out' } as any,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const isAdminLayout = isSuperAdmin && isAdminRoute;
  const bodyStyle = (isPublicNoSidebar || isCompact) ? styles.bodyFull : isAdminLayout ? styles.bodyAdmin : styles.body;
  // Ground/booking detail pretty URLs must always get the top bar (logo, search, Grounds, Sign in).
  // Do not exclude super admins here — otherwise neither hero nor the app header renders on /ground/... .
  const showHeroHeader =
    isLanding ||
    isMarketing ||
    (isGroundDetails && !isOwnerGroundsDashboard);

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
              accessibilityRole="link"
              accessibilityLabel="Book my ground — home"
            >
              <Image
                source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              {showLandingMobileMenu ? (
                <TouchableOpacity
                  style={styles.burgerButton}
                  onPress={() => setMenuOpen((prev) => !prev)}
                >
                  {menuOpen ? (
                    <X size={20} color="#dcc093" />
                  ) : (
                    <Menu size={20} color="#dcc093" />
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  {!isCompact && (
                    <View style={styles.headerSearch}>
                      <Search size={16} color="#9CA3AF" style={styles.headerSearchIcon} />
                      <TextInput
                        placeholder="Search by city or venue name..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => {
                          // Small delay to allow result clicks to register before unmounting
                          setTimeout(() => setSearchFocused(false), 200);
                        }}
                        onSubmitEditing={() => {
                          if (searchQuery.trim().length >= 2) {
                            setSearchFocused(false);
                            router.push({
                              pathname: '/search',
                              params: { q: searchQuery.trim() }
                            } as any);
                          }
                        }}
                        returnKeyType="search"
                        style={[
                          styles.headerSearchInput,
                          searchFocused && { borderColor: 'rgba(0,234,107,0.3)' } as any,
                        ]}
                      />

                      {searchFocused && (searchQuery.length >= 2) && (
                        <View style={styles.searchDropdown}>
                          {isSearching ? (
                            <Text style={styles.searchDropdownText}>Searching...</Text>
                          ) : (searchResults.grounds.length === 0 && searchResults.matches.length === 0) ? (
                            <Text style={styles.searchDropdownText}>No results found for "{searchQuery}"</Text>
                          ) : (
                            <ScrollView style={styles.searchDropdownScroll} keyboardShouldPersistTaps="handled">
                              {searchResults.grounds.length > 0 && (
                                <View style={styles.searchSection}>
                                  <Text style={styles.searchSectionTitle}>VENUES</Text>
                                  {searchResults.grounds.map(g => (
                                    <TouchableOpacity 
                                      key={g.id} 
                                      style={styles.searchItem}
                                      onPress={() => handleResultPress('ground', g)}
                                    >
                                      <View style={styles.searchItemIcon}>
                                        <Building2 size={14} color="#01b854" />
                                      </View>
                                      <View style={styles.searchItemInfo}>
                                        <Text style={styles.searchItemName}>{g.name}</Text>
                                        <Text style={styles.searchItemMeta}>{g.city}, {g.state}</Text>
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                              
                              {searchResults.matches.length > 0 && (
                                <View style={styles.searchSection}>
                                  <Text style={styles.searchSectionTitle}>AVAILABLE MATCHES</Text>
                                  {searchResults.matches.map(m => (
                                    <TouchableOpacity 
                                      key={m.id} 
                                      style={styles.searchItem}
                                      onPress={() => handleResultPress('match', m)}
                                    >
                                      <View style={[styles.searchItemIcon, { backgroundColor: 'rgba(0,234,107,0.1)' }]}>
                                        <Swords size={14} color="#01b854" />
                                      </View>
                                      <View style={styles.searchItemInfo}>
                                        <Text style={styles.searchItemName}>
                                          {m.user?.team_name || m.user?.full_name || 'Anonymous Match'}
                                        </Text>
                                        <Text style={styles.searchItemMeta}>
                                          {m.ground?.name} • {m.ground?.city}
                                        </Text>
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                            </ScrollView>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  <Text
                    style={styles.headerPrimaryButtonText}
                    onPress={() => router.push('/cricket' as any)}
                  >
                    Cricket
                  </Text>

                  <Text
                    style={styles.headerPrimaryButtonText}
                    onPress={() => router.push('/find-an-opponent' as any)}
                  >
                    Find Match
                  </Text>

                  <Text
                    style={styles.headerPrimaryButtonText}
                    onPress={() => router.push(groundsHref as any)}
                  >
                    Grounds
                  </Text>

                  {!isAuthenticated ? (
                    <Text
                      style={styles.headerSecondaryButtonText}
                      onPress={() => router.push('/(auth)/login' as any)}
                    >
                      Sign in
                    </Text>
                  ) : (
                    <Text
                      style={styles.headerSecondaryButtonText}
                      onPress={() => {
                        if (isSuperAdmin) {
                          router.push('/(admin)/dashboard' as any);
                        } else if (isGroundOwner) {
                          router.push('/(owner)/dashboard' as any);
                        } else {
                          router.push('/(tabs)/dashboard' as any);
                        }
                      }}
                    >
                      Dashboard
                    </Text>
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
            <TouchableOpacity
              onPress={() => router.replace('/')}
              style={styles.logo}
              accessibilityRole="link"
              accessibilityLabel="Book my ground — home"
            >
              <Image
                source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              {(isCompact && isAuthenticated && !isPublicNoSidebar) ? (
                <TouchableOpacity
                  style={styles.burgerButton}
                  onPress={() => setMenuOpen((prev) => !prev)}
                >
                  {menuOpen ? (
                    <X size={20} color="#dcc093" />
                  ) : (
                    <Menu size={20} color="#dcc093" />
                  )}
                </TouchableOpacity>
              ) : (
                !isCompact && (
                  <View style={{ flexDirection: 'row', gap: 24 }}>
                      <Text
                        style={styles.headerPrimaryButtonText}
                        onPress={() => router.push('/cricket' as any)}
                      >
                        Cricket
                      </Text>
                    <Text
                      style={styles.headerPrimaryButtonText}
                      onPress={() => router.push('/find-an-opponent' as any)}
                    >
                      Find Match
                    </Text>
                    <Text
                      style={styles.headerPrimaryButtonText}
                      onPress={() => router.push('/book-my-ground' as any)}
                    >
                      Grounds
                    </Text>
                    {!isAuthenticated ? (
                      <Text
                        style={styles.headerSecondaryButtonText}
                        onPress={() => router.push('/(auth)/login' as any)}
                      >
                        Sign in
                      </Text>
                    ) : (
                      <Text
                        style={styles.headerPrimaryButtonText}
                        onPress={() => {
                          if (isSuperAdmin) {
                            router.push('/(admin)/dashboard' as any);
                          } else if (isGroundOwner) {
                            router.push('/(owner)/dashboard' as any);
                          } else {
                            router.push('/(tabs)/dashboard' as any);
                          }
                        }}
                      >
                        Dashboard
                      </Text>
                    )}
                  </View>
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
              <View style={styles.main}>
                {noCard ? children : <View style={styles.mainAppCard}>{children}</View>}
              </View>
              <View style={styles.sidebarMobile}>
                <View style={styles.mobileSidebarSearch}>
                  <Search size={18} color="#dcc093" />
                  <TextInput
                    style={styles.mobileSidebarSearchInput}
                    placeholder="Search venues or matches..."
                    placeholderTextColor="rgba(220, 192, 147, 0.5)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={() => {
                      if (searchQuery.trim().length >= 2) {
                        setMenuOpen(false);
                        router.push({
                          pathname: '/search',
                          params: { q: searchQuery.trim() }
                        } as any);
                      }
                    }}
                  />
                </View>
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
                          router.push('/cricket' as any);
                        }}
                      >
                        <Text style={styles.mobilePrimaryButtonText}>Cricket Hub</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.mobilePrimaryButton}
                        onPress={() => {
                          setMenuOpen(false);
                          router.push('/find-an-opponent' as any);
                        }}
                      >
                        <Text style={styles.mobilePrimaryButtonText}>Find Opponent</Text>
                      </TouchableOpacity>

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
                    <NavLink href="/(owner)/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavLink href="/(owner)/grounds" icon={MapPin} label="My grounds" />
                    <NavLink href="/cricket" icon={Swords} label="Cricket Hub" />
                    <NavLink href="/(tabs)/matches" icon={CalendarClock} label="My Matches" />
                    <NavLink href="/(owner)/bookings" icon={Calendar} label="Bookings" />
                    <NavLink href="/(owner)/inventory" icon={CalendarClock} label="Inventory Plan" />
                    <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
                    <NavLink href="/(owner)/earnings" icon={IndianRupee} label="Earnings" />
                    <NavLink href="/(owner)/add-ground" icon={PlusCircle} label="Add ground" />
                    <NavLink href="/(owner)/settings" icon={Settings} label="Settings" />
                    <NavLink href="/(tabs)/support" icon={LifeBuoy} label="Contact Us" />

                    <View style={styles.sidebarDivider} />
                    <TouchableOpacity
                      style={[styles.signOutButton, isCompact && styles.signOutButtonMobile]}
                      onPress={async () => {
                        await handleSignOut();
                        setMenuOpen(false);
                      }}
                    >
                      <LogOut size={18} color={isCompact ? '#dcc093' : '#E5E7EB'} />
                      <Text style={[styles.signOutText, isCompact && styles.signOutTextMobile]}>Sign out</Text>
                    </TouchableOpacity>
                  </>
                )}

                {showAdminMobileMenu && (
                  <>
                    <Text style={styles.sidebarTitle}>Super admin</Text>
                    <NavLink href="/(admin)/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavLink href="/(admin)/bookings" icon={Calendar} label="Bookings" />
                    <NavLink href="/(admin)/grounds" icon={MapPin} label="Grounds" />
                    <NavLink href="/(admin)/inventory" icon={CalendarClock} label="Inventory" />
                    <NavLink href="/(admin)/earnings" icon={IndianRupee} label="Earnings" />
                    <NavLink href="/(admin)/withdrawals" icon={Wallet2} label="Withdraw" />
                    <NavLink
                      href="/(admin)/manage-ground-owners"
                      icon={Shield}
                      label="Ground owners"
                    />
                    <NavLink href="/(admin)/manage-users" icon={User} label="Users" />
                    <NavLink href="/(admin)/messages" icon={LifeBuoy} label="Support Tickets" />
                    <NavLink href="/(admin)/settings" icon={Settings} label="Settings" />

                    <View style={styles.sidebarDivider} />
                    <TouchableOpacity
                      style={[styles.signOutButton, isCompact && styles.signOutButtonMobile]}
                      onPress={async () => {
                        await handleSignOut();
                        setMenuOpen(false);
                      }}
                    >
                      <LogOut size={18} color={isCompact ? '#dcc093' : '#E5E7EB'} />
                      <Text style={[styles.signOutText, isCompact && styles.signOutTextMobile]}>Sign out</Text>
                    </TouchableOpacity>
                  </>
                )}

                {showUserMobileMenu && (
                  <>
                    <Text style={styles.sidebarTitle}>My Account</Text>
                    <NavLink href="/(tabs)/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavLink href="/cricket" icon={Swords} label="Cricket Hub" />
                    <NavLink href="/(tabs)/matches" icon={CalendarClock} label="My Matches" />
                    <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
                    <NavLink href="/(tabs)/favorites" icon={Star} label="Favorites" />
                    <NavLink href="/(tabs)/profile" icon={User} label="Profile" />
                    <NavLink href="/(tabs)/support" icon={LifeBuoy} label="Contact Us" />

                    <View style={styles.sidebarDivider} />
                    <TouchableOpacity
                      style={[styles.signOutButton, styles.signOutButtonUser, isCompact && styles.signOutButtonMobile]}
                      onPress={async () => {
                        await handleSignOut();
                        setMenuOpen(false);
                      }}
                    >
                      <LogOut size={18} color={isCompact ? '#dcc093' : '#E5E7EB'} />
                      <Text style={[styles.signOutText, isCompact && styles.signOutTextMobile]}>Sign out</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}

        {showMenuPanel ? (
          <View 
            style={isAdminLayout ? styles.sidebarContainerAdmin : styles.sidebarContainer}
            {...(isAdminLayout ? {
              onMouseEnter: () => setSidebarCollapsed(false),
              onMouseLeave: () => setSidebarCollapsed(true)
            } : {})}
          >
            <View
              style={[
                styles.sidebar,
                isLanding && styles.sidebarHeaderOffset,
                isSuperAdmin && isAdminRoute && sidebarCollapsed && styles.sidebarCollapsed,
                isAdminRoute && { transition: 'width 0.3s ease-in-out' } as any,
              ]}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {isAuthenticated && !isPublicNoSidebar && (
                  <>
                    {isSuperAdmin && isAdminRoute ? (
                      <>
                        <View style={styles.sidebarHeaderRow}>
                          {!sidebarCollapsed && (
                            <Text style={styles.sidebarSectionTitle}>Super admin</Text>
                          )}
                          <TouchableOpacity
                            style={styles.collapseButton}
                            onPress={() => setSidebarCollapsed((prev) => !prev)}
                          >
                            {sidebarCollapsed ? (
                              <ChevronRight size={18} color="#9CA3AF" />
                            ) : (
                              <ChevronLeft size={18} color="#9CA3AF" />
                            )}
                          </TouchableOpacity>
                        </View>
                        <NavLink
                          href="/(admin)/dashboard"
                          icon={LayoutDashboard}
                          label="Dashboard"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/bookings"
                          icon={Calendar}
                          label="Bookings"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/grounds"
                          icon={MapPin}
                          label="Grounds"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/inventory"
                          icon={CalendarClock}
                          label="Inventory"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(tabs)/matches"
                          icon={CalendarClock}
                          label="My Matches"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/earnings"
                          icon={IndianRupee}
                          label="Earnings"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/withdrawals"
                          icon={Wallet2}
                          label="Withdraw"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/manage-ground-owners"
                          icon={Shield}
                          label="Ground owners"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/manage-users"
                          icon={User}
                          label="Users"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/messages"
                          icon={LifeBuoy}
                          label="Support Tickets"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/settings"
                          icon={Settings}
                          label="Settings"
                          hideLabel={sidebarCollapsed}
                        />

                        <View style={styles.sidebarDivider} />
                        <TouchableOpacity
                          style={[
                            styles.signOutButton,
                            styles.signOutButtonUser,
                            sidebarCollapsed && styles.signOutButtonCollapsed,
                          ]}
                          onPress={handleSignOut}
                        >
                          <LogOut size={18} color="#01b854" />
                          {!sidebarCollapsed && <Text style={styles.signOutText}>Sign out</Text>}
                        </TouchableOpacity>
                      </>
                    ) : isGroundOwner ? (
                      <>
                        <Text style={styles.sidebarSectionTitle}>Ground owner</Text>
                        <NavLink href="/(owner)/dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavLink href="/(owner)/grounds" icon={MapPin} label="My grounds" />
                        <NavLink href="/(tabs)/matches" icon={CalendarClock} label="My Matches" />
                        <NavLink href="/(owner)/bookings" icon={Calendar} label="Bookings" />
                        <NavLink href="/(owner)/inventory" icon={CalendarClock} label="Inventory Plan" />
                        <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
                        <NavLink href="/(owner)/earnings" icon={IndianRupee} label="Earnings" />
                        <NavLink href="/(owner)/add-ground" icon={PlusCircle} label="Add ground" />
                        <NavLink href="/(owner)/settings" icon={Settings} label="Settings" />
                        <NavLink href="/(tabs)/support" icon={LifeBuoy} label="Contact Us" />

                        <View style={styles.sidebarDivider} />
                        <TouchableOpacity
                          style={styles.signOutButton}
                          onPress={handleSignOut}
                        >
                          <LogOut size={18} color="#01b854" />
                          <Text style={styles.signOutText}>Sign out</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.sidebarSectionTitle}>My Account</Text>
                        <NavLink
                          href="/(tabs)/dashboard"
                          icon={LayoutDashboard}
                          label="Dashboard"
                        />
                        <NavLink href="/(tabs)/matches" icon={CalendarClock} label="My Matches" />
                        <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
                        <NavLink href="/(tabs)/favorites" icon={Star} label="Favorites" />
                        <NavLink href="/(tabs)/profile" icon={User} label="Profile" />
                        <NavLink href="/(tabs)/support" icon={LifeBuoy} label="Contact Us" />

                        <View style={styles.sidebarDivider} />
                        <TouchableOpacity
                          style={styles.signOutButton}
                          onPress={handleSignOut}
                        >
                          <LogOut size={18} color="#01b854" />
                          <Text style={styles.signOutText}>Sign out</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        ) : null}

        <View style={[
          styles.main,
          !isPublicNoSidebar && !isCompact && !noCard && styles.mainAppCard
        ]}>
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
  containerLanding: {
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#043529',
    borderBottomWidth: 1,
    borderBottomColor: '#06392e',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1,
      },
    }),
  },
  ownerHeader: {
    backgroundColor: '#043529',
    borderBottomColor: '#06392e',
  },
  userHeader: {
    backgroundColor: '#043529',
    borderBottomColor: '#06392e',
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
    backgroundColor: '#043529',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  heroHeaderMarketing: {
    position: 'fixed' as any,
    backgroundColor: '#043529',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  heroHeaderScrolled: {
    position: 'fixed' as any,
    backgroundColor: '#06392e',
    borderBottomWidth: 1,
    borderBottomColor: '#043529',
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
  logoImage: {
    height: 40,
    width: 220,
    maxWidth: '100%' as any,
  },
  sidebarBrand: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  sidebarBrandText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
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
    minWidth: 260,
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06392e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    position: 'relative',
  },
  headerSearchIcon: {
    marginRight: 8,
  },
  headerSearchInput: {
    flex: 1,
    height: 40,
    color: '#f9fafb',
    fontSize: 13,
    fontFamily: 'Inter',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    }) as any,
  },
  searchDropdown: {
    position: 'absolute' as any,
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    zIndex: 5000,
    overflow: 'hidden',
    maxHeight: 450,
  },
  searchDropdownScroll: {
    paddingVertical: 8,
  },
  searchDropdownText: {
    fontSize: 14,
    color: '#6B7280',
    padding: 20,
    textAlign: 'center',
  },
  searchSection: {
    paddingBottom: 8,
  },
  searchSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    transition: 'background-color 0.2s',
  },
  searchItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchItemInfo: {
    flex: 1,
  },
  searchItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  searchItemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
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
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#01b854',
  },
  signOutButtonUser: {
    backgroundColor: 'transparent',
  },
  signOutButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  signOutText: {
    fontSize: 14,
    color: '#01b854',
    fontWeight: '700',
  },
  signOutTextMobile: {
    color: '#dcc093',
  },
  signOutButtonMobile: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(220,192,147,0.2)',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
    position: 'relative',
    paddingTop: 24, // Restored padding for Owners and Users
    paddingHorizontal: 24,
  },
  bodyAdmin: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
    paddingTop: 0, // Flush to top
  },
  bodyFull: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  sidebarContainer: {
    paddingRight: 16, // Added gap back for Owners and Users
  },
  sidebarContainerAdmin: {
    paddingRight: 0, // Keep it flush for Super Admin
  },
  sidebar: {
    width: 200,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 64, 
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 80px)' as any,
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      },
    }),
  },
  sidebarCollapsed: {
    width: 68,
    paddingHorizontal: 8,
  },
  sidebarMobile: {
    position: 'absolute' as any,
    top: 0,
    right: 0,
    left: 'auto' as any,
    width: 280,
    bottom: 0,
    backgroundColor: '#043529',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(220,192,147,0.15)',
    borderRightWidth: 0,
    padding: 24,
    paddingTop: 80,
    zIndex: 3000,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: -4, height: 0 },
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 2,
    transition: 'all 0.3s ease-in-out',
  },
  navLinkCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  navLinkActive: {
    backgroundColor: 'transparent',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  navLinkTextMobile: {
    color: '#dcc093',
  },
  navLinkTextActive: {
    color: '#043529',
    fontWeight: '700',
  },
  navLinkTextActiveMobile: {
    color: '#00ea6b',
    fontWeight: '700',
  },
  navLinkActiveMobile: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
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
    color: '#dcc093',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
    marginLeft: 12,
    opacity: 0.8,
  },
  main: {
    flex: 1,
    ...Platform.select({
      web: {
        minHeight: 'calc(100vh - 65px)' as any,
      },
    }),
  },
  mainAppCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderTopLeftRadius: 0, // Flush with sidebar/subbar
    borderBottomLeftRadius: 0,
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
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 4,
  },
  sidebarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(220,192,147,0.15)',
    marginVertical: 12,
  },
  headerPrimaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#10b981',
  },
  headerPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#dcc093',
    fontFamily: 'Inter',
    textTransform: 'uppercase' as any,
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
    fontWeight: '400',
    color: '#dcc093',
    fontFamily: 'Inter',
    textTransform: 'uppercase' as any,
  },
  mobilePrimaryButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#10b981',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,192,147,0.3)',
    width: '100%',
  },
  mobileSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#dcc093',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  mobileSidebarSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,192,147,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 24,
    gap: 10,
  },
  mobileSidebarSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#dcc093',
    fontFamily: 'Inter',
    outlineStyle: 'none' as any,
  },
});
