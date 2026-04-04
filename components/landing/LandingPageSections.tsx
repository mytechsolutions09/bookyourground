import React from 'react';
import { View, StyleSheet } from 'react-native';
import Hero from '@/components/landing/Hero';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import PopularGrounds from '@/components/landing/PopularGrounds';
import Features from '@/components/landing/Features';
import CallToAction from '@/components/landing/CallToAction';
import SiteFooter from '@/components/web/SiteFooter';

type Variant = 'web' | 'native';

/** Hero + sections only (no ScrollView) — parent screens own the scroll wrapper. */
export default function LandingPageSections({ variant }: { variant: Variant }) {
  return (
    <>
      <Hero />
      <PopularGrounds />
      <View style={styles.bookingSectionSpacer}>
        <LandingBookingForm 
          fullWidth 
          separateSearchResults={variant === 'web'} 
          noCard={variant === 'native'}
          hideTitle={variant === 'native'}
        />
      </View>
      <Features />
      <CallToAction />
      {variant === 'web' ? <SiteFooter /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  bookingSectionSpacer: {
    paddingTop: 28,
  },
});
