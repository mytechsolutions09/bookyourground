import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface RealtimeMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export function RealtimeDemo() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // 1. Initialize Channel
    const newChannel = supabase.channel('realtime-demo-room', {
      config: {
        presence: { key: user.id },
      },
    });

    // 2. Listen for Broadcasts
    newChannel.on('broadcast', { event: 'demo-msg' }, (payload) => {
      setMessages((prev) => [
        {
          id: Math.random().toString(36).substr(2, 9),
          user: payload.payload.user,
          text: payload.payload.text,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    });

    // 3. Listen for Presence
    newChannel
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState();
        const users = Object.keys(state).map((key) => state[key][0].email || 'Unknown');
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      });

    // 4. Subscribe and Track
    newChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await newChannel.track({
          email: user.email,
          online_at: new Date().toISOString(),
        });
      }
    });

    setChannel(newChannel);

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [user]);

  const sendMessage = useCallback(async () => {
    if (!channel || !user) return;

    await channel.send({
      type: 'broadcast',
      event: 'demo-msg',
      payload: {
        user: user.email?.split('@')[0] || 'User',
        text: 'Hello from Realtime! 🚀',
      },
    });
    
    // Also add to local state immediately
    setMessages((prev) => [
      {
        id: Math.random().toString(36).substr(2, 9),
        user: 'You',
        text: 'Hello from Realtime! 🚀',
        timestamp: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);
  }, [channel, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Realtime Experience Demo</Text>
      
      {/* Online Users */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Online Now ({onlineUsers.length})</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.onlineList}>
          {onlineUsers.map((email, idx) => (
            <View key={idx} style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{email}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Broadcast Actions */}
      <TouchableOpacity style={styles.button} onPress={sendMessage}>
        <Ionicons name="send" size={20} color="#FFF" />
        <Text style={styles.buttonText}>Send Realtime Broadcast</Text>
      </TouchableOpacity>

      {/* Message List */}
      <View style={styles.messageContainer}>
        <Text style={styles.subtitle}>Recent Events</Text>
        <ScrollView style={styles.scroll}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>No events yet. Click send to start!</Text>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={styles.message}>
                <Text style={styles.messageUser}>{msg.user}</Text>
                <Text style={styles.messageText}>{msg.text}</Text>
                <Text style={styles.messageTime}>{msg.timestamp}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#444',
  },
  onlineList: {
    flexDirection: 'row',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CCE4FF',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34C759',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  messageContainer: {
    height: 200,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  scroll: {
    flex: 1,
  },
  message: {
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 10,
  },
  messageUser: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  messageText: {
    fontSize: 14,
    color: '#555',
    marginVertical: 2,
  },
  messageTime: {
    fontSize: 10,
    color: '#AAA',
  },
  emptyText: {
    textAlign: 'center',
    color: '#AAA',
    marginTop: 40,
    fontStyle: 'italic',
  },
});
