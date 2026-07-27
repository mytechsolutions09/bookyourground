import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
  Clipboard,
} from 'react-native';
import {
  Video,
  Copy,
  Check,
  Smartphone,
  Camera,
  ExternalLink,
  X,
  Radio,
  Sparkles,
  Link,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { YOUTUBE_RTMP_URL } from '@/lib/youtube';

interface YouTubeLiveModalProps {
  visible: boolean;
  onClose: () => void;
  matchId: string;
  matchTitle?: string;
  onStreamStarted?: (videoId: string) => void;
}

export default function YouTubeLiveModal({
  visible,
  onClose,
  matchId,
  matchTitle = 'Cricket Match',
  onStreamStarted,
}: YouTubeLiveModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'direct'>('create');
  const [deviceTab, setDeviceTab] = useState<'phone' | 'camera'>('phone');
  const [loading, setLoading] = useState(false);
  const [directUrl, setDirectUrl] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRtmp, setCopiedRtmp] = useState(false);

  // Result state after stream creation
  const [streamResult, setStreamResult] = useState<{
    videoId: string;
    streamKey: string;
    rtmpUrl: string;
    watchUrl: string;
  } | null>(null);

  const handleCopy = (text: string, type: 'key' | 'rtmp') => {
    Clipboard.setString(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedRtmp(true);
      setTimeout(() => setCopiedRtmp(false), 2000);
    }
  };

  const handleCreateBroadcast = async () => {
    setLoading(true);
    try {
      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData?.session?.provider_token;

      // If provider_token isn't in current session, check profile table or initiate Google OAuth
      if (!accessToken) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('youtube_access_token')
          .eq('id', sessionData?.session?.user.id)
          .single();

        accessToken = profile?.youtube_access_token;
      }

      if (!accessToken) {
        // Fallback: Trigger Google OAuth with YouTube scope
        const { error: authErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/youtube',
            redirectTo: Platform.OS === 'web' ? window.location.origin : undefined,
          },
        });

        if (authErr) {
          throw new Error('Google Sign-In failed: ' + authErr.message);
        }
        setLoading(false);
        return;
      }

      // Call API route
      const res = await fetch('/api/youtube-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          accessToken,
          matchTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to create YouTube broadcast');
      }

      setStreamResult({
        videoId: data.videoId,
        streamKey: data.streamKey || 'yt-live-stream-key',
        rtmpUrl: data.rtmpUrl || YOUTUBE_RTMP_URL,
        watchUrl: data.watchUrl,
      });

      if (onStreamStarted) onStreamStarted(data.videoId);
    } catch (err: any) {
      const msg = err.message || 'Something went wrong';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDirectUrl = async () => {
    if (!directUrl.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/youtube-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          directUrl: directUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Invalid YouTube URL');
      }

      if (onStreamStarted) onStreamStarted(data.videoId);
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to link URL';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.ytIconBadge}>
                <Video size={18} color="#FF0000" />
              </View>
              <Text style={styles.headerTitle}>YouTube Live Setup</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* If stream is created, show credentials modal */}
          {streamResult ? (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.successBanner}>
                <Sparkles size={18} color="#00E676" />
                <Text style={styles.successText}>YouTube Live Stream Created!</Text>
              </View>

              {/* Device Selector Tabs */}
              <View style={styles.tabTrack}>
                <TouchableOpacity
                  style={[styles.tabItem, deviceTab === 'phone' && styles.tabItemActive]}
                  onPress={() => setDeviceTab('phone')}
                >
                  <Smartphone size={15} color={deviceTab === 'phone' ? '#031713' : '#94A3B8'} />
                  <Text
                    style={[
                      styles.tabItemText,
                      deviceTab === 'phone' && styles.tabItemTextActive,
                    ]}
                  >
                    Phone Camera
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, deviceTab === 'camera' && styles.tabItemActive]}
                  onPress={() => setDeviceTab('camera')}
                >
                  <Camera size={15} color={deviceTab === 'camera' ? '#031713' : '#94A3B8'} />
                  <Text
                    style={[
                      styles.tabItemText,
                      deviceTab === 'camera' && styles.tabItemTextActive,
                    ]}
                  >
                    IP Camera / OBS
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Stream Credentials */}
              <View style={styles.credentialBox}>
                <Text style={styles.credLabel}>STREAM KEY</Text>
                <View style={styles.credRow}>
                  <Text style={styles.credValue} numberOfLines={1}>
                    {streamResult.streamKey}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => handleCopy(streamResult.streamKey, 'key')}
                  >
                    {copiedKey ? (
                      <Check size={14} color="#00E676" />
                    ) : (
                      <Copy size={14} color="#FFFFFF" />
                    )}
                    <Text style={styles.copyBtnText}>{copiedKey ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>

                {deviceTab === 'camera' && (
                  <>
                    <Text style={[styles.credLabel, { marginTop: 12 }]}>RTMP SERVER URL</Text>
                    <View style={styles.credRow}>
                      <Text style={styles.credValue} numberOfLines={1}>
                        {streamResult.rtmpUrl}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => handleCopy(streamResult.rtmpUrl, 'rtmp')}
                      >
                        {copiedRtmp ? (
                          <Check size={14} color="#00E676" />
                        ) : (
                          <Copy size={14} color="#FFFFFF" />
                        )}
                        <Text style={styles.copyBtnText}>{copiedRtmp ? 'Copied' : 'Copy'}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              {/* Setup Instructions */}
              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsTitle}>
                  {deviceTab === 'phone'
                    ? '📱 Setup Instructions (Phone):'
                    : '📷 Setup Instructions (IP Camera):'}
                </Text>
                {deviceTab === 'phone' ? (
                  <View style={styles.stepsList}>
                    <Text style={styles.stepText}>1. Open the YouTube Studio app on your phone</Text>
                    <Text style={styles.stepText}>2. Tap '+' create button → Go Live</Text>
                    <Text style={styles.stepText}>3. Select 'Stream Key' option & paste key above</Text>
                    <Text style={styles.stepText}>4. Tap 'Go Live' to start streaming!</Text>
                  </View>
                ) : (
                  <View style={styles.stepsList}>
                    <Text style={styles.stepText}>1. Open your IP Camera / OBS settings</Text>
                    <Text style={styles.stepText}>2. Navigate to Streaming / RTMP settings</Text>
                    <Text style={styles.stepText}>3. Set Server to the RTMP URL above</Text>
                    <Text style={styles.stepText}>4. Set Stream Key to the key above and start</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.finishBtn} onPress={onClose}>
                <Text style={styles.finishBtnText}>Done, Start Match</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* Mode selector: Auto Create vs Paste Link */
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <View style={styles.tabTrack}>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'create' && styles.tabItemActive]}
                  onPress={() => setActiveTab('create')}
                >
                  <Sparkles size={15} color={activeTab === 'create' ? '#031713' : '#94A3B8'} />
                  <Text
                    style={[
                      styles.tabItemText,
                      activeTab === 'create' && styles.tabItemTextActive,
                    ]}
                  >
                    Auto-Create Stream
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'direct' && styles.tabItemActive]}
                  onPress={() => setActiveTab('direct')}
                >
                  <Link size={15} color={activeTab === 'direct' ? '#031713' : '#94A3B8'} />
                  <Text
                    style={[
                      styles.tabItemText,
                      activeTab === 'direct' && styles.tabItemTextActive,
                    ]}
                  >
                    Paste Link
                  </Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'create' ? (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionDesc}>
                    Create a YouTube Live stream event on your connected YouTube channel in 1-click.
                  </Text>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleCreateBroadcast}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#031713" />
                    ) : (
                      <>
                        <Radio size={18} color="#031713" />
                        <Text style={styles.actionBtnText}>Create YouTube Broadcast</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionDesc}>
                    Already streaming? Paste your YouTube Live video URL below:
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="https://www.youtube.com/live/..."
                    placeholderTextColor="#64748B"
                    value={directUrl}
                    onChangeText={setDirectUrl}
                    autoCapitalize="none"
                  />

                  <TouchableOpacity
                    style={[styles.actionBtn, !directUrl.trim() && { opacity: 0.5 }]}
                    onPress={handleSaveDirectUrl}
                    disabled={loading || !directUrl.trim()}
                  >
                    {loading ? (
                      <ActivityIndicator color="#031713" />
                    ) : (
                      <Text style={styles.actionBtnText}>Link YouTube Video</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#062018',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ytIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  tabTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 30,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 26,
  },
  tabItemActive: {
    backgroundColor: '#00E676',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabItemTextActive: {
    color: '#031713',
  },
  sectionContainer: {
    gap: 16,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  input: {
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#00E676',
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#031713',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginBottom: 16,
  },
  successText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00E676',
  },
  credentialBox: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  credLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  credRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  credValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,230,118,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00E676',
  },
  instructionsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepsList: {
    gap: 6,
  },
  stepText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  finishBtn: {
    height: 48,
    backgroundColor: '#00E676',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  finishBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#031713',
  },
});
