import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Dimensions,
  Platform
} from 'react-native';
import { 
  ChevronLeft, 
  Search, 
  Bell, 
  HelpCircle, 
  Share2,
  ChevronRight,
  TrendingUp
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const TABS = ['Batting', 'Bowling', 'Compare', 'Face Off'];

const FORM_DATA = [
  { id: '1', date: '24/04/26', match: 'Crixcus XI vs Flying Falcons', score: '40(18)', out: 'Bowled', ov: '20' },
  { id: '2', date: '18/04/26', match: 'The Yankees vs Stellar Strikers', score: '94(45)', out: 'Caught out', ov: '20' },
  { id: '3', date: '02/04/26', match: 'Ggn Titans vs The Yankees', score: '18(14)', out: 'Caught out', ov: '20' },
  { id: '4', date: '27/03/26', match: 'Eicher Group vs The Yankees', score: '21(15)', out: 'Caught out', ov: '20' },
  { id: '5', date: '22/03/26', match: 'Pardeep XI vs The Yankees', score: '1(3)', out: 'Caught out', ov: '20' },
];

export default function CricketInsights() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Batting');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arpit Kanotra</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Search size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <View style={styles.notifWrapper}>
              <Bell size={24} color="#000" />
              <View style={styles.notifBadge}><Text style={styles.notifText}>1</Text></View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?u=arpit' }} 
              style={styles.avatar}
            />
            <View style={styles.profileDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>BATTING STYLE</Text>
                <Text style={styles.detailValue}>RHB</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>BATTING ORDER</Text>
                <Text style={styles.detailValue}>None</Text>
              </View>
            </View>
            <View style={styles.profileDecorative}>
               <View style={styles.decoCircle} />
            </View>
          </View>
        </View>

        {/* Custom Segmented Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Form Section */}
        <View style={styles.formSection}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              Current form <Text style={styles.formSubtitle}>(Last 5 Innings)</Text>
            </Text>
            <View style={styles.formHeaderIcons}>
              <HelpCircle size={20} color="#94A3B8" />
              <Share2 size={20} color="#94A3B8" />
            </View>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { width: 30 }]}>Sr.</Text>
            <Text style={[styles.tableHeaderText, { width: 70 }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Innings</Text>
            <Text style={[styles.tableHeaderText, { width: 60, textAlign: 'center' }]}>Score</Text>
            <Text style={[styles.tableHeaderText, { width: 70, textAlign: 'center' }]}>Out T...</Text>
            <Text style={[styles.tableHeaderText, { width: 30, textAlign: 'right' }]}>Ov.</Text>
          </View>

          {/* Table Rows */}
          {FORM_DATA.map((item, idx) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.tableRowText, { width: 30, color: '#94A3B8' }]}>{idx + 1}</Text>
              <Text style={[styles.tableRowText, { width: 70, color: '#FFFFFF' }]}>{item.date}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.matchText} numberOfLines={1}>{item.match}</Text>
              </View>
              <Text style={[styles.tableRowText, { width: 60, textAlign: 'center', color: '#FFFFFF', fontWeight: '700' }]}>{item.score}</Text>
              <Text style={[styles.tableRowText, { width: 70, textAlign: 'center', color: '#94A3B8' }]}>{item.out}</Text>
              <Text style={[styles.tableRowText, { width: 30, textAlign: 'right', color: '#94A3B8' }]}>{item.ov}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Insights Summary Cards */}
        <View style={styles.insightsSection}>
           <View style={styles.insightDividerRow}>
              <View style={styles.insightDividerLine} />
              <View style={styles.insightDividerIcon} />
              <View style={styles.insightDividerLine} />
           </View>

           <View style={styles.summaryCard}>
              <View style={styles.summaryValueBox}>
                 <Text style={styles.summaryValueText}>174</Text>
              </View>
              <Text style={styles.summaryLabelText}>Total runs in last 5 Innings</Text>
           </View>

           <View style={styles.summaryCard}>
              <View style={styles.summaryValueBox}>
                 <Text style={styles.summaryValueTextGreen}>4</Text>
              </View>
              <Text style={styles.summaryLabelText}>Caught out in last 5 Innings</Text>
           </View>

           <View style={styles.summaryCard}>
              <View style={styles.summaryValueBox}>
                 <Text style={styles.summaryValueTextGreen}>0</Text>
              </View>
              <Text style={styles.summaryLabelText}>Not out in last 5 Innings</Text>
           </View>

           <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                 <Text style={styles.statBoxValue}>183.16</Text>
                 <Text style={styles.statBoxLabel}>SR</Text>
              </View>
              <View style={styles.statBox}>
                 <Text style={styles.statBoxValue}>34.80</Text>
                 <Text style={styles.statBoxLabel}>Avg</Text>
              </View>
           </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    fontFamily: 'Inter',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  notifWrapper: {
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F59E0B',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  notifText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 80,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileDetails: {
    marginLeft: 16,
    gap: 8,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '800',
  },
  profileDecorative: {
    position: 'absolute',
    right: -20,
    top: -20,
  },
  decoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: '#000',
  },
  formSection: {
    backgroundColor: '#1E293B', // Dark theme for form as per image
    padding: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '400',
  },
  formHeaderIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableHeaderText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tableRowText: {
    fontSize: 13,
  },
  matchText: {
    fontSize: 13,
    color: '#01b854',
    fontWeight: '600',
  },
  viewAllBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#01b854',
    fontSize: 14,
    fontWeight: '700',
  },
  insightsSection: {
    backgroundColor: '#111827',
    padding: 16,
    paddingBottom: 40,
  },
  insightDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 10,
  },
  insightDividerLine: {
    height: 1,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  insightDividerIcon: {
    width: 10,
    height: 16,
    backgroundColor: '#01b854',
    borderRadius: 2,
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 4,
    marginBottom: 12,
  },
  summaryValueBox: {
    width: 60,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    marginRight: 16,
  },
  summaryValueText: {
    fontSize: 24,
    color: '#01b854',
    fontWeight: '800',
  },
  summaryValueTextGreen: {
     fontSize: 24,
     color: '#01b854',
     fontWeight: '800',
  },
  summaryLabelText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 20,
    alignItems: 'center',
    borderRadius: 4,
  },
  statBoxValue: {
    fontSize: 24,
    color: '#01b854',
    fontWeight: '800',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
  }
});
