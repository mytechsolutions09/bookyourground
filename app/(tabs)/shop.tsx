import React, { useEffect, useState } from 'react';
import { View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput as RNTextInput, useWindowDimensions, ActivityIndicator } from 'react-native';
import { ShoppingBag, Search, Filter, ArrowRight, Star, ShoppingCart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  useAnimatedScrollHandler,
  runOnJS,
  withRepeat,
  withSequence
} from 'react-native-reanimated';
import { useUI } from '@/contexts/UIContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const Skeleton = ({ width, height, style }: any) => {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        { width, height, backgroundColor: '#EDF2F7', borderRadius: 8 }, 
        animatedStyle, 
        style
      ]} 
    />
  );
};

const ProductSkeleton = () => (
  <View style={styles.productCard}>
    <View style={styles.imageWrapper}>
      <Skeleton width="100%" height="100%" />
    </View>
    <View style={styles.productInfo}>
      <Skeleton width="40%" height={10} style={{ marginBottom: 8 }} />
      <Skeleton width="90%" height={18} style={{ marginBottom: 12 }} />
      <View style={styles.ratingRow}>
        <Skeleton width={60} height={12} />
      </View>
      <View style={[styles.priceRow, { marginTop: 4 }]}>
        <Skeleton width="50%" height={22} />
        <Skeleton width={36} height={36} style={{ borderRadius: 18 }} />
      </View>
    </View>
  </View>
);


export default function ShopScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmall = width < 900;
  const { setTabBarVisible } = useUI();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 75;

  useEffect(() => {
    loadShopData();
    return () => setTabBarVisible(true);
  }, []);

  const loadShopData = async () => {
    try {
      setLoading(true);
      // Load categories
      const { data: catData } = await supabase
        .from('shop_categories')
        .select('*')
        .order('sort_order');
      setCategories(catData || []);

      // Load products
      let query = supabase.from('shop_products').select('*');
      if (activeCategory !== 'all') {
        const catId = catData?.find(c => c.name === activeCategory)?.id;
        if (catId) query = query.eq('category_id', catId);
      }
      
      const { data: prodData } = await query.order('created_at', { ascending: false });
      setProducts(prodData || []);
    } catch (err) {
      console.error('Error loading shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShopData();
  }, [activeCategory]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredProduct = products.find(p => p.is_featured) || products[0];

  const addToCart = async (productId: string) => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    try {
      const { error } = await supabase
        .from('shop_cart')
        .upsert({ user_id: user.id, product_id: productId }, { onConflict: 'user_id,product_id' });
      
      if (error) throw error;
      if (Platform.OS === 'web') alert('Added to cart!');
      else router.push('/shop/cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

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
  }));

  const content = (onScroll?: any) => (
    <Animated.ScrollView 
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={styles.container} 
      contentContainerStyle={[styles.scrollContent, onScroll && { paddingTop: HEADER_HEIGHT + insets.top }]}
    >
      {/* Hero Banner */}
      {featuredProduct && (
        <LinearGradient
          colors={['#043529', '#06392e']}
          style={styles.heroBanner}
        >
          <View style={styles.heroTextContainer}>
            <RNText style={styles.heroTag}>{featuredProduct.tag || 'FEATURED'}</RNText>
            <RNText style={styles.heroTitle} numberOfLines={2}>{featuredProduct.name}</RNText>
            <RNText style={styles.heroSubtitle} numberOfLines={2}>{featuredProduct.description}</RNText>
            <TouchableOpacity 
              style={styles.heroBtn}
              onPress={() => router.push({ pathname: '/shop/[id]', params: { id: featuredProduct.id } })}
            >
              <RNText style={styles.heroBtnText}>Shop Now</RNText>
              <ArrowRight size={18} color="#043529" />
            </TouchableOpacity>
          </View>
          <Image 
            source={{ uri: featuredProduct.images?.[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&q=80' }} 
            style={styles.heroImage} 
          />
        </LinearGradient>
      )}

      {/* Search Bar Mobile */}
      {Platform.OS !== 'web' && (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color="#94A3B8" />
            <RNTextInput 
              style={styles.searchInput}
              placeholder="Search equipment..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      )}

      {/* Categories */}
      <View style={styles.section}>
        <RNText style={styles.sectionTitle}>Shop by Category</RNText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity 
            style={[styles.categoryCard, activeCategory === 'all' && styles.categoryCardActive]}
            onPress={() => setActiveCategory('all')}
          >
            <RNText style={styles.categoryIcon}>🏆</RNText>
            <RNText style={[styles.categoryName, activeCategory === 'all' && styles.categoryNameActive]}>All</RNText>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.categoryCard, activeCategory === cat.name && styles.categoryCardActive]}
              onPress={() => setActiveCategory(cat.name)}
            >
              <RNText style={styles.categoryIcon}>{cat.icon}</RNText>
              <RNText style={[styles.categoryName, activeCategory === cat.name && styles.categoryNameActive]}>{cat.name}</RNText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <RNText style={styles.sectionTitle}>{activeCategory === 'all' ? 'Popular Equipment' : activeCategory}</RNText>
          <TouchableOpacity>
            <RNText style={styles.viewAllText}>Filter</RNText>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.productGrid}>
            {[1, 2, 3, 4, 5, 6].map(i => <ProductSkeleton key={i} />)}
          </View>
        ) : filteredProducts.length === 0 ? (
          <RNText style={styles.emptyText}>No products found in this category.</RNText>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map(product => {
              const category = categories.find(c => c.id === product.category_id)?.name || 'Equipment';
              return (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.productCard}
                  onPress={() => router.push({ pathname: '/shop/[id]', params: { id: product.id } })}
                >
                  <View style={styles.imageWrapper}>
                    <Image source={{ uri: product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' }} style={styles.productImage} />
                    {product.tag && (
                      <View style={styles.tagBadge}>
                        <RNText style={styles.tagText}>{product.tag}</RNText>
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <RNText style={styles.productCategory}>{category}</RNText>
                    <RNText style={styles.productName} numberOfLines={1}>{product.name}</RNText>
                    <View style={styles.ratingRow}>
                      <Star size={14} color="#FBBF24" fill="#FBBF24" />
                      <RNText style={styles.ratingText}>{Number(product.rating || 0).toFixed(1)} ({product.review_count || 0})</RNText>
                    </View>
                    <View style={styles.priceRow}>
                      <RNText style={styles.productPrice}>₹{Number(product.price).toLocaleString('en-IN')}</RNText>
                      <TouchableOpacity 
                        style={styles.addToCartBtn}
                        onPress={() => addToCart(product.id)}
                      >
                        <ShoppingCart size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </Animated.ScrollView>
  );

  if (Platform.OS === 'web' && !isSmall) {
    return <WebLayout>{content()}</WebLayout>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <Animated.View style={headerAnimatedStyle}>
        <MobileAppNavbar 
          title="Cricket Shop" 
          smallerTitle={true}
          rightAction={
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/shop/cart')}><ShoppingCart size={24} color="#01b854" /></TouchableOpacity>
            </View>
          }
        />
      </Animated.View>
      {content(verticalScrollHandler)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  mobileTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#043529',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBtn: {
    padding: 4,
  },
  heroBanner: {
    margin: 20,
    borderRadius: 24,
    flexDirection: 'row',
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroTextContainer: {
    flex: 1,
    zIndex: 2,
  },
  heroTag: {
    color: '#00ea6b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  heroBtn: {
    backgroundColor: '#00ea6b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
  heroBtnText: {
    color: '#043529',
    fontWeight: '700',
    fontSize: 15,
  },
  heroImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginLeft: 10,
    transform: [{ rotate: '-15deg' }],
    opacity: 0.8,
  },
  section: {
    paddingTop: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#00ea6b',
    fontWeight: '700',
    fontSize: 14,
  },
  categoryScroll: {
    marginTop: 4,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
  },
  categoryCardActive: {
    backgroundColor: '#043529',
    borderColor: '#043529',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  categoryNameActive: {
    color: '#FFFFFF',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#043529',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 14,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrapper: {
    height: 140,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#043529',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    color: '#00ea6b',
    fontSize: 10,
    fontWeight: '800',
  },
  productInfo: {
    padding: 12,
  },
  productCategory: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#043529',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#043529',
  },
  addToCartBtn: {
    backgroundColor: '#043529',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
