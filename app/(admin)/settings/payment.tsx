import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Switch, Alert, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { CreditCard, CheckCircle, XCircle, Settings2, Info } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';

interface PaymentGateway {
  id: string;
  name: string;
  label: string;
  is_active: boolean;
  config: any;
}

export default function AdminPaymentSettings() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .order('name');

      if (error) throw error;
      setGateways(data || []);
    } catch (error) {
      console.error('Error loading gateways:', error);
      if (Platform.OS === 'web') alert('Failed to load payment gateways');
      else Alert.alert('Error', 'Failed to load payment gateways');
    } finally {
      setLoading(false);
    }
  };

  const toggleGateway = async (name: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_gateways')
        .update({ is_active: !currentStatus })
        .eq('name', name);

      if (error) throw error;
      
      setGateways(prev => 
        prev.map(g => g.name === name ? { ...g, is_active: !currentStatus } : g)
      );
    } catch (error) {
      console.error('Error toggling gateway:', error);
      if (Platform.OS === 'web') alert('Failed to update gateway status');
      else Alert.alert('Error', 'Failed to update gateway status');
    }
  };

  const renderListHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.title}>Payment Gateways</Text>
          <Text style={styles.subtitle}>Configure and manage platform payment methods.</Text>
        </View>
      </View>
      
      <View style={styles.infoBanner}>
        <Info size={16} color="#1E40AF" />
        <Text style={styles.infoText}>
          API Keys and Secrets must be configured via Supabase Secrets for security. Toggles below control user visibility.
        </Text>
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.columnHeader, { flex: 3 }]}>Provider</Text>
      <Text style={[styles.columnHeader, { flex: 2 }]}>Internal ID</Text>
      <Text style={[styles.columnHeader, { flex: 2, textAlign: 'center' }]}>Visibility</Text>
      <Text style={[styles.columnHeader, { flex: 2, textAlign: 'center' }]}>Status</Text>
      <Text style={[styles.columnHeader, { flex: 3, textAlign: 'right' }]}>Configuration</Text>
    </View>
  );

  const inner = (
    <View style={styles.container}>
      <FlatList
        data={gateways}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View>
            {renderListHeader()}
            {gateways.length > 0 && renderTableHeader()}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGateways} />}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <View style={[styles.cell, { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <View style={[styles.iconBox, item.is_active ? styles.iconBoxActive : null]}>
                <CreditCard size={14} color={item.is_active ? '#10b981' : '#6B7280'} />
              </View>
              <Text style={styles.cellTextBold}>{item.label}</Text>
            </View>
            
            <Text style={[styles.cellText, { flex: 2 }]}>{item.name.toUpperCase()}</Text>

            <View style={[styles.cell, { flex: 2, alignItems: 'center' }]}>
              <Switch
                value={item.is_active}
                onValueChange={() => toggleGateway(item.name, item.is_active)}
                trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                thumbColor={item.is_active ? '#10b981' : '#9CA3AF'}
                style={{ transform: [{ scale: 0.8 }] }}
              />
            </View>

            <View style={[styles.cell, { flex: 2, alignItems: 'center' }]}>
              {item.is_active ? (
                <View style={[styles.statusBadge, styles.activeBadge]}>
                  <CheckCircle size={10} color="#059669" />
                  <Text style={[styles.statusText, styles.activeText]}>Active</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, styles.inactiveBadge]}>
                  <XCircle size={10} color="#6B7280" />
                  <Text style={[styles.statusText, styles.inactiveText]}>Disabled</Text>
                </View>
              )}
            </View>

            <View style={[styles.cell, { flex: 3, alignItems: 'flex-end' }]}>
              {item.name === 'cash' ? (
                <Text style={styles.cellTextSub}>Built-in</Text>
              ) : (
                <View style={styles.configInfo}>
                  <Settings2 size={12} color="#9CA3AF" />
                  <Text style={styles.cellTextSub}>Secrets Managed</Text>
                </View>
              )}
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
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
    fontFamily: 'Inter',
    lineHeight: 16,
    opacity: 0.9,
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
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  activeText: {
    color: '#059669',
  },
  inactiveText: {
    color: '#6B7280',
  },
  configInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
