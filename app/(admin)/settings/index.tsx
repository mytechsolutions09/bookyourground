import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { Bell, Database, Shield } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';

export default function AdminSettingsIndex() {
  const inner = (
    <SettingsSubbar>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Platform preferences for super admins</Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Bell size={20} color="#6B7280" />
            <Text style={styles.cardTitle}>Notifications</Text>
          </View>
          <Text style={styles.cardText}>
            Email and in-app alerts (configure in a future update)
          </Text>
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Database size={20} color="#6B7280" />
            <Text style={styles.cardTitle}>Data and integrations</Text>
          </View>
          <Text style={styles.cardText}>Supabase project, backups, and webhooks</Text>
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            <Shield size={20} color="#6B7280" />
            <Text style={styles.cardTitle}>Access and roles</Text>
          </View>
          <Text style={styles.cardText}>
            Use Manage Users to change roles and review access
          </Text>
        </Card>

        <Text style={styles.hint}>
          Use the subbar for Locations and Ground types used in booking filters.
        </Text>
      </ScrollView>
    </SettingsSubbar>
  );

  if (Platform.OS === 'web') return <WebLayout noCard>{inner}</WebLayout>;
  return inner;
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
  hint: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});
