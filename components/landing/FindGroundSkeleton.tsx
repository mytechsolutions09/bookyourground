import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

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

export default function FindGroundSkeleton() {
  const { width: windowWidth } = useWindowDimensions();
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
    <View style={styles.container}>
      {/* ── Immersive Background Placeholder ────────────────── */}
      <View style={[StyleSheet.absoluteFill, styles.bgPlaceholder]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4, 53, 41, 0.4)' }]} />

      <Animated.View style={[styles.content, { opacity: pulse }]}>
        {/* ── Sport Icon Circle Placeholder ────────────────── */}
        <View style={styles.iconCircleSk} />
        
        {/* ── Hero Title Placeholder ──────────────────────── */}
        <SkeletonBar width="60%" height={44} style={styles.heroTitleSk} />
        <SkeletonBar width="40%" height={44} style={[styles.heroTitleSk, { marginTop: 12 }]} />

        {/* ── Swipe Hint Placeholder ──────────────────────── */}
        <View style={styles.swipeHintSk}>
          <View style={styles.chevronSk} />
          <SkeletonBar width={80} height={12} style={styles.hintBarSk} />
        </View>
      </Animated.View>

      {/* ── Pagination Dots Placeholder ───────────────────── */}
      <View style={styles.dotContainer}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.dotSk} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#043529',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgPlaceholder: {
    backgroundColor: '#032a21',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingBottom: 100,
  },
  bar: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  iconCircleSk: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 30,
  },
  heroTitleSk: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  swipeHintSk: {
    marginTop: 40,
    alignItems: 'center',
    gap: 8,
  },
  chevronSk: {
    width: 24,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 234, 107, 0.2)',
  },
  hintBarSk: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dotContainer: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 10,
  },
  dotSk: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
