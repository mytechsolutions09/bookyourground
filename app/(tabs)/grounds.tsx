import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, ScrollView, TouchableOpacity, Text, useWindowDimensions, LayoutAnimation, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import { router, useLocalSearchParams } from 'expo-router';
import { Menu as MenuIcon, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundsSearchBar from '@/components/grounds/GroundsSearchBar';
import FindAnOpponentScreen from './find-an-opponent';
import FavoritesScreen from './favorites';
import { useUI } from '@/contexts/UIContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GroundsTabScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { tab } = useLocalSearchParams();
  const isSmall = width < 900;
  const [activeTab, setActiveTab] = useState<'book' | 'opponent' | 'favorite'>((tab as any) || 'book');
  const horizontalPagerRef = React.useRef<Animated.ScrollView>(null);
  const tabScrollRef = React.useRef<ScrollView>(null);
  const [favorites, setFavorites] = useState<GroundWithImages[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useUI();

  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 110;

  const TABS_LIST = [
    { id: 'book', label: 'Book a Ground', index: 0 },
    { id: 'opponent', label: 'Find an Opponent', index: 1 },
    { id: 'favorite', label: 'Favourite', index: 2 },
  ];

  const onTabPress = (tabId: 'book' | 'opponent' | 'favorite', idx: number) => {
    setActiveTab(tabId);
    horizontalPagerRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  const horizontalScrollHandler = useAnimatedScrollHandler({
    onMomentumEnd: (event) => {
      const idx = Math.round(event.contentOffset.x / width);
      const tab = TABS_LIST[idx];
      if (tab) {
        runOnJS(setActiveTab)(tab.id as any);
      }
    },
  });

  useEffect(() => {
    return () => setTabBarVisible(true);
  }, []);

  const verticalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;

      if (diff > 1 && currentY > 50) {
        if (headerTranslateY.value === 0) {
          headerTranslateY.value = withTiming(-HEADER_HEIGHT - insets.top, {
            duration: 600,
            easing: Easing.out(Easing.exp)
          });
          runOnJS(setTabBarVisible)(false);
        }
      } else if (diff < -2 || currentY < 20) {
        if (headerTranslateY.value < 0) {
          headerTranslateY.value = withTiming(0, {
            duration: 600,
            easing: Easing.out(Easing.exp)
          });
          runOnJS(setTabBarVisible)(true);
        }
      }
      lastScrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#F9FAFB',
  }));

  useEffect(() => {
    if (Platform.OS !== 'web' && LayoutAnimation) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    if (activeTab === 'favorite' && user?.id) {
      loadFavorites();
    }
  }, [activeTab, user?.id]);

  const loadFavorites = async () => {
    try {
      setLoadingFavs(true);
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          ground:grounds (
            *,
            ground_images(*)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      const favoritedGrounds = (data || []).map((f: any) => f.ground).filter(Boolean);
      setFavorites(favoritedGrounds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoadingFavs(false);
    }
  };

  const toggleFavorite = async (groundId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('ground_id', groundId);
      setFavorites(prev => prev.filter(g => g.id !== groundId));
    } catch (e) {
      console.error('Error removing favorite:', e);
    }
  };

  const renderFavorites = () => (
    <View style={styles.favoritesContainer}>
      {favorites.length > 0 ? (
        favorites.map((item) => (
          <GroundCard
            key={item.id}
            ground={item}
            onPress={() => {
              const citySlug = (item.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const nameSlug = (item.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
              router.push(`/ground/${citySlug}/${nameSlug}`);
            }}
            isFavorite={true}
            lightMode={true}
            onToggleFavorite={() => toggleFavorite(item.id)}
          />
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Heart size={48} color="#D1D5DB" strokeWidth={1.5} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>Grounds you heart will appear here.</Text>
        </View>
      )}
    </View>
  );

  const renderTabs = (tabContainerStyle: any) => (
    <View style={[styles.tabContainerBase, tabContainerStyle]}>
      {TABS_LIST.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => onTabPress(tab.id as any, tab.index)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (Platform.OS === 'web' && !isSmall) {
    return (
      <WebLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {renderTabs(isSmall ? styles.webTabContainerNative : styles.webTabContainer)}
          <View style={styles.page}>
            {activeTab === 'book' ? (
              <View>
                <GroundsSearchBar lightMode={true} />
                <LandingBookingForm fullWidth />
              </View>
            ) : activeTab === 'opponent' ? (
              <FindAnOpponentScreen hideHeader />
            ) : renderFavorites()}
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  // Native: full-screen booking with navbar + tabs.
  return (
    <View style={styles.nativeRoot}>
      <Animated.View style={headerAnimatedStyle}>
        <MobileAppNavbar
          title={activeTab === 'book' ? "Book a Ground" : (activeTab === 'opponent' ? "Find an Opponent" : "Favourites")}
          smallerTitle={true}
        />
        {renderTabs(styles.nativeTabContainer)}
      </Animated.View>

      <Animated.ScrollView
        ref={horizontalPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: TABS_LIST.find(t => t.id === activeTab)?.index! * width, y: 0 }}
        onScroll={horizontalScrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* Slide 1: Book a Ground */}
        <View style={{ width }}>
          <Animated.ScrollView
            onScroll={verticalScrollHandler}
            scrollEventThrottle={16}
            style={styles.page}
            contentContainerStyle={{ paddingTop: HEADER_HEIGHT + insets.top + 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            <GroundsSearchBar lightMode={true} />
            <LandingBookingForm fullWidth noCard bookGroundScreenNative hideTitle lightAppTheme />
          </Animated.ScrollView>
        </View>

        {/* Slide 2: Find an Opponent */}
        <View style={{ width }}>
          <FindAnOpponentScreen
            hideHeader={true}
            externalScrollHandler={verticalScrollHandler}
          />
        </View>

        {/* Slide 3: Favourite */}
        <View style={{ width }}>
          <FavoritesScreen
            hideHeader={true}
            externalScrollHandler={verticalScrollHandler}
          />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
  },
  tabContainerBase: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 999,
    padding: 6,
  },
  nativeTabContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  webTabContainer: {
    paddingTop: 12,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  webTabContainerNative: {
    paddingBottom: 12,
    maxWidth: '100%',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  activeTabText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  favoritesContainer: {
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
});
