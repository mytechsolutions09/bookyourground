import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform, ScrollView } from 'react-native';

function Bar({ width, height = 14, style }: { width: string | number; height?: number; style?: object }) {
  return (
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
}

export default function MatchmakingSkeleton({ isWeb = false, IS_DARK = false }: { isWeb?: boolean; IS_DARK?: boolean }) {
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const cards = [1, 2, 3, 4, 5, 6];

  return (
    <Animated.View style={[styles.container, { opacity: pulse }, isWeb && !IS_DARK && styles.webPadding]}>
      <View style={styles.grid}>
        {cards.map((i) => (
          <View key={i} style={[styles.card, isWeb && !IS_DARK ? styles.webCard : styles.nativeCard]}>
            <View style={styles.imagePlaceholder} />
            <View style={styles.content}>
              <Bar width="60%" height={20} style={styles.titleBar} />
              <Bar width="40%" style={styles.subBar} />
              <View style={styles.row}>
                <View style={styles.iconPlaceholder} />
                <Bar width="30%" />
              </View>
              <View style={styles.row}>
                <View style={styles.iconPlaceholder} />
                <Bar width="50%" />
              </View>
              <View style={styles.footer}>
                <Bar width="100%" height={40} style={styles.buttonPlaceholder} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webPadding: {
    padding: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  webCard: {
    width: '31%',
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  nativeCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  imagePlaceholder: {
    height: 180,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  bar: {
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  titleBar: {
    marginBottom: 4,
  },
  subBar: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  footer: {
    marginTop: 12,
  },
  buttonPlaceholder: {
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
});
