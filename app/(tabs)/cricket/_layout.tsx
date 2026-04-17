import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { 
  Swords, 
  Trophy, 
  Users, 
  BarChart3, 
  PlayCircle,
  Plus,
  X,
  Radio,
  HelpCircle,
  Calendar
} from 'lucide-react-native';
import { Modal } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';

const TABS = [
  { id: 'player-profile', label: 'Player Profile', path: '/cricket/player-profile' },
  { id: 'matches', label: 'Matches', path: '/cricket/matches' },
  { id: 'tournaments', label: 'Tournaments', path: '/cricket/tournaments' },
  { id: 'teams', label: 'Teams', path: '/cricket/teams' },
  { id: 'stats', label: 'Stats', path: '/cricket/stats' },
  { id: 'highlights', label: 'Highlights', path: '/cricket/highlights' },
];

export default function CricketLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const activeTabId = TABS.find(t => pathname.includes(t.id))?.id || 'player-profile';
  const [isActionModalVisible, setIsActionModalVisible] = React.useState(false);

  const renderActionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isActionModalVisible}
      onRequestClose={() => setIsActionModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsActionModalVisible(false)}
      >
        <View style={styles.actionModalContent}>
          <Text style={styles.actionModalTitle}>What would you like to do?</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/cricket/scoring?startMatch=true');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Swords size={28} color="#01b854" />
              </View>
              <Text style={styles.actionLabel}>Start a Match</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/cricket/scoring?createTeam=true');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Users size={28} color="#3B82F6" />
              </View>
              <Text style={styles.actionLabel}>Create Team</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                alert('Tournament registration coming soon!');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FFF7ED' }]}>
                <Trophy size={28} color="#F97316" />
              </View>
              <Text style={styles.actionLabel}>Host Tournament</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/grounds' as any);
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FAF5FF' }]}>
                <Calendar size={28} color="#A855F7" />
              </View>
              <Text style={styles.actionLabel}>Book Ground</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                alert('Streaming service coming soon!');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#FEF2F2' }]}>
                <Radio size={28} color="#EF4444" />
              </View>
              <Text style={styles.actionLabel}>Go Live</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionItem} 
              onPress={() => {
                setIsActionModalVisible(false);
                alert('Support channel opening...');
              }}
            >
              <View style={[styles.actionIconBox, { backgroundColor: '#F0FDFA' }]}>
                <HelpCircle size={28} color="#0D9488" />
              </View>
              <Text style={styles.actionLabel}>Get Help</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.actionCloseBtn}
            onPress={() => setIsActionModalVisible(false)}
          >
            <Text style={styles.actionCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const isCompact = width < 900;

  const content = (
    <View style={styles.container}>
      {(Platform.OS !== 'web' || isCompact) && (
        <MobileAppNavbar title="Cricket" titleColor="#00ea6b" />
      )}
      {!pathname.includes('/scoring') && (
        <View style={styles.tabsStickyWrapper}>
          <View style={styles.tabsInnerRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll} style={{ flex: 1 }}>
              {TABS.map((tab) => (
                <TouchableOpacity 
                  key={tab.id} 
                  style={[styles.tab, activeTabId === tab.id && styles.tabActive]} 
                  onPress={() => router.push(tab.path as any)}
                >
                  <Text style={[styles.tabText, activeTabId === tab.id && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.plusIconWrapper}
              onPress={() => setIsActionModalVisible(true)}
            >
              <Plus size={24} color="#01b854" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Slot />
        </View>
      </ScrollView>
      {renderActionModal()}
    </View>
  );

  if (Platform.OS === 'web' && !isCompact) {
    return (
      <WebLayout noCard>
        {content}
      </WebLayout>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabsStickyWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: Platform.OS === 'web' ? 0 : 0,
    zIndex: 10,
  },
  tabsInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  tabsScroll: {
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
  },
  tabTextActive: {
    fontWeight: '600',
    color: '#01b854',
  },
  plusIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '90%',
    maxWidth: 400,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 25,
  },
  actionModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 32,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '47%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  actionCloseBtn: {
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
  },
  actionCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
});
