import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';

const SkeletonItem = ({ style }: { style?: any }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return <Animated.View style={[styles.skeletonBase, { opacity }, style]} />;
};

export default function BookingFormSkeleton() {
  const { width } = useWindowDimensions();
  const isWeb = width >= 900;

  return (
    <View style={styles.container}>
      {/* Title & Price Header */}
      <View style={styles.header}>
        <SkeletonItem style={styles.title} />
        <SkeletonItem style={styles.price} />
      </View>

      {/* Location & Type Row */}
      <View style={styles.row}>
        <View style={styles.flex1}>
          <SkeletonItem style={styles.label} />
          <SkeletonItem style={styles.input} />
        </View>
        <View style={styles.flex1}>
          <SkeletonItem style={styles.label} />
          <SkeletonItem style={styles.input} />
        </View>
      </View>

      {/* Teams Row */}
      <View style={styles.section}>
        <SkeletonItem style={styles.label} />
        <View style={styles.row}>
          <SkeletonItem style={styles.teamBtn} />
          <SkeletonItem style={styles.teamBtn} />
        </View>
      </View>

      {/* Dates */}
      <View style={styles.section}>
        <SkeletonItem style={styles.label} />
        <View style={styles.chipsRow}>
          <SkeletonItem style={styles.dateChip} />
          <SkeletonItem style={styles.dateChip} />
          <SkeletonItem style={styles.dateChip} />
          <SkeletonItem style={styles.dateChip} />
        </View>
      </View>

      {/* Times */}
      <View style={styles.section}>
        <SkeletonItem style={styles.label} />
        <View style={styles.chipsRow}>
          <SkeletonItem style={styles.timeChip} />
          <SkeletonItem style={styles.timeChip} />
          <SkeletonItem style={styles.timeChip} />
          <SkeletonItem style={styles.timeChip} />
        </View>
      </View>

      {/* Coupon */}
      <View style={styles.section}>
        <SkeletonItem style={styles.label} />
        <View style={styles.row}>
          <SkeletonItem style={[styles.input, { flex: 3 }]} />
          <SkeletonItem style={[styles.input, { flex: 1, marginLeft: 10 }]} />
        </View>
      </View>

      {/* Footer Info */}
      <SkeletonItem style={styles.footerText} />

      {/* Action Button */}
      <SkeletonItem style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  skeletonBase: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    width: 120,
    height: 14,
    marginBottom: 8,
  },
  price: {
    width: 180,
    height: 32,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    width: 60,
    height: 12,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
  },
  teamBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChip: {
    width: 70,
    height: 50,
    borderRadius: 12,
  },
  timeChip: {
    width: 80,
    height: 36,
    borderRadius: 12,
  },
  footerText: {
    width: '100%',
    height: 12,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
});
