import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text as RNText, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Platform, 
  TextInput as RNTextInput, 
  useWindowDimensions, 
  ActivityIndicator,
  Pressable
} from 'react-native';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ArrowRight, 
  Star, 
  ShoppingCart,
  Heart,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react-native';
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
  withSequence,
  interpolate,
  Extrapolate,
  withSpring
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
        { width, height, backgroundColor: '#E2E8F0', borderRadius: 12 }, 
        animatedStyle, 
        style
      ]} 
    />
  );
};

export default function ShopScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = useMemo(() => (width - 56) / 2, [width]);

  const ProductSkeleton = () => (
    <View style={[styles.productCard, { width: Platform.OS === 'web' && !isSmall ? '23%' : cardWidth }]}>
      <View style={styles.imageWrapper}>
        <Skeleton width="100%" height="100%" style={{ borderRadius: 20 }} />
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

  const HeroSkeleton = () => (
    <View style={styles.heroWrapper}>
      <Skeleton width="100%" height="100%" style={{ borderRadius: 0 }} />
      <View style={[styles.heroContent, { paddingTop: insets.top + 60 }]}>
        <Skeleton width={100} height={24} style={{ borderRadius: 20, marginBottom: 12 }} />
        <Skeleton width="70%" height={42} style={{ marginBottom: 12 }} />
        <Skeleton width="85%" height={22} style={{ marginBottom: 28 }} />
        <Skeleton width={160} height={48} style={{ borderRadius: 30 }} />
      </View>
    </View>
  );

  const CategorySkeleton = () => (
    <View style={styles.categoryList}>
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} width={100} height={44} style={{ borderRadius: 25, marginRight: 10 }} />
      ))}
    </View>
  );

  const isSmall = width < 900;
  const { setTabBarVisible } = useUI();
  const { user } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);

  const scrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 80;

  useEffect(() => {
    loadShopData();
    if (user) loadCartCount();
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, [user]);

  const loadCartCount = async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from('shop_cart')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (!error && count !== null) {
        setCartCount(count);
      }
    } catch (err) {
      console.error('Error loading cart count:', err);
    }
  };

  const loadShopData = async () => {
    try {
      setLoading(true);
      const { data: catData } = await supabase
        .from('shop_categories')
        .select('*')
        .order('sort_order');
      setCategories(catData || []);

      let query = supabase.from('shop_products').select('*');
      const { data: prodData } = await query.order('created_at', { ascending: false });
      setProducts(prodData || []);
    } catch (err) {
      console.error('Error loading shop data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory !== 'all') {
      const catId = categories.find(c => c.name === activeCategory)?.id;
      if (catId) result = result.filter(p => p.category_id === catId);
    }
    if (searchQuery) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return result;
  }, [products, activeCategory, searchQuery, categories]);

  const featuredProduct = useMemo(() => 
    products.find(p => p.is_featured) || products[0], 
  [products]);

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
      loadCartCount();
      if (Platform.OS === 'web') alert('Added to cart!');
      else router.push('/shop/cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  const verticalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      scrollY.value = currentY;
      
      const diff = currentY - lastScrollY.value;
      
      if (diff > 10 && currentY > 100) {
        if (headerTranslateY.value === 0) {
          headerTranslateY.value = withTiming(-HEADER_HEIGHT - insets.top, { 
            duration: 400,
            easing: Easing.out(Easing.quad)
          });
          runOnJS(setTabBarVisible)(false);
        }
      } else if (diff < -15 || currentY < 50) {
        if (headerTranslateY.value < 0) {
          headerTranslateY.value = withTiming(0, { 
            duration: 400,
            easing: Easing.out(Easing.quad)
          });
          runOnJS(setTabBarVisible)(true);
        }
      }
      lastScrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: interpolate(scrollY.value, [0, 50], [1, 0.98], Extrapolate.CLAMP),
    backgroundColor: scrollY.value > 20 ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
  }));

  const bannerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollY.value, [-100, 0], [1.2, 1], Extrapolate.CLAMP) }
    ],
  }));

  const renderProductCard = (product: any) => {
    const category = categories.find(c => c.id === product.category_id)?.name || 'Equipment';
    return (
      <Pressable 
        key={product.id} 
        style={({ pressed }) => [
          styles.productCard,
          { width: cardWidth },
          pressed && { transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => router.push({ pathname: '/shop/[id]', params: { id: product.id } })}
      >
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' }} 
            style={styles.productImage} 
          />
          {product.tag && (
            <View style={styles.tagBadge}>
              <RNText style={styles.tagText}>{product.tag}</RNText>
            </View>
          )}
          <TouchableOpacity style={styles.favoriteBtn}>
            <Heart size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
        <View style={styles.productInfo}>
          <RNText style={styles.productCategory}>{category}</RNText>
          <RNText style={styles.productName} numberOfLines={1}>{product.name}</RNText>
          
          <View style={styles.ratingRow}>
            <Star size={14} color="#dc8d3c" fill="#dc8d3c" />
            <RNText style={styles.ratingText}>{Number(product.rating || 4.5).toFixed(1)}</RNText>
            <RNText style={styles.reviewCount}>({product.review_count || 12})</RNText>
          </View>
          
          <View style={styles.priceRow}>
            <View>
              <RNText style={styles.productPrice}>₹{Number(product.price).toLocaleString('en-IN')}</RNText>
              {product.old_price && (
                <RNText style={styles.oldPrice}>₹{Number(product.old_price).toLocaleString('en-IN')}</RNText>
              )}
            </View>
            <TouchableOpacity 
              style={styles.addToCartBtn}
              onPress={() => addToCart(product.id)}
            >
              <ShoppingCart size={18} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    );
  };

  const content = (onScroll?: any) => (
    <Animated.ScrollView 
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={styles.container} 
      contentContainerStyle={[styles.scrollContent]}
    >
      {/* Hero Banner */}
      {loading ? (
        <HeroSkeleton />
      ) : (
        <Animated.View style={[styles.heroWrapper, bannerAnimatedStyle]}>
          {featuredProduct ? (
            <Image 
              source={{ uri: featuredProduct.images?.[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80' }} 
              style={styles.heroImageBg} 
            />
          ) : (
            <View style={[styles.heroImageBg, { backgroundColor: '#2b2f4b' }]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(43, 47, 75, 0.8)', '#2b2f4b']}
            style={styles.heroOverlay}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + 60 }]}>
            <View style={styles.trendingBadge}>
              <TrendingUp size={14} color="#dc8d3c" />
              <RNText style={styles.trendingText}>NEW ARRIVAL</RNText>
            </View>
            <RNText style={styles.heroTitle}>{featuredProduct?.name || 'Pro Cricket Gear'}</RNText>
            <RNText style={styles.heroSubtitle} numberOfLines={2}>
              {featuredProduct?.description || 'Experience the next generation of performance equipment designed for elite athletes.'}
            </RNText>
            <TouchableOpacity 
              style={styles.heroBtn}
              onPress={() => featuredProduct && router.push({ pathname: '/shop/[id]', params: { id: featuredProduct.id } })}
            >
              <RNText style={styles.heroBtnText}>Explore Collection</RNText>
              <View style={styles.heroBtnIcon}>
                <ArrowRight size={18} color="#2b2f4b" />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Search Bar Floating */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color="#94A3B8" />
            <RNTextInput 
              style={styles.searchInput}
              placeholder="Search gear, brands, accessories..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterBtn}>
              <Filter size={20} color="#2b2f4b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Pills */}
        <View style={styles.categoriesSection}>
          {loading ? (
            <CategorySkeleton />
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.categoryList}
            >
              <TouchableOpacity 
                style={[styles.categoryPill, activeCategory === 'all' && styles.categoryPillActive]}
                onPress={() => setActiveCategory('all')}
              >
                <RNText style={[styles.categoryPillText, activeCategory === 'all' && styles.categoryPillTextActive]}>
                  All Gear
                </RNText>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.categoryPill, activeCategory === cat.name && styles.categoryPillActive]}
                  onPress={() => setActiveCategory(cat.name)}
                >
                  <RNText style={[styles.categoryPillText, activeCategory === cat.name && styles.categoryPillTextActive]}>
                    {cat.name}
                  </RNText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Special Offers Section */}
        <View style={styles.promoSection}>
           <LinearGradient
            colors={['#dc8d3c', '#dcc093']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoCard}
           >
              <View>
                <RNText style={styles.promoTitle}>Season Sale</RNText>
                <RNText style={styles.promoSubtitle}>Up to 40% OFF on Bats</RNText>
              </View>
              <View style={styles.promoBadge}>
                 <Tag size={16} color="#FFFFFF" fill="#FFFFFF" />
                 <RNText style={styles.promoCode}>GEAR40</RNText>
              </View>
           </LinearGradient>
        </View>

        {/* Products Grid */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <RNText style={styles.sectionTitle}>
              {activeCategory === 'all' ? 'Featured Items' : activeCategory}
            </RNText>
            <TouchableOpacity style={styles.viewAllRow}>
              <RNText style={styles.viewAllText}>View All</RNText>
              <ChevronRight size={16} color="#dc8d3c" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.productGrid}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <ProductSkeleton key={i} />)}
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <ShoppingBag size={48} color="#CBD5E1" />
              <RNText style={styles.emptyText}>No matches for your search.</RNText>
              <TouchableOpacity onPress={() => {setSearchQuery(''); setActiveCategory('all');}}>
                <RNText style={styles.resetText}>Clear filters</RNText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {filteredProducts.map(product => renderProductCard(product))}
            </View>
          )}
        </View>
      </View>
    </Animated.ScrollView>
  );

  if (Platform.OS === 'web' && !isSmall) {
    return <WebLayout>{content()}</WebLayout>;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.floatingHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.cartIcon} onPress={() => router.push('/shop/cart')}>
          <ShoppingCart size={24} color="#FFFFFF" strokeWidth={2.5} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
               <RNText style={styles.cartBadgeText}>{cartCount}</RNText>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {content(verticalScrollHandler)}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    height: 100,
    alignItems: 'center',
  },
  cartIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#dc8d3c',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2b2f4b',
  },
  heroWrapper: {
    height: 420,
    width: '100%',
    position: 'relative',
    backgroundColor: '#2b2f4b',
  },
  heroImageBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 141, 60, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 12,
  },
  trendingText: {
    color: '#dc8d3c',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 46,
    marginBottom: 12,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: '85%',
  },
  heroBtn: {
    backgroundColor: '#FFFFFF',
    paddingLeft: 24,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 16,
  },
  heroBtnText: {
    color: '#2b2f4b',
    fontWeight: '800',
    fontSize: 15,
  },
  heroBtnIcon: {
    backgroundColor: '#dc8d3c',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContent: {
    marginTop: -25,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  filterBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoriesSection: {
    marginBottom: 24,
  },
  categoryList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: '#2b2f4b',
    borderColor: '#2b2f4b',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  promoSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  promoCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoTitle: {
    color: '#2b2f4b',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  promoSubtitle: {
    color: '#2b2f4b',
    fontSize: 20,
    fontWeight: '800',
  },
  promoBadge: {
    backgroundColor: '#2b2f4b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoCode: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  productsSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: '#dc8d3c',
    fontWeight: '800',
    fontSize: 14,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 8,
  },
  imageWrapper: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tagBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#2b2f4b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    color: '#dc8d3c',
    fontSize: 9,
    fontWeight: '900',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  productCategory: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 12,
    color: '#dc8d3c',
    fontWeight: '800',
  },
  reviewCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2b2f4b',
  },
  oldPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: -2,
  },
  addToCartBtn: {
    backgroundColor: '#2b2f4b',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2b2f4b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  resetText: {
    color: '#dc8d3c',
    fontWeight: '800',
    fontSize: 14,
  },
});
