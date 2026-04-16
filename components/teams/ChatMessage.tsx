import { View, Text as RNText, StyleSheet, Image, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { Download, FileIcon } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/contexts/AuthContext';
import { TeamMessage } from '@/hooks/useTeamChat';

interface ChatMessageProps {
  message: TeamMessage;
  showSender?: boolean;
}

export default function ChatMessage({ message, showSender = true }: ChatMessageProps) {
  const { user } = useAuth();
  const isOwn = message.sender_id === user?.id;

  const handleDownload = async () => {
    if (!message.content) return;
    
    try {
      if (Platform.OS === 'web') {
        try {
          // On web, try direct download first
          const response = await fetch(message.content);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = message.content.split('/').pop() || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (webErr) {
          // Fallback: Just open the URL in a new tab if catch fails (likely CORS)
          window.open(message.content, '_blank');
        }
        return;
      }

      const fileName = message.content.split('/').pop() || 'media';
      const fileUri = FileSystem.documentDirectory + fileName;
      
      const downloadResult = await FileSystem.downloadAsync(message.content, fileUri);
      
      if (downloadResult.status === 200) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert('Error', 'Failed to download media.');
    }
  };

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {!isOwn && showSender && (
         <View style={styles.avatarWrap}>
            {message.sender?.avatar_url ? (
              <Image source={{ uri: message.sender.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <RNText style={styles.avatarInitials}>
                  {message.sender?.full_name?.charAt(0) || '?'}
                </RNText>
              </View>
            )}
         </View>
      )}
      
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble, message.is_media && styles.mediaBubble]}>
        {!isOwn && showSender && (
          <RNText style={styles.senderName}>{message.sender?.full_name || 'Player'}</RNText>
        )}
        
        {message.is_media ? (
          <View style={styles.mediaContainer}>
            {message.media_type === 'image' ? (
              <Image source={{ uri: message.content }} style={styles.mediaImage} resizeMode="cover" />
            ) : (
              <View style={styles.videoPlaceholder}>
                <FileIcon size={32} color={isOwn ? '#043529' : '#64748B'} />
                <RNText style={[styles.videoText, isOwn ? styles.ownText : styles.otherText]}>Video Shared</RNText>
              </View>
            )}
            
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
              <Download size={16} color="#FFFFFF" strokeWidth={2.5} />
              <RNText style={styles.downloadText}>Download</RNText>
            </TouchableOpacity>
          </View>
        ) : (
          <RNText style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {message.content}
          </RNText>
        )}

        <RNText style={[styles.timestamp, isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
    paddingHorizontal: 12,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatarWrap: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    position: 'relative',
  },
  mediaBubble: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    width: 240,
  },
  mediaContainer: {
    width: '100%',
  },
  mediaImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
    gap: 6,
  },
  downloadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  ownBubble: {
    backgroundColor: '#00ea6b',
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 2,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#01b854',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownText: {
    color: '#043529',
  },
  otherText: {
    color: '#1E293B',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: 'rgba(4, 53, 41, 0.5)',
  },
  otherTimestamp: {
    color: '#94A3B8',
  },
});
