import React from 'react';
import { View, Pressable, StyleSheet, Platform, Text, useWindowDimensions } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  House,
  LandPlot,
  CalendarCheck2,
  CircleUser,
  Heart,
  Swords,
  Trophy,
  ShoppingBag,
  ShoppingCart,
  CalendarClock,
  Search,
  BarChart2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';

const ACTIVE = '#00ea6b';
const INACTIVE = '#9ca3af';

function getActiveTab(
  segments: string[],
): 'home' | 'grounds' | 'bookings' | 'favorites' | 'profile' | 'find-opponent' | 'stats' | 'shop' | 'inventory' | 'find' {
  const root = segments[0];
  if (root === 'inventory') return 'inventory';
  if (root === 'select-sport' || root === 'search') return 'find';
  if (root === 'find-an-opponent') return 'find-opponent';
  if (root === 'ground' || root === 'grounds' || root === 'book-my-ground') {
    return 'grounds';
  }
  if (root === 'cricket') return 'stats';
  if (root === 'bookings') return 'bookings';
  if (root === 'favorites') return 'favorites';
  if (root === 'shop') return 'shop';
  if (root !== '(tabs)') return 'home';
  const tab = segments[1] ?? 'index';
  if (tab === 'index' || tab === 'home_tab') return 'home';
  if (tab === 'grounds' || tab === 'book-my-ground') return 'grounds';
  if (tab === 'cricket') return 'stats';
  if (tab === 'bookings') return 'bookings';
  if (tab === 'favorites') return 'favorites';
  if (tab === 'find-an-opponent' || tab === 'search') return 'find-opponent';
  if (tab === 'profile') return 'profile';
  if (tab === 'shop') return 'shop';
  if (tab === 'inventory' || segments.includes('inventory')) return 'inventory';
  if (tab === 'select-sport') return 'find';
  
  // Also check if we are in (owner) or (admin) inventory / bookings
  if (segments.includes('(owner)') && segments.includes('inventory')) return 'inventory';
  if (segments.includes('(admin)') && segments.includes('inventory')) return 'inventory';
  if (segments.includes('(owner)') && segments.includes('ground-bookings')) return 'bookings';
  if (segments.includes('(admin)') && segments.includes('ground-bookings')) return 'bookings';
  if (segments.includes('ground-bookings')) return 'bookings';
  
  return 'home';
}

/** Shared mobile bottom navigation (single instance via `MobileTabBarHost` in root layout). Native only. */
export default function MobileTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const { user, profile } = useAuth();
  const { isTabBarVisible } = useUI();
  const [cartCount, setCartCount] = React.useState(0);
  
  const isOwner = profile?.role === 'ground_owner';
  
  const translateY = useSharedValue(0);

  const loadCartCount = async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('shop_cart')
        .select('quantity')
        .eq('user_id', user.id);
      
      if (!error && data) {
        const total = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartCount(total);
      }
    } catch (err) {
      console.error('Error loading cart count:', err);
    }
  };

  React.useEffect(() => {
    loadCartCount();

    if (!user) return;

    // Real-time listener for cart updates
    const channel = supabase
      .channel('cart_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_cart',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadCartCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  React.useEffect(() => {
    translateY.value = withTiming(isTabBarVisible ? 0 : 120, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isTabBarVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  }));

  const { width } = useWindowDimensions();
  const isSmallWeb = Platform.OS === 'web' && width < 768;

  if (Platform.OS === 'web' && !isSmallWeb) return null;
  if (Platform.OS === 'web' && segments[0] === 'search') return null;

  const activeTab = getActiveTab(segments as string[]);
  const { setTabAnimation } = useUI();
  const size = 24;

  const isSuperAdmin = profile?.role === 'super_admin' || (user?.email?.toLowerCase() === 'invirtualcoin@gmail.com');
  const showInventoryTab = isOwner || isSuperAdmin;
  const showOwnerBookings = isOwner || isSuperAdmin;
  
  const TAB_ORDER = ['home', showInventoryTab ? 'inventory' : 'grounds', showOwnerBookings ? 'bookings' : 'find', 'shop', 'stats'];

  const go = (href: string, tabName: string) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const targetIndex = TAB_ORDER.indexOf(tabName);

    if (tabName === 'cart') {
      setTabAnimation('slide_from_bottom');
    } else if (currentIndex !== -1 && targetIndex !== -1) {
      if (targetIndex > currentIndex) {
        setTabAnimation('slide_from_left');
      } else if (targetIndex < currentIndex) {
        setTabAnimation('slide_from_right');
      }
    }
    router.push(href as any);
  };

  return (
    <Animated.View
      style={[
        styles.bar,
        animatedStyle,
        { paddingBottom: Math.max(insets.bottom, 12) }
      ]}
    >
      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/home_tab', 'home')}
      >
        <House size={size} color={activeTab === 'home' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
        <Text style={[styles.label, { color: activeTab === 'home' ? ACTIVE : INACTIVE }]}>Home</Text>
      </Pressable>

      {showInventoryTab ? (
        <Pressable
          style={styles.item}
          onPress={() => go(isSuperAdmin ? '/(admin)/inventory' : '/(owner)/inventory', 'inventory')}
        >
          <CalendarClock size={size} color={activeTab === 'inventory' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'inventory' ? 2.5 : 2} />
          <Text style={[styles.label, { color: activeTab === 'inventory' ? ACTIVE : INACTIVE }]}>Inventory</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.item}
          onPress={() => go('/book-my-ground', 'grounds')}
        >
          <LandPlot size={size} color={activeTab === 'grounds' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'grounds' ? 2.5 : 2} />
          <Text style={[styles.label, { color: activeTab === 'grounds' ? ACTIVE : INACTIVE }]}>Venue</Text>
        </Pressable>
      )}
      
      <Pressable
        style={styles.item}
        onPress={() => {
          if (activeTab === 'shop') {
            go('/shop/cart', 'cart');
          } else if (showOwnerBookings) {
            go(isSuperAdmin ? '/(admin)/bookings' : '/(owner)/ground-bookings', 'bookings');
          } else {
            go(Platform.OS === 'web' ? '/search' : '/select-sport', 'find');
          }
        }}
      >
        {activeTab === 'shop' ? (
          <View style={{ position: 'relative' }}>
            <ShoppingCart size={size} color={INACTIVE} strokeWidth={2} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
            <Text style={[styles.label, { color: INACTIVE, textAlign: 'center' }]}>Cart</Text>
          </View>
        ) : (
          <>
            {showOwnerBookings ? (
              <CalendarCheck2 size={size} color={activeTab === 'bookings' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'bookings' ? 2.5 : 2} />
            ) : (
              <Search size={size} color={(activeTab === 'find' || activeTab === 'find-opponent') ? ACTIVE : INACTIVE} strokeWidth={(activeTab === 'find' || activeTab === 'find-opponent') ? 2.5 : 2} />
            )}
            <Text style={[styles.label, { color: (activeTab === 'find' || activeTab === 'find-opponent' || activeTab === 'bookings') ? ACTIVE : INACTIVE }]}>
              {showOwnerBookings ? 'Bookings' : (Platform.OS === 'web' ? 'Search' : 'Find')}
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/shop', 'shop')}
      >
        <ShoppingBag size={size} color={activeTab === 'shop' ? '#f8688a' : INACTIVE} strokeWidth={activeTab === 'shop' ? 2.5 : 2} />
        <Text style={[styles.label, { color: activeTab === 'shop' ? '#f8688a' : INACTIVE }]}>Shop</Text>
      </Pressable>

      <Pressable
        style={styles.item}
        onPress={() => go('/(tabs)/cricket/stats', 'stats')}
      >
        <BarChart2 size={size} color={activeTab === 'stats' ? ACTIVE : INACTIVE} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />
        <Text style={[styles.label, { color: activeTab === 'stats' ? ACTIVE : INACTIVE }]}>Stats</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    // Premium shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#f8688a',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
});

