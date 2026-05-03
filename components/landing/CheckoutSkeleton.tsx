import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SkeletonBar = ({ width, height = 14, style }: { width: string | number; height?: number; style?: object }) => (
  <View
    style={[
      styles.bar,
      {
        width: width as any,
        height,
      },
      style,
    ]}
  />
);

export default function CheckoutSkeleton() {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: pulse }}>
          {/* ── Mini Header Skeleton ────────────────────────── */}
          <View style={[styles.headerSk, { paddingTop: insets.top + 12 }]}>
            <View style={styles.backBtnSk} />
            <SkeletonBar width={120} height={18} style={styles.titleBarSk} />
            <View style={{ width: 40 }} />
          </View>

          {/* ── Secure Banner Skeleton ──────────────────────── */}
          <View style={styles.secureBannerSk}>
            <View style={styles.secureIconSk} />
            <SkeletonBar width="60%" height={12} style={styles.subBarSk} />
          </View>

          {/* ── Order Summary Card Skeleton ──────────────────── */}
          <View style={styles.section}>
            <SkeletonBar width={150} height={20} style={[styles.titleBarSk, { marginBottom: 16 }]} />
            <View style={styles.cardSk}>
              <View style={styles.groundInfoSk}>
                <View style={styles.groundImageSk} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonBar width="90%" height={18} style={styles.titleBarSk} />
                  <SkeletonBar width="60%" height={12} style={styles.subBarSk} />
                </View>
              </View>
              
              <View style={styles.dividerSk} />
              
              <View style={styles.detailsGridSk}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.detailItemSk}>
                    <View style={styles.detailIconSk} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <SkeletonBar width="100%" height={10} style={styles.subBarSk} />
                      <SkeletonBar width="80%" height={14} style={styles.titleBarSk} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* ── Pricing Summary Skeleton ─────────────────────── */}
          <View style={styles.section}>
            <View style={styles.pricingCardSk}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.priceRowSk}>
                  <SkeletonBar width="40%" height={14} style={styles.subBarSk} />
                  <SkeletonBar width="20%" height={14} style={styles.subBarSk} />
                </View>
              ))}
              <View style={styles.dividerSk} />
              <View style={styles.priceRowSk}>
                <SkeletonBar width="30%" height={18} style={styles.titleBarSk} />
                <SkeletonBar width="25%" height={22} style={[styles.titleBarSk, { backgroundColor: '#01b85420' }]} />
              </View>
            </View>
          </View>

          {/* ── Payment Methods Skeleton ─────────────────────── */}
          <View style={styles.section}>
            <SkeletonBar width={160} height={20} style={[styles.titleBarSk, { marginBottom: 16 }]} />
            {[1, 2].map((i) => (
              <View key={i} style={styles.methodCardSk}>
                <View style={styles.methodIconSk} />
                <SkeletonBar width="50%" height={16} style={styles.subBarSk} />
                <View style={{ flex: 1 }} />
                <View style={styles.methodRadioSk} />
              </View>
            ))}
          </View>

          {/* ── Button Skeleton ──────────────────────────────── */}
          <View style={styles.footerSk}>
            <View style={styles.payBtnSk} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  titleBarSk: {
    backgroundColor: '#E2E8F0',
  },
  subBarSk: {
    backgroundColor: '#F1F5F9',
  },

  headerSk: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  backBtnSk: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },

  secureBannerSk: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  secureIconSk: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(1, 184, 84, 0.2)',
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  cardSk: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  groundInfoSk: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  groundImageSk: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  dividerSk: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  detailsGridSk: {
    gap: 16,
  },
  detailItemSk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIconSk: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },

  pricingCardSk: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  priceRowSk: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },

  methodCardSk: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  methodIconSk: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  methodRadioSk: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },

  footerSk: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  payBtnSk: {
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(1, 184, 84, 0.3)',
  },
});
