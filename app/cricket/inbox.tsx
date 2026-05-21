import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InboxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChats();
      
      const channelName = `inbox_direct_chats_${Math.random().toString(36).substring(7)}`;
      const subscription = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_chats' }, () => {
          fetchChats();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchChats();
      }
    }, [user])
  );

  const fetchChats = async () => {
    if (!user) return;
    
    // We fetch chats where user is participant 1 or 2
    const { data, error } = await supabase
      .from('direct_chats')
      .select(`
        id,
        updated_at,
        participant_1,
        participant_2,
        participant_1_profile:profiles!direct_chats_participant_1_fkey(id, full_name, role),
        participant_2_profile:profiles!direct_chats_participant_2_fkey(id, full_name, role)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (data && !error && data.length > 0) {
      const chatIds = data.map((c: any) => c.id);
      
      const lastMessagesPromises = chatIds.map((chatId: string) => 
        supabase
          .from('direct_messages')
          .select('content, sender_id, is_read, created_at')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      );
      
      const unreadPromises = supabase
        .from('direct_messages')
        .select('chat_id')
        .in('chat_id', chatIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);
        
      const [lastMessagesResults, unreadRes] = await Promise.all([
        Promise.all(lastMessagesPromises),
        unreadPromises
      ]);
      
      const unreadMap: Record<string, number> = {};
      unreadRes.data?.forEach((msg: any) => {
        unreadMap[msg.chat_id] = (unreadMap[msg.chat_id] || 0) + 1;
      });
      
      const enhancedChats = data.map((chat: any, index: number) => {
        return {
          ...chat,
          lastMessage: lastMessagesResults[index].data,
          unreadCount: unreadMap[chat.id] || 0
        };
      });
      
      setChats(enhancedChats);
    } else if (data && data.length === 0) {
      setChats([]);
    }
    setLoading(false);
  };

  const getOtherParticipant = (chat: any) => {
    if (chat.participant_1 === user?.id) {
      return chat.participant_2_profile;
    }
    return chat.participant_1_profile;
  };

  const renderItem = ({ item }: { item: any }) => {
    const otherParticipant = getOtherParticipant(item);
    const name = otherParticipant?.full_name || 'Unknown User';
    const initials = name[0] || 'U';

    const lastMessage = item.lastMessage;
    const isMyLastMessage = lastMessage?.sender_id === user?.id;

    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {isMyLastMessage && (
              <Text style={{ fontSize: 11, color: lastMessage.is_read ? '#00ea6b' : '#94A3B8' }}>
                {lastMessage.is_read ? '✓✓' : '✓'}
              </Text>
            )}
            <Text style={styles.chatPreview} numberOfLines={1}>
              {lastMessage ? lastMessage.content : 'Tap to view messages'}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={styles.timeText}>
            {new Date(item.updated_at).toLocaleDateString()}
          </Text>
          {item.unreadCount > 0 && (
            <View style={{ backgroundColor: '#00ea6b', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' }}>
              <Text style={{ color: '#06392e', fontSize: 10, fontWeight: '700' }}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.push('/cricket')} 
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbox</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00ea6b" />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.center}>
          <MessageCircle size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>When you start a chat from the notice board, it will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06392e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#00ea6b',
    fontSize: 18,
    fontWeight: '700',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 13,
    color: '#64748B',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
