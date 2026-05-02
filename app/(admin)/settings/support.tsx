import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { LifeBuoy } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import { supabase } from '@/lib/supabase';

type ContactQuery = {
  id: string;
  created_at: string;
  role: 'user' | 'ground_owner' | 'super_admin' | null;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  resolved: boolean;
};

export default function AdminSupportSettings() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queries, setQueries] = useState<ContactQuery[]>([]);

  const loadQueries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_queries')
      .select('id, created_at, role, name, email, subject, message, resolved')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setQueries(data as ContactQuery[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQueries();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueries();
    setRefreshing(false);
  };

  const inner = (
    <SettingsSubbar>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.subtitle}>
            View how users can reach the super admin and review incoming support queries.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.row}>
            <LifeBuoy size={20} color="#6B7280" />
            <Text style={styles.cardTitle}>Contact form</Text>
          </View>
          <Text style={styles.cardText}>
            The public Contact page includes a support form that stores each message in
            the database and also opens an email to the super admin address.
          </Text>
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Recent contact queries</Text>
          </View>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={styles.loadingText}>Loading queries…</Text>
            </View>
          ) : queries.length === 0 ? (
            <Text style={styles.cardText}>No contact queries have been received yet.</Text>
          ) : (
            queries.map((q) => (
              <View key={q.id} style={styles.queryItem}>
                <View style={styles.queryHeader}>
                  <Text style={styles.queryName}>
                    {q.name} <Text style={styles.queryEmail}>{`<${q.email}>`}</Text>
                  </Text>
                  <Text style={styles.queryMeta}>
                    {q.role === 'ground_owner' ? 'Ground owner' : 'User'} ·{' '}
                    {new Date(q.created_at).toLocaleString()}
                  </Text>
                </View>
                {!!q.subject && <Text style={styles.querySubject}>{q.subject}</Text>}
                <Text style={styles.queryMessage}>{q.message}</Text>
                {q.resolved && <Text style={styles.queryResolved}>Resolved</Text>}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SettingsSubbar>
  );

  return Platform.OS === 'web' ? (
    <WebLayout>{inner}</WebLayout>
  ) : inner;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  pageContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...(Platform.OS === 'web' ? ({ paddingTop: 16 } as any) : null),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  queryItem: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  queryHeader: {
    marginBottom: 4,
  },
  queryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  queryEmail: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
  },
  queryMeta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  querySubject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  queryMessage: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  queryResolved: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#059669',
  },
});

