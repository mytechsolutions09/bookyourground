import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, ScrollView, useWindowDimensions, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import MobileAppNavbar from '../components/MobileAppNavbar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import { Heart } from 'lucide-react-native';

export default function BookMyGroundPage() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { groundId, date, startTime, teamType, tab } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'book' | 'favorite'>((tab as any) || 'book');
  const [favorites, setFavorites] = useState<GroundWithImages[]>([]);
  const [loadingFavs, setLoadingFavs] = useState(false);

  // On small web screens, always render booking under the Grounds tab (with bottom bar).
  useEffect(() => {
    if (Platform.OS === 'web' && width < 900) {
      router.replace('/(tabs)/grounds' as any);
    }
  }, [width]);

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

  if (Platform.OS === 'web' && width < 900) {
    return null;
  }

  const initialProps = {
    initialGroundId: groundId as string,
    initialDate: date as string,
    initialStartTime: startTime as string,
    initialTeamType: (teamType === 'one' ? 'one' : 'both') as 'one' | 'both',
  };

  const renderFavorites = () => (
    <View style={styles.favoritesContainer}>
      {favorites.length > 0 ? (
        <View style={styles.favGrid}>
          {favorites.map((item) => (
            <View key={item.id} style={styles.favItem}>
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
      <WebLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'book' && styles.activeTab]}
                activeOpacity={0.8}
                onPress={() => setActiveTab('book')}
              >
                <Text style={[styles.tabText, activeTab === 'book' && styles.activeTabText]}>Book a Ground</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.tab}
                activeOpacity={0.8}
                onPress={() => router.push('/find-an-opponent' as any)}
              >
                <Text style={styles.tabText}>Find an Opponent</Text>
              </TouchableOpacity>

            </View>

            {activeTab === 'book' ? (
              <LandingBookingForm
                fullWidth
                separateSearchResults
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
    <View style={[styles.nativeRoot, activeTab === 'favorite' && { backgroundColor: '#F8FAFC' }]}>
      <MobileAppNavbar title="Book a ground" />
      <View style={styles.page}>
        <LandingBookingForm
          fullWidth
          separateSearchResults
          noCard
          bookGroundScreenNative
          hideTitle
          {...initialProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#043529',
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
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 999,
    padding: 6,
    marginBottom: 32,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  tab: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
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
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  activeTabText: {
    color: '#01b854',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter',
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
});
