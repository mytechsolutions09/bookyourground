import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity, Pressable, Platform, ScrollView } from 'react-native';
import { Calendar as CalendarIcon, ArrowRight } from 'lucide-react-native';

interface WebDateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  initialFromDate: string | null;
  initialToDate: string | null;
  onApply: (from: string | null, to: string | null) => void;
}

const QUICK_RANGES = [
  { id: 'all_time', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'custom', label: 'Custom Range' },
];

export default function WebDateRangePicker({
  visible,
  onClose,
  initialFromDate,
  initialToDate,
  onApply
}: WebDateRangePickerProps) {
  const [fromDate, setFromDate] = useState<string | null>(initialFromDate);
  const [toDate, setToDate] = useState<string | null>(initialToDate);
  const [activeRange, setActiveRange] = useState('custom');

  // Offset determines which months are showing. 0 means current month is on the left.
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    if (visible) {
      setFromDate(initialFromDate);
      setToDate(initialToDate);
      setActiveRange(determineQuickRange(initialFromDate, initialToDate));
      
      if (initialFromDate) {
        const d = new Date(initialFromDate);
        const now = new Date();
        const diffMonths = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
        setMonthOffset(diffMonths);
      } else {
        setMonthOffset(0);
      }
    }
  }, [visible, initialFromDate, initialToDate]);

  const determineQuickRange = (from: string | null, to: string | null) => {
    if (!from && !to) return 'all_time';
    // Ideally we would do exact date matching here for "today", "yesterday", etc.
    // But for simplicity, we default to custom if it's not perfectly matching the generated bounds.
    return 'custom';
  };

  const setQuickRange = (id: string) => {
    setActiveRange(id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (id) {
      case 'all_time':
        setFromDate(null);
        setToDate(null);
        break;
      case 'today':
        setFromDate(formatDate(today));
        setToDate(formatDate(today));
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        setFromDate(formatDate(yesterday));
        setToDate(formatDate(yesterday));
        break;
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
        setFromDate(formatDate(startOfWeek));
        setToDate(formatDate(endOfWeek));
        break;
      case 'last_week':
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(today);
        endOfLastWeek.setDate(today.getDate() - today.getDay() - 1);
        setFromDate(formatDate(startOfLastWeek));
        setToDate(formatDate(endOfLastWeek));
        break;
      case 'this_month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setFromDate(formatDate(startOfMonth));
        setToDate(formatDate(endOfMonth));
        break;
      case 'last_month':
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        setFromDate(formatDate(startOfLastMonth));
        setToDate(formatDate(endOfLastMonth));
        break;
    }
  };

  const handleDateClick = (dateStr: string) => {
    setActiveRange('custom');
    if (!fromDate || (fromDate && toDate)) {
      setFromDate(dateStr);
      setToDate(null);
    } else {
      if (dateStr < fromDate) {
        setToDate(fromDate);
        setFromDate(dateStr);
      } else {
        setToDate(dateStr);
      }
    }
  };

  const renderCalendar = (offset: number) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthName = date.toLocaleString('default', { month: 'long' });
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    
    return (
      <View style={styles.calendarWrap}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>{monthName} {year}</Text>
        </View>
        <View style={styles.calGrid}>
           <View style={styles.calHeaderRow}>
             {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
               <Text key={d} style={styles.calHeaderCell}>{d}</Text>
             ))}
           </View>
           {weeks.map((week, wi) => (
             <View key={wi} style={styles.calRow}>
               {week.map((day, di) => {
                 if (!day) return <View key={di} style={styles.calCell} />;
                 
                 const dateStr = day.toISOString().split('T')[0];
                 const isStart = fromDate === dateStr;
                 const isEnd = toDate === dateStr;
                 const isSelected = isStart || isEnd;
                 const isInRange = fromDate && toDate && dateStr > fromDate && dateStr < toDate;
                 const isToday = new Date().toISOString().split('T')[0] === dateStr;
                 
                 return (
                   <TouchableOpacity 
                     key={di} 
                     style={[
                       styles.calCell,
                       isInRange && styles.calCellInRange,
                       isStart && styles.calCellStart,
                       isEnd && styles.calCellEnd,
                       isSelected && styles.calCellSelected,
                     ]}
                     onPress={() => handleDateClick(dateStr)}
                   >
                     <Text style={[
                       styles.calDayText,
                       isInRange && styles.calDayTextInRange,
                       isSelected && styles.calDayTextSelected,
                       isToday && !isSelected && !isInRange && styles.calDayTextToday
                     ]}>
                       {day.getDate()}
                     </Text>
                   </TouchableOpacity>
                 );
               })}
             </View>
           ))}
        </View>
      </View>
    );
  };

  const formatDisplayDate = (d: string | null) => {
    if (!d) return 'Select Date';
    return d;
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => Platform.OS !== 'web' && e.stopPropagation()}>
          
          <View style={styles.mainLayout}>
            {/* Sidebar */}
            <View style={styles.sidebar}>
              <Text style={styles.sidebarTitle}>Quick Range</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {QUICK_RANGES.map(range => {
                  const isActive = activeRange === range.id;
                  return (
                    <TouchableOpacity 
                      key={range.id} 
                      style={[styles.quickRangeBtn, isActive && styles.quickRangeBtnActive]}
                      onPress={() => setQuickRange(range.id)}
                    >
                      <CalendarIcon size={16} color={isActive ? "#00ea6b" : "#64748B"} />
                      <Text style={[styles.quickRangeText, isActive && styles.quickRangeTextActive]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Right Content */}
            <View style={styles.rightContent}>
              {/* Inputs */}
              <View style={styles.inputsRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>START DATE</Text>
                  <View style={styles.dateInputBox}>
                    <CalendarIcon size={18} color="#64748B" />
                    <Text style={styles.dateInputText}>{formatDisplayDate(fromDate)}</Text>
                  </View>
                </View>
                
                <View style={styles.arrowContainer}>
                  <ArrowRight size={20} color="#94A3B8" />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>END DATE</Text>
                  <View style={styles.dateInputBox}>
                    <CalendarIcon size={18} color="#64748B" />
                    <Text style={styles.dateInputText}>{formatDisplayDate(toDate)}</Text>
                  </View>
                </View>
              </View>

              {/* Calendars */}
              <View style={styles.calendarsRow}>
                <TouchableOpacity onPress={() => setMonthOffset(m => m - 1)} style={styles.navBtnPrev}>
                  <Text style={styles.navBtnText}>{'<'}</Text>
                </TouchableOpacity>
                {renderCalendar(monthOffset)}
                <View style={styles.calendarGap} />
                {renderCalendar(monthOffset + 1)}
                <TouchableOpacity onPress={() => setMonthOffset(m => m + 1)} style={styles.navBtnNext}>
                  <Text style={styles.navBtnText}>{'>'}</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.clearBtn} 
              onPress={() => {
                setFromDate(null);
                setToDate(null);
                setActiveRange('custom');
              }}
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>

            <View style={styles.footerRight}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyBtn} 
                onPress={() => {
                  onApply(fromDate, toDate);
                  onClose();
                }}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>

        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  mainLayout: {
    flexDirection: 'row',
    height: 460, // Fixed height for consistency
  },
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    paddingVertical: 20,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  quickRangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  quickRangeBtnActive: {
    backgroundColor: '#E6FFED',
  },
  quickRangeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  quickRangeTextActive: {
    color: '#00ea6b',
  },
  rightContent: {
    flex: 1,
    padding: 24,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 32,
    gap: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dateInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ea6b', // Following the design
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  dateInputText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  arrowContainer: {
    paddingBottom: 14,
    paddingHorizontal: 4,
  },
  calendarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
  },
  calendarGap: {
    width: 32,
  },
  calendarWrap: {
    flex: 1,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  calGrid: {
    width: '100%',
  },
  calHeaderRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  calHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  calRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calDayText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  calDayTextToday: {
    color: '#00ea6b',
    fontWeight: '700',
  },
  calCellSelected: {
    backgroundColor: '#00ea6b',
    borderRadius: 8,
  },
  calDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calCellInRange: {
    backgroundColor: '#E6FFED',
  },
  calCellStart: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  calCellEnd: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  calDayTextInRange: {
    color: '#0F172A',
  },
  navBtnPrev: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  navBtnNext: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  navBtnText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
  },
  instructionRow: {
    marginTop: 24,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAF9',
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  applyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#00ea6b',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
