import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Alert, TextInput, FlatList, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import { Save, Percent, IndianRupee, Info } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';

interface PlatformSetting {
  key: string;
  value: any;
  description: string;
}

interface CommissionConfig {
  type: 'percent' | 'flat';
  value: string;
  gst: boolean;
}

export default function PlatformFeesSettings() {
  const [settings, setSettings]       = useState<PlatformSetting[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // Commission
  const [comm, setComm]           = useState<CommissionConfig>({ type: 'percent', value: '10', gst: true });
  const [savingComm, setSavingComm] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCommission();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .not('key', 'in', '(contract_commission_type,contract_commission_value,contract_commission_gst)');

      if (error) throw error;
      const loadedSettings = data || [];
      setSettings(loadedSettings);
      const values: Record<string, string> = {};
      loadedSettings.forEach(s => { values[s.key] = String(s.value); });
      setLocalValues(values);
    } catch (error) {
      console.error('Error loading settings:', error);
      if (Platform.OS === 'web') alert('Failed to load platform settings');
      else Alert.alert('Error', 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  };

  const loadCommission = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('key,value')
        .in('key', ['contract_commission_type', 'contract_commission_value', 'contract_commission_gst']);
      if (!data) return;
      const map = Object.fromEntries(data.map(r => [r.key, r.value]));
      setComm({
        type:  (map['contract_commission_type']  === 'flat' ? 'flat' : 'percent'),
        value: String(map['contract_commission_value'] ?? '10'),
        gst:   map['contract_commission_gst'] === true || map['contract_commission_gst'] === 'true',
      });
    } catch (e) { console.error(e); }
  };

  const saveCommission = async () => {
    try {
      setSavingComm(true);
      const rows = [
        { key: 'contract_commission_type',  value: comm.type,                updated_at: new Date().toISOString() },
        { key: 'contract_commission_value', value: Number(comm.value),       updated_at: new Date().toISOString() },
        { key: 'contract_commission_gst',   value: comm.gst,                 updated_at: new Date().toISOString() },
      ];
      for (const r of rows) {
        const { error } = await supabase.from('platform_settings').update(r).eq('key', r.key);
        if (error) throw error;
      }
      if (Platform.OS === 'web') alert('Commission settings saved!');
      else Alert.alert('Saved', 'Commission settings saved!');
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e.message || 'Save failed');
      else Alert.alert('Error', e.message);
    } finally {
      setSavingComm(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updates = Object.entries(localValues).map(([key, value]) => ({
        key,
        value: Number(value),
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ value: update.value, updated_at: update.updated_at })
          .eq('key', update.key);
          
        if (error) throw error;
      }

      if (Platform.OS === 'web') alert('Platform fees updated successfully');
      else Alert.alert('Success', 'Platform fees updated successfully');
      loadSettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      if (Platform.OS === 'web') alert(error.message || 'Failed to update platform fees');
      else Alert.alert('Error', 'Failed to update platform fees');
    } finally {
      setSaving(false);
    }
  };

  const renderListHeader = () => (
    <View>
      {/* ── Partner Commission Card ── */}
      <View style={styles.commCard}>
        <View style={styles.commCardHeader}>
          <View>
            <Text style={styles.commCardTitle}>Partner Commission</Text>
            <Text style={styles.commCardSub}>Default rate shown on the venue owner contract</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveCommBtn, savingComm && { opacity: 0.6 }]}
            onPress={saveCommission}
            disabled={savingComm}
          >
            <Save size={13} color="#fff" />
            <Text style={styles.saveCommText}>{savingComm ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        {/* Type toggle + value input row */}
        <View style={styles.commRow}>
          {/* % / ₹ toggle */}
          <View style={styles.commToggle}>
            <TouchableOpacity
              style={[styles.commToggleBtn, comm.type === 'percent' && styles.commToggleBtnOn]}
              onPress={() => setComm(p => ({ ...p, type: 'percent' }))}
            >
              <Text style={[styles.commToggleTxt, comm.type === 'percent' && styles.commToggleTxtOn]}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.commToggleBtn, comm.type === 'flat' && styles.commToggleBtnOn]}
              onPress={() => setComm(p => ({ ...p, type: 'flat' }))}
            >
              <Text style={[styles.commToggleTxt, comm.type === 'flat' && styles.commToggleTxtOn]}>₹</Text>
            </TouchableOpacity>
          </View>

          {/* value input */}
          <View style={styles.commInputWrap}>
            <Text style={styles.commInputPrefix}>
              {comm.type === 'flat' ? '₹' : ''}
            </Text>
            <TextInput
              style={styles.commInput}
              value={comm.value}
              onChangeText={v => setComm(p => ({ ...p, value: v }))}
              keyboardType="numeric"
              placeholder={comm.type === 'percent' ? 'e.g. 10' : 'e.g. 500'}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.commInputSuffix}>
              {comm.type === 'percent' ? '% per booking' : '/ team'}
            </Text>
          </View>
        </View>

        {/* GST toggle */}
        <View style={styles.commGstRow}>
          <Switch
            value={comm.gst}
            onValueChange={v => setComm(p => ({ ...p, gst: v }))}
            trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }}
            thumbColor={comm.gst ? '#10b981' : '#9CA3AF'}
            style={{ transform: [{ scale: 0.8 }] }}
          />
          <Text style={styles.commGstLabel}>+ GST applicable on top of commission</Text>
        </View>
      </View>

      {/* Divider before existing fees table */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Platform Fees</Text>
            <Text style={styles.subtitle}>Configure global service charges and tax rates.</Text>
          </View>
          <Button
            title={saving ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            disabled={saving || loading}
            loading={saving}
            size="small"
            icon={Save}
          />
        </View>
        
        <View style={styles.infoBanner}>
          <Info size={16} color="#1E40AF" />
          <Text style={styles.infoText}>
            These rates are used by backend functions for all new transactions. Changes do not affect past bookings.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.columnHeader, { flex: 4 }]}>Setting / Description</Text>
      <Text style={[styles.columnHeader, { flex: 2, textAlign: 'right' }]}>Current Value</Text>
      <Text style={[styles.columnHeader, { flex: 2.5, textAlign: 'right' }]}>Edit Value</Text>
    </View>
  );

  const getLabel = (key: string) => {
    switch (key) {
      case 'cricket_owner_fee_fixed': return 'Cricket Owner Fee';
      case 'user_platform_fee_rate': return 'User Platform Fee Rate';
      case 'gst_rate': return 'GST Rate';
      default: return key;
    }
  };

  const getIcon = (key: string) => {
    if (key.includes('fee')) return <IndianRupee size={14} color="#10b981" />;
    if (key.includes('rate')) return <Percent size={14} color="#3B82F6" />;
    return <SettingsSubbar size={14} color="#6B7280" />;
  };

  const inner = (
    <View style={styles.container}>
      <FlatList
        data={settings}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={() => (
          <View>
            {renderListHeader()}
            {settings.length > 0 && renderTableHeader()}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <View style={[styles.cell, { flex: 4 }]}>
              <View style={styles.labelRow}>
                {getIcon(item.key)}
                <Text style={styles.cellTextBold}>{getLabel(item.key)}</Text>
              </View>
              <Text style={styles.cellTextSub}>{item.description || 'Global platform constant'}</Text>
            </View>
            
            <View style={[styles.cell, { flex: 2, alignItems: 'flex-end' }]}>
              <Text style={styles.cellText}>
                {item.key === 'cricket_owner_fee_fixed' ? `₹${item.value}` : `${(item.value * 100).toFixed(0)}%`}
              </Text>
            </View>

            <View style={[styles.cell, { flex: 2.5, alignItems: 'flex-end' }]}>
              <TextInput
                style={styles.tableInput}
                value={localValues[item.key]}
                onChangeText={(text) => setLocalValues(prev => ({ ...prev, [item.key]: text }))}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#10b981" />
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No settings found</Text>
            </View>
          )
        }
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cell: {
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cellText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
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
    lineHeight: 14,
  },
  tableInput: {
    width: 80,
    height: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    backgroundColor: '#F9FAFB',
    textAlign: 'right',
    fontFamily: 'Inter',
    color: '#111827',
  },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14, fontFamily: 'Inter' },

  // Commission card
  commCard: {
    margin: 20,
    marginBottom: 0,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    padding: 16,
  },
  commCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16,
  },
  commCardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', fontFamily: 'Inter' },
  commCardSub:   { fontSize: 12, color: '#6B7280', fontFamily: 'Inter', marginTop: 2 },
  saveCommBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  saveCommText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Inter' },

  commRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  commToggle: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: '#A7F3D0',
    borderRadius: 10, overflow: 'hidden',
  },
  commToggleBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  commToggleBtnOn: { backgroundColor: '#10b981' },
  commToggleTxt: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  commToggleTxtOn: { color: '#fff' },
  commInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#A7F3D0', borderRadius: 10,
    backgroundColor: '#fff', paddingHorizontal: 12,
  },
  commInputPrefix: { fontSize: 14, fontWeight: '600', color: '#374151' },
  commInput: {
    flex: 1, fontSize: 14, color: '#111827', paddingVertical: 8,
    fontFamily: 'Inter',
    // @ts-ignore
    outlineColor: '#10b981',
  },
  commInputSuffix: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter' },
  commGstRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  commGstLabel: { fontSize: 13, color: '#374151', fontFamily: 'Inter' },
});
