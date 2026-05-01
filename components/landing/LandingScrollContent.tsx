import React from 'react';
import {
  ScrollView,
  View,
  Platform,
  useWindowDimensions,
  DeviceEventEmitter,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import LandingPageSections from '@/components/landing/LandingPageSections';
import { landingScrollStyles } from '@/components/landing/landingScrollStyles';
import HeroWeb from '@/components/landing/HeroWeb';
import HowItWorks from '@/components/landing/HowItWorks';
import CalendarTabs from '@/components/landing/CalendarTabs';
import PopularGrounds from '@/components/landing/PopularGrounds';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import GroundsNearYou from '@/components/landing/GroundsNearYou';
import Features from '@/components/landing/Features';
import CallToAction from '@/components/landing/CallToAction';
import SiteFooter from '@/components/web/SiteFooter';
import FindOpposition from '@/components/landing/FindOpposition';
import {
  Search as SearchIcon,
  ArrowRight,
  Trophy,
  Users as UsersIcon,
  Swords,
} from 'lucide-react-native';
import { router as expoRouter } from 'expo-router';

const SPORT_CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Football', value: 'football' },
  { label: 'Cricket', value: 'cricket' },
  { label: 'Box Cricket', value: 'box' },
  { label: 'Multi-Sport', value: 'multi' },
];

type Variant = 'web' | 'native';

export default function LandingScrollContent({
  variant,
}: {
  variant: Variant;
}) {
  const isWeb = Platform.OS === 'web';
  const { width, height } = useWindowDimensions();
  const isCompact = width < 900;
  const heroHeight = isCompact ? height : 850;

  if (isWeb && variant === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={[
            landingScrollStyles.container,
            { backgroundColor: '#FFFFFF' },
          ]}
          contentContainerStyle={[
            landingScrollStyles.scrollContent,
            { backgroundColor: '#FFFFFF', flexGrow: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            DeviceEventEmitter.emit('mainScroll', { y });
          }}
        >
          {/* 
            Layer 1: Fixed/Sticky Hero Section (zIndex: 0)
          */}
          <View
            style={{
              position: 'sticky' as any,
              top: 0,
              zIndex: 0,
              height: 850,
              width: '100%',
              backgroundColor: '#000',
            }}
          >
            <HeroWeb />
          </View>

          {/* 
            Layer 2: Find Opposition (zIndex: 10)
            This scrolls over Hero, then stays sticky at top: 0.
          */}
          <View
            style={{
              position: 'sticky' as any,
              top: 0,
              zIndex: 10,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 -20px 40px rgba(0,0,0,0.1)',
            }}
          >
            {isCompact && (
              <View style={styles.mobileQuickActions}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mobileCatScroll}
                >
                  {SPORT_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={styles.mobileCatChip}
                      onPress={() =>
                        expoRouter.push({
                          pathname: '/grounds',
                          params: { type: cat.value },
                        } as any)
                      }
                    >
                      <Text style={styles.mobileCatText}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.mobileFindBtn}
                  onPress={() => expoRouter.push('/select-sport' as any)}
                  activeOpacity={0.9}
                >
                  <View style={styles.mobileFindIconBox}>
                    <SearchIcon size={20} color="#00ea6b" strokeWidth={3} />
                  </View>
                  <View style={styles.mobileFindTextBox}>
                    <Text style={styles.mobileFindTitle}>Find a ground</Text>
                    <Text style={styles.mobileFindSub}>
                      Pick your sport & play
                    </Text>
                  </View>
                  <ArrowRight size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            )}
            <FindOpposition />
          </View>

          {/* 
            Layer 3: How It Works (zIndex: 20)
            This scrolls over Layer 2, then stays sticky.
          */}
          <View
            style={{
              position: 'sticky' as any,
              top: 0,
              zIndex: 20,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 -20px 40px rgba(0,0,0,0.1)',
            }}
          >
            <HowItWorks />
          </View>

          {/* 
            Layer 4: The rest of the content (zIndex: 30)
          */}
          <View
            style={{
              zIndex: 30,
              backgroundColor: '#FFFFFF',
              position: 'relative',
              boxShadow: '0 -20px 40px rgba(0,0,0,0.1)',
            }}
          >
            <CalendarTabs />
            <PopularGrounds />
            <GroundsNearYou />
            <Features />
            <CallToAction />
            <SiteFooter />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={landingScrollStyles.container}
      contentContainerStyle={landingScrollStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LandingPageSections variant={variant} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mobileQuickActions: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginTop: -20, // Slight overlap for depth
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 10,
  },
  mobileCatScroll: {
    paddingBottom: 16,
    gap: 10,
  },
  mobileCatChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  mobileCatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'Inter',
  },
  mobileFindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  mobileFindIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileFindTextBox: {
    flex: 1,
    gap: 2,
  },
  mobileFindTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  mobileFindSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
});
