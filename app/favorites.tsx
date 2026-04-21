import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, useWindowDimensions, ScrollView, Image, ActivityIndicator } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { MoreVertical, Star, Heart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

const ACCENT = '#c8f35c'; 

const MOCK_FAVORITES = [
  {
    id: 1,
    name: 'GreenWave Turf - Koramangala',
    rating: 5.0,
    reviews: 124,
    location: 'Koramangala',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 2,
    name: 'EliteMaidan Sports Arena',
    rating: 4.8,
    reviews: 89,
    location: 'Whitefield',
    price: 1400,
    image: 'https://images.unsplash.com/photo-1540321300973-2dc8ab8e9ec1?q=80&w=2000&auto=format&fit=crop'
  },
  {
    id: 3,
    name: 'Lotus Turf',
    rating: 4.9,
    reviews: 201,
    location: 'Indiranagar',
    price: 1100,
    image: 'https://images.unsplash.com/photo-1624880357913-a8539238245b?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 4,
    name: 'Neon Futsal Arena',
    rating: 4.7,
    reviews: 150,
    location: 'Jayanagar',
    price: 900,
    image: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?q=80&w=2076&auto=format&fit=crop'
  }
];

export default function FavoritesScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadFavorites();
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
        .map((f: any) => {
          const g = f.ground;
          if (!g) return null;
          let avgRating = 5.0;
          if (g.reviews && g.reviews.length > 0) {
            avgRating = g.reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / g.reviews.length;
          }
          return {
            id: g.id,
            name: g.name,
            rating: avgRating,
            reviews: g.reviews?.length || 0,
            location: g.city || 'Location',
            price: g.base_price_per_hour,
            image: g.ground_images?.[0]?.image_url || 'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=2070&auto=format&fit=crop'
          };
        })
        .filter(Boolean);
        
      setFavorites(mapped);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} size={14} color={i < Math.floor(rating) ? '#F59E0B' : '#E2E8F0'} fill={i < Math.floor(rating) ? '#F59E0B' : 'transparent'} />
    ));
  };

  const renderRightPanel = () => (
    <View style={styles.rightPanel}>
      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Favorites Summary</Text>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryBigNumber}>{favorites.length}</Text>
          <View style={styles.summarySubContainer}>
            <Text style={styles.summarySubText}>Venues</Text>
            <Text style={styles.summarySubTextSaved}>Saved</Text>
          </View>
        </View>
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Your Top Sport:</Text>
        <View style={styles.topSportCard}>
          <View style={styles.sportAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sportName}>Football</Text>
          </View>
          <TouchableOpacity style={styles.sportBtn}>
            <Text style={styles.sportBtnTxt}>View</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Recommended for you</Text>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.recItem}>
            <View style={styles.recAvatar} />
            <View style={styles.recInfo}>
              <Text style={styles.recName}>PM Match Scarrar</Text>
              <Text style={styles.recSub}>Koramangala</Text>
            </View>
            <TouchableOpacity style={styles.recBtn}>
              <Text style={styles.recBtnTxt}>Join</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Balance & Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.donutWrapper}>
            <View style={styles.donutMock} />
            <View style={styles.donutInner}>
               <Text style={styles.donutPercentText}>72%</Text>
            </View>
          </View>
          <View style={styles.statsInfoBlock}>
             <Text style={styles.statsInfoLabel}>of monthly</Text>
             <Text style={styles.statsInfoSub}>games booked</Text>
             <Text style={styles.statsInfoHighlight}>18 hrs</Text>
             <Text style={styles.statsInfoSub}>played this month</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const content = (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scrollContent, (Platform.OS === 'web' && !isCompact) && styles.scrollContentWeb]}
    >
      <View style={styles.mainLayout}>
        <View style={styles.centerContent}>

          <View style={styles.favoritesList}>
            {loading ? (
              <ActivityIndicator size="large" color="#01b854" style={{ marginTop: 40 }} />
            ) : favorites.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                <Heart size={48} color="#D1D5DB" strokeWidth={1.5} style={{ marginBottom: 16 }} />
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Inter' }}>No Favorites Yet</Text>
                <Text style={{ fontSize: 15, color: '#6B7280', fontFamily: 'Inter', marginTop: 8 }}>Grounds you heart will appear here.</Text>
              </View>
            ) : (
              favorites.map(ground => (
                <TouchableOpacity 
                  key={ground.id} 
                  style={[styles.favCard, isCompact && styles.favCardCompact]}
                  activeOpacity={0.9}
                  onPress={() => {
                    const citySlug = (ground.location || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    const nameSlug = (ground.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    router.push(`/ground/${citySlug}/${nameSlug}`);
                  }}
                >
                  <Image source={{ uri: ground.image }} style={[styles.favImage, isCompact && styles.favImageCompact]} />
                  <View style={[styles.favInfo, isCompact && styles.favInfoCompact]}>
                    <View style={styles.favTopRow}>
                      <Text style={styles.favName} numberOfLines={1}>{ground.name}</Text>
                      <TouchableOpacity>
                        <MoreVertical size={20} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.favMetaRow}>
                      <Text style={styles.favRatingNum}>{ground.rating.toFixed(1)}</Text>
                      <View style={styles.starsContainer}>{renderStars(ground.rating)}</View>
                      <Text style={styles.favMetaText}>({ground.reviews} ratings)</Text>
                      <Text style={styles.favMetaBullet}>•</Text>
                      <Text style={styles.favMetaText}>{ground.location}</Text>
                      <Text style={styles.favMetaBullet}>•</Text>
                      <Text style={styles.favMetaText}>₹{ground.price}/match</Text>
                    </View>
                    <View style={styles.favBottomRow}>
                      <Text style={styles.favPriceBig}>₹{ground.price}/match</Text>
                      <View style={styles.favActions}>
                        <TouchableOpacity style={styles.bookBtn} onPress={() => {
                          const citySlug = (ground.location || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                          const nameSlug = (ground.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                          router.push(`/ground/${citySlug}/${nameSlug}`);
                        }}>
                          <Text style={styles.bookBtnTxt}>Book Now</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removeBtn}
                          onPress={() => removeFavorite(ground.id)}
                        >
                          <Text style={styles.removeBtnTxt}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {!isCompact && renderRightPanel()}
      </View>
    </ScrollView>
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
    paddingBottom: 40,
  },
  scrollContentWeb: {
    padding: 0,
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
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#1e293b',
    fontFamily: 'Inter',
    fontWeight: '500',
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
  topSportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sportAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#043529',
  },
  sportName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  sportBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  sportBtnTxt: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  recAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#94A3B8',
  },
  recInfo: {
    flex: 1,
  },
  recName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  recSub: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  recBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  recBtnTxt: {
    color: '#00ea6b',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutMock: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderWidth: 12,
    borderColor: '#c8f35c',
    borderTopColor: '#e2e8f0',
    borderRightColor: '#c8f35c',
    borderBottomColor: '#c8f35c',
    borderLeftColor: '#c8f35c',
    transform: [{ rotate: '-45deg' }],
  },
  donutInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutPercentText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  statsInfoBlock: {
    flex: 1,
  },
  statsInfoLabel: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  statsInfoSub: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  statsInfoHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    marginTop: 8,
  },
});
