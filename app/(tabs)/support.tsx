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
  Modal,
} from 'react-native';
import { X } from 'lucide-react-native';
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
  ticket_number: string | null;
  admin_reply?: string | null;
  replied_at?: string | null;
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
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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
        .select('id, created_at, subject, message, resolved, ticket_number, admin_reply, replied_at')
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
            <ActivityIndicator style={{ marginTop: 40 }} color="#00ea6b" />

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
                <TouchableOpacity 
                  key={ticket.id} 
                  style={styles.ticketCard}
                  onPress={() => setSelectedTicket(ticket)}
                >
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketSubjectContainer}>
                      <MessageSquare size={16} color="#00ea6b" />

                      <Text style={styles.ticketSubject}>{ticket.subject || 'Support Request'}</Text>
                    </View>
                    <View style={[styles.statusBadge, ticket.resolved ? styles.resolvedBadge : styles.pendingBadge]}>
                      <Text style={[styles.statusText, ticket.resolved ? styles.resolvedText : styles.pendingText]}>
                        {ticket.resolved ? 'Resolved' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketMessage} numberOfLines={3}>{ticket.message}</Text>
                  <View style={styles.ticketFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} color="#9CA3AF" />
                      <Text style={styles.ticketDate}>{new Date(ticket.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={styles.ticketNumberBottom}>Ticket no : {ticket.ticket_number || 'PENDING'}</Text>
                  </View>
                </TouchableOpacity>
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
              <Mail size={20} color="#00ea6b" />

            </View>
            <View>
              <Text style={styles.contactLabel}>Official Email</Text>
              <Text style={styles.contactValue}>support@bookyourground.com</Text>
            </View>
          </TouchableOpacity>
        </Card>
      )}

      {/* Conversation Modal */}
      <Modal
        visible={!!selectedTicket}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.convModalContent}>
            <View style={styles.convHeader}>
              <View>
                <Text style={styles.convTicketNum}>{selectedTicket?.ticket_number || 'TKT-PENDING'}</Text>
                <Text style={styles.convSubject}>{selectedTicket?.subject || 'Support Request'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.closeBtn}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
              {selectedTicket && (
                <>
                  <View style={styles.userBubbleContainer}>
                    <View style={styles.userBubble}>
                      <Text style={styles.bubbleText}>{selectedTicket.message}</Text>
                      <Text style={styles.bubbleTime}>{new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  </View>

                  {selectedTicket.admin_reply ? (
                    <View style={styles.adminBubbleContainer}>
                      <View style={styles.adminBubble}>
                        <Text style={styles.adminBubbleLabel}>Support Team</Text>
                        <Text style={styles.adminBubbleText}>{selectedTicket.admin_reply}</Text>
                        <Text style={styles.adminBubbleTime}>
                          {selectedTicket.replied_at ? new Date(selectedTicket.replied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.pendingReplyBox}>
                      <Clock size={16} color="#94A3B8" />
                      <Text style={styles.pendingReplyText}>Waiting for support team to reply...</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.convFooter}>
               <TouchableOpacity 
                 style={styles.closeActionBtn}
                 onPress={() => setSelectedTicket(null)}
               >
                 <Text style={styles.closeActionText}>Close</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  content: {
    padding: 0,
    width: '100%',
    maxWidth: 1000,
  },
  tabContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tabBackground: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    width: '100%',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00ea6b',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#00ea6b',
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
    backgroundColor: '#00ea6b',
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
    justifyContent: 'space-between',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  ticketDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  ticketNumberBottom: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
  },
  convModalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 600,
    height: Platform.OS === 'web' ? '80%' : '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderRadius: Platform.OS === 'web' ? 32 : 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  convTicketNum: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    marginBottom: 4,
  },
  convSubject: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatContent: {
    padding: 24,
    gap: 20,
  },
  userBubbleContainer: {
    alignItems: 'flex-end',
    width: '100%',
  },
  userBubble: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  bubbleTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
    textAlign: 'right',
    fontWeight: '600',
  },
  adminBubbleContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  adminBubble: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  adminBubbleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  adminBubbleText: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  adminBubbleTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '600',
  },
  pendingReplyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  pendingReplyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  convFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  closeActionBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
  },
  closeActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'Inter',
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
