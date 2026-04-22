import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Share, ActivityIndicator, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ChevronLeft, 
  ShoppingCart, 
  Star, 
  Share2, 
  Heart, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  CheckCircle2,
  Package,
  ArrowRight
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setTabBarVisible } = useUI();
  const [product, setProduct] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTabBarVisible(false);
    return () => setTabBarVisible(true);
  }, []);

  useEffect(() => {
    if (id) {
      loadProduct();
      checkIfFavorited();
    }
  }, [id, user?.id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_products')
        .select(`
          *,
          category:shop_categories(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setProduct(data);
    } catch (err) {
      console.error('Error loading product:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorited = async () => {
    if (!user || !id) return;
    try {
      const { data, error } = await supabase
        .from('shop_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', id)
        .single();
      
      setIsFavorited(!!data);
    } catch (err) {
      // Not favorited
      setIsFavorited(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    try {
      if (isFavorited) {
        await supabase
          .from('shop_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', id);
        setIsFavorited(false);
      } else {
        await supabase
          .from('shop_favorites')
          .upsert({ user_id: user.id, product_id: id });
        setIsFavorited(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      const shareUrl = Platform.OS === 'web' ? window.location.href : `https://bookyourground.com/shop/${id}`;
      await Share.share({
        message: `Check out this ${product.name} on Cricket Hub!\n${shareUrl}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const addToCart = async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    if (!product) return;
    try {
      const { error } = await supabase
        .from('shop_cart')
        .upsert({ user_id: user.id, product_id: product.id }, { onConflict: 'user_id,product_id' });
      
      if (error) throw error;
      router.push('/shop/cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  const ProductDetailSkeleton = () => {
    const shimmerAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);

    const opacity = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={styles.fixedImageContainer}>
          <Animated.View style={[styles.mainImage, { backgroundColor: '#F3F4F6', opacity }]} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentWrapper}>
            <View style={styles.infoSection}>
              <Animated.View style={{ height: 12, width: 80, backgroundColor: '#F3F4F6', borderRadius: 4, marginBottom: 8, opacity }} />
              <Animated.View style={{ height: 28, width: '70%', backgroundColor: '#F3F4F6', borderRadius: 4, marginBottom: 12, opacity }} />
              <View style={styles.ratingRow}>
                {[1,2,3,4,5].map(i => <View key={i} style={{ width: 16, height: 16, backgroundColor: '#F3F4F6', borderRadius: 8, marginRight: 4 }} />)}
                <Animated.View style={{ height: 12, width: 100, backgroundColor: '#F3F4F6', borderRadius: 4, opacity }} />
              </View>
              <View style={styles.priceContainer}>
                <Animated.View style={{ height: 24, width: 120, backgroundColor: '#F3F4F6', borderRadius: 4, opacity }} />
              </View>
            </View>
            <View style={styles.trustRow}>
              {[1,2,3].map(i => (
                <View key={i} style={styles.trustItem}>
                  <View style={{ width: 20, height: 20, backgroundColor: '#F3F4F6', borderRadius: 10, marginBottom: 4 }} />
                  <Animated.View style={{ height: 10, width: 50, backgroundColor: '#F3F4F6', borderRadius: 2, opacity }} />
                </View>
              ))}
            </View>
            <View style={styles.section}>
              <Animated.View style={{ height: 18, width: 100, backgroundColor: '#F3F4F6', borderRadius: 4, marginBottom: 12, opacity }} />
              <Animated.View style={{ height: 14, width: '100%', backgroundColor: '#F3F4F6', borderRadius: 4, marginBottom: 8, opacity }} />
              <Animated.View style={{ height: 14, width: '100%', backgroundColor: '#F3F4F6', borderRadius: 4, marginBottom: 8, opacity }} />
              <Animated.View style={{ height: 14, width: '60%', backgroundColor: '#F3F4F6', borderRadius: 4, opacity }} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <Text>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: '#2b2f4b', marginTop: 12 }}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const content = (
    <View style={{ flex: 1 }}>
      {/* Fixed Background Image */}
      <View style={styles.fixedImageContainer}>
        <Image 
          source={{ uri: product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' }} 
          style={styles.mainImage} 
        />
        {product.tag && (
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>{product.tag}</Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.contentWrapper}>
          {/* Basic Info */}
          <View style={styles.infoSection}>
            <Text style={styles.categoryText}>{product.category?.name || 'Equipment'}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((_, i) => (
                <Star 
                  key={i} 
                  size={16} 
                  color={i < Math.floor(product.rating || 0) ? "#dc8d3c" : "#D1D5DB"} 
                  fill={i < Math.floor(product.rating || 0) ? "#dc8d3c" : "none"} 
                />
              ))}
              <Text style={styles.reviewsText}>{Number(product.rating || 0).toFixed(1)} ({product.review_count || 0} reviews)</Text>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>₹{Number(product.price).toLocaleString('en-IN')}</Text>
              {product.discount_price && (
                <Text style={styles.originalPrice}>₹{Number(product.discount_price).toLocaleString('en-IN')}</Text>
              )}
            </View>
          </View>

          {/* trust badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <ShieldCheck size={20} color="#2b2f4b" />
              <Text style={styles.trustText}>Authentic</Text>
            </View>
            <View style={[styles.trustItem, styles.trustDivider]}>
              <Truck size={20} color="#2b2f4b" />
              <Text style={styles.trustText}>Free Delivery</Text>
            </View>
            <View style={styles.trustItem}>
              <RotateCcw size={20} color="#2b2f4b" />
              <Text style={styles.trustText}>7 Day Return</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          {/* Features */}
          {product.features && product.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Features</Text>
              <View style={styles.featureList}>
                {product.features.map((feature: string, index: number) => (
                  <View key={index} style={styles.featureItem}>
                    <CheckCircle2 size={18} color="#dc8d3c" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              <View style={styles.specTable}>
                {Object.entries(product.specifications).map(([key, value]: [string, any], index) => (
                  <View key={key} style={[styles.specRow, index % 2 === 0 && styles.specRowAlt]}>
                    <Text style={styles.specKey}>{key}</Text>
                    <Text style={styles.specValue}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.footerGap} />
        </View>
      </ScrollView>

      {/* Header Overlay - Absolute and rendered last to sit on top of everything */}
      <View style={styles.imageOverlay}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#2b2f4b" />
        </TouchableOpacity>
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionCircle} onPress={handleShare}>
            <Share2 size={20} color="#2b2f4b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCircle} onPress={toggleFavorite}>
            <Heart 
              size={20} 
              color={isFavorited ? "#EF4444" : "#2b2f4b"} 
              fill={isFavorited ? "#EF4444" : "none"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const bottomActions = (
    <View style={styles.bottomBar}>
      <TouchableOpacity 
        style={styles.cartIconBtn}
        onPress={() => router.push('/shop/cart')}
      >
        <ShoppingCart size={24} color="#2b2f4b" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.addToCartSecondary}
        onPress={addToCart}
      >
        <Text style={styles.addToCartSecondaryText}>Add to Cart</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.buyNowBtn}
        onPress={addToCart}
      >
        <Text style={styles.buyNowText}>Buy Now</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <Stack.Screen options={{ title: product.name }} />
        <View style={styles.webContainer}>
          <View style={styles.webGrid}>
            {/* Left: Image */}
            <View style={styles.webImageCol}>
              <View style={styles.webMainImageWrapper}>
                <Image 
                  source={{ uri: product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' }} 
                  style={styles.webMainImage} 
                />
                {product.tag && (
                  <View style={styles.webHeroTag}>
                    <Text style={styles.heroTagText}>{product.tag}</Text>
                  </View>
                )}
              </View>
              <View style={styles.webThumbnails}>
                {(product.images || []).map((img: string, i: number) => (
                  <View key={i} style={[styles.webThumb, i === 0 && styles.webThumbActive]}>
                    <Image source={{ uri: img }} style={styles.webThumbImage} />
                  </View>
                ))}
              </View>
            </View>

            {/* Right: Info */}
            <View style={styles.webInfoCol}>
              <Text style={styles.webCategory}>{product.category?.name || 'Equipment'}</Text>
              <Text style={styles.webProductName}>{product.name}</Text>
              
              <View style={styles.webRatingRow}>
                <View style={styles.webStars}>
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <Star 
                      key={i} 
                      size={20} 
                      color={i < Math.floor(Number(product.rating || 0)) ? "#dc8d3c" : "#E5E7EB"} 
                      fill={i < Math.floor(Number(product.rating || 0)) ? "#dc8d3c" : "none"} 
                    />
                  ))}
                </View>
                <Text style={styles.webReviewsText}>{Number(product.rating || 0).toFixed(1)} ({product.review_count || 0} customer reviews)</Text>
              </View>

              <View style={styles.webPriceContainer}>
                <Text style={styles.webCurrentPrice}>₹{Number(product.price).toLocaleString('en-IN')}</Text>
                {product.discount_price && (
                  <Text style={styles.webOriginalPrice}>₹{Number(product.discount_price).toLocaleString('en-IN')}</Text>
                )}
                {product.tag && (
                  <View style={styles.webDiscountBadge}>
                    <Text style={styles.webDiscountText}>{product.tag}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.webDescription}>{product.description}</Text>

              <View style={styles.webActionRow}>
                <View style={styles.quantitySelector}>
                  <TouchableOpacity style={styles.qtyBtn}><Text>-</Text></TouchableOpacity>
                  <Text style={styles.qtyText}>1</Text>
                  <TouchableOpacity style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.webAddToCartBtn} onPress={addToCart}>
                  <ShoppingCart size={20} color="#FFFFFF" />
                  <Text style={styles.webAddToCartText}>Add to Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.webWishlistBtn} onPress={toggleFavorite}>
                  <Heart size={20} color={isFavorited ? "#EF4444" : "#2b2f4b"} fill={isFavorited ? "#EF4444" : "none"} />
                </TouchableOpacity>
              </View>

              <View style={styles.webTrustGrid}>
                <View style={styles.webTrustItem}>
                  <Truck size={24} color="#2b2f4b" />
                  <Text style={styles.webTrustTitle}>Free Shipping</Text>
                  <Text style={styles.webTrustSub}>On orders over ₹999</Text>
                </View>
                <View style={styles.webTrustItem}>
                  <ShieldCheck size={24} color="#2b2f4b" />
                  <Text style={styles.webTrustTitle}>Secure Payment</Text>
                  <Text style={styles.webTrustSub}>100% Secure Checkout</Text>
                </View>
                <View style={styles.webTrustItem}>
                  <RotateCcw size={24} color="#2b2f4b" />
                  <Text style={styles.webTrustTitle}>Easy Returns</Text>
                  <Text style={styles.webTrustSub}>7-day return policy</Text>
                </View>
              </View>

              <View style={styles.webSpecSection}>
                <Text style={styles.webSectionTitle}>Product Details</Text>
                <View style={styles.webSpecTable}>
                  {Object.entries(product.specifications || {}).map(([key, value]: [string, any]) => (
                    <View key={key} style={styles.webSpecRow}>
                      <Text style={styles.webSpecKey}>{key}</Text>
                      <Text style={styles.webSpecValue}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </WebLayout>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen options={{ headerShown: false }} />
      {content}
      {bottomActions}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fixedImageContainer: {
    height: 440,
    backgroundColor: '#F9FAFB',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 400,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroTag: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#2b2f4b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroTagText: {
    color: '#dc8d3c',
    fontWeight: '800',
    fontSize: 12,
    fontFamily: 'Inter',
  },
  contentWrapper: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    backgroundColor: '#FFFFFF',
  },
  infoSection: {
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 12,
    color: '#dc8d3c',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  productName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2b2f4b',
    marginBottom: 12,
    lineHeight: 32,
    fontFamily: 'Inter',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  reviewsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
    fontFamily: 'Inter',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2b2f4b',
    fontFamily: 'Inter',
  },
  originalPrice: {
    fontSize: 18,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontFamily: 'Inter',
  },
  discountBadge: {
    backgroundColor: 'rgba(220, 141, 60, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#dc8d3c',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  trustRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  trustDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  trustText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2b2f4b',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  descriptionText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  specTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  specRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  specKey: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  specValue: {
    flex: 1.5,
    fontSize: 14,
    color: '#2b2f4b',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  footerGap: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
  },
  cartIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc8d3c',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  addToCartSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartSecondaryText: {
    color: '#2b2f4b',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  buyNowBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2b2f4b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    fontFamily: 'Inter',
  },

  // Web Styles
  webContainer: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    padding: 40,
  },
  webGrid: {
    flexDirection: 'row',
    gap: 60,
  },
  webImageCol: {
    flex: 1,
  },
  webMainImageWrapper: {
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webMainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  webHeroTag: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#2b2f4b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  webThumbnails: {
    flexDirection: 'row',
    gap: 16,
  },
  webThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F9FAFB',
  },
  webThumbActive: {
    borderColor: '#2b2f4b',
  },
  webThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  webInfoCol: {
    flex: 1.2,
  },
  webCategory: {
    color: '#dc8d3c',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  webProductName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#2b2f4b',
    lineHeight: 56,
    marginBottom: 20,
  },
  webRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  webStars: {
    flexDirection: 'row',
    gap: 4,
  },
  webReviewsText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  webPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 32,
  },
  webCurrentPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2b2f4b',
  },
  webOriginalPrice: {
    fontSize: 24,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  webDiscountBadge: {
    backgroundColor: 'rgba(220, 141, 60, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webDiscountText: {
    color: '#dc8d3c',
    fontSize: 14,
    fontWeight: '700',
  },
  webDescription: {
    fontSize: 18,
    color: '#4B5563',
    lineHeight: 28,
    marginBottom: 40,
  },
  webActionRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 48,
    alignItems: 'center',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700',
    width: 40,
    textAlign: 'center',
  },
  webAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2f4b',
    paddingHorizontal: 32,
    height: 56,
    borderRadius: 12,
    gap: 12,
  },
  webAddToCartText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  webWishlistBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTrustGrid: {
    flexDirection: 'row',
    gap: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: 32,
    marginBottom: 48,
  },
  webTrustItem: {
    flex: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  webTrustTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b2f4b',
    marginTop: 12,
    marginBottom: 4,
  },
  webTrustSub: {
    fontSize: 14,
    color: '#6B7280',
  },
  webSpecSection: {
    marginBottom: 40,
  },
  webSectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2b2f4b',
    marginBottom: 24,
  },
  webSpecTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
  },
  webSpecRow: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  webSpecKey: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  webSpecValue: {
    flex: 2,
    fontSize: 16,
    color: '#2b2f4b',
    fontWeight: '700',
  },
});
