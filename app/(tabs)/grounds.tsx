import React, { useEffect, useState } from 'react';
import { Platform, View, StyleSheet, ScrollView, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import { router, useLocalSearchParams } from 'expo-router';
import { Menu as MenuIcon, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';

export default function GroundsTabScreen() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { tab } = useLocalSearchParams();
  const isSmall = width < 900;
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
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'book' && styles.activeTab]}
        onPress={() => setActiveTab('book')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'book' && styles.activeTabText]}>Book a Ground</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tab}
        onPress={() => router.push('/find-an-opponent')}
        activeOpacity={0.7}
      >
        <Text style={styles.tabText}>Find an Opponent</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'favorite' && styles.activeTab]}
        onPress={() => setActiveTab('favorite')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'favorite' && styles.activeTabText]}>Favourite</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {renderTabs(isSmall ? styles.webTabContainerNative : styles.webTabContainer)}
          <View style={styles.page}>
            {activeTab === 'book' ? <LandingBookingForm fullWidth /> : renderFavorites()}
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  // Native: full-screen booking with navbar + tabs.
  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar 
        title={activeTab === 'book' ? "Book a ground" : "Favourites"} 
        titleColor="#043529" 
        lightBg 
        rightAction={
          <TouchableOpacity onPress={() => {}}>
            <MenuIcon size={24} color="#043529" />
          </TouchableOpacity>
        }
      />
      
      {renderTabs(styles.nativeTabContainer)}

      <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'book' ? (
          <LandingBookingForm fullWidth noCard bookGroundScreenNative hideTitle />
        ) : (
          renderFavorites()
        )}
      </ScrollView>
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
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 999,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  activeTabText: {
    color: '#01b854',
    fontSize: 13,
    fontWeight: '600',
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
