import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Volume2, VolumeX, ExternalLink, Play } from 'lucide-react-native';
import { getYouTubeEmbedUrl, getYouTubeWatchUrl } from '@/lib/youtube';

interface YouTubePlayerProps {
  videoId: string;
  height?: number;
  title?: string;
}

export default function YouTubePlayer({ videoId, height = 220, title }: YouTubePlayerProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const embedUrl = getYouTubeEmbedUrl(videoId, isMuted);
  const watchUrl = getYouTubeWatchUrl(videoId);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleOpenYouTube = () => {
    Linking.openURL(watchUrl).catch((err) =>
      console.error('Error opening YouTube link:', err)
    );
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Top Header Overlay / Bar */}
      <View style={styles.topBar}>
        <View style={styles.liveBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.liveBadgeText}>LIVE STREAM</Text>
        </View>
        <TouchableOpacity
          style={styles.openExternalBtn}
          onPress={handleOpenYouTube}
          activeOpacity={0.7}
        >
          <Text style={styles.openExternalText}>Watch on YouTube</Text>
          <ExternalLink size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Video Content */}
      <View style={styles.playerWrapper}>
        {Platform.OS === 'web' ? (
          <iframe
            src={embedUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              borderRadius: 12,
            }}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            title={title || 'YouTube Live Match Stream'}
          />
        ) : (
          <WebView
            source={{ uri: embedUrl }}
            style={{ flex: 1, backgroundColor: '#000' }}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            onLoadEnd={() => setLoading(false)}
          />
        )}
      </View>

      {/* Bottom Controls / Mute Overlay for Native WebViews */}
      {Platform.OS !== 'web' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.muteBtn} onPress={toggleMute}>
            {isMuted ? (
              <>
                <VolumeX size={14} color="#00E676" />
                <Text style={styles.muteBtnText}>Tap for Sound</Text>
              </>
            ) : (
              <>
                <Volume2 size={14} color="#00E676" />
                <Text style={styles.muteBtnText}>Mute</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#031713',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    marginVertical: 12,
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  openExternalText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  playerWrapper: {
    flex: 1,
    backgroundColor: '#000000',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    zIndex: 10,
  },
  muteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(3, 23, 19, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  muteBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
