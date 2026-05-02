import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Alert, TextInput } from 'react-native';
import { CreditCard, Save, Percent, IndianRupee, Info } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import MobileAppNavbar from '@/components/MobileAppNavbar';

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
      Alert.alert('Error', 'Failed to load platform settings');
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

      Alert.alert('Success', 'Platform fees updated successfully');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to update platform fees');
    } finally {
      setSaving(false);
    }
  };

  const inner = (
    <SettingsSubbar>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        {Platform.OS === 'web' && (
          <View style={styles.header}>
            <Text style={styles.title}>Platform Fees</Text>
            <Text style={styles.subtitle}>Configure service charges and tax rates</Text>
          </View>
        )}

        <View style={styles.form}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <IndianRupee size={20} color="#10b981" />
              <Text style={styles.cardTitle}>Cricket Ground Fees (Owner)</Text>
            </View>
            <Text style={styles.description}>
              Fixed fee charged to the ground owner per booking per team.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fee Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={localValues['cricket_owner_fee_fixed']}
                onChangeText={(text) => setLocalValues(prev => ({ ...prev, cricket_owner_fee_fixed: text }))}
                keyboardType="numeric"
                placeholder="100"
              />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Percent size={20} color="#3B82F6" />
              <Text style={styles.cardTitle}>User Platform Fee</Text>
            </View>
            <Text style={styles.description}>
              Percentage fee charged to users on the net booking amount.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fee Rate (Decimal, e.g. 0.05 for 5%)</Text>
              <TextInput
                style={styles.input}
                value={localValues['user_platform_fee_rate']}
                onChangeText={(text) => setLocalValues(prev => ({ ...prev, user_platform_fee_rate: text }))}
                keyboardType="numeric"
                placeholder="0.05"
              />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Info size={20} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Tax Settings</Text>
            </View>
            <Text style={styles.description}>
              GST rate applied to platform fees for both users and owners.
            </Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GST Rate (Decimal, e.g. 0.18 for 18%)</Text>
              <TextInput
                style={styles.input}
                value={localValues['gst_rate']}
                onChangeText={(text) => setLocalValues(prev => ({ ...prev, gst_rate: text }))}
                keyboardType="numeric"
                placeholder="0.18"
              />
            </View>
          </Card>

          <Button
            title={saving ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            style={styles.saveBtn}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Calculation Notice</Text>
          <Text style={styles.infoText}>
            These settings are authoritatively used by the backend Edge Functions for all new transactions. 
            Changes will not affect past bookings.
          </Text>
        </View>
      </ScrollView>
    </SettingsSubbar>
  );

  return Platform.OS === 'web' ? (
    <WebLayout noCard>{inner}</WebLayout>
  ) : (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <MobileAppNavbar title="PLATFORM FEES" titleColor="#10b981" />
      {inner}
    </View>
  );
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
  form: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  saveBtn: {
    marginTop: 12,
    height: 50,
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
