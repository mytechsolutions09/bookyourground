import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  TextInput as TextInput,
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { router, usePathname, useSegments, useLocalSearchParams } from 'expo-router';
import {
  Hop as Home, // still used for some public nav
  LayoutDashboard,
  Calendar,
  User,
  Building2,
  Shield,
  LogOut,
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
import { BlurView } from 'expo-blur';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { supabase } from '@/lib/supabase';
import { makeGroundPath } from '@/utils/groundSlug';
import { formatCurrency } from '@/utils/helpers';

interface WebLayoutProps {
  children: React.ReactNode;
  noCard?: boolean;
  hideHeader?: boolean;
  viewMode?: 'products' | 'categories';
  showAddForm?: boolean;
  isPublicNoSidebar?: boolean;
}

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
  const pathname = usePathname();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
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

      }}
      {...(Platform.OS === 'web' ? {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        title: hideLabel ? label : undefined,
      } : {})}
    >
      <Icon size={18} color={iconColor} />
      {!isCompact && hideLabel && Platform.OS === 'web' && (
        <View style={[styles.tooltip, { opacity: hovered ? 1 : 0 }]}>
          <Text style={styles.tooltipText}>{label}</Text>
        </View>
      )}
      {(!hideLabel || isCompact) && (
        <Text
          numberOfLines={1}
          style={[
            styles.navLinkText,
            isCompact && styles.navLinkTextMobile,
            isActive && styles.navLinkTextActive,
            !isCompact && { transition: 'all 0.3s ease-in-out' } as any,
          ]}
        >
          {label}
        </Text>
      )}
      {badge !== undefined && !hideLabel && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {meta !== undefined && !hideLabel && (
        <Text style={styles.navLinkMeta}>{meta}</Text>
      )}
    </TouchableOpacity>
  );
};

export default function WebLayout({ children, noCard, hideHeader, viewMode, showAddForm, isPublicNoSidebar: propIsPublicNoSidebar }: WebLayoutProps) {
  const { profile, signOut, user } = useAuth();
  const pathname = usePathname();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<{ grounds: any[], matches: any[] }>({ grounds: [], matches: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [signOutHovered, setSignOutHovered] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { isTabBarVisible } = useUI();
  const [isBottomBarVisible, setIsBottomBarVisible] = useState(true);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const isCompact = useMemo(() => width < 900, [width]);
  const isInTabs = useMemo(() => segments.includes('(tabs)'), [segments]);
  const groundsHref = isCompact ? '/grounds' : '/book-my-ground';
  const cleanPath = (pathname || '').split('?')[0];
  const isLanding = cleanPath === '/' || cleanPath === '';
  const isMarketing = (cleanPath === '/book-my-ground' || cleanPath === '/find-an-opponent' || cleanPath === '/grounds' || cleanPath === '/(tabs)/grounds') && !segments.includes('(admin)');
  const isShop = cleanPath === '/shop' || cleanPath.startsWith('/shop/');
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
  
  const lastScrollPosRef = useRef(0);
  const searchInputRef = React.useRef<TextInput>(null);

  useEffect(() => {
    async function fetchSidebarData() {
      if (!user?.id) return;
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .gte('booking_date', today);
        if (bookingsData) setBookings(bookingsData);

        // Fetch Favorites Count (Venues + Shop Products)
        const [favsRes, shopFavsRes] = await Promise.all([
          supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('shop_favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        ]);

        const totalFavs = (favsRes.count || 0) + (shopFavsRes.count || 0);
        setFavoritesCount(totalFavs);

        // Fetch Wallet Balance
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        if (walletData) setWalletBalance(walletData.balance);
      } catch (err) {
        console.error('Sidebar fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSidebarData();
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Notifications fetch error:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      fetchNotifications();
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

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

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);

      // Only update bottom bar visibility from window scroll if we're NOT on a landing/marketing page
      // (because those pages handle their own scroll events via mainScroll listener)
      if (!isLanding && !isMarketing && !isShop) {
        if (Math.abs(y - lastScrollPosRef.current) > 5) {
          if (y > lastScrollPosRef.current && y > 50) {
            setIsBottomBarVisible(false);
            setIsNavbarVisible(false);
          } else if (y < lastScrollPosRef.current - 5 || y < 20) {
            setIsBottomBarVisible(true);
            setIsNavbarVisible(true);
          }
          lastScrollPosRef.current = y;
        }
      }
    };

    const sub = DeviceEventEmitter.addListener('mainScroll', (data) => {
      setScrolled(data.y > 50);
      const y = data.y;
      if (Math.abs(y - lastScrollPosRef.current) > 10) {
        if (y > lastScrollPosRef.current && y > 100) {
          setIsBottomBarVisible(false);
          setIsNavbarVisible(false);
        } else if (y < lastScrollPosRef.current || y < 50) {
          setIsBottomBarVisible(true);
          setIsNavbarVisible(true);
        }
        lastScrollPosRef.current = y;
      }
    });

    if (Platform.OS === 'web') {
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (Platform.OS === 'web') {
        window.removeEventListener('scroll', handleScroll);
      }
      sub.remove();
    };
  }, [isLanding, isMarketing, isShop]);

  // We don't early return here to avoid hook sequence mismatch.
  // Instead, we check the condition inside the return statement.

  // Navbar search: fetch ground suggestions as user types on landing pages.

  // Navbar search: fetch ground suggestions as user types on landing pages.
  const adminPathnames = [
    '/dashboard',
    '/bookings',
    '/grounds',
    '/earnings',
    '/payouts',
    '/inventory',
    '/orders',
    '/(admin)/orders',
    '/products',
    '/(admin)/products',
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
    cleanPath === '/matches' ||
    cleanPath === '/find-an-opponent';
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
    propIsPublicNoSidebar || isLanding || (isMarketing && !isSuperAdmin && !isOwnerGroundsDashboard) || isGroundInfoPage || isBookingDetails || isCheckoutPage || isLegalOrInfoPage || (cleanPath === '/find-an-opponent' && !isSuperAdmin) || cleanPath === '/(tabs)/grounds' || cleanPath === '/shop' || cleanPath.startsWith('/shop/') || cleanPath === '/search' || cleanPath.startsWith('/live/') || (cleanPath.startsWith('/cricket/') && !cleanPath.startsWith('/cricketdata'));
  // Treat the presence of a Supabase `user` as authenticated even if `profile`
  // hasn't loaded yet (prevents briefly showing "Sign In").
  const isAuthenticated = !!user || !!profile || isSuperAdmin;
  const showMenuPanel = !isPublicNoSidebar && isAuthenticated && !isCompact;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const isAdminLayout = isSuperAdmin && isAdminRoute;
  const bodyStyle = (isPublicNoSidebar || isCompact) ? styles.bodyFull : isAdminLayout ? styles.bodyAdmin : styles.body;
  // Ground/booking detail pretty URLs must always get the top bar (logo, search, Grounds, Sign in).
  // Do not exclude super admins here — otherwise neither hero nor the app header renders on /ground/... .
  const showHeroHeader =
    isLanding ||
    isMarketing ||
    (isGroundDetails && !isOwnerGroundsDashboard);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View
      style={[
        styles.container,
        (isLanding || isMarketing) && styles.containerLanding,
      ]}
    >
      {!hideHeader && showHeroHeader && !(isCheckoutPage && isCompact) && (
        <View
          style={[
            styles.heroHeader,
            isGroundDetails && styles.heroHeaderGround,
            isMarketing && styles.heroHeaderMarketing,
            isCompact && !isNavbarVisible && { transform: [{ translateY: -100 }] },
            isCompact && { transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' } as any,
          ]}
        >
          <View
            style={[
              StyleSheet.absoluteFillObject,
              Platform.OS === 'web' && {
                backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                backdropFilter: scrolled ? 'blur(40px) saturate(180%)' : 'none',
                WebkitBackdropFilter: scrolled ? 'blur(40px) saturate(180%)' : 'none',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                borderBottomWidth: 0,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: scrolled ? 0.08 : 0,
                shadowRadius: 30,
                zIndex: -1,
              } as any
            ]}
          />
          <View style={[styles.headerContent, isCompact && styles.headerContentCompact]}>
            <TouchableOpacity
              onPress={() => router.replace('/')}
              style={styles.logo}
              accessibilityRole="link"
              accessibilityLabel="Book my ground — home"
            >
              <Image
                source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
                style={[
                  styles.logoImage,
                  isCompact && styles.logoImageCompact,
                ]}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              <>
                {!isCompact ? (
                  <>
                    {!((cleanPath === '/book-my-ground' || cleanPath === '/find-an-opponent')) && (
                      <View style={styles.headerSearchContainer}>
                        {!isSearchExpanded ? (
                          <TouchableOpacity
                            onPress={() => {
                              setIsSearchExpanded(true);
                              setTimeout(() => searchInputRef.current?.focus(), 50);
                            }}
                            style={[styles.searchIconButton, scrolled && styles.searchIconButtonScrolled]}
                          >
                            <Search size={18} color="#dcc093" />
                          </TouchableOpacity>
                        ) : (
                          <View style={[
                            styles.headerSearch,
                            { width: 300 },
                            scrolled && { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.2)' } as any
                          ]}>
                            <Search size={16} color="#dcc093" style={styles.headerSearchIcon} />
                            <TextInput
                              ref={searchInputRef}
                              placeholder="Search city or venue..."
                              placeholderTextColor="rgba(220, 192, 147, 0.6)"
                              value={searchQuery}
                              onChangeText={setSearchQuery}
                              onFocus={() => setSearchFocused(true)}
                              onBlur={() => {
                                setTimeout(() => {
                                  setSearchFocused(false);
                                  if (!searchQuery) setIsSearchExpanded(false);
                                }, 200);
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
                                scrolled && { color: '#dcc093' } as any,
                                searchFocused && { borderColor: 'rgba(0,234,107,0.3)' } as any,
                              ]}
                            />
                          </View>
                        )}
                      </View>
                    )}

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

                    {!((cleanPath === '/book-my-ground' || cleanPath === '/find-an-opponent')) && (
                      <>
                        <Text
                          style={[styles.headerPrimaryButtonText, scrolled && styles.headerPrimaryButtonTextScrolled]}
                          onPress={() => router.push('/cricket/player-profile' as any)}
                        >
                          CRICKET
                        </Text>

                        <Text
                          style={[
                            styles.headerPrimaryButtonText,
                            scrolled && styles.headerPrimaryButtonTextScrolled,
                            { color: '#dcc093' }
                          ]}
                          onPress={() => router.push('/shop' as any)}
                        >
                          SHOP
                        </Text>
                      </>
                    )}

                    {cleanPath === '/book-my-ground' && (
                      <Text
                        style={[styles.headerPrimaryButtonText, scrolled && styles.headerPrimaryButtonTextScrolled]}
                        onPress={() => router.push('/find-an-opponent')}
                      >
                        FIND AN OPPOSITION
                      </Text>
                    )}





                    {!isAuthenticated ? (
                      <Text
                        style={[styles.headerSecondaryButtonText, scrolled && styles.headerSecondaryButtonTextScrolled]}
                        onPress={() => router.push('/(auth)/login' as any)}
                      >
                        SIGN IN
                      </Text>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>


                        <TouchableOpacity
                          style={styles.profileChip}
                          onPress={() => router.push('/profile')}
                        >
                          <Image
                            source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
                            style={styles.profileAvatar}
                          />
                          {!((cleanPath === '/book-my-ground' || cleanPath === '/find-an-opponent')) && (
                            <Text style={[styles.profileName, scrolled && styles.profileNameScrolled]}>
                              {profile?.full_name?.split(' ')[0] || 'User'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {!isAuthenticated ? (
                      <TouchableOpacity
                        onPress={() => router.push('/(auth)/login' as any)}
                        style={[styles.headerSecondaryButton, { paddingHorizontal: 12, paddingVertical: 6 }]}
                      >
                        <Text style={[styles.headerSecondaryButtonText, { fontSize: 13 }]}>SIGN IN</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.profileChipCompact}
                        onPress={() => router.push('/profile')}
                      >
                        <Image
                          source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
                          style={styles.profileAvatarCompact}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            </View>
          </View>
        </View>
      )}

      {!hideHeader && !isLanding && !isMarketing && (!isGroundDetails || isOwnerGroundsDashboard) && !(isCheckoutPage && isCompact) && (
        <View
          style={[
            styles.header,
            isShop && { backgroundColor: '#1a1f2e', borderBottomWidth: 0 },
            isGroundOwner && !isPublicNoSidebar && styles.ownerHeader,
            isUserRoute && !isPublicNoSidebar && styles.userHeader,
            isCompact && !isNavbarVisible && { transform: [{ translateY: -100 }] },
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
                style={[
                  styles.logoImage,
                  isCompact && styles.logoImageCompact,
                ]}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </TouchableOpacity>

            {(cleanPath.includes('/products') || cleanPath.includes('/orders')) && !isCompact && isSuperAdmin && (
              <View style={{ flexDirection: 'row', gap: 24, marginLeft: 32, alignItems: 'center' }}>
                <Text
                  style={[styles.headerNavLink, cleanPath.includes('/orders') && styles.headerNavLinkActive]}
                  onPress={() => router.push('/(admin)/orders')}
                >
                  SHOP ORDERS
                </Text>
                <Text
                  style={[styles.headerNavLink, viewMode === 'products' && !showAddForm && styles.headerNavLinkActive]}
                  onPress={() => {
                    if (!cleanPath.includes('/products')) {
                      router.push('/(admin)/products');
                    }
                    if (Platform.OS === 'web') {
                      window.dispatchEvent(new CustomEvent('setShopView', { detail: 'products' }));
                    } else if (DeviceEventEmitter) {
                      DeviceEventEmitter.emit('setShopView', 'products');
                    }
                  }}
                >
                  PRODUCTS
                </Text>
                <Text
                  style={[styles.headerNavLink, viewMode === 'categories' && styles.headerNavLinkActive]}
                  onPress={() => {
                    if (!cleanPath.includes('/products')) {
                      router.push('/(admin)/products');
                    }
                    if (Platform.OS === 'web') {
                      window.dispatchEvent(new CustomEvent('setShopView', { detail: 'categories' }));
                    } else if (DeviceEventEmitter) {
                      DeviceEventEmitter.emit('setShopView', 'categories');
                    }
                  }}
                >
                  CATEGORIES
                </Text>
                <Text
                  style={[styles.headerNavLink, showAddForm && styles.headerNavLinkActive]}
                  onPress={() => {
                    if (!cleanPath.includes('/products')) {
                      router.push('/(admin)/products');
                    }
                    if (Platform.OS === 'web') {
                      window.dispatchEvent(new Event('openAddProduct'));
                    } else if (DeviceEventEmitter) {
                      DeviceEventEmitter.emit('openAddProduct');
                    }
                  }}
                >
                  ADD PRODUCT
                </Text>
              </View>
            )}

            <View style={styles.headerRight}>
              {!isCompact && !isAdminLayout && (
                <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>

                  <Text
                    style={[
                      styles.headerNavLink,
                      (cleanPath === '/shop' || isShop) ? { color: '#f8688a', borderBottomWidth: 2, borderBottomColor: '#f8688a', paddingBottom: 4, fontWeight: '700' } : { color: '#FFFFFF' }
                    ]}
                    onPress={() => router.push('/shop' as any)}
                  >
                    SHOP
                  </Text>


                  {!isAuthenticated ? (
                    <Text
                      style={styles.headerSecondaryButtonText}
                      onPress={() => router.push('/(auth)/login' as any)}
                    >
                      SIGN IN
                    </Text>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={styles.userProfilePill}
                        onPress={() => router.push('/(tabs)/profile' as any)}
                      >
                        <Image
                          source={
                            profile?.avatar_url
                              ? { uri: profile.avatar_url }
                              : require('@/assets/images/default-avatar.jpg')
                          }
                          style={styles.userAvatar}
                        />
                      </TouchableOpacity>



                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      )}


      <View style={bodyStyle}>
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
                showsHorizontalScrollIndicator={false}
                overScrollMode="never"
                bounces={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                style={Platform.OS === 'web' ? { overflow: 'visible' } : undefined}
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
                          href="/(admin)/cricketdata"
                          icon={Swords}
                          label="Cricket Hub"
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
                          href="/(admin)/products"
                          icon={ShoppingBag}
                          label="Products"
                          hideLabel={sidebarCollapsed}
                        />

                        <NavLink
                          href="/(admin)/earnings"
                          icon={IndianRupee}
                          label="Earnings"
                          hideLabel={sidebarCollapsed}
                        />
                        <NavLink
                          href="/(admin)/payouts"
                          icon={Wallet2}
                          label="Payouts"
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
                            title: sidebarCollapsed ? 'Sign out' : undefined,
                          } : {})}
                        >
                          <LogOut size={18} color="#01b854" />
                          {!sidebarCollapsed && <Text style={styles.signOutText}>Sign out</Text>}
                          {sidebarCollapsed && Platform.OS === 'web' && (
                            <View style={[styles.tooltip, { opacity: signOutHovered ? 1 : 0 }]}>
                              <Text style={styles.tooltipText}>Sign out</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </>
                    ) : isGroundOwner ? (
                      <>
                        <Text style={styles.sidebarSectionTitle}>Ground owner</Text>
                        <NavLink href="/(owner)/owner-dashboard" icon={LayoutDashboard} label="Dashboard" />
                        <NavLink href="/(owner)/manage-grounds" icon={MapPin} label="My grounds" />
                        <NavLink href="/(owner)/inventory" icon={Package} label="Inventory" />
                        <NavLink href="/wallet" icon={Wallet} label="Wallet" />

                        <NavLink href="/(owner)/ground-bookings" icon={ClipboardList} label="Bookings" />
                        <NavLink href="/profile/orders" icon={ShoppingBag} label="My Orders" />
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
                          <Text style={styles.signOutText}>Sign out</Text>
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
                          icon={Calendar}
                          label="My Bookings"
                          isActiveOverride={cleanPath === '/(tabs)/bookings' || cleanPath === '/bookings'}
                        />

                        <NavLink
                          href="/profile/orders"
                          icon={ShoppingBag}
                          label="Shop Orders"
                          isActiveOverride={cleanPath === '/profile/orders'}
                        />

                        <NavLink
                          href="/(tabs)/profile"
                          icon={CircleUser}
                          label="My Profile"
                          isActiveOverride={cleanPath === '/(tabs)/profile' || cleanPath === '/profile'}
                        />

                        <NavLink
                          href="/favorites"
                          icon={Heart}
                          label="Favorites"
                          badge={loading ? undefined : favoritesCount}
                          isActiveOverride={cleanPath === '/favorites'}
                        />
                        <NavLink
                          href="/wallet"
                          icon={Wallet}
                          label="Wallet"
                          meta={walletBalance !== null ? formatCurrency(walletBalance) : undefined}
                          isActiveOverride={cleanPath === '/wallet'}
                        />
                        <NavLink
                          href="/cricket/player-profile"
                          icon={Trophy}
                          label="Cricket Hub"
                          isActiveOverride={cleanPath === '/cricket/player-profile'}
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
          (isLanding || isMarketing || isPublicNoSidebar) && { 
            padding: 0,
            maxHeight: 'none',
            overflow: 'visible',
            flex: 1
          },
          !isPublicNoSidebar && !isCompact && !noCard && styles.mainAppCard
        ]}>
          {children}
        </View>
      </View>

      {isCompact && !isInTabs && !isCheckoutPage && (
        <View style={[
          styles.bottomBar,
          (!isBottomBarVisible || !isTabBarVisible) && { 
            transform: [{ translateY: 100 }],
            opacity: 0
          }
        ]}>
          {[
            { label: 'Home', icon: House, href: '/' },
            { label: 'Grounds', icon: LandPlot, href: '/book-my-ground' },
            { label: 'Opposition', icon: Swords, href: '/find-an-opponent' },
            { label: 'Shop', icon: ShoppingBag, href: '/shop' },
            { label: 'Cricket', icon: Trophy, href: '/cricket/player-profile' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = cleanPath === item.href ||
              (item.label === 'Cricket' && cleanPath.startsWith('/cricket')) ||
              (item.label === 'Shop' && cleanPath.startsWith('/shop')) ||
              (item.label === 'Opposition' && cleanPath.startsWith('/find-an-opponent')) ||
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
                <Icon size={22} color={isActive ? (item.label === 'Shop' ? '#f8688a' : '#00ea6b') : '#9ca3af'} />
                <Text style={[
                  styles.bottomBarText,
                  isActive && (item.label === 'Shop' ? { color: '#f8688a', fontWeight: '700' } : styles.bottomBarTextActive)
                ]}>
                  {item.label}
                </Text>
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
    ...Platform.select({
      web: {
        overflow: 'hidden' as any,
        height: '100vh' as any,
      }
    })
  },
  containerLanding: {
    backgroundColor: '#F5F5F5',
  },
  header: {
    height: 84,
    backgroundColor: '#043529',
    justifyContent: 'center',
    zIndex: 100,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
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
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    height: 84,
    zIndex: 2000,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    justifyContent: 'center',
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  heroHeaderGround: {
    position: 'fixed' as any,
    backgroundColor: '#043529',
    borderBottomWidth: 0,
  },
  heroHeaderMarketing: {
    position: 'fixed' as any,
    backgroundColor: '#043529',
    borderBottomWidth: 0,
  },
  heroHeaderScrolled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1400,
    marginHorizontal: 'auto',
    paddingHorizontal: 24,
    paddingVertical: 12,
    width: '100%',
  },
  headerContentCompact: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginHorizontal: 0,
    width: '100%',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    height: 52,
    width: 180,
  },
  logoImageCompact: {
    height: 40,
    width: 140,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
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
  signOutButtonMobile: {
    backgroundColor: 'transparent',
  },
  signOutText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  signOutTextMobile: {
    color: '#dcc093',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
    paddingTop: 0,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        overflow: 'hidden' as any,
        scrollbarWidth: 'none' as any,
        msOverflowStyle: 'none' as any,
      }
    })
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
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        overflow: 'hidden' as any,
        scrollbarWidth: 'none' as any,
        msOverflowStyle: 'none' as any,
      }
    })
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
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        alignSelf: 'flex-start',
        height: '100vh' as any,
        minHeight: '100vh' as any,
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'visible',
        scrollbarWidth: 'none' as any,
        msOverflowStyle: 'none' as any,
        zIndex: 2000,
      },
      default: {
        height: '100%',
      }
    }),
  },
  sidebarCollapsed: {
    width: 72,
    paddingHorizontal: 8,
    overflow: 'visible',
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
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 12,
    flex: 1,
  },
  navLinkTextMobile: {
    fontSize: 12,
    marginLeft: 8,
  },
  navLinkTextActive: {
    color: '#00ea6b',
    fontWeight: '500',
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
    paddingTop: 20,
    paddingRight: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        maxHeight: 'calc(100vh - 72px)' as any,
        overflow: 'hidden' as any,
        scrollbarWidth: 'none' as any,
        msOverflowStyle: 'none' as any,
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
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    left: 72,
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 4 },
    ...Platform.select({
      web: {
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        transition: 'opacity 0.2s ease-in-out',
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
    fontWeight: '500',
    color: '#dcc093',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
  },
  headerPrimaryButtonTextScrolled: {
    color: '#dcc093',
  },
  headerSecondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220,192,147,0.4)',
  },
  headerSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dcc093',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
  },
  headerSecondaryButtonTextScrolled: {
    color: '#dcc093',
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 4,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profileAvatarCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileChipCompact: {
    padding: 2,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dcc093',
    fontFamily: 'Inter',
  },
  profileNameScrolled: {
    color: '#dcc093',
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
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
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
    padding: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  notificationsDropdown: {
    position: 'absolute' as any,
    top: 70,
    right: 20,
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  markReadText: {
    fontSize: 12,
    color: '#00ea6b',
    fontWeight: '600',
  },
  notificationsList: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    alignItems: 'flex-start',
  },
  notificationUnread: {
    backgroundColor: 'rgba(0,234,107,0.03)',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  notificationBodyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  notificationTimeText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ea6b',
    marginTop: 6,
  },
  emptyNotifications: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyNotificationsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
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
    height: 72,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingBottom: Platform.OS === 'web' ? 0 : 20,
    zIndex: 10000,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        bottom: 0,
        left: 0,
        right: 0,
        transition: 'transform 0.3s ease-in-out, bottom 0.3s ease-in-out, opacity 0.3s ease-in-out',
      }
    }),
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
