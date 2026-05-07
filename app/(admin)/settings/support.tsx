import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, RefreshControl, FlatList, TouchableOpacity } from 'react-native';
import { LifeBuoy, Mail, User, Shield, CheckCircle2, Clock } from 'lucide-react-native';
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

  const renderListHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.title}>Support Queries</Text>
          <Text style={styles.subtitle}>
            Review and manage incoming support requests from users and owners.
          </Text>
        </View>
      </View>
      
      <View style={styles.infoBanner}>
        <LifeBuoy size={16} color="#059669" />
        <Text style={styles.infoText}>
          Messages from the public contact form are stored here and also forwarded to the admin email.
        </Text>
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.columnHeader, { flex: 2.5 }]}>Sender</Text>
      <Text style={[styles.columnHeader, { flex: 1.5 }]}>Role</Text>
      <Text style={[styles.columnHeader, { flex: 4 }]}>Message</Text>
      <Text style={[styles.columnHeader, { flex: 1.5, textAlign: 'center' }]}>Status</Text>
      <Text style={[styles.columnHeader, { flex: 2, textAlign: 'right' }]}>Date</Text>
    </View>
  );

  const inner = (
    <View style={styles.container}>
      <FlatList
        data={queries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View>
            {renderListHeader()}
            {queries.length > 0 && renderTableHeader()}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No support queries yet</Text>
            </View>
          ) : (
            <ActivityIndicator style={{ marginTop: 40 }} color="#10b981" />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <View style={[styles.cell, { flex: 2.5 }]}>
              <Text style={styles.cellTextBold} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.cellTextSub} numberOfLines={1}>{item.email}</Text>
            </View>
            
            <View style={[styles.cell, { flex: 1.5 }]}>
              <View style={styles.roleBadge}>
                {item.role === 'ground_owner' ? (
                  <Shield size={10} color="#6B7280" />
                ) : (
                  <User size={10} color="#6B7280" />
                )}
                <Text style={styles.roleText}>
                  {item.role === 'ground_owner' ? 'Owner' : 'User'}
                </Text>
              </View>
            </View>

            <View style={[styles.cell, { flex: 4 }]}>
              {!!item.subject && (
                <Text style={styles.cellTextBold} numberOfLines={1}>{item.subject}</Text>
              )}
              <Text style={styles.cellText} numberOfLines={2}>{item.message}</Text>
            </View>

            <View style={[styles.cell, { flex: 1.5, alignItems: 'center' }]}>
              {item.resolved ? (
                <View style={[styles.statusBadge, styles.resolvedBadge]}>
                  <CheckCircle2 size={10} color="#059669" />
                  <Text style={[styles.statusText, styles.resolvedText]}>Done</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.pendingBadge]}>
                  <Clock size={10} color="#D97706" />
                  <Text style={[styles.statusText, styles.pendingText]}>New</Text>
                </View>
              )}
            </View>

            <View style={[styles.cell, { flex: 2, alignItems: 'flex-end' }]}>
              <Text style={styles.cellTextSub}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
              <Text style={styles.cellTextSub}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>
          {inner}
        </SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {inner}
      </View>
    </SettingsSubbar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#059669',
    flex: 1,
    fontFamily: 'Inter',
    lineHeight: 16,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    marginTop: 20,
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#374151',
    fontFamily: 'Inter',
    lineHeight: 16,
  },
  cellTextBold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  cellTextSub: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Inter',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  resolvedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  resolvedText: {
    color: '#059669',
  },
  pendingText: {
    color: '#D97706',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter',
  },
});
