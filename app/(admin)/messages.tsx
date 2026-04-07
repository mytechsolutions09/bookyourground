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
} from 'react-native';
import { LifeBuoy, CheckCircle2, Circle, Search, Filter, ChevronRight, User, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';

interface ContactQuery {
  id: string;
  created_at: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  resolved: boolean;
  role: string | null;
}

export default function AdminMessagesScreen() {
  const [messages, setMessages] = useState<ContactQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactQuery | null>(null);

  useEffect(() => {
    loadMessages();
  }, [filter]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('contact_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('resolved', false);
      } else if (filter === 'resolved') {
        query = query.eq('resolved', true);
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

  const filteredMessages = messages.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessageItem = ({ item }: { item: ContactQuery }) => (
    <TouchableOpacity 
      style={[styles.messageItem, selectedMessage?.id === item.id && styles.messageItemActive]}
      onPress={() => setSelectedMessage(item)}
    >
      <View style={styles.messageItemHeader}>
        <View style={styles.senderInfo}>
          <Text style={styles.senderName}>{item.name}</Text>
          <Text style={styles.senderEmail}>{item.email}</Text>
        </View>
        <TouchableOpacity onPress={() => toggleResolved(item.id, item.resolved)}>
          {item.resolved ? (
            <CheckCircle2 size={24} color="#10b981" />
          ) : (
            <Circle size={24} color="#9CA3AF" />
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
      <View style={styles.sidebar}>
        <View style={styles.header}>
          <Text style={styles.title}>Support Tickets</Text>
          <View style={styles.filterRow}>
            {(['all', 'pending', 'resolved'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, filter === f && styles.filterBtnActive] as ViewStyle[]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive] as TextStyle[]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.searchBox}>
            <Search size={18} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tickets..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
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

              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={styles.replyButton}
                  onPress={() => {
                    const mailto = `mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || 'Support'}`;
                    Platform.OS === 'web' ? window.open(mailto) : null;
                  }}
                >
                  <Text style={styles.replyButtonText}>Reply via Email</Text>
                </TouchableOpacity>
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
    <WebLayout>
      {mainContent}
    </WebLayout>
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
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
  },
  listContent: {
    paddingBottom: 20,
  },
  messageItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  messageItemActive: {
    backgroundColor: '#F0FDFA',
    borderRightWidth: 3,
    borderRightColor: '#10b981',
  },
  messageItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  senderEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  messageSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  messageSnippet: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
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
  detailActions: {
    flexDirection: 'row',
    gap: 16,
  },
  replyButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  replyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
