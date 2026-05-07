import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
  ScrollView,
  TextStyle,
  ViewStyle,
  Modal,
} from 'react-native';
import { LifeBuoy, CheckCircle2, Circle, Search, Filter, ChevronRight, User, Calendar, X, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';

interface ContactQuery {
  id: string;
  created_at: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  resolved: boolean;
  role: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  ticket_number: string | null;
}

export default function AdminMessagesScreen() {
  const [messages, setMessages] = useState<ContactQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ground_owner' | 'user'>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({start: null, end: null});
  const [selectedMessage, setSelectedMessage] = useState<ContactQuery | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const FilterDropdown = ({ id, label, value, options, onSelect }: any) => {
    const isOpen = activeDropdown === id;
    const selectedOption = options.find((o: any) => o.key === value);

    return (
      <View style={[styles.dropdownContainer, isOpen && { zIndex: 2000 }]}>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, isOpen && styles.dropdownTriggerActive]} 
          onPress={() => setActiveDropdown(isOpen ? null : id)}
        >
          <Text style={styles.dropdownLabel}>{label}:</Text>
          <Text style={styles.dropdownValue}>{selectedOption?.label || 'Select'}</Text>
          <ChevronDown size={14} color="#6B7280" />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdownMenu}>
            {options.map((opt: any) => (
              <TouchableOpacity 
                key={opt.key} 
                style={[styles.dropdownItem, value === opt.key && styles.dropdownItemActive]}
                onPress={() => {
                  onSelect(opt.key);
                  setActiveDropdown(null);
                }}
              >
                <Text style={[styles.dropdownItemText, value === opt.key && styles.dropdownItemTextActive]}>
                  {opt.label}
                </Text>
                {value === opt.key && <CheckCircle2 size={14} color="#10b981" />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  useEffect(() => {
    loadMessages();
  }, [statusFilter, roleFilter, dateRange]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('contact_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        query = query.eq('resolved', false);
      } else if (statusFilter === 'resolved') {
        query = query.eq('resolved', true);
      }

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start.toISOString());
      }
      if (dateRange.end) {
        // Set end of day for end date
        const endOfDay = new Date(dateRange.end);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setMessages(data || []);
      
      // Select first message by default on web if none selected
      if (Platform.OS === 'web' && data && data.length > 0 && !selectedMessage) {
        setSelectedMessage(data[0]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const toggleResolved = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('contact_queries')
        .update({ resolved: !currentStatus, resolved_at: !currentStatus ? new Date().toISOString() : null })
        .eq('id', id);

      if (error) throw error;
      
      setMessages(prev => prev.map(m => m.id === id ? { ...m, resolved: !currentStatus } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, resolved: !currentStatus } : null);
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };
  
  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || sendingReply) return;
    
    try {
      setSendingReply(true);
      const { error } = await supabase
        .from('contact_queries')
        .update({ 
          admin_reply: replyText, 
          replied_at: new Date().toISOString(),
          // resolved: true // Optionally mark resolved on reply
        })
        .eq('id', selectedMessage.id);
        
      if (error) throw error;
      
      setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, admin_reply: replyText, replied_at: new Date().toISOString() } : m));
      setSelectedMessage(prev => prev ? { ...prev, admin_reply: replyText, replied_at: new Date().toISOString() } : null);
      setReplyText('');
      
      if (Platform.OS === 'web') {
        alert('Reply sent successfully!');
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      alert(error.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.ticket_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const DateRangeModal = () => {
    const quickRanges = [
      { label: 'All Time', start: null, end: null },
      { label: 'Today', start: new Date(), end: new Date() },
      { label: 'Yesterday', start: new Date(Date.now() - 86400000), end: new Date(Date.now() - 86400000) },
      { label: 'This Week', start: new Date(Date.now() - new Date().getDay() * 86400000), end: new Date() },
      { label: 'Last Week', start: new Date(Date.now() - (new Date().getDay() + 7) * 86400000), end: new Date(Date.now() - (new Date().getDay() + 1) * 86400000) },
      { label: 'This Month', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
      { label: 'Last Month', start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) },
    ];

    return (
      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalContent}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>Filter by Date</Text>
              <TouchableOpacity onPress={() => setShowDateModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateModalBody}>
              <View style={styles.quickRangeList}>
                <Text style={styles.sectionLabel}>Quick Range</Text>
                {quickRanges.map((range) => (
                  <TouchableOpacity 
                    key={range.label} 
                    style={styles.quickRangeItem}
                    onPress={() => {
                      setDateRange({ start: range.start, end: range.end });
                      setShowDateModal(false);
                    }}
                  >
                    <Calendar size={14} color="#9CA3AF" />
                    <Text style={styles.quickRangeLabel}>{range.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Note: Custom calendar picker would go here for 'Custom Range' */}
            </View>

            <View style={styles.dateModalFooter}>
               <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDateModal(false)}>
                 <Text style={styles.modalCancelBtnText}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={styles.modalApplyBtn} 
                 onPress={() => setShowDateModal(false)}
               >
                 <Text style={styles.modalApplyBtnText}>Apply Filter</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMessageItem = ({ item }: { item: ContactQuery }) => (
    <TouchableOpacity 
      style={[styles.messageItem, selectedMessage?.id === item.id && styles.messageItemActive]}
      onPress={() => setSelectedMessage(item)}
    >
      <View style={styles.messageItemHeader}>
        <View style={styles.senderInfo}>
          <Text style={styles.senderTicketNumber}>{item.ticket_number || 'TKT-PENDING'}</Text>
          <Text style={styles.senderName}>{item.name}</Text>
          <Text style={styles.senderEmail}>{item.email}</Text>
        </View>
        <TouchableOpacity onPress={() => toggleResolved(item.id, item.resolved)}>
          {item.resolved ? (
            <CheckCircle2 size={18} color="#10b981" />
          ) : (
            <Circle size={18} color="#D1D5DB" />
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.messageSubject} numberOfLines={1}>
        {item.subject || '(No Subject)'}
      </Text>
      <Text style={styles.messageSnippet} numberOfLines={2}>
        {item.message}
      </Text>
      <View style={styles.messageFooter}>
        <Text style={styles.messageDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.role.replace('_', ' ')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const mainContent = (
    <View style={styles.container}>
      <DateRangeModal />
      <View style={styles.sidebar}>
        <View style={styles.header}>
          {Platform.OS === 'web' && <Text style={styles.title}>Support Tickets</Text>}
          <View style={styles.headerFiltersRow}>
            <FilterDropdown 
              id="status" 
              label="Status" 
              value={statusFilter}
              options={[
                { key: 'all', label: 'All Tickets' },
                { key: 'pending', label: 'Pending' },
                { key: 'resolved', label: 'Resolved' },
              ]}
              onSelect={setStatusFilter}
            />

            <FilterDropdown 
              id="role" 
              label="From" 
              value={roleFilter}
              options={[
                { key: 'all', label: 'Everyone' },
                { key: 'ground_owner', label: 'Owners' },
                { key: 'user', label: 'Players' },
              ]}
              onSelect={setRoleFilter}
            />

            <TouchableOpacity 
              style={[styles.dateFilterBtn, (dateRange.start || dateRange.end) && styles.dateFilterBtnActive]}
              onPress={() => setShowDateModal(true)}
            >
              <Calendar size={14} color={(dateRange.start || dateRange.end) ? "#10b981" : "#6B7280"} />
              <Text style={[styles.dateFilterText, (dateRange.start || dateRange.end) && styles.dateFilterTextActive]}>
                {dateRange.start ? (
                   `${dateRange.start.toLocaleDateString()} - ${dateRange.end ? dateRange.end.toLocaleDateString() : 'Now'}`
                ) : 'Date'}
              </Text>
            </TouchableOpacity>

            <View style={styles.searchBox}>
              <Search size={14} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : (
          <FlatList
            data={filteredMessages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMessages(); }} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <LifeBuoy size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No support tickets found</Text>
              </View>
            }
          />
        )}
      </View>

      {Platform.OS === 'web' && (
        <View style={styles.detailPane}>
          {selectedMessage ? (
            <ScrollView contentContainerStyle={styles.detailContent}>
              <View style={styles.detailHeader}>
                <View style={styles.detailHeaderTop}>
                  <Text style={styles.detailTitle}>{selectedMessage.subject || '(No Subject)'}</Text>
                  <TouchableOpacity 
                    style={[styles.resolveToggle, selectedMessage.resolved && styles.resolveToggleActive] as ViewStyle[]}
                    onPress={() => toggleResolved(selectedMessage.id, selectedMessage.resolved)}
                  >
                    <CheckCircle2 size={18} color={selectedMessage.resolved ? "#FFFFFF" : "#6B7280"} />
                    <Text style={[styles.resolveToggleText, selectedMessage.resolved && styles.resolveToggleTextActive] as TextStyle[]}>
                      {selectedMessage.resolved ? 'Resolved' : 'Mark as Resolved'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.detailMeta}>
                  <View style={styles.metaItem}>
                    <User size={16} color="#6B7280" />
                    <Text style={styles.metaText}>{selectedMessage.name} ({selectedMessage.email})</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Calendar size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      Received on {new Date(selectedMessage.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.messageBody}>
                <Text style={styles.messageText}>{selectedMessage.message}</Text>
              </View>

              <View style={styles.replySection}>
                <Text style={styles.sectionLabel}>Admin Reply</Text>
                
                {selectedMessage.admin_reply ? (
                  <View style={styles.existingReplyBox}>
                    <Text style={styles.existingReplyText}>{selectedMessage.admin_reply}</Text>
                    <Text style={styles.repliedAtText}>
                      Sent on {new Date(selectedMessage.replied_at!).toLocaleString()}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => setReplyText(selectedMessage.admin_reply || '')}
                      style={styles.editReplyBtn}
                    >
                      <Text style={styles.editReplyBtnText}>Edit Reply</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.replyInputBox}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder="Type your reply here..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      value={replyText}
                      onChangeText={setReplyText}
                    />
                    <TouchableOpacity 
                      style={[styles.replyButton, (!replyText.trim() || sendingReply) && styles.replyButtonDisabled]}
                      onPress={handleSendReply}
                      disabled={!replyText.trim() || sendingReply}
                    >
                      {sendingReply ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.replyButtonText}>Send Reply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.center}>
              <LifeBuoy size={64} color="#E5E7EB" />
              <Text style={styles.placeholderText}>Select a ticket to view details</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebLayout>{mainContent}</WebLayout>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <MobileAppNavbar title="SUPPORT TICKETS" titleColor="#10b981" />
          {mainContent}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    // Removed calc() height which caused errors
  },
  sidebar: {
    flex: 1,
    maxWidth: Platform.OS === 'web' ? 400 : '100%',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  detailPane: {
    flex: 2,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 1000,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  headerFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 100,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  dropdownTriggerActive: {
    borderColor: '#10b981',
    backgroundColor: '#F0FDF4',
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  dropdownValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 2000,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDF4',
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter',
  },
  dropdownItemTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  dateFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  dateFilterBtnActive: {
    borderColor: '#10b981',
    backgroundColor: '#F0FDF4',
  },
  dateFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  dateFilterTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  dateModalBody: {
    padding: 20,
  },
  quickRangeList: {
    gap: 8,
  },
  quickRangeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  quickRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  dateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalApplyBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterBtnActive: {
    backgroundColor: '#10b981',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 120,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: '#111827',
    fontFamily: 'Inter',
    // @ts-ignore
    outlineStyle: 'none',
  },
  listContent: {
    paddingBottom: 20,
  },
  messageItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  messageItemActive: {
    backgroundColor: '#F9FAFB',
    borderRightWidth: 3,
    borderRightColor: '#10b981',
  },
  messageItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderInfo: {
    flex: 1,
  },
  senderTicketNumber: {
    fontSize: 9,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  senderEmail: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  messageSubject: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
    fontFamily: 'Inter',
  },
  messageSnippet: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  detailContent: {
    padding: 32,
  },
  detailHeader: {
    marginBottom: 32,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
    marginBottom: 16,
  },
  detailTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  resolveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resolveToggleActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  resolveToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  resolveToggleTextActive: {
    color: '#FFFFFF',
  },
  detailMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
  },
  messageBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 32,
  },
  messageText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  replySection: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyInputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  replyInput: {
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  replyButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-end',
    minWidth: 120,
    alignItems: 'center',
  },
  replyButtonDisabled: {
    opacity: 0.5,
  },
  replyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  existingReplyBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  existingReplyText: {
    fontSize: 15,
    color: '#166534',
    lineHeight: 22,
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  repliedAtText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '500',
  },
  editReplyBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  editReplyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    textDecorationLine: 'underline',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
