import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MapPin, User, ChevronRight, Share2, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

const INITIAL_TEAMS_DATA = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47a',
    name: 'SL Titans',
    location: 'Sushant Lok 3, Gurugram',
    captain: 'Anshul',
    image: 'https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg',
    isUserTeam: true,
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47c',
    name: 'AHC Tigers',
    location: 'Delhi',
    captain: 'Anshul',
    image: 'https://images.pexels.com/photos/47701/tiger-animal-predator-wild-47701.jpeg',
    isUserTeam: false,
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47d',
    name: 'Crixcus XI',
    location: 'Delhi',
    captain: 'Ashish Sharma',
    initials: 'CX',
    bgColor: '#F87171',
    isUserTeam: false,
  }
];

export default function CricketTeams() {
  const [subTab, setSubTab] = useState('your');
  const [fetchedTeams, setFetchedTeams] = useState<any[]>([]);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase.from('teams').select('*').order('name');
    if (!error && data) {
      setFetchedTeams(data.map(t => ({
        id: t.id,
        name: t.name,
        location: t.location,
        captain: t.captain,
        image: t.image_url,
        initials: t.name[0],
        bgColor: '#3B82F6',
        isUserTeam: true
      })));
    }
  };

  const TeamCard = ({ team }: { team: any }) => (
    <TouchableOpacity 
      style={styles.teamCard}
      onPress={() => router.push(`/teams/${team.id}`)}
    >
       <View style={[styles.teamAvatar, team.bgColor && { backgroundColor: team.bgColor }]}>
          {team.image ? (
            <Image source={{ uri: team.image }} style={styles.teamImage} />
          ) : (
            <Text style={styles.teamInitials}>{team.initials}</Text>
          )}
       </View>
       <View style={styles.teamContent}>
          <View style={{ flex: 1 }}>
             <Text style={styles.teamTitle}>{team.name}</Text>
             <View style={styles.teamMetaRow}>
                <View style={[styles.metaItem, { marginRight: 16 }]}>
                   <MapPin size={12} color="#9CA3AF" />
                   <Text style={styles.metaLabel}>{team.location}</Text>
                </View>
                <View style={styles.metaItem}>
                   <View style={styles.captainIcon}><Text style={styles.captainIconText}>C</Text></View>
                   <Text style={styles.metaLabel}>{team.captain}</Text>
                </View>
             </View>
          </View>
          <View style={styles.teamActions}>
             <TouchableOpacity 
                style={styles.teamActionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  // Handle share
                }}
             >
                <Share2 size={18} color="#64748B" />
             </TouchableOpacity>
             <ChevronRight size={18} color="#64748B" />
          </View>
       </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabContainer}>
        {['Your', 'All', 'Top Teams', 'Networks'].map((label) => (
          <TouchableOpacity 
            key={label} 
            style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]} 
            onPress={() => setSubTab(label.toLowerCase())}
          >
            <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.teamList}>
         {subTab === 'your' && (
           <TouchableOpacity style={styles.addTeamPlaceholder}>
              <View style={styles.plusCircle}><Plus size={24} color="#01b854" /></View>
              <View>
                 <Text style={styles.addTeamTitle}>Add Your Team</Text>
                 <Text style={styles.addTeamDesc}>Create your team to start playing matches</Text>
              </View>
           </TouchableOpacity>
         )}

         {[...fetchedTeams, ...INITIAL_TEAMS_DATA]
           .filter(t => {
             if (subTab === 'your') return t.isUserTeam;
             return true;
           })
           .map(team => (
             <TeamCard key={team.id} team={team} />
           ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subTabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  subTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#01b854',
  },
  teamList: {
    gap: 12,
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: {
        shadowColor: 'rgba(0,0,0,0.03)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 10,
      }
    })
  },
  teamAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  teamImage: {
    width: '100%',
    height: '100%',
  },
  teamInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  teamContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  teamMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  captainIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  captainIconText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
  },
  teamActions: {
    flexDirection: 'row',
    gap: 4,
  },
  teamActionBtn: {
    padding: 8,
  },
  addTeamPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderStyle: 'dashed',
    marginBottom: 8,
    gap: 16,
  },
  plusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTeamTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
  },
  addTeamDesc: {
    fontSize: 12,
    color: '#166534',
    opacity: 0.7,
  },
});
