import React from 'react';
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
      {variant === 'web' ? <LandingBookingForm /> : null}
      <PopularGrounds />
      <Features />
      <CallToAction />
      {variant === 'web' ? <SiteFooter /> : null}
    </>
  );
}
