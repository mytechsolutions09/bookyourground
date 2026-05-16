import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  Image,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, MapPin, Star, Filter, Search, ArrowUpDown, TrendingUp } from 'lucide-react-native';
import { TextInput } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SPORT_NAMES: Record<string, string> = {
  cricket: 'Cricket Grounds',
  football: 'Football Turfs',
  box: 'Box Cricket',
  nets: 'Cricket Nets',
  multi: 'Multi-Sport',
  all: 'All Grounds'
};

export default function SportExploreScreen() {
  const { sport = 'cricket' } = useLocalSearchParams<{ sport: string }>();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating' | 'none'>('none');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadGrounds();
  }, [sport]);

  const loadGrounds = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('grounds')
        .select(`
          *,
          ground_images (*)
        `)
        .eq('active', true)
        .eq('approved', true);

      if (sport !== 'all') {
        query = query.ilike('pitch_type', `%${sport}%`);
      }

      console.log('Fetching grounds for sport:', sport);
      const { data, error } = await query.order('name');

      if (error) throw error;
      console.log('Fetched grounds count:', data?.length || 0);
      setGrounds(data || []);
    } catch (error) {
      console.error('Error loading sport grounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const makeGroundPath = (g: any) => {
    const citySlug = (g.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const nameSlug = (g.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `/ground/${citySlug}/${nameSlug}`;
  };

  const filteredAndSortedGrounds = React.useMemo(() => {
    let result = [...grounds];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => 
        (g.name || '').toLowerCase().includes(q) || 
        (g.city || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'price_asc') {
      result.sort((a, b) => (Number(a.min_price) || 0) - (Number(b.min_price) || 0));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (Number(b.min_price) || 0) - (Number(a.min_price) || 0));
    } else if (sortBy === 'rating') {
      // Assuming rating is 4.8 for now as per mockup, but in real it would be avg of reviews
      result.sort((a: any, b: any) => {
        const aRating = a.reviews?.length > 0 ? a.reviews.reduce((s: any, r: any) => s + (r.rating || 0), 0) / a.reviews.length : 0;
        const bRating = b.reviews?.length > 0 ? b.reviews.reduce((s: any, r: any) => s + (r.rating || 0), 0) / b.reviews.length : 0;
        return bRating - aRating;
      });
    }

    return result;
  }, [grounds, searchQuery, sortBy]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{SPORT_NAMES[sport as string] || 'Explore'}</Text>
            <Text style={styles.headerSub}>{filteredAndSortedGrounds.length} venues available</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or city..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Sort Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortContainer}
        >
          <TouchableOpacity 
            onPress={() => setSortBy(sortBy === 'price_asc' ? 'none' : 'price_asc')}
            style={[styles.sortChip, sortBy === 'price_asc' && styles.sortChipActive]}
          >
            <ArrowUpDown size={14} color={sortBy === 'price_asc' ? '#a5ff8a' : '#64748B'} />
            <Text style={[styles.sortText, sortBy === 'price_asc' && styles.sortTextActive]}>Price: Low to High</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setSortBy(sortBy === 'price_desc' ? 'none' : 'price_desc')}
            style={[styles.sortChip, sortBy === 'price_desc' && styles.sortChipActive]}
          >
            <ArrowUpDown size={14} color={sortBy === 'price_desc' ? '#a5ff8a' : '#64748B'} />
            <Text style={[styles.sortText, sortBy === 'price_desc' && styles.sortTextActive]}>Price: High to Low</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSortBy(sortBy === 'rating' ? 'none' : 'rating')}
            style={[styles.sortChip, sortBy === 'rating' && styles.sortChipActive]}
          >
            <TrendingUp size={14} color={sortBy === 'rating' ? '#a5ff8a' : '#64748B'} />
            <Text style={[styles.sortText, sortBy === 'rating' && styles.sortTextActive]}>Best Rated</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color="#01b854" size="large" />
          </View>
        ) : filteredAndSortedGrounds.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No venues match your current filters.</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setSearchQuery('');
                setSortBy('none');
              }}
            >
              <Text style={styles.retryText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredAndSortedGrounds.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                onPress={() => router.push(makeGroundPath(item) as any)}
                style={styles.groundCard}
              >
                <Image
                  source={{
                    uri: item.ground_images?.find((img: any) => img.is_primary)?.image_url ||
                         item.ground_images?.[0]?.image_url ||
                         'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg'
                  }}
                  style={styles.cardImage}
                />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.ratingBox}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.ratingText}>4.8</Text>
                    </View>
                  </View>
                  
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <MapPin size={14} color="#64748B" />
                      <Text style={styles.metaText}>{item.city}</Text>
                    </View>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>{item.pitch_type}</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.priceLabel}>Starting from</Text>
                      <Text style={styles.priceValue}>₹{item.min_price || '800'}<Text style={styles.priceUnit}>/match</Text></Text>
                    </View>
                    <View style={styles.bookButton}>
                      <Text style={styles.bookButtonText}>Book Now</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  sortContainer: {
    marginTop: 12,
    gap: 8,
    paddingBottom: 4,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  sortTextActive: {
    color: '#a5ff8a',
  },
  scrollContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  listContainer: {
    gap: 20,
  },
  groundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardInfo: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
    fontFamily: 'Inter',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    fontFamily: 'Inter',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#01b854',
    fontFamily: 'Inter',
  },
  priceUnit: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  bookButton: {
    backgroundColor: '#01b854',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  retryText: {
    color: '#01b854',
    fontWeight: '700',
  }
});
