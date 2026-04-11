import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Platform, StyleSheet, TouchableOpacity, useWindowDimensions, Dimensions } from 'react-native';
import { 
  Shield, 
  Target, 
  Wind, 
  Grid, 
  Brain, 
  ChevronRight,
  Filter,
  Users,
  Eye,
  Settings2,
  Lock,
  Zap,
  RotateCcw,
  Move
} from 'lucide-react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Rect, G } from 'react-native-svg';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

// Constants
const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 700;
const PITCH_WIDTH = 60;
const PITCH_HEIGHT = 160;

// Type Definitions
type BatsmanType = 'RH' | 'LH';
type BowlerType = 'RA_Fast' | 'LA_Fast' | 'RA_Spin' | 'LA_Spin';
type OversType = '1-6' | 'After-6';

interface Fielder {
  id: string;
  name: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

// Player Component
const DraggableFielder = ({ fielder, onMove }: { fielder: Fielder; onMove: (id: string, x: number, y: number) => void }) => {
  const translateX = useSharedValue(fielder.x);
  const translateY = useSharedValue(fielder.y);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  // Update animated value when preset changes
  useEffect(() => {
    translateX.value = withSpring(fielder.x);
    translateY.value = withSpring(fielder.y);
  }, [fielder.x, fielder.y]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd(() => {
      runOnJS(onMove)(fielder.id, translateX.value, translateY.value);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 22 }, // Offset by half player width (44/2)
      { translateY: translateY.value - 22 }  // Offset by half player height
    ],
    position: 'absolute',
    zIndex: 100,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.playerNode, animatedStyle]}>
        <View style={styles.playerInner}>
          <Text style={styles.playerLabel}>{fielder.name}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

export default function MatchStrategiesScreen() {
  const [activeSection, setActiveSection] = useState('fielding');
  const [batsman, setBatsman] = useState<BatsmanType>('LH');
  const [bowler, setBowler] = useState<BowlerType>('LA_Fast');
  const [overs, setOvers] = useState<OversType>('1-6');

  // Ground Presets
  const getInitialField = useCallback((): Fielder[] => {
    // 9 fielders (11 - bowler/keeper)
    // Coords are in SVG Viewbox space (roughly 0-600, 0-700)
    // Center is approx (300, 350)
    
    // Example: Left-hand batsman, Left-arm Fast, Powerplay (2 outside)
    if (batsman === 'LH' && bowler === 'LA_Fast' && overs === '1-6') {
      return [
        { id: '1', name: 'Slip', x: 280, y: 180 },
        { id: '2', name: 'Gully', x: 240, y: 220 },
        { id: '3', name: 'Point', x: 120, y: 350 },
        { id: '4', name: 'Cover', x: 180, y: 480 },
        { id: '5', name: 'Mid Off', x: 280, y: 550 },
        { id: '6', name: 'Mid On', x: 380, y: 550 },
        { id: '7', name: 'Mid Wkt', x: 480, y: 420 },
        { id: '8', name: 'Fine Leg', x: 500, y: 220 }, // Outside?
        { id: '9', name: 'Third Man', x: 100, y: 200 }, // Outside?
      ];
    }

    // Default basic field
    return [
      { id: '1', name: 'P1', x: 150, y: 200 },
      { id: '2', name: 'P2', x: 450, y: 200 },
      { id: '3', name: 'P3', x: 100, y: 400 },
      { id: '4', name: 'P4', x: 500, y: 400 },
      { id: '5', name: 'P5', x: 150, y: 600 },
      { id: '6', name: 'P6', x: 450, y: 600 },
      { id: '7', name: 'P7', x: 300, y: 150 },
      { id: '8', name: 'P8', x: 300, y: 550 },
      { id: '9', name: 'P9', x: 300, y: 650 },
    ];
  }, [batsman, bowler, overs]);

  const [fielders, setFielders] = useState<Fielder[]>(getInitialField());

  useEffect(() => {
    setFielders(getInitialField());
  }, [batsman, bowler, overs, getInitialField]);

  const updateFielderPos = (id: string, x: number, y: number) => {
    setFielders(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
  };

  const STRATEGIES = [
    { id: 'opening', title: 'Opening Strategies', icon: Shield },
    { id: 'middle', title: 'Middle Tactics', icon: Target },
    { id: 'fielding', title: 'Field Designer', icon: Grid },
    { id: 'bowling', title: 'Bowling Tips', icon: Wind },
    { id: 'mental', title: 'Focus & Intent', icon: Brain },
  ];

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.page}>
        <View style={styles.contentWrapper}>
          
          {/* Enhanced Left Sidebar with Filters */}
          <View style={styles.sidebar}>
            <Text style={styles.sidebarHeader}>Strategies</Text>
            {STRATEGIES.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                  onPress={() => setActiveSection(item.id)}
                >
                  <Icon size={18} color={isActive ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {activeSection === 'fielding' && (
              <View style={styles.filterSection}>
                <View style={styles.filterHeader}>
                  <Filter size={14} color="#9CA3AF" />
                  <Text style={styles.filterGroupTitle}>Scenario Filters</Text>
                </View>

                {/* Batsman Filter */}
                <Text style={styles.filterLabel}>Batsman</Text>
                <View style={styles.filterButtons}>
                  <TouchableOpacity 
                    style={[styles.filterBtn, batsman === 'RH' && styles.filterBtnActive]}
                    onPress={() => setBatsman('RH')}
                  >
                    <Text style={[styles.filterBtnText, batsman === 'RH' && styles.filterBtnActiveText]}>Right Hand</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterBtn, batsman === 'LH' && styles.filterBtnActive]}
                    onPress={() => setBatsman('LH')}
                  >
                    <Text style={[styles.filterBtnText, batsman === 'LH' && styles.filterBtnActiveText]}>Left Hand</Text>
                  </TouchableOpacity>
                </View>

                {/* Bowler Filter */}
                <Text style={styles.filterLabel}>Bowler</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  {['RA_Fast', 'LA_Fast', 'RA_Spin', 'LA_Spin'].map((b) => (
                    <TouchableOpacity 
                      key={b}
                      style={[styles.filterBtn, bowler === b && styles.filterBtnActive, { marginRight: 8 }]}
                      onPress={() => setBowler(b as BowlerType)}
                    >
                      <Text style={[styles.filterBtnText, bowler === b && styles.filterBtnActiveText]}>
                        {b.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Overs Filter */}
                <Text style={styles.filterLabel}>Game Phase</Text>
                <View style={styles.filterButtons}>
                  <TouchableOpacity 
                    style={[styles.filterBtn, overs === '1-6' && styles.filterBtnActive]}
                    onPress={() => setOvers('1-6')}
                  >
                    <Text style={[styles.filterBtnText, overs === '1-6' && styles.filterBtnActiveText]}>Powerplay (1-6)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterBtn, overs === 'After-6' && styles.filterBtnActive]}
                    onPress={() => setOvers('After-6')}
                  >
                    <Text style={[styles.filterBtnText, overs === 'After-6' && styles.filterBtnActiveText]}>Post Powerplay</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.resetBtn}
                  onPress={() => setFielders(getInitialField())}
                >
                  <RotateCcw size={14} color="#043529" />
                  <Text style={styles.resetBtnText}>Reset Preset</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.sidebarPromo}>
              <Users size={20} color="#FFFFFF" />
              <Text style={styles.promoTitle}>Coach Sync</Text>
              <Text style={styles.promoText}>Send placements to your team captain in real-time.</Text>
            </View>
          </View>

          <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.mainContent}>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {activeSection === 'fielding' ? 'Interactive Field Designer' : 'Match Strategies'}
                </Text>
                <Text style={styles.subtitle}>
                  {activeSection === 'fielding' 
                    ? 'Drag players and apply filters to plan your defense.'
                    : 'Master the game with expert tactics and insights.'}
                </Text>
              </View>

              {activeSection === 'fielding' ? (
                <View style={styles.designerCard}>
                  {/* Field Visualizer */}
                  <View style={styles.fieldContainer}>
                    <Svg width="100%" height="100%" viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}>
                      {/* Outfield */}
                      <Ellipse cx={FIELD_WIDTH / 2} cy={FIELD_HEIGHT / 2} rx="280" ry="330" fill="#2E7D32" stroke="#4CAF50" strokeWidth="2" />
                      {/* Infield Circle (30-yard) */}
                      <Ellipse cx={FIELD_WIDTH / 2} cy={FIELD_HEIGHT / 2} rx="150" ry="200" fill="transparent" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="5,5" />
                      
                      {/* Pitch */}
                      <Rect 
                        x={(FIELD_WIDTH - PITCH_WIDTH) / 2} 
                        y={(FIELD_HEIGHT - PITCH_HEIGHT) / 2} 
                        width={PITCH_WIDTH} 
                        height={PITCH_HEIGHT} 
                        fill="#F3E5AB" 
                        stroke="#BCAAA4" 
                        strokeWidth="1" 
                      />
                      
                      {/* Crease Markings */}
                      <Line x1={285} y1={285} x2={315} y2={285} stroke="#FFFFFF" strokeWidth="2" />
                      <Line x1={285} y1={445} x2={315} y2={445} stroke="#FFFFFF" strokeWidth="2" />

                      {/* Fixed: Bowler & Keeper */}
                      <G>
                        <Circle cx={FIELD_WIDTH / 2} cy={FIELD_HEIGHT / 2 + 100} r="6" fill="#000000" />
                        <Text style={{ position: 'absolute', left: FIELD_WIDTH / 2 + 10, top: FIELD_HEIGHT / 2 + 95, color: '#000', fontSize: 10 }}>Bowler</Text>
                        
                        <Circle cx={FIELD_WIDTH / 2} cy={FIELD_HEIGHT / 2 - 140} r="6" fill="#000000" />
                        <Text style={{ position: 'absolute', left: FIELD_WIDTH / 2 + 10, top: FIELD_HEIGHT / 2 - 145, color: '#000', fontSize: 10 }}>Keeper</Text>
                      </G>
                    </Svg>

                    {/* Interactive Draggable Layer */}
                    {fielders.map(f => (
                      <DraggableFielder key={f.id} fielder={f} onMove={updateFielderPos} />
                    ))}
                    
                    <View style={styles.fieldLegendOverlay}>
                      <View style={styles.legendItem}>
                        <Move size={12} color="#FFFFFF" />
                        <Text style={styles.legendText}>Drag players to reposition</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.designerInfo}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Current Scenario</Text>
                      <Text style={styles.statValue}>
                        VS {batsman}. Bowling {bowler.replace('_', ' ')} durante {overs}
                      </Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.actionBtn}>
                        <Eye size={18} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Export JSON</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#043529' }]}>
                        <Settings2 size={18} color="#043529" />
                        <Text style={[styles.actionBtnText, { color: '#043529' }]}>Field Settings</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.placeholderText}>Select a strategy from the sidebar to view detailed tactics.</Text>
                </View>
              )}
            </View>
            <SiteFooter />
          </ScrollView>
        </View>
      </View>
    </GestureHandlerRootView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout noCard>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 0,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingRight: 24,
    paddingBottom: 24,
    paddingTop: 40,
    paddingLeft: 24,
    display: Platform.OS === 'web' ? 'flex' : 'none',
  },
  sidebarHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 24,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(1, 184, 84, 0.05)',
  },
  sidebarItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginLeft: 12,
  },
  sidebarItemTextActive: {
    color: '#01b854',
    fontWeight: '600',
  },
  // Filter Section Styles
  filterSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: '#01b854',
    backgroundColor: 'rgba(1, 184, 84, 0.05)',
  },
  filterBtnText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterBtnActiveText: {
    color: '#01b854',
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#043529',
  },
  sidebarPromo: {
    marginTop: 'auto',
    backgroundColor: '#043529',
    borderRadius: 12,
    padding: 20,
    paddingTop: 40,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  promoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    padding: 40,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  designerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    gap: 32,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    flexWrap: 'wrap',
  },
  fieldContainer: {
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
    backgroundColor: '#1B5E20',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  playerNode: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInner: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#01b854',
  },
  playerLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#043529',
    textAlign: 'center',
  },
  fieldLegendOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  designerInfo: {
    flex: 1,
    minWidth: 300,
    justifyContent: 'center',
  },
  statBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#043529',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    backgroundColor: '#043529',
    borderRadius: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    minHeight: 400,
  },
  placeholderText: {
    color: '#9CA3AF',
    textAlign: 'center',
    fontSize: 16,
  }
});
