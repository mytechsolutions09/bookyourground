import { Platform, View, StyleSheet, ScrollView, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import LandingBookingForm from '@/components/landing/LandingBookingForm';
import MobileAppNavbar from '../../components/MobileAppNavbar';
import { router } from 'expo-router';
import { Menu as MenuIcon } from 'lucide-react-native';

export default function GroundsTabScreen() {
  const { width } = useWindowDimensions();
  const isSmall = width < 900;

  if (Platform.OS === 'web') {
    return (
      <WebLayout>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
              <View style={[styles.webTabContainer, isSmall && styles.webTabContainerNative]}>
                <TouchableOpacity 
                  style={[styles.tab, styles.activeTab]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeTabText}>Book a Ground</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.tab}
                  onPress={() => router.push('/find-an-opponent')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tabText}>Find an Opponent</Text>
                </TouchableOpacity>
              </View>
          <View style={styles.page}>
            <LandingBookingForm fullWidth />
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  // Native: full-screen booking with navbar + logo.
  return (
    <View style={styles.nativeRoot}>
      <MobileAppNavbar 
        title="Book a ground" 
        titleColor="#043529" 
        lightBg 
        rightAction={
          <TouchableOpacity onPress={() => {}}>
            <MenuIcon size={24} color="#043529" />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, styles.activeTab]}
          activeOpacity={0.7}
        >
          <Text style={styles.activeTabText}>Book a Ground</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => router.push('/find-an-opponent')}
          activeOpacity={0.7}
        >
          <Text style={styles.tabText}>Find an Opponent</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.page}>
        <LandingBookingForm fullWidth noCard bookGroundScreenNative hideTitle />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  page: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 0 : 0,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  scroll: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#043529',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTab: {
    backgroundColor: '#043529',
    borderColor: '#043529',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  webTabContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  webTabContainerNative: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    maxWidth: '100%',
    paddingHorizontal: 16,
  },
});


