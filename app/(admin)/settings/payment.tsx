import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { CreditCard, CheckCircle, XCircle, Settings2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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
      Alert.alert('Error', 'Failed to load payment gateways');
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
      Alert.alert('Error', 'Failed to update gateway status');
    }
  };

  const inner = (
    <SettingsSubbar>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Payment Gateways</Text>
          <Text style={styles.subtitle}>Enable or disable platform payment methods</Text>
        </View>

        <View style={styles.gatewayList}>
          {gateways.map((gateway) => (
            <Card key={gateway.id} style={styles.gatewayCard}>
              <View style={styles.gatewayHeader}>
                <View style={[styles.iconBox, gateway.is_active ? styles.iconBoxActive : null]}>
                  <CreditCard size={20} color={gateway.is_active ? '#10b981' : '#6B7280'} />
                </View>
                <View style={styles.gatewayInfo}>
                  <Text style={styles.gatewayLabel}>{gateway.label}</Text>
                  <Text style={styles.gatewayName}>{gateway.name.toUpperCase()}</Text>
                </View>
                <Switch
                  value={gateway.is_active}
                  onValueChange={() => toggleGateway(gateway.name, gateway.is_active)}
                  trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
                  thumbColor={gateway.is_active ? '#10b981' : '#9CA3AF'}
                />
              </View>

              <View style={styles.gatewayFooter}>
                <View style={styles.statusBadge}>
                  {gateway.is_active ? (
                    <>
                      <CheckCircle size={14} color="#10b981" />
                      <Text style={[styles.statusText, styles.statusActive]}>Active</Text>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} color="#EF4444" />
                      <Text style={[styles.statusText, styles.statusInactive]}>Inactive</Text>
                    </>
                  )}
                </View>
                
                {gateway.name !== 'cash' && (
                  <View style={styles.configBtn}>
                    <Settings2 size={14} color="#6B7280" />
                    <Text style={styles.configBtnText}>Managed via Secrets</Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Note on Secrets</Text>
          <Text style={styles.infoText}>
            For security reasons, API Keys and Secrets (like Razorpay Key ID or PayU Salt) must be set via Supabase Dashboard Secrets for the Edge Function.
            The toggles above control platform visibility for users.
          </Text>
        </View>
      </ScrollView>
    </SettingsSubbar>
  );

  return Platform.OS === 'web' ? (
    <WebLayout noCard>{inner}</WebLayout>
  ) : inner;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  pageContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  gatewayList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  gatewayCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  gatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: '#ECFDF5',
  },
  gatewayInfo: {
    flex: 1,
  },
  gatewayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  gatewayName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  gatewayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusActive: {
    color: '#10b981',
  },
  statusInactive: {
    color: '#EF4444',
  },
  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  configBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  infoBox: {
    marginTop: 32,
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
    opacity: 0.8,
  },
});
