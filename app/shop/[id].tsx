import React from 'react';
import { View, Text as RNText, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Share } from 'react-native';
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

const PRODUCTS_DATA: Record<string, any> = {
  '1': {
    id: '1',
    name: 'SS Ton Reserve Edition',
    category: 'Bats',
    price: '₹24,500',
    originalPrice: '₹28,000',
    discount: '12% OFF',
    rating: 4.9,
    reviews: 124,
    description: 'The SS Ton Reserve Edition is a professional-grade cricket bat made from the finest Grade 1+ English Willow. Crafted for the ultimate performance, this bat features a mammoth sweet spot and exceptional balance, allowing for effortless power hitting and precision stroke play.',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80',
    tag: 'Premium',
    features: [
      'Hand-selected Grade 1+ English Willow',
      'Air Dried Willow for absolute performance',
      'Latest shape with massive edges for power',
      'Specially designed Aqua Grip for superior feel'
    ],
    specifications: {
      'Weight': '1180 - 1240 grams',
      'Willow Type': 'English Willow Grade 1+',
      'Hand Orientation': 'Right & Left',
      'Sweet Spot': 'Mid to Low'
    }
  },
  '2': {
    id: '2',
    name: 'SG Pro Soft Balls (Pack of 6)',
    category: 'Balls',
    price: '₹1,200',
    originalPrice: '₹1,500',
    discount: '20% OFF',
    rating: 4.7,
    reviews: 89,
    description: 'High-quality four-piece leather balls suitable for club and tournament matches. These balls are made from genuine alum-tanned leather and feature a high-quality cork core for consistent bounce and durability.',
    image: 'https://images.unsplash.com/photo-1593766788306-285610866ea4?w=800&q=80',
    tag: 'Best Seller',
    features: [
      'Waterproofed alum-tanned leather',
      'Four-piece construction',
      'High-quality center cork core',
      'Exceptional shape retention'
    ],
    specifications: {
      'Quantity': 'Pack of 6',
      'Material': 'Genuine Leather',
      'Stitching': '80-85 stitches',
      'Usage': 'Match Play'
    }
  },
  '3': {
    id: '3',
    name: 'Adidas Adipower Vector',
    category: 'Shoes',
    price: '₹8,990',
    originalPrice: '₹10,500',
    discount: '14% OFF',
    rating: 4.8,
    reviews: 56,
    description: 'Designed for fast bowlers, the Adidas Adipower Vector provides ultimate stability and cushioning during the landing phase. The mid-cut design offers ankle support, while the innovative outsole ensures maximum traction on the pitch.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    features: [
      'Revolutionary BOA closure system',
      'Mid-cut construction for ankle support',
      'Durable Adiwear outsole',
      'Maximum cushioning for high impact'
    ],
    specifications: {
      'Type': 'Bowling Spikes',
      'Outer Material': 'Synthetic / Mesh',
      'Sole Material': 'TPU with Steel Spikes',
      'Fit': 'Regular Fit'
    }
  }
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const product = PRODUCTS_DATA[id as string] || PRODUCTS_DATA['1'];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this ${product.name} on Cricket Hub!`,
        url: window.location.href,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const content = (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Product Image Section */}
      <View style={styles.imageSection}>
        <Image source={{ uri: product.image }} style={styles.mainImage} />
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
            <TouchableOpacity style={styles.actionCircle}>
              <Heart size={20} color="#043529" />
            </TouchableOpacity>
          </View>
        </View>
        {product.tag && (
          <View style={styles.heroTag}>
            <RNText style={styles.heroTagText}>{product.tag}</RNText>
          </View>
        )}
      </View>

      <View style={styles.contentWrapper}>
        {/* Basic Info */}
        <View style={styles.infoSection}>
          <RNText style={styles.categoryText}>{product.category}</RNText>
          <RNText style={styles.productName}>{product.name}</RNText>
          
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((_, i) => (
              <Star 
                key={i} 
                size={16} 
                color={i < Math.floor(product.rating) ? "#FBBF24" : "#D1D5DB"} 
                fill={i < Math.floor(product.rating) ? "#FBBF24" : "none"} 
              />
            ))}
            <RNText style={styles.reviewsText}>{product.rating} ({product.reviews} reviews)</RNText>
          </View>

          <View style={styles.priceContainer}>
            <RNText style={styles.currentPrice}>{product.price}</RNText>
            <RNText style={styles.originalPrice}>{product.originalPrice}</RNText>
            <View style={styles.discountBadge}>
              <RNText style={styles.discountText}>{product.discount}</RNText>
            </View>
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

        {/* Specifications */}
        <View style={styles.section}>
          <RNText style={styles.sectionTitle}>Specifications</RNText>
          <View style={styles.specTable}>
            {Object.entries(product.specifications).map(([key, value]: [string, any], index) => (
              <View key={key} style={[styles.specRow, index % 2 === 0 && styles.specRowAlt]}>
                <RNText style={styles.specKey}>{key}</RNText>
                <RNText style={styles.specValue}>{value}</RNText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footerGap} />
      </View>
    </ScrollView>
  );

  const bottomActions = (
    <View style={styles.bottomBar}>
      <TouchableOpacity style={styles.cartIconBtn}>
        <ShoppingCart size={24} color="#043529" />
        <View style={styles.cartBadge} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.addToCartSecondary}>
        <RNText style={styles.addToCartSecondaryText}>Add to Cart</RNText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.buyNowBtn}>
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
              <RNText style={styles.webCategory}>{product.category}</RNText>
              <RNText style={styles.webProductName}>{product.name}</RNText>
              
              <View style={styles.webRatingRow}>
                <View style={styles.webStars}>
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <Star 
                      key={i} 
                      size={20} 
                      color={i < Math.floor(product.rating) ? "#FBBF24" : "#E5E7EB"} 
                      fill={i < Math.floor(product.rating) ? "#FBBF24" : "none"} 
                    />
                  ))}
                </View>
                <RNText style={styles.webReviewsText}>{product.rating} ({product.reviews} customer reviews)</RNText>
              </View>

              <View style={styles.webPriceContainer}>
                <RNText style={styles.webCurrentPrice}>{product.price}</RNText>
                <RNText style={styles.webOriginalPrice}>{product.originalPrice}</RNText>
                <View style={styles.webDiscountBadge}>
                  <RNText style={styles.webDiscountText}>{product.discount}</RNText>
                </View>
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
                      <RNText style={styles.webSpecValue}>{value}</RNText>
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
  imageSection: {
    height: 400,
    backgroundColor: '#F9FAFB',
    position: 'relative',
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
  },
  productName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 12,
    lineHeight: 32,
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
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#043529',
  },
  originalPrice: {
    fontSize: 18,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
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
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
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
  },
  specValue: {
    flex: 1.5,
    fontSize: 14,
    color: '#043529',
    fontWeight: '700',
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
  },
  cartIconBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00ea6b',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  addToCartSecondary: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartSecondaryText: {
    color: '#043529',
    fontWeight: '700',
    fontSize: 16,
  },
  buyNowBtn: {
    flex: 1.2,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#043529',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
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
