import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import {
  MessageSquare,
  Heart,
  Reply,
  Send,
  Trash2,
  User,
  CornerDownRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Comment {
  id: string;
  blog_id: string;
  user_id: string | null;
  author_name: string;
  author_email: string | null;
  author_avatar: string | null;
  content: string;
  parent_id: string | null;
  is_approved: boolean;
  likes_count: number;
  created_at: string;
  replies?: Comment[];
}

interface BlogCommentsProps {
  blogId: string;
  blogAuthor?: string;
}

export default function BlogComments({ blogId, blogAuthor }: BlogCommentsProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load liked state from localStorage (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const storedLikes = localStorage.getItem(`liked_comments_${blogId}`);
        if (storedLikes) {
          setLikedCommentIds(JSON.parse(storedLikes));
        }
      } catch (e) {
        console.error('Error reading comment likes:', e);
      }
    }
  }, [blogId]);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('blog_id', blogId)
        .eq('is_approved', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group into threaded hierarchy (main comments + replies)
      const commentsMap: Record<string, Comment> = {};
      const rootComments: Comment[] = [];

      (data || []).forEach((item: Comment) => {
        commentsMap[item.id] = { ...item, replies: [] };
      });

      (data || []).forEach((item: Comment) => {
        if (item.parent_id && commentsMap[item.parent_id]) {
          commentsMap[item.parent_id].replies?.push(commentsMap[item.id]);
        } else {
          rootComments.push(commentsMap[item.id]);
        }
      });

      setComments(rootComments);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleSubmitComment = async () => {
    if (!content.trim()) {
      showToast('error', 'Please enter a comment.');
      return;
    }

    const authorName = user ? (profile?.full_name || user.email?.split('@')[0] || 'Member') : guestName.trim();
    if (!authorName) {
      showToast('error', 'Please enter your name.');
      return;
    }

    try {
      setSubmitting(true);
      const authorEmail = user ? user.email : (guestEmail.trim() || null);
      const authorAvatar = user ? (profile?.avatar_url || null) : null;

      const newComment = {
        blog_id: blogId,
        user_id: user?.id || null,
        author_name: authorName,
        author_email: authorEmail,
        author_avatar: authorAvatar,
        content: content.trim(),
        parent_id: replyingTo ? replyingTo.id : null,
        is_approved: true,
      };

      const { error } = await supabase.from('blog_comments').insert([newComment]);

      if (error) throw error;

      setContent('');
      setReplyingTo(null);
      showToast('success', 'Comment posted successfully!');
      fetchComments();
    } catch (err: any) {
      console.error('Error posting comment:', err);
      showToast('error', err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (commentId: string, currentLikes: number) => {
    const isLiked = !!likedCommentIds[commentId];
    const newLikesCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    const newLikedState = { ...likedCommentIds, [commentId]: !isLiked };

    setLikedCommentIds(newLikedState);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`liked_comments_${blogId}`, JSON.stringify(newLikedState));
      } catch (e) {}
    }

    // Optimistically update UI
    setComments((prevComments) => {
      const updateRecursive = (list: Comment[]): Comment[] => {
        return list.map((c) => {
          if (c.id === commentId) {
            return { ...c, likes_count: newLikesCount };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateRecursive(c.replies) };
          }
          return c;
        });
      };
      return updateRecursive(prevComments);
    });

    try {
      await supabase
        .from('blog_comments')
        .update({ likes_count: newLikesCount })
        .eq('id', commentId);
    } catch (err) {
      console.error('Error updating comment like:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this comment?')
      : true;

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('blog_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      showToast('success', 'Comment deleted.');
      fetchComments();
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      showToast('error', err.message || 'Could not delete comment.');
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const countTotalComments = (list: Comment[]): number => {
    let count = list.length;
    list.forEach((item) => {
      if (item.replies && item.replies.length > 0) {
        count += countTotalComments(item.replies);
      }
    });
    return count;
  };

  const totalCount = countTotalComments(comments);

  const renderCommentItem = (comment: Comment, isReply = false) => {
    const isLiked = !!likedCommentIds[comment.id];
    const canDelete = user && (user.id === comment.user_id || profile?.is_admin || profile?.role === 'admin');
    const isBlogAuthor = blogAuthor && comment.author_name.toLowerCase() === blogAuthor.toLowerCase();

    return (
      <View key={comment.id} style={[styles.commentCard, isReply && styles.replyCard]}>
        <View style={styles.commentHeader}>
          <View style={styles.authorGroup}>
            {comment.author_avatar ? (
              <Image source={{ uri: comment.author_avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {comment.author_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.authorMeta}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.authorName}>{comment.author_name}</Text>
                {isBlogAuthor && (
                  <View style={styles.authorBadge}>
                    <Sparkles size={10} color="#0D9488" />
                    <Text style={styles.authorBadgeText}>Author</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentTime}>{formatRelativeTime(comment.created_at)}</Text>
            </View>
          </View>

          {canDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteComment(comment.id)}
              // @ts-ignore
              title="Delete comment"
            >
              <Trash2 size={15} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.commentContent}>{comment.content}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity
            style={[styles.actionBtn, isLiked && styles.actionBtnActive]}
            onPress={() => handleToggleLike(comment.id, comment.likes_count)}
          >
            <Heart
              size={15}
              color={isLiked ? '#EF4444' : '#6B7280'}
              fill={isLiked ? '#EF4444' : 'transparent'}
            />
            <Text style={[styles.actionBtnText, isLiked && { color: '#EF4444', fontWeight: '700' }]}>
              {comment.likes_count > 0 ? comment.likes_count : 'Like'}
            </Text>
          </TouchableOpacity>

          {!isReply && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setReplyingTo(comment)}
            >
              <Reply size={15} color="#6B7280" />
              <Text style={styles.actionBtnText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesList}>
            {comment.replies.map((reply) => renderCommentItem(reply, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MessageSquare size={22} color="#0D9488" />
          <Text style={styles.title}>Comments</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalCount}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Join the conversation and share your thoughts</Text>
      </View>

      {/* Toast Notification */}
      {notification && (
        <View
          style={[
            styles.notificationToast,
            notification.type === 'error' ? styles.toastError : styles.toastSuccess,
          ]}
        >
          {notification.type === 'error' ? (
            <AlertCircle size={16} color="#DC2626" />
          ) : (
            <CheckCircle2 size={16} color="#059669" />
          )}
          <Text
            style={[
              styles.toastText,
              { color: notification.type === 'error' ? '#DC2626' : '#059669' },
            ]}
          >
            {notification.message}
          </Text>
        </View>
      )}

      {/* Comment Editor Box */}
      <View style={styles.editorBox}>
        {replyingTo && (
          <View style={styles.replyingHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CornerDownRight size={14} color="#0D9488" />
              <Text style={styles.replyingText}>
                Replying to <Text style={{ fontWeight: '700', color: '#111827' }}>{replyingTo.author_name}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Text style={styles.cancelReplyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {!user && (
          <View style={styles.guestFields}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInputShort}
                placeholder="Your Name"
                placeholderTextColor="#9CA3AF"
                value={guestName}
                onChangeText={setGuestName}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Email (optional)</Text>
              <TextInput
                style={styles.textInputShort}
                placeholder="name@example.com"
                placeholderTextColor="#9CA3AF"
                value={guestEmail}
                onChangeText={setGuestEmail}
                keyboardType="email-address"
              />
            </View>
          </View>
        )}

        <View style={styles.textareaContainer}>
          <TextInput
            style={styles.textarea}
            placeholder={
              replyingTo
                ? `Write a reply to ${replyingTo.author_name}...`
                : 'Share your perspective on this article...'
            }
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={content}
            onChangeText={setContent}
          />
        </View>

        <View style={styles.editorFooter}>
          {user ? (
            <View style={styles.loggedInUserRow}>
              <View style={styles.miniAvatar}>
                <User size={14} color="#0D9488" />
              </View>
              <Text style={styles.loggedInText}>
                Posting as <Text style={{ fontWeight: '700' }}>{profile?.full_name || user.email}</Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.guestNotice}>Comments are moderated to maintain quality discussions.</Text>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmitComment}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>{replyingTo ? 'Post Reply' : 'Post Comment'}</Text>
                <Send size={15} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Listing */}
      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 32 }} />
      ) : comments.length === 0 ? (
        <View style={styles.emptyBox}>
          <MessageSquare size={36} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Be the first to comment</Text>
          <Text style={styles.emptySubtitle}>
            What did you think of this article? Start the conversation above!
          </Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => renderCommentItem(comment))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 40,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  header: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    fontFamily: 'Inter',
  },
  badge: {
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  // Notification Toast
  notificationToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  toastSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  toastError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Editor Box
  editorBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      } as any,
    }),
  },
  replyingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  replyingText: {
    fontSize: 13,
    color: '#0F766E',
  },
  cancelReplyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  guestFields: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  textInputShort: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    outlineStyle: 'none' as any,
  },
  textareaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  textarea: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    minHeight: 80,
    outlineStyle: 'none' as any,
    textAlignVertical: 'top',
  },
  editorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  loggedInUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loggedInText: {
    fontSize: 13,
    color: '#4B5563',
  },
  guestNotice: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      } as any,
    }),
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Comments Listing
  emptyBox: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  commentsList: {
    gap: 16,
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 18,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      } as any,
    }),
  },
  replyCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    marginTop: 12,
    marginLeft: Platform.OS === 'web' ? 24 : 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  authorMeta: {
    gap: 2,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  authorBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  commentTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  deleteBtn: {
    padding: 6,
  },
  commentContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 23,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  actionBtnActive: {
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  repliesList: {
    marginTop: 8,
  },
});
