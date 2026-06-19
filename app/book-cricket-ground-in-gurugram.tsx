import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import WebLayout from '@/components/web/WebLayout';
import GroundCard from '@/components/grounds/GroundCard';
import Head from 'expo-router/head';
import { MapPin, Search, ShieldCheck, Award, Star, ArrowRight, HelpCircle } from 'lucide-react-native';
import { makeGroundPath } from '@/utils/groundSlug';

interface GroundImage {
  id: string;
  image_url: string;
}

interface Review {
  rating: number;
}

interface Ground {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pitch_type: string;
  cricket_pitch_surface: string;
  min_price: number;
  base_price_per_hour: number;
  has_floodlights: boolean;
  has_parking: boolean;
  has_changing_rooms: boolean;
  has_pavilion: boolean;
  has_practice_nets: boolean;
  verified: boolean;
  approved: boolean;
  active: boolean;
  ground_images: GroundImage[];
  reviews: Review[];
}

export default function BookCricketGroundGurugramPage() {
  const [grounds, setGrounds] = useState<Ground[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGurugramGrounds() {
      try {
        const { data, error } = await supabase
          .from('grounds')
          .select('*, ground_images(*), reviews(rating)')
          .in('city', ['Gurugram', 'New Gurugram'])
          .eq('state', 'Haryana')
          .eq('active', true)
          .eq('approved', true);

        if (!error && data) {
          setGrounds(data);
        }
      } catch (err) {
        console.error('Error fetching Gurugram grounds:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGurugramGrounds();
  }, []);

  const navigateToSearch = () => {
    router.push({
      pathname: '/search',
      params: { sport: 'Cricket', location: 'New Gurugram__Haryana' }
    } as any);
  };

  const renderGroundCard = (item: Ground) => {
    const displayPrice = item.min_price || item.base_price_per_hour || 0;
    const isBox = String(item.pitch_type || '').toLowerCase().includes('box');
    const unitLabel = isBox ? '/hr' : '/match';
    const path = makeGroundPath(item);

    return (
      <View key={item.id} style={styles.cardWrapper}>
        <GroundCard
          ground={item}
          glass={true}
          displayPricePerUnit={displayPrice}
          unitLabelOverride={unitLabel}
          onPress={() => router.push(path as any)}
        />
      </View>
    );
  };

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.badge}>🏏 GURUGRAM & NEW GURUGRAM CRICKET BOOKINGS</Text>
        <Text style={styles.title}>Book Cricket Grounds & Nets in Gurugram & New Gurugram</Text>
        <Text style={styles.subtitle}>
          Compare premium turf wickets, practice nets, and day-night cricket grounds across Gurugram and New Gurugram. Check real-time slots and book instantly.
        </Text>
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={navigateToSearch}
        >
          <Text style={styles.ctaButtonText}>Search All Gurugram Venues</Text>
          <ArrowRight size={18} color="#043529" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>

      {/* Verified Badges Section */}
      <View style={styles.badgesContainer}>
        <View style={styles.badgeCard}>
          <ShieldCheck size={28} color="#00ea6b" style={styles.badgeIcon} />
          <Text style={styles.badgeCardTitle}>100% Slot Guarantee</Text>
          <Text style={styles.badgeCardDesc}>No double-bookings. Once booked, your pitch is fully locked and guaranteed.</Text>
        </View>
        <View style={styles.badgeCard}>
          <Award size={28} color="#00ea6b" style={styles.badgeIcon} />
          <Text style={styles.badgeCardTitle}>Verified Pitches</Text>
          <Text style={styles.badgeCardDesc}>All Gurugram NCR grounds are personally audited for turf quality and light requirements.</Text>
        </View>
        <View style={styles.badgeCard}>
          <MapPin size={28} color="#00ea6b" style={styles.badgeIcon} />
          <Text style={styles.badgeCardTitle}>Easy Locations</Text>
          <Text style={styles.badgeCardDesc}>Easily discover cricket grounds near NH-48, Golf Course Road, and Dwarka Expressway.</Text>
        </View>
      </View>

      {/* Dynamic Grounds Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Available Cricket Grounds in Gurugram & New Gurugram</Text>
        <Text style={styles.sectionSubtitle}>
          Browse top-rated cricket venues with turf wickets, floodlights, canteens, and pavilions in Gurugram and New Gurugram.
        </Text>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#00ea6b" />
          </View>
        ) : grounds.length > 0 ? (
          <View style={styles.grid}>
            {grounds.map(renderGroundCard)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No grounds listed in Gurugram at the moment.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={navigateToSearch}>
              <Text style={styles.emptyButtonText}>Explore Nearby Locations</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* FAQs Section */}
      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>Gurugram Cricket Ground Booking FAQs</Text>
        
        <View style={styles.faqItem}>
          <View style={styles.faqHeader}>
            <HelpCircle size={18} color="#00ea6b" style={{ marginRight: 8 }} />
            <Text style={styles.faqQuestion}>What pitch surfaces are available in Gurugram cricket grounds?</Text>
          </View>
          <Text style={styles.faqAnswer}>
            Gurugram NCR grounds listed on BookYourGround feature standard Turf wickets, AstroTurf/Matting pitches, and indoor concrete nets to suit different season and bowling profiles.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <View style={styles.faqHeader}>
            <HelpCircle size={18} color="#00ea6b" style={{ marginRight: 8 }} />
            <Text style={styles.faqQuestion}>Can we book grounds for night matches in Gurugram NCR?</Text>
          </View>
          <Text style={styles.faqAnswer}>
            Yes, many venues are equipped with high-intensity commercial floodlights designed for professional day-night cricket. Simply choose a slot after sunset.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <View style={styles.faqHeader}>
            <HelpCircle size={18} color="#00ea6b" style={{ marginRight: 8 }} />
            <Text style={styles.faqQuestion}>What is the refund and cancellation policy?</Text>
          </View>
          <Text style={styles.faqAnswer}>
            Cancellation timelines depend on individual venue guidelines. Standard policies let you cancel up to 24-48 hours before match kickoff for a full or partial booking refund.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <>
        <Head>
          <title>Book Cricket Grounds & Nets in Gurugram & New Gurugram | BookYourGround</title>
          <meta name="description" content="Find and book top cricket grounds, turfs, and practice nets in Gurugram & New Gurugram NCR. Get real-time slot availability, verified venues, floodlight facilities, and instant booking confirmations." />
          <link rel="canonical" href="https://bookyourground.com/book-cricket-ground-in-gurugram" />
          <meta property="og:title" content="Book Cricket Grounds & Nets in Gurugram & New Gurugram | BookYourGround" />
          <meta property="og:description" content="Instantly book verified cricket pitches and practice nets in Gurugram and New Gurugram NCR. Secure slots online with 100% slot guarantee." />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://bookyourground.com/book-cricket-ground-in-gurugram" />
          <meta property="og:site_name" content="BookYourGround" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Book Cricket Grounds & Nets in Gurugram & New Gurugram | BookYourGround" />
          <meta name="twitter:description" content="Compare premium pitches, box cricket venues, and nets in Gurugram and New Gurugram. Confirm your slot instantly." />
        </Head>
        <WebLayout isPublicNoSidebar={true}>
          {content}
        </WebLayout>
      </>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 80,
    alignItems: 'center',
    width: '100%',
  },
  heroSection: {
    width: '100%',
    maxWidth: 1000,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
    backgroundColor: '#043529',
    paddingVertical: 64,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  badge: {
    backgroundColor: 'rgba(0, 234, 107, 0.15)',
    color: '#00ea6b',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 100,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: 'Inter',
    maxWidth: 650,
    marginBottom: 32,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ea6b',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 100,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  badgesContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    width: '100%',
    maxWidth: 1000,
    gap: 24,
    marginBottom: 56,
    paddingHorizontal: 16,
  },
  badgeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  badgeIcon: {
    marginBottom: 16,
  },
  badgeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  badgeCardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  sectionContainer: {
    width: '100%',
    maxWidth: 1000,
    paddingHorizontal: 16,
    marginBottom: 64,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter',
    marginBottom: 36,
  },
  loaderContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  grid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
    width: '100%',
  },
  cardWrapper: {
    width: Platform.OS === 'web' ? 'calc(33.333% - 16px)' : '100%',
    minWidth: 280,
    maxWidth: Platform.OS === 'web' ? undefined : 400,
    alignSelf: 'center',
  },
  emptyContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  emptyButton: {
    backgroundColor: '#043529',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Inter',
  },
  faqSection: {
    width: '100%',
    maxWidth: 1000,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  faqTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    flex: 1,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontFamily: 'Inter',
    paddingLeft: 26,
  },
});
