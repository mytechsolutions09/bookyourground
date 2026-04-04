import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
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
              <Heart size={48} color="#374151" strokeWidth={1.5} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No Favorites Yet</Text>
              <Text style={styles.emptyText}> grounds you heart will appear here.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default function FavoritesScreen() {
  const content = <FavoritesInner />;

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar title="My Favorites" titleColor="#00ea6b" />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#043529',
  },
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F5F5F5' : '#043529',
  },
  list: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 80 : 8,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Platform.OS === 'web' ? '#111827' : '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Platform.OS === 'web' ? '#6B7280' : '#9ca3af',
    textAlign: 'center',
  },
});
