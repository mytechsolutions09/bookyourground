import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView, Image, ActivityIndicator } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { MoreVertical, Star, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

import GroundCard from '@/components/grounds/GroundCard';

const ACCENT = '#c8f35c'; 

export default function FavoritesScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'grounds' | 'merchandise'>('grounds');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [shopFavorites, setShopFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadFavorites();
      loadShopFavorites();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadFavorites = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          ground:grounds (
            *,
            ground_images(*),
            reviews(rating)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const mapped = (data || [])
        .map((f: any) => f.ground)
        .filter(Boolean);
        
      setFavorites(mapped);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadShopFavorites = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('shop_favorites')
        .select(`
          product:shop_products (
            *,
            category:shop_categories(name)
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const mapped = (data || [])
        .map((f: any) => {
          const p = f.product;
          if (!p) return null;
          return {
            id: p.id,
            name: p.name,
            rating: Number(p.rating || 0),
            reviews: p.review_count || 0,
            location: p.category?.name || 'Equipment',
            price: p.price,
            image: p.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
          };
        })
        .filter(Boolean);
        
      setShopFavorites(mapped);
    } catch (err) {
      console.error('Error loading shop favorites:', err);
    }
  };

  const removeFavorite = async (groundId: string) => {
    if (!user?.id) return;
    try {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('ground_id', groundId);
      setFavorites(prev => prev.filter(f => f.id !== groundId));
    } catch (e) {
      console.error('Failed to remove favorite', e);
    }
  };

  const removeShopFavorite = async (productId: string) => {
    if (!user?.id) return;
    try {
      await supabase
        .from('shop_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      setShopFavorites(prev => prev.filter(f => f.id !== productId));
    } catch (e) {
      console.error('Failed to remove shop favorite', e);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={14} color={i < Math.floor(rating) ? '#F59E0B' : '#E2E8F0'} fill={i < Math.floor(rating) ? '#F59E0B' : 'transparent'} />
    ));
  };

  const renderItem = (item: any) => {
    if (activeTab === 'grounds') {
      return (
        <View key={item.id} style={{ marginBottom: 12 }}>
          <GroundCard
            ground={item}
            isFavorite={true}
            onPress={() => {
              const citySlug = (item.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const nameSlug = (item.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
              router.push(`/ground/${citySlug}/${nameSlug}`);
            }}
            onToggleFavorite={() => removeFavorite(item.id)}
            lightMode={true}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.favCard, isCompact && styles.favCardCompact]}
        activeOpacity={0.9}
        onPress={() => router.push(`/shop/${item.id}`)}
      >
        <Image source={{ uri: item.image }} style={[styles.favImage, isCompact && styles.favImageCompact]} />
        <View style={[styles.favInfo, isCompact && styles.favInfoCompact]}>
          <View style={styles.favTopRow}>
            <Text style={styles.favName} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeShopFavorite(item.id)}>
              <Heart size={20} color="#EF4444" fill="#EF4444" />
            </TouchableOpacity>
          </View>
          <View style={styles.favMetaRow}>
            <Text style={styles.favRatingNum}>{item.rating.toFixed(1)}</Text>
            <View style={styles.starsContainer}>{renderStars(item.rating)}</View>
            <Text style={styles.favMetaText}>({item.reviews} tests)</Text>
            <Text style={styles.favMetaBullet}>•</Text>
            <Text style={styles.favMetaText}>{item.location}</Text>
          </View>
          <View style={styles.favBottomRow}>
            <Text style={styles.favPriceBig}>₹{Number(item.price).toLocaleString('en-IN')}</Text>
            <View style={styles.favActions}>
              <TouchableOpacity style={styles.bookBtn} onPress={() => router.push(`/shop/${item.id}`)}>
                <Text style={styles.bookBtnTxt}>Buy Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRightPanel = () => (
    <View style={styles.rightPanel}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Favorites Summary</Text>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBigNumber}>{(activeTab === 'grounds' ? favorites : shopFavorites).length}</Text>
          <View style={styles.summarySubContainer}>
            <Text style={styles.summarySubText}>{activeTab === 'grounds' ? 'Venues' : 'Products'}</Text>
            <Text style={styles.summarySubTextSaved}>Saved</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const content = (
    <View style={{ flex: 1 }}>
      <View style={styles.headerContainer}>
        {/* Toggle Buttons Section - Fixed at top */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeTab === 'grounds' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('grounds')}
          >
            <View style={styles.btnContent}>
              <Text style={[styles.toggleBtnTxt, activeTab === 'grounds' && styles.toggleBtnTxtActive]}>Grounds</Text>
              {favorites.length > 0 && (
                <View style={[styles.dot, activeTab === 'grounds' && styles.dotActive]}>
                  <Text style={styles.dotTxt}>{favorites.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, activeTab === 'merchandise' && styles.toggleBtnActive]}
            onPress={() => setActiveTab('merchandise')}
          >
            <View style={styles.btnContent}>
              <Text style={[styles.toggleBtnTxt, activeTab === 'merchandise' && styles.toggleBtnTxtActive]}>Merchandise</Text>
              {shopFavorites.length > 0 && (
                <View style={[styles.dot, activeTab === 'merchandise' && styles.dotActive]}>
                  <Text style={styles.dotTxt}>{shopFavorites.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.scrollContent, (Platform.OS === 'web' && !isCompact) && styles.scrollContentWeb]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainLayout}>
          <View style={styles.centerContent}>
            <View style={styles.favoritesList}>
              {loading ? (
                <ActivityIndicator size="large" color="#01b854" style={{ marginTop: 40 }} />
              ) : (activeTab === 'grounds' ? favorites : shopFavorites).length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                  <Heart size={48} color="#D1D5DB" strokeWidth={1.5} style={{ marginBottom: 16 }} />
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Inter' }}>No Favorites Yet</Text>
                  <Text style={{ fontSize: 15, color: '#6B7280', fontFamily: 'Inter', marginTop: 8 }}>
                    Items you heart in {activeTab === 'grounds' ? 'Grounds' : 'Merchandise'} will appear here.
                  </Text>
                </View>
              ) : (
                (activeTab === 'grounds' ? favorites : shopFavorites).map(item => renderItem(item))
              )}
            </View>
          </View>
          {!isCompact && renderRightPanel()}
        </View>
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <View style={styles.nativeWrapper}>
      <MobileAppNavbar title="Favorites" titleColor="#043529" lightBg />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  scrollContentWeb: {
    padding: 0,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mainLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    maxWidth: 1400,
    width: '100%',
  },
  centerContent: {
    flex: 1,
  },
  rightPanel: {
    width: 320,
    flexShrink: 0,
    gap: 20,
  },
  headerArea: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 14,
    marginBottom: 24,
    width: '100%',
    alignSelf: 'stretch',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtnTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTxtActive: {
    color: '#043529',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    backgroundColor: '#94A3B8',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: '#043529',
  },
  dotTxt: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  favoritesList: {
    gap: 16,
  },
  favCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  favCardCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  favImage: {
    width: 240,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  favImageCompact: {
    width: '100%',
    height: 180,
  },
  favInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  favInfoCompact: {
    marginLeft: 0,
    marginTop: 12,
  },
  favTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  favName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    flex: 1,
    marginRight: 12,
  },
  favMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  favRatingNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginRight: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  favMetaText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  favMetaBullet: {
    marginHorizontal: 6,
    color: '#94A3B8',
    fontSize: 14,
  },
  favBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  favPriceBig: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  favActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bookBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookBtnTxt: {
    color: '#043529',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  removeBtn: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  removeBtnTxt: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  panelCard: {
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 20,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  summaryBox: {
    backgroundColor: '#cbd5e1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryBigNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  summarySubContainer: {
    justifyContent: 'center',
  },
  summarySubText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  summarySubTextSaved: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803d',
    fontFamily: 'Inter',
  },
});
