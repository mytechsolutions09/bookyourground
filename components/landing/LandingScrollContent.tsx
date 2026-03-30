import React from 'react';
import { ScrollView } from 'react-native';
import LandingPageSections from '@/components/landing/LandingPageSections';
import { landingScrollStyles } from '@/components/landing/landingScrollStyles';

type Variant = 'web' | 'native';

/** Scroll wrapper + landing sections (used by `app/index.tsx` and web Home tab). */
export default function LandingScrollContent({ variant }: { variant: Variant }) {
  return (
    <ScrollView
      style={landingScrollStyles.container}
      contentContainerStyle={landingScrollStyles.scrollContent}
    >
      <LandingPageSections variant={variant} />
    </ScrollView>
  );
}
