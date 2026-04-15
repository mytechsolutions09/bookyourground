import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Send, UserX, Image as ImageIcon, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTeamChat } from '@/hooks/useTeamChat';
import { useAuth } from '@/contexts/AuthContext';
import ChatMessage from './ChatMessage';

interface TeamChatTabProps {
  teamId: string;
  isMember: boolean;
}

export default function TeamChatTab({ teamId, isMember }: TeamChatTabProps) {
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage, sendMedia } = useTeamChat(teamId);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    try {
      await sendMessage(inputText);
      setInputText('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handlePickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Items,
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mediaType = asset.type === 'video' ? 'video' : 'image';
        
        await sendMedia(
          asset.uri, 
          mediaType, 
          user?.full_name || 'Player', 
          user?.avatar_url
        );
      }
    } catch (err) {
      console.error('Pick media error:', err);
      Alert.alert('Error', 'Failed to pick or upload media.');
    }
  };

  if (!isMember) {
    return (
      <View style={styles.centered}>
        <UserX size={48} color="#94A3B8" />
        <Text style={styles.lockedTitle}>Chat Restricted</Text>
        <Text style={styles.lockedDesc}>Only accepted team members can participate in this group chat.</Text>
      </View>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ea6b" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const nextMessage = messages[index + 1];
          const showSender = !nextMessage || nextMessage.sender_id !== item.sender_id;
          return <ChatMessage message={item} showSender={showSender} />;
        }}
        inverted
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.mediaBtn} 
            onPress={handlePickMedia}
            disabled={sending}
          >
            <Plus size={24} color="#64748B" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 16,
  },
  lockedDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    transform: [{ scaleY: -1 }] // Correct for inverted FlatList
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  inputArea: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  mediaBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10, // For multiline
    maxHeight: 100,
    fontSize: 15,
    color: '#1E293B',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00ea6b',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3AF',
    shadowOpacity: 0,
  },
});
