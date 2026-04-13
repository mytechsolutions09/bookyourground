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
  HelpCircle
} from 'lucide-react-native';
import { Modal } from 'react-native';
import WebLayout from '@/components/web/WebLayout';

const TABS = [
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

  const activeTabId = TABS.find(t => pathname.includes(t.id))?.id || 'matches';
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>What would you like to do?</Text>
            <TouchableOpacity onPress={() => setIsActionModalVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalOptions}>
            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/cricket/scoring');
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Swords size={20} color="#01b854" />
              </View>
              <Text style={styles.optionText}>Start a match</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/cricket/scoring?live=true');
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#FEF2F2' }]}>
                <Radio size={20} color="#EF4444" />
              </View>
              <Text style={styles.optionText}>Go live</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => setIsActionModalVisible(false)}>
              <View style={[styles.optionIcon, { backgroundColor: '#FFF7ED' }]}>
                <Trophy size={20} color="#F97316" />
              </View>
              <Text style={styles.optionText}>Start a tournament/Series</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption} 
              onPress={() => {
                setIsActionModalVisible(false);
                router.push('/cricket/teams');
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Users size={20} color="#3B82F6" />
              </View>
              <Text style={styles.optionText}>Add a team</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity style={styles.modalOption} onPress={() => setIsActionModalVisible(false)}>
              <View style={[styles.optionIcon, { backgroundColor: '#F3F4F6' }]}>
                <HelpCircle size={20} color="#6B7280" />
              </View>
              <Text style={styles.optionText}>Get help</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <WebLayout noCard>
      <View style={[styles.container, (pathname === '/cricket/matches' || pathname.includes('/scoring')) && { backgroundColor: '#FFFFFF' }]}>
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
          <View style={[
            styles.contentContainer, 
            (pathname === '/cricket/matches' || pathname.includes('/scoring')) && { maxWidth: '100%', paddingHorizontal: 0, paddingTop: 0 }
          ]}>
             <Slot />
          </View>
        </ScrollView>
      </View>
      {renderActionModal()}
    </WebLayout>
  );
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
    backgroundColor: '#F0FDF4',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
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
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  actionModalContent: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 30,
      }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modalOptions: {
    gap: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 4,
  },
});
