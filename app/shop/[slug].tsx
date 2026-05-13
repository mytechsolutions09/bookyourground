import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Share, ActivityIndicator, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { slugify } from '@/utils/helpers';
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
  ArrowRight,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Trophy
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WebLayout from '@/components/web/WebLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler, 
  interpolate 
} from 'react-native-reanimated';

export default function ProductDetailScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 1024;
  const isSmall = windowWidth < 768;
  const isUltraNarrow = windowWidth < 350;
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { setTabBarVisible } = useUI();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [activeWebTab, setActiveWebTab] = useState('DETAILS');
  const [quantity, setQuantity] = useState(1);
  const [showQuantityDropdown, setShowQuantityDropdown] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showStyle, setShowStyle] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const thumbnailAnimatedStyle = useAnimatedStyle(() => ({
    zIndex: scrollY.value > 10 ? 5 : 30,
    opacity: interpolate(scrollY.value, [0, 50], [1, 0.8], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [0, 100], [0, 20], 'clamp') }]
  }));

  const tagAnimatedStyle = useAnimatedStyle(() => ({
    zIndex: scrollY.value > 5 ? 5 : 30,
  }));

  useEffect(() => {
    setTabBarVisible(false);
    return () => setTabBarVisible(true);
  }, []);

  useEffect(() => {
    if (slug) {
      loadProduct();
      if (user) loadCartCount();
    }
  }, [slug, user?.id]);

  useEffect(() => {
    if (product?.id && user) {
      checkIfFavorited();
    }
  }, [product?.id, user]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug as string);
      
      let query = supabase
        .from('shop_products')
        .select(`
          *,
          category:shop_categories(name)
        `);

      if (isUuid) {
        query = query.eq('id', slug);
      } else {
        const nameGuess = (slug as string).split('-').join(' ');
        query = query.ilike('name', nameGuess);
      }

      const { data, error } = await query.maybeSingle();
      
      let finalProduct = data;

      if (!finalProduct) {
        const { data: allProds } = await supabase.from('shop_products').select('*, category:shop_categories(name)');
        finalProduct = allProds?.find(p => slugify(p.name) === slug);
      }
      
      if (!finalProduct) throw new Error('Product not found');
      
      setProduct(finalProduct);

      if (finalProduct.category_id) {
        let { data: relatedData } = await supabase
          .from('shop_products')
          .select('id, name, price, images, discount_price')
          .eq('category_id', finalProduct.category_id)
          .neq('id', finalProduct.id)
          .limit(4);
          
        relatedData = relatedData || [];
        
        if (relatedData.length < 4) {
          const { data: moreData } = await supabase
            .from('shop_products')
            .select('id, name, price, images, discount_price')
            .neq('id', finalProduct.id)
            .limit(4 - relatedData.length);
            
          if (moreData) {
            const existingIds = new Set(relatedData.map(r => r.id));
            moreData.forEach(item => {
              if (!existingIds.has(item.id)) relatedData!.push(item);
            });
          }
        }
        
        setRelatedProducts(relatedData);
      }

      // Redirect to proper slug if accessed via ID
      if (isUuid && finalProduct.name) {
        const properSlug = slugify(finalProduct.name);
        router.replace(`/shop/${properSlug}`);
      }
      // Auto-select first color
      if (finalProduct.specifications?.colors && finalProduct.specifications.colors.length > 0) {
        setSelectedColor(finalProduct.specifications.colors[0]);
      } else {
        setSelectedColor({ name: 'Red Rush', hex: '#f8688a' });
      }

      // Auto-select first size
      if (finalProduct.specifications?.sizes && finalProduct.specifications.sizes.length > 0) {
        setSelectedSize(finalProduct.specifications.sizes[0]);
      } else {
        setSelectedSize(8);
      }
    } catch (err) {
      console.error('Error loading product:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorited = async () => {
    if (!user || !product?.id) return;
    try {
      const { data, error } = await supabase
        .from('shop_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();
      
      setIsFavorited(!!data);
    } catch (err) {
      // Not favorited
      setIsFavorited(false);
    }
  };

  const loadCartCount = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('shop_cart')
        .select('quantity')
        .eq('user_id', user.id);
      
      if (!error && data) {
        const total = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartCount(total);
      }
    } catch (err) {
      console.error('Error loading cart count:', err);
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
          .eq('product_id', product.id);
        setIsFavorited(false);
      } else {
        await supabase
          .from('shop_favorites')
          .upsert({ user_id: user.id, product_id: product.id });
        setIsFavorited(true);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      const shareUrl = Platform.OS === 'web' ? window.location.href : `https://bookyourground.com/shop/${slug}`;
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
      const isShoes = product.category?.name === 'Shoes';
      const selected_attributes: any = {};
      
      if (isShoes) {
        selected_attributes.size = selectedSize;
        selected_attributes.color = selectedColor?.name;
      }

      // Check if item with same attributes already exists
      const { data: existingItems, error: fetchError } = await supabase
        .from('shop_cart')
        .select('id, quantity, selected_attributes')
        .eq('user_id', user.id)
        .eq('product_id', product.id);

      if (fetchError) throw fetchError;

      const existingItem = existingItems?.find(item => 
        JSON.stringify(item.selected_attributes) === JSON.stringify(selected_attributes)
      );

      if (existingItem) {
        // Update quantity
        const { error: updateError } = await supabase
          .from('shop_cart')
          .update({ quantity: (existingItem.quantity || 0) + quantity })
          .eq('id', existingItem.id);
        if (updateError) throw updateError;
      } else {
        // Insert new item
        const { error: insertError } = await supabase
          .from('shop_cart')
          .insert({ 
            user_id: user.id, 
            product_id: product.id,
            selected_attributes,
            quantity: quantity
          });
        if (insertError) throw insertError;
      }
      
      loadCartCount();
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
        <Text style={{ color: '#2b2f4b' }}>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ color: '#f8688a', marginTop: 12 }}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <Text key={i} style={{ fontWeight: '700', color: '#0F1111' }}>{part.slice(2, -2)}</Text>;
      }
      return part;
    });
  };

  const renderTableMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return (
      <View style={{ gap: 8 }}>
        {lines.map((line, index) => {
          const parts = line.split(/(\*\*.*?\*\*)/g).map(p => p.trim()).filter(p => p !== '');
          
          if (parts.length < 2) {
            return <Text key={index} style={{ fontSize: 14, color: '#0F1111', fontFamily: 'Inter' }}>{line}</Text>;
          }
          
          let label = parts[0];
          let value = parts[1];
          
          if (label.startsWith('**') && label.endsWith('**')) {
            label = label.slice(2, -2);
          }
          if (value.startsWith('**') && value.endsWith('**')) {
            value = value.slice(2, -2);
          }
          
          return (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 }}>
              <Text style={{ width: 180, fontSize: 14, fontWeight: '700', color: '#0F1111', fontFamily: 'Inter' }}>{label}</Text>
              <Text style={{ flex: 1, fontSize: 14, color: '#0F1111', fontFamily: 'Inter' }}>{value}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const content = (
    <View style={{ flex: 1 }}>
      {/* Fixed Background Image */}
      <View style={[styles.fixedImageContainer, isUltraNarrow && styles.fixedImageContainerUltra]}>
        <Image 
          source={{ uri: product.images?.[activeImageIndex] || product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' }} 
          style={[styles.mainImage, isUltraNarrow && { height: 320 }]} 
        />
        {/* Hero tag and thumbnails moved to bottom of JSX for better touch handling */}
      </View>

      <Reanimated.ScrollView 
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={[styles.scroll, { zIndex: 10 }]} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: isUltraNarrow ? 320 : 440 }]}
        pointerEvents="box-none"
      >
        <View style={styles.contentWrapper} pointerEvents="auto">
          {/* Basic Info */}
          <View style={styles.infoSection}>
            <Text style={styles.categoryText}>{product.category?.name || 'Equipment'}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((_, i) => (
                <Star 
                  key={i} 
                  size={16} 
                  color={i < Math.floor(product.rating || 0) ? "#f8688a" : "#D1D5DB"} 
                  fill={i < Math.floor(product.rating || 0) ? "#f8688a" : "none"} 
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
          
          {product.category?.name === 'Shoes' && (
            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Text style={styles.shoesSectionTitle}>COLORS</Text>
              <View style={styles.shoesColorRow}>
                {((product.specifications?.colors && product.specifications.colors.length > 0) ? product.specifications.colors : [
                  { name: 'Red Rush', hex: '#f8688a' },
                  { name: 'Midnight', hex: '#2b2f4b' },
                  { name: 'Lime', hex: '#bef264' },
                  { name: 'Pure', hex: '#ffffff' }
                ]).map((color: any, idx: number) => {
                  const isSelected = selectedColor?.name === color.name;
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.shoesColorCircle, isSelected && styles.shoesColorCircleActive]}
                      onPress={() => setSelectedColor(color)}
                    >
                      <View style={[styles.colorInnerCircle, { backgroundColor: color.hex || color.hex1 }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.shoesSectionTitle, { marginTop: 24 }]}>SIZE</Text>
              <View style={styles.shoesSizeRow}>
                {((product.specifications?.sizes && product.specifications.sizes.length > 0) ? product.specifications.sizes : [6, 7, 7.5, 8, 8.5, 9, 10, 11]).map((size: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.sizeBox, selectedSize === size && styles.sizeBoxActive]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text style={[styles.sizeBoxText, selectedSize === size && styles.sizeBoxTextActive]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{renderMarkdown(product.description)}</Text>
          </View>

          {/* Features */}
          {product.features && product.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Features</Text>
              <View style={styles.featureList}>
                {product.features.map((feature: string, index: number) => (
                  <View key={index} style={styles.featureItem}>
                    <CheckCircle2 size={18} color="#f8688a" />
                    <Text style={styles.featureText}>{renderMarkdown(feature)}</Text>
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
                {Object.entries(product.specifications)
                  .filter(([key]) => !['images', 'features'].includes(key))
                  .map(([key, value]: [string, any], index, array) => {
                    const isLast = index === array.length - 1;
                    let displayValue = String(value);
                    
                    if (Array.isArray(value)) {
                      displayValue = value.map(v => (typeof v === 'object' && v !== null) ? (v.name || v.label || JSON.stringify(v)) : String(v)).join(', ');
                    } else if (typeof value === 'object' && value !== null) {
                      displayValue = JSON.stringify(value);
                    }

                    return (
                      <View key={key} style={[styles.specRow, isLast && { borderBottomWidth: 0 }]}>
                        <Text style={styles.specKey}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</Text>
                        <Text style={styles.specValue}>{renderMarkdown(displayValue)}</Text>
                      </View>
                    );
                  })}
              </View>
            </View>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Text style={styles.sectionTitle}>Related Products</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 10 }}>
                {relatedProducts.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={{ width: 160, backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' }}
                    onPress={() => router.push(`/shop/${slugify(item.name)}`)}
                  >
                    <View style={{ width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Image 
                        source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' }} 
                        style={{ width: '80%', height: '80%', resizeMode: 'contain' }} 
                      />
                    </View>
                    <View style={{ padding: 12 }}>
                      <Text style={{ fontSize: 12, color: '#2b2f4b', marginBottom: 4, fontFamily: 'Inter', minHeight: 30 }} numberOfLines={2}>{item.name}</Text>
                      <Text style={{ fontSize: 14, color: '#f8688a', fontWeight: '700', fontFamily: 'Inter' }}>₹{item.price.toLocaleString('en-IN')}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.footerGap} />
        </View>
      </Reanimated.ScrollView>

      {/* Mobile-only interactive overlays */}
      {!isSmall ? null : (
        <>
          {/* Lower priority elements that go UNDER content on scroll */}
          <Reanimated.View 
            pointerEvents="box-none" 
            style={[
              StyleSheet.absoluteFill,
              { zIndex: 5 }, // Below ScrollView (10) but above Fixed Image (1)
              thumbnailAnimatedStyle
            ]}
          >
            {product.images && product.images.length > 1 && (
              <View 
                pointerEvents="box-none" 
                style={[
                  styles.mobileThumbnailsOverlay, 
                  { top: (isUltraNarrow ? 320 : 440) - 100, bottom: undefined, height: 100 }
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                  {product.images.map((img: string, i: number) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[styles.mobileThumb, activeImageIndex === i && styles.mobileThumbActive]}
                      onPress={() => setActiveImageIndex(i)}
                    >
                      <Image source={{ uri: img }} style={styles.mobileThumbImage} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {product.tag && (
              <View 
                style={[
                  styles.heroTag, 
                  { top: (isUltraNarrow ? 320 : 440) - 40, bottom: undefined }
                ]}
              >
                <Text style={styles.heroTagText}>{product.tag}</Text>
              </View>
            )}
          </Reanimated.View>

          {/* High priority elements that stay ON TOP */}
          <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>
            {/* Header Overlay */}
            <View pointerEvents="box-none" style={[styles.imageOverlay, { top: Math.max(insets.top, 20), zIndex: 6 }]}>
              <TouchableOpacity 
                style={styles.backBtn} 
                onPress={() => router.back()}
              >
                <ChevronLeft size={24} color="#2b2f4b" />
              </TouchableOpacity>
              
              <View style={styles.rightActions}>
                <TouchableOpacity 
                  style={styles.actionCircle} 
                  onPress={handleShare}
                >
                  <Share2 size={20} color="#2b2f4b" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionCircle} 
                  onPress={() => router.push('/shop/cart')}
                >
                  <ShoppingCart size={20} color="#2b2f4b" />
                  {cartCount > 0 && (
                    <View style={styles.cartBadgeOverlay}>
                      <Text style={styles.cartBadgeTextOverlay}>{cartCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCircle} onPress={toggleFavorite}>
                  <Heart 
                    size={20} 
                    color={isFavorited ? '#EF4444' : '#2b2f4b'} 
                    fill={isFavorited ? '#EF4444' : 'transparent'} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );

  const bottomActions = (
    <View style={[styles.bottomBar, isUltraNarrow && { paddingHorizontal: 8, gap: 6 }, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <TouchableOpacity 
        style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#D5D9D9', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}
        onPress={toggleFavorite}
      >
        <Heart 
          size={20} 
          color={isFavorited ? '#EF4444' : '#2b2f4b'} 
          fill={isFavorited ? '#EF4444' : 'transparent'} 
        />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.addToCartSecondary, isUltraNarrow && { height: 48 }, { flex: 1 }]}
        onPress={addToCart}
      >
        <Text style={[styles.addToCartSecondaryText, isUltraNarrow && { fontSize: 13 }]}>Add to Cart</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.buyNowBtn, isUltraNarrow && { height: 48 }, { flex: 1 }]}
        onPress={() => addToCart()} // Buy now also adds to cart then goes to cart
      >
        <Text style={[styles.buyNowText, isUltraNarrow && { fontSize: 13 }]}>Buy Now</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === 'web' && !isSmall) {
    const isShoes = product.category?.name === 'Shoes';
    
    return (
      <WebLayout>
        <Stack.Screen options={{ title: product.name }} />
        <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} showsVerticalScrollIndicator={false}>
          <View style={[styles.webContainer, { maxWidth: 1500, padding: 20 }]}>
            <View style={{ flexDirection: 'row', gap: 24, paddingVertical: 20 }}>
                {/* COLUMN 1: IMAGES */}
                <View style={{ flex: 1.2, flexDirection: 'row', gap: 16, alignSelf: 'flex-start', position: 'sticky', top: 20, zIndex: 10 }}>
                  {/* Thumbnails */}
                  <View style={{ width: 60, gap: 12 }}>
                    {(product.images || []).map((img: string, i: number) => (
                      <TouchableOpacity 
                        key={i} 
                        style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: activeImageIndex === i ? '#007185' : '#D5D9D9', overflow: 'hidden' }}
                        onPress={() => setActiveImageIndex(i)}
                      >
                        <Image source={{ uri: img }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Main Image */}
                  <View style={{ flex: 1, height: 600, backgroundColor: '#FFFFFF', borderRadius: 8, alignItems: 'center', justifyContent: 'flex-start' }}>
                    <Image 
                      source={{ uri: product.images?.[activeImageIndex] || product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' }} 
                      style={{ width: '100%', height: '100%', resizeMode: 'contain', maxHeight: 600 }} 
                    />
                  </View>
                </View>

                {/* COLUMN 2: DETAILS */}
                <View style={{ flex: 1.5, paddingHorizontal: 12 }}>
                  <TouchableOpacity onPress={() => router.push(`/shop?category=${product.category?.name || 'Shoes'}`)}>
                    <Text style={{ color: '#007185', fontSize: 14, marginBottom: 8, fontFamily: 'Inter' }}>{`Visit the ${product.category?.name || 'Official'} Store`}</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 24, color: '#0F1111', marginBottom: 12, fontFamily: 'Inter', lineHeight: 32 }}>{product.name}</Text>
                  
                  {/* Price */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <Text style={{ color: '#CC0C39', fontSize: 28, fontWeight: '300', fontFamily: 'Inter' }}>
                      -{Math.round((1 - product.price / (product.discount_price || (product.price * 2.5))) * 100)}%
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 14, color: '#0F1111', marginTop: 4, marginRight: 2 }}>₹</Text>
                      <Text style={{ fontSize: 28, fontWeight: '600', color: '#0F1111', fontFamily: 'Inter' }}>{product.price.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#565959', fontSize: 12, marginBottom: 4, fontFamily: 'Inter' }}>
                    M.R.P.: <Text style={{ textDecorationLine: 'line-through' }}>₹{product.discount_price ? product.discount_price.toLocaleString('en-IN') : (product.price * 2.5).toLocaleString('en-IN')}</Text>
                  </Text>
                  <Text style={{ color: '#0F1111', fontSize: 14, marginBottom: 16, fontFamily: 'Inter' }}>Inclusive of all taxes</Text>

                  {/* Badges */}
                  <View style={{ flexDirection: 'row', gap: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 16, marginBottom: 16 }}>
                    <View style={{ alignItems: 'center', width: 80 }}>
                      <RotateCcw size={28} color="#007185" strokeWidth={1} />
                      <Text style={{ fontSize: 12, color: '#007185', textAlign: 'center', marginTop: 8, fontFamily: 'Inter' }}>10 days Return & Exchange</Text>
                    </View>
                    <View style={{ alignItems: 'center', width: 80 }}>
                      <Truck size={28} color="#007185" strokeWidth={1} />
                      <Text style={{ fontSize: 12, color: '#007185', textAlign: 'center', marginTop: 8, fontFamily: 'Inter' }}>Free Delivery</Text>
                    </View>
                    <View style={{ alignItems: 'center', width: 80 }}>
                      <ShieldCheck size={28} color="#007185" strokeWidth={1} />
                      <Text style={{ fontSize: 12, color: '#007185', textAlign: 'center', marginTop: 8, fontFamily: 'Inter' }}>Secure transaction</Text>
                    </View>
                    <View style={{ alignItems: 'center', width: 80 }}>
                      <Trophy size={28} color="#007185" strokeWidth={1} />
                      <Text style={{ fontSize: 12, color: '#007185', textAlign: 'center', marginTop: 8, fontFamily: 'Inter' }}>Top Brand</Text>
                    </View>
                  </View>

                  {/* Selection */}
                  {(() => {
                    const specs = typeof product?.specifications === 'string' ? JSON.parse(product.specifications) : product?.specifications;
                    const colors = specs?.colors || [];
                    const sizes = specs?.sizes || [];
                    
                    return (
                      <>
                        {(isShoes || colors.length > 0) && (
                          <>
                            <Text style={{ fontSize: 14, color: '#0F1111', marginBottom: 8, fontFamily: 'Inter' }}>
                              Colour: <Text style={{ fontWeight: '700' }}>{selectedColor?.name || 'White'}</Text>
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                              {(colors.length > 0 ? colors : [
                                { name: 'White', hex: '#FFFFFF' },
                                { name: 'Black', hex: '#0F1111' },
                                { name: 'Red', hex: '#CC0C39' },
                              ]).map((color: any, idx: number) => {
                                const isSelected = (selectedColor?.name || 'White') === color.name;
                                return (
                                  <TouchableOpacity 
                                    key={idx} 
                                    style={{ 
                                      width: 36, 
                                      height: 36, 
                                      borderRadius: 18, 
                                      backgroundColor: color.hex, 
                                      borderWidth: isSelected ? 3 : 1, 
                                      borderColor: isSelected ? '#007185' : '#D5D9D9',
                                      shadowColor: '#000',
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.1,
                                      shadowRadius: 2,
                                    }}
                                    onPress={() => setSelectedColor(color)}
                                  />
                                );
                              })}
                            </View>
                          </>
                        )}

                        {(isShoes || sizes.length > 0) && (
                          <>
                            <Text style={{ fontSize: 14, color: '#0F1111', marginBottom: 12, fontFamily: 'Inter' }}>
                              Size: <Text style={{ fontWeight: '700' }}>{selectedSize || '9 UK'}</Text>
                            </Text>
                            
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                              {(sizes.length > 0 ? sizes : [6, 7, 8, 9, 10, 11]).map((size: any, idx: number) => {
                                const isSelected = selectedSize === size;
                                return (
                                  <TouchableOpacity 
                                    key={idx} 
                                    style={{ 
                                      borderWidth: isSelected ? 2 : 1, 
                                      borderColor: isSelected ? '#007185' : '#D5D9D9', 
                                      borderRadius: 4, 
                                      padding: 8,
                                      width: 80,
                                      backgroundColor: isSelected ? '#F0F8FA' : '#FFFFFF'
                                    }}
                                    onPress={() => setSelectedSize(size)}
                                  >
                                    <Text style={{ fontSize: 14, fontWeight: isSelected ? '700' : '400', color: '#0F1111', marginBottom: 4, fontFamily: 'Inter' }}>{size}{isShoes ? ' UK' : ''}</Text>
                                    <Text style={{ fontSize: 12, color: '#B12704', fontWeight: '500', fontFamily: 'Inter' }}>₹{product.price.toLocaleString('en-IN')}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 }}>
                              <Text style={{ fontSize: 14, color: '#007185', fontFamily: 'Inter' }}>Size Chart</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </>
                    );
                  })()}

                  {/* Product Details Section */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 20, fontWeight: '500', color: '#0F1111', marginBottom: 12, fontFamily: 'Inter' }}>Product details</Text>
                    
                    <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                        onPress={() => setShowHighlights(!showHighlights)}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#0F1111', fontFamily: 'Inter' }}>Top highlights</Text>
                        {showHighlights ? <ChevronUp size={20} color="#0F1111" /> : <ChevronDown size={20} color="#0F1111" />}
                      </TouchableOpacity>
                      {showHighlights && (
                        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                          {renderTableMarkdown(product.specifications?.highlights) || (
                            <Text style={{ fontSize: 14, color: '#4B5563', fontFamily: 'Inter' }}>No highlights available.</Text>
                          )}
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                        onPress={() => setShowStyle(!showStyle)}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#0F1111', fontFamily: 'Inter' }}>Style</Text>
                        {showStyle ? <ChevronUp size={20} color="#0F1111" /> : <ChevronDown size={20} color="#0F1111" />}
                      </TouchableOpacity>
                      {showStyle && (
                        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                          {renderTableMarkdown(product.specifications?.style) || (
                            <Text style={{ fontSize: 14, color: '#4B5563', fontFamily: 'Inter' }}>No style details available.</Text>
                          )}
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}
                        onPress={() => setShowFeatures(!showFeatures)}
                      >
                        <Text style={{ fontSize: 16, fontWeight: '500', color: '#0F1111', fontFamily: 'Inter' }}>Features & Specs</Text>
                        {showFeatures ? <ChevronUp size={20} color="#0F1111" /> : <ChevronDown size={20} color="#0F1111" />}
                      </TouchableOpacity>
                      {showFeatures && (
                        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                          {renderTableMarkdown(product.specifications?.features) || (
                            <Text style={{ fontSize: 14, color: '#4B5563', fontFamily: 'Inter' }}>No features or specifications available.</Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* COLUMN 3: BUY BOX */}
                <View style={{ width: 280, borderWidth: 1, borderColor: '#D5D9D9', borderRadius: 8, padding: 16, alignSelf: 'flex-start' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: '#0F1111', marginTop: 2, marginRight: 2 }}>₹</Text>
                    <Text style={{ fontSize: 24, fontWeight: '600', color: '#0F1111', fontFamily: 'Inter' }}>{product.price.toLocaleString('en-IN')}</Text>
                  </View>
                  
                  <Text style={{ fontSize: 14, color: '#0F1111', marginBottom: 8, fontFamily: 'Inter' }}>
                    FREE delivery <Text style={{ fontWeight: '700' }}>Tuesday, 12 May.</Text>
                  </Text>
                  <TouchableOpacity style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: '#007185', fontFamily: 'Inter' }}>Details</Text>
                  </TouchableOpacity>

                  <Text style={{ fontSize: 18, color: '#007600', fontWeight: '500', marginBottom: 16, fontFamily: 'Inter' }}>In stock</Text>
                  
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ width: 80, fontSize: 12, color: '#565959', fontFamily: 'Inter' }}>Sold by</Text>
                      <Text style={{ fontSize: 12, color: '#007185', fontFamily: 'Inter' }}>Book your ground</Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                      <Text style={{ width: 80, fontSize: 12, color: '#565959', fontFamily: 'Inter' }}>Payment</Text>
                      <Text style={{ fontSize: 12, color: '#007185', fontFamily: 'Inter' }}>Secure transaction</Text>
                    </View>
                  </View>

                  <View style={{ position: 'relative', alignSelf: 'flex-start', zIndex: 100, marginBottom: 16 }}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: showQuantityDropdown ? '#007185' : '#D5D9D9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F0F2F2', minWidth: 110, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 }}
                      onPress={() => setShowQuantityDropdown(!showQuantityDropdown)}
                    >
                      <Text style={{ fontSize: 14, color: '#0F1111', fontFamily: 'Inter' }}>Quantity: <Text style={{fontWeight: '600'}}>{quantity}</Text></Text>
                      <ChevronDown size={16} color="#0F1111" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    
                    {showQuantityDropdown && (
                      <View style={{ position: 'absolute', top: 40, left: 0, right: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5D9D9', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5, zIndex: 1000, overflow: 'hidden' }}>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <TouchableOpacity 
                              key={num} 
                              style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: quantity === num ? '#F0F8FA' : '#FFFFFF', borderBottomWidth: num < 10 ? 1 : 0, borderBottomColor: '#F0F2F2' }}
                              onPress={() => {
                                setQuantity(num);
                                setShowQuantityDropdown(false);
                              }}
                            >
                              <Text style={{ fontSize: 14, color: '#0F1111', fontFamily: 'Inter', fontWeight: quantity === num ? '600' : '400' }}>{num}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={{ backgroundColor: '#2d3450', borderRadius: 100, paddingVertical: 12, alignItems: 'center', marginBottom: 8 }}
                    onPress={addToCart}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter', fontWeight: '500' }}>Add to cart</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ backgroundColor: '#f8688a', borderRadius: 100, paddingVertical: 12, alignItems: 'center', marginBottom: 16 }}
                    onPress={addToCart}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter', fontWeight: '500' }}>Buy Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ borderWidth: 1, borderColor: '#D5D9D9', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}
                    onPress={toggleFavorite}
                  >
                    <Text style={{ color: '#0F1111', fontSize: 14, fontFamily: 'Inter', fontWeight: '500' }}>
                      {isFavorited ? 'Remove from Wish List' : 'Add to Wish List'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* RELATED PRODUCTS */}
              {relatedProducts.length > 0 && (
                <View style={{ marginTop: 60, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 40 }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#0F1111', marginBottom: 24, fontFamily: 'Inter' }}>Related products</Text>
                  <View style={{ flexDirection: 'row', gap: 24 }}>
                    {relatedProducts.map((item, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={{ width: '23%', minWidth: 200, backgroundColor: '#FFFFFF', borderRadius: 8, overflow: 'hidden' }}
                        onPress={() => router.push(`/shop/${slugify(item.name)}`)}
                      >
                        <View style={{ width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Image 
                            source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' }} 
                            style={{ width: '80%', height: '80%', resizeMode: 'contain' }} 
                          />
                        </View>
                        <View style={{ paddingTop: 12 }}>
                          <Text style={{ fontSize: 14, color: '#007185', marginBottom: 4, fontFamily: 'Inter', minHeight: 40 }} numberOfLines={2}>{item.name}</Text>
                          <Text style={{ fontSize: 18, color: '#B12704', fontWeight: '500', fontFamily: 'Inter' }}>₹{item.price.toLocaleString('en-IN')}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
        </ScrollView>
      </WebLayout>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <WebLayout isPublicNoSidebar hideHeader={isSmall}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, backgroundColor: '#FFFFFF', position: 'relative' }}>
          {content}
          {bottomActions}
        </View>
      </WebLayout>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1f2e' }}>
      <Stack.Screen options={{ headerShown: false }} />
      {content}
      {bottomActions}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  fixedImageContainerUltra: {
    height: 320,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 400,
    paddingBottom: 160,
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
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
    color: '#f8688a',
    fontWeight: '300',
    fontSize: 12,
    fontFamily: 'Inter',
  },
  contentWrapper: {
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    marginTop: -32,
  },
  infoSection: {
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 12,
    color: '#f8688a',
    fontWeight: '300',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  productName: {
    fontSize: 26,
    fontWeight: '300',
    color: '#2b2f4b',
    marginBottom: 12,
    lineHeight: 32,
    fontFamily: 'Inter',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  reviewsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '300',
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
    fontWeight: '300',
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
    color: '#f8688a',
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Inter',
  },
  trustRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  trustText: {
    fontSize: 10,
    fontWeight: '300',
    color: '#64748B',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    fontWeight: '300',
    fontFamily: 'Inter',
  },
  specTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  specRow: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specKey: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '300',
    fontFamily: 'Inter',
  },
  specValue: {
    flex: 1.5,
    fontSize: 14,
    color: '#2b2f4b',
    fontWeight: '300',
    fontFamily: 'Inter',
  },
  footerGap: {
    height: 140,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 30,
    zIndex: 1000,
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
    backgroundColor: '#f8688a',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  cartBadgeOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#f8688a',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  cartBadgeTextOverlay: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  addToCartSecondary: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartSecondaryText: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Inter',
  },
  buyNowBtn: {
    flex: 1.5,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#f8688a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f8688a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  buyNowText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Inter',
  },

  // Web Styles
  webContainer: {
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  webGrid: {
    flexDirection: 'row',
    gap: 40,
  },
  webGridCompact: {
    flexDirection: 'column',
    gap: 40,
  },
  webImageCol: {
    flex: 1,
  },
  webMainImageWrapper: {
    aspectRatio: 1,
    borderRadius: 32,
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
    backgroundColor: '#f8688a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 20,
  },
  webHeroTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 1,
    fontFamily: 'Inter',
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
    borderColor: '#f8688a',
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
    color: '#f8688a',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  webProductName: {
    fontSize: 48,
    fontWeight: '300',
    color: '#2b2f4b',
    lineHeight: 56,
    marginBottom: 20,
    fontFamily: 'Inter',
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
    fontWeight: '300',
    fontFamily: 'Inter',
  },
  webPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 32,
  },
  webCurrentPrice: {
    fontSize: 36,
    fontWeight: '300',
    color: '#2b2f4b',
    fontFamily: 'Inter',
  },
  webOriginalPrice: {
    fontSize: 24,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  webDiscountBadge: {
    backgroundColor: 'rgba(248, 104, 138, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  webDiscountText: {
    color: '#f8688a',
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Inter',
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
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
    color: '#2b2f4b',
  },
  webAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 104, 138, 0.4)',
    borderColor: 'rgba(248, 104, 138, 0.5)',
    borderWidth: 1,
    paddingHorizontal: 32,
    height: 56,
    borderRadius: 100,
    gap: 12,
    shadowColor: '#f8688a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  webAddToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  webWishlistBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
    fontWeight: '300',
    color: '#2b2f4b',
    marginTop: 12,
    marginBottom: 4,
    fontFamily: 'Inter',
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
    fontWeight: '300',
    color: '#2b2f4b',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  webSpecTable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
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
    fontWeight: '300',
    fontFamily: 'Inter',
  },
  webSpecValue: {
    flex: 2,
    fontSize: 16,
    color: '#2b2f4b',
    fontWeight: '300',
    fontFamily: 'Inter',
  },
  // Shoes Special Design
  shoesWebContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  shoesWebGrid: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    gap: 40,
  },
  shoesImageCol: {
    flex: 1,
  },
  shoesMainImageWrapper: {
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
  },
  shoesNikeLogo: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    zIndex: -1,
  },
  shoesSwoosh: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  shoesInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  newSeasonBadge: {
    backgroundColor: '#f8688a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  newSeasonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  shoesTitle: {
    fontSize: 42,
    fontWeight: '300',
    color: '#1e293b',
    lineHeight: 48,
    marginBottom: 2,
    letterSpacing: -1,
    fontFamily: 'Inter',
  },
  shoesSubtitle: {
    fontSize: 18,
    color: '#f8688a',
    fontWeight: '300',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  shoesPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 8,
  },
  shoesPrice: {
    fontSize: 36,
    fontWeight: '300',
    color: '#1e293b',
    fontFamily: 'Inter',
  },
  shoesOriginalPrice: {
    fontSize: 24,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  shoesPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 40,
  },
  freeShippingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  shoesSection: {
    marginBottom: 16,
  },
  shoesSectionTitle: {
    fontSize: 13,
    fontWeight: '300',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  shoesColorRow: {
    flexDirection: 'row',
    gap: 16,
  },
  shoesColorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoesColorCircleActive: {
    borderColor: '#1e293b',
    borderWidth: 2,
  },
  colorInnerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  shoesSizeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sizeBox: {
    width: 52,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  sizeBoxActive: {
    backgroundColor: '#f8688a',
    borderColor: '#f8688a',
  },
  sizeBoxText: {
    fontSize: 15,
    fontWeight: '300',
    color: '#1e293b',
    fontFamily: 'Inter',
  },
  sizeBoxTextActive: {
    color: '#FFFFFF',
  },
  shoesActionRow: {
    marginTop: 8,
    marginBottom: 16,
  },
  shoesAddToCartBtn: {
    backgroundColor: 'rgba(248, 104, 138, 0.4)',
    borderColor: 'rgba(248, 104, 138, 0.5)',
    borderWidth: 1,
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f8688a',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' }
    }) as any,
  },
  shoesAddToCartText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    backgroundColor: 'rgba(248, 104, 138, 0.05)',
    padding: 12,
    borderRadius: 12,
  },
  proofIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f8688a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  webTabsContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  webTabsHeader: {
    flexDirection: 'row',
    gap: 40,
  },
  webTab: {
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  webTabActive: {
    borderBottomColor: '#f8688a',
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#94a3b8',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  webTabTextActive: {
    fontSize: 14,
    fontWeight: '300',
    color: '#1e293b',
    letterSpacing: 1,
    fontFamily: 'Inter',
  },
  webTabContent: {
    paddingVertical: 24,
  },
  webDetailDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    marginBottom: 32,
  },
  webFeaturesGrid: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 8,
  },
  webFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webFeatureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  mobileThumbnailsOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  mobileThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mobileThumbActive: {
    borderColor: '#f8688a',
  },
  mobileThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
