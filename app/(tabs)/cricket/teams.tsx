import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Modal } from 'react-native';
import { MapPin, Plus, QrCode, Star } from 'lucide-react-native';

const getSkillColor = (level: string) => {
  switch(level?.toLowerCase()) {
    case 'pro': return '#1E293B';
    case 'competitive': return '#01b854';
    case 'semi-pro': return '#10B981';
    default: return '#94A3B8';
  }
};
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeInUp } from 'react-native-reanimated';

const INITIAL_TEAMS_DATA = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47a',
    name: 'SL Titans',
    location: 'Sushant Lok 3, Gurugram',
    captain: 'Anshul',
    image: 'https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg',
    isUserTeam: true,
    rating: 4.5,
    skillLevel: 'Competitive',
    winRate: '72%'
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47c',
    name: 'AHC Tigers',
    location: 'Delhi',
    captain: 'Anshul',
    image: 'https://images.pexels.com/photos/47701/tiger-animal-predator-wild-47701.jpeg',
    isUserTeam: false,
    rating: 4.2,
    skillLevel: 'Semi-Pro',
    winRate: '68%'
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47d',
    name: 'Crixcus XI',
    location: 'Delhi',
    captain: 'Ashish Sharma',
    initials: 'CX',
    bgColor: '#F1F5F9',
    isUserTeam: false,
    rating: 4.8,
    skillLevel: 'Pro',
    winRate: '85%'
  }
];

export default function CricketTeams({ activeSubTab }: { activeSubTab?: string }) {
  const subTab = activeSubTab || 'your';
  const [fetchedTeams, setFetchedTeams] = useState<any[]>([]);
  const [selectedQRTeam, setSelectedQRTeam] = useState<any>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (!error && data) {
        setFetchedTeams(data.map(t => ({
          id: t.id,
          name: t.name,
          location: t.location,
          captain: t.captain,
          image: t.image_url,
          initials: t.name[0],
          bgColor: '#F1F5F9',
          isUserTeam: true
        })));
      }
    } catch (e) {
      console.error('Error fetching teams:', e);
    }
  };

  const renderTeamCard = (team: any, index: number) => (
    <Animated.View 
      key={team.id}
      entering={FadeInUp.delay(index * 50).springify().damping(15)}
    >
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
                    <MapPin size={12} color="#94A3B8" />
                    <Text style={styles.metaLabel}>{team.location}</Text>
                 </View>
                 <View style={styles.metaItem}>
                    <View style={styles.captainIcon}><Text style={styles.captainIconText}>C</Text></View>
                    <Text style={styles.metaLabel}>{team.captain}</Text>
                 </View>
              </View>
              
              <View style={styles.ratingRow}>
                <View style={styles.starBadge}>
                  <Star size={10} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>{team.rating || 'N/A'}</Text>
                </View>
                <View style={[styles.skillBadge, { backgroundColor: getSkillColor(team.skillLevel) }]}>
                  <Text style={styles.skillText}>{team.skillLevel || 'New'}</Text>
                </View>
                {team.winRate && (
                  <Text style={styles.winRateText}>{team.winRate} Win Rate</Text>
                )}
              </View>
          </View>
          <View style={styles.teamActions}>
             <TouchableOpacity 
                style={styles.teamActionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedQRTeam(team);
                }}
             >
                <QrCode size={18} color="#94A3B8" />
             </TouchableOpacity>
          </View>
       </View>
    </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.teamList}>
         {(() => {
           const allTeams = [...fetchedTeams, ...INITIAL_TEAMS_DATA];
           const uniqueTeams = [];
           const seen = new Set();
           for (const t of allTeams) {
             if (!seen.has(t.id)) {
               uniqueTeams.push(t);
               seen.add(t.id);
             }
           }
           
           return uniqueTeams
             .filter(t => {
               if (subTab === 'your') return t.isUserTeam;
               if (subTab === 'all') return true;
               return false;
             })
             .map((team, index) => renderTeamCard(team, index));
         })()}
      </View>

      {/* Enlarged QR Modal */}
      <Modal
        visible={!!selectedQRTeam}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedQRTeam(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSelectedQRTeam(null)}
        >
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>{selectedQRTeam?.name} Profile</Text>
            <View style={styles.qrModalWrapper}>
               {selectedQRTeam && (
                 <QRCode
                    value={`https://bookyourground.com/teams/${selectedQRTeam.id}`}
                    size={200}
                    color="#043529"
                    backgroundColor="#FFFFFF"
                 />
               )}
            </View>
            <Text style={styles.qrModalHint}>Scan to join the squad</Text>
            <TouchableOpacity 
              style={styles.qrModalCloseBtn}
              onPress={() => setSelectedQRTeam(null)}
            >
              <Text style={styles.qrModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  teamList: {
    paddingHorizontal: 0,
    gap: 12,
    marginTop: 12, // Added padding under subbar
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
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
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  teamImage: {
    width: '100%',
    height: '100%',
  },
  teamInitials: {
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: 'normal',
    color: '#1E293B',
    marginBottom: 6,
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
    fontSize: 11,
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  winRateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  teamActions: {
    flexDirection: 'row',
    gap: 4,
  },
  teamActionBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addTeamPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(216, 247, 157, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#01b854',
    borderStyle: 'dashed',
    marginBottom: 12,
    gap: 16,
  },
  plusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTeamTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#043529',
    marginBottom: 2,
  },
  addTeamDesc: {
    fontSize: 12,
    color: '#01b854',
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  qrModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#043529',
    marginBottom: 24,
  },
  qrModalWrapper: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  qrModalHint: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 32,
  },
  qrModalCloseBtn: {
    backgroundColor: '#043529',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  qrModalCloseText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
