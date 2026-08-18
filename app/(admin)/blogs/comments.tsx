import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, Trash2, ExternalLink, Search, MessageSquare, Filter, X } from 'lucide-react-native';

import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import BlogsSubbar from '@/components/admin/BlogsSubbar';

interface AdminComment {
  id: string;
  blog_id: string;
  user_id: string | null;
  author_name: string;
  author_email: string | null;
  content: string;
  is_approved: boolean;
  likes_count: number;
  created_at: string;
  blogs?: {
    title: string;
    slug: string;
  };
}

export default function AdminCommentsList() {
  const { blogId } = useLocalSearchParams();
  const activeBlogId = Array.isArray(blogId) ? blogId[0] : blogId;

  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');

  useEffect(() => {
    fetchComments();
  }, [activeBlogId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('blog_comments')
        .select('*, blogs(title, slug)')
        .order('created_at', { ascending: false });

      if (activeBlogId) {
        query = query.eq('blog_id', activeBlogId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (err: any) {
      console.error('Error fetching admin comments:', err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id: string, currentApproved: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_comments')
        .update({ is_approved: !currentApproved })
        .eq('id', id);

      if (error) throw error;

      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_approved: !currentApproved } : c))
      );
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to delete this comment?')) return;
    } else {
      Alert.alert('Confirm Delete', 'Are you sure you want to delete this comment?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(id) },
      ]);
      return;
    }
    await performDelete(id);
  };

  const performDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('blog_comments').delete().eq('id', id);
      if (error) throw error;
      setComments(comments.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    }
  };

  const filteredComments = comments.filter((c) => {
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'approved'
        ? c.is_approved
        : !c.is_approved;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.author_name.toLowerCase().includes(query) ||
      c.content.toLowerCase().includes(query) ||
      (c.blogs?.title && c.blogs.title.toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  const activeBlogTitle = activeBlogId && comments.length > 0 ? comments[0].blogs?.title : null;

  const content = (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Blog Comments Moderation' }} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Blog Comments</Text>
          <Text style={styles.subtitle}>Review, approve, and moderate user comments across all blogs</Text>
        </View>
      </View>

      {activeBlogId && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: '#047857', fontWeight: '600' }}>
            Filtered by post: <Text style={{ fontWeight: '800' }}>{activeBlogTitle || activeBlogId}</Text>
          </Text>
          <Pressable
            onPress={() => router.push('/(admin)/blogs/comments' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
          >
            <X size={14} color="#FFFFFF" />
            <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '700' }}>Show All Comments</Text>
          </Pressable>
        </View>
      )}

      {/* Search & Filter Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by author, comment text or blog title..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterPills}>
          {(['all', 'approved', 'pending'] as const).map((status) => (
            <Pressable
              key={status}
              onPress={() => setFilterStatus(status)}
              style={[
                styles.filterPill,
                filterStatus === status && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterStatus === status && styles.filterPillTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
        ) : filteredComments.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={36} color="#9CA3AF" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No comments found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try clearing your search query.' : 'No blog comments match the selected filter.'}
            </Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Comment & Author</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Blog Post</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>Status</Text>
              <Text style={[styles.th, { flex: 0.8 }]}>Date</Text>
              <Text style={[styles.th, { width: 100, textAlign: 'right' }]}>Actions</Text>
            </View>

            {filteredComments.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <View style={[styles.td, { flex: 2 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={styles.authorName}>{item.author_name}</Text>
                    {item.author_email ? (
                      <Text style={styles.authorEmail}>({item.author_email})</Text>
                    ) : null}
                  </View>
                  <Text style={styles.commentBody} numberOfLines={3}>
                    {item.content}
                  </Text>
                </View>

                <View style={[styles.td, { flex: 1.5 }]}>
                  {item.blogs ? (
                    <Pressable
                      onPress={() => router.push(`/blog/${item.blogs?.slug}` as any)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={styles.blogLinkText} numberOfLines={2}>
                        {item.blogs.title}
                      </Text>
                      <ExternalLink size={12} color="#10b981" />
                    </Pressable>
                  ) : (
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Deleted post</Text>
                  )}
                </View>

                <View style={[styles.td, { flex: 0.8 }]}>
                  <View
                    style={[
                      styles.statusBadge,
                      item.is_approved ? styles.statusApproved : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        item.is_approved ? { color: '#059669' } : { color: '#D97706' },
                      ]}
                    >
                      {item.is_approved ? 'Approved' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.td, { flex: 0.8 }]}>
                  <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <View style={[styles.td, { width: 100, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }]}>
                  <Pressable
                    onPress={() => handleToggleApproval(item.id, item.is_approved)}
                    // @ts-ignore
                    title={item.is_approved ? 'Unapprove comment' : 'Approve comment'}
                  >
                    {item.is_approved ? (
                      <XCircle size={18} color="#D97706" />
                    ) : (
                      <CheckCircle2 size={18} color="#10B981" />
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(item.id)}
                    // @ts-ignore
                    title="Delete comment"
                  >
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
        <BlogsSubbar activeTab="comments">{content}</BlogsSubbar>
      </WebLayout>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <MobileAppNavbar title="BLOG COMMENTS" titleColor="#10b981" />
      <BlogsSubbar activeTab="comments">{content}</BlogsSubbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingVertical: 20,
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

  // Toolbar
  toolbar: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: '#10B981',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  listContainer: {
    flex: 1,
    paddingVertical: 8,
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
    marginBottom: 4,
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  td: {
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  authorEmail: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  commentBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  blogLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#10B981',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
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
