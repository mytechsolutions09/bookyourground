import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { UserX, Clock, CheckCircle } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';

export default function DeletionRequestsScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles:user_id (
            full_name,
            phone,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching deletion requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const markResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .update({ status: 'resolved' })
        .eq('id', id);
        
      if (error) throw error;
      await fetchRequests();
    } catch (err) {
      console.error('Error resolving request:', err);
      alert('Failed to update status');
    }
  };

  const content = (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRequests} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Account Deletion Requests</Text>
        <Text style={styles.subtitle}>Manage users who requested to delete their accounts.</Text>
      </View>

      {loading && requests.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color="#10b981" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <UserX color="#D1D5DB" size={48} />
          <Text style={styles.emptyText}>No deletion requests found.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.name}>{req.profiles?.full_name || 'Unknown User'}</Text>
                  <Text style={styles.phone}>{req.profiles?.phone || 'No Phone'}</Text>
                </View>
                <View style={[styles.badge, req.status === 'resolved' ? styles.badgeResolved : styles.badgePending]}>
                  <Text style={[styles.badgeText, req.status === 'resolved' ? styles.textResolved : styles.textPending]}>
                    {req.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.dateRow}>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.dateText}>
                    Requested: {new Date(req.created_at).toLocaleDateString()}
                  </Text>
                </View>
                
                {req.status !== 'resolved' && (
                  <TouchableOpacity 
                    style={styles.resolveButton}
                    onPress={() => markResolved(req.id)}
                  >
                    <CheckCircle size={14} color="#FFFFFF" />
                    <Text style={styles.resolveButtonText}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>
          {content}
        </SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        {content}
      </View>
    </SettingsSubbar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  center: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  list: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  phone: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeResolved: {
    backgroundColor: '#D1FAE5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  textPending: {
    color: '#D97706',
  },
  textResolved: {
    color: '#059669',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resolveButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
});
