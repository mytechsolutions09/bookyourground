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
  const isMarketing = (cleanPath === '/book-my-ground' || cleanPath === '/find-an-opponent' || cleanPath === '/grounds') && !segments.includes('(admin)');
  const isShop = cleanPath === '/shop' || cleanPath.startsWith('/shop/');
  
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

        const [favsRes, shopFavsRes] = await Promise.all([
          supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('shop_favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        ]);

        const totalFavs = (favsRes.count || 0) + (shopFavsRes.count || 0);
        setFavoritesCount(totalFavs);

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
      const { data: groundsData } = await supabase
        .from('grounds')
        .select('*, ground_images(*)')
        .or(`name.ilike.${q},city.ilike.${q},state.ilike.${q}`)
        .eq('active', true)
        .eq('approved', true)
        .limit(5);

      const { data: matchesData } = await supabase
        .from('bookings')
        .select(`
          *,
          ground:grounds(*, ground_images(*)),
          user:profiles(*)
        `)
        .eq('status', 'confirmed')
        .limit(5);

      setSearchResults({
        grounds: groundsData || [],
        matches: matchesData || []
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

  const adminPathnames = [
    '/dashboard', '/bookings', '/grounds', '/earnings', '/payouts', '/inventory', '/orders', '/products', '/locations', '/manage-ground-owners', '/manage-users', '/messages', '/settings'
  ];
  
  const isAdminRoute =
    adminPathnames.some(p => cleanPath.startsWith(p)) ||
    cleanPath.startsWith('/(admin)/') ||
    cleanPath === '/add-ground' ||
    cleanPath === '/(owner)/add-ground' ||
    cleanPath === '/matches' ||
    cleanPath === '/find-an-opponent';

  const isSuperAdmin = profile?.role === 'super_admin' || user?.email?.toLowerCase() === 'invirtualcoin@gmail.com';
  const isGroundOwner = profile?.role === 'ground_owner';
  const isOwnerGroundsDashboard = isGroundOwner && cleanPath === '/grounds';
  const isUserRoute = !isGroundOwner && !isSuperAdmin && (cleanPath.includes('/dashboard') || cleanPath.includes('/bookings') || cleanPath.includes('/profile'));

  const isPublicNoSidebar =
    propIsPublicNoSidebar || isLanding || (isMarketing && !isSuperAdmin && !isOwnerGroundsDashboard) || isGroundInfoPage || isBookingDetails || isCheckoutPage || isLegalOrInfoPage || (cleanPath === '/find-an-opponent' && !isSuperAdmin) || cleanPath === '/grounds' || cleanPath === '/shop' || cleanPath.startsWith('/shop/') || cleanPath === '/search' || cleanPath.startsWith('/live/') || (cleanPath.startsWith('/cricket/') && !cleanPath.startsWith('/cricketdata'));

  const isAuthenticated = !!user || !!profile || isSuperAdmin;
  const showMenuPanel = !isPublicNoSidebar && isAuthenticated && !isCompact;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const isAdminLayout = isSuperAdmin && isAdminRoute;
  const bodyStyle = (isPublicNoSidebar || isCompact) ? styles.bodyFull : isAdminLayout ? styles.bodyAdmin : styles.body;
  const showHeroHeader = isLanding || isMarketing || (isGroundDetails && !isOwnerGroundsDashboard);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, (isLanding || isMarketing) && styles.containerLanding]}>
      {/* Hero Header Section */}
      {!hideHeader && showHeroHeader && (
        <View style={[styles.heroHeader, isGroundDetails && styles.heroHeaderGround, isMarketing && styles.heroHeaderMarketing, isCompact && !isNavbarVisible && { transform: [{ translateY: -100 }] }]}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.12)' : 'transparent', backdropFilter: scrolled ? 'blur(40px) saturate(180%)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(40px) saturate(180%)' : 'none', transition: 'all 0.5s ease', zIndex: -1 } as any]} />
          <View style={[styles.headerContent, isCompact && styles.headerContentCompact]}>
            <TouchableOpacity onPress={() => router.replace('/')} style={styles.logo}>
              <Image source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')} style={[styles.logoImage, isCompact && styles.logoImageCompact]} resizeMode="contain" />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              {!isCompact ? (
                <>
                  {!((cleanPath === '/book-my-ground' || cleanPath === '/find-an-opponent')) && (
                    <View style={styles.headerSearchContainer}>
                      {!isSearchExpanded ? (
                        <TouchableOpacity onPress={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 50); }} style={[styles.searchIconButton, scrolled && styles.searchIconButtonScrolled]}>
                          <Search size={18} color="#dcc093" />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.headerSearch, { width: 300 }, scrolled && { backgroundColor: 'rgba(255, 255, 255, 0.15)' } as any]}>
                          <Search size={16} color="#dcc093" style={styles.headerSearchIcon} />
                          <TextInput
                            ref={searchInputRef}
                            placeholder="Search city or venue..."
                            placeholderTextColor="rgba(220, 192, 147, 0.6)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => { setTimeout(() => { setSearchFocused(false); if (!searchQuery) setIsSearchExpanded(false); }, 200); }}
                            style={[styles.headerSearchInput, scrolled && { color: '#dcc093' } as any]}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {searchFocused && (searchQuery.length >= 2) && (
                    <View style={styles.searchDropdown}>
                      <ScrollView style={styles.searchDropdownScroll}>
                        {searchResults.grounds.map(g => (
                          <TouchableOpacity key={g.id} style={styles.searchItem} onPress={() => handleResultPress('ground', g)}>
                            <Building2 size={14} color="#01b854" />
                            <Text style={styles.searchItemName}>{g.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <TouchableOpacity onPress={() => router.push('/cricket/player-profile' as any)}>
                    <Text style={[styles.headerPrimaryButtonText, scrolled && styles.headerPrimaryButtonTextScrolled]}>CRICKET</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/shop' as any)}>
                    <Text style={[styles.headerPrimaryButtonText, scrolled && styles.headerPrimaryButtonTextScrolled, { color: '#dcc093' }]}>SHOP</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push(groundsHref as any)}>
                    <Text style={[styles.headerPrimaryButtonText, scrolled && styles.headerPrimaryButtonTextScrolled]}>GROUNDS</Text>
                  </TouchableOpacity>

                  {!isAuthenticated ? (
                    <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
                      <Text style={[styles.headerSecondaryButtonText, scrolled && styles.headerSecondaryButtonTextScrolled]}>SIGN IN</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => router.push('/profile')}>
                      <Image source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} style={styles.profileAvatar} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <TouchableOpacity onPress={() => router.push(isAuthenticated ? '/profile' : '/(auth)/login')}>
                  {isAuthenticated ? (
                    <Image source={{ uri: profile?.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }} style={styles.profileAvatarCompact} />
                  ) : (
                    <Text style={styles.headerSecondaryButtonText}>SIGN IN</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Standard Header Section */}
      {!hideHeader && !isLanding && !isMarketing && (!isGroundDetails || isOwnerGroundsDashboard) && (
        <View style={[styles.header, isShop && { backgroundColor: '#1a1f2e' }, isGroundOwner && !isPublicNoSidebar && styles.ownerHeader, isUserRoute && !isPublicNoSidebar && styles.userHeader, isCompact && !isNavbarVisible && { transform: [{ translateY: -100 }] }]}>
          <View style={[styles.headerContent, isCompact && styles.headerContentCompact]}>
            <TouchableOpacity onPress={() => router.replace('/')} style={styles.logo}>
              <Image source={require('../../assets/BOOK_MY_GROUND__6_-removebg-preview.png')} style={[styles.logoImage, isCompact && styles.logoImageCompact]} resizeMode="contain" />
            </TouchableOpacity>

            <View style={styles.headerRight}>
              {!isCompact && (
                <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => router.push('/shop' as any)}>
                    <Text style={[styles.headerNavLink, (cleanPath === '/shop' || isShop) ? { color: '#f8688a', borderBottomWidth: 2, borderBottomColor: '#f8688a' } : { color: '#FFFFFF' }]}>SHOP</Text>
                  </TouchableOpacity>

                  {!isAuthenticated ? (
                    <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
                      <Text style={styles.headerSecondaryButtonText}>SIGN IN</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.userProfilePill} onPress={() => router.push('/profile')}>
                      <Image source={profile?.avatar_url ? { uri: profile.avatar_url } : require('@/assets/images/default-avatar.jpg')} style={styles.userAvatar} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Main Content Area */}
      <View style={bodyStyle}>
        {showMenuPanel && (
          <View style={isAdminLayout ? styles.sidebarContainerAdmin : styles.sidebarContainer}>
            <View style={[styles.sidebar, isSuperAdmin && isAdminRoute && sidebarCollapsed && styles.sidebarCollapsed]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {isSuperAdmin && isAdminRoute ? (
                  <>
                    <NavLink href="/(admin)/dashboard" icon={LayoutDashboard} label="Dashboard" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/cricketdata" icon={Swords} label="Cricket Hub" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/bookings" icon={Calendar} label="Bookings" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/grounds" icon={Building2} label="Grounds" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/inventory" icon={Package} label="Inventory" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/products" icon={ShoppingBag} label="Products" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/earnings" icon={IndianRupee} label="Earnings" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/payouts" icon={Wallet2} label="Payouts" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/manage-ground-owners" icon={Shield} label="Ground owners" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/manage-users" icon={Users} label="Users" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/messages" icon={LifeBuoy} label="Tickets" hideLabel={sidebarCollapsed} />
                    <NavLink href="/(admin)/settings" icon={Settings} label="Settings" hideLabel={sidebarCollapsed} />
                  </>
                ) : isGroundOwner ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    <NavLink href="/bookings" icon={Calendar} label="My Bookings" />
                    <NavLink href="/profile/orders" icon={ShoppingBag} label="Shop Orders" />
                    <NavLink href="/profile" icon={CircleUser} label="My Profile" />
                    <NavLink href="/favorites" icon={Heart} label="Favorites" badge={favoritesCount} />
                    <NavLink href="/wallet" icon={Wallet} label="Wallet" meta={walletBalance !== null ? formatCurrency(walletBalance) : undefined} />
                    <NavLink href="/cricket/player-profile" icon={Trophy} label="Cricket Hub" />
                    <NavLink href="/support" icon={Info} label="Help" />
                  </>
                )}
                <View style={styles.sidebarDivider} />
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                  <LogOut size={18} color="#00ea6b" />
                  {!sidebarCollapsed && <Text style={styles.signOutText}>Sign out</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}

        <View style={[styles.main, (isLanding || isMarketing || isPublicNoSidebar) && { padding: 0, overflow: 'visible' }, !isPublicNoSidebar && !isCompact && !noCard && styles.mainAppCard]}>
          {children}
        </View>
      </View>

      {/* Bottom Bar for Mobile */}
      {isCompact && !isInTabs && !isCheckoutPage && (
        <View style={[styles.bottomBar, (!isBottomBarVisible || !isTabBarVisible) && { transform: [{ translateY: 100 }], opacity: 0 }]}>
          {[
            { label: 'Home', icon: House, href: '/' },
            { label: 'Grounds', icon: LandPlot, href: '/book-my-ground' },
            { label: 'Opposition', icon: Swords, href: '/find-an-opponent' },
            { label: 'Shop', icon: ShoppingBag, href: '/shop' },
            { label: 'Cricket', icon: Trophy, href: '/cricket/player-profile' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = cleanPath === item.href || (item.label === 'Shop' && cleanPath.startsWith('/shop')) || (item.label === 'Cricket' && cleanPath.startsWith('/cricket'));
            return (
              <TouchableOpacity key={item.label} style={styles.bottomBarItem} onPress={() => { if (item.href === '/') router.replace('/'); else router.push(item.href as any); }}>
                <Icon size={22} color={isActive ? (item.label === 'Shop' ? '#f8688a' : '#00ea6b') : '#9ca3af'} />
                <Text style={[styles.bottomBarText, isActive && (item.label === 'Shop' ? { color: '#f8688a' } : { color: '#00ea6b' })]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', ...(Platform.OS === 'web' ? { overflow: 'hidden', height: '100vh' } : {}) },
  containerLanding: { backgroundColor: '#F5F5F5' },
  header: { height: 84, backgroundColor: '#043529', justifyContent: 'center', zIndex: 100, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', ...(Platform.OS === 'web' ? { position: 'sticky', top: 0 } : {}) },
  ownerHeader: { backgroundColor: '#043529' },
  userHeader: { backgroundColor: '#043529' },
  heroHeader: { position: 'fixed' as any, top: 0, left: 0, right: 0, height: 84, zIndex: 2000, backgroundColor: 'transparent', justifyContent: 'center' },
  heroHeaderGround: { position: 'fixed' as any, backgroundColor: '#043529' },
  heroHeaderMarketing: { position: 'fixed' as any, backgroundColor: '#043529' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1400, marginHorizontal: 'auto', paddingHorizontal: 24, width: '100%' },
  headerContentCompact: { paddingHorizontal: 16, marginHorizontal: 0 },
  logo: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { height: 52, width: 180 },
  logoImageCompact: { height: 40, width: 140 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerSearchContainer: { flexDirection: 'row', alignItems: 'center' },
  searchIconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  searchIconButtonScrolled: { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  headerSearch: { minWidth: 260, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12 },
  headerSearchIcon: { marginRight: 8 },
  headerSearchInput: { flex: 1, height: 32, color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter', ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any },
  searchDropdown: { position: 'absolute' as any, top: 50, left: 0, right: 0, backgroundColor: '#FFFFFF', borderRadius: 16, zIndex: 5000, overflow: 'hidden', maxHeight: 450, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  searchDropdownScroll: { paddingVertical: 8 },
  searchItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  searchItemName: { fontSize: 14, color: '#111827', fontFamily: 'Inter' },
  signOutButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  signOutText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter' },
  body: { flex: 1, flexDirection: 'row', width: '100%', backgroundColor: '#FFFFFF', ...(Platform.OS === 'web' ? { overflow: 'hidden' } : {}) },
  bodyAdmin: { flex: 1, flexDirection: 'row', width: '100%' },
  bodyFull: { flex: 1, width: '100%', backgroundColor: '#FFFFFF', ...(Platform.OS === 'web' ? { overflow: 'hidden' } : {}) },
  sidebarContainer: { paddingRight: 0 },
  sidebarContainerAdmin: { paddingRight: 0 },
  sidebar: { width: 240, backgroundColor: '#043529', paddingVertical: 24, paddingHorizontal: 16, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.05)', ...(Platform.OS === 'web' ? { position: 'sticky', top: 0, height: '100vh', zIndex: 2000 } : {}) },
  sidebarCollapsed: { width: 72, paddingHorizontal: 8 },
  navLink: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, marginBottom: 2, ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) as any },
  navLinkCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  navLinkActive: { backgroundColor: 'rgba(0,234,107,0.1)' },
  navLinkText: { fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.7)', flex: 1 },
  navLinkTextMobile: { marginLeft: 0 },
  navLinkTextActive: { color: '#00ea6b', fontWeight: '500' },
  main: { flex: 1, padding: 20, backgroundColor: '#FFFFFF' },
  mainAppCard: { borderRadius: 32, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15 },
  headerPrimaryButtonText: { fontSize: 14, fontWeight: '500', color: '#dcc093', fontFamily: 'Inter', textTransform: 'uppercase', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) as any },
  headerPrimaryButtonTextScrolled: { color: '#dcc093' },
  headerSecondaryButtonText: { fontSize: 14, fontWeight: '500', color: '#dcc093', fontFamily: 'Inter', textTransform: 'uppercase', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) as any },
  headerSecondaryButtonTextScrolled: { color: '#dcc093' },
  profileAvatar: { width: 32, height: 32, borderRadius: 16 },
  profileAvatarCompact: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  headerNavLink: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter', textTransform: 'uppercase', ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}) as any },
  userProfilePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 4, borderRadius: 99 },
  userAvatar: { width: 34, height: 34, borderRadius: 17 },
  sidebarDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  badge: { backgroundColor: '#00ea6b', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 'auto' },
  badgeText: { color: '#043529', fontSize: 11, fontWeight: '800' },
  navLinkMeta: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 'auto' },
  bottomBar: { position: 'fixed' as any, bottom: 0, left: 0, right: 0, height: 72, backgroundColor: '#FFFFFF', flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', zIndex: 10000 },
  bottomBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomBarText: { fontSize: 10, marginTop: 2, color: '#9CA3AF' },
  tooltip: { position: 'absolute' as any, left: 72, backgroundColor: '#1F2937', padding: 8, borderRadius: 8, zIndex: 10000 },
  tooltipText: { color: '#FFFFFF', fontSize: 12 },
});
