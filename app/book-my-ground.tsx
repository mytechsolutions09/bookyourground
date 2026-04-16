import React, { useEffect } from 'react';
import { Platform, View, StyleSheet, ScrollView, useWindowDimensions, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import MobileAppNavbar from '../components/MobileAppNavbar';

export default function BookMyGroundPage() {
  const { width } = useWindowDimensions();
  const { groundId, date, startTime, teamType } = useLocalSearchParams();

  // On small web screens, always render booking under the Grounds tab (with bottom bar).
  useEffect(() => {
    if (Platform.OS === 'web' && width < 900) {
      router.replace('/(tabs)/grounds' as any);
    }
  }, [width]);

  if (Platform.OS === 'web' && width < 900) {
    return null;
  }

  const initialProps = {
    initialGroundId: groundId as string,
    initialDate: date as string,
    initialStartTime: startTime as string,
    initialTeamType: (teamType === 'one' ? 'one' : 'both') as 'one' | 'both',
  };

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <View style={styles.page}>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, styles.activeTab]}
                activeOpacity={0.8}
              >
                <Text style={styles.activeTabText}>Book a Ground</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.tab}
                activeOpacity={0.8}
                onPress={() => router.push('/find-an-opponent' as any)}
              >
                <Text style={styles.tabText}>Find an Opponent</Text>
              </TouchableOpacity>
            </View>

            <LandingBookingForm
              fullWidth
              separateSearchResults
              {...initialProps}
            />
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  // Native (iOS / Android): full-screen booking form with simple navbar.
  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar title="Book a ground" />
      <View style={styles.page}>
        <LandingBookingForm
          fullWidth
          separateSearchResults
          noCard
          bookGroundScreenNative
          hideTitle
          {...initialProps}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#043529',
  },
  page: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 96 : 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
    paddingTop: 8,
  },
  tab: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 99,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#01b854',
    fontSize: 15,
    fontWeight: '800',
  },
});

