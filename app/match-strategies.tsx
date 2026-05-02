import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Platform, StyleSheet, TouchableOpacity, useWindowDimensions, Dimensions, Image, Share } from 'react-native';
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
  Move,
  X,
  Menu,
  Share2,
  Image as ImageIcon,
  FileText
} from 'lucide-react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Rect, G } from 'react-native-svg';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import WebLayout from '@/components/web/WebLayout';


// Constants
const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 700;
const PITCH_WIDTH = 60;
const PITCH_HEIGHT = 160;
const CIRCLE_RX = 150;
const CIRCLE_RY = 200;
const CIRCLE_CX = FIELD_WIDTH / 2;
const CIRCLE_CY = FIELD_HEIGHT / 2;

const isOutsideInnerCircle = (x: number, y: number) => {
  const normX = (x - CIRCLE_CX) / CIRCLE_RX;
  const normY = (y - CIRCLE_CY) / CIRCLE_RY;
  return (normX * normX + normY * normY) > 1;
};

// Type Definitions
type BatsmanType = 'RH' | 'LH';
type BowlerType = 'RA_Fast' | 'LA_Fast' | 'RA_Spin' | 'LA_Spin';
type OversType = '1-6' | 'After-6';

interface Fielder {
  id: string;
  name: string;
  x: number;
  y: number;
}

const getPositionName = (x: number, y: number, batsman: BatsmanType): string => {
  const dx = x - CIRCLE_CX;
  const dy = y - (CIRCLE_CY - 40); // Relative to batsman position (batsman stands slightly behind center)
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Angle: 0 is Right, 90 is Down, 180 is Left, 270 is Up
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  let normAngle = (angle + 360) % 360;
  
  // MIRROR LOGIC: 
  // User says for LH, Cover/Point are on the RIGHT.
  // This means for RH, Cover/Point are on the LEFT.
  // We normalize to RH perspective: If RH, we want 180 (Left) to be "Off Side".
  // If LH, we flip the angle so the same logic applies.
  
  let logicAngle = normAngle;
  if (batsman === 'LH') {
    // Mirror around the vertical axis (angle = 180 - logicAngle)
    logicAngle = (180 - logicAngle + 360) % 360;
  }

  const isDeep = dist > 220;
  const isClose = dist < 100;

  // Behind Wicket (Upwards: 200 to 330 degrees)
  if (logicAngle >= 200 && logicAngle < 330) {
    if (logicAngle < 270) {
      if (isClose) return "Slip";
      return isDeep ? "Deep Third Man" : "Short Third Man";
    } else {
      return isDeep ? "Fine Leg" : "Short Fine Leg";
    }
  }
  
  // Off Side (Left side for RH: 90 to 200 deg)
  if (logicAngle >= 90 && logicAngle < 200) {
    if (logicAngle > 165) {
      return isDeep ? "Deep Point" : (isClose ? "Silly Point" : "Point");
    }
    if (logicAngle > 125) {
      return isDeep ? "Extra Cover" : "Cover";
    }
    return isDeep ? "Long Off" : "Mid Off";
  }
  
  // Leg Side (Right side for RH: 330 through 0 to 90 deg)
  if (logicAngle >= 330 || logicAngle < 90) {
    // 60 to 90 is straight-ish
    if (logicAngle >= 60 && logicAngle < 90) {
       return isDeep ? "Long On" : "Mid On";
    }
    // 30 to 60 is Mid Wicket
    if (logicAngle >= 30 && logicAngle < 60) {
       return isDeep ? "Deep Mid Wkt" : "Mid Wicket";
    }
    // Everything else (315 to 360 and 0 to 30) is Square Leg
    return isDeep ? "Deep Square Leg" : (isClose ? "Short Leg" : "Short Square Leg");
  }

  return "Fielder";
};

// Player Component
const DraggableFielder = ({ fielder, onMove, batsman }: { fielder: Fielder; onMove: (id: string, x: number, y: number) => void; batsman: BatsmanType }) => {
  const translateX = useSharedValue(fielder.x);
  const translateY = useSharedValue(fielder.y);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const dynamicName = useMemo(() => getPositionName(fielder.x, fielder.y, batsman), [fielder.x, fielder.y, batsman]);

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

  const animatedStyle = useSharedValue({
    transform: [{ translateX: 0 }, { translateY: 0 }],
  });

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value - 28 }, // Centering wider component
        { translateY: translateY.value - 24 }
      ],
      position: 'absolute',
      zIndex: 100,
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={rStyle}>
        <View style={styles.miniatureContainer}>
          <Image 
            source={require('@/assets/fielders_action.png')} 
            style={styles.playerImage}
            resizeMode="contain"
          />
          <View style={styles.playerTag}>
            <Text style={styles.playerTagName}>{dynamicName}</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

// Keeper Component
const DraggableKeeper = ({ pos, onMove }: { pos: { x: number; y: number }; onMove: (id: string, x: number, y: number) => void }) => {
  const translateX = useSharedValue(pos.x);
  const translateY = useSharedValue(pos.y);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSpring(pos.x);
    translateY.value = withSpring(pos.y);
  }, [pos.x, pos.y]);

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
      runOnJS(onMove)('keeper', translateX.value, translateY.value);
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 10 },
      { translateY: translateY.value - 35 }
    ],
    position: 'absolute',
    zIndex: 100,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={rStyle}>
        <View style={{ alignItems: 'center' }}>
          <Image 
            source={require('@/assets/fielders_action.png')} 
            style={styles.bowlerImage} 
            resizeMode="contain"
          />
          <View style={[styles.playerTag, { backgroundColor: '#B91C1C' }]}>
            <Text style={[styles.playerTagName, { color: '#FFFFFF' }]}>Keeper</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

// Bowler Component
const DraggableBowler = ({ pos, onMove }: { pos: { x: number; y: number }; onMove: (id: string, x: number, y: number) => void }) => {
  const translateX = useSharedValue(pos.x);
  const translateY = useSharedValue(pos.y);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSpring(pos.x);
    translateY.value = withSpring(pos.y);
  }, [pos.x, pos.y]);

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
      runOnJS(onMove)('bowler', translateX.value, translateY.value);
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - 10 },
      { translateY: translateY.value - 35 }
    ],
    position: 'absolute',
    zIndex: 100,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={rStyle}>
        <View style={{ alignItems: 'center' }}>
          <Image 
            source={require('@/assets/fielders_action.png')} 
            style={styles.bowlerImage}
            resizeMode="contain"
          />
          <View style={[styles.playerTag, { backgroundColor: '#B91C1C' }]}>
            <Text style={[styles.playerTagName, { color: '#FFFFFF' }]}>Bowler</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

export default function MatchStrategiesScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobile = windowWidth < 1024;
  
  // Field Container Scale (Base 600x700, notably smaller on desktop)
  const fieldBaseWidth = 600;
  const fieldBaseHeight = 700;
  const desktopScale = 0.7; // Smaller ratio for desktop visibility
  const fieldScaleTarget = isMobile ? (windowWidth - 40) / fieldBaseWidth : desktopScale;
  const fieldScale = Math.min(fieldScaleTarget, 1);

  const [activeSection, setActiveSection] = useState('fielding');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const fieldRef = useRef<View>(null);
  const [batsman, setBatsman] = useState<BatsmanType>('LH');
  const [bowler, setBowler] = useState<BowlerType>('LA_Fast');
  const [overs, setOvers] = useState<OversType>('1-6');

  // Ground Presets
  const getInitialField = useCallback((): Fielder[] => {
    // 9 fielders (11 - bowler/keeper)
    // Coords are in SVG Viewbox space (roughly 0-600, 0-700)
    // Center is approx (300, 350)
    
    // Precise Preset: RH Batsman, RA Fast, Powerplay (Based on User Image)
    if (batsman === 'RH' && bowler === 'RA_Fast' && overs === '1-6') {
      return [
        { id: '1', name: 'Slip 1', x: 280, y: 260 },
        { id: '2', name: 'Slip 2', x: 255, y: 245 },
        { id: '3', name: 'Point', x: 155, y: 320 },
        { id: '4', name: 'Cover', x: 190, y: 415 },
        { id: '5', name: 'Mid Off', x: 265, y: 495 },
        { id: '6', name: 'Mid On', x: 335, y: 495 },
        { id: '7', name: 'Mid Wicket', x: 435, y: 400 },
        { id: '8', name: 'Deep Third Man', x: 100, y: 120 },
        { id: '9', name: 'Deep Square Leg', x: 500, y: 150 },
      ];
    }

    // Standard Balanced Field (RH Batsman)
    if (batsman === 'RH') {
      return [
        { id: '1', name: 'First Slip', x: 270, y: 265 },
        { id: '2', name: 'Point', x: 100, y: 300 },
        { id: '3', name: 'Cover', x: 180, y: 400 },
        { id: '4', name: 'Mid Off', x: 260, y: 500 },
        { id: '5', name: 'Mid On', x: 340, y: 500 },
        { id: '6', name: 'Mid Wicket', x: 420, y: 400 },
        { id: '7', name: 'Square Leg', x: 500, y: 300 },
        { id: '8', name: 'Fine Leg', x: 400, y: 150 },
        { id: '9', name: 'Third Man', x: 150, y: 150 },
      ];
    }

    // Standard Balanced Field (LH Batsman - Mirrored)
    if (batsman === 'LH') {
      return [
        { id: '1', name: 'First Slip', x: 330, y: 265 },
        { id: '2', name: 'Point', x: 500, y: 300 },
        { id: '3', name: 'Cover', x: 420, y: 400 },
        { id: '4', name: 'Mid Off', x: 340, y: 500 },
        { id: '5', name: 'Mid On', x: 260, y: 500 },
        { id: '6', name: 'Mid Wicket', x: 180, y: 400 },
        { id: '7', name: 'Square Leg', x: 100, y: 300 },
        { id: '8', name: 'Fine Leg', x: 200, y: 150 },
        { id: '9', name: 'Third Man', x: 450, y: 150 },
      ];
    }
    
    // Default fallback
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
  const [bowlerPos, setBowlerPos] = useState({ x: 300, y: 450 });
  const [keeperPos, setKeeperPos] = useState({ x: 300, y: 210 });

  useEffect(() => {
    setFielders(getInitialField());
    setBowlerPos({ x: 300, y: 450 });
    setKeeperPos({ x: 300, y: 210 });
  }, [batsman, bowler, overs, getInitialField]);

  const updateFielderPos = (id: string, x: number, y: number) => {
    setFielders(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
  };

  const updateBowlerPos = (id: string, x: number, y: number) => {
    setBowlerPos({ x, y });
  };

  const updateKeeperPos = (id: string, x: number, y: number) => {
    setKeeperPos({ x, y });
  };

  const handleSharePlacement = async () => {
    try {
      const fieldData = fielders.map(f => {
        const side = isOutsideInnerCircle(f.x, f.y) ? 'Deep' : 'Inner';
        return `${f.name} (${side})`;
      }).join('\n- ');

      const message = `🏏 Cricket Field Strategy\n\nScenario: vs ${batsman} | ${bowler.replace('_', ' ')} | Phase: ${overs}\n\nFielding Setup:\n- ${fieldData}\n\nPlanned with BookYourGround Field Designer`;

      await Share.share({
        message,
        title: 'Share Fielding Strategy',
      });
    } catch (error) {
      console.error('Error sharing strategy:', error);
    }
  };

  const handleShareImage = async () => {
    try {
      if (!fieldRef.current) return;
      
      const uri = await captureRef(fieldRef.current, {
        format: 'png',
        quality: 0.9,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        alert('Sharing is not available on this platform. URI: ' + uri);
      }
    } catch (error) {
      console.error('Error generating strategy image:', error);
      alert('Failed to generate tactical image.');
    }
  };

  const handleExportPDF = async () => {
    try {
      const fieldData = fielders.map(f => {
        const side = isOutsideInnerCircle(f.x, f.y) ? 'Deep' : 'Inner';
        return `<li><strong>${f.name}</strong>: ${side} Field</li>`;
      }).join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111827; }
              h1 { color: #01b854; border-bottom: 2px solid #01b854; padding-bottom: 10px; }
              .scenario { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .footer { margin-top: 50px; font-size: 12px; color: #6b7280; text-align: center; }
            </style>
          </head>
          <body>
            <h1>Cricket Tactical Strategy</h1>
            <div class="scenario">
              <p><strong>Batsman Stance:</strong> ${batsman}</p>
              <p><strong>Bowler Style:</strong> ${bowler.replace('_', ' ')}</p>
              <p><strong>Game Phase:</strong> ${overs}</p>
            </div>
            <h2>Fielding Placements</h2>
            <ul>${fieldData}</ul>
            <p style="margin-top: 30px;"><em>Generated via BookYourGround Match Strategies</em></p>
            <div class="footer">
              &copy; 2026 BookYourGround Tactical Command
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        alert('PDF generated at: ' + uri);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report.');
    }
  };

  const STRATEGIES = [
    { id: 'opening', title: 'Opening Strategies', icon: Shield },
    { id: 'middle', title: 'Middle Tactics', icon: Target },
    { id: 'fielding', title: 'Field Designer', icon: Grid },
    { id: 'bowling', title: 'Bowling Tips', icon: Wind },
    { id: 'mental', title: 'Focus & Intent', icon: Brain },
  ];

  const fieldersOutside = useMemo(() => {
    return fielders.filter(f => isOutsideInnerCircle(f.x, f.y)).length;
  }, [fielders]);

  const maxAllowedOutside = overs === '1-6' ? 2 : 5;
  const isRuleViolated = fieldersOutside > maxAllowedOutside;

  const content = (
    <View style={styles.page}>
        <View style={[styles.contentWrapper, isMobile && { flexDirection: 'column' }]}>
          
          {/* Mobile Menu Overlay */}
          {isMobile && showMobileMenu && (
            <TouchableOpacity 
              style={styles.menuOverlay} 
              activeOpacity={1} 
              onPress={() => setShowMobileMenu(false)}
            />
          )}

          {/* Enhanced Left Sidebar with Filters */}
          <View style={[
            styles.sidebar, 
            isMobile && (showMobileMenu ? styles.mobileSidebarOpen : styles.mobileSidebarClosed)
          ]}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarContent}
            >
              <View style={styles.sidebarHeaderRow}>
                <Text style={styles.sidebarHeader}>Strategies</Text>
                {isMobile && (
                  <TouchableOpacity onPress={() => setShowMobileMenu(false)}>
                    <X size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
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
            </ScrollView>
          </View>

          <View style={styles.container}>
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={[styles.scrollContent, isMobile && { paddingBottom: 60 }]}
              scrollEnabled={isMobile} // Disable scroll on desktop
            >
            <View style={[styles.mainContent, isMobile && { padding: 12 }]}>
              {isMobile && (
                <View style={styles.mobileActions}>
                  <TouchableOpacity 
                    style={styles.menuToggle}
                    onPress={() => setShowMobileMenu(true)}
                  >
                    <Menu size={20} color="#111827" />
                    <Text style={styles.menuToggleText}>Tactics & Filters</Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeSection !== 'fielding' && (
                <View style={styles.header}>
                  <Text style={styles.title}>Match Strategies</Text>
                  <Text style={styles.subtitle}>Master the game with expert tactics and insights.</Text>
                </View>
              )}

              {activeSection === 'fielding' ? (
                <View style={[styles.designerCard, isMobile && { padding: 12, borderRadius: 16 }]}>
                  {/* Field Visualizer */}
                  <View 
                    ref={fieldRef}
                    style={[
                    styles.fieldWrapper, 
                    { 
                      width: fieldBaseWidth * fieldScale, 
                      height: fieldBaseHeight * fieldScale,
                      alignSelf: 'center',
                    }
                  ]}>
                    <View style={{
                      width: fieldBaseWidth,
                      height: fieldBaseHeight,
                      transform: [{ scale: fieldScale }],
                      transformOrigin: 'top left',
                    }}>
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

                          {/* Fixed Layout Elements */}
                        </Svg>

                        {/* Draggable Keeper */}
                        <DraggableKeeper pos={keeperPos} onMove={updateKeeperPos} />

                        {/* Draggable Bowler */}
                        <DraggableBowler pos={bowlerPos} onMove={updateBowlerPos} />

                        {/* Static Batsman (1:20 ratio) */}
                        <View style={[
                          styles.batsmanPosition, 
                          { left: batsman === 'RH' ? 315 - 10 : 285 - 10 }
                        ]}>
                          <Image 
                            source={require('@/assets/fielders_action.png')} 
                            style={styles.batsmanImage}
                            resizeMode="contain"
                          />
                          <View style={[styles.playerTag, { backgroundColor: '#1E40AF' }]}>
                            <Text style={[styles.playerTagName, { color: '#FFFFFF' }]}>{batsman}</Text>
                          </View>
                        </View>

                        {/* Interactive Draggable Layer */}
                        {fielders.map(f => (
                          <DraggableFielder key={f.id} fielder={f} onMove={updateFielderPos} batsman={batsman} />
                        ))}
                        
                        <View style={styles.fieldLegendOverlay}>
                          <View style={styles.legendItem}>
                            <Move size={12} color="#FFFFFF" />
                            <Text style={styles.legendText}>Drag players to reposition</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                    <View style={[styles.designerInfo, isMobile && { marginTop: 24, width: '100%' }]}>
                    <View style={[styles.statBox, isRuleViolated && styles.statBoxWarning]}>
                      <View style={styles.ruleHeader}>
                        <Text style={styles.statLabel}>Fielding Rules</Text>
                        <Text style={[styles.ruleBadge, isRuleViolated ? styles.ruleBadgeError : styles.ruleBadgeSuccess]}>
                          {isRuleViolated ? 'RULE VIOLATION' : 'VALID FIELD'}
                        </Text>
                      </View>
                      <Text style={[styles.statValue, isRuleViolated && styles.statValueWarning]}>
                        {fieldersOutside} / {maxAllowedOutside} Players Outside
                      </Text>
                      <Text style={styles.ruleDescription}>
                        {overs === '1-6' 
                          ? 'Powerplay (1-6): Max 2 fielders outside 30-yard circle.'
                          : 'Post-Powerplay (6+): Max 5 fielders outside 30-yard circle.'}
                      </Text>
                    </View>
                    
                    <View style={styles.shareActionGrid}>
                      <TouchableOpacity 
                        style={[styles.shareActionBtn, { backgroundColor: '#01b854' }]}
                        onPress={handleSharePlacement}
                      >
                        <Share2 size={16} color="#FFFFFF" />
                        <Text style={styles.shareActionBtnText}>Share Text</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.shareActionBtn}
                        onPress={handleShareImage}
                      >
                        <ImageIcon size={16} color="#4B5563" />
                        <Text style={[styles.shareActionBtnText, { color: '#4B5563' }]}>Share Image</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.shareActionBtn}
                        onPress={handleExportPDF}
                      >
                        <FileText size={16} color="#4B5563" />
                        <Text style={[styles.shareActionBtnText, { color: '#4B5563' }]}>Export PDF</Text>
                      </TouchableOpacity>
                    </View>
                    {/* Scenario and Action Buttons removed as requested */}
                  </View>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.placeholderText}>Select a strategy from the sidebar to view detailed tactics.</Text>
                </View>
              )}
            </View>

          </ScrollView>
        </View>
      </View>
    </View>
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
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    zIndex: 1000,
  },
  mobileSidebarClosed: {
    display: 'none',
  },
  mobileSidebarOpen: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    height: '100%',
    zIndex: 2000,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1500,
  },
  sidebarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mobileActions: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  fieldWrapper: {
    backgroundColor: '#1B5E20',
    borderRadius: 20,
    position: 'relative',
  },
  sidebarContent: {
    paddingRight: 16,
    paddingBottom: 20,
    paddingTop: 24,
    paddingLeft: 16,
  },
  sidebarHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(216, 247, 157, 0.05)',
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  filterGroupTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  filterBtnActive: {
    borderColor: '#01b854',
    backgroundColor: 'rgba(216, 247, 157, 0.05)',
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
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#043529',
  },
  sidebarPromo: {
    marginTop: 'auto',
    backgroundColor: '#043529',
    borderRadius: 10,
    padding: 12,
    paddingTop: 16,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  promoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    lineHeight: 14,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    padding: 24,
    maxWidth: 1600,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 20,
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
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 20,
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
  miniatureContainer: {
    alignItems: 'center',
    width: 56,
  },
  playerImage: {
    width: 26, // Proportionate to 46 height
    height: 46, // Approx 1:15 of 700 field height
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  batsmanPosition: {
    position: 'absolute',
    top: 310 - 35, // Positioned at 310
    alignItems: 'center',
    zIndex: 10,
  },
  batsmanImage: {
    width: 20,
    height: 35, // 1:20 of 700 field
    tintColor: '#1E40AF', // Distinct Blue color
  },
  bowlerPosition: {
    position: 'absolute',
    left: 300 - 10, 
    bottom: 350 - 100 - 35, // Centered vertically around the 450 mark (FIELD_HEIGHT/2 + 100)
    alignItems: 'center',
    zIndex: 10,
  },
  bowlerImage: {
    width: 20,
    height: 35,
    tintColor: '#B91C1C', // Distinct Red color
  },
  playerTag: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'center',
  },
  playerTagName: {
    fontSize: 9,
    fontWeight: '800',
    color: '#111827',
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
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  statBoxWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  ruleBadge: {
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '800',
  },
  ruleBadgeSuccess: {
    backgroundColor: 'rgba(216, 247, 157, 0.1)',
    color: '#01b854',
  },
  ruleBadgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#EF4444',
  },
  ruleDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  shareActionGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shareActionBtn: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shareActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#043529',
  },
  statValueWarning: {
    color: '#B91C1C',
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
