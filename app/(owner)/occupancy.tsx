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
} from "recharts/lib";

export default function OccupancyDashboard() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const isSmallScreen = width < 600;

  const { user } = useAuth();
  const [realOccupancy, setRealOccupancy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOccupancy() {
      if (!user) return;
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_owner_occupancy_rate', { target_owner_id: user.id });
        if (error) throw error;
        
        // Handle RPC returning an array or single object
        const result = Array.isArray(data) ? data[0] : data;
        if (result && result.occupancy_percentage !== undefined) {
          setRealOccupancy(Math.round(result.occupancy_percentage));
        }
      } catch (err) {
        console.error('Error fetching occupancy:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOccupancy();
  }, [user]);

  const displayOccupancy = realOccupancy !== null ? realOccupancy : 75; // Fallback to 75 if null

  const occupancyData = {
    day: [
      { label: "1 Jun", value: 72 },
      { label: "2 Jun", value: 78 },
      { label: "3 Jun", value: 81 },
      { label: "4 Jun", value: 69 },
      { label: "5 Jun", value: 88 },
      { label: "6 Jun", value: 92 },
      { label: "7 Jun", value: displayOccupancy },
    ],

    month: [
      { label: "Jan", value: 62 },
      { label: "Feb", value: 70 },
      { label: "Mar", value: 75 },
      { label: "Apr", value: 80 },
      { label: "May", value: 86 },
      { label: "Jun", value: 78 },
      { label: "Jul", value: 83 },
      { label: "Aug", value: 89 },
      { label: "Sep", value: 73 },
      { label: "Oct", value: 77 },
      { label: "Nov", value: 84 },
      { label: "Dec", value: displayOccupancy },
    ],

    year: [
      { label: "2022", value: 58 },
      { label: "2023", value: 66 },
      { label: "2024", value: 74 },
      { label: "2025", value: 82 },
      { label: "2026", value: displayOccupancy },
    ],
  };

  const [filter, setFilter] = useState<"day" | "month" | "year">("month");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const currentData = occupancyData[filter];
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
          <View style={styles.container}>
          
          {/* Header */}
          <View style={[styles.header, isCompact && styles.headerVertical]}>
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

          {/* Main Card */}
          <View style={styles.mainCard}>
            
            {/* Top Section */}
            <View style={[styles.topSection, isCompact && styles.topSectionVertical]}>
              
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
                          dot={{ r: 6, fill: "#06392e", stroke: "#01e669", strokeWidth: 3 }}
                          activeDot={{ r: 8 }}
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
            <View style={[styles.bottomGrid, isSmallScreen && styles.bottomGridVertical]}>
              
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
