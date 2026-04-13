import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Crown } from 'lucide-react-native';

const TOURNAMENTS_DATA = [
  {
    id: '1',
    title: 'WCL 11 Season',
    image: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg',
    status: 'Ongoing',
    dateRange: 'Jan 22-Apr 30',
    location: 'Gurugram',
    hasCrown: true,
  },
  {
    id: '2',
    title: 'The Weekend bash',
    image: 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg',
    status: 'Ongoing',
    dateRange: 'Apr 06-Apr 27',
    location: 'Gurugram',
    hasCrown: false,
  }
];

export default function CricketTournaments() {
  const [subTab, setSubTab] = useState('all');

  const TournamentCard = ({ tournament }: { tournament: any }) => (
    <View style={styles.tournamentCard}>
       <View style={styles.imageContainer}>
          <Image source={{ uri: tournament.image }} style={styles.tournamentImage} />
          <View style={styles.imageOverlay} />
          {tournament.hasCrown && (
            <View style={styles.crownBadge}>
               <Crown size={12} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          )}
          <View style={styles.ongoingBadge}>
             <Text style={styles.ongoingBadgeText}>{tournament.status}</Text>
          </View>
          <Text style={styles.tournamentTitleOverlay}>{tournament.title}</Text>
       </View>
       <View style={styles.tournamentInfo}>
          <View style={{ flex: 1 }}>
             <Text style={styles.tournamentMeta}>Date: {tournament.dateRange}</Text>
             <Text style={styles.tournamentMeta}>{tournament.location}</Text>
          </View>
          <TouchableOpacity>
             <Text style={styles.followLink}>Follow</Text>
          </TouchableOpacity>
       </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabContainer}>
        {['All', 'Participate', 'Network', 'Nearby'].map((label) => (
          <TouchableOpacity 
            key={label} 
            style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]} 
            onPress={() => setSubTab(label.toLowerCase())}
          >
            <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tournamentList}>
         {TOURNAMENTS_DATA.map(tournament => (
           <TournamentCard key={tournament.id} tournament={tournament} />
         ))}
         
         <View style={styles.adBanner}>
            <Image source={{ uri: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg' }} style={styles.adImage} />
            <View style={styles.adOverlay}>
               <Text style={styles.adTitle}>Don't let good{'\n'}<Text style={styles.adTitleBold}>cricket go unseen</Text></Text>
               <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Stream now</Text></TouchableOpacity>
            </View>
         </View>
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
  tournamentList: {
    gap: 16,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 20,
      }
    })
  },
  imageContainer: {
    height: 140,
    position: 'relative',
  },
  tournamentImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  crownBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ongoingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ongoingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  tournamentTitleOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tournamentInfo: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tournamentMeta: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  followLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  adBanner: {
    height: 120,
    borderRadius: 16,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
    marginTop: 8,
  },
  adImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  adOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  adTitleBold: {
    fontWeight: '900',
  },
  adBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  adBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
});
