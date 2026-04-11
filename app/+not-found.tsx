import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { router, Stack } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';
import { ArrowLeft, Home, Search, MapPin } from 'lucide-react-native';

export default function NotFoundScreen() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const content = (
    <View style={styles.container}>
      {/* Background for Web only */}
      {Platform.OS === 'web' && (
        <View style={StyleSheet.absoluteFillObject}>
          <Image
            source={require('../assets/signup-stadium.png')}
            style={styles.bgImage}
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(4,53,41,0.85)' }]} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isLargeScreen && { paddingHorizontal: 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainGroup}>
          <View style={styles.errorCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>404 ERROR</Text>
            </View>

            <Text style={styles.title}>Out of Bounds!</Text>
            <Text style={styles.subtitle}>
              The page you're trying to reach seems to have skipped the boundary. 
              Let's get you back in the game.
            </Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.primaryBtn}
                onPress={() => router.replace('/')}
                activeOpacity={0.8}
              >
                <Home size={20} color="#043529" strokeWidth={2.5} />
                <Text style={styles.primaryBtnText}>Back to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.secondaryBtn}
                onPress={() => router.replace('/book-my-ground' as any)}
                activeOpacity={0.7}
              >
                <Search size={20} color="#01b854" strokeWidth={2} />
                <Text style={styles.secondaryBtnText}>Book Grounds</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.backLink}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
            >
              <ArrowLeft size={16} color="#9ca3af" />
              <Text style={styles.backLinkText}>Go back</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Links for Large Screens */}
          {isLargeScreen && (
            <View style={styles.quickLinks}>
              <Text style={styles.linksTitle}>Popular Destinations</Text>
              <View style={styles.linkGrid}>
                <QuickLink 
                  icon={<MapPin size={18} color="#01b854" />}
                  title="Venues"
                  subtitle="Find nearby grounds"
                  onPress={() => router.replace('/book-my-ground' as any)}
                />
                <QuickLink 
                  icon={<Search size={18} color="#01b854" />}
                  title="Matchmaking"
                  subtitle="Join existing games"
                  onPress={() => router.replace('/find-an-opponent' as any)}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.nativeRoot}>{content}</View>
    </>
  );
}

function QuickLink({ icon, title, subtitle, onPress }: any) {
  return (
    <TouchableOpacity 
      style={styles.linkCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.linkIconWrap}>{icon}</View>
      <View>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#043529',
  },
  container: {
    flex: 1,
    backgroundColor: '#043529',
    borderRadius: 20,
    overflow: 'hidden',
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainGroup: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#06392e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.15)',
    alignItems: 'center',
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
      }
    })
  },
  badge: {
    backgroundColor: 'rgba(0,234,107,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,234,107,0.3)',
  },
  badgeText: {
    color: '#01b854',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f9fafb',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 340,
  },
  buttonGroup: {
    width: '100%',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    marginBottom: 16,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#01b854',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#01b854',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#043529',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#01b854',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: '#01b854',
    fontSize: 14,
    fontWeight: '800',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLinkText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  quickLinks: {
    width: '100%',
    marginTop: 24,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f9fafb',
    marginBottom: 12,
    paddingLeft: 4,
  },
  linkGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  linkCard: {
    flex: 1,
    backgroundColor: 'rgba(6,57,46,0.6)',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  linkIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,234,107,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  }
});
