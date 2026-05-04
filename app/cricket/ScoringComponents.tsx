import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
} from 'react-native';
import { 
  X, Users2, Trophy, MapPin, Calendar, ShieldCheck, 
  ChevronRight, Info, AlertCircle, CheckCircle2,
  QrCode, Share2, Plus, Trash2, Camera as CameraIcon, Eye, Users,
  TrendingUp, ChevronLeft, Swords, BarChart3, PlayCircle,
  Search
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, Camera } from 'expo-camera';

export const MatchInfoModal = ({ 
  isVisible, 
  onClose, 
  selectedTeamA, 
  selectedTeamB, 
  matchConfig, 
  styles 
}) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={[styles.qrModalContent, { height: '85%', padding: 0, overflow: 'hidden' }]}>
        <LinearGradient
          colors={['#01b854', '#06392e']}
          style={styles.modalHeaderPremium}
        >
          <View>
            <Text style={styles.modalTitlePremium}>Match Information</Text>
            <Text style={styles.modalSubtitlePremium}>Details & Assignments</Text>
          </View>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeBtnPremium}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
           {/* Teams Card */}
           <View style={styles.infoCardPremium}>
              <View style={styles.infoCardHeader}>
                 <Users2 size={18} color="#01b854" />
                 <Text style={styles.infoCardTitle}>TEAMS</Text>
              </View>
              <View style={styles.matchTeamsRow}>
                 <View style={styles.matchTeamItem}>
                    <Text style={styles.matchTeamName}>{selectedTeamA?.name}</Text>
                    <Text style={styles.matchTeamRole}>Home Team</Text>
                 </View>
                 <View style={styles.vsBadgeContainer}>
                    <Text style={styles.vsBadgeSmall}>VS</Text>
                 </View>
                 <View style={styles.matchTeamItem}>
                    <Text style={[styles.matchTeamName, { textAlign: 'right' }]}>{selectedTeamB?.name}</Text>
                    <Text style={[styles.matchTeamRole, { textAlign: 'right' }]}>Away Team</Text>
                 </View>
              </View>
           </View>
           
           {/* Configuration Card */}
           <View style={styles.infoCardPremium}>
              <View style={styles.infoCardHeader}>
                 <Trophy size={18} color="#01b854" />
                 <Text style={styles.infoCardTitle}>MATCH DETAILS</Text>
              </View>
              <View style={styles.detailsGrid}>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Overs</Text>
                    <Text style={styles.detailValue}>{matchConfig.totalOvers} Overs</Text>
                 </View>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Ball</Text>
                    <Text style={styles.detailValue}>{matchConfig.ballType}</Text>
                 </View>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Pitch</Text>
                    <Text style={styles.detailValue}>{matchConfig.pitchType}</Text>
                 </View>
                 <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>{matchConfig.type}</Text>
                 </View>
              </View>
           </View>

           {/* Venue Card */}
           <View style={styles.infoCardPremium}>
              <View style={styles.infoCardHeader}>
                 <MapPin size={18} color="#01b854" />
                 <Text style={styles.infoCardTitle}>VENUE & TIME</Text>
              </View>
              <View style={styles.venueContent}>
                 <Text style={styles.venueName}>{matchConfig.ground}</Text>
                 <Text style={styles.venueLocation}>{matchConfig.city}, {matchConfig.state}</Text>
                 <View style={styles.timeRow}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.timeText}>{matchConfig.dateTime}</Text>
                 </View>
              </View>
           </View>
           
           {/* Officials Card */}
           <View style={styles.infoCardPremium}>
              <View style={styles.infoCardHeader}>
                 <ShieldCheck size={18} color="#01b854" />
                 <Text style={styles.infoCardTitle}>MATCH OFFICIALS</Text>
              </View>
              
              <View style={styles.officialsGroup}>
                 {matchConfig.officials.umpires.map((u, i) => u && (
                   <View key={`u-${i}`} style={styles.officialCard}>
                      <View style={styles.officialAvatar}>
                         <Text style={styles.officialInitial}>{u[0]}</Text>
                      </View>
                      <View>
                         <Text style={styles.officialNamePremium}>{u}</Text>
                         <Text style={styles.officialRolePremium}>Umpire {i + 1}</Text>
                      </View>
                   </View>
                 ))}
                 {matchConfig.officials.scorer && (
                   <View style={styles.officialCard}>
                      <View style={styles.officialAvatar}>
                         <Text style={styles.officialInitial}>{matchConfig.officials.scorer[0]}</Text>
                      </View>
                      <View>
                         <Text style={styles.officialNamePremium}>{matchConfig.officials.scorer}</Text>
                         <Text style={styles.officialRolePremium}>Official Scorer</Text>
                      </View>
                   </View>
                 )}
              </View>
           </View>
        </ScrollView>

        <View style={styles.modalFooterPremium}>
           <TouchableOpacity 
             style={styles.closeBtnFooter}
             onPress={onClose}
           >
             <Text style={styles.closeBtnFooterText}>Dismiss</Text>
           </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export const SuccessModal = ({ isVisible, onClose, styles }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <TouchableOpacity 
      style={styles.modalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.successModalContent}>
        <View style={styles.successIconWrapper}>
           <CheckCircle2 size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>Hooray!</Text>
        <Text style={styles.successMessage}>Your team has been created and saved successfully.</Text>
        
        <TouchableOpacity 
          style={styles.successCloseBtn}
          onPress={onClose}
        >
          <Text style={styles.successCloseBtnText}>Great, thanks!</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

export const QrModal = ({ isVisible, onClose, user, styles }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <TouchableOpacity 
      style={styles.qrModalOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View style={styles.qrCard}>
        <View style={styles.qrHeader}>
          <Text style={styles.qrTitle}>Player Profile QR</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.qrContent}>
          <View style={styles.qrWrapper}>
            <QrCode size={180} color="#06392e" />
          </View>
          <Text style={styles.qrPlayerName}>{user?.full_name || 'Player'}</Text>
          <Text style={styles.qrSubtext}>Scan to view profile</Text>
        </View>

        <TouchableOpacity 
          style={styles.shareQrBtn}
          onPress={() => Share.share({ message: `Check out my cricket profile: https://bookyourground.com/player/${user?.id}` })}
        >
          <Share2 size={20} color="#FFFFFF" />
          <Text style={styles.shareQrBtnText}>Share Profile</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

export const ActionModal = ({ isVisible, onClose, onAction, styles }) => {
  const actions = [
    { id: 'match_info', label: 'Match Info', icon: Info, color: '#3B82F6' },
    { id: 'wagon_wheel', label: 'Wagon Wheel', icon: PlayCircle, color: '#8B5CF6' },
    { id: 'revise_target', label: 'Revise Target', icon: AlertCircle, color: '#F59E0B' },
    { id: 'rules', label: 'Match Rules', icon: ShieldCheck, color: '#10B981' },
    { id: 'full_scorecard', label: 'Full Scorecard', icon: BarChart3, color: '#01b854' },
    { id: 'abandon', label: 'Abandon Match', icon: Trash2, color: '#EF4444' },
  ];

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.actionModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Match Actions</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionItem}
                onPress={() => {
                  onAction(action.id);
                  onClose();
                }}
              >
                <View style={[styles.actionIconBox, { backgroundColor: action.color + '15' }]}>
                  <action.icon size={28} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles.actionCloseBtn}
            onPress={onClose}
          >
            <Text style={styles.actionCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export const TeamScannerModal = ({ isVisible, onClose, onScan, styles }) => {
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (isVisible) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [isVisible]);

  if (isVisible && hasPermission === null) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.fullModalScanner}>
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>Scan Team QR</Text>
          <TouchableOpacity onPress={onClose} style={styles.scannerClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {hasPermission === false ? (
          <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <Text style={{ color: '#FFF', textAlign: 'center' }}>No access to camera. Please enable it in settings.</Text>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
              <Text style={{ color: '#01b854', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            onBarcodeScanned={({ data }) => {
              if (data) onScan(data);
            }}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
        )}

        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
          <Text style={styles.scannerHint}>Align the team QR code within the frame</Text>
        </View>
      </View>
    </Modal>
  );
};

export const TeamPickerModal = ({ isVisible, onClose, teams, onSelect, onScanQr, styles, title }) => {
  const [search, setSearch] = React.useState('');
  
  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.sheetContent, { height: '80%' }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Text style={styles.sheetSubtitle}>{teams.length} teams available</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            <View style={styles.searchBar}>
              <Search size={20} color="#94A3B8" />
              <TextInput 
                placeholder="Search teams..."
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <TouchableOpacity style={styles.scanQrBtnSmall} onPress={onScanQr}>
              <QrCode size={20} color="#01b854" />
              <Text style={styles.scanQrBtnTextSmall}>Add New via QR</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 0 }}>
            {filteredTeams.map((team) => (
              <TouchableOpacity 
                key={team.id} 
                style={styles.teamPickerItem}
                onPress={() => {
                  onSelect(team);
                  onClose();
                }}
              >
                <View style={[styles.teamAvatarSmall, { backgroundColor: team.bgColor || '#F1F5F9' }]}>
                  <Text style={styles.teamInitialSmall}>{team.initials || team.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.teamPickerName}>{team.name}</Text>
                  <Text style={styles.teamPickerLoc}>{team.location || 'Unknown Location'}</Text>
                </View>
                <ChevronRight size={20} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
