import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, ScrollView, useWindowDimensions, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { DeviceEventEmitter } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import MobileAppNavbar from '../components/MobileAppNavbar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import { Heart } from 'lucide-react-native';
import { useUI } from '@/contexts/UIContext';

export default function BookMyGroundPage() {
  const { width } = useWindowDimensions();
  const isUltraNarrow = width < 350;
  const isTablet = width >= 600;
  const insets = useSafeAreaInsets();
  const { setTabBarVisible } = useUI();
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 64 + insets.top;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (Platform.OS === 'web') return; 
      const currentY = event.contentOffset.y;
      
      const diff = currentY - lastScrollY.value;
      if (diff > 2 && currentY > 60) {
        if (headerTranslateY.value === 0) {
          headerTranslateY.value = withTiming(-HEADER_HEIGHT - 20, { duration: 400 });
          runOnJS(setTabBarVisible)(false);
        }
      } else if (diff < -2 || currentY < 20) {
        if (headerTranslateY.value < 0) {
          headerTranslateY.value = withTiming(0, { duration: 400 });
          runOnJS(setTabBarVisible)(true);
        }
      }
      lastScrollY.value = currentY;
    },
  });

  const onScrollWeb = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    DeviceEventEmitter.emit('mainScroll', { y: currentY });

    const diff = currentY - lastScrollY.value;
    if (diff > 2 && currentY > 60) {
      if (headerTranslateY.value === 0) {
        headerTranslateY.value = withTiming(-HEADER_HEIGHT - 20, { duration: 400 });
        setTabBarVisible(false);
      }
    } else if (diff < -2 || currentY < 20) {
      if (headerTranslateY.value < 0) {
        headerTranslateY.value = withTiming(0, { duration: 400 });
        setTabBarVisible(true);
      }
    }
    lastScrollY.value = currentY;
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const { user } = useAuth();
  const { groundId, date, startTime, teamType, tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'book' | 'favorite'>((tab as any) || 'book');
  const [favorites, setFavorites] = useState<GroundWithImages[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);


  useEffect(() => {
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


  const initialProps = {
    initialGroundId: groundId as string,
    initialDate: date as string,
    initialStartTime: startTime as string,
    initialTeamType: (teamType === 'one' ? 'one' : 'both') as 'one' | 'both',
  };

  const renderFavorites = () => (
    <View style={styles.favoritesContainer}>
      {favorites.length > 0 ? (
        <View style={[styles.favGrid, isTablet && { gap: 16 }]}>
          {favorites.map((item) => (
            <View key={item.id} style={[styles.favItem, isTablet && { width: 'calc(50% - 8px)', minWidth: 250 }]}>
              <GroundCard
                ground={item}
                onPress={() => {
                  const citySlug = (item.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  const nameSlug = (item.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  router.push(`/ground/${citySlug}/${nameSlug}`);
                }}
                isFavorite={true}
                onToggleFavorite={() => toggleFavorite(item.id)}
                lightMode={true}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Heart size={48} color="#D1D5DB" strokeWidth={1.5} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>Grounds you heart will appear here.</Text>
        </View>
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout hideHeader={width < 900}>
        {width < 900 && (
          <Animated.View style={[styles.headerContainerFixed, { paddingTop: insets.top }, headerAnimatedStyle]}>
            <MobileAppNavbar
              title="Book a ground"
              titleColor="#0F172A"
              lightBg
            />
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, styles.activeTab]}
              >
                <Text style={styles.activeTabText}>Book a Ground</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => router.push('/find-an-opponent')}
              >
                <Text style={styles.tabText}>Find an Opposition</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={onScrollWeb}
          scrollEventThrottle={16}
        >
          <View style={[
            styles.page,
            width < 900 && { paddingTop: 150 + insets.top, paddingHorizontal: 0 }
          ]}>

            {activeTab === 'book' ? (
              <LandingBookingForm
                fullWidth
                separateSearchResults
                noCard={width < 900}
                hideTitle={width < 900}
                premiumCards={true}
                {...initialProps}
              />
            ) : (
              renderFavorites()
            )}
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  // Native (iOS / Android): full-screen booking form with simple navbar.
  return (
    <View style={styles.nativeRoot}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, backgroundColor: '#FFFFFF' }, headerAnimatedStyle]}>
        <MobileAppNavbar title="Book a ground" titleColor="#0F172A" lightBg />
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, styles.activeTab]}
          >
            <Text style={styles.activeTabText}>Book a Ground</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => router.push('/find-an-opponent')}
          >
            <Text style={styles.tabText}>Find an Opposition</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      <View style={[styles.page, { paddingTop: 0 }, isUltraNarrow && { paddingHorizontal: 12 }]}>
        <LandingBookingForm
          fullWidth
          noCard
          bookGroundScreenNative
          hideTitle
          premiumCards={true}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentPaddingTop={160}
          {...initialProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  page: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 96 : 0,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 64,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 0,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  activeTabText: {
    color: '#01b854',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#01b854',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  favoritesContainer: {
    flex: 1,
    width: '100%',
  },
  favGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    paddingBottom: 40,
  },
  favItem: {
    width: Platform.OS === 'web' ? 'calc(33.333% - 14px)' : '100%',
    minWidth: 300,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  headerContainerFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
});
