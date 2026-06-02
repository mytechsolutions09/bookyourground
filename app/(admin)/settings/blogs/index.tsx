import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Plus, Edit3, Trash2, Globe, Lock } from 'lucide-react-native';

import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';

interface Blog {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  created_at: string;
}

export default function AdminBlogsList() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blogs')
        .select('id, title, slug, is_published, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to delete this blog?')) return;
    } else {
      Alert.alert('Confirm Delete', 'Are you sure you want to delete this blog?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(id) }
      ]);
      return;
    }
    await performDelete(id);
  };

  const performDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('blogs').delete().eq('id', id);
      if (error) throw error;
      setBlogs(blogs.filter(b => b.id !== id));
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    }
  };

  const content = (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Blog Management' }} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Blogs</Text>
          <Text style={styles.subtitle}>Manage your platform's blog posts</Text>
        </View>
        <Pressable 
          style={styles.createBtn}
          onPress={() => router.push('/(admin)/settings/blogs/new')}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Blog</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
        ) : blogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No blogs found</Text>
            <Text style={styles.emptyText}>Create your first blog post to get started.</Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Title</Text>
              <Text style={[styles.th, { flex: 1 }]}>Status</Text>
              <Text style={[styles.th, { flex: 1 }]}>Date</Text>
              <Text style={[styles.th, { width: 100, textAlign: 'right' }]}>Actions</Text>
            </View>

            {blogs.map(blog => (
              <View key={blog.id} style={styles.tableRow}>
                <View style={[styles.td, { flex: 2 }]}>
                  <Text style={styles.blogTitle}>{blog.title}</Text>
                  <Text style={styles.blogSlug}>/{blog.slug}</Text>
                </View>
                <View style={[styles.td, { flex: 1 }]}>
                  <View style={[styles.statusBadge, blog.is_published ? styles.statusPublished : styles.statusDraft]}>
                    {blog.is_published ? <Globe size={12} color="#059669" /> : <Lock size={12} color="#D97706" />}
                    <Text style={[styles.statusText, blog.is_published ? { color: '#059669' } : { color: '#D97706' }]}>
                      {blog.is_published ? 'Published' : 'Draft'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.td, { flex: 1 }]}>
                  <Text style={styles.dateText}>
                    {new Date(blog.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.td, { width: 100, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }]}>
                  <Pressable onPress={() => router.push(`/(admin)/settings/blogs/${blog.id}`)}>
                    <Edit3 size={18} color="#3B82F6" />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(blog.id)}>
                    <Trash2 size={18} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 4,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12.5,
  },
  listContainer: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  th: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  td: {
    justifyContent: 'center',
  },
  blogTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  blogSlug: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusPublished: {
    backgroundColor: '#D1FAE5',
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12.5,
    color: '#4B5563',
  },
});
