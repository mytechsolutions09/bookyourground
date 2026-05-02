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

import MobileAppNavbar from '../../components/MobileAppNavbar';
import { useUI } from '@/contexts/UIContext';

export default function SupportScreen() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('new_ticket');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const { setTabBarVisible } = useUI();
  const lastScrollY = React.useRef(0);

  const onScroll = (event: any) => {
    if (Platform.OS === 'web') return;
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (diff > 10 && currentY > 50) {
      setTabBarVisible(false);
    } else if (diff < -10) {
      setTabBarVisible(true);
    }
    lastScrollY.current = currentY;
  };

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

  const mainContent = (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Segmented Control - Styled like Settings */}
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
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Send a Message</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What's this about?"
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
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
        </Card>
      )}

      {activeTab === 'activity' && (
        <View>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#10b981" />
          ) : tickets.length === 0 ? (
            <Card style={styles.card}>
              <View style={styles.emptyState}>
                <MessageCircle size={48} color="#E5E7EB" />
                <Text style={styles.emptyText}>You haven't sent any messages yet.</Text>
              </View>
            </Card>
          ) : (
            <View style={styles.ticketList}>
              {tickets.map((ticket) => (
                <Card key={ticket.id} style={styles.ticketCard}>
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
                </Card>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 'info' && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Information</Text>
          
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
        </Card>
      )}
    </ScrollView>
  );

  return Platform.OS === 'web' ? (
    <WebLayout>
      {mainContent}
    </WebLayout>
  ) : (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar title="Contact Us" titleColor="#0F172A" />
      <View style={styles.nativeBody}>{mainContent}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  formContainer: {
    paddingVertical: 10,
    width: '100%',
  },
  content: {
    padding: 0,
    width: '100%',
    maxWidth: 1000,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  tabContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 12,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 400 : '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#01b854',
    fontWeight: '700',
  },
  card: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    width: '100%',
  },
  cardTitle: {
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
    backgroundColor: '#FFFFFF',
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
    height: 52,
    borderRadius: 12,
    marginTop: 8,
    maxWidth: 200,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  ticketList: {
    gap: 16,
  },
  ticketCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
    gap: 10,
    flex: 1,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  nativeScreen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  nativeBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
