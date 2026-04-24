import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
import { router, usePathname, useSegments } from 'expo-router';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { makeGroundPath } from '@/utils/groundSlug';
import { formatCurrency } from '@/utils/helpers';

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
  const adminPathnames = [
    '/dashboard',
    '/bookings',
    '/grounds',
    '/earnings',
    '/withdrawals',
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
  const showMenuPanel = !isPublicNoSidebar && isAuthenticated && !isCompact;

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

        }}
        {...(Platform.OS === 'web' ? {
          onMouseEnter: () => setHovered(true),
          onMouseLeave: () => setHovered(false),
        } : {})}
      >
        <Icon size={18} color={iconColor} />
        {!isCompact && hideLabel && hovered && Platform.OS === 'web' && (
          <View style={styles.tooltip}>
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

                  {!isCompact && (
                    <>
                      <Text
                        style={styles.headerPrimaryButtonText}
                        onPress={() => router.push('/cricket/player-profile' as any)}
                      >
                        Cricket
                      </Text>

                      <Text
                        style={styles.headerPrimaryButtonText}
                        onPress={() => router.push('/shop' as any)}
                      >
                        Shop
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
                        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>

                          <Text
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
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </>
            </View>
          </View>
        </View>
      )}

      {!isLanding && !isMarketing && (!isGroundDetails || isOwnerGroundsDashboard) && (
        <View
          style={[
            styles.header,
            isShop && { backgroundColor: '#4f2c63', borderBottomWidth: 0 },
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

            {(cleanPath.includes('/products') || cleanPath.includes('/orders')) && !isCompact && (
              <View style={{ flexDirection: 'row', gap: 24, marginLeft: 32, alignItems: 'center' }}>
                <Text 
                  style={styles.headerNavLink}
                  onPress={() => router.push('/(admin)/orders')}
                >
                  Shop Orders
                </Text>
                <Text 
                  style={styles.headerNavLink}
                  onPress={() => {
                    if (!cleanPath.includes('/products')) {
                      router.push('/(admin)/products');
                      // We'll give it a moment to mount then trigger if needed, 
                      // but usually a simple navigate to the right page is what's expected if not there.
                      // Alternatively, we can use a timeout or a query param.
                    } else {
                      if (Platform.OS === 'web') {
                        window.dispatchEvent(new Event('openAddProduct'));
                      } else if (DeviceEventEmitter) {
                        DeviceEventEmitter.emit('openAddProduct');
                      }
                    }
                  }}
                >
                  Add Product
                </Text>
              </View>
            )}

            <View style={styles.headerRight}>
              {!isCompact && !isAdminLayout && (
                <View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}>
                  <Text
                    style={[styles.headerNavLink, (cleanPath === '/(tabs)/dashboard' || cleanPath === '/dashboard') && styles.headerNavLinkActive]}
                    onPress={() => router.push('/(tabs)/dashboard' as any)}
                  >
                    Dashboard
                  </Text>
                  <Text
                    style={[styles.headerNavLink, cleanPath === '/(tabs)/bookings' && styles.headerNavLinkActive]}
                    onPress={() => router.push('/(tabs)/bookings' as any)}
                  >
                    Bookings
                  </Text>
                  <Text
                    style={[styles.headerNavLink, cleanPath === '/shop' && styles.headerNavLinkActive]}
                    onPress={() => router.push('/shop' as any)}
                  >
                    Shop
                  </Text>


                  {!isAuthenticated ? (
                    <Text
                      style={styles.headerSecondaryButtonText}
                      onPress={() => router.push('/(auth)/login' as any)}
                    >
                      Sign in
                    </Text>
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
                        <Text style={styles.userName}>
                          {(() => {
                            const rawName = profile?.full_name?.split(' ')[0] || 'Alex';
                            return rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
                          })()}
                        </Text>
                      </TouchableOpacity>



                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      )}


      <View style={[bodyStyle, isCompact && isPublicNoSidebar && { paddingBottom: 72 }]}>
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
                          {!sidebarCollapsed && <Text style={styles.signOutText}>Sign out</Text>}
                          {sidebarCollapsed && signOutHovered && Platform.OS === 'web' && (
                            <View style={styles.tooltip}>
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
                          icon={ClipboardList} 
                          label="My Bookings" 
                          badge={loading ? undefined : bookings.length} 
                        />
                        <NavLink 
                          href="/favorites" 
                          icon={Heart} 
                          label="Favorites" 
                          badge={loading ? undefined : favoritesCount}
                        />
                        <NavLink 
                          href="/wallet" 
                          icon={Wallet} 
                          label="Wallet" 
                          meta={walletBalance !== null ? formatCurrency(walletBalance) : undefined}
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
                <Text style={[styles.bottomBarText, isActive && styles.bottomBarTextActive]}>
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
    paddingVertical: 12,
    width: '100%',
  },
  headerContentCompact: {
    paddingVertical: 6,
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
  signOutButtonMobile: {
    backgroundColor: 'transparent',
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
