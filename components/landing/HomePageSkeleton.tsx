import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { landingScrollStyles } from '@/components/landing/landingScrollStyles';

function Bar({ width, height = 14, style }: { width: string | number; height?: number; style?: object }) {
  return (
    <View
      style={[
        styles.bar,
        {
          width: width as any,
          height,
          alignSelf: 'center',
        },
        style,
      ]}
    />
  );
}

export default function HomePageSkeleton() {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.95,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <ScrollView
      style={landingScrollStyles.container}
      contentContainerStyle={landingScrollStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: pulse }}>
        {/* Hero */}
        <View style={styles.heroBlock}>
          <Bar width="38%" height={12} style={styles.barHero} />
          <Bar width="92%" height={28} style={[styles.barHero, { marginTop: 20 }]} />
          <Bar width="78%" height={28} style={[styles.barHero, { marginTop: 10 }]} />
          <Bar width="64%" height={28} style={[styles.barHero, { marginTop: 10 }]} />
          <Bar width="88%" height={16} style={[styles.barHero, { marginTop: 24 }]} />
          <Bar width="72%" height={16} style={[styles.barHero, { marginTop: 8 }]} />
          <View style={styles.heroButtons}>
            <View style={[styles.btnSk, styles.btnPrimary]} />
            <View style={[styles.btnSk, styles.btnSecondary]} />
          </View>
          <View style={styles.heroFootrow}>
            <View style={styles.barHeroSm} />
            <View style={styles.barHeroSm} />
          </View>
        </View>

        {/* Form / cards */}
        <View style={styles.section}>
          <Bar width="40%" height={18} style={styles.barDark} />
          <View style={styles.card}>
            <Bar width="100%" height={48} style={styles.barDark} />
            <Bar width="100%" height={48} style={[styles.barDark, { marginTop: 12 }]} />
            <View style={styles.row2}>
              <View style={styles.half} />
              <View style={styles.half} />
            </View>
            <Bar width="100%" height={52} style={[styles.barDark, { marginTop: 16 }]} />
          </View>
        </View>

        {/* Features strip */}
        <View style={styles.section}>
          <Bar width="36%" height={18} style={styles.barDark} />
          <View style={styles.featureGrid}>
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <View key={k} style={styles.featureCell}>
                <View style={styles.iconSk} />
                <Bar width="80%" height={12} style={styles.barDark} />
                <Bar width="100%" height={10} style={[styles.barDark, { marginTop: 6 }]} />
              </View>
            ))}
          </View>
        </View>

        {/* CTA block */}
        <View style={styles.cta}>
          <Bar width="50%" height={20} style={styles.barOnDark} />
          <Bar width="70%" height={14} style={[styles.barOnDark, { marginTop: 12 }]} />
          <View style={styles.ctaBtnRow}>
            <View style={styles.ctaBtn} />
            <View style={[styles.ctaBtn, styles.ctaBtnGhost]} />
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    backgroundColor: '#2b2f4b',
    paddingTop: Platform.OS === 'web' ? 80 : 60,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  bar: {
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  barHero: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  barHeroSm: {
    width: 120,
    height: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroButtons: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    marginTop: 48,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  btnSk: {
    height: 52,
    borderRadius: 12,
    width: Platform.OS === 'web' ? 168 : '100%',
    maxWidth: 320,
  },
  btnPrimary: {
    backgroundColor: 'rgba(220,141,60,0.35)',
  },
  btnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroFootrow: {
    flexDirection: 'row',
    gap: 32,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
  },
  barDark: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  card: {
    marginTop: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  half: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  featureCell: {
    width: Platform.OS === 'web' ? '31%' : '48%',
    minWidth: 140,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconSk: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  cta: {
    marginHorizontal: 24,
    marginBottom: 40,
    padding: 32,
    borderRadius: 16,
    backgroundColor: '#2b2f4b',
    alignItems: 'center',
  },
  barOnDark: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  ctaBtnRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  ctaBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(220,141,60,0.45)',
    width: Platform.OS === 'web' ? 200 : '100%',
    maxWidth: 280,
  },
  ctaBtnGhost: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
