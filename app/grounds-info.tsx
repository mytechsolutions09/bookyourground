import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { 
  Trophy, 
  Users, 
  ArrowRight, 
  CheckCircle,
  Clock
} from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';
import { router } from 'expo-router';
import Head from 'expo-router/head';

type TabId = 'cricket-pitch' | 'cricket-nets' | 'football-turf';

export default function GroundsInfoPage() {
  const [activeTab, setActiveTab] = useState<TabId>('cricket-pitch');

  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroBadge}>🔍 VENUE REFERENCE GUIDE</Text>
          <Text style={styles.heroTitle}>Sports Grounds &amp; Turfs Directory</Text>
          <Text style={styles.heroSubtitle}>
            Unsure about dimensions, rules, or turf requirements? Explore our complete specifications guide for cricket pitches, box nets, and football turfs to find the perfect venue.
          </Text>
        </View>

        {/* Interactive Selector Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'cricket-pitch' && styles.tabActiveButton]} 
            onPress={() => setActiveTab('cricket-pitch')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'cricket-pitch' && styles.tabActiveButtonText]}>
              🏏 Cricket Ground
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'cricket-nets' && styles.tabActiveButton]} 
            onPress={() => setActiveTab('cricket-nets')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'cricket-nets' && styles.tabActiveButtonText]}>
              🕸️ Cricket Nets &amp; Box
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'football-turf' && styles.tabActiveButton]} 
            onPress={() => setActiveTab('football-turf')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'football-turf' && styles.tabActiveButtonText]}>
              ⚽ Football Turf
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Specific Content */}
        {activeTab === 'cricket-pitch' && (
          <View style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIconContainer}>
                <Trophy size={28} color="#00ea6b" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Full-Size Cricket Grounds</Text>
                <Text style={styles.cardSubtitle}>Perfect for professional tournaments, corporate leagues, and 11-a-side weekend matches.</Text>
              </View>
            </View>

            {/* Specifications Grid */}
            <Text style={styles.sectionHeading}>Specifications &amp; Layout</Text>
            <View style={styles.specGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Boundary Radius</Text>
                <Text style={styles.specValue}>45m - 75m</Text>
                <Text style={styles.specDesc}>Varies based on venue capacity and local guidelines.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Pitch Types</Text>
                <Text style={styles.specValue}>Clay, Turf, Matting</Text>
                <Text style={styles.specDesc}>Available in natural clay/turf or synthetic roll-out mats.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Capacity</Text>
                <Text style={styles.specValue}>22 Players (11v11)</Text>
                <Text style={styles.specDesc}>Standard limit for squad size on field. Sub-players welcome.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Best Suited For</Text>
                <Text style={styles.specValue}>T20 &amp; Leather Ball</Text>
                <Text style={styles.specDesc}>Heavy-duty matches, tennis-ball &amp; leather-ball tournaments.</Text>
              </View>
            </View>

            {/* Guidelines & Equipment */}
            <View style={styles.infoTwoColumn}>
              <View style={styles.infoColumn}>
                <Text style={styles.columnHeading}>📖 Essential Rules &amp; Etiquette</Text>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Spike shoes are allowed ONLY on natural turf pitches; otherwise, studs/flats.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Reporting time is strictly 15 minutes before the booked slot.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>White clothing or sports kits are recommended for tournament play.</Text>
                </View>
              </View>

              <View style={styles.infoColumn}>
                <Text style={styles.columnHeading}>🎒 Equipment &amp; Amenities</Text>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Sight screens, wickets, and boundary ropes are included by default.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Floodlights are available for evening bookings (hourly utility fee may apply).</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Cricket leather ball kits, balls, and pads are available on lease at selective venues.</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/search?sport=Cricket' as any)}
            >
              <Text style={styles.actionButtonText}>Browse Cricket Grounds</Text>
              <ArrowRight size={18} color="#043529" />
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'cricket-nets' && (
          <View style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIconContainer}>
                <Clock size={28} color="#00ea6b" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Cricket Practice Nets &amp; Box</Text>
                <Text style={styles.cardSubtitle}>Ideal for solo batting practice, bowling training, or high-intensity box cricket matches with small teams.</Text>
              </View>
            </View>

            {/* Specifications Grid */}
            <Text style={styles.sectionHeading}>Specifications &amp; Layout</Text>
            <View style={styles.specGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Dimension</Text>
                <Text style={styles.specValue}>10m - 15m Length</Text>
                <Text style={styles.specDesc}>Standard pitch-length nets with safety enclosures.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Surface</Text>
                <Text style={styles.specValue}>Premium AstroTurf</Text>
                <Text style={styles.specDesc}>Even bounce, high-traction artificial grass mats.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Capacity</Text>
                <Text style={styles.specValue}>2 - 8 Players</Text>
                <Text style={styles.specDesc}>Ideal for batting drills, bowling speed-checks, or 4v4 matches.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Machines Available</Text>
                <Text style={styles.specValue}>RoboArm &amp; Bowling Machines</Text>
                <Text style={styles.specDesc}>Rentable bowling machines with speeds scaling up to 140km/h.</Text>
              </View>
            </View>

            {/* Guidelines & Equipment */}
            <View style={styles.infoTwoColumn}>
              <View style={styles.infoColumn}>
                <Text style={styles.columnHeading}>📖 Practice Rules</Text>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Helmets and complete safety guards are mandatory for leather ball practice.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Metal spikes are strictly prohibited to prevent AstroTurf damage.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>No food items or sweetened drinks are allowed inside the nets.</Text>
                </View>
              </View>

              <View style={styles.infoColumn}>
                <Text style={styles.columnHeading}>🎒 Training Assets</Text>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Automated bowling machines with operator support on request.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Target stumps and cones for fielding/bowling practice are provided.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Heavy-duty netting to catch all high-speed hooks and drives safely.</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/search?sport=Cricket' as any)}
            >
              <Text style={styles.actionButtonText}>Book Practice Nets</Text>
              <ArrowRight size={18} color="#043529" />
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'football-turf' && (
          <View style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.headerIconContainer}>
                <Users size={28} color="#00ea6b" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Football Turfs (5v5, 7v7, 11v11)</Text>
                <Text style={styles.cardSubtitle}>Shock-absorbent synthetic grass turfs designed for fast paced five-a-side or standard matches.</Text>
              </View>
            </View>

            {/* Specifications Grid */}
            <Text style={styles.sectionHeading}>Specifications &amp; Layout</Text>
            <View style={styles.specGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Sizes Offered</Text>
                <Text style={styles.specValue}>5v5, 7v7 &amp; 11v11</Text>
                <Text style={styles.specDesc}>Choose from compact 5v5 arenas to expansive 11v11 fields.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Turf Material</Text>
                <Text style={styles.specValue}>3G Synthetic Grass</Text>
                <Text style={styles.specDesc}>High density monofilament fiber with eco-friendly rubber crumbs.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Recommended Footwear</Text>
                <Text style={styles.specValue}>Turf Shoes / Flats</Text>
                <Text style={styles.specDesc}>Rubber studs (TF) are ideal. Strict ban on metal/hard spikes.</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Fencing &amp; Nets</Text>
                <Text style={styles.specValue}>High Net Enclosures</Text>
                <Text style={styles.specDesc}>Fully enclosed boundaries to keep play continuous without lost balls.</Text>
              </View>
            </View>

            {/* Guidelines & Equipment */}
            <View style={styles.infoTwoColumn}>
              <View style={styles.infoColumn}>
                <Text style={styles.columnHeading}>📖 Turf Guidelines</Text>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Metal-cleat boots (studs) are forbidden as they tear the synthetic turf base.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Booking slots are hourly; ensure clean-up 5 minutes before slot end.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Slide tackles should be controlled to prevent friction turf burns.</Text>
                </View>
              </View>

              <View style={styles.infoColumn}>
                <Text style={styles.columnHeading}>🎒 Matchday Extras</Text>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Fresh bibs/pinnies in two contrasting colors are provided on-site.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>High-quality size 4 or size 5 footballs are available at the counter.</Text>
                </View>
                <View style={styles.ruleItem}>
                  <CheckCircle size={16} color="#00ea6b" style={styles.ruleIcon} />
                  <Text style={styles.ruleText}>Cozy dugout benches, seating stands, and hydration setups at boundaries.</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/search?sport=Football' as any)}
            >
              <Text style={styles.actionButtonText}>Book Football Turfs</Text>
              <ArrowRight size={18} color="#043529" />
            </TouchableOpacity>
          </View>
        )}

        {/* General FAQ block */}
        <View style={styles.faqBlock}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I book grounds for tournaments and corporate events?</Text>
            <Text style={styles.faqAnswer}>
              Yes, absolutely! We provide dedicated corporate packages, match scoring facilities, referee hiring, custom schedules, and branding solutions. Visit our <Text style={styles.faqLink} onPress={() => router.push('/corporate' as any)}>Corporate Events</Text> page to get a quote.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What happens in case of bad weather/rain?</Text>
            <Text style={styles.faqAnswer}>
              Refund or reschedule policies vary by venue, but most turfs have advanced drainage systems that enable play during light drizzles. You can review specific venue policies under their detail cards prior to booking, or contact venue support for help.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I cancel or reschedule my slot?</Text>
            <Text style={styles.faqAnswer}>
              You can cancel or reschedule bookings directly via your <Text style={styles.faqLink} onPress={() => router.push('/bookings' as any)}>My Bookings</Text> dashboard. Refund eligibility scales relative to the cancellation lead time before your scheduled slot.
            </Text>
          </View>
        </View>

        <SiteFooter />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <>
        <Head>
          <title>Grounds Info &amp; Specifications | BookYourGround</title>
          <meta name="description" content="Explore dimensions, turf specifications, shoe guidelines, and amenities for cricket grounds, practice nets, and football turfs." />
          <link rel="canonical" href="https://bookyourground.com/grounds-info" />
        </Head>
        <WebLayout isPublicNoSidebar={true}>{content}</WebLayout>
      </>
    );
  }

  return content;
}

const tabTransition = (Platform.OS === 'web' ? { transition: 'all 0.2s ease' } : {}) as any;
const actionButtonTransition = (Platform.OS === 'web' ? { transition: 'transform 0.2s ease, opacity 0.2s ease' } : {}) as any;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 40 : 64,
    paddingBottom: 40,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  heroSection: {
    backgroundColor: '#043529',
    borderRadius: 20,
    padding: 36,
    marginBottom: 32,
    alignItems: 'center',
  },
  heroBadge: {
    backgroundColor: 'rgba(0, 234, 107, 0.15)',
    color: '#00ea6b',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 14,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter',
    maxWidth: 720,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  tabButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    ...tabTransition,
  },
  tabActiveButton: {
    backgroundColor: '#043529',
    borderColor: '#043529',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
  },
  tabActiveButtonText: {
    color: '#FFFFFF',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 24,
  },
  headerIconContainer: {
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
    padding: 16,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: 'Inter',
    maxWidth: 700,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 36,
  },
  specItem: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  specValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  specDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    fontFamily: 'Inter',
  },
  infoTwoColumn: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 32,
    marginBottom: 36,
  },
  infoColumn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  columnHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#043529',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  ruleIcon: {
    marginTop: 3,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontFamily: 'Inter',
  },
  actionButton: {
    backgroundColor: '#00ea6b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 100,
    alignSelf: 'stretch',
    marginTop: 8,
    ...actionButtonTransition,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  faqBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  faqItem: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 20,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  faqLink: {
    color: '#01b854',
    fontWeight: '600',
  },
});
