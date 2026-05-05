import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Users2, Search, UserPlus, UserCheck, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function CricketConnections() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchConnections();
    }
  }, [user?.id, activeTab]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      if (activeTab === 'followers') {
        const { data: followers, error } = await supabase
          .from('profiles_follows')
          .select('follower_id, profile:profiles!follower_id(*)')
          .eq('following_id', user?.id);
        
        if (error) throw error;
        setData(followers?.map(f => f.profile) || []);
      } else {
        const { data: following, error } = await supabase
          .from('profiles_follows')
          .select('following_id, profile:profiles!following_id(*)')
          .eq('follower_id', user?.id);
        
        if (error) throw error;
        setData(following?.map(f => f.profile) || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.connectionItem}
      onPress={() => router.push(`/players/${item.id}` as any)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Users2 size={20} color="#94A3B8" />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.role}>{item.role || 'Cricket Player'}</Text>
      </View>
      <ChevronRight size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>Following</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#01b854" />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users2 size={48} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'followers' ? 'Build your profile to attract followers.' : 'Discover players and follow them.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#01b854',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'Inter',
  },
  role: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    fontFamily: 'Inter',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Inter',
    paddingHorizontal: 40,
  },
});
