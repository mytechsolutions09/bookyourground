import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Alert, TextInput, FlatList, ActivityIndicator } from 'react-native';
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

export default function PlatformFeesSettings() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');

      if (error) throw error;
      
      const loadedSettings = data || [];
      setSettings(loadedSettings);
      
      const values: Record<string, string> = {};
      loadedSettings.forEach(s => {
        values[s.key] = String(s.value);
      });
      setLocalValues(values);
    } catch (error) {
      console.error('Error loading settings:', error);
      if (Platform.OS === 'web') alert('Failed to load platform settings');
      else Alert.alert('Error', 'Failed to load platform settings');
    } finally {
      setLoading(false);
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
