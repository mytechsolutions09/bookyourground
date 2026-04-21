import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text as RNText,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  TextInput as RNTextInput,
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
  Package,
  Users,
  House,
  LandPlot,
  Trophy,
  CalendarCheck2,
  Heart,
  CircleUser,
  ClipboardList,
  Phone,
  ShoppingBag,
  Wallet,
  MessageSquare,
  Bell,
  Sun,
  Info,
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
  const [signOutHovered, setSignOutHovered] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSidebarData() {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id);
        if (data) setBookings(data);
      } catch (err) {
        console.error('Sidebar fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSidebarData();
  }, [user?.id]);

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
  const cleanPath = (pathname || '').split('?')[0];
  const isLanding = cleanPath === '/' || cleanPath === '';
  const isMarketing = cleanPath === '/book-my-ground' || cleanPath === '/find-an-opponent';
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
    cleanPath === '/cricket/player-profile';
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
    '/cricketdata',
    '/(admin)/cricketdata',
  ];
  const isAdminRoute =
    adminPathnames.includes(cleanPath) ||
    cleanPath.startsWith('/cricketdata') ||
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
    (cleanPath.includes('/dashboard') ||
      cleanPath.includes('/bookings') ||
      cleanPath.includes('/profile'));

  // On ground info (/grounds/[id]) and booking info (/bookings/[id]) pages,
  // hide the left sidebar for all roles so the content can take full width.
  const isPublicNoSidebar =
    isLanding || isMarketing || isGroundInfoPage || isBookingDetails || isCheckoutPage || isLegalOrInfoPage || (cleanPath === '/find-an-opponent' && !isSuperAdmin) || cleanPath === '/(tabs)/grounds' || cleanPath === '/shop' || cleanPath.startsWith('/shop/') || cleanPath === '/search' || cleanPath.startsWith('/live/') || (cleanPath.startsWith('/cricket/') && !cleanPath.startsWith('/cricketdata'));
  // Treat the presence of a Supabase `user` as authenticated even if `profile`
  // hasn't loaded yet (prevents briefly showing "Sign In").
  const isAuthenticated = !!user || !!profile || isSuperAdmin;
  // App pages: sidebar as before. Public routes (/, book-my-ground): burger opens a small drawer
  // (Sign In / Sign Up when logged out; Profile when logged in).
  const showMenuPanel = !isPublicNoSidebar && isAuthenticated && !isCompact;
  const showLandingMobileMenu = false; // Disabled globally on mobile web in favor of bottom bar
  const showOwnerMobileMenu = false;
  const showAdminMobileMenu = false;
  const showUserMobileMenu = false;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const NavLink = ({
    href,
    icon: Icon,
    label,
    hideLabel = false,
    badge,
    meta,
    isActiveOverride,
  }: {
    href: string;
    icon: any;
    label: string;
    hideLabel?: boolean;
    badge?: number | string;
    meta?: string;
    isActiveOverride?: boolean;
  }) => {
    const [hovered, setHovered] = useState(false);
    const normalize = (value: string) => {
      if (value.length > 1 && value.endsWith('/')) {
        return value.slice(0, -1);
      }
      return value;
    };

    const clean = (p: string) => p.replace(/\/\([^)]+\)/g, '');
    const currentPath = clean(normalize(pathname || ''));
    const targetHref = clean(normalize(href));

    const hrefSegments = href.split('/').filter(Boolean);
    const isActive = isActiveOverride ?? (
      hrefSegments.length > 0
        ? hrefSegments.length === segments.length &&
        hrefSegments.every((seg, i) => segments[i] === seg)
        : currentPath === targetHref
    );
    const iconColor = isActive ? '#00ea6b' : 'rgba(255,255,255,0.7)';
    const activeStyle = styles.navLinkActive;

    return (
      <TouchableOpacity
        style={[
          styles.navLink,
          isActive && activeStyle,
          hideLabel && styles.navLinkCollapsed,
          hideLabel && { gap: 0 },
        ]}
        onPress={() => {
          if (href === '/' || href === '') {
            router.replace('/' as any);
          } else {
            router.push(href as any);
          }
          setMenuOpen(false);
        }}
        {...(Platform.OS === 'web' ? {
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } : {})}
      >
        <Icon size={18} color={iconColor} />
        {!isCompact && hideLabel && hovered && Platform.OS === 'web' && (
          <View style={styles.tooltip}>
            <RNText style={styles.tooltipText}>{label}</RNText>
          </View>
        )}
        {(!hideLabel || isCompact) && (
          <RNText
            numberOfLines={1}
            style={[
              styles.navLinkText,
              isCompact && styles.navLinkTextMobile,
              isActive && styles.navLinkTextActive,
              !isCompact && { transition: 'all 0.3s ease-in-out' } as any,
            ]}
          >
            {label}
          </RNText>
        )}
        {badge !== undefined && !hideLabel && (
          <View style={styles.badge}>
            <RNText style={styles.badgeText}>{badge}</RNText>
          </View>
        )}
        {meta !== undefined && !hideLabel && (
          <RNText style={styles.navLinkMeta}>{meta}</RNText>
        )}
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
          <View style={[styles.headerContent, isCompact && styles.headerContentCompact]}>
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
                      <RNTextInput
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
                            <RNText style={styles.searchDropdownText}>Searching...</RNText>
                          ) : (searchResults.grounds.length === 0 && searchResults.matches.length === 0) ? (
                            <RNText style={styles.searchDropdownText}>No results found for "{searchQuery}"</RNText>
                          ) : (
                            <ScrollView style={styles.searchDropdownScroll} keyboardShouldPersistTaps="handled">
                              {searchResults.grounds.length > 0 && (
                                <View style={styles.searchSection}>
                                  <RNText style={styles.searchSectionTitle}>VENUES</RNText>
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
                                        <RNText style={styles.searchItemName}>{g.name}</RNText>
                                        <RNText style={styles.searchItemMeta}>{g.city}, {g.state}</RNText>
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}

                              {searchResults.matches.length > 0 && (
                                <View style={styles.searchSection}>
                                  <RNText style={styles.searchSectionTitle}>AVAILABLE MATCHES</RNText>
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
                                        <RNText style={styles.searchItemName}>
                                          {m.user?.team_name || m.user?.full_name || 'Anonymous Match'}
                                        </RNText>
                                        <RNText style={styles.searchItemMeta}>
                                          {m.ground?.name} • {m.ground?.city}
                                        </RNText>
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

                  {!isCompact && (
                    <>
                      <RNText
                        style={styles.headerPrimaryButtonText}
                        onPress={() => router.push('/cricket/player-profile' as any)}
                      >
                        Cricket
                      </RNText>

                      {!isGroundOwner && (
                        <RNText
                          style={styles.headerPrimaryButtonText}
                          onPress={() => router.push('/shop' as any)}
                        >
                          Shop
                        </RNText>
                      )}


                      <RNText
                        style={styles.headerPrimaryButtonText}
                        onPress={() => router.push(groundsHref as any)}
                      >
                        Grounds
                      </RNText>

                      {!isAuthenticated ? (
                        <RNText
                          style={styles.headerSecondaryButtonText}
                          onPress={() => router.push('/(auth)/login' as any)}
                        >
                          Sign in
                        </RNText>
                      ) : (
                        <RNText
                          style={styles.headerSecondaryButtonText}
                          onPress={() => {
                            if (isSuperAdmin) {
                              router.push('/(admin)/dashboard' as any);
                            } else if (isGroundOwner) {
                              router.push('/(owner)/owner-dashboard' as any);
                            } else {
                              router.push('/(tabs)/dashboard' as any);
                            }
                          }}
                        >
                          Dashboard
                        </RNText>
                      )}
                    </>
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
          <View style={[styles.headerContent, isCompact && styles.headerContentCompact]}>
            <TouchableOpacity
              onPress={() => router.replace('/')}
              style={styles.logo}
              accessibilityRole="link"
              accessibilityLabel="Book My Ground — home"
            >
              <Image
                source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              {(!isCompact && !isAuthenticated && (isPublicNoSidebar || isMarketing)) ? (
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
                !isCompact && !isAdminLayout && (
                  <View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}>
                    <RNText
                      style={[styles.headerNavLink, (cleanPath === '/(tabs)/dashboard' || cleanPath === '/dashboard') && styles.headerNavLinkActive]}
                      onPress={() => router.push('/(tabs)/dashboard' as any)}
                    >
                      Dashboard
                    </RNText>
                    <RNText
                      style={[styles.headerNavLink, cleanPath === '/(tabs)/bookings' && styles.headerNavLinkActive]}
                      onPress={() => router.push('/(tabs)/bookings' as any)}
                    >
                      Bookings
                    </RNText>


                    {!isAuthenticated ? (
                      <RNText
                        style={styles.headerSecondaryButtonText}
                        onPress={() => router.push('/(auth)/login' as any)}
                      >
                        Sign in
                      </RNText>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                        <TouchableOpacity 
                          style={styles.userProfilePill}
                          onPress={() => router.push('/(tabs)/profile' as any)}
                        >
                          <Image 
                            source={{ uri: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' }} 
                            style={styles.userAvatar} 
                          />
                          <RNText style={styles.userName}>
                            {(() => {
                              const rawName = profile?.full_name?.split(' ')[0] || 'Alex';
                              return rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                            })()}
                          </RNText>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.notificationPill}>
                           <Bell size={20} color="#FFFFFF" />
                           <View style={styles.headerNotificationBadge}>
                             <RNText style={styles.headerBadgeText}>3</RNText>
                           </View>
                        </TouchableOpacity>


                      </View>
                    )}
                  </View>
                )
              )}
            </View>
          </View>
        </View>
      )}

      <View style={[bodyStyle, isCompact && isPublicNoSidebar && { paddingBottom: 72 }]}>
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
                <View style={styles.mobileSidebarSearch}>
                  <Search size={18} color="#6B7280" />
                  <RNTextInput
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
                      <RNText style={styles.sidebarTitle}>Get started</RNText>
                      <TouchableOpacity
                        style={styles.mobilePrimaryButton}
                        onPress={() => {
                          setMenuOpen(false);
                          router.push('/cricket/player-profile' as any);
                        }}
                      >
                        <RNText style={styles.mobilePrimaryButtonText}>Cricket Hub</RNText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.mobilePrimaryButton}
                        onPress={() => {
                          setMenuOpen(false);
                          router.push('/shop' as any);
                        }}
                      >
                        <RNText style={styles.mobilePrimaryButtonText}>Shop</RNText>
                      </TouchableOpacity>


                      <TouchableOpacity
                        style={styles.mobilePrimaryButton}
                        onPress={() => {
                          setMenuOpen(false);
                          router.push(groundsHref as any);
                        }}
                      >
                        <RNText style={styles.mobilePrimaryButtonText}>Grounds</RNText>
                      </TouchableOpacity>

                      {!isAuthenticated ? (
                        <TouchableOpacity
                          style={styles.mobileSecondaryButton}
                          onPress={() => {
                            setMenuOpen(false);
                            router.push('/(auth)/login' as any);
                          }}
                        >
                          <RNText style={styles.mobileSecondaryButtonText}>Sign in</RNText>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.mobileSecondaryButton}
                          onPress={() => {
                            setMenuOpen(false);
                            router.push('/(tabs)/profile' as any);
                          }}
                        >
                          <RNText style={styles.mobileSecondaryButtonText}>Profile</RNText>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                {showOwnerMobileMenu && (
                  <>
                    <RNText style={styles.sidebarTitle}>Ground owner</RNText>
                    <NavLink href="/(owner)/owner-dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavLink href="/(owner)/manage-grounds" icon={MapPin} label="My grounds" />
                    <NavLink href="/wallet" icon={Wallet} label="Wallet" />
                    <NavLink href="/cricket/player-profile" icon={Swords} label="Cricket Hub" />
                    <NavLink href="/(owner)/ground-bookings" icon={ClipboardList} label="Bookings" />
                    <NavLink href="/(owner)/inventory" icon={CalendarClock} label="Inventory" />
                    <NavLink href="/(tabs)/bookings" icon={Ticket} label="My Bookings" />
                    <NavLink href="/(owner)/earnings" icon={IndianRupee} label="Earnings" />
                    <NavLink href="/(owner)/add-ground" icon={PlusCircle} label="Add ground" />
                    <NavLink href="/(owner)/settings" icon={Settings} label="Settings" />
                    <NavLink href="/(tabs)/support" icon={Phone} label="Contact Us" />

                    <View style={styles.sidebarDivider} />
                    <TouchableOpacity
                      style={[styles.signOutButton, isCompact && styles.signOutButtonMobile]}
                      onPress={async () => {
                        await handleSignOut();
                        setMenuOpen(false);
                      }}
                    >
                      <LogOut size={18} color={isCompact ? '#dcc093' : '#E5E7EB'} />
                      <RNText style={[styles.signOutText, isCompact && styles.signOutTextMobile]}>Sign out</RNText>
                    </TouchableOpacity>
                  </>
                )}

                {showAdminMobileMenu && (
                  <>
                    <RNText style={styles.sidebarTitle}>Super admin</RNText>
                    <NavLink href="/(admin)/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavLink href="/shop" icon={ShoppingBag} label="Shop" />
                    <NavLink href="/(admin)/cricketdata" icon={Swords} label="Cricket Hub" />
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
                      <RNText style={[styles.signOutText, isCompact && styles.signOutTextMobile]}>Sign out</RNText>
                    </TouchableOpacity>
                  </>
                )}

                {showUserMobileMenu && (
                  <>
                    <RNText style={styles.sidebarTitle}>My Account</RNText>
                    <NavLink href="/(tabs)/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavLink href="/cricket/player-profile" icon={Swords} label="Cricket Hub" />
                    <NavLink href="/(tabs)/bookings" icon={Calendar} label="My Bookings" />
                    <NavLink href="/(tabs)/favorites" icon={Star} label="Favorites" />
                    <NavLink href="/(tabs)/profile" icon={User} label="Profile" />
                    <NavLink href="/(tabs)/support" icon={Phone} label="Contact Us" />

                    <View style={styles.sidebarDivider} />
                    <TouchableOpacity
                      style={[styles.signOutButton, styles.signOutButtonUser, isCompact && styles.signOutButtonMobile]}
                      onPress={async () => {
                        await handleSignOut();
                        setMenuOpen(false);
                      }}
                    >
                      <LogOut size={18} color={isCompact ? '#dcc093' : '#E5E7EB'} />
                      <RNText style={[styles.signOutText, isCompact && styles.signOutTextMobile]}>Sign out</RNText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </>
          )}

        {showMenuPanel ? (
          <View
            style={isAdminLayout ? styles.sidebarContainerAdmin : styles.sidebarContainer}
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
                            <RNText style={styles.sidebarSectionTitle}>Super admin</RNText>
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
                          href="/(admin)/cricketdata"
                          icon={Swords}
                          label="Cricket Hub"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/shop"
                          icon={ShoppingBag}
                          label="Shop"
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
                          icon={Building2}
                          label="Grounds"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/inventory"
                          icon={Package}
                          label="Inventory"
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
                          icon={Users}
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
                          {...(Platform.OS === 'web' ? {
                            onMouseEnter: () => setSignOutHovered(true),
                            onMouseLeave: () => setSignOutHovered(false),
                          } : {})}
                        >
                          <LogOut size={18} color="#01b854" />
                          {!sidebarCollapsed && <RNText style={styles.signOutText}>Sign out</RNText>}
                          {sidebarCollapsed && signOutHovered && Platform.OS === 'web' && (
                            <View style={styles.tooltip}>
                              <RNText style={styles.tooltipText}>Sign out</RNText>
                            </View>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : isGroundOwner ? (
                      <>
                        <RNText style={styles.sidebarSectionTitle}>Ground owner</RNText>
                        <NavLink href="/(owner)/owner-dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavLink href="/(owner)/manage-grounds" icon={MapPin} label="My grounds" />
                        <NavLink href="/wallet" icon={Wallet} label="Wallet" />

                        <NavLink href="/(owner)/ground-bookings" icon={ClipboardList} label="Bookings" />

                        <NavLink href="/(tabs)/bookings" icon={Ticket} label="My Bookings" />
                        <NavLink href="/(owner)/earnings" icon={IndianRupee} label="Earnings" />
                        <NavLink href="/(owner)/add-ground" icon={PlusCircle} label="Add ground" />
                        <NavLink href="/(owner)/settings" icon={Settings} label="Settings" />
                        <NavLink href="/(tabs)/support" icon={Phone} label="Contact Us" />

                        <View style={styles.sidebarDivider} />
                        <TouchableOpacity
                          style={styles.signOutButton}
                          onPress={handleSignOut}
                        >
                          <LogOut size={18} color="#01b854" />
                          <RNText style={styles.signOutText}>Sign out</RNText>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <NavLink
                          href="/(tabs)/dashboard"
                          icon={LayoutDashboard}
                          label="Dashboard"
                          isActiveOverride={cleanPath === '/(tabs)/dashboard' || cleanPath === '/dashboard'}
                        />

                        <NavLink 
                          href="/(tabs)/bookings" 
                          icon={ClipboardList} 
                          label="My Bookings" 
                          badge={loading ? undefined : bookings.length} 
                        />
                        <NavLink 
                          href="/favorites" 
                          icon={Heart} 
                          label="Favorites" 
                          badge={4}
                        />
                        <NavLink 
                          href="/wallet" 
                          icon={Wallet} 
                          label="Wallet" 
                          meta="₹2,840"
                        />
                        <NavLink 
                          href="/cricket/player-profile" 
                          icon={Trophy} 
                          label="Cricket Hub" 
                        />
                        <NavLink 
                          href="/(tabs)/support" 
                          icon={Info} 
                          label="Help" 
                        />

                        <View style={styles.sidebarDivider} />
                        <TouchableOpacity
                          style={styles.signOutButton}
                          onPress={handleSignOut}
                        >
                          <LogOut size={18} color="#00ea6b" />
                          <RNText style={styles.signOutText}>Sign out</RNText>
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
          (isLanding || isMarketing || isPublicNoSidebar) && { padding: 0 },
          !isPublicNoSidebar && !isCompact && !noCard && styles.mainAppCard
        ]}>
          {children}
        </View>
      </View>

      {isCompact && !segments.includes('(tabs)') && cleanPath !== '/grounds' && cleanPath !== '/shop' && (
        <View style={styles.bottomBar}>
          {[
            { label: 'Home', icon: House, href: '/' },
            { label: 'Grounds', icon: LandPlot, href: '/grounds' },
            { label: 'Shop', icon: ShoppingBag, href: '/shop' },
            { label: 'Cricket', icon: Trophy, href: '/cricket/player-profile' },
            { label: 'Profile', icon: CircleUser, href: '/(tabs)/profile' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = cleanPath === item.href ||
              (item.href === '/grounds' && cleanPath === '/book-my-ground') ||
              (item.href === '/favorites' && cleanPath === '/favorites') ||
              (item.href === '/' && cleanPath === '');
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.bottomBarItem}
                onPress={() => {
                  if (item.href === '/') {
                    router.replace('/' as any);
                  } else {
                    router.push(item.href as any);
                  }
                }}
              >
                <Icon size={22} color={isActive ? '#00ea6b' : '#9ca3af'} />
                <RNText style={[styles.bottomBarText, isActive && styles.bottomBarTextActive]}>
                  {item.label}
                </RNText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
    height: 72,
    backgroundColor: '#043529',
    justifyContent: 'center',
    zIndex: 100,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
      },
    }),
  },
  ownerHeader: {
    backgroundColor: '#043529',
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userHeader: {
    backgroundColor: '#043529',
    borderBottomColor: 'rgba(255,255,255,0.05)',
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
    paddingTop: 16,
    width: '100%',
  },
  headerContentCompact: {
    paddingTop: 8,
    paddingBottom: 2, // Smaller screen
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
    height: 38,
    width: 200,
    maxWidth: '100%' as any,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    height: 32,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    paddingVertical: 4,
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
  },
  searchItemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
    fontFamily: 'Inter',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  signOutButtonUser: {
    backgroundColor: 'transparent',
  },
  signOutButtonCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    gap: 0,
  },
  signOutText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  signOutTextMobile: {
    color: '#dcc093',
  },
  signOutButtonMobile: {
    backgroundColor: 'transparent',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
    paddingTop: 0,
    backgroundColor: '#F5F5F7',
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
    backgroundColor: '#F5F5F7',
  },
  sidebarContainer: {
    paddingRight: 0,
  },
  sidebarContainerAdmin: {
    paddingRight: 0, // Keep it flush for Super Admin
  },
  sidebar: {
    width: 240,
    backgroundColor: '#043529',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    height: '100%',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        alignSelf: 'flex-start',
        maxHeight: '100vh' as any,
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      },
    }),
  },
  sidebarCollapsed: {
    width: 68,
    paddingHorizontal: 8,
    overflow: 'visible',
  },
  sidebarMobile: {
    position: 'absolute' as any,
    top: 0,
    right: 0,
    left: 'auto' as any,
    width: 280,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
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
    backgroundColor: 'rgba(0,234,107,0.1)',
  },
  sidebarHeaderOffset: {
    // Keep sidebar content below the landing hero header (logo + burger).
    // Prevents visual overlap when hero header is absolute.
    paddingTop: 78,
  },
  navLinkText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 12,
    flex: 1,
  },
  navLinkTextActive: {
    color: '#00ea6b',
    fontWeight: '600',
  },
  burgerButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
    opacity: 0.8,
  },
  main: {
    flex: 1,
    padding: 20,
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
      },
    }),
  },
  mainAppCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 0,
    overflow: 'visible',
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
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
    fontFamily: 'Inter',
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
  tooltip: {
    position: 'absolute' as any,
    left: 54,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 0 },
    ...Platform.select({
      web: {
        pointerEvents: 'none',
      }
    }) as any,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap',
      }
    }) as any,
  },
  headerPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#dcc093',
    fontFamily: 'Inter',
    textTransform: 'uppercase' as any,
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
  headerNavLink: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter',
  },
  headerNavLinkActive: {
    color: '#00ea6b',
    borderBottomWidth: 2,
    borderBottomColor: '#00ea6b',
    paddingBottom: 4,
  },
  badge: {
    backgroundColor: '#00ea6b',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#043529',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  navLinkMeta: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 'auto',
    fontFamily: 'Inter',
  },
  userProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  notificationPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#043529',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  hostButton: {
    backgroundColor: '#00ea6b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  hostButtonText: {
    color: '#043529',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
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
    backgroundColor: '#F3F4F6',
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
    color: '#111827',
    fontFamily: 'Inter',
    outlineStyle: 'none' as any,
  },
  bottomBar: {
    position: 'fixed' as any,
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    zIndex: 3000,
    paddingHorizontal: 10,
    paddingBottom: 2,
  },
  bottomBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 8,
  },
  bottomBarText: {
    fontSize: 10,
    marginTop: 2,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  bottomBarTextActive: {
    color: '#00ea6b',
    fontWeight: '700',
  },
});
