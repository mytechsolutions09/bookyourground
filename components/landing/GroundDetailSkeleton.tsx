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

export default function GroundDetailSkeleton() {
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
          {/* ── Image Gallery Skeleton ───────────────────────── */}
          <View style={styles.imageCardSk}>
            <View style={styles.heroImageSk} />
            <View style={styles.thumbScrollSk}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.thumbSk} />
              ))}
            </View>
          </View>

          {/* ── Ground Info Skeleton ─────────────────────────── */}
          <View style={styles.section}>
            <SkeletonBar width="80%" height={32} style={styles.titleBarSk} />
            <View style={{ marginTop: 12 }}>
              <SkeletonBar width="90%" height={14} style={styles.subBarSk} />
              <SkeletonBar width="40%" height={14} style={[styles.subBarSk, { marginTop: 6 }]} />
            </View>

            <View style={styles.starsRowSk}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.starSk} />
              ))}
              <SkeletonBar width={80} height={14} style={[styles.subBarSk, { marginLeft: 8 }]} />
            </View>

            <View style={styles.directionsBtnSk} />
          </View>

          {/* ── Booking Form Skeleton ────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.formCardSk}>
              <SkeletonBar width="100%" height={48} style={styles.inputSk} />
              <View style={styles.formRowSk}>
                <View style={styles.halfInputSk} />
                <View style={styles.halfInputSk} />
              </View>
              <SkeletonBar width="100%" height={52} style={styles.btnSk} />
            </View>
          </View>

          {/* ── About Section Skeleton ───────────────────────── */}
          <View style={styles.section}>
            <SkeletonBar width="30%" height={22} style={styles.titleBarSk} />
            <View style={{ marginTop: 16 }}>
              <SkeletonBar width="100%" height={14} style={styles.subBarSk} />
              <SkeletonBar width="100%" height={14} style={[styles.subBarSk, { marginTop: 8 }]} />
              <SkeletonBar width="70%" height={14} style={[styles.subBarSk, { marginTop: 8 }]} />
            </View>
          </View>

          {/* ── Details Section Skeleton ─────────────────────── */}
          <View style={styles.section}>
            <SkeletonBar width="30%" height={22} style={styles.titleBarSk} />
            <View style={{ marginTop: 16 }}>
              <SkeletonBar width="50%" height={14} style={styles.subBarSk} />
            </View>
          </View>

          {/* ── Map Section Skeleton ─────────────────────────── */}
          <View style={styles.section}>
            <SkeletonBar width="35%" height={22} style={styles.titleBarSk} />
            <View style={styles.mapPlaceholderSk} />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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

  imageCardSk: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 20,
  },
  heroImageSk: {
    height: 300,
    backgroundColor: '#F1F5F9',
  },
  thumbScrollSk: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  thumbSk: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  starsRowSk: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  starSk: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  directionsBtnSk: {
    width: 120,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginTop: 16,
  },

  formCardSk: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  inputSk: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formRowSk: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInputSk: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnSk: {
    backgroundColor: 'rgba(1, 184, 84, 0.15)',
    borderRadius: 14,
  },

  mapPlaceholderSk: {
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});
