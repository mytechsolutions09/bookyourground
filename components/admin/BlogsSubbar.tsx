import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { FileText, Globe, Plus } from 'lucide-react-native';

export default function BlogsSubbar({ children, activeTab }: { children: React.ReactNode; activeTab: 'posts' | 'sitemap' }) {
  const isWeb = Platform.OS === 'web';

  const menu = (
    <>
      {isWeb && (
        <Pressable
          onPress={() => router.push('/(admin)/blogs/new')}
          style={styles.newBlogBtn}
          // @ts-ignore
          title="Create New Blog"
        >
          <Plus size={16} color="#FFFFFF" />
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push('/(admin)/blogs' as any)}
        style={[
          styles.subbarItem,
          activeTab === 'posts' && styles.subbarItemActive,
          !isWeb && styles.mobileTab,
          !isWeb && activeTab === 'posts' && styles.mobileTabActive
        ]}
        // @ts-ignore
        title="Blog Posts"
      >
        <FileText size={isWeb ? 18 : 14} color={activeTab === 'posts' ? '#10B981' : '#6B7280'} />
        {!isWeb && (
          <Text style={[
            styles.subbarItemText,
            activeTab === 'posts' && styles.subbarItemTextActive,
            { fontSize: 13 }
          ]}>
            Blog Posts
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.push('/(admin)/blogs/sitemap' as any)}
        style={[
          styles.subbarItem,
          activeTab === 'sitemap' && styles.subbarItemActive,
          !isWeb && styles.mobileTab,
          !isWeb && activeTab === 'sitemap' && styles.mobileTabActive
        ]}
        // @ts-ignore
        title="Sitemap Manager"
      >
        <Globe size={isWeb ? 18 : 14} color={activeTab === 'sitemap' ? '#10B981' : '#6B7280'} />
        {!isWeb && (
          <Text style={[
            styles.subbarItemText,
            activeTab === 'sitemap' && styles.subbarItemTextActive,
            { fontSize: 13 }
          ]}>
            Sitemap Manager
          </Text>
        )}
      </Pressable>
    </>
  );

  if (isWeb) {
    return (
      <View style={styles.shell}>
        <View style={styles.subbar}>
          {menu}
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.mobileShell}>
      <View style={styles.mobileSubbar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mobileSubbarScroll}
        >
          {menu}
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    minHeight: '100%',
  },
  subbar: {
    width: 48,
    backgroundColor: '#FCFDFD',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingVertical: 24,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 16,
  },
  newBlogBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
        transition: 'transform 0.2s ease, background-color 0.2s ease',
      } as any,
    }),
  },
  subbarItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      } as any,
    }),
  },
  subbarItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  subbarItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  subbarItemTextActive: {
    color: '#10B981',
  },
  content: {
    flex: 1,
    paddingLeft: 20,
    minWidth: 0,
  },
  
  // Mobile styles
  mobileShell: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  mobileSubbar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  mobileSubbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  mobileTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 'auto',
  },
  mobileTabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: '#10B981',
  },
});
