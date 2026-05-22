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



export default function HomeScreenSkeleton() {
  const { width } = useWindowDimensions();
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
        {/* Mobile Hero Skeleton */}
        <Animated.View style={{ backgroundColor: '#134d40', paddingTop: 50, paddingBottom: 10, paddingHorizontal: 20, opacity: pulse }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <SkeletonBar width={120} height={20} style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SkeletonBar width={40} height={40} style={{ borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <SkeletonBar width={40} height={40} style={{ borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            </View>
          </View>
          <SkeletonBar width={100} height={14} style={{ backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 8 }} />
          <SkeletonBar width={200} height={24} style={{ backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
          <SkeletonBar width={250} height={14} style={{ backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 24 }} />
          
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, height: 50, paddingHorizontal: 16, alignItems: 'center' }}>
            <SkeletonBar width={20} height={20} style={{ borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <SkeletonBar width={150} height={14} style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 12 }} />
          </View>
        </Animated.View>
        <Animated.View style={{ opacity: pulse }}>
          {/* ── Quick Actions Skeleton ───────────────────────── */}
          <View style={styles.quickActionsSection}>
            <View style={styles.findGroundBtnSk}>
              <View style={styles.findGroundIconBoxSk} />
              <View style={styles.findGroundTextBox}>
                <SkeletonBar width="40%" height={17} style={styles.titleBarSk} />
                <SkeletonBar width="60%" height={12} style={[styles.subBarSk, { marginTop: 4 }]} />
              </View>
              <View style={styles.arrowSk} />
            </View>
          </View>

          {/* ── Section Header Skeleton ─────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <SkeletonBar width={100} height={11} style={styles.labelBarSk} />
                <SkeletonBar width={180} height={22} style={[styles.titleBarSk, { marginTop: 6 }]} />
              </View>
            </View>

            {/* ── Popular Grounds Horizontal List Skeleton ──── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.horizontalItem}>
                  <View style={styles.groundCardSk}>
                    <View style={styles.groundImageWrapSk} />
                    <View style={styles.groundCardBodySk}>
                      <View style={styles.groundMeta}>
                        <SkeletonBar width="40%" height={11} style={styles.subBarSk} />
                        <SkeletonBar width="20%" height={11} style={styles.subBarSk} />
                      </View>
                      <View style={styles.groundFooter}>
                        <SkeletonBar width="50%" height={18} style={styles.titleBarSk} />
                        <View style={styles.bookNowBtnSk} />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* ── CTA Banner Skeleton ─────────────────────────── */}
          <View style={styles.ctaBanner}>
            <SkeletonBar width="60%" height={28} style={styles.ctaBar} />
            <SkeletonBar width="80%" height={15} style={[styles.ctaBarSub, { marginTop: 12 }]} />
            <View style={styles.ctaButtonSk} />
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
    paddingBottom: 24,
  },
  bar: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  heroBar: {
    backgroundColor: '#E2E8F0',
  },
  heroBarSub: {
    backgroundColor: '#CBD5E1',
  },
  labelBarSk: {
    backgroundColor: 'rgba(1, 184, 84, 0.15)',
  },
  titleBarSk: {
    backgroundColor: '#E2E8F0',
  },
  subBarSk: {
    backgroundColor: '#F1F5F9',
  },

  // ── Premium Hero ────────────────────
  premiumHero: {
    backgroundColor: '#F1F5F9', // Light grey instead of dark green
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: 64,
  },
  heroPadding: {
    paddingHorizontal: 24,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileButtonSk: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 28,
  },
  heroStatBox: {
    flex: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  floatingSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 20,
  },
  searchIconSk: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  searchBarSk: {
    backgroundColor: '#F8FAFC',
  },
  heroCategories: {
    flexDirection: 'row',
    gap: 10,
  },
  heroCatChipSk: {
    width: 80,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // ── Quick Actions ─────────────────────────────
  quickActionsSection: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 12,
    zIndex: 200,
  },
  findGroundBtnSk: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  findGroundIconBoxSk: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
  },
  findGroundTextBox: {
    flex: 1,
  },
  arrowSk: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },

  // ── Sections ──────────────────────────────────
  section: {
    marginTop: 8,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  horizontalList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 8,
  },
  horizontalItem: {
    width: 240,
  },
  groundCardSk: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  groundImageWrapSk: {
    height: 130,
    backgroundColor: '#F1F5F9',
  },
  groundCardBodySk: {
    padding: 12,
  },
  groundMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  groundFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookNowBtnSk: {
    width: 70,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(1, 184, 84, 0.1)',
  },

  // ── CTA Banner ────────────────────────────────
  ctaBanner: {
    margin: 16,
    marginTop: 32,
    backgroundColor: '#F1F5F9', // Light grey
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ctaBar: {
    backgroundColor: '#E2E8F0',
  },
  ctaBarSub: {
    backgroundColor: '#CBD5E1',
  },
  ctaButtonSk: {
    width: 180,
    height: 52,
    borderRadius: 20,
    backgroundColor: 'rgba(1, 184, 84, 0.3)',
    marginTop: 32,
  },
});
