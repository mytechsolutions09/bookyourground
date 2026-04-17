import React from 'react';
import { View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput as RNTextInput, useWindowDimensions } from 'react-native';
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
  runOnJS
} from 'react-native-reanimated';
import { useUI } from '@/contexts/UIContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FEATURED_PRODUCTS = [
  {
    id: '1',
    name: 'SS Ton Reserve Edition',
    category: 'Bats',
    price: '₹24,500',
    rating: 4.9,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&q=80',
    tag: 'Premium'
  },
  {
    id: '2',
    name: 'SG Pro Soft Balls (Pack of 6)',
    category: 'Balls',
    price: '₹1,200',
    rating: 4.7,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1593766788306-285610866ea4?w=400&q=80',
    tag: 'Best Seller'
  },
  {
    id: '3',
    name: 'Adidas Adipower Vector',
    category: 'Shoes',
    price: '₹8,990',
    rating: 4.8,
    reviews: 56,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
  }
];

const CATEGORIES = [
  { id: '1', name: 'Bats', icon: '🏏' },
  { id: '2', name: 'Balls', icon: '⚾' },
  { id: '3', name: 'Shoes', icon: '👟' },
  { id: '4', name: 'Apparel', icon: '👕' },
  { id: '5', name: 'Safety', icon: '🛡️' },
];

export default function ShopScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmall = width < 900;
  const { setTabBarVisible } = useUI();

  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const HEADER_HEIGHT = 75; // Reduced navbar height

  React.useEffect(() => {
    return () => setTabBarVisible(true);
  }, []);

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
      <LinearGradient
        colors={['#043529', '#06392e']}
        style={styles.heroBanner}
      >
        <View style={styles.heroTextContainer}>
          <RNText style={styles.heroTag}>NEW ARRIVAL</RNText>
          <RNText style={styles.heroTitle}>Premium Cricket Gear</RNText>
          <RNText style={styles.heroSubtitle}>Gear up with the world's finest cricket equipment.</RNText>
          <TouchableOpacity 
            style={styles.heroBtn}
            onPress={() => router.push({ pathname: '/shop/[id]', params: { id: '1' } })}
          >
            <RNText style={styles.heroBtnText}>Shop Now</RNText>
            <ArrowRight size={18} color="#043529" />
          </TouchableOpacity>
        </View>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&q=80' }} 
          style={styles.heroImage} 
        />
      </LinearGradient>

      {/* Categories */}
      <View style={styles.section}>
        <RNText style={styles.sectionTitle}>Shop by Category</RNText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.categoryCard}>
              <RNText style={styles.categoryIcon}>{cat.icon}</RNText>
              <RNText style={styles.categoryName}>{cat.name}</RNText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <RNText style={styles.sectionTitle}>Featured Equipment</RNText>
          <TouchableOpacity>
            <RNText style={styles.viewAllText}>View All</RNText>
          </TouchableOpacity>
        </View>
        <View style={styles.productGrid}>
          {FEATURED_PRODUCTS.map(product => (
            <TouchableOpacity 
              key={product.id} 
              style={styles.productCard}
              onPress={() => router.push({ pathname: '/shop/[id]', params: { id: product.id } })}
            >
              <View style={styles.imageWrapper}>
                <Image source={{ uri: product.image }} style={styles.productImage} />
                {product.tag && (
                  <View style={styles.tagBadge}>
                    <RNText style={styles.tagText}>{product.tag}</RNText>
                  </View>
                )}
              </View>
              <View style={styles.productInfo}>
                <RNText style={styles.productCategory}>{product.category}</RNText>
                <RNText style={styles.productName} numberOfLines={1}>{product.name}</RNText>
                <View style={styles.ratingRow}>
                  <Star size={14} color="#FBBF24" fill="#FBBF24" />
                  <RNText style={styles.ratingText}>{product.rating} ({product.reviews})</RNText>
                </View>
                <View style={styles.priceRow}>
                  <RNText style={styles.productPrice}>{product.price}</RNText>
                  <TouchableOpacity style={styles.addToCartBtn}>
                    <ShoppingCart size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
              <TouchableOpacity style={styles.iconBtn}><Search size={24} color="#01b854" /></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}><ShoppingCart size={24} color="#01b854" /></TouchableOpacity>
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
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
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
