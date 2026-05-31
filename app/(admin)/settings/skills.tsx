import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import WebLayout from '@/components/web/WebLayout';
import { Zap } from 'lucide-react-native';

const SKILLS = [
  "ab-testing", "ad-creative", "ads", "ai-seo", "analytics", "aso", "churn-prevention", 
  "co-marketing", "cold-email", "community-marketing", "competitor-profiling", "competitors", 
  "content-strategy", "copy-editing", "copywriting", "cro", "customer-research", 
  "directory-submissions", "emails", "free-tools", "image", "launch", "lead-magnets", 
  "marketing-ideas", "marketing-plan", "marketing-psychology", "onboarding", "paywalls", 
  "popups", "pricing", "product-marketing", "programmatic-seo", "prospecting", "referrals", 
  "revops", "sales-enablement", "schema", "seo-audit", "signup", "site-architecture", "sms", 
  "social", "video"
];

function SkillsContent() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {Platform.OS === 'web' && (
        <View style={styles.header}>
          <Text style={styles.title}>Marketing Skills</Text>
          <Text style={styles.subtitle}>Imported from coreyhaines31/marketingskills</Text>
        </View>
      )}

      <View style={styles.grid}>
        {SKILLS.map(skill => (
          <Pressable 
            key={skill} 
            style={styles.card}
            onPress={() => router.push(`/settings/skills/${skill}` as any)}
          >
            <View style={styles.iconContainer}>
              <Zap size={20} color="#10b981" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>{skill.replace(/-/g, ' ')}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export default function AdminSettingsSkills() {
  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>
          <SkillsContent />
        </SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <SkillsContent />
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
    marginBottom: 24,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: Platform.OS === 'web' ? '30%' : '100%',
    minWidth: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    textTransform: 'capitalize',
  },
});
