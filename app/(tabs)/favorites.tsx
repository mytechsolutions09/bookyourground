import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';

function FavoritesInner() {
  const { user } = useAuth();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = async () => {
    if (!user?.id) {
      setGrounds([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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
      
      const favoritedGrounds = (data || [])
        .map((f: any) => f.ground)
        .filter(Boolean);
        
      setGrounds(favoritedGrounds);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const toggleFavorite = async (groundId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('ground_id', groundId);
      if (error) throw error;
      
      // Update local state by removing the ground
      setGrounds(prev => prev.filter(g => g.id !== groundId));
    } catch (e) {
      console.error('Error removing favorite:', e);
    }
  };

  const renderItem = ({ item }: { item: GroundWithImages }) => (
    <GroundCard
      ground={item}
      onPress={() => {
        const citySlug = (item.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const nameSlug = (item.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        router.push(`/ground/${citySlug}/${nameSlug}`);
      }}
      isFavorite={true}
      onToggleFavorite={() => toggleFavorite(item.id)}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={grounds}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00ea6b" />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Heart size={48} color="#D1D5DB" strokeWidth={1.5} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No Favorites Yet</Text>
              <Text style={styles.emptyText}>Grounds you heart will appear here.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default function FavoritesScreen() {
  const { width } = useWindowDimensions();
  const isWebWithTabs = Platform.OS === 'web' && width >= 900;
  
  const content = (
    <View style={{ flex: 1 }}>
       <View style={[styles.tabContainer, isWebWithTabs && styles.webTabContainer]}>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => router.push('/grounds')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabText}>Book a Ground</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => router.push('/find-an-opponent')}
            activeOpacity={0.7}
          >
            <Text style={styles.tabText}>Find an Opponent</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, styles.activeTab]}
            activeOpacity={0.7}
          >
            <Text style={styles.activeTabText}>Favourite</Text>
          </TouchableOpacity>
        </View>
        <FavoritesInner />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <View style={styles.webWrapper}>
          {content}
        </View>
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar title="My Favorites" titleColor="#043529" lightBg />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  webWrapper: {
    flex: 1,
    paddingTop: 96,
  },
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
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
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 999,
    padding: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  webTabContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    marginBottom: 24,
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
});
