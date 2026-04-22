import React, { useEffect, useState } from 'react';
import { View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Share, ActivityIndicator } from 'react-native';
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator color="#01b854" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <RNText>Product not found</RNText>
        <TouchableOpacity onPress={() => router.back()}><RNText style={{ color: '#01b854', marginTop: 12 }}>Go Back</RNText></TouchableOpacity>
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
            <RNText style={styles.heroTagText}>{product.tag}</RNText>
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
            <RNText style={styles.categoryText}>{product.category?.name || 'Equipment'}</RNText>
            <RNText style={styles.productName}>{product.name}</RNText>
            
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((_, i) => (
                <Star 
                  key={i} 
                  size={16} 
                  color={i < Math.floor(product.rating || 0) ? "#FBBF24" : "#D1D5DB"} 
                  fill={i < Math.floor(product.rating || 0) ? "#FBBF24" : "none"} 
                />
              ))}
              <RNText style={styles.reviewsText}>{Number(product.rating || 0).toFixed(1)} ({product.review_count || 0} reviews)</RNText>
            </View>

            <View style={styles.priceContainer}>
              <RNText style={styles.currentPrice}>₹{Number(product.price).toLocaleString('en-IN')}</RNText>
              {product.discount_price && (
                <RNText style={styles.originalPrice}>₹{Number(product.discount_price).toLocaleString('en-IN')}</RNText>
              )}
            </View>
          </View>

          {/* trust badges */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <ShieldCheck size={20} color="#043529" />
              <RNText style={styles.trustText}>Authentic</RNText>
            </View>
            <View style={[styles.trustItem, styles.trustDivider]}>
              <Truck size={20} color="#043529" />
              <RNText style={styles.trustText}>Free Delivery</RNText>
            </View>
            <View style={styles.trustItem}>
              <RotateCcw size={20} color="#043529" />
              <RNText style={styles.trustText}>7 Day Return</RNText>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <RNText style={styles.sectionTitle}>Description</RNText>
            <RNText style={styles.descriptionText}>{product.description}</RNText>
          </View>

          {/* Features */}
          {product.features && product.features.length > 0 && (
            <View style={styles.section}>
              <RNText style={styles.sectionTitle}>Key Features</RNText>
              <View style={styles.featureList}>
                {product.features.map((feature: string, index: number) => (
                  <View key={index} style={styles.featureItem}>
                    <CheckCircle2 size={18} color="#00ea6b" />
                    <RNText style={styles.featureText}>{feature}</RNText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <View style={styles.section}>
              <RNText style={styles.sectionTitle}>Specifications</RNText>
              <View style={styles.specTable}>
                {Object.entries(product.specifications).map(([key, value]: [string, any], index) => (
                  <View key={key} style={[styles.specRow, index % 2 === 0 && styles.specRowAlt]}>
                    <RNText style={styles.specKey}>{key}</RNText>
                    <RNText style={styles.specValue}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </RNText>
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
          <ChevronLeft size={24} color="#043529" />
        </TouchableOpacity>
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionCircle} onPress={handleShare}>
            <Share2 size={20} color="#043529" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCircle} onPress={toggleFavorite}>
            <Heart 
              size={20} 
              color={isFavorited ? "#EF4444" : "#043529"} 
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
        <ShoppingCart size={24} color="#043529" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.addToCartSecondary}
        onPress={addToCart}
      >
        <RNText style={styles.addToCartSecondaryText}>Add to Cart</RNText>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.buyNowBtn}
        onPress={addToCart}
      >
        <RNText style={styles.buyNowText}>Buy Now</RNText>
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
                <Image source={{ uri: product.image }} style={styles.webMainImage} />
                {product.tag && (
                  <View style={styles.webHeroTag}>
                    <RNText style={styles.heroTagText}>{product.tag}</RNText>
                  </View>
                )}
              </View>
              <View style={styles.webThumbnails}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={[styles.webThumb, i === 1 && styles.webThumbActive]}>
                    <Image source={{ uri: product.image }} style={styles.webThumbImage} />
                  </View>
                ))}
              </View>
            </View>

            {/* Right: Info */}
            <View style={styles.webInfoCol}>
              <RNText style={styles.webCategory}>{product.category?.name || 'Equipment'}</RNText>
              <RNText style={styles.webProductName}>{product.name}</RNText>
              
              <View style={styles.webRatingRow}>
                <View style={styles.webStars}>
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <Star 
                      key={i} 
                      size={20} 
                      color={i < Math.floor(Number(product.rating || 0)) ? "#FBBF24" : "#E5E7EB"} 
                      fill={i < Math.floor(Number(product.rating || 0)) ? "#FBBF24" : "none"} 
                    />
                  ))}
                </View>
                <RNText style={styles.webReviewsText}>{Number(product.rating || 0).toFixed(1)} ({product.review_count || 0} customer reviews)</RNText>
              </View>

              <View style={styles.webPriceContainer}>
                <RNText style={styles.webCurrentPrice}>₹{Number(product.price).toLocaleString('en-IN')}</RNText>
                {product.discount_price && (
                  <RNText style={styles.webOriginalPrice}>₹{Number(product.discount_price).toLocaleString('en-IN')}</RNText>
                )}
                {product.tag && (
                  <View style={styles.webDiscountBadge}>
                    <RNText style={styles.webDiscountText}>{product.tag}</RNText>
                  </View>
                )}
              </View>

              <RNText style={styles.webDescription}>{product.description}</RNText>

              <View style={styles.webActionRow}>
                <View style={styles.quantitySelector}>
                  <TouchableOpacity style={styles.qtyBtn}><RNText>-</RNText></TouchableOpacity>
                  <RNText style={styles.qtyText}>1</RNText>
                  <TouchableOpacity style={styles.qtyBtn}><RNText>+</RNText></TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.webAddToCartBtn}>
                  <ShoppingCart size={20} color="#FFFFFF" />
                  <RNText style={styles.webAddToCartText}>Add to Cart</RNText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.webWishlistBtn}>
                  <Heart size={20} color="#043529" />
                </TouchableOpacity>
              </View>

              <View style={styles.webTrustGrid}>
                <View style={styles.webTrustItem}>
                  <Truck size={24} color="#043529" />
                  <RNText style={styles.webTrustTitle}>Free Shipping</RNText>
                  <RNText style={styles.webTrustSub}>On orders over ₹999</RNText>
                </View>
                <View style={styles.webTrustItem}>
                  <ShieldCheck size={24} color="#043529" />
                  <RNText style={styles.webTrustTitle}>Secure Payment</RNText>
                  <RNText style={styles.webTrustSub}>100% Secure Checkout</RNText>
                </View>
                <View style={styles.webTrustItem}>
                  <RotateCcw size={24} color="#043529" />
                  <RNText style={styles.webTrustTitle}>Easy Returns</RNText>
                  <RNText style={styles.webTrustSub}>7-day return policy</RNText>
                </View>
              </View>

              <View style={styles.webSpecSection}>
                <RNText style={styles.webSectionTitle}>Product Details</RNText>
                <View style={styles.webSpecTable}>
                  {Object.entries(product.specifications).map(([key, value]: [string, any]) => (
                    <View key={key} style={styles.webSpecRow}>
                      <RNText style={styles.webSpecKey}>{key}</RNText>
                      <RNText style={styles.webSpecValue}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </RNText>
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
    backgroundColor: '#043529',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroTagText: {
    color: '#00ea6b',
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
    color: '#00ea6b',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  productName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#043529',
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
    color: '#043529',
    fontFamily: 'Inter',
  },
  originalPrice: {
    fontSize: 18,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontFamily: 'Inter',
  },
  discountBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#16A34A',
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
    color: '#043529',
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
    color: '#043529',
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
    backgroundColor: '#00ea6b',
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
    color: '#043529',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  buyNowBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#043529',
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
    backgroundColor: '#043529',
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
    borderColor: '#043529',
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
    color: '#00ea6b',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  webProductName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#043529',
    lineHeight: 56,
    marginBottom: 20,
  },
  webRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  webStars: {
    flexDirection: 'row',
    gap: 2,
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
    fontSize: 40,
    fontWeight: '800',
    color: '#043529',
  },
  webOriginalPrice: {
    fontSize: 24,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  webDiscountBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webDiscountText: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '800',
  },
  webDescription: {
    fontSize: 18,
    lineHeight: 28,
    color: '#4B5563',
    marginBottom: 40,
  },
  webActionRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 60,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#043529',
  },
  webAddToCartBtn: {
    flex: 1,
    height: 56,
    backgroundColor: '#043529',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTrustGrid: {
    flexDirection: 'row',
    gap: 32,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    paddingVertical: 40,
    marginBottom: 60,
  },
  webTrustItem: {
    flex: 1,
    gap: 8,
  },
  webTrustTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#043529',
    marginTop: 8,
  },
  webTrustSub: {
    fontSize: 14,
    color: '#6B7280',
  },
  webSpecSection: {
    gap: 24,
  },
  webSectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#043529',
  },
  webSpecTable: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 32,
    gap: 20,
  },
  webSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webSpecKey: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  webSpecValue: {
    fontSize: 16,
    color: '#043529',
    fontWeight: '800',
  },
});
