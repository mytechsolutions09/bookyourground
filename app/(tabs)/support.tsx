import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import WebLayout from '@/components/web/WebLayout';
import Card from '@/components/ui/Card';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Plus, 
  LifeBuoy, 
  Phone, 
  Mail, 
  MapPin, 
  MessageCircle 
} from 'lucide-react-native';

type ActiveTab = 'new_ticket' | 'activity' | 'info';

interface Ticket {
  id: string;
  created_at: string;
  subject: string | null;
  message: string;
  resolved: boolean;
}

export default function SupportScreen() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('new_ticket');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contact_queries')
        .select('id, created_at, subject, message, resolved')
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Empty message', 'Please describe your issue.');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('contact_queries').insert({
        profile_id: user?.id,
        role: profile?.role || 'user',
        name: profile?.full_name || user?.email?.split('@')[0] || 'User',
        email: user?.email || '',
        subject: subject.trim() || 'Support Request',
        message: message.trim(),
      });

      if (error) throw error;

      Alert.alert('Message Sent', 'Our team will review your message and get back to you shortly.');
      setSubject('');
      setMessage('');
      setActiveTab('activity');
      loadTickets();
    } catch (error) {
      console.error('Error submitting message:', error);
      Alert.alert('Error', 'Could not send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTicketItem = (item: Ticket) => (
    <Card key={item.id} style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketSubjectContainer}>
          <MessageSquare size={16} color="#10b981" />
          <Text style={styles.ticketSubject}>{item.subject || 'Support Request'}</Text>
        </View>
        <View style={[styles.statusBadge, item.resolved ? styles.resolvedBadge : styles.pendingBadge]}>
          <Text style={[styles.statusText, item.resolved ? styles.resolvedText : styles.pendingText]}>
            {item.resolved ? 'Resolved' : 'Pending'}
          </Text>
        </View>
      </View>
      <Text style={styles.ticketMessage}>{item.message}</Text>
      <View style={styles.ticketFooter}>
        <Clock size={12} color="#9CA3AF" />
        <Text style={styles.ticketDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
    </Card>
  );

  const mainContent = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Segmented Control - Match Image Style */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBackground}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'new_ticket' && styles.activeTab]} 
            onPress={() => setActiveTab('new_ticket')}
          >
            <Text style={[styles.tabText, activeTab === 'new_ticket' && styles.activeTabText]}>
              New Message
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'activity' && styles.activeTab]} 
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
              Activity
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'info' && styles.activeTab]} 
            onPress={() => setActiveTab('info')}
          >
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
              Info
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'new_ticket' && (
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Send a Message</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What's this about?"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Detailed Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="How can we help you?"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'activity' && (
        <View>
          <Text style={styles.sectionTitle}>Your Recent Activity</Text>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#10b981" />
          ) : tickets.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageCircle size={48} color="#E5E7EB" />
              <Text style={styles.emptyText}>You haven't sent any messages yet.</Text>
            </View>
          ) : (
            <View style={styles.ticketList}>
              {tickets.map((ticket) => (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketSubjectContainer}>
                      <MessageSquare size={16} color="#10b981" />
                      <Text style={styles.ticketSubject}>{ticket.subject || 'Support Request'}</Text>
                    </View>
                    <View style={[styles.statusBadge, ticket.resolved ? styles.resolvedBadge : styles.pendingBadge]}>
                      <Text style={[styles.statusText, ticket.resolved ? styles.resolvedText : styles.pendingText]}>
                        {ticket.resolved ? 'Resolved' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketMessage}>{ticket.message}</Text>
                  <View style={styles.ticketFooter}>
                    <Clock size={12} color="#9CA3AF" />
                    <Text style={styles.ticketDate}>{new Date(ticket.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 'info' && (
        <View style={styles.infoContent}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Information</Text>
            
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => Linking.openURL('mailto:support@bookyourground.com')}
            >
              <View style={styles.iconCircle}>
                <Mail size={20} color="#10b981" />
              </View>
              <View>
                <Text style={styles.contactLabel}>Official Email</Text>
                <Text style={styles.contactValue}>support@bookyourground.com</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );

  return (
    <WebLayout noCard>
      {mainContent}
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: Platform.OS === 'web' ? 40 : 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  tabContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    padding: 6,
    borderRadius: 100, // Capsule shape
    width: Platform.OS === 'web' ? 500 : '100%',
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 100,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563', // Muted text for inactive
  },
  activeTabText: {
    color: '#01b854', // Green text for active
    fontWeight: '700',
  },
  formCard: {
    padding: 24,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    height: 54,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 20,
  },
  ticketList: {
    gap: 16,
  },
  ticketCard: {
    padding: 20,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketSubjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: '#FFFBEB',
  },
  resolvedBadge: {
    backgroundColor: '#ECFDF5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pendingText: {
    color: '#D97706',
  },
  resolvedText: {
    color: '#059669',
  },
  ticketMessage: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  ticketDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoContent: {
    gap: 20,
  },
  infoCard: {
    padding: 24,
  },
  infoCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  contactValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
    marginTop: 2,
  },
});
