import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMessage {
  id: string;
  team_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_media?: boolean;
  media_type?: 'image' | 'video';
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function useTeamChat(teamId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [activeChannel, setActiveChannel] = useState<any>(null);

  useEffect(() => {
    if (!teamId) return;

    let isSubscribed = true;
    // Use a unique channel instance name to avoid "already subscribed" errors during remounts
    const suffix = Math.random().toString(36).substring(7);
    const channelName = `team_chat:${teamId}:${suffix}`;
    
    loadMessages();

    // Subscribe to new messages (DB + Broadcast)
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
        presence: { key: user?.id || 'anon' },
      },
    });

    setActiveChannel(channel);

    channel
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'team_messages', 
          filter: `team_id=eq.${teamId}` 
        },
        async (payload) => {
          if (!isSubscribed) return;
          // Fetch sender info for the new message
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage: TeamMessage = {
            ...payload.new as TeamMessage,
            sender: sender || undefined
          };

          setMessages((prev) => [newMessage, ...prev]);
        }
      )
      .on('broadcast', { event: 'media_message' }, (payload) => {
        if (!isSubscribed) return;
        // Handle media broadcast (not in DB)
        const mediaMsg: TeamMessage = {
          id: payload.payload.id,
          team_id: teamId,
          sender_id: payload.payload.sender_id,
          content: payload.payload.media_url, 
          created_at: payload.payload.media_url ? payload.payload.created_at : new Date().toISOString(),
          sender: {
             full_name: payload.payload.sender_name,
             avatar_url: payload.payload.sender_avatar
          },
          is_media: true,
          media_type: payload.payload.media_type
        };
        setMessages((prev) => [mediaMsg, ...prev]);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (!isSubscribed) return;
        const { userId, userName, isTyping } = payload.payload;
        if (userId === user?.id) return;

        setTypingUsers((prev) => {
          const next = { ...prev };
          if (isTyping) {
            next[userId] = userName;
          } else {
            delete next[userId];
          }
          return next;
        });
      })
      .on('presence', { event: 'sync' }, () => {
        if (!isSubscribed) return;
        const state = channel.presenceState();
        const users = Object.values(state).flat();
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({
            id: user.id,
            full_name: user.full_name || 'Player',
            avatar_url: user.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_messages')
        .select(`
          *,
          sender:profiles(full_name, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error loading team messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('team_messages')
        .insert([{
          team_id: teamId,
          sender_id: user.id,
          content: content.trim()
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  const sendMedia = async (fileUri: string, mediaType: 'image' | 'video', senderName: string, senderAvatar?: string | null) => {
    if (!user || !fileUri) return;

    try {
      setSending(true);
      
      const fileExt = fileUri.split('.').pop();
      const fileName = `${teamId}/${Date.now()}.${fileExt}`;
      
      // Upload to storage
      // Note: In React Native, we need to handle the blob conversion or use a library
      // For this implementation, we'll assume the helper handles it or the environment is web-compatible
      const formData = new FormData();
      const response = await fetch(fileUri);
      const blob = await response.blob();

      const { data, error: uploadError } = await supabase.storage
        .from('team-chat-media')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-chat-media')
        .getPublicUrl(fileName);

      // Broadcast the media message
      const channel = supabase.channel(`team_chat:${teamId}`);
      await channel.send({
        type: 'broadcast',
        event: 'media_message',
        payload: {
          id: Math.random().toString(36).substr(2, 9),
          sender_id: user.id,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          media_url: publicUrl,
          media_type: mediaType,
          created_at: new Date().toISOString()
        }
      });

    } catch (err) {
      console.error('Error sending media:', err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  const setTyping = (isTyping: boolean) => {
    if (!activeChannel || !user) return;
    activeChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        userName: user.full_name || 'Someone',
        isTyping
      }
    });
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    sendMedia,
    refreshChat: loadMessages,
    onlineUsers,
    typingUsers: Object.values(typingUsers),
    setTyping
  };
}
