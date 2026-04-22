import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';

export default function CalendarTabs() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const formatDate = (date: Date, type: 'weekday' | 'day' | 'month') => {
    if (type === 'weekday') return date.toLocaleDateString('en-US', { weekday: 'short' });
    if (type === 'day') return date.getDate().toString();
    if (type === 'month') return date.toLocaleDateString('en-US', { month: 'short' });
    return '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
           <Text style={styles.subtitle}>Find your slot</Text>
           <Text style={styles.title}>Live Availability</Text>
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View Full Calendar</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const dayName = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : formatDate(date, 'weekday');
          const dayNumber = formatDate(date, 'day');
          const monthName = formatDate(date, 'month');

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateCard,
                isSelected && styles.dateCardActive,
                index === 0 && { marginLeft: 24 },
                index === dates.length - 1 && { marginRight: 24 },
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>
                {dayName}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberActive]}>
                {dayNumber}
              </Text>
              <Text style={[styles.monthName, isSelected && styles.monthNameActive]}>
                {monthName}
              </Text>
              {isSelected && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#043529',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#10B981',
    fontFamily: 'Inter',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  viewAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(4, 53, 41, 0.05)',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  scrollContent: {
    paddingRight: 24,
    paddingBottom: 8,
  },
  dateCard: {
    width: 88,
    height: 112,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: 'rgba(15, 23, 42, 0.08)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 20,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
      },
    }) as any,
  },
  dateCardActive: {
    backgroundColor: '#043529',
    borderColor: '#043529',
    transform: [{ scale: 1.05 }, { translateY: -4 }],
    ...Platform.select({
      web: {
        shadowColor: 'rgba(4, 53, 41, 0.25)',
        shadowRadius: 25,
        shadowOffset: { width: 0, height: 12 },
      }
    }) as any,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  dayNameActive: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dayNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
    letterSpacing: -1,
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  monthName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  monthNameActive: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    position: 'absolute',
    bottom: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ea6b',
    shadowColor: '#00ea6b',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
