import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { FileText, Globe, Plus } from 'lucide-react-native';

export default function BlogsSubbar({ children, activeTab }: { children: React.ReactNode; activeTab: 'posts' | 'sitemap' }) {
  const isPosts = activeTab === 'posts';
  const isSitemap = activeTab === 'sitemap';

  return (
    <View style={styles.shell}>
      <View style={styles.headerBar}>
        <View style={styles.leftSection}>
          <View style={styles.iconBox}>
            <FileText size={18} color="#10b981" />
          </View>
          <View style={styles.titleGroup}>
            <Text style={styles.titleText}>Blogs</Text>
            <Text style={styles.subtitleText}>Management</Text>
          </View>
        </View>

        <View style={styles.navSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navScrollContent}
          >
            <Pressable
              onPress={() => router.push('/(admin)/blogs' as any)}
              style={[styles.navBtn, isPosts && styles.navBtnActive]}
            >
              <FileText size={16} color={isPosts ? '#10b981' : '#6B7280'} style={{ marginRight: 6 }} />
              <Text style={[styles.navBtnLabel, isPosts && styles.navBtnLabelActive]}>
                BLOG POSTS
              </Text>
              {isPosts && <View style={styles.activeIndicator} />}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(admin)/blogs/sitemap' as any)}
              style={[styles.navBtn, isSitemap && styles.navBtnActive]}
            >
              <Globe size={16} color={isSitemap ? '#10b981' : '#6B7280'} style={{ marginRight: 6 }} />
              <Text style={[styles.navBtnLabel, isSitemap && styles.navBtnLabelActive]}>
                SITEMAP MANAGER
              </Text>
              {isSitemap && <View style={styles.activeIndicator} />}
            </Pressable>
          </ScrollView>
        </View>

        {Platform.OS === 'web' && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/(admin)/blogs/new')}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addButtonText}>CREATE BLOG</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 24,
    height: 56,
    ...Platform.select({
      web: { position: 'sticky' as any, top: 0, zIndex: 100 },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 24,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitleText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: -1,
    fontFamily: 'Inter',
  },
  navSection: {
    flex: 1,
    height: '100%',
  },
  navScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  navBtn: {
    height: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexDirection: 'row',
  },
  navBtnActive: {
    backgroundColor: '#F9FAFB',
  },
  navBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  navBtnLabelActive: {
    color: '#10b981', 
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ea6b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#05291f',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  content: {
    flex: 1,
  },
});
