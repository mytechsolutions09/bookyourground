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
        <Animated.View style={{ opacity: pulse }}>
          {/* ── Premium Hero Skeleton ─────────────────────────── */}
          <View style={[styles.premiumHero, { paddingTop: insets.top + 20 }]}>
            <View style={styles.heroPadding}>
              <View style={[styles.heroHeaderRow, { justifyContent: 'flex-end' }]}>
                <View style={styles.profileButtonSk} />
              </View>

              <SkeletonBar width="70%" height={34} style={styles.heroBar} />
              <SkeletonBar width="50%" height={34} style={[styles.heroBar, { marginTop: 8 }]} />

              <View style={{ marginTop: 16 }}>
                <SkeletonBar width="90%" height={15} style={styles.heroBarSub} />
                <SkeletonBar width="60%" height={15} style={[styles.heroBarSub, { marginTop: 6 }]} />
              </View>

              <View style={styles.heroStatsContainer}>
                {[1, 2, 3].map((i) => (
                  <React.Fragment key={i}>
                    <View style={styles.heroStatBox}>
                      <SkeletonBar width="60%" height={18} style={styles.heroBar} />
                      <SkeletonBar width="80%" height={10} style={[styles.heroBarSub, { marginTop: 4 }]} />
                    </View>
                    {i < 3 && <View style={styles.heroStatDivider} />}
                  </React.Fragment>
                ))}
              </View>

              <View style={styles.floatingSearchContainer}>
                <View style={styles.searchIconSk} />
                <SkeletonBar width="60%" height={15} style={styles.searchBarSk} />
              </View>

              <View style={styles.heroCategories}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.heroCatChipSk} />
                ))}
              </View>
            </View>
          </View>

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
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
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
    marginTop: -32,
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
