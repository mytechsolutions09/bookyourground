import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";

export default function OccupancyDashboard() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const isSmallScreen = width < 600;

  const { user } = useAuth();
  const [realOccupancy, setRealOccupancy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [selectedGroundId, setSelectedGroundId] = useState<string>('all');
  const [overallOccupancy, setOverallOccupancy] = useState<number>(0);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allTimeSlots, setAllTimeSlots] = useState<any[]>([]);

  useEffect(() => {
    async function fetchOccupancy() {
      if (!user) return;
      try {
        setLoading(true);
        
        // 1. Fetch grounds owned by owner
        const { data: groundsData, error: groundsErr } = await supabase
          .from('grounds')
          .select('id, name')
          .eq('owner_id', user.id);
        if (groundsErr) throw groundsErr;

        // 2. Fetch occupancy rates for each ground
        const { data: occupancyData, error: occupancyErr } = await supabase
          .rpc('get_owner_grounds_occupancy', { target_owner_id: user.id });
        if (occupancyErr) throw occupancyErr;

        // 3. Fetch overall occupancy rate for owner
        const { data: overallData, error: overallErr } = await supabase
          .rpc('get_owner_occupancy_rate', { target_owner_id: user.id });
        if (overallErr) throw overallErr;

        const groundsWithOccupancy = (groundsData || []).map(g => {
          const occItem = (occupancyData || []).find((o: any) => o.ground_id === g.id);
          return {
            id: g.id,
            name: g.name,
            occupancy: occItem ? Math.round(occItem.occupancy_percentage) : 0
          };
        });

        const overallRes = Array.isArray(overallData) ? overallData[0] : overallData;
        const overallPct = overallRes && overallRes.occupancy_percentage !== undefined 
          ? Math.round(overallRes.occupancy_percentage) 
          : 0;

        setGrounds(groundsWithOccupancy);
        setOverallOccupancy(overallPct);
        setRealOccupancy(overallPct);

        // Fetch real historical data for charts
        const groundIds = groundsWithOccupancy.map(g => g.id);
        if (groundIds.length > 0) {
          const { data: slots } = await supabase
            .from('time_slots')
            .select('ground_id')
            .in('ground_id', groundIds);
            
          const fiveYearsAgo = new Date();
          fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 4);
          
          const { data: bks } = await supabase
            .from('bookings')
            .select('booking_date, ground_id')
            .in('ground_id', groundIds)
            .eq('status', 'confirmed')
            .gte('booking_date', fiveYearsAgo.toISOString().split('T')[0]);
            
          setAllTimeSlots(slots || []);
          setAllBookings(bks || []);
        }
      } catch (err) {
        console.error('Error fetching occupancy:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOccupancy();
  }, [user]);

  const displayOccupancy = selectedGroundId === 'all' 
    ? (realOccupancy !== null ? realOccupancy : 75)
    : (grounds.find(g => g.id === selectedGroundId)?.occupancy ?? 75);

  const computedOccupancyData = React.useMemo(() => {
    let weeklySlots = 0;
    if (selectedGroundId === 'all') {
      weeklySlots = allTimeSlots.length;
    } else {
      weeklySlots = allTimeSlots.filter(s => s.ground_id === selectedGroundId).length;
    }
    
    const fallbackCapacity = weeklySlots === 0;

    const relevantBookings = selectedGroundId === 'all' 
      ? allBookings 
      : allBookings.filter(b => b.ground_id === selectedGroundId);

    const now = new Date();
    
    // DAY data: last 7 days
    const dayData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = relevantBookings.filter(b => b.booking_date.startsWith(dateStr)).length;
      
      const capacity = Math.max(1, Math.round(weeklySlots / 7));
      const val = fallbackCapacity ? 0 : Math.min(100, Math.round((count / capacity) * 100));
      
      dayData.push({
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        value: i === 0 ? displayOccupancy : val
      });
    }

    // MONTH data: Jan-Dec of CURRENT year
    const monthData = [];
    const currentYear = now.getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 12; i++) {
      const count = relevantBookings.filter(b => {
        if (!b.booking_date) return false;
        const bd = new Date(b.booking_date);
        return bd.getFullYear() === currentYear && bd.getMonth() === i;
      }).length;
      
      const capacity = Math.max(1, Math.round(weeklySlots * 4.33));
      const val = fallbackCapacity ? 0 : Math.min(100, Math.round((count / capacity) * 100));
      
      monthData.push({
        label: monthNames[i],
        value: i === now.getMonth() ? displayOccupancy : val
      });
    }

    // YEAR data: last 5 years
    const yearData = [];
    for (let i = 4; i >= 0; i--) {
      const y = currentYear - i;
      const count = relevantBookings.filter(b => {
        if (!b.booking_date) return false;
        const bd = new Date(b.booking_date);
        return bd.getFullYear() === y;
      }).length;
      
      const capacity = Math.max(1, Math.round(weeklySlots * 52));
      const val = fallbackCapacity ? 0 : Math.min(100, Math.round((count / capacity) * 100));
      
      yearData.push({
        label: y.toString(),
        value: i === 0 ? displayOccupancy : val
      });
    }

    return { day: dayData, month: monthData, year: yearData };
  }, [allBookings, allTimeSlots, selectedGroundId, displayOccupancy]);

  const [filter, setFilter] = useState<"day" | "month" | "year">("month");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const currentData = computedOccupancyData[filter];
  const maxValue = Math.max(...currentData.map((item) => item.value));

  const average = Math.round(
    currentData.reduce((acc, item) => acc + item.value, 0) / currentData.length
  );

  const lowest = Math.min(...currentData.map((item) => item.value));

  return (
    <WebLayout hideHeader={true}>
      <ScrollView 
        style={styles.scrollRoot} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <ActivityIndicator size="large" color="#01e669" />
            <Text style={{ marginTop: 16, color: '#6B7280', fontFamily: 'Inter' }}>Loading real-time analytics...</Text>
          </View>
        ) : (
          <View style={[styles.container, isSmallScreen && { padding: 0 }]}>
          
          {/* Header */}
          <View style={[styles.header, isCompact && styles.headerVertical, isSmallScreen && { paddingHorizontal: 8, marginTop: 16 }]}>
            <View>
              <Text style={styles.subTitle}>Occupancy Analytics</Text>
              <Text style={styles.title}>Venue Occupancy</Text>
              <Text style={styles.description}>
                Track daily, monthly and yearly occupancy performance.
              </Text>
            </View>

            {/* Filters */}
            <View style={[styles.filterContainer, isSmallScreen && styles.filterContainerFull]}>
              {(["day", "month", "year"] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filterButton,
                    filter === item && styles.filterButtonActive,
                    isSmallScreen && { flex: 1 }
                  ]}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filter === item && styles.filterButtonTextActive
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Venue Selector */}
          {grounds.length > 0 && (
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 20,
              paddingHorizontal: isSmallScreen ? 8 : 0,
            }}>
              <TouchableOpacity
                onPress={() => setSelectedGroundId('all')}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: selectedGroundId === 'all' ? '#06392e' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: selectedGroundId === 'all' ? '#06392e' : '#e2e8f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedGroundId === 'all' ? 0.1 : 0.02,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text style={{
                  color: selectedGroundId === 'all' ? '#FFFFFF' : '#475569',
                  fontWeight: '700',
                  fontSize: 13,
                }}>
                  All Venues ({overallOccupancy}%)
                </Text>
              </TouchableOpacity>

              {grounds.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => setSelectedGroundId(g.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: selectedGroundId === g.id ? '#06392e' : '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: selectedGroundId === g.id ? '#06392e' : '#e2e8f0',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: selectedGroundId === g.id ? 0.1 : 0.02,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Text style={{
                    color: selectedGroundId === g.id ? '#FFFFFF' : '#475569',
                    fontWeight: '700',
                    fontSize: 13,
                  }}>
                    {g.name} ({g.occupancy}%)
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Main Card */}
          <View style={[styles.mainCard, isSmallScreen && { borderRadius: 0, borderWidth: 0, boxShadow: 'none' } as any]}>
            
            {/* Top Section */}
            <View style={[styles.topSection, isCompact && styles.topSectionVertical, isSmallScreen && { padding: 8, paddingVertical: 16 }]}>
              
              {/* Left Stats */}
              <View style={[styles.leftStatsCard, isCompact && { width: '100%' }]}>
                <View style={styles.blurEffect} />
                
                <Text style={styles.cardLabel}>Current Occupancy</Text>
                <Text style={styles.heroValue}>
                  {currentData[currentData.length - 1].value}%
                </Text>

                <View style={styles.badgeRow}>
                  <View style={styles.trendBadge}>
                    <Text style={styles.trendBadgeText}>+12.4%</Text>
                  </View>
                  <Text style={styles.trendLabel}>vs previous period</Text>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${currentData[currentData.length - 1].value}%` }
                      ]} 
                    />
                  </View>
                </View>
              </View>

              {/* Chart Area */}
              <View style={[styles.chartArea, isCompact && { width: '100%' }]}>
                <View style={[styles.chartHeader, isSmallScreen && styles.chartHeaderVertical]}>
                  <View>
                    <Text style={styles.chartTitle}>Occupancy Trend</Text>
                    <Text style={styles.chartSub}>
                      Performance overview based on selected filter.
                    </Text>
                  </View>

                  <View style={styles.legend}>
                    <View style={styles.legendDot} />
                    <Text style={styles.legendText}>Occupancy %</Text>
                  </View>
                </View>

                {/* Chart */}
                <View style={{ height: 350, width: '100%' }}>
                  {Platform.OS === 'web' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={currentData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                        <XAxis dataKey="label" tick={{ fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#6b7280" }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: "16px",
                            border: "1px solid #e5ece7",
                            backgroundColor: "#ffffff",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#01e669"
                          strokeWidth={4}
                          dot={{ r: 5, fill: "#01e669", stroke: "#01e669", strokeWidth: 2 }}
                          activeDot={{ r: 8, fill: "#06392e", stroke: "#01e669", strokeWidth: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    /* Fallback simulated chart for mobile */
                    <View style={styles.chartContainer}>
                      {currentData.map((item, index) => {
                        const barHeight = (item.value / maxValue) * 200;
                        
                        return (
                          <View
                            key={index}
                            style={styles.barWrapper}
                          >
                            <View style={[
                              styles.barValueContainer, 
                              { opacity: 1 }
                            ]}>
                              <Text style={styles.barValueText}>{item.value}%</Text>
                            </View>

                            <LinearGradient
                              colors={['#01e669', '#06392e']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 0, y: 1 }}
                              style={[
                                styles.chartBar,
                                { height: barHeight }
                              ]}
                            />
                            <Text style={styles.barLabel}>{item.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Bottom Cards */}
            <View style={[styles.bottomGrid, isSmallScreen && styles.bottomGridVertical, isSmallScreen && { padding: 8, paddingTop: 0 }]}>
              
              {/* Peak */}
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Peak Occupancy</Text>
                <Text style={styles.statValue}>{maxValue}%</Text>
                <Text style={styles.statSub}>Highest recorded performance</Text>
              </View>

              {/* Average */}
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Average Occupancy</Text>
                <Text style={styles.statValue}>{average}%</Text>
                <Text style={styles.statSub}>Stable growth across periods</Text>
              </View>

              {/* Lowest */}
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Lowest Occupancy</Text>
                <Text style={styles.statValue}>{lowest}%</Text>
                <Text style={styles.statSub}>Opportunity for optimization</Text>
              </View>
            </View>
          </View>
          </View>
        )}
      </ScrollView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 20,
  },
  headerVertical: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  subTitle: {
    color: '#01e669',
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontWeight: '500',
    fontSize: 10,
    fontFamily: 'Inter',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06392e',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  description: {
    color: '#6B7280',
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'Inter',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7ece8',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 1,
      }
    })
  },
  filterContainerFull: {
    width: '100%',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }
    })
  },
  filterButtonActive: {
    backgroundColor: '#06392e',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      default: {
        elevation: 2,
      }
    })
  },
  filterButtonText: {
    color: '#06392e',
    fontWeight: '600',
    textTransform: 'capitalize',
    fontFamily: 'Inter',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#e8efea',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      default: {
        elevation: 2,
      }
    })
  },
  topSection: {
    flexDirection: 'row',
    gap: 24,
    padding: 32,
  },
  topSectionVertical: {
    flexDirection: 'column',
  },
  leftStatsCard: {
    width: '25%',
    backgroundColor: '#06392e',
    borderRadius: 24,
    padding: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  blurEffect: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 176,
    height: 176,
    backgroundColor: 'rgba(1, 230, 105, 0.15)',
    borderRadius: 88,
    ...Platform.select({
      web: {
        filter: 'blur(32px)',
      }
    })
  },
  cardLabel: {
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 3,
    color: '#8df8bf',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
    fontFamily: 'Inter',
  },
  badgeRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trendBadge: {
    backgroundColor: '#01e669',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  trendBadgeText: {
    color: '#06392e',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  trendLabel: {
    fontSize: 12,
    color: '#c7f9dc',
    fontFamily: 'Inter',
  },
  progressContainer: {
    marginTop: 40,
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#01e669',
    borderRadius: 999,
  },
  chartArea: {
    width: '75%',
    backgroundColor: '#f8fbf9',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#edf2ee',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 16,
  },
  chartHeaderVertical: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  chartTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06392e',
    fontFamily: 'Inter',
  },
  chartSub: {
    color: '#6B7280',
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#01e669',
  },
  legendText: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    height: 240,
    paddingBottom: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barValueContainer: {
    position: 'absolute',
    top: -25,
    opacity: 0,
    ...Platform.select({
      web: {
        transition: 'opacity 0.2s ease',
      }
    })
  },
  barValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06392e',
    fontFamily: 'Inter',
  },
  chartBar: {
    width: '100%',
    maxWidth: 40,
    borderRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }
    })
  },
  chartBarHovered: {
    transform: [{ scaleX: 1.05 }, { scaleY: 1.03 }],
    ...Platform.select({
      web: {
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    })
  },
  barLabel: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    fontFamily: 'Inter',
    position: 'absolute',
    bottom: -20,
  },
  bottomGrid: {
    flexDirection: 'row',
    gap: 24,
    padding: 32,
    paddingTop: 0,
  },
  bottomGridVertical: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e9efeb',
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 1,
      }
    })
  },
  statLabel: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  statValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#06392e',
    marginTop: 16,
    fontFamily: 'Inter',
  },
  statSub: {
    color: '#01b85a',
    fontWeight: '500',
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter',
  },
});
