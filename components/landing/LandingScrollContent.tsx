import React from 'react';
import { ScrollView, View, Platform, useWindowDimensions } from 'react-native';
import LandingPageSections from '@/components/landing/LandingPageSections';
import { landingScrollStyles } from '@/components/landing/landingScrollStyles';
import HeroWeb from '@/components/landing/HeroWeb';
import ScoringStatsSection from '@/components/landing/ScoringStatsSection';
import CalendarTabs from '@/components/landing/CalendarTabs';
import PopularGrounds from '@/components/landing/PopularGrounds';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import GroundsNearYou from '@/components/landing/GroundsNearYou';
import Features from '@/components/landing/Features';
import CallToAction from '@/components/landing/CallToAction';
import SiteFooter from '@/components/web/SiteFooter';
import { DeviceEventEmitter } from 'react-native';

type Variant = 'web' | 'native';

export default function LandingScrollContent({ variant }: { variant: Variant }) {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const heroHeight = width < 900 ? 720 : 850;

  if (isWeb && variant === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          style={[landingScrollStyles.container, { backgroundColor: '#FFFFFF' }]}
          contentContainerStyle={[landingScrollStyles.scrollContent, { backgroundColor: '#FFFFFF' }]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            DeviceEventEmitter.emit('mainScroll', { y });
          }}
        >
          {/* 
            On web, we use sticky positioning for the hero. 
            This keeps it at the top while the rest of the content scrolls over it.
          */}
          <View style={{ 
            position: 'sticky' as any, 
            top: 0, 
            zIndex: 0,
            height: heroHeight,
            width: '100%',
          }}>
            <HeroWeb />
          </View>

          {/* 
            Subsequent Section 2: Scoring & Stats.
            We make this sticky too, so it stays at top after scrolling over hero.
          */}
          <View style={{ 
            position: 'sticky' as any, 
            top: 0, 
            zIndex: 10,
            backgroundColor: '#FFFFFF', // Solid background to cover hero
          }}>
            <ScoringStatsSection />
          </View>

          {/* 
            Subsequent Section 3+: The rest of the page.
            This section will scroll OVER section 2 because it has a higher z-index.
          */}
          <View style={{ 
            backgroundColor: '#FFFFFF', 
            zIndex: 20, 
            position: 'relative',
            marginTop: 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -20 },
            shadowOpacity: 0.1,
            shadowRadius: 30,
          }}>
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
