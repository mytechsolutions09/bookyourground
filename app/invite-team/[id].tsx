import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  MapPin, 
  ChevronLeft, 
  CheckCircle2, 
  Swords,
  Trophy,
  ShieldCheck
} from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';

export default function TeamInvitePage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetchTeamDetails();
  }, [id]);

  const fetchTeamDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTeam(data);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    setJoining(true);
    // Simulate join - in real app, we would add to team_members or send request
    setTimeout(() => {
      setJoining(false);
      setJoined(true);
    }, 1500);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Team not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {team.image_url ? (
              <Image source={{ uri: team.image_url }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.avatarText}>
                  {team.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.teamName}>{team.name}</Text>
          <View style={styles.metaRow}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.metaText}>{team.location}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Swords size={20} color="#0D9488" />
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statBox}>
            <Trophy size={20} color="#0D9488" />
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>Wining Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Users size={20} color="#0D9488" />
            <Text style={styles.statValue}>--</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Captain</Text>
          <View style={styles.captainCard}>
            <View style={styles.captainAvatar}>
              <Text style={styles.captainInitial}>{team.captain[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.captainName}>{team.captain}</Text>
              <Text style={styles.captainRole}>Team Administrator</Text>
            </View>
            <ShieldCheck size={20} color="#0D9488" style={{ marginLeft: 'auto' }} />
          </View>
        </View>

        {!joined ? (
          <TouchableOpacity 
            style={[styles.joinBtn, joining && { opacity: 0.8 }]} 
            onPress={handleJoinTeam}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.joinBtnText}>Join this Squad</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.successContainer}>
            <CheckCircle2 size={40} color="#0D9488" />
            <Text style={styles.successTitle}>Request Sent!</Text>
            <Text style={styles.successMsg}>The captain has been notified. You'll be added once they approve your request.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout noCard>{content}</WebLayout>;
  }

  return <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
    shadowColor: '#0D9488',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  teamName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 15,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
  },
  statBox: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  captainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  captainAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captainInitial: {
    color: '#0D9488',
    fontSize: 18,
    fontWeight: '700',
  },
  captainName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  captainRole: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  joinBtn: {
    backgroundColor: '#0D9488',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  successMsg: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  }
});
