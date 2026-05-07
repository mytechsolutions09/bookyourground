import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { Bell, Database, Shield } from 'lucide-react-native';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';

export default function AdminSettingsIndex() {
  const content = (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {Platform.OS === 'web' && (
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Platform preferences for super admins</Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.row}>
          <Bell size={18} color="#6B7280" />
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardText}>
              Email and in-app alerts (configure in a future update)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Database size={18} color="#6B7280" />
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Data and integrations</Text>
            <Text style={styles.cardText}>Supabase project, backups, and webhooks</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Shield size={18} color="#6B7280" />
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>Access and roles</Text>
            <Text style={styles.cardText}>
              Use Manage Users to change roles and review access
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.hint}>
        Use the subbar for Locations and Ground types used in booking filters.
      </Text>
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
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        {content}
      </View>
    </SettingsSubbar>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pageContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
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
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  textContainer: {
    flex: 1,
    marginTop: -1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  cardText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
});
