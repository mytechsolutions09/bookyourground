import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
  TextInput,
  Share,
  Pressable,
  Modal,
  SafeAreaView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import WebLayout from '@/components/web/WebLayout';
import { 
  Swords, 
  Trophy, 
  Users, 
  BarChart3, 
  PlayCircle, 
  LayoutGrid,
  History,
  TrendingUp,
  Search,
  Calendar,
  AlertCircle,
  Crown,
  QrCode,
  MapPin,
  User,
  Users2,
  Plus,
  X,
  Radio,
  HelpCircle,
  Image as ImageIcon,
  Camera,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LogIn,
  Link,
  Share2,
  Smartphone,
  UserPlus,
  Sliders,
  Menu, 
  Mic2, 
  Video, 
  UserSquare2, 
  IdCard,
  RotateCcw,
  MoreHorizontal,
  ShieldCheck,
  UserMinus,
  Info,
  Clock,
  Settings,
  GripHorizontal,
  PlusCircle,
  Coffee,
  Zap,
  RefreshCw,
  Target,
  Hand
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCricketScoring } from '@/hooks/useCricketScoring';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Ladakh', 'Lakhshadweep', 'Puducherry', 'Andaman and Nicobar'
];

const TABS = [
  { id: 'matches', label: 'Matches', icon: Swords },
  { id: 'tournaments', label: 'Tournaments', icon: Trophy },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'highlights', label: 'Highlights', icon: PlayCircle },
];

const TOURNAMENTS_DATA = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47e',
    title: 'Pioneer Sports Park Practice Weekend',
    dateRange: '25 Nov, 2022 to 25 Nov, 2040',
    location: 'Gurugram (Gurgaon)',
    status: 'Ongoing',
    image: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg',
    hasCrown: true,
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47f',
    title: '10th Vikram Singh Cup',
    dateRange: '31 May, 2025 to 26 Apr, 2026',
    location: 'Gurugram (Gurgaon)',
    status: 'Ongoing',
    image: 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg',
    hasCrown: false,
  }
];

const INITIAL_TEAMS_DATA = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47a',
    name: 'Ggn Titans',
    location: 'Haryana',
    captain: 'Manu Yadav',
    image: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Tennessee_Titans_logo.svg/1200px-Tennessee_Titans_logo.svg.png',
    isUserTeam: true,
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d47b',
    name: 'The Yankees',
    location: 'Delhi',
    captain: 'Arpit Kanotra',
    initials: 'TY',
    bgColor: '#0EA5E9',
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
  },
  {
    id: '5',
    name: 'Rohtak Dhakkad XI',
    location: 'Haryana',
    captain: 'Ajay Singh Dalal',
    initials: 'RD',
    bgColor: '#EF4444',
    isUserTeam: false,
  },
  {
    id: '6',
    name: 'Dollars Club',
    location: 'Delhi',
    captain: 'Arvind Upreti',
    initials: 'DC',
    bgColor: '#713F12',
    isUserTeam: false,
  }
];

const BATTING_STATS = [
  { label: 'Mat', value: '222' },
  { label: 'Inns', value: '206' },
  { label: 'NO', value: '28' },
  { label: 'Runs', value: '6390' },
  { label: 'HS', value: '135' },
  { label: 'Avg', value: '35.9' },
  { label: 'SR', value: '156.54' },
  { label: '30s', value: '41' },
  { label: '50s', value: '37' },
  { label: '100s', value: '11' },
  { label: '4s', value: '756' },
  { label: '6s', value: '241' },
  { label: 'Ducks', value: '14' },
  { label: 'Won', value: '115' },
  { label: 'Loss', value: '102' },
];

const BOWLING_STATS = [
  { label: 'Mat', value: '222' },
  { label: 'Inns', value: '149' },
  { label: 'Overs', value: '416.3' },
  { label: 'Maidens', value: '4' },
  { label: 'Runs', value: '3694' },
  { label: 'Wkts', value: '150' },
  { label: 'BB', value: '6/45' },
  { label: '3 Wkts', value: '11' },
  { label: '5 Wkts', value: '3' },
  { label: 'Eco', value: '8.87' },
  { label: 'SR', value: '16.66' },
  { label: 'Avg', value: '24.63' },
  { label: 'WD', value: '133' },
  { label: 'NB', value: '10' },
  { label: 'Dots', value: '918' },
  { label: '4s', value: '331' },
  { label: '6s', value: '160' },
];

const FIELDING_STATS = [
  { label: 'Mat', value: '222' },
  { label: 'Catches', value: '66' },
  { label: 'C/B', value: '3' },
  { label: 'R/O', value: '7' },
  { label: 'St', value: '1' },
  { label: 'Asst. R/O', value: '4' },
  { label: 'Byes', value: '0' },
];

const CAPTAIN_STATS = [
  { label: 'Mat', value: '49' },
  { label: 'Toss Won', value: '24' },
  { label: 'Win %', value: '32.65%' },
  { label: 'Loss %', value: '67.35%' },
];

const styles = StyleSheet.create({
  modalHeaderPremium: {
    padding: 24,
    paddingTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitlePremium: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalSubtitlePremium: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  closeBtnPremium: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardPremium: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#01b854',
    letterSpacing: 1,
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeamItem: {
    flex: 1,
  },
  matchTeamName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06392e',
  },
  matchTeamRole: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  vsBadgeContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  vsBadgeSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    width: '45%',
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  venueName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#06392e',
  },
  venueLocation: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timeText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  officialsGroup: {
    gap: 10,
  },
  officialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F9FAF7',
    borderRadius: 12,
  },
  officialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officialInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
  },
  officialNamePremium: {
    fontSize: 15,
    fontWeight: '600',
    color: '#06392e',
  },
  officialRolePremium: {
    fontSize: 11,
    color: '#6B7280',
  },
  modalFooterPremium: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  closeBtnFooter: {
    backgroundColor: '#01b854',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeBtnFooterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  dismissalTile: {
    width: '31%',
    aspectRatio: 1.3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  dismissalTileActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  dismissalIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dismissalIconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dismissalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
  },
  dismissalTextActive: {
    color: '#FFFFFF',
  },
  batterSelectionTile: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  batterSelectionTileActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  batterSelectionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
  },
  batterSelectionRole: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  playerGridTile: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  playerGridTileActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#01b854',
  },
  playerGridName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  extraRunTile: {
    width: '30%',
    aspectRatio: 1.2,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  extraRunTileActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  extraRunTileText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  extraRunTileTextActive: {
    color: '#FFFFFF',
  },
  wagonWheelContainer: {
    padding: 20,
    alignItems: 'center',
    flex: 1,
  },
  groundOuter: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#059669',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  groundInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  pitchCenter: {
    width: 20,
    height: 40,
    backgroundColor: '#FDE68A',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -10,
    marginTop: -20,
    borderRadius: 2,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#dcc093'
  },
  dividerLine: {
    position: 'absolute',
    width: 1.5,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    left: '50%',
    marginLeft: -0.75,
  },
  region: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  regionLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  longOff: { bottom: 35, left: 45, width: 80, height: 60 },
  longOn: { bottom: 35, right: 45, width: 80, height: 60 },
  cover: { bottom: 105, left: 10, width: 80, height: 60 },
  midWicket: { bottom: 105, right: 10, width: 80, height: 60 },
  point: { top: 95, left: 10, width: 80, height: 60 },
  squareLeg: { top: 95, right: 10, width: 80, height: 60 },
  thirdMan: { top: 35, left: 45, width: 80, height: 60 },
  fineLeg: { top: 35, right: 45, width: 80, height: 60 },
  skipBtn: {
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  skipBtnText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  tabsStickyWrapper: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', zIndex: 10 },
  tabsInnerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleWrapper: { paddingHorizontal: 24, borderLeftWidth: 1, borderLeftColor: '#E5E7EB', height: '100%', justifyContent: 'center' },
  heroLabel: { fontSize: 12, fontWeight: '800', color: '#01b854', textTransform: 'uppercase', letterSpacing: 1.5 },
  tabsScroll: { paddingHorizontal: 24, paddingVertical: 16, gap: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 12, marginRight: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#B91C1C' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  scoringTopNav: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  backNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backNavBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: { color: '#06392e', fontWeight: '800' },
  mainScroll: { flex: 1 },
  mainScrollContent: { paddingBottom: 60 },
  contentContainer: { flex: 1 },
  subTabContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', marginHorizontal: 20, marginTop: 20, borderRadius: 12, padding: 2, gap: 2 },
  subTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  subTabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  subTabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  subTabTextActive: { color: '#06392e' },
  matchesList: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 20, gap: 12 },
  matchCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 12 },
  matchType: { fontSize: 14, fontWeight: '600', color: '#374151' },
  matchTournament: { color: '#9CA3AF', fontWeight: '400' },
  matchMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeUpcoming: { backgroundColor: '#F1F5F9' },
  statusBadgeLive: { backgroundColor: '#F0FDF4', flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadgeResult: { backgroundColor: '#F0F9FF' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextResult: { color: '#0369A1' },
  statusBadgeTextUpcoming: { color: '#64748B' },
  statusBadgeTextLive: { color: '#15803D' },
  matchTeams: { marginTop: 16, marginBottom: 8 },
  matchTeamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  teamNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  teamScoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06392e',
  },
  teamOversText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
  },
  teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamName: { fontSize: 15, color: '#06392e' },
  teamNameBold: { fontWeight: '700', fontSize: 16 },
  teamScore: { fontSize: 14, color: '#4B5563' },
  teamScoreBold: { fontWeight: '700', color: '#06392e', fontSize: 16 },
  matchMessage: { fontSize: 13, color: '#4B5563', fontStyle: 'italic', marginBottom: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  matchResultText: { fontSize: 13, color: '#059669', fontWeight: '600', marginBottom: 12 },
  matchFooter: { flexDirection: 'row', gap: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  footerLink: { fontSize: 13, color: '#01b854', fontWeight: '600' },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  liveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  liveActionBtnText: {
    color: '#01b854',
    fontSize: 14,
    fontWeight: '600',
  },
  tournamentCard: { backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  imageContainer: { height: 160, position: 'relative' },
  tournamentImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  crownBadge: { position: 'absolute', top: 12, left: 12, width: 24, height: 24, borderRadius: 6, backgroundColor: '#B91C1C', alignItems: 'center', justifyContent: 'center' },
  ongoingBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#B91C1C', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ongoingBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  tournamentTitleOverlay: { position: 'absolute', bottom: 12, left: 12, right: 12, color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  tournamentInfo: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  tournamentMeta: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  followLink: { color: '#01b854', fontWeight: '700', fontSize: 14 },
  teamCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  teamAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  teamImage: { width: '100%', height: '100%' },
  teamInitials: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  teamContent: { flex: 1, marginLeft: 16, flexDirection: 'row', alignItems: 'center' },
  teamTitle: { fontSize: 16, fontWeight: '700', color: '#06392e', marginBottom: 4 },
  teamMetaRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaLabel: { fontSize: 12, color: '#6B7280' },
  captainIcon: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center' },
  captainIconText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, marginVertical: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#06392e', outlineStyle: 'none' as any },
  statsPromoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  statsPromoText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  analyzeBtn: { backgroundColor: '#dcc093', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  analyzeBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statsFilterBar: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  statPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 99, backgroundColor: '#E5E7EB' },
  statPillActive: { backgroundColor: '#dcc093' },
  statPillText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  statPillTextActive: { color: '#FFFFFF' },
  statsContent: { paddingHorizontal: 20 },
  statsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#06392e' },
  compareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#01b854', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  compareBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statTile: { width: '19%', backgroundColor: '#FFFFFF', paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#06392e', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  captainFooter: { marginTop: 10 },
  ballTypeLabel: { fontSize: 14, color: '#06392e', fontWeight: '600', marginBottom: 10 },
  adBanner: { marginVertical: 20, borderRadius: 20, overflow: 'hidden', height: 120, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', position: 'relative' },
  adImage: { width: '100%', height: '100%', opacity: 0.6 },
  adOverlay: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: 'center' },
  adTitle: { fontSize: 16, color: '#06392e', lineHeight: 20 },
  adTitleBold: { fontWeight: '900', fontSize: 20 },
  adBtn: { backgroundColor: '#01b854', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 10 },
  adBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tabContent: { paddingVertical: 70, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center' },
  placeholderIconArea: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  placeholderTitle: { fontSize: 26, fontWeight: '900', color: '#06392e', marginBottom: 12, textAlign: 'center' },
  placeholderDesc: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 26, maxWidth: 340, marginBottom: 32 },
  placeholderBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#043529', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  placeholderBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  plusIconWrapper: {
    paddingHorizontal: 24,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#06392e',
  },
  modalOptions: {
    gap: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F9FAF7',
    gap: 16,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  selectionView: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    flex: 1,
    minHeight: 400,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#06392e',
  },
  teamSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  teamSlot: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#F9FAF7',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  teamSlotFilled: {
    borderStyle: 'solid',
    borderColor: '#01b854',
    backgroundColor: '#FFFFFF',
  },
  emptySlot: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  slotAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#01b854',
    textAlign: 'center',
  },
  vsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06392e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '100%',
    maxWidth: 450,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 25,
  },
  formGroup: {
    marginBottom: 20,
  },
  slotAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  slotName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06392e',
    textAlign: 'center',
  },
  startMatchBtn: {
    backgroundColor: '#01b854',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  startMatchBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  selectBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectBtnText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  createTeamCard: {
    borderStyle: 'dashed',
    borderColor: '#01b854',
    backgroundColor: '#F0FDF4',
  },
  createTeamIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#01b854',
  },
  createTeamText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#01b854',
    marginBottom: 2,
  },
  createTeamSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  createTeamModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 450,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#06392e',
    outlineStyle: 'none' as any,
  },
  submitBtn: {
    backgroundColor: '#01b854',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  qrModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '100%',
    maxWidth: 450,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 20,
  },
  qrBody: {
    alignItems: 'center',
  },
  qrCard: {
    width: '100%',
    backgroundColor: '#F9FAF7',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  teamAvatarQr: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#01b854',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamInitialsQr: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  qrTeamName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#06392e',
  },
  qrTeamMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrFooterText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  downloadBtn: {
    marginTop: 24,
    width: '100%',
    backgroundColor: '#06392e',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '90%',
    maxWidth: 380,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 25,
  },
  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#01b854',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#06392e',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  successCloseBtn: {
    backgroundColor: '#06392e',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  successCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#01b854',
  },
  loginBtnTextInline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854',
  },
  addPlayerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '95%',
    maxWidth: 800,
    maxHeight: '92%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 25,
  },
  addPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activeTeamInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  teamAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#01b854',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  teamInitialsLarge: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  activeTeamName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#06392e',
    marginBottom: 4,
  },
  activeTeamMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: -20,
    marginBottom: 24,
  },
  addPlayerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#06392e',
  },
  addPlayerScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06392e',
    marginBottom: 20,
  },
  inviteContainer: {
    gap: 16,
    marginBottom: 10,
  },
  inviteLabelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  inviteLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  linkIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  shareBtn: {
    backgroundColor: '#149D8F',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  manualOptionsContainer: {
    marginTop: 10,
  },
  manualOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  optionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06392e',
    marginBottom: 2,
  },
  optionSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignAdminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  adminBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '700',
  },
  adminBannerText: {
    fontSize: 14,
    color: '#06392e',
  },
  promoBanner: {
    backgroundColor: '#149D8F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 1,
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promoIconPlaceholder: {
    width: 40,
    height: 30,
    backgroundColor: '#FFFFFF33',
    borderRadius: 4,
  },
  promoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  squadSection: {
    backgroundColor: '#F9FAFB',
    minHeight: 100,
  },
  playerCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 16,
  },
  playerAvatar: {
    position: 'relative',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dcc093',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  playerNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  squadFooter: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#71717A',
  },
  footerTabActive: {
    backgroundColor: '#149D8F',
  },
  footerTabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  footerTabTextActive: {
    fontWeight: '800',
  },
  profileHeader: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 16,
    backgroundColor: '#06392e',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  profileHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  profileNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  profileMetaText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rankBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  rankBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  insightsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#149D8F',
    paddingVertical: 10,
    borderRadius: 8,
  },
  insightsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  profileTabsFixed: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingTop: 12,
  },
  profileSubTab: {
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  profileSubTabActive: {
    borderBottomColor: '#B91C1C',
  },
  profileSubTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  profileSubTabTextActive: {
    color: '#06392e',
    fontWeight: '800',
  },
  profilePlaceholder: {
    alignItems: 'center',
    paddingTop: 40,
  },
  placeholderImg: {
    width: 200,
    height: 150,
    borderRadius: 16,
    marginBottom: 24,
    opacity: 0.8,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#06392e',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  placeholderDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  performanceChart: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  formCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  trophyBox: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyYear: {
    fontSize: 12,
    color: '#dcc093',
    fontWeight: '800',
    marginTop: 12,
  },
  trophyEvent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#06392e',
    textAlign: 'center',
    marginTop: 4,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  rankNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#9CA3AF',
    width: 20,
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#06392e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemberSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  addMemberSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#01b854',
  },
  leaderboardSubTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
  },
  lbSubTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  lbSubTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lbSubTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  lbSubTabTextActive: {
    color: '#06392e',
    fontWeight: '700',
  },
  playerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 16,
  },
  playerSelectRowActive: {
    borderColor: '#01b854',
    backgroundColor: '#F0FDF4',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: '#01b854',
    borderColor: '#01b854',
  },
  selectionSubTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  selectionFooter: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  vsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 20,
    marginBottom: 32,
  },
  vsTeam: {
    flex: 1,
    alignItems: 'center',
  },
  vsName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#06392e',
    textAlign: 'center',
  },
  vsPlayers: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  vsBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vsBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#EF4444',
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typePillActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#01b854',
  },
  typePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typePillTextActive: {
    color: '#01b854',
  },
  configInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#06392e',
  },
  hundredInfo: {
    backgroundColor: '#fcf8ef',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  hundredText: {
    color: '#EA580C',
    fontWeight: '700',
    textAlign: 'center',
  },
  ballTypes: {
    flexDirection: 'row',
    gap: 12,
  },
  ballTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  ballTypeBtnActive: {
    backgroundColor: '#06392e',
  },
  ballText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  decisionTextActive: {
    color: '#FFFFFF',
  },
  openerSection: {
    marginBottom: 32,
  },
  openerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  playingXiLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#06392e',
    textTransform: 'uppercase',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerGridTile: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  playerGridTileActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
  },
  playerGridName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginTop: 6,
    textAlign: 'center',
  },
  playerGridNameActive: {
    color: '#01b854',
  },
  warningText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '700',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  scoringContainer: {
    flex: 1,
  },
  scoringContentWrapper: {
    flex: 1,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    // Platform-specific shadow/border would go here
  },
  mainScoreboard: {
    padding: 16,
    paddingTop: 12,
  },
  scoringTeamName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bigRuns: {
    fontSize: 40,
    fontWeight: '900',
    color: '#06392e',
  },
  overText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  crrBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  crrLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  crrValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#06392e',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 16,
  },
  targetText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    flex: 1,
  },
  playerStatsRow: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
  },
  batsmanCol: {
    flex: 1.5,
  },
  bowlerCol: {
    flex: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  statsHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  statsHeadValues: {
    flexDirection: 'row',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
  },
  statsValues: {
    flexDirection: 'row',
    gap: 12,
  },
  statsValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06392e',
    width: 20,
    textAlign: 'center',
  },
  statsHeaderTextFixed: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    width: 22,
    textAlign: 'center',
  },
  statsValueTextFixed: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06392e',
    width: 22,
    textAlign: 'center',
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#01b854',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#06392e',
    // @ts-ignore
    outlineStyle: 'none',
  },
  manualEntryForm: {
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  addPlayerMiniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#01b854',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  addPlayerMiniActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854',
  },
  timelineContainer: {
    height: 48,
    justifyContent: 'center',
  },
  ballCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballWicket: {
    backgroundColor: '#EF4444',
  },
  ballBoundary: {
    backgroundColor: '#01b854',
  },
  ballLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4B5563',
  },
  scoringWheel: {
    marginTop: 16,
    gap: 8,
  },
  wheelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  runBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  runBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#06392e',
  },
  boundaryBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#01b854',
  },
  boundaryBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#01b854',
  },
  wicketBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  extraRow: {
    flexDirection: 'row',
    gap: 8,
  },
  extraBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  extraBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4B5563',
  },
  scoringActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionIconBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
    width: '22%',
  },
  actionIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 6,
  },
  contactItem: {
    width: 80,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  playerTileActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#01b854',
    borderWidth: 2,
  },
  playerTileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 8,
  },
  playerTileNameActive: {
    color: '#01b854',
  },
  contactItemFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  startMatchMainBtn: {
    backgroundColor: '#06392e',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  startMatchMainBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  wagonWheelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
  },
  wagonWheelDesc: {
    fontSize: 14,
    color: '#06392e',
    fontWeight: '500',
  },
  toggleBg: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    padding: 4,
  },
  toggleBgActive: {
    backgroundColor: '#01b854',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleActive: {
    transform: [{ translateX: 20 }],
  },
  pitchBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pitchBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#01b854',
  },
  pitchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pitchTextActive: {
    color: '#01b854',
  },
  pickerWrapper: {
    position: 'relative',
  },
  pickerIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  officialsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  officialsTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  officialIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#06392e',
  },
  officialsSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  officialGroupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#06392e',
    marginBottom: 12,
  },
  officialInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  officialInput: {
    flex: 1,
    height: 52,
    fontSize: 15,
    fontWeight: '600',
    color: '#06392e',
  },
  officialValueText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#06392e',
    paddingVertical: 16,
  },
  officialPlaceholderText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  officialResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#06392e',
  },
  resultPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  resultRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#01b854',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  noResultArea: {
    alignItems: 'center',
    paddingTop: 40,
  },
  noResultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#374151',
    marginTop: 16,
  },
  noResultSub: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  addNewOfficialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  addNewOfficialText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitial: {
    color: '#01b854',
    fontWeight: '700',
    fontSize: 16,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#06392e',
  },
  contactPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  imagePickerBtn: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  imagePickerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  imagePickerPreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  removeImageText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownTrigger: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: {
    fontSize: 15,
    color: '#06392e',
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  statesDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  stateItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stateItemText: {
    fontSize: 14,
    color: '#374151',
  },
  coin: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dcc093',
    padding: 6,
    shadowColor: '#dcc093',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#B45309',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
  },
  coinText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FEF3C7',
  },
  tapToFlipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tossWinnerSelection: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    width: '100%',
  },
  tossTeamBtn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  tossTeamBtnActive: {
    borderColor: '#01b854',
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
  },
  tossTeamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 8,
  },
  tossTeamNameActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    width: '100%',
  },
  decisionBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  decisionBtnActive: {
    backgroundColor: '#06392e',
    borderColor: '#06392e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  decisionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6B7280',
  },
  decisionTextActive: {
    color: '#FFFFFF',
  },
  overSummaryBanner: {
    backgroundColor: '#06392e',
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  overSummaryText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreSummaryText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#06392e',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  settingsBtnSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  drawerContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#06392e',
  },
  settingSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  sectionHeaderTextMenu: {
    fontSize: 16,
    fontWeight: '800',
    color: '#06392e',
  },
  sectionOptionsList: {
    backgroundColor: '#FFFFFF',
  },
  settingOptionRow: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAF7',
  },
  settingOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  sheetGridItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sheetIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sheetItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 14,
  },
  showLessBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  showLessText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854',
  },
  extraSelectorContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  extraSelectorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#06392e',
    marginBottom: 4,
  },
  extraSelectorDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  extraRunsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  extraRunTile: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraRunTileText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#06392e',
  },
  cancelExtraBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelExtraText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#06392e',
    fontFamily: 'Inter',
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 6,
    fontFamily: 'Inter',
  },
  addPlayerMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#01b854',
    marginTop: 16,
    justifyContent: 'center',
  },
  addPlayerMiniText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#01b854',
  },
  tabsStickyWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    zIndex: 10,
  },
  tabsInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  tabActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#01b854',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#01b854',
    fontWeight: '800',
  },
  plusIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 40,
  },
  actionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '90%',
    maxWidth: 400,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 25,
  },
  actionModalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#06392e',
    textAlign: 'center',
    marginBottom: 32,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '47%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },
  actionCloseBtn: {
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
  },
  actionCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  playerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 12,
  },
  playerSelectRowActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#01b854',
  },
  avatarCircle: {
     width: 44,
     height: 44,
     borderRadius: 22,
     backgroundColor: '#FFFFFF',
     alignItems: 'center',
     justifyContent: 'center',
     borderWidth: 1,
     borderColor: '#F3F4F6',
  },
  playerNameText: {
     fontSize: 15,
     fontWeight: '700',
     color: '#06392e',
  },
  checkBox: {
     width: 24,
     height: 24,
     borderRadius: 12,
     backgroundColor: '#FFFFFF',
     borderWidth: 2,
     borderColor: '#E5E7EB',
     alignItems: 'center',
     justifyContent: 'center',
  },
  checkBoxActive: {
     backgroundColor: '#01b854',
     borderColor: '#01b854',
  },
  captainPickBtn: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 6,
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 12,
     backgroundColor: '#F3F4F6',
  },
  captainPickBtnActive: {
     backgroundColor: '#06392e',
  },
  captainPickText: {
     fontSize: 10,
     fontWeight: '800',
     color: '#6B7280',
     letterSpacing: 0.5,
  },
  captainPickTextActive: {
     color: '#01b854',
  },
  teamCardPremium: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  teamCardPremiumActive: {
    borderColor: '#01b854',
    backgroundColor: '#F0FDF4',
  },
  teamCardPremiumDisabled: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  teamAvatarPremium: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamInitialsPremium: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  teamContentPremium: {
    flex: 1,
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamTitlePremium: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06392e',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  teamMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  selectBtnPremium: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectBtnPremiumActive: {
    backgroundColor: '#01b854',
  },
  selectBtnPremiumDisabled: {
    backgroundColor: '#E5E7EB',
  },
  selectBtnTextPremium: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  qrIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    padding: 4,
    borderRadius: 14,
  },
  modalTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalTabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  modalTabTextActive: {
    color: '#06392e',
    fontWeight: '700',
  },
  closeBtnPremium: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#01b854',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  placeholderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  scanQrActionBtn: {
    padding: 4,
  },
  scannedTeamResult: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#01b854',
    gap: 12,
  },
  scannedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scannedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#01b854',
    flex: 1,
  },
  fullModalScanner: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  scannerClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#01b854',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

export default function CricketScreen() {
  const [activeTab, setActiveTab] = useState('matches');
  const [subTab, setSubTab] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [isCreateTeamModalVisible, setIsCreateTeamModalVisible] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [isSelectingTeams, setIsSelectingTeams] = useState(false);
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [isAddPlayerViewVisible, setIsAddPlayerViewVisible] = useState(false);
  const [activeTeamForPlayers, setActiveTeamForPlayers] = useState<any>(null);
  const [activeTeamForQr, setActiveTeamForQr] = useState<any>(null);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [isContactPickerVisible, setIsContactPickerVisible] = useState(false);
  const [realContacts, setRealContacts] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', phone: '' });
  
  const [managementTab, setManagementTab] = useState<'squad' | 'profile'>('squad');
  const [profileSubTab, setProfileSubTab] = useState('matches');
  const [leaderboardSubTab, setLeaderboardSubTab] = useState('bat');
  const [teamForm, setTeamForm] = useState({ name: '', location: '', captain: '', image: '' });
  const [isSelectingPlayers, setIsSelectingPlayers] = useState(false);
  const [currentPickingSide, setCurrentPickingSide] = useState<'A' | 'B'>('A');
  const [playingXiA, setPlayingXiA] = useState<any[]>([]);
  const [playingXiB, setPlayingXiB] = useState<any[]>([]);
  const [isConfiguringMatch, setIsConfiguringMatch] = useState(false);
  const [isConfiguringToss, setIsConfiguringToss] = useState(false);
  const [isSelectingOpeners, setIsSelectingOpeners] = useState(false);
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [teamSelectionTab, setTeamSelectionTab] = useState<'search' | 'scan'>('search');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedTeam, setScannedTeam] = useState<any>(null);
  const [isSearchingScannedTeam, setIsSearchingScannedTeam] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isSearchingOfficial, setIsSearchingOfficial] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isConfiguringDismissal, setIsConfiguringDismissal] = useState(false);
  const [dismissalState, setDismissalState] = useState<{
    type: string,
    fielder: any | null,
    runOutBatter: 'Striker' | 'Non-Striker' | null
  }>({ type: '', fielder: null, runOutBatter: null });
  const [isAddOfficialModalVisible, setIsAddOfficialModalVisible] = useState(false);
  const [newOfficialForm, setNewOfficialForm] = useState({ name: '', phone: '' });
  const [activeOfficialSlot, setActiveOfficialSlot] = useState<{ category: string, index?: number } | null>(null);
  const [tossResult, setTossResult] = useState<{ winner: any, decision: 'bat' | 'bowl' | null }>({ winner: null, decision: null });
  const [matchState, setMatchState] = useState<{ striker: any, nonStriker: any, bowler: any, keeper: any }>({ striker: null, nonStriker: null, bowler: null, keeper: null });
  const [teamACaptain, setTeamACaptain] = useState<any>(null);
  const [teamBCaptain, setTeamBCaptain] = useState<any>(null);
  const [matchConfig, setMatchConfig] = useState({
    type: 'limited overs',
    totalOvers: '20',
    oversPerBowler: '4',
    ballType: 'leather',
    wagonWheel: true,
    pitchType: 'matting',
    state: 'Delhi',
    city: '',
    ground: '',
    dateTime: new Date().toLocaleString(),
    officials: {
      umpires: ['', '', '', ''],
      scorers: ['', ''],
      streamer: '',
      referee: '',
      commentators: ['', '']
    }
  });
  const {
    matchId: liveMatchId, phase: matchPhase, result, currentIdx, inn, inn1, inn2, matchConfig: activeMatchConfig, striker, nonStriker, bowler, crr, rrr, yetToBat, formatOvers,
    battingPlayers: squadBatting, bowlingPlayers: squadBowling,
    startMatch, resumeMatch, addBall, addExtra, addWicket, savePlayingXi, changeBowler, addNewBowler, undoLastBall, startSecondInnings, setOpeners, swapBatters, markRetiredHurt, reviseTarget, updateMatchConfig, changeSquad, declareInnings
  } = useCricketScoring();
  
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [isMatchResultVisible, setIsMatchResultVisible] = useState(false);
  const [isScoringSettingsVisible, setIsScoringSettingsVisible] = useState(false);
  const [isMoreSheetVisible, setIsMoreSheetVisible] = useState(false);
  const [isExtraRunsSelectorVisible, setIsExtraRunsSelectorVisible] = useState(false);
  const [activeExtraType, setActiveExtraType] = useState<'wide' | 'noball' | 'bye' | 'legbye' | 'penalty' | null>(null);
  const [isFullScorecardVisible, setIsFullScorecardVisible] = useState(false);
  const [isRetiredHurtModalVisible, setIsRetiredHurtModalVisible] = useState(false);
  const [isReviseTargetModalVisible, setIsReviseTargetModalVisible] = useState(false);
  const [newTargetValue, setNewTargetValue] = useState('');
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);
  const [isChangeOversModalVisible, setIsChangeOversModalVisible] = useState(false);
  const [newOversValue, setNewOversValue] = useState('');
  const [isBreakModalVisible, setIsBreakModalVisible] = useState(false);
  const [activeBreakType, setActiveBreakType] = useState('');
  const [isWagonWheelVisible, setIsWagonWheelVisible] = useState(false);
  const [pendingRuns, setPendingRuns] = useState<number>(0);
  const [expandedSettingSection, setExpandedSettingSection] = useState<string | null>('Match Settings');
  const drawerAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (isScoringSettingsVisible) {
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isScoringSettingsVisible]);

  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [dbSearchResults, setDbSearchResults] = useState<any[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [isAddingNewPlayerManually, setIsAddingNewPlayerManually] = useState(false);
  const [manualPlayerName, setManualPlayerName] = useState('');
  const [manualPlayerPhone, setManualPlayerPhone] = useState('');
  
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMatchInfoVisible, setIsMatchInfoVisible] = useState(false);

  useEffect(() => {
    let active = true;
    const searchDbPlayers = async () => {
      const q = (playerSearchQuery || '').trim();
      if (q.length < 3 || isAddingNewPlayerManually) {
        setDbSearchResults([]);
        setIsSearchingDb(false);
        return;
      }

      setIsSearchingDb(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, phone')
          .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(10);

        if (!active) return;

        if (!error && data) {
          const localPhones = new Set((teamMembers || []).map(m => m.player_phone));
          const localNames = new Set((teamMembers || []).map(m => m.player_name?.toLowerCase()));
          
          const filtered = data.filter(p => 
            !localPhones.has(p.phone) && 
            !localNames.has(p.full_name?.toLowerCase())
          );
          setDbSearchResults(filtered);
        }
      } catch (err) {
        if (active) console.error('Global search error:', err);
      } finally {
        if (active) setIsSearchingDb(false);
      }
    };

    const timer = setTimeout(searchDbPlayers, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [playerSearchQuery, isAddingNewPlayerManually, teamMembers]);
  const [isSelectingNextBowler, setIsSelectingNextBowler] = useState(false);
  const [isSelectingNewBatter, setIsSelectingNewBatter] = useState(false);
  const [pendingWicketData, setPendingWicketData] = useState<{ dismissedName: string } | null>(null);
  const [lastBowlerId, setLastBowlerId] = useState<string | null>(null);

  const [groundResults, setGroundResults] = useState<any[]>([]);
  const [isSearchingGround, setIsSearchingGround] = useState(false);
  const [showGroundDropdown, setShowGroundDropdown] = useState(false);

  useEffect(() => {
    if (matchPhase === 'innings_break') {
      // Auto-start second innings
      const timer = setTimeout(async () => {
        await startSecondInnings();
        setMatchState({ striker: null, nonStriker: null, bowler: null, keeper: null });
        setIsSelectingOpeners(true);
        setIsScoring(false); // Move out of live scoring to selection view
        setIsSelectingNextBowler(false); // Ensure modal is closed
      }, 500); // Small delay for user to see the all-out/innings-end state
      return () => clearTimeout(timer);
    }
    if (matchPhase === 'completed') {
       setIsMatchResultVisible(true);
       setIsScoring(false);
    }
  }, [matchPhase]);

  const handleAddBall = async (runs: number) => {
    if (matchConfig.wagonWheel && runs > 0) {
      setPendingRuns(runs);
      setIsWagonWheelVisible(true);
      return;
    }
    const next = await addBall(runs);
    if (!next) return;
    
    const isOverEnd = next.legalBalls > 0 && next.legalBalls % 6 === 0;
    const maxOvers = parseInt(matchConfig.overs || '0');
    const isOversFinished = maxOvers > 0 && next.legalBalls >= maxOvers * 6;
    const totalPlayers = parseInt(matchConfig.players || '11');
    const isAllOut = next.wickets >= Math.min(totalPlayers - 1, 10);
    const isChaseWon = currentIdx === 1 && next.target && next.runs >= next.target;

    if (isOverEnd && !isOversFinished && !isAllOut && !isChaseWon) {
      setLastBowlerId(bowler?.name);
      setIsSelectingNextBowler(true);
    }
  };

  const handleWagonWheelSelect = async (area: string) => {
    setIsWagonWheelVisible(false);
    const next = await addBall(pendingRuns, area);
    if (!next) return;

    const isOverEnd = next.legalBalls > 0 && next.legalBalls % 6 === 0;
    const maxOvers = parseInt(matchConfig.overs || '0');
    const isOversFinished = maxOvers > 0 && next.legalBalls >= maxOvers * 6;
    const totalPlayers = parseInt(matchConfig.players || '11');
    const isAllOut = next.wickets >= Math.min(totalPlayers - 1, 10);
    const isChaseWon = currentIdx === 1 && next.target && next.runs >= next.target;

    if (isOverEnd && !isOversFinished && !isAllOut && !isChaseWon) {
      setLastBowlerId(bowler?.name);
      setIsSelectingNextBowler(true);
    }
  };

  const handleAddExtra = async (type: string, additionalRuns: number = 0) => {
    const next = await addExtra(type, additionalRuns);
    if (!next) return;

    const isLegalExtra = type !== 'wide' && type !== 'noball';
    const isOverEnd = isLegalExtra && next.legalBalls > 0 && next.legalBalls % 6 === 0;
    const maxOvers = parseInt(matchConfig.overs || '0');
    const isOversFinished = maxOvers > 0 && next.legalBalls >= maxOvers * 6;
    const totalPlayers = parseInt(matchConfig.players || '11');
    const isAllOut = next.wickets >= Math.min(totalPlayers - 1, 10);
    const isChaseWon = currentIdx === 1 && next.target && next.runs >= next.target;

    if (isOverEnd && !isOversFinished && !isAllOut && !isChaseWon) {
       setLastBowlerId(bowler?.name);
       setIsSelectingNextBowler(true);
    }
  };

  const handleAddWicket = async (data: any) => {
    const next = await addWicket(data);
    if (!next) return;

    const isOverEnd = next.legalBalls > 0 && next.legalBalls % 6 === 0;
    const maxOvers = parseInt(matchConfig.overs || '0');
    const isOversFinished = maxOvers > 0 && next.legalBalls >= maxOvers * 6;
    const totalPlayers = parseInt(matchConfig.players || '11');
    const isAllOut = next.wickets >= Math.min(totalPlayers - 1, 10);
    const isChaseWon = currentIdx === 1 && next.target && next.runs >= next.target;

    if (isOverEnd && !isOversFinished && !isAllOut && !isChaseWon) {
       setLastBowlerId(bowler?.name);
       setIsSelectingNextBowler(true);
    }
  };
  const [teams, setTeams] = useState(INITIAL_TEAMS_DATA);
  const [selectedTeamA, setSelectedTeamA] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [fetchedMatches, setFetchedMatches] = useState<any[]>([]);

  const { matchId: urlMatchId, live, startMatch: directStart, createTeam } = useLocalSearchParams();
  const [resumeFailed, setResumeFailed] = useState(false);

  useEffect(() => {
    if (urlMatchId) {
      console.log('[Scoring] urlMatchId found, attempting resume:', urlMatchId);
      resumeMatch(urlMatchId as string).then(async res => {
        console.log('[Scoring] Resume result:', res);
        if (res.status === 'success' || res.status === 'needs_setup') {
          const config = res.config;
          const xiData = (res as any).xiData || [];
          
          if (config) {
             console.log('[Scoring] Pre-filling from config:', config.teamA, 'vs', config.teamB);
             
             // 1. Fetch team objects
             const [{ data: tA }, { data: tB }] = await Promise.all([
               supabase.from('teams').select('*').eq('id', config.teamAId).maybeSingle(),
               supabase.from('teams').select('*').eq('id', config.teamBId).maybeSingle()
             ]);

             if (tA) setSelectedTeamA(tA);
             if (tB) setSelectedTeamB(tB);
             
             // 2. Map XI Data back to local state
            if (xiData.length > 0 && tA && tB) {
              console.log('[Scoring] Resuming XI data found:', xiData.length, 'rows');
              const xiA = xiData.filter((r: any) => r.team_id === tA.id).map((r: any) => ({
                ...r.team_members,
                id: r.player_id // Ensure ID is preserved
              }));
              const xiB = xiData.filter((r: any) => r.team_id === tB.id).map((r: any) => ({
                ...r.team_members,
                id: r.player_id
              }));
              console.log('[Scoring] Restored squads:', xiA.length, 'and', xiB.length);
              setPlayingXiA(xiA.filter(p => !!p.id));
              setPlayingXiB(xiB.filter(p => !!p.id));
            }
             
            if (res.status === 'success') {
              setIsScoring(true);
              if (res.lastBowlerName) setLastBowlerId(res.lastBowlerName);
              if (res.tossWinnerId) {
                setTossResult({ 
                  winner: res.tossWinnerId === config.teamAId ? 'A' : 'B', 
                  decision: res.tossDecision || 'bat' 
                });
              }
            } else {
              setIsConfiguringMatch(true); 
            }
          }
        } else {
          setResumeFailed(true);
        }
      });
    } else {
      console.log('[Scoring] No urlMatchId found');
    }
    if (live === 'true' || directStart === 'true') {
      if (live === 'true') setIsLiveSession(true);
      setIsSelectingTeams(true);
    }
    if (createTeam === 'true') {
      setIsCreateTeamModalVisible(true);
    }
    fetchTeams();
    fetchMatches();

    const channel = supabase
      .channel(`live-hub-scores-${Math.random()}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_live_state' 
      }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const searchGrounds = async (query: string) => {
    setMatchConfig(prev => ({ ...prev, ground: query }));
    if (query.trim().length < 2) {
      setGroundResults([]);
      setShowGroundDropdown(false);
      return;
    }

    setIsSearchingGround(true);
    setShowGroundDropdown(true);
    try {
      const { data, error } = await supabase
        .from('grounds')
        .select('*')
        .ilike('name', `%${query}%`)
        .eq('active', true)
        .limit(10);

      if (error) throw error;
      setGroundResults(data || []);
    } catch (e) {
      console.error('Error searching grounds:', e);
    } finally {
      setIsSearchingGround(false);
    }
  };

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*, match_live_state(*), innings(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Map DB matches to UI format
      const dbMatches = data.map(m => {
        const live = m.match_live_state;
        // Robust check: if match is tagged 'live' OR has any live score state, it's 'Live'
        // Improved check: Use DB status primarily, but trust live state if it says 'completed' or 'Result'
        // Fallback: If overs are actually finished in the 2nd innings, it's a 'Result'
        const secondInn = m.innings?.find((i: any) => i.innings_number === 2);
        const firstInn = m.innings?.find((i: any) => i.innings_number === 1);
        const oversLimit = Number(m.overs || 20) * 6;
        
        // Comprehensive check for match completion (DB state OR mathematical completion)
        const dbCompleted = m.status === 'completed' || m.status === 'Result';
        const liveCompleted = live?.match_status === 'completed' || live?.match_status === 'Result';
        const mathCompleted = (secondInn && Number(secondInn.wickets) >= (Number(m.players || 11) - 1)) || 
                              (secondInn && Number(secondInn.legal_balls) >= oversLimit) ||
                              (secondInn && secondInn.target && secondInn.runs >= secondInn.target) ||
                              (live?.innings_number === 2 && (Number(live.legal_balls) >= oversLimit || (live.target && live.runs >= live.target)));

        const isCompleted = dbCompleted || liveCompleted || !!mathCompleted;
        const isLive = !isCompleted && (m.status === 'live' || m.status === 'innings_break' || !!live);
        const status = isCompleted ? 'Result' : (isLive ? 'Live' : 'Upcoming');
        
        let team1Score = undefined;
        let team1Overs = undefined;
        let team2Score = undefined;
        let team2Overs = undefined;

        if (live) {
          // Determine which team is batting based on the live state
          const isTeamABatting = live.batting_team === m.team_a;
          const currentScore = `${live.runs}/${live.wickets}`;
          const currentOvers = `(${Math.floor(live.legal_balls / 6)}.${live.legal_balls % 6} Ov)`;

          if (isTeamABatting) {
            team1Score = currentScore;
            team1Overs = currentOvers;
          } else {
            team2Score = currentScore;
            team2Overs = currentOvers;
          }

          // If it's 2nd innings, try to find 1st innings score for the other team
          if (m.innings && m.innings.length > 0) {
            const firstInn = m.innings.find((i: any) => i.innings_number === 1);
            if (firstInn) {
              const inn1Score = `${firstInn.runs}/${firstInn.wickets}`;
              const inn1Overs = `(${Math.floor(firstInn.legal_balls / 6)}.${firstInn.legal_balls % 6} Ov)`;
              
              if (firstInn.batting_team === m.team_a) {
                team1Score = inn1Score;
                team1Overs = inn1Overs;
              } else {
                team2Score = inn1Score;
                team2Overs = inn1Overs;
              }
            }
          }
        } else if (m.innings && m.innings.length > 0) {
          // If not live but has innings (completed match)
          const inn1 = m.innings.find((i: any) => i.innings_number === 1);
          const inn2 = m.innings.find((i: any) => i.innings_number === 2);
          
          if (inn1) {
            if (inn1.batting_team === m.team_a) {
              team1Score = `${inn1.runs}/${inn1.wickets}`;
              team1Overs = `(${Math.floor(inn1.legal_balls / 6)}.${inn1.legal_balls % 6} Ov)`;
            } else {
              team2Score = `${inn1.runs}/${inn1.wickets}`;
              team2Overs = `(${Math.floor(inn1.legal_balls / 6)}.${inn1.legal_balls % 6} Ov)`;
            }
          }
          if (inn2) {
            if (inn2.batting_team === m.team_a) {
              team1Score = `${inn2.runs}/${inn2.wickets}`;
              team1Overs = `(${Math.floor(inn2.legal_balls / 6)}.${inn2.legal_balls % 6} Ov)`;
            } else {
              team2Score = `${inn2.runs}/${inn2.wickets}`;
              team2Overs = `(${Math.floor(inn2.legal_balls / 6)}.${inn2.legal_balls % 6} Ov)`;
            }
          }
        }

        return {
          id: m.id,
          type: m.match_type || 'Match',
          tournament: 'Live Match',
          status,
          date: new Date(m.created_at).toLocaleDateString(),
          overs: `${m.overs} Ov.`,
          location: m.venue || 'Various Locations',
          team1: m.team_a,
          team2: m.team_b,
          team1Score,
          team1Overs,
          team2Score,
          team2Overs,
          result: m.result_text || live?.result_text,
          isLive: m.status === 'live',
          match_id: m.id,
          batting_team: live?.batting_team
                };
      });
      setFetchedMatches(dbMatches);
    }
  };

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Map DB teams to UI format
      const dbTeams = data.map(t => ({
        ...t,
        isUserTeam: t.owner_id === session?.user?.id,
        initials: t.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
        bgColor: '#01b854',
        image: t.image_url 
      }));
      setTeams([...dbTeams, ...INITIAL_TEAMS_DATA.filter(it => !dbTeams.some(dt => dt.id === it.id))]);
    }
  };

  const uploadLogo = async (uri: string) => {
    try {
      if (!session?.user?.id) throw new Error('User not logged in');
      
      const fileName = `${Date.now()}.png`;
      const filePath = `${session.user.id}/${fileName}`;
      
      // On web, uri is often a blob or blob URL
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { data, error } = await supabase.storage
        .from('team-logos')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/png',
          upsert: true,
});

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (err) {
      console.error('Logo upload failed:', err);
      return null;
    }
  };

  const handleCreateTeam = async () => {
    if (!session?.user?.id) {
       alert('Please login to create a team');
       return;
    }

    if (!teamForm.name || !teamForm.location || !teamForm.captain) {
      alert('Please fill all fields');
      return;
    }

    setIsSubmitting(true);
    let publicImageUrl = null;

    try {
      if (teamForm.image) {
      publicImageUrl = await uploadLogo(teamForm.image);
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([{
        name: teamForm.name,
        location: teamForm.location,
        captain: teamForm.captain,
        image_url: publicImageUrl,
        owner_id: session.user.id
      }])
      .select();

      if (error) {
        alert('Error creating team: ' + error.message);
      } else {
        setIsCreateTeamModalVisible(false);
        setTeamForm({ name: '', location: '', captain: '', image: '',
});
        fetchTeams();
        setIsSuccessModalVisible(true);
      }
    } catch (error) {
       alert('Something went wrong. Please try again.');
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleShareTeam = async (team: any) => {
    try {
      const result = await Share.share({
        message: `Join our team "${team.name}" on Book Your Ground! Click the link to join: https://bookyourground.com/invite-team/${team.id}`,
        url: `https://bookyourground.com/invite-team/${team.id}`,
        title: `Join ${team.name}`
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSelectGlobalPlayer = async (player: any) => {
    const currentTeam = currentPickingSide === 'A' ? selectedTeamA : selectedTeamB;
    if (!currentTeam) return;
    
    setIsSearchingGlobal(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert([
          { 
            team_id: currentTeam.id, 
            player_name: player.full_name, 
            player_phone: player.phone,
            profile_id: player.id,
            status: 'accepted'
          }
        ])
        .select();

      if (error) throw error;
      
      if (data && data[0]) {
        // Refresh local team members
        await fetchTeamMembers(currentTeam.id);
        // Automatically select them for Playing XI
        togglePlayer(data[0]);
        // Clear search
        setPlayerSearchQuery('');
        setDbSearchResults([]);
      }
    } catch (err) {
      console.error('Error adding global player:', err);
      alert('Failed to add player to squad.');
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.name || !memberForm.phone) {
      alert('Please fill name and phone');
      return;
    }

    setIsSubmitting(true);
      const { data, error } = await supabase
        .from('team_members')
        .insert([{
          team_id: activeTeamForPlayers.id,
          player_name: memberForm.name,
          player_phone: memberForm.phone,
          status: 'accepted'
        }])
        .select();

    setIsSubmitting(false);

    if (error) {
      alert('Error adding member: ' + error.message);
    } else {
      setIsAddMemberModalVisible(false);
      setMemberForm({ name: '', phone: '',
});
      fetchTeamMembers(activeTeamForPlayers.id);
      
      // Auto-add to Playing XI if in match setup or live scoring
      if (isSelectingOpeners || isSelectingPlayers || isScoring) {
        if (activeTeamForPlayers.id === selectedTeamA?.id) {
          setPlayingXiA(prev => [...prev, data[0]]);
        } else if (activeTeamForPlayers.id === selectedTeamB?.id) {
          setPlayingXiB(prev => [...prev, data[0]]);
        }

        // If match is live, tell the scoring engine about the new player
        if (isScoring) {
          updateMatchConfig({ players: (activeMatchConfig.players || 11) + 1 });
          changeSquad(activeTeamForPlayers.id, [{ name: data[0].player_name }]);
        }
      }
      
      alert('Player added to your squad!');
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*, profiles(avatar_url)')
      .eq('team_id', teamId);
    
    if (data) setTeamMembers(data);
  };

  const handleCreateOfficial = async () => {
    if (!newOfficialForm.name || !newOfficialForm.phone) {
      alert('Please enter name and phone number');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('match_officials')
      .insert([
        { 
          name: newOfficialForm.name, 
          phone: newOfficialForm.phone,
          role: activeOfficialSlot?.category === 'umpires' ? 'Umpire' : 
                activeOfficialSlot?.category === 'scorers' ? 'Scorer' : 'Official'
        }
      ])
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        alert('This mobile number is already registered.');
      } else {
        alert('Error saving official: ' + error.message);
      }
    } else if (data) {
      // Direct select the newly created official
      const { category, index } = activeOfficialSlot!;
      const newOfficials = { ...matchConfig.officials };
      
      if (typeof index === 'number') {
        const arr = [...(newOfficials as any)[category]];
        arr[index] = data.name;
        (newOfficials as any)[category] = arr;
      } else {
        (newOfficials as any)[category] = data.name;
      }

      setMatchConfig({ ...matchConfig, officials: newOfficials,
});
      setIsAddOfficialModalVisible(false);
      setIsSearchingOfficial(false);
      setNewOfficialForm({ name: '', phone: '',
});
      setSearchQuery('');
      alert('New official registered and assigned!');
    }
  };

  useEffect(() => {
    if (isAddPlayerViewVisible && activeTeamForPlayers) {
      fetchTeamMembers(activeTeamForPlayers.id);
    }
  }, [isAddPlayerViewVisible, activeTeamForPlayers]);

  const [selectedTeamB, setSelectedTeamB] = useState<any>(null);
  const [pickingFor, setPickingFor] = useState<'A' | 'B' | null>(null);
  const isCompact = width < 900;

  const MatchCard = ({ match }: { match: any }) => (
    <View style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.matchType}>
            {match.type}, <Text style={styles.matchTournament}>{match.tournament}</Text>
          </Text>
          <Text style={styles.matchMeta}>{match.date} | {match.overs} | {match.location}</Text>
        </View>
        <View style={[
          styles.statusBadge, 
          match.status === 'Result' ? styles.statusBadgeResult : 
          (match.status === 'Live' ? styles.statusBadgeLive : styles.statusBadgeUpcoming)
        ]}>
          {match.status === 'Live' && <View style={styles.pulseDot} />}
          <Text style={[
            styles.statusBadgeText,
            match.status === 'Result' ? styles.statusBadgeTextResult : 
            (match.status === 'Live' ? styles.statusBadgeTextLive : styles.statusBadgeTextUpcoming)
          ]}>{match.status === 'Live' ? 'LIVE' : match.status}</Text>
        </View>
      </View>

      <View style={styles.matchTeams}>
        <View style={styles.matchTeamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.miniAvatar, { width: 32, height: 32, backgroundColor: '#F1F5F9' }]}>
               <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{match.team1 ? match.team1[0] : '?'}</Text>
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{match.team1 || 'TBC'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {match.status === 'Live' && match.batting_team === match.team1 && <View style={styles.liveIndicatorDot} />}
            {match.team1Score && <Text style={styles.teamScoreText}>{match.team1Score} <Text style={styles.teamOversText}>{match.team1Overs}</Text></Text>}
          </View>
        </View>
 
        <View style={styles.matchTeamRow}>
          <View style={styles.teamInfo}>
            <View style={[styles.miniAvatar, { width: 32, height: 32, backgroundColor: '#F1F5F9' }]}>
               <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B' }}>{match.team2 ? match.team2[0] : '?'}</Text>
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>{match.team2 || 'TBC'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {match.status === 'Live' && match.batting_team === match.team2 && <View style={styles.liveIndicatorDot} />}
            {match.team2Score && <Text style={styles.teamScoreText}>{match.team2Score} <Text style={styles.teamOversText}>{match.team2Overs}</Text></Text>}
          </View>
        </View>
      </View>

      {match.status === 'Live' ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          <TouchableOpacity 
            style={[styles.liveActionBtn, { borderTopWidth: 0, marginTop: 0, flex: 1, backgroundColor: '#F0FDF4', borderRadius: 8 }]}
            onPress={() => router.push(`/live/${match.match_id}`)}
          >
            <Text style={styles.liveActionBtnText}>View</Text>
            <ChevronRight size={14} color="#01b854" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.liveActionBtn, { borderTopWidth: 0, marginTop: 0, flex: 1.5, backgroundColor: '#01b854', borderRadius: 8 }]}
            onPress={() => router.push(`/cricket/scoring?matchId=${match.match_id}`)}
          >
            <Text style={[styles.liveActionBtnText, { color: '#FFFFFF' }]}>Resume Scoring</Text>
            <History size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : match.status === 'Result' ? (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }}>
          {match.result && <Text style={[styles.resultText, { marginBottom: 12 }]}>{match.result}</Text>}
        </View>
      ) : (
        <View style={styles.matchFooter}>
          <Text style={styles.messageText}>{match.message}</Text>
        </View>
      )}
    </View>
  );

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

  const TeamCard = ({ team, onSelect, disabled, selected }: { team: any; onSelect?: (team: any) => void, disabled?: boolean, selected?: boolean }) => (
    <TouchableOpacity 
      style={[
        styles.teamCardPremium, 
        selected && styles.teamCardPremiumActive,
        disabled && styles.teamCardPremiumDisabled
      ]}
      onPress={() => {
        if (onSelect) onSelect(team);
        else if (team.isUserTeam) {
          setActiveTeamForPlayers(team);
          setIsAddPlayerViewVisible(true);
        }
      }}
    >
       <View style={[styles.teamAvatarPremium, team.bgColor && { backgroundColor: team.bgColor }, disabled && { backgroundColor: '#E5E7EB' }]}>
          {team.image ? (
            <Image source={{ uri: team.image }} style={styles.teamImage} />
          ) : (
            <Text style={styles.teamInitialsPremium}>{team.initials || (team.name ? team.name[0] : '?')}</Text>
          )}
       </View>
       <View style={styles.teamContentPremium}>
          <View style={{ flex: 1 }}>
             <Text style={[styles.teamTitlePremium, selected && { color: '#01b854' }]} numberOfLines={1}>{team.name}</Text>
             <View style={styles.teamMetaGrid}>
                <View style={styles.metaBadge}>
                   <MapPin size={10} color="#6B7280" />
                   <Text style={styles.metaBadgeText}>{team.location}</Text>
                </View>
                <View style={styles.metaBadge}>
                   <User size={10} color="#6B7280" />
                   <Text style={styles.metaBadgeText}>{team.captain}</Text>
                </View>
             </View>
          </View>
          {onSelect ? (
            <TouchableOpacity 
              style={[styles.selectBtnPremium, selected && styles.selectBtnPremiumActive, disabled && styles.selectBtnPremiumDisabled]} 
              disabled={disabled}
              onPress={() => onSelect(team)}
            >
               <Text style={[styles.selectBtnTextPremium, selected && { color: '#FFFFFF' }]}>{selected ? 'Picked' : disabled ? 'N/A' : 'Select'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.qrIconBtn}
              onPress={() => { setActiveTeamForQr(team); setIsQrModalVisible(true); }}
            >
              <QrCode size={18} color="#01b854" strokeWidth={2} />
            </TouchableOpacity>
          )}
       </View>
    </TouchableOpacity>
  );

  const CreateTeamCard = () => (
    <TouchableOpacity 
      style={[styles.teamCard, styles.createTeamCard]}
      onPress={() => setIsCreateTeamModalVisible(true)}
    >
       <View style={styles.createTeamIcon}>
          <Plus size={24} color="#01b854" />
       </View>
       <View style={styles.teamContent}>
          <Text style={styles.createTeamText}>Create New Team</Text>
          <Text style={styles.createTeamSubtext}>Build your squad from scratch</Text>
       </View>
    </TouchableOpacity>
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1
      });

    if (!result.canceled) {
      setTeamForm({ ...teamForm, image: result.assets[0].uri,
});
    }
  };

  const renderCreateTeamModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isCreateTeamModalVisible}
      onRequestClose={() => setIsCreateTeamModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.createTeamModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Team</Text>
            <TouchableOpacity onPress={() => setIsCreateTeamModalVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Team Name</Text>
            <TextInput 
              style={styles.formInput} 
              placeholder="e.g. Royal Challengers" 
              value={teamForm.name}
              onChangeText={(t) => setTeamForm({...teamForm, name: t})}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Location (State)</Text>
            <TouchableOpacity 
              style={styles.dropdownTrigger}
              onPress={() => setShowStateDropdown(!showStateDropdown)}
            >
              <Text style={[styles.dropdownValue, !teamForm.location && styles.dropdownPlaceholder]}>
                {teamForm.location || 'Select State'}
              </Text>
              <ChevronRight 
                size={20} 
                color="#9CA3AF" 
                style={{ transform: [{ rotate: showStateDropdown ? '90deg' : '0deg' }] }} 
              />
            </TouchableOpacity>

            {showStateDropdown && (
              <View style={styles.statesDropdown}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                  {INDIAN_STATES.map((state) => (
                    <TouchableOpacity 
                      key={state}
                      style={styles.stateItem}
                      onPress={() => {
                        setTeamForm({ ...teamForm, location: state,
});
                        setShowStateDropdown(false);
                      }}
                    >
                      <Text style={styles.stateItemText}>{state}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Captain Name</Text>
            <TextInput 
              style={styles.formInput} 
              placeholder="e.g. Virat Kohli" 
              value={teamForm.captain}
              onChangeText={(t) => setTeamForm({...teamForm, captain: t})}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Team Logo</Text>
            <View style={styles.imagePickerContainer}>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                {teamForm.image ? (
                  <Image source={{ uri: teamForm.image }} style={styles.imagePickerPreview} />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Camera size={24} color="#9CA3AF" />
                    <Text style={styles.imagePickerText}>Choose Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {teamForm.image && (
                <TouchableOpacity 
                   style={styles.removeImageBtn}
                   onPress={() => setTeamForm({...teamForm, image: ''})}
                >
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleCreateTeam}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>{isSubmitting ? 'Creating...' : 'Create Team'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const handleTeamSelect = (team: any) => {
    if (pickingFor === 'A') {
      setSelectedTeamA(team);
      setCurrentPickingSide('A');
      fetchTeamMembers(team.id);
      setIsSelectingPlayers(true);
    } else if (pickingFor === 'B') {
      setSelectedTeamB(team);
      setCurrentPickingSide('B');
      fetchTeamMembers(team.id);
      setIsSelectingPlayers(true);
    }
    setPickingFor(null);
    setIsSelectingTeams(true);
  };

  const renderTeamListModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={pickingFor !== null}
      onRequestClose={() => setPickingFor(null)}
    >
      <TouchableOpacity 
          style={styles.sheetOverlay} 
          activeOpacity={1} 
          onPress={() => setPickingFor(null)}
      >
        <View style={[styles.sheetContent, { height: '85%', backgroundColor: '#FFFFFF' }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={styles.sheetTitle}>Select Team {pickingFor}</Text>
              <Text style={styles.sheetSubtitle}>Search or scan the team to begin the match setup</Text>
            </View>
            <TouchableOpacity onPress={() => setPickingFor(null)} style={styles.closeBtnPremium}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 20 }}>
            <TouchableOpacity 
              style={[{ flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F3F4F6' }, teamSelectionTab === 'search' && { backgroundColor: '#06392e' }]}
              onPress={() => setTeamSelectionTab('search')}
            >
              <Search size={18} color={teamSelectionTab === 'search' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[{ fontSize: 14, fontWeight: '700', color: '#6B7280' }, teamSelectionTab === 'search' && { color: '#FFFFFF' }]}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[{ flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F3F4F6' }, teamSelectionTab === 'scan' && { backgroundColor: '#06392e' }]}
              onPress={async () => {
                if (!cameraPermission?.granted) {
                  const res = await requestCameraPermission();
                  if (!res.granted) return;
                }
                setIsScanningQr(true);
                setTeamSelectionTab('scan');
              }}
            >
              <QrCode size={18} color={teamSelectionTab === 'scan' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[{ fontSize: 14, fontWeight: '700', color: '#6B7280' }, teamSelectionTab === 'scan' && { color: '#FFFFFF' }]}>Scan QR</Text>
            </TouchableOpacity>
          </View>

          {teamSelectionTab === 'search' && (
            <View style={[styles.searchBarContainer, { marginHorizontal: 24, marginTop: 0, marginBottom: 12, elevation: 0, shadowOpacity: 0 }]}>
              <Search size={18} color="#9CA3AF" />
              <TextInput 
                placeholder="Find a team by name..." 
                placeholderTextColor="#9CA3AF" 
                style={styles.searchInput} 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
                autoFocus
              />
            </View>
          )}

          {scannedTeam && (
            <View style={[styles.scannedTeamResult, { marginHorizontal: 24, marginBottom: 16 }]}>
               <View style={styles.scannedHeader}>
                  <ShieldCheck size={18} color="#01b854" />
                  <Text style={styles.scannedTitle}>Team Found via QRScan</Text>
                  <TouchableOpacity onPress={() => setScannedTeam(null)}>
                     <X size={18} color="#6B7280" />
                  </TouchableOpacity>
               </View>
               <TeamCard 
                 team={scannedTeam} 
                 onSelect={(t) => {
                   handleTeamSelect(t);
                   setScannedTeam(null);
                   setTeamSelectionTab('search');
                 }}
               />
            </View>
          )}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingTop: 0 }}>
            <Text style={[styles.sectionHeading, { marginBottom: 16, fontSize: 13, color: '#9CA3AF' }]}>
              {searchQuery ? 'SEARCH RESULTS' : 'AVAILABLE TEAMS'}
            </Text>
            {teams
              .filter(team => team.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(team => {
                const isSelectedA = selectedTeamA?.id === team.id;
                const isSelectedB = selectedTeamB?.id === team.id;
                const isDisabled = (pickingFor === 'A' && isSelectedB) || (pickingFor === 'B' && isSelectedA);
                
                return (
                  <TeamCard 
                    key={team.id} 
                    team={team} 
                    onSelect={isDisabled ? undefined : handleTeamSelect}
                    selected={isSelectedA || isSelectedB}
                    disabled={isDisabled}
                  />
                );
              })
            }
            {teams.filter(team => team.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <View style={[styles.noResultArea, { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 40, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E5E7EB' }]}>
                <Users size={48} color="#E5E7EB" />
                <Text style={styles.noResultTitle}>No Teams Found</Text>
                <Text style={styles.noResultSub}>Try searching for another name or create a new team to begin.</Text>
                <TouchableOpacity 
                   style={[styles.placeholderBtn, { marginTop: 24, backgroundColor: '#01b854' }]}
                   onPress={() => {
                     setPickingFor(null);
                     setIsCreateTeamModalVisible(true);
                   }}
                >
                   <Plus size={20} color="#FFFFFF" />
                   <Text style={styles.placeholderBtnText}>Create New Team</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderTeamSelection = () => (
    <View style={styles.selectionView}>
      <View style={styles.selectionHeader}>
        <TouchableOpacity onPress={() => { setIsSelectingTeams(false); setSelectedTeamA(null); setSelectedTeamB(null); setPickingFor(null); }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.selectionTitle}>Match Setup</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.teamSelectionRow}>
        <TouchableOpacity 
          style={[styles.teamSlot, selectedTeamA && styles.teamSlotFilled]}
          onPress={() => { setPickingFor('A'); setSearchQuery(''); }}
        >
          {selectedTeamA ? (
            <>
               <View style={styles.slotAvatar}>
                  {selectedTeamA.image ? <Image source={{ uri: selectedTeamA.image }} style={styles.slotImage} /> : <Text style={styles.slotInitials}>{selectedTeamA.initials}</Text>}
               </View>
               <Text style={styles.slotName}>{selectedTeamA.name}</Text>
            </>
          ) : (
            <View style={styles.emptySlot}>
               <Users2 size={32} color="#9CA3AF" />
               <Text style={styles.slotAction}>Select Team A</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <TouchableOpacity 
          style={[styles.teamSlot, selectedTeamB && styles.teamSlotFilled]}
          onPress={() => { setPickingFor('B'); setSearchQuery(''); }}
        >
          {selectedTeamB ? (
            <>
               <View style={styles.slotAvatar}>
                  {selectedTeamB.image ? <Image source={{ uri: selectedTeamB.image }} style={styles.slotImage} /> : <Text style={styles.slotInitials}>{selectedTeamB.initials}</Text>}
               </View>
               <Text style={styles.slotName}>{selectedTeamB.name}</Text>
            </>
          ) : (
            <View style={styles.emptySlot}>
               <Users2 size={32} color="#9CA3AF" />
               <Text style={styles.slotAction}>Select Team B</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {selectedTeamA && selectedTeamB && (
        <TouchableOpacity 
          style={styles.startMatchBtn}
          onPress={() => setIsSelectingPlayers(true)}
        >
           <Text style={styles.startMatchBtnText}>Select Playing XI</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderQrScannerModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isScanningQr}
      onRequestClose={() => setIsScanningQr(false)}
    >
      <View style={styles.fullModalScanner}>
        <View style={styles.scannerHeader}>
           <Text style={styles.scannerTitle}>Scan Team QR</Text>
           <TouchableOpacity onPress={() => setIsScanningQr(false)} style={styles.scannerClose}>
              <X size={24} color="#FFFFFF" />
           </TouchableOpacity>
        </View>
        
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={async ({ data }) => {
            if (data.startsWith('team_')) {
              const teamId = data.replace('team_', '');
              setIsScanningQr(false);
              setIsSearchingScannedTeam(true);
              try {
                const { data: team, error } = await supabase
                  .from('teams')
                  .select('*')
                  .eq('id', teamId)
                  .maybeSingle();
                if (team) setScannedTeam(team);
              } catch (err) {
                console.error('QR Search error:', err);
              } finally {
                setIsSearchingScannedTeam(false);
              }
            }
          }}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        <View style={styles.scannerOverlay}>
           <View style={styles.scannerFrame} />
           <Text style={styles.scannerHint}>Position Team QR code within the frame</Text>
        </View>
      </View>
    </Modal>
  );

  const renderWagonWheelModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isWagonWheelVisible}
      onRequestClose={() => setIsWagonWheelVisible(false)}
    >
      <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsWagonWheelVisible(false)}
      >
        <View style={[styles.qrModalContent, { width: '95%', maxWidth: 500, height: 600 }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Wagon Wheel</Text>
              <Text style={styles.sheetSubtitle}>{pendingRuns} run{pendingRuns > 1 ? 's' : ''} scored. Select area:</Text>
            </View>
            <TouchableOpacity onPress={() => setIsWagonWheelVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.wagonWheelContainer}>
             {/* Ground Visualization */}
             <View style={styles.groundOuter}>
                <View style={styles.groundInner}>
                    {/* Divider Lines */}
                    <View style={styles.dividerLine} />
                    <View style={[styles.dividerLine, { transform: [{ rotate: '45deg' }] }]} />
                    <View style={[styles.dividerLine, { transform: [{ rotate: '90deg' }] }]} />
                    <View style={[styles.dividerLine, { transform: [{ rotate: '135deg' }] }]} />

                    {/* Regions */}
                    <TouchableOpacity style={[styles.region, styles.longOff]} onPress={() => handleWagonWheelSelect('Long Off')}><Text style={styles.regionLabel}>Long Off</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.region, styles.longOn]} onPress={() => handleWagonWheelSelect('Long On')}><Text style={styles.regionLabel}>Long On</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.region, styles.cover]} onPress={() => handleWagonWheelSelect('Cover')}><Text style={styles.regionLabel}>Cover</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.region, styles.midWicket]} onPress={() => handleWagonWheelSelect('Mid Wicket')}><Text style={styles.regionLabel}>Mid Wicket</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.region, styles.point]} onPress={() => handleWagonWheelSelect('Point')}><Text style={styles.regionLabel}>Point</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.region, styles.squareLeg]} onPress={() => handleWagonWheelSelect('Square Leg')}><Text style={styles.regionLabel}>Square Leg</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.region, styles.thirdMan]} onPress={() => handleWagonWheelSelect('Third Man')}><Text style={styles.regionLabel}>Third Man</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.region, styles.fineLeg]} onPress={() => handleWagonWheelSelect('Fine Leg')}><Text style={styles.regionLabel}>Fine Leg</Text></TouchableOpacity>
                    
                    <View style={styles.pitchCenter} />
                </View>
             </View>
             
             <TouchableOpacity style={styles.skipBtn} onPress={() => handleWagonWheelSelect('N/A')}>
                <Text style={styles.skipBtnText}>Skip Once</Text>
             </TouchableOpacity>

             <TouchableOpacity 
               style={[styles.skipBtn, { marginTop: 12, backgroundColor: '#FEF2F2' }]} 
               onPress={() => {
                 setMatchConfig({ ...matchConfig, wagonWheel: false });
                 handleWagonWheelSelect('N/A');
               }}
             >
                <Text style={[styles.skipBtnText, { color: '#B91C1C' }]}>Skip for this Inning</Text>
             </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderMatchInfoModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isMatchInfoVisible}
      onRequestClose={() => setIsMatchInfoVisible(false)}
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
              onPress={() => setIsMatchInfoVisible(false)}
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
                           <Text style={styles.officialInitial}>{u.charAt(0)}</Text>
                        </View>
                        <View>
                           <Text style={styles.officialNamePremium}>{u}</Text>
                           <Text style={styles.officialRolePremium}>Umpire {i+1}</Text>
                        </View>
                     </View>
                   ))}
                   
                   {matchConfig.officials.scorers.map((s, i) => s && (
                     <View key={`s-${i}`} style={styles.officialCard}>
                        <View style={[styles.officialAvatar, { backgroundColor: '#F0F9FF' }]}>
                           <Text style={[styles.officialInitial, { color: '#0369A1' }]}>{s.charAt(0)}</Text>
                        </View>
                        <View>
                           <Text style={styles.officialNamePremium}>{s}</Text>
                           <Text style={styles.officialRolePremium}>Scorer {i+1}</Text>
                        </View>
                     </View>
                   ))}

                   {matchConfig.officials.referee && (
                     <View style={styles.officialCard}>
                        <View style={[styles.officialAvatar, { backgroundColor: '#FDF2F8' }]}>
                           <Text style={[styles.officialInitial, { color: '#BE185D' }]}>{matchConfig.officials.referee.charAt(0)}</Text>
                        </View>
                        <View>
                           <Text style={styles.officialNamePremium}>{matchConfig.officials.referee}</Text>
                           <Text style={styles.officialRolePremium}>Match Referee</Text>
                        </View>
                     </View>
                   )}
                </View>
             </View>
          </ScrollView>

          <View style={styles.modalFooterPremium}>
             <TouchableOpacity 
               style={styles.closeBtnFooter}
               onPress={() => setIsMatchInfoVisible(false)}
             >
                <Text style={styles.closeBtnFooterText}>Done</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderQrModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isQrModalVisible}
      onRequestClose={() => setIsQrModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsQrModalVisible(false)}
      >
        <View style={styles.qrModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Team QR Code</Text>
            <TouchableOpacity onPress={() => setIsQrModalVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {activeTeamForQr && (
            <View style={styles.qrBody}>
              <View style={styles.qrCard}>
                <View style={styles.qrHeader}>
                   <View style={[styles.teamAvatarQr, activeTeamForQr.bgColor && { backgroundColor: activeTeamForQr.bgColor }]}>
                      {activeTeamForQr.image ? <Image source={{ uri: activeTeamForQr.image }} style={styles.teamImage} /> : <Text style={styles.teamInitialsQr}>{activeTeamForQr.initials}</Text>}
                   </View>
                   <View>
                      <Text style={styles.qrTeamName}>{activeTeamForQr.name}</Text>
                      <Text style={styles.qrTeamMeta}>{activeTeamForQr.location} • Captain: {activeTeamForQr.captain}</Text>
                   </View>
                </View>

                <View style={styles.qrContainer}>
                  <Image 
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=team_${activeTeamForQr.id}` }} 
                    style={styles.qrImage} 
                  />
                </View>
                
                <Text style={styles.qrFooterText}>Scan to follow this team or invite to match</Text>
              </View>

              <TouchableOpacity style={styles.downloadBtn}>
                <Text style={styles.downloadBtnText}>Download QR Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isSuccessModalVisible}
      onRequestClose={() => setIsSuccessModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsSuccessModalVisible(false)}
      >
        <View style={styles.successModalContent}>
          <View style={styles.successIconWrapper}>
             <Plus size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Hooray!</Text>
          <Text style={styles.successMessage}>Your team has been created and saved successfully.</Text>
          
          <TouchableOpacity 
            style={styles.successCloseBtn}
            onPress={() => setIsSuccessModalVisible(false)}
          >
            <Text style={styles.successCloseBtnText}>Great, thanks!</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
    );
  
  const renderPlayerSelection = () => {
    const currentTeam = currentPickingSide === 'A' ? selectedTeamA : selectedTeamB;
    const currentXi = currentPickingSide === 'A' ? playingXiA : playingXiB;
    const setXi = currentPickingSide === 'A' ? setPlayingXiA : setPlayingXiB;
    const currentCaptain = currentPickingSide === 'A' ? teamACaptain : teamBCaptain;
    const setCaptain = currentPickingSide === 'A' ? setTeamACaptain : setTeamBCaptain;

    const togglePlayer = (player: any) => {
      const exists = currentXi.find((p: any) => p.id === player.id);
      if (exists) {
        setXi(currentXi.filter((p: any) => p.id !== player.id));
        if (currentCaptain?.id === player.id) setCaptain(null);
      } else {
        setXi([...currentXi, player]);
      }
    };

    const toggleCaptain = (player: any) => {
        if (currentCaptain?.id === player.id) {
            setCaptain(null);
        } else {
            setCaptain(player);
            // Ensure captain is in the XI
            if (!currentXi.find((p: any) => p.id === player.id)) {
                setXi([...currentXi, player]);
            }
        }
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSelectingPlayers}
        onRequestClose={() => setIsSelectingPlayers(false)}
      >
        <TouchableOpacity 
          style={styles.sheetOverlay} 
          activeOpacity={1} 
          onPress={() => { setIsSelectingPlayers(false); setPlayerSearchQuery(''); }}
        >
          <Pressable 
            style={[styles.sheetContent, { height: '85%' }]}
            onPress={(e) => {
              if (Platform.OS === 'web') {
                (e as any).stopPropagation();
              }
            }}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.sheetTitle}>Select Playing XI</Text>
                <Text style={styles.sheetSubtitle}>{currentTeam?.name} • {currentXi.length} picked {currentCaptain ? '• Captain set' : '• Pick a Captain'}</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsSelectingPlayers(false); setPlayerSearchQuery(''); }} style={styles.closeBtnPremium}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchContainer, { marginHorizontal: 24, marginBottom: 16 }]}>
              <Search size={18} color="#9CA3AF" />
              <TextInput 
                style={styles.modalSearchInput}
                placeholder="Search player..."
                value={playerSearchQuery}
                onChangeText={setPlayerSearchQuery}
                // @ts-ignore
                outlineStyle="none"
              />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
               {/* Search results from existing team squad */}
               <View style={{ marginBottom: 16 }}>
                 <Text style={{ fontSize: 12, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Team Squad</Text>
               </View>

               {teamMembers
                  .filter(m => 
                    m.player_name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
                    (m.player_phone && m.player_phone.includes(playerSearchQuery))
                  ).length === 0 && playerSearchQuery === '' ? (
                  <View style={styles.noResultArea}>
                     <Users size={48} color="#E5E7EB" />
                     <Text style={styles.noResultTitle}>No Players Found</Text>
                     <Text style={styles.noResultSub}>Add players to your team squad first</Text>
                     <TouchableOpacity 
                       style={styles.addNewOfficialBtn}
                       onPress={() => {
                         setActiveTeamForPlayers(currentTeam);
                         setIsAddMemberModalVisible(true);
                       }}
                     >
                        <Plus size={20} color="#01b854" />
                        <Text style={styles.addNewOfficialText}>Add Player to Squad</Text>
                     </TouchableOpacity>
                  </View>
               ) : (
                 <>
                   {teamMembers
                     .filter(m => 
                       m.player_name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
                       (m.player_phone && m.player_phone.includes(playerSearchQuery))
                     )
                     .map((member, idx) => {
                     const isSelected = !!currentXi.find((p: any) => p.id === member.id);
                     const isCaptain = currentCaptain?.id === member.id;
                     
                     return (
                     <View key={idx} style={[styles.playerSelectRow, isSelected && styles.playerSelectRowActive]}>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                          onPress={() => togglePlayer(member)}
                        >
                          <View style={styles.avatarCircle}>
                             {member.profiles?.avatar_url ? (
                               <Image source={{ uri: member.profiles.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                             ) : (
                               <User size={24} color="#6B7280" />
                             )}
                          </View>
                          <View style={{ flex: 1 }}>
                             <Text style={[styles.playerNameText, isSelected && { color: '#01b854' }]}>{member.player_name}</Text>
                             <Text style={{ fontSize: 12, color: '#6B7280' }}>All-rounder</Text>
                          </View>
                          <View style={[styles.checkBox, isSelected && styles.checkBoxActive]}>
                             {isSelected && <Plus size={14} color="#FFFFFF" style={{ transform: [{ rotate: '45deg' }] }} />}
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.captainPickBtn, isCaptain && styles.captainPickBtnActive]}
                          onPress={() => toggleCaptain(member)}
                        >
                           <Crown size={16} color={isCaptain ? '#01b854' : '#9CA3AF'} />
                           {isCaptain && <Text style={[styles.captainPickText, styles.captainPickTextActive]}>CAPTAIN</Text>}
                        </TouchableOpacity>
                     </View>
                     );
                   })}
                 </>
               )}

               {/* Global Search Results from Database */}
               {dbSearchResults.length > 0 && (
                 <View style={{ marginTop: 24 }}>
                   <View style={{ marginBottom: 12 }}>
                     <Text style={{ fontSize: 12, fontWeight: '800', color: '#01b854', textTransform: 'uppercase', letterSpacing: 1 }}>Search in BookYourGround</Text>
                   </View>
                   {dbSearchResults.map((player, idx) => (
                     <TouchableOpacity 
                       key={`global-${idx}`} 
                       style={[styles.playerSelectRow, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}
                       onPress={() => handleSelectGlobalPlayer(player)}
                     >
                        <View style={styles.avatarCircle}>
                           {player.avatar_url ? (
                             <Image source={{ uri: player.avatar_url }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                           ) : (
                             <User size={24} color="#6B7280" />
                           )}
                        </View>
                        <View style={{ flex: 1 }}>
                           <Text style={styles.playerNameText}>{player.full_name}</Text>
                           {player.phone && <Text style={{ fontSize: 12, color: '#6B7280' }}>{player.phone}</Text>}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#5EEAD4' }}>
                           <PlusCircle size={16} color="#0D9488" />
                           <Text style={{ fontSize: 12, fontWeight: '700', color: '#0D9488' }}>Add</Text>
                        </View>
                     </TouchableOpacity>
                   ))}
                 </View>
               )}

               {isSearchingDb && (
                 <View style={{ marginTop: 20, alignItems: 'center' }}>
                   <ActivityIndicator size="small" color="#01b854" />
                   <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Searching database...</Text>
                 </View>
               )}
            </ScrollView>

            <View style={{ padding: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
               <TouchableOpacity 
                 style={[styles.startMatchBtn, { marginTop: 0 }, (currentXi.length === 0 || !currentCaptain) && { opacity: 0.5 }]}
                 onPress={() => {
                    const side = currentPickingSide === 'A' ? 'A' : 'B';
                    if (currentXi.length === 0) {
                      alert(`Please select at least 1 player for Team ${side}`);
                      return;
                    }
                    if (!currentCaptain) {
                      alert(`Please select a Captain for Team ${side}`);
                      return;
                    }
                    
                    setIsSelectingPlayers(false);
                    if (side === 'B') setIsConfiguringMatch(true);
                    
                    if (urlMatchId && currentTeam) {
                      savePlayingXi(urlMatchId as string, currentTeam.id, currentXi, currentCaptain.id);
                    }
                    setPlayerSearchQuery('');
                  }}
               >
                  <Text style={styles.startMatchBtnText}>Confirm Team {currentPickingSide} XI ({currentXi.length})</Text>
               </TouchableOpacity>
            </View>
          </Pressable>
        </TouchableOpacity>
      </Modal>
    );
  };


  const renderFullScorecardModal = () => (
    <Modal
      animationType="slide"
      visible={isFullScorecardVisible}
      onRequestClose={() => setIsFullScorecardVisible(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={[styles.modalHeader, { paddingHorizontal: 20 }]}>
          <Text style={styles.modalTitle}>Full Scorecard</Text>
          <TouchableOpacity onPress={() => setIsFullScorecardVisible(false)}><X size={24} color="#06392e" /></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 20 }}>
           <Text style={{ fontSize: 18, fontWeight: '800', color: '#06392e', marginBottom: 12 }}>{inn.battingTeam} Batting</Text>
           {inn.batters.filter(b => b.status !== 'yet').map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                 <View style={{ flex: 2 }}>
                    <Text style={{ fontWeight: '700', color: '#06392e' }}>{b.name}{b.onStrike ? '*' : ''}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>{b.dismissal || (b.status === 'batting' ? 'not out' : 'yet to bat')}</Text>
                 </View>
                 <View style={{ flexDirection: 'row', gap: 15 }}>
                    <Text style={{ fontWeight: '700' }}>{b.runs}</Text>
                    <Text style={{ color: '#6B7280' }}>{b.balls}</Text>
                    <Text style={{ color: '#6B7280' }}>{b.fours}x4</Text>
                    <Text style={{ color: '#6B7280' }}>{b.sixes}x6</Text>
                 </View>
              </View>
           ))}
           <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#06392e', marginBottom: 12 }}>{inn.bowlingTeam} Bowling</Text>
              {inn.bowlers.map((b, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                   <Text style={{ flex: 2, fontWeight: '700' }}>{b.name}</Text>
                   <View style={{ flexDirection: 'row', gap: 15 }}>
                      <Text style={{ fontWeight: '700' }}>{b.wickets}-{b.runs}</Text>
                      <Text style={{ color: '#6B7280' }}>({b.overs}.{b.balls})</Text>
                   </View>
                </View>
              ))}
           </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderRetiredHurtSelectionModal = () => {
    const activeBatters = inn.batters.filter(b => b.status === 'batting' && !b.out);
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isRetiredHurtModalVisible}
        onRequestClose={() => setIsRetiredHurtModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsRetiredHurtModalVisible(false)}>
           <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Player to Retire</Text>
              <View style={{ gap: 12, marginTop: 20 }}>
                 {activeBatters.map(b => (
                    <TouchableOpacity 
                      key={b.name} 
                      style={{ padding: 16, backgroundColor: '#F9FAF7', borderRadius: 12 }}
                      onPress={() => {
                        markRetiredHurt(b.name);
                        setIsRetiredHurtModalVisible(false);
                      }}
                    >
                       <Text style={{ fontWeight: '700', color: '#06392e' }}>{b.name}</Text>
                    </TouchableOpacity>
                 ))}
              </View>
           </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderReviseTargetModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isReviseTargetModalVisible}
      onRequestClose={() => setIsReviseTargetModalVisible(false)}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsReviseTargetModalVisible(false)}>
        <View style={styles.modalContent}>
           <Text style={styles.modalTitle}>Revise Target</Text>
           <Text style={{ color: '#6B7280', marginTop: 8 }}>Enter the new target runs for the second innings.</Text>
           <TextInput 
             style={[styles.formInput, { marginTop: 20 }]}
             placeholder="New Target"
             keyboardType="numeric"
             value={newTargetValue}
             onChangeText={setNewTargetValue}
             autoFocus
           />
           <TouchableOpacity 
             style={[styles.startMatchBtn, { marginTop: 20 }]}
             onPress={() => {
                const nt = parseInt(newTargetValue);
                if (!isNaN(nt)) {
                   reviseTarget(nt);
                   setIsReviseTargetModalVisible(false);
                   setNewTargetValue('');
                }
             }}
           >
              <Text style={styles.startMatchBtnText}>Update Target</Text>
           </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderHelpModal = () => (
    <Modal animationType="fade" transparent={true} visible={isHelpModalVisible} onRequestClose={() => setIsHelpModalVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsHelpModalVisible(false)}>
        <View style={styles.modalContent}>
           <Text style={styles.modalTitle}>Scoring Help</Text>
           <View style={{ gap: 12, marginTop: 16 }}>
              <Text style={{ color: '#4B5563' }}>• Use the numeric keypad for runs.</Text>
              <Text style={{ color: '#4B5563' }}>• Tap 'WD' for Wide, 'NB' for No Ball.</Text>
              <Text style={{ color: '#4B5563' }}>• Tap 'W' to record a wicket and select dismissal.</Text>
              <Text style={{ color: '#4B5563' }}>• Use 'Undo' to revert the last ball.</Text>
              <Text style={{ color: '#4B5563' }}>• Access 'More' for advanced match management.</Text>
           </View>
           <TouchableOpacity style={[styles.startMatchBtn, { marginTop: 20 }]} onPress={() => setIsHelpModalVisible(false)}>
              <Text style={styles.startMatchBtnText}>Got it!</Text>
           </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderRulesModal = () => (
    <Modal animationType="fade" transparent={true} visible={isRulesModalVisible} onRequestClose={() => setIsRulesModalVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsRulesModalVisible(false)}>
        <View style={styles.modalContent}>
           <Text style={styles.modalTitle}>Match Rules</Text>
           <View style={{ gap: 16, marginTop: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                 <Text style={{ color: '#6B7280' }}>Total Overs:</Text>
                 <Text style={{ fontWeight: '700' }}>{matchConfig?.overs || '20'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                 <Text style={{ color: '#6B7280' }}>Overs per Bowler:</Text>
                 <Text style={{ fontWeight: '700' }}>{matchConfig?.oversPerBowler || '4'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                 <Text style={{ color: '#6B7280' }}>Wide Runs:</Text>
                 <Text style={{ fontWeight: '700' }}>1</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                 <Text style={{ color: '#6B7280' }}>No Ball Runs:</Text>
                 <Text style={{ fontWeight: '700' }}>1 + Free Hit</Text>
              </View>
           </View>
           <TouchableOpacity style={[styles.startMatchBtn, { marginTop: 20 }]} onPress={() => setIsRulesModalVisible(false)}>
              <Text style={styles.startMatchBtnText}>Close</Text>
           </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderChangeOversModal = () => (
    <Modal animationType="fade" transparent={true} visible={isChangeOversModalVisible} onRequestClose={() => setIsChangeOversModalVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsChangeOversModalVisible(false)}>
        <View style={styles.modalContent}>
           <Text style={styles.modalTitle}>Set Match Overs</Text>
           <TextInput 
             style={[styles.formInput, { marginTop: 20 }]}
             placeholder="e.g. 20"
             keyboardType="numeric"
             value={newOversValue}
             onChangeText={setNewOversValue}
           />
           <TouchableOpacity 
             style={[styles.startMatchBtn, { marginTop: 20 }]}
             onPress={() => {
                const ov = parseInt(newOversValue);
                if (!isNaN(ov)) {
                   updateMatchConfig({ overs: ov.toString() });
                   setIsChangeOversModalVisible(false);
                }
             }}
           >
              <Text style={styles.startMatchBtnText}>Update Overs</Text>
           </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderBreakModal = () => (
    <Modal animationType="fade" transparent={true} visible={isBreakModalVisible} onRequestClose={() => setIsBreakModalVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsBreakModalVisible(false)}>
        <View style={styles.modalContent}>
           <Text style={styles.modalTitle}>Match Interrupted</Text>
           <View style={{ gap: 12, marginTop: 20 }}>
              {['Drinks Break', 'Lunch', 'Tea', 'Rain Delay', 'Bad Light'].map(type => (
                <TouchableOpacity 
                   key={type} 
                   style={{ padding: 16, backgroundColor: '#F9FAF7', borderRadius: 12 }}
                   onPress={() => {
                      setActiveBreakType(type);
                      setIsBreakModalVisible(false);
                      alert(`Match is now in ${type}. Stop the clock!`);
                   }}
                >
                   <Text style={{ fontWeight: '700', color: '#06392e' }}>{type}</Text>
                </TouchableOpacity>
              ))}
           </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderMatchConfiguration = () => {
    const types = [
      { id: 'limited overs', label: 'Limited Overs' },
      { id: 'box cricket', label: 'Box Cricket' },
      { id: 'pair cricket', label: 'Pair Cricket' },
      { id: 'test match', label: 'Test Match' },
      { id: 'the hundred', label: 'The Hundred' }
    ];

    return (
      <View style={styles.selectionView}>
         <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => setIsConfiguringMatch(false)}>
               <ChevronRight size={28} color="#01b854" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>Match Details</Text>
            <View style={{ width: 40 }} />
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                        <View style={styles.vsDisplay}>
               <TouchableOpacity 
                 style={styles.vsTeam}
                 onPress={() => {
                   setCurrentPickingSide('A');
                   setIsSelectingPlayers(true);
                   setIsConfiguringMatch(false);
                 }}
               >
                  <Text style={styles.vsName}>{selectedTeamA?.name}</Text>
                  <Text style={styles.vsPlayers}>{playingXiA.length} Players</Text>
               </TouchableOpacity>
               <View style={styles.vsBadge}><Text style={styles.vsBadgeText}>VS</Text></View>
               <TouchableOpacity 
                 style={styles.vsTeam}
                 onPress={() => {
                   setCurrentPickingSide('B');
                   setIsSelectingPlayers(true);
                   setIsConfiguringMatch(false);
                 }}
               >
                  <Text style={styles.vsName}>{selectedTeamB?.name}</Text>
                  <Text style={styles.vsPlayers}>{playingXiB.length} Players</Text>
               </TouchableOpacity>
            </View>

            <Text style={styles.configLabel}>Match Type</Text>
            <View style={styles.typeGrid}>
               {types.map(t => (
                 <TouchableOpacity 
                   key={t.id} 
                   style={[styles.typePill, matchConfig.type === t.id && styles.typePillActive]}
                   onPress={() => setMatchConfig({ ...matchConfig, type: t.id })}
                 >
                    <Text style={[styles.typePillText, matchConfig.type === t.id && styles.typePillTextActive]}>{t.label}</Text>
                 </TouchableOpacity>
               ))}
            </View>

            {matchConfig.type !== 'test match' && (
              <View style={{ marginTop: 24 }}>
                 {matchConfig.type === 'the hundred' ? (
                   <View style={styles.hundredInfo}>
                      <Text style={styles.hundredText}>Fixed Format: 100 Balls Match</Text>
                   </View>
                 ) : (
                   <View style={{ gap: 20 }}>
                      <View>
                         <Text style={styles.configLabel}>No. of Overs</Text>
                         <TextInput 
                           style={styles.configInput} 
                           keyboardType="numeric" 
                           value={matchConfig.totalOvers}
                           onChangeText={(val) => setMatchConfig({ ...matchConfig, totalOvers: val })}
                         />
                      </View>
                      <View>
                         <Text style={styles.configLabel}>Overs per Bowler</Text>
                         <TextInput 
                           style={styles.configInput} 
                           keyboardType="numeric" 
                           value={matchConfig.oversPerBowler}
                           onChangeText={(val) => setMatchConfig({ ...matchConfig, oversPerBowler: val })}
                         />
                      </View>
                   </View>
                 )}
              </View>
            )}

            <View style={{ marginTop: 32 }}>
               <Text style={styles.configLabel}>Ball Type</Text>
               <View style={styles.ballTypes}>
                  {['Leather', 'Tennis', 'Other'].map(b => (
                    <TouchableOpacity 
                      key={b} 
                      style={[styles.ballTypeBtn, matchConfig.ballType === b.toLowerCase() && styles.ballTypeBtnActive]}
                      onPress={() => setMatchConfig({ ...matchConfig, ballType: b.toLowerCase() })}
                    >
                       <Text style={[styles.ballText, matchConfig.ballType === b.toLowerCase() && styles.ballTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>

            <View style={{ marginTop: 32 }}>
               <Text style={styles.configLabel}>Wagon Wheel</Text>
               <View style={styles.wagonWheelRow}>
                  <Text style={styles.wagonWheelDesc}>Track scoring areas for each ball</Text>
                  <TouchableOpacity 
                    style={[styles.toggleBg, matchConfig.wagonWheel && styles.toggleBgActive]}
                    onPress={() => setMatchConfig({ ...matchConfig, wagonWheel: !matchConfig.wagonWheel })}
                  >
                     <View style={[styles.toggleCircle, matchConfig.wagonWheel && styles.toggleCircleActive]} />
                  </TouchableOpacity>
               </View>
            </View>

            <View style={{ marginTop: 32 }}>
               <Text style={styles.configLabel}>Pitch Type</Text>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {['Rough', 'Cement Turf', 'Astroturf', 'Matting'].map(p => (
                    <TouchableOpacity 
                      key={p} 
                      style={[styles.pitchBtn, matchConfig.pitchType === p.toLowerCase() && styles.pitchBtnActive]}
                      onPress={() => setMatchConfig({ ...matchConfig, pitchType: p.toLowerCase() })}
                    >
                       <Text style={[styles.pitchText, matchConfig.pitchType === p.toLowerCase() && styles.pitchTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
               </ScrollView>
            </View>

            <View style={{ marginTop: 32, gap: 20 }}>
               <View style={{ zIndex: 5000, position: 'relative' }}>
                  <Text style={styles.configLabel}>State</Text>
                  <TouchableOpacity 
                    style={styles.dropdownTrigger}
                    onPress={() => {
                      setShowStateDropdown(!showStateDropdown);
                      setShowGroundDropdown(false);
                      setIsDatePickerVisible(false);
                    }}
                  >
                     <Text style={[styles.dropdownValue, !matchConfig.state && styles.dropdownPlaceholder]}>
                        {matchConfig.state || 'Select State'}
                     </Text>
                     <ChevronDown size={20} color="#6B7280" />
                  </TouchableOpacity>
                  
                  {showStateDropdown && (
                    <View style={[styles.statesDropdown, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 1000 }]}>
                       <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                          {INDIAN_STATES.map((state) => (
                            <TouchableOpacity 
                              key={state}
                              style={styles.stateItem}
                              onPress={() => {
                                setMatchConfig({ ...matchConfig, state });
                                setShowStateDropdown(false);
                              }}
                            >
                               <Text style={styles.stateItemText}>{state}</Text>
                            </TouchableOpacity>
                          ))}
                       </ScrollView>
                    </View>
                  )}
               </View>

               <View style={{ zIndex: 1, position: 'relative' }}>
                  <Text style={styles.configLabel}>City</Text>
                  <TextInput 
                    style={styles.configInput} 
                    placeholder="Enter City"
                    placeholderTextColor="#9CA3AF"
                    value={matchConfig.city}
                    onChangeText={(val) => setMatchConfig({ ...matchConfig, city: val })}
                  />
               </View>

               <View style={{ zIndex: 4000, position: 'relative' }}>
                   <Text style={styles.configLabel}>Ground</Text>
                   <TextInput 
                     style={styles.configInput} 
                     placeholder="Search or Enter Ground"
                     placeholderTextColor="#9CA3AF"
                     value={matchConfig.ground}
                     onChangeText={(txt) => {
                        searchGrounds(txt);
                        setShowStateDropdown(false);
                        setIsDatePickerVisible(false);
                     }}
                   />
                   
                   {showGroundDropdown && (
                     <View style={[styles.statesDropdown, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 1000 }]}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                           {isSearchingGround ? (
                             <ActivityIndicator color="#01b854" style={{ padding: 20 }} />
                           ) : groundResults.length === 0 ? (
                             <View style={{ padding: 16 }}>
                               <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No grounds found. You can enter manually above.</Text>
                             </View>
                           ) : (
                             groundResults.map((g) => (
                               <TouchableOpacity 
                                 key={g.id}
                                 style={styles.stateItem}
                                 onPress={() => {
                                   setMatchConfig({ ...matchConfig, ground: g.name, city: g.city || matchConfig.city });
                                   setShowGroundDropdown(false);
                                 }}
                               >
                                  <View>
                                    <Text style={styles.stateItemText}>{g.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                      <MapPin size={10} color="#9CA3AF" />
                                      <Text style={{ fontSize: 11, color: '#6B7280' }}>{g.city}, {g.state}</Text>
                                    </View>
                                  </View>
                               </TouchableOpacity>
                             ))
                           )}
                        </ScrollView>
                     </View>
                   )}
                </View>

               <View style={{ zIndex: 1, position: 'relative' }}>
                  <Text style={styles.configLabel}>Date & Time</Text>
                  <TouchableOpacity 
                    style={styles.pickerWrapper}
                    onPress={() => {
                      setIsDatePickerVisible(!isDatePickerVisible);
                      setShowStateDropdown(false);
                      setShowGroundDropdown(false);
                    }}
                  >
                     <Text style={styles.configInput}>
                        {matchConfig.dateTime || 'Select Date & Time'}
                     </Text>
                     <Calendar size={20} color="#6B7280" style={styles.pickerIcon} />
                  </TouchableOpacity>

                  {isDatePickerVisible && (
                    <View style={{ marginTop: 12, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWeight: 1, borderColor: '#E5E7EB' }}>
                      {Platform.OS === 'web' ? (
                        <input 
                          type="datetime-local" 
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            fontSize: '15px',
                            fontFamily: 'inherit',
                            outline: 'none',
                            backgroundColor: '#F9FAF7'
                          }}
                          defaultValue={new Date().toISOString().slice(0, 16)}
                          onChange={(e) => {
                            const val = e.target.value.replace('T', ', ');
                            setMatchConfig({ ...matchConfig, dateTime: val });
                          }}
                        />
                      ) : (
                        <View>
                           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                              {[...Array(7)].map((_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() + i);
                                const isSelected = selectedDate.toDateString() === d.toDateString();
                                return (
                                  <TouchableOpacity 
                                    key={i} 
                                    style={[styles.datePill, isSelected && styles.datePillActive]}
                                    onPress={() => {
                                      setSelectedDate(d);
                                      const formatted = `${d.toLocaleDateString()}, 10:00 AM`;
                                      setMatchConfig({ ...matchConfig, dateTime: formatted });
                                    }}
                                  >
                                     <Text style={[styles.datePillDay, isSelected && styles.datePillTextActive]}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</Text>
                                     <Text style={[styles.datePillNum, isSelected && styles.datePillTextActive]}>{d.getDate()}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                           </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
               </View>
            </View>

            <View style={{ zIndex: -1 }}>
               <TouchableOpacity 
                 style={styles.officialsTrigger}
                 onPress={() => setIsConfiguringOfficials(true)}
               >
                  <View style={styles.officialsTriggerLeft}>
                     <View style={styles.officialIconBox}>
                        <IdCard size={20} color="#01b854" />
                     </View>
                     <View>
                        <Text style={styles.officialsTitle}>Match Officials</Text>
                        <Text style={styles.officialsSub}>Umpires, Scorers, Commentators...</Text>
                     </View>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
               </TouchableOpacity>
            </View>
         </ScrollView>

         <View style={styles.configFooter}>
            <TouchableOpacity 
              style={styles.startMatchMainBtn}
              onPress={() => {
                setIsConfiguringMatch(false);
                setIsConfiguringToss(true);
              }}
            >
               <Text style={styles.startMatchMainBtnText}>Next: Configure Toss</Text>
            </TouchableOpacity>
         </View>
      </View>
    );
  };

  const renderBowlerSelectionModal = () => {
    if (!isSelectingNextBowler || !inn) return null;

    const filteredSquad = squadBowling.filter(name => 
      name.toLowerCase().includes(playerSearchQuery.toLowerCase())
    ).map(name => ({ id: name, player_name: name }));

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSelectingNextBowler}
        onRequestClose={() => {
          setIsSelectingNextBowler(false);
          setPlayerSearchQuery('');
          setIsAddingNewPlayerManually(false);
        }}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { height: '80%' }]}>
             <View style={styles.sheetHandle} />
             <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                <View style={styles.modalHeaderRow}>
                   <View>
                      <Text style={styles.sheetTitle}>Next Over: Choose Bowler</Text>
                      <Text style={styles.sheetSubtitle}>Pick a bowler from {inn.bowlingTeam}</Text>
                   </View>
                   <TouchableOpacity onPress={() => { setIsSelectingNextBowler(false); setPlayerSearchQuery(''); setIsAddingNewPlayerManually(false); }}>
                      <X size={24} color="#6B7280" />
                   </TouchableOpacity>
                </View>

                {!isAddingNewPlayerManually && (
                  <View style={styles.modalSearchContainer}>
                     <Search size={18} color="#9CA3AF" />
                     <TextInput 
                        style={styles.modalSearchInput}
                        placeholder="Search by name or number..."
                        value={playerSearchQuery}
                        onChangeText={setPlayerSearchQuery}
                     />
                  </View>
                )}
             </View>

              <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                 {isAddingNewPlayerManually ? (
                    <View style={{ marginTop: 10, gap: 16 }}>
                       <View style={styles.infoSection}>
                          <Text style={styles.configLabel}>Enter Full Name</Text>
                          <TextInput 
                             style={styles.configInput}
                             placeholder="e.g. Richard Hadlee"
                             value={playerSearchQuery}
                             onChangeText={setPlayerSearchQuery}
                             autoFocus
                          />
                       </View>

                       <View style={styles.infoSection}>
                          <Text style={styles.configLabel}>Phone Number (Optional)</Text>
                          <TextInput 
                             style={styles.configInput}
                             placeholder="e.g. +91 99999 00000"
                             value={manualPlayerPhone}
                             onChangeText={setManualPlayerPhone}
                             keyboardType="phone-pad"
                          />
                       </View>
                       
                       <TouchableOpacity 
                         style={styles.startMatchMainBtn}
                         onPress={async () => {
                            if (playerSearchQuery.trim()) {
                               const name = playerSearchQuery.trim();
                               const phone = manualPlayerPhone.trim();
                               
                               // Persist to Database 
                               if (activeMatchConfig && liveMatchId && inn) {
                                  try {
                                     const battingTeam = tossResult.decision === 'bat' ? tossResult.winner : (tossResult.winner?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA);
                                     const bowlingTeam = battingTeam?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA;
                                     const bowlingTeamId = bowlingTeam?.id;
                                     
                                     if (bowlingTeamId) {
                                        // Update match config count 
                                        updateMatchConfig({ players: (activeMatchConfig.players || 11) + 1 });
                                        
                                        // 1. Add to team_members
                                        const { data: newMember, error: memErr } = await supabase
                                           .from('team_members')
                                           .insert({
                                              team_id: bowlingTeamId,
                                              player_name: name,
                                              player_phone: phone,
                                              status: 'accepted',
                                              role: 'player'
                                           })
                                           .select()
                                           .single();
                                           
                                        if (!memErr && newMember) {
                                           // 2. Add to match_playing_xi
                                           await supabase.from('match_playing_xi').insert({
                                              match_id: liveMatchId,
                                              team_id: bowlingTeamId,
                                              player_id: newMember.id
                                           });
                                           
                                           // Update local squads
                                           if (bowlingTeamId === selectedTeamA?.id) {
                                             setPlayingXiA(prev => [...prev, newMember]);
                                           } else {
                                             setPlayingXiB(prev => [...prev, newMember]);
                                           }
                                        }
                                     }
                                  } catch (err) {
                                     console.error('[Scoring] Error persisting new bowler:', err);
                                  }
                               }

                               addNewBowler(name);
                               setIsSelectingNextBowler(false);
                               setPlayerSearchQuery('');
                               setIsAddingNewPlayerManually(false);
                               setManualPlayerPhone('');
                            }
                         }}
                       >
                          <Text style={styles.startMatchMainBtnText}>Add & Select Bowler</Text>
                       </TouchableOpacity>
                       
                       <TouchableOpacity onPress={() => setIsAddingNewPlayerManually(false)}>
                          <Text style={{ textAlign: 'center', color: '#6B7280', fontSize: 14, fontWeight: '600' }}>Cancel & View Squad</Text>
                       </TouchableOpacity>
                    </View>
                 ) : (
                    <>
                       <View style={styles.playerGrid}>
                           {filteredSquad.map(p => {
                             const bStats = inn?.bowlers.find(b => b.name === p.player_name);
                             const currentOv = bStats ? bStats.overs : 0;
                             const limitVal = parseInt(matchConfig?.oversPerBowler || '0');
                             const reachesLimit = limitVal > 0 && currentOv >= limitVal;
                             const isPrev = lastBowlerId === p.player_name;
                             
                             return (
                               <TouchableOpacity 
                                 key={p.id} 
                                 style={[
                                   styles.playerGridTile, 
                                   (isPrev || reachesLimit) && { opacity: 0.5, backgroundColor: '#F3F4F6' }
                                 ]}
                                 disabled={isPrev || reachesLimit}
                                 onPress={() => {
                                    addNewBowler(p.player_name);
                                    setIsSelectingNextBowler(false);
                                    setPlayerSearchQuery('');
                                 }}
                               >
                                  <View style={[styles.miniAvatar, { width: 44, height: 44, backgroundColor: reachesLimit ? '#EF4444' : '#6B7280' }]}>
                                     <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>{p.player_name[0] || '?'}</Text>
                                  </View>
                                  <Text style={[styles.playerGridName, (isPrev || reachesLimit) && { color: '#9CA3AF' }]} numberOfLines={1}>{p.player_name}</Text>
                                  <View style={{ marginTop: 2, alignItems: 'center' }}>
                                    {isPrev && <Text style={{ fontSize: 9, color: '#9CA3AF', fontWeight: '700' }}>LAST OVER</Text>}
                                    {reachesLimit && <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: '900' }}>LIMIT REACHED</Text>}
                                    {bStats && !reachesLimit && !isPrev && (
                                      <Text style={{ fontSize: 9, color: '#6B7280' }}>
                                        {bStats.overs}.{bStats.balls} Ov
                                      </Text>
                                    )}
                                  </View>
                               </TouchableOpacity>
                             );
                           })}
                       </View>

                       <TouchableOpacity 
                         style={styles.addPlayerMiniBtn}
                         onPress={() => setIsAddingNewPlayerManually(true)}
                       >
                          <Plus size={18} color="#01b854" />
                          <Text style={styles.addPlayerMiniText}>Add New Bowler</Text>
                       </TouchableOpacity>
                    </>
                 )}
              </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMatchResultModal = () => {
    if (!inn1) return null;
    
    return (
      <Modal
        visible={isMatchResultVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500, padding: 32, alignItems: 'center' }]}>
             <View style={{ backgroundColor: '#F0FDF4', padding: 24, borderRadius: 24, marginBottom: 24, width: '100%', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#01b854', textTransform: 'uppercase', letterSpacing: 1 }}>Match Completed</Text>
             </View>
             
             <Text style={{ fontSize: 24, fontWeight: '900', color: '#06392e', textAlign: 'center', marginBottom: 8 }}>Match Completed!</Text>
             <Text style={{ fontSize: 18, fontWeight: '800', color: '#01b854', textAlign: 'center', marginBottom: 24 }}>{result}</Text>
             
             <View style={{ width: '100%', backgroundColor: '#F9FAFB', borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                   <View>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>{inn1?.battingTeam}</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#06392e' }}>{inn1?.runs}-{inn1?.wickets}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>({formatOvers(inn1?.legalBalls || 0)})</Text>
                   </View>
                   <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 }}>{inn2?.battingTeam || (inn1?.bowlingTeam)}</Text>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#06392e' }}>{inn2 ? `${inn2.runs}-${inn2.wickets}` : 'Not Bat'}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>({formatOvers(inn2?.legalBalls || 0)})</Text>
                   </View>
                </View>
                
                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 16 }} />
                
                <View style={{ gap: 8 }}>
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>Match Format</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#06392e' }}>{matchConfig.totalOvers} Overs</Text>
                   </View>
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>Venue</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#06392e' }}>{matchConfig.ground}</Text>
                   </View>
                </View>
             </View>
             
             <TouchableOpacity 
               style={[styles.startMatchMainBtn, { width: '100%', marginBottom: 12, backgroundColor: '#06392e' }]} 
               onPress={() => {
                 setIsMatchResultVisible(false);
                 if (liveMatchId) {
                   router.push(`/live/${liveMatchId}`);
                 } else {
                   router.push('/cricket/matches');
                 }
               }}
             >
                <Text style={styles.startMatchMainBtnText}>View Full Scorecard</Text>
             </TouchableOpacity>
             
             <TouchableOpacity 
               style={{ padding: 12 }} 
               onPress={() => {
                 setIsMatchResultVisible(false);
                 router.push('/cricket/matches');
               }}
             >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#6B7280' }}>Close</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderNewBatterSelectionModal = () => {
    if (!isSelectingNewBatter || !inn) return null;

    // Determine which team is batting to use the most up-to-date local XI list
    const battingTeamObj = inn.battingTeam === selectedTeamA?.name ? selectedTeamA : selectedTeamB;
    const battingXi = battingTeamObj?.id === selectedTeamA?.id ? playingXiA : playingXiB;

    // Use current 'yet to bat' list plus exclude anyone currently on field or newly dismissed
    const query = playerSearchQuery.toLowerCase().trim();
    
    // Build unique set of players who have already taken the field (active or dismissed)
    // We normalize everything to lower case and trimmed strings for reliable matching
    const alreadyOnFieldOrOutNames = [
      ...inn.batters.map(b => b.name),
      striker?.name,
      nonStriker?.name,
      pendingWicketData?.dismissedName
    ]
    .filter(Boolean)
    .map(n => n.toLowerCase().trim());
    
    const alreadyOnFieldOrOut = new Set(alreadyOnFieldOrOutNames);

    const filteredSquad = (battingXi && battingXi.length > 0 ? battingXi : (squadBatting || []))
      .map(entry => {
         if (typeof entry === 'string') return entry.trim();
         return (entry?.player_name || entry?.name || "").trim();
      })
      .filter(name => {
         if (!name || name === '--') return false;
         const lowName = name.toLowerCase().trim();
         return !alreadyOnFieldOrOut.has(lowName) && lowName.includes(query);
      })
      .map(name => ({ id: name, player_name: name }));

    const filteredDbResults = dbSearchResults.filter((p: any) => {
       const lowName = (p.full_name || '').toLowerCase().trim();
       return !alreadyOnFieldOrOut.has(lowName);
    });

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSelectingNewBatter}
        onRequestClose={() => {
          setIsSelectingNewBatter(false);
          setPlayerSearchQuery('');
          setIsAddingNewPlayerManually(false);
        }}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { height: '80%' }]}>
             <View style={styles.sheetHandle} />
             <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                <View style={styles.modalHeaderRow}>
                   <View>
                      <Text style={styles.sheetTitle}>New Batter</Text>
                      <Text style={styles.sheetSubtitle}>Pick the next batter for {inn.battingTeam}</Text>
                   </View>
                   <TouchableOpacity onPress={() => { setIsSelectingNewBatter(false); setPlayerSearchQuery(''); setIsAddingNewPlayerManually(false); }}>
                      <X size={24} color="#6B7280" />
                   </TouchableOpacity>
                </View>

                {!isAddingNewPlayerManually && (
                  <View style={styles.modalSearchContainer}>
                     <Search size={18} color="#9CA3AF" />
                     <TextInput 
                        style={styles.modalSearchInput}
                        placeholder="Search by name or number..."
                        value={playerSearchQuery}
                        onChangeText={setPlayerSearchQuery}
                     />
                  </View>
                )}
             </View>

             <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
                {isAddingNewPlayerManually ? (
                   <View style={{ marginTop: 10, gap: 16 }}>
                      <View style={styles.infoSection}>
                         <Text style={styles.configLabel}>Enter Full Name</Text>
                         <TextInput 
                            style={styles.configInput}
                            placeholder="e.g. John Smith"
                            value={playerSearchQuery}
                            onChangeText={setPlayerSearchQuery}
                            autoFocus
                         />
                      </View>

                      <View style={styles.infoSection}>
                         <Text style={styles.configLabel}>Phone Number (Optional)</Text>
                         <TextInput 
                            style={styles.configInput}
                            placeholder="e.g. +91 9876543210"
                            value={manualPlayerPhone}
                            onChangeText={setManualPlayerPhone}
                            keyboardType="phone-pad"
                         />
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.startMatchMainBtn}
                        onPress={async () => {
                           if (playerSearchQuery.trim()) {
                              const name = playerSearchQuery.trim();
                              const phone = manualPlayerPhone.trim();
                              
                              // Persist to Database if activeMatchConfig and liveMatchId are available
                              if (activeMatchConfig && liveMatchId && inn) {
                                 try {
                                    const battingTeamId = inn.battingTeam === activeMatchConfig.teamA ? activeMatchConfig.teamAId : activeMatchConfig.teamBId;
                                    
                                    if (battingTeamId) {
                                       // Update match config count locally first so checkEnd is accurate
                                       updateMatchConfig({ players: (activeMatchConfig.players || 11) + 1 });
                                       
                                       // 1. Add to team_members
                                       const { data: newMember, error: memErr } = await supabase
                                          .from('team_members')
                                          .insert({
                                             team_id: battingTeamId,
                                             player_name: name,
                                             player_phone: phone,
                                             status: 'accepted',
                                             role: 'player'
                                          })
                                          .select()
                                          .single();
                                          
                                       if (!memErr && newMember) {
                                          // 2. Add to match_playing_xi so they appear in reports/history correctly
                                          await supabase.from('match_playing_xi').insert({
                                             match_id: liveMatchId,
                                             team_id: battingTeamId,
                                             player_id: newMember.id
                                          });
                                          
                                          // Update local squads for consistency
                                          if (battingTeamId === selectedTeamA?.id) {
                                            setPlayingXiA(prev => [...prev, newMember]);
                                          } else {
                                            setPlayingXiB(prev => [...prev, newMember]);
                                          }

                                          console.log('[Scoring] Permanently added player:', name, 'to team:', battingTeamId);
                                       }
                                    }
                                 } catch (err) {
                                    console.error('[Scoring] Error persisting new player:', err);
                                 }
                              }

                              handleAddWicket({ 
                                dismissedName: pendingWicketData?.dismissedName, 
                                dismissalType: dismissalState.type || 'Out', 
                                newBatterName: name,
                              });
                              setIsSelectingNewBatter(false);
                              setPlayerSearchQuery('');
                              setIsAddingNewPlayerManually(false);
                              setManualPlayerPhone('');
                              setPendingWicketData(null);
                           }
                        }}
                      >
                         <Text style={styles.startMatchMainBtnText}>Add & Select Batter</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity onPress={() => setIsAddingNewPlayerManually(false)}>
                         <Text style={{ textAlign: 'center', color: '#6B7280', fontSize: 14, fontWeight: '600' }}>Cancel & View Squad</Text>
                      </TouchableOpacity>
                   </View>
                ) : (
                   <>
                      {filteredSquad.length > 0 ? (
                        <View style={styles.playerGrid}>
                          {filteredSquad.map(p => (
                            <TouchableOpacity 
                              key={p.id} 
                              style={styles.playerGridTile}
                              onPress={() => {
                                 handleAddWicket({ 
                                   dismissedName: pendingWicketData?.dismissedName, 
                                   dismissalType: 'Out', 
                                   newBatterName: p.player_name,
                                 });
                                 setIsSelectingNewBatter(false);
                                 setPendingWicketData(null);
                              }}
                            >
                               <View style={[styles.miniAvatar, { width: 44, height: 44, backgroundColor: '#FEF3C7' }]}>
                                  <Text style={{ color: '#D97706', fontWeight: 'bold', fontSize: 16 }}>{p.player_name[0]}</Text>
                               </View>
                               <Text style={styles.playerGridName} numberOfLines={1}>{p.player_name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <View style={{ alignItems: 'center', marginTop: 40, padding: 20, backgroundColor: '#F9FAFB', borderRadius: 16 }}>
                           <Users size={32} color="#9CA3AF" />
                           <Text style={[styles.sheetSubtitle, { marginTop: 12, textAlign: 'center' }]}>No more players available in the initial squad.</Text>
                        </View>
                      )}

                      {/* Global DB Search Results */}
                      {filteredDbResults.length > 0 && (
                        <View style={{ marginTop: 24 }}>
                           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <Search size={14} color="#01b854" />
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#01b854', letterSpacing: 0.5 }}>GLOBAL SEARCH RESULTS</Text>
                           </View>
                           <View style={styles.playerGrid}>
                              {filteredDbResults.map((p: any) => (
                                <TouchableOpacity 
                                  key={p.id} 
                                  style={[styles.playerGridTile, { borderColor: '#01b854', backgroundColor: '#F0FDF4' }]}
                                  onPress={async () => {
                                     // Persist to Database if activeMatchConfig and liveMatchId are available
                                     if (activeMatchConfig && liveMatchId && inn) {
                                        try {
                                           const battingTeamId = inn.battingTeam === activeMatchConfig.teamA ? activeMatchConfig.teamAId : activeMatchConfig.teamBId;
                                           
                                           if (battingTeamId) {
                                              // 1. Add to team_members (linking existing profile)
                                              const { data: newMember, error: memErr } = await supabase
                                                 .from('team_members')
                                                 .insert({
                                                    team_id: battingTeamId,
                                                    profile_id: p.id,
                                                    player_name: p.full_name,
                                                    player_phone: p.phone,
                                                    status: 'accepted',
                                                    role: 'player'
                                                 })
                                                 .select()
                                                 .single();
                                                 
                                              if (!memErr && newMember) {
                                                 // 2. Add to match_playing_xi
                                                 await supabase.from('match_playing_xi').insert({
                                                    match_id: liveMatchId,
                                                    team_id: battingTeamId,
                                                    player_id: newMember.id
                                                 });
                                                 console.log('[Scoring] Permanently linked global player:', p.full_name, 'to team:', battingTeamId);
                                              }
                                           }
                                        } catch (err) {
                                           console.error('[Scoring] Error linking global player:', err);
                                        }
                                     }

                                     handleAddWicket({ 
                                       dismissedName: pendingWicketData?.dismissedName, 
                                       dismissalType: 'Out', 
                                       newBatterName: p.full_name,
                                     });
                                     setIsSelectingNewBatter(false);
                                     setDbSearchResults([]);
                                     setPlayerSearchQuery('');
                                     setPendingWicketData(null);
                                  }}
                                >
                                   <View style={[styles.miniAvatar, { width: 44, height: 44, backgroundColor: '#01b854' }]}>
                                      <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>{p.full_name[0]}</Text>
                                   </View>
                                   <Text style={styles.playerGridName} numberOfLines={2}>{p.full_name}</Text>
                                </TouchableOpacity>
                              ))}
                           </View>
                        </View>
                      )}

                      {isSearchingDb && (
                         <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#01b854" />
                            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Searching database...</Text>
                         </View>
                      )}

                      <TouchableOpacity 
                        style={[styles.addPlayerMiniBtn, { marginTop: 24, paddingVertical: 16 }]}
                        onPress={() => setIsAddingNewPlayerManually(true)}
                      >
                         <Plus size={18} color="#01b854" />
                         <Text style={styles.addPlayerMiniText}>Add & Select New Batter</Text>
                      </TouchableOpacity>
                   </>
                )}
             </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderLiveScoring = () => {
    if (!inn) return null;
    
    const oversStr = formatOvers(inn.legalBalls);
    
    // Helper to calculate Strike Rate and Minutes in real-time
    const calcSR = (r: number, b: number) => b === 0 ? '0.0' : ((r / b) * 100).toFixed(1);
    const calcMins = (start?: number) => start ? Math.floor((Date.now() - start) / 60000) : 0;
    const calcEco = (r: number, b: number, o: number) => {
       const totalBalls = (o * 6) + b;
       return totalBalls === 0 ? '0.0' : (r / (totalBalls / 6)).toFixed(1);
    };
    
    return (
      <View style={styles.scoringContainer}>
        <View style={styles.scoringContentWrapper}>
         {/* Top Scoreboard */}
         <View style={styles.mainScoreboard}>
            <View style={styles.scoreRow}>
               <View>
                  <Text style={styles.scoringTeamName}>{inn.battingTeam}</Text>
                  <View style={styles.scoreNumberRow}>
                     <Text style={styles.bigRuns}>{inn.runs}-{inn.wickets}</Text>
                     <Text style={styles.overText}>({oversStr})</Text>
                  </View>
               </View>
               <View style={styles.crrBadge}>
                  <Text style={styles.crrLabel}>CRR</Text>
                  <Text style={styles.crrValue}>{crr}</Text>
               </View>
            </View>
            
            {renderScoringSettingsSidebar()}
            {renderMoreActionsSheet()}
            {renderFullScorecardModal()}
            {renderRetiredHurtSelectionModal()}
            {renderReviseTargetModal()}
            {renderHelpModal()}
            {renderRulesModal()}
            {renderChangeOversModal()}
            {renderBreakModal()}
            {renderExtraRunsSelector()}
            {renderBowlerSelectionModal()}
            {renderNewBatterSelectionModal()}
            {renderMatchResultModal()}

             <View style={styles.targetRow}>
                <Text style={styles.targetText}>
                  {inn.target 
                    ? ( (parseInt(matchConfig.totalOvers || '20') * 6 - inn.legalBalls) > 0 && (inn.target - inn.runs) > 0 
                       ? `Target: ${inn.target} | Need ${inn.target - inn.runs} from ${parseInt(matchConfig.totalOvers || '20') * 6 - inn.legalBalls} balls` 
                       : `Target: ${inn.target}`
                      )
                    : `${inn.battingTeam} is batting first`}
                </Text>
                <TouchableOpacity 
                   style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                   onPress={() => setIsMatchInfoVisible(true)}
                >
                   <Info size={14} color="#01b854" />
                   <Text style={{ fontSize: 13, fontWeight: '700', color: '#01b854', textDecorationLine: 'underline' }}>Match Info</Text>
                </TouchableOpacity>
             </View>

            {/* In-Play Tables */}            <View style={[styles.playerStatsRow, { gap: 24 }]}>
               <View style={[styles.batsmanCol, { flex: 3 }]}>
                  <View style={styles.statsHeader}>
                     <Text style={[styles.statsHeaderText, { flex: 2 }]}>Batsman</Text>
                     <View style={[styles.statsHeadValues, { gap: 10 }]}>
                        <Text style={styles.statsHeaderTextFixed}>R</Text>
                        <Text style={styles.statsHeaderTextFixed}>B</Text>
                        <Text style={styles.statsHeaderTextFixed}>0s</Text>
                        <Text style={styles.statsHeaderTextFixed}>4s</Text>
                        <Text style={styles.statsHeaderTextFixed}>6s</Text>
                        <Text style={[styles.statsHeaderTextFixed, { width: 38 }]}>SR</Text>
                        <Text style={styles.statsHeaderTextFixed}>M</Text>
                     </View>
                  </View>
                  {[striker, nonStriker].map((b, idx) => (
                    <TouchableOpacity 
                       key={idx} 
                       style={styles.statsRow}
                       onPress={() => {
                          if (!b?.name || b.name === '--') {
                             setIsSelectingNewBatter(true);
                          }
                       }}
                    >
                       <Text style={[styles.playerName, b?.onStrike && { color: '#01b854' }, { flex: 2 }]} numberOfLines={1}>
                          {b?.name || 'Select Batter...'}{b?.onStrike ? '*' : ''}
                       </Text>
                       <View style={[styles.statsValues, { gap: 10 }]}>
                          <Text style={styles.statsValueTextFixed}>{b?.runs || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{b?.balls || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{b?.dots || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{b?.fours || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{b?.sixes || 0}</Text>
                          <Text style={[styles.statsValueTextFixed, { width: 38 }]}>{calcSR(b?.runs || 0, b?.balls || 0)}</Text>
                          <Text style={styles.statsValueTextFixed}>{calcMins(b?.startTime)}</Text>
                       </View>
                    </TouchableOpacity>
                  ))}

               </View>
               <View style={[styles.bowlerCol, { flex: 3 }]}>
                  <View style={styles.statsHeader}>
                     <Text style={[styles.statsHeaderText, { flex: 2 }]}>Bowler</Text>
                     <View style={[styles.statsHeadValues, { gap: 10 }]}>
                        <Text style={styles.statsHeaderTextFixed}>O</Text>
                        <Text style={styles.statsHeaderTextFixed}>M</Text>
                        <Text style={styles.statsHeaderTextFixed}>R</Text>
                        <Text style={styles.statsHeaderTextFixed}>W</Text>
                        <Text style={[styles.statsHeaderTextFixed, { width: 32 }]}>Eco</Text>
                        <Text style={styles.statsHeaderTextFixed}>0s</Text>
                        <Text style={styles.statsHeaderTextFixed}>4s</Text>
                        <Text style={styles.statsHeaderTextFixed}>6s</Text>
                     </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.statsRow}
                    onPress={() => setIsSelectingNextBowler(true)}
                  >
                       <Text style={[styles.playerName, { flex: 2 }]} numberOfLines={1}>
                          {bowler?.name || 'Tap to select Bowler...'}
                       </Text>
                       <View style={[styles.statsValues, { gap: 10 }]}>
                          <Text style={styles.statsValueTextFixed}>{bowler?.overs ?? 0}.{bowler?.balls ?? 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.maidens || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.runs || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.wickets || 0}</Text>
                          <Text style={[styles.statsValueTextFixed, { width: 32 }]}>{calcEco(bowler?.runs || 0, bowler?.balls || 0, bowler?.overs || 0)}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.dots || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.fours || 0}</Text>
                          <Text style={styles.statsValueTextFixed}>{bowler?.sixes || 0}</Text>
                       </View>
                    </TouchableOpacity>
               </View>
            </View>


            {/* Ball Timeline */}
            <View style={{ marginBottom: 12 }}>
               <Text style={[styles.statsHeaderText, { marginBottom: 8, marginLeft: 2 }]}>This over</Text>
               <View style={styles.timelineContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                     {inn.overBalls.slice(-12).map((b, i) => (
                        <View key={i} style={[styles.ballCircle, b.label === 'W' && styles.ballWicket, (b.label === '4' || b.label === '6') && styles.ballBoundary]}>
                           <Text style={[styles.ballLabel, (b.label === 'W' || b.label === '4' || b.label === '6') && { color: '#FFFFFF' }]}>{b.label}</Text>
                        </View>
                     ))}
                     {inn.overBalls.length === 0 && <Text style={styles.statsHeaderText}>Start the over...</Text>}
                  </ScrollView>
               </View>
            </View>
         </View>

         {/* Scoring Wheel */}
         <View style={styles.scoringWheel}>
            <View style={styles.wheelRow}>
               {[0, 1, 2, 3].map(n => (
                 <TouchableOpacity key={n} style={styles.runBtn} onPress={() => handleAddBall(n)}>
                    <Text style={styles.runBtnText}>{n}</Text>
                 </TouchableOpacity>
               ))}
            </View>
            <View style={styles.wheelRow}>
               {[4, 6].map(n => (
                 <TouchableOpacity key={n} style={[styles.runBtn, styles.boundaryBtn]} onPress={() => handleAddBall(n)}>
                    <Text style={styles.boundaryBtnText}>{n}</Text>
                 </TouchableOpacity>
               ))}
                <TouchableOpacity 
                  style={[styles.runBtn, styles.wicketBtn]} 
                  onPress={() => {
                    setDismissalState({ type: '', fielder: null, runOutBatter: null,
});
                    setIsConfiguringDismissal(true);
                  }}
                 >
                   <Text style={styles.runBtnText}>W</Text>
                </TouchableOpacity>
            </View>
             <View style={styles.extraRow}>
                <TouchableOpacity style={styles.extraBtn} onPress={() => { setActiveExtraType('wide'); setIsExtraRunsSelectorVisible(true); }}><Text style={styles.extraBtnText}>WD</Text></TouchableOpacity>
                <TouchableOpacity style={styles.extraBtn} onPress={() => { setActiveExtraType('noball'); setIsExtraRunsSelectorVisible(true); }}><Text style={styles.extraBtnText}>NB</Text></TouchableOpacity>
                <TouchableOpacity style={styles.extraBtn} onPress={() => { setActiveExtraType('bye'); setIsExtraRunsSelectorVisible(true); }}><Text style={styles.extraBtnText}>BYE</Text></TouchableOpacity>
                <TouchableOpacity style={styles.extraBtn} onPress={() => { setActiveExtraType('legbye'); setIsExtraRunsSelectorVisible(true); }}><Text style={styles.extraBtnText}>LB</Text></TouchableOpacity>
             </View>
         </View>

         {/* Bottom Actions */}
         <View style={styles.scoringActions}>
            <TouchableOpacity 
              style={styles.actionIconBtn}
              onPress={async () => {
                const success = await undoLastBall();
                if (!success && typeof window !== 'undefined') {
                   alert('Nothing to undo in this session.');
                }
              }}
            >
              <RotateCcw size={20} color="#6B7280" />
              <Text style={styles.actionIconText}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionIconBtn}
              onPress={() => setIsMoreSheetVisible(true)}
            >
              <MoreHorizontal size={20} color="#6B7280" />
              <Text style={styles.actionIconText}>More</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionIconBtn} 
              onPress={() => setIsScoringSettingsVisible(true)}
            >
              <Settings size={20} color="#6B7280" />
              <Text style={styles.actionIconText}>Settings</Text>
            </TouchableOpacity>
            
            {matchPhase === 'innings_break' && (
              <TouchableOpacity 
                style={[styles.actionIconBtn, { backgroundColor: '#fcf8ef', width: '30%' }]}
                onPress={async () => {
                  await startSecondInnings();
                  setMatchState({ striker: null, nonStriker: null, bowler: null, keeper: null });
                  setIsSelectingOpeners(true);
                  setIsScoring(false);
                  setIsSelectingNextBowler(false);
                }}
              >
                <ChevronRight size={20} color="#F97316" />
                <Text style={[styles.actionIconText, { color: '#F97316' }]}>2nd Inning</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderBowlerSelection = () => {
    if (!inn) return null;
    const battingTeamObj = (tossResult.winner === 'A') === (tossResult.decision === 'bat') ? selectedTeamA : selectedTeamB;
    const bowlingTeamObj = battingTeamObj?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA;
    const bowlingPlayers = bowlingTeamObj?.id === selectedTeamA?.id ? playingXiA : playingXiB;

    return (
      <View style={styles.selectionView}>
         <View style={styles.selectionHeader}>
            <View style={{ width: 40 }} />
            <Text style={styles.selectionTitle}>Select Next Bowler</Text>
            <View style={{ width: 40 }} />
         </View>

         <View style={styles.overSummaryBanner}>
            <Text style={styles.overSummaryText}>Over {Math.floor(inn.balls / 6)} Completed</Text>
            <Text style={styles.scoreSummaryText}>{inn.runs}/{inn.wickets}</Text>
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.configLabel}>Choose Bowler for Over {Math.floor(inn.balls / 6) + 1}</Text>
            <View style={styles.playerGrid}>
               {bowlingPlayers.map(p => (
                 <TouchableOpacity 
                   key={p.id} 
                   style={[
                     styles.playerGridTile, 
                     lastBowlerId === p.player_name && { opacity: 0.4, backgroundColor: '#F3F4F6' }
                   ]}
                   onPress={() => {
                     if (lastBowlerId === p.player_name) {
                       alert('A bowler cannot bowl two consecutive overs.');
                       return;
                     }
                     const idx = bowlingPlayers.findIndex(bp => bp.id === p.id);
                     changeBowler(idx);
                     setIsSelectingNextBowler(false);
                   }}
                 >
                    <View style={[styles.miniAvatar, { width: 40, height: 40, backgroundColor: lastBowlerId === p.player_name ? '#9CA3AF' : '#01b854' }]}>
                       <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{p.player_name[0]}</Text>
                    </View>
                    <Text style={styles.playerGridName} numberOfLines={1}>{p.player_name}</Text>
                    {lastBowlerId === p.id && <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: 'bold' }}>PREV BOWLER</Text>}
                 </TouchableOpacity>
               ))}
                <TouchableOpacity 
                  style={[styles.playerGridTile, { borderStyle: 'dashed', borderColor: '#01b854' }]}
                  onPress={async () => {
                    const name = prompt('Enter New Bowler Name:');
                    if (name) {
                      // Update config to allow more room for bowlers if needed
                      if (activeMatchConfig) {
                        updateMatchConfig({ players: (activeMatchConfig.players || 11) + 1 });
                      }
                      
                      // Add them to the DB as well so they stick around
                      try {
                        const battingTeam = tossResult.decision === 'bat' ? tossResult.winner : (tossResult.winner?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA);
                        const bowlingTeam = battingTeam?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA;
                        
                        if (bowlingTeam?.id && liveMatchId) {
                           const { data: newMember } = await supabase
                            .from('team_members')
                            .insert({ team_id: bowlingTeam.id, player_name: name, status: 'accepted' })
                            .select().single();
                            
                           if (newMember) {
                             await supabase.from('match_playing_xi').insert({ match_id: liveMatchId, team_id: bowlingTeam.id, player_id: newMember.id });
                             if (bowlingTeam.id === selectedTeamA?.id) setPlayingXiA(prev => [...prev, newMember]);
                             else setPlayingXiB(prev => [...prev, newMember]);
                           }
                        }
                      } catch (e) {}

                      addNewBowler(name);
                      setIsSelectingNextBowler(false);
                    }
                  }}
                >
                  <Plus size={24} color="#01b854" />
                  <Text style={[styles.playerGridName, { color: '#01b854' }]}>Add New</Text>
                </TouchableOpacity>
            </View>
         </ScrollView>
      </View>
    );
  };

  const renderDismissalConfiguration = () => {
    if (!inn) return null;
    const dismissalTypes = [
      { id: 'bowled', label: 'Bowled', icon: Target },
      { id: 'caught', label: 'Caught', icon: Hand },
      { id: 'lbw', label: 'LBW', icon: ShieldCheck },
      { id: 'run_out', label: 'Run Out', icon: Zap },
      { id: 'stumped', label: 'Stumped', icon: MapPin },
      { id: 'hit_wicket', label: 'Hit Wicket', icon: AlertCircle },
      { id: 'retired', label: 'Retired', icon: UserMinus }
    ];

    // Use name-based matching to find which Playing XI to show as fielders
    const isTeamABowling = inn?.bowlingTeam === selectedTeamA?.name;
    let bowlingPlayers = isTeamABowling ? playingXiA : playingXiB;
    
    // Safety fallback: if local state is empty, use the names tracked in the inning state
    if (bowlingPlayers.length <= 1 && squadBowling.length > bowlingPlayers.length) {
      bowlingPlayers = squadBowling.map(name => ({ 
        id: name, 
        player_name: name 
      }));
    }

    const needsFielder = dismissalState.type === 'caught' || dismissalState.type === 'run_out' || dismissalState.type === 'stumped';
    const isRunOut = dismissalState.type === 'run_out';

    return (
      <View style={styles.selectionView}>
         <View
            style={[styles.selectionHeader, { paddingVertical: 14, paddingHorizontal: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}
         >
            <TouchableOpacity onPress={() => setIsConfiguringDismissal(false)} style={styles.closeBtnPremium}>
               <ChevronLeft size={20} color="#01b854" />
            </TouchableOpacity>
            <Text style={[styles.modalTitlePremium, { textAlign: 'center', flex: 1, fontSize: 18, color: '#06392e' }]}>Wicket Setup</Text>
            <View style={{ width: 40 }} />
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <Text style={[styles.configLabel, { marginBottom: 12 }]}>How did it happen?</Text>
            <View style={[styles.dismissalGrid, { marginTop: 0, gap: 10 }]}>
               {dismissalTypes.map(d => {
                 const Icon = d.icon;
                 const isActive = dismissalState.type === d.id;
                 return (
                    <TouchableOpacity 
                      key={d.id} 
                      style={[styles.dismissalTile, isActive && styles.dismissalTileActive]}
                      onPress={() => setDismissalState({ ...dismissalState, type: d.id, fielder: null, runOutBatter: d.id === 'run_out' ? 'Striker' : null })}
                    >
                       <View style={styles.dismissalIconContainer}>
                          <Icon size={18} color={isActive ? '#01b854' : '#6B7280'} />
                       </View>
                       <Text style={[styles.dismissalText, isActive ? { color: '#01b854', fontWeight: '800' } : { color: '#6B7280' }]}>{d.label}</Text>
                    </TouchableOpacity>
                 );
               })}
            </View>

            {isRunOut && (
              <View style={{ marginTop: 24 }}>
                 <Text style={styles.configLabel}>Which batter is out?</Text>
                 <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                    {[
                      { type: 'Striker', player: striker },
                      { type: 'Non-Striker', player: nonStriker }
                    ].map(b => (
                      <TouchableOpacity 
                        key={b.type}
                        style={[styles.batterSelectionTile, dismissalState.runOutBatter === b.type && styles.batterSelectionTileActive]}
                        onPress={() => setDismissalState({ ...dismissalState, runOutBatter: b.type as any })}
                      >
                         <Text style={[styles.batterSelectionName, dismissalState.runOutBatter === b.type && { color: '#01b854' }]}>{b.player?.name || b.type}</Text>
                         <Text style={[styles.batterSelectionRole, dismissalState.runOutBatter === b.type && { color: '#01b854', opacity: 0.8 }]}>{b.type}</Text>
                      </TouchableOpacity>
                    ))}
                 </View>
              </View>
            )}

            {needsFielder && (
              <View style={{ marginTop: 28 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={styles.configLabel}>{isRunOut ? 'Run out by' : (dismissalState.type === 'stumped' ? 'Stumped by' : 'Caught by')}</Text>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{bowlingPlayers.length} Fielders</Text>
                 </View>
                 <View style={[styles.playerGrid, { marginTop: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
                    {bowlingPlayers.map(p => (
                      <TouchableOpacity 
                        key={p.id} 
                        style={[styles.playerGridTile, dismissalState.fielder?.id === p.id && styles.playerGridTileActive]}
                        onPress={() => setDismissalState({ ...dismissalState, fielder: p })}
                      >
                         <Text style={[styles.playerGridName, dismissalState.fielder?.id === p.id && { color: '#01b854', fontWeight: '700' }]} numberOfLines={1}>{p.player_name}</Text>
                      </TouchableOpacity>
                    ))}
                 </View>
              </View>
            )}
         </ScrollView>

         <View style={[styles.modalFooterPremium, { paddingBottom: 20, paddingTop: 12 }]}>
            <TouchableOpacity 
               style={[styles.closeBtnFooter, { height: 44, backgroundColor: '#06392e' }, (!dismissalState.type || (needsFielder && !dismissalState.fielder)) && { opacity: 0.5, backgroundColor: '#E5E7EB' }]}
               disabled={!dismissalState.type || (needsFielder && !dismissalState.fielder)}
               onPress={() => {
                  let dismissedName = striker?.name;
                  if (isRunOut) {
                    dismissedName = dismissalState.runOutBatter === 'Striker' ? striker?.name : nonStriker?.name;
                  }
                  
                  if (!dismissedName || dismissedName === '--') {
                    alert('Dismissed batter not found');
                    return;
                  }

                  setPendingWicketData({ 
                    dismissedName,
                    dismissalType: dismissalState.type,
                    fielderName: dismissalState.fielder?.player_name,
                  });
                  setIsConfiguringDismissal(false);
                  setIsSelectingNewBatter(true);
               }}
            >
               <Text style={[styles.closeBtnFooterText, { fontSize: 16, color: (!dismissalState.type || (needsFielder && !dismissalState.fielder)) ? '#9CA3AF' : '#01b854', fontWeight: '900' }]}>Confirm Wicket</Text>
            </TouchableOpacity>
         </View>
      </View>
    );
  };

  const renderOpeningSelection = () => {
    const battingTeamObj = (inn?.battingTeam) 
      ? (inn.battingTeam === selectedTeamA?.name ? selectedTeamA : selectedTeamB)
      : ((tossResult.winner?.id === selectedTeamA?.id) === (tossResult.decision === 'bat') ? selectedTeamA : selectedTeamB);
    const bowlingTeamObj = battingTeamObj?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA;
    const battingPlayers = battingTeamObj?.id === selectedTeamA?.id ? playingXiA : playingXiB;
    const bowlingPlayers = bowlingTeamObj?.id === selectedTeamA?.id ? playingXiA : playingXiB;

    return (
      <View style={styles.selectionView}>
         <View style={styles.modalHeaderRow}>
            <View>
               <Text style={styles.sheetTitle}>Select Openers</Text>
               <Text style={styles.sheetSubtitle}>Pick the starting pair and bowler</Text>
            </View>
            <TouchableOpacity onPress={() => setIsSelectingOpeners(false)} style={styles.closeBtnPremium}>
               <X size={24} color="#6B7280" />
            </TouchableOpacity>
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {battingPlayers.length === 0 || bowlingPlayers.length === 0 ? (
               <View style={styles.noResultArea}>
                  <AlertCircle size={48} color="#EF4444" />
                  <Text style={styles.noResultTitle}>Preparation Incomplete</Text>
                  <Text style={styles.noResultSub}>You must select a Playing XI for both teams before picking openers.</Text>
                  <TouchableOpacity 
                    style={[styles.addNewOfficialBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                    onPress={() => {
                      setIsSelectingOpeners(false);
                      setIsConfiguringMatch(false);
                      setIsSelectingPlayers(true);
                      setCurrentPickingSide('A');
                    }}
                  >
                     <ChevronLeft size={20} color="#B91C1C" />
                     <Text style={[styles.addNewOfficialText, { color: '#B91C1C' }]}>Go Back to Player Selection</Text>
                  </TouchableOpacity>
               </View>
            ) : (
              <>
                <View style={styles.openerSection}>
                   <View style={styles.openerLabelRow}>
                      <Text style={styles.configLabel}>Striker</Text>
                      <Text style={styles.playingXiLabel}>{battingTeamObj?.name} Squad</Text>
                   </View>
                   {battingPlayers.length < 2 && (
                     <Text style={styles.warningText}>⚠️ Add at least 2 players to {battingTeamObj?.name} to select both openers.</Text>
                   )}
                   <View style={styles.playerGrid}>
                      {battingPlayers.map(p => (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[styles.playerGridTile, matchState.striker?.id === p.id && styles.playerGridTileActive, matchState.nonStriker?.id === p.id && { opacity: 0.5 }]}
                          onPress={() => setMatchState({ ...matchState, striker: p })}
                          disabled={matchState.nonStriker?.id === p.id}
                        >
                           <Text style={[styles.playerGridName, matchState.striker?.id === p.id && styles.playerGridNameActive]} numberOfLines={1}>{p.player_name}</Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>

                <View style={styles.openerSection}>
                   <View style={styles.openerLabelRow}>
                      <Text style={styles.configLabel}>Non-Striker</Text>
                      <Text style={[styles.playingXiLabel, { color: '#06392e' }]}>{battingTeamObj?.name} Squad</Text>
                   </View>
                   <View style={styles.playerGrid}>
                      {battingPlayers.map(p => (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[styles.playerGridTile, matchState.nonStriker?.id === p.id && styles.playerGridTileActive, matchState.striker?.id === p.id && { opacity: 0.5 }]}
                          onPress={() => setMatchState({ ...matchState, nonStriker: p })}
                          disabled={matchState.striker?.id === p.id}
                        >
                           <Text style={[styles.playerGridName, matchState.nonStriker?.id === p.id && styles.playerGridNameActive]} numberOfLines={1}>{p.player_name}</Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>

                <View style={styles.openerSection}>
                   <View style={styles.openerLabelRow}>
                      <Text style={styles.configLabel}>Opening Bowler</Text>
                      <Text style={styles.playingXiLabel}>{bowlingTeamObj?.name} Squad</Text>
                   </View>
                   <View style={styles.playerGrid}>
                      {bowlingPlayers.map(p => (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[
                            styles.playerGridTile, 
                            matchState.bowler?.id === p.id && styles.playerGridTileActive,
                            matchState.keeper?.id === p.id && { opacity: 0.5 }
                          ]}
                          onPress={() => setMatchState({ ...matchState, bowler: p })}
                          disabled={matchState.keeper?.id === p.id}
                        >
                           <Text style={[styles.playerGridName, matchState.bowler?.id === p.id && styles.playerGridNameActive]} numberOfLines={1}>{p.player_name}</Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>

                <View style={styles.openerSection}>
                   <View style={styles.openerLabelRow}>
                      <Text style={styles.configLabel}>Wicket Keeper</Text>
                      <Text style={styles.playingXiLabel}>{bowlingTeamObj?.name} Squad</Text>
                   </View>
                   <View style={styles.playerGrid}>
                      {bowlingPlayers.map(p => (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[
                            styles.playerGridTile, 
                            matchState.keeper?.id === p.id && styles.playerGridTileActive,
                            matchState.bowler?.id === p.id && { opacity: 0.5 }
                          ]}
                          onPress={() => setMatchState({ ...matchState, keeper: p })}
                          disabled={matchState.bowler?.id === p.id}
                        >
                           <Text style={[styles.playerGridName, matchState.keeper?.id === p.id && styles.playerGridNameActive]} numberOfLines={1}>{p.player_name}</Text>
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>
              </>
            )}
         </ScrollView>

         <View style={styles.configFooter}>
            <TouchableOpacity 
               style={[styles.startMatchMainBtn, (!matchState.striker || !matchState.nonStriker || !matchState.bowler || !matchState.keeper) && { opacity: 0.5 }]}
               disabled={!matchState.striker || !matchState.nonStriker || !matchState.bowler || !matchState.keeper}
               onPress={async () => {
                  const sName = matchState.striker.player_name;
                  const nsName = matchState.nonStriker.player_name;
                  const bwrName = matchState.bowler.player_name;
                  const kprName = matchState.keeper.player_name;

                  if (inn && (inn.target !== undefined && inn.target !== null)) {
                     // Second Innings: Just set openers for the already created inning
                     await setOpeners(sName, nsName, bwrName, kprName);
                  } else {
                     // First Innings
                     const battingFirstTeam = tossResult.decision === 'bat' 
                       ? tossResult.winner 
                       : (tossResult.winner?.id === selectedTeamA?.id ? selectedTeamB : selectedTeamA);
                     
                     const isTeamAFirst = battingFirstTeam?.id === selectedTeamA?.id;
                     let bPlayers = (isTeamAFirst ? playingXiA : playingXiB).map(p => p.player_name);
                     let blPlayers = (isTeamAFirst ? playingXiB : playingXiA).map(p => p.player_name);

                     bPlayers = [sName, nsName, ...bPlayers.filter(p => p !== sName && p !== nsName)];
                     blPlayers = [bwrName, ...blPlayers.filter(p => p !== bwrName)];

                     const config = {
                       teamA: selectedTeamA?.name,
                       teamB: selectedTeamB?.name,
                       teamAId: selectedTeamA?.id,
                       teamBId: selectedTeamB?.id,
                       teamAPlayers: isTeamAFirst ? bPlayers : blPlayers,
                       teamBPlayers: isTeamAFirst ? blPlayers : bPlayers,
                       overs: parseInt(matchConfig.totalOvers),
                       players: playingXiA.length,
                       venue: matchConfig.ground || 'Standard Ground',
                       matchType: matchConfig.type
                     };

                     await startMatch(config, tossResult.winner?.name, tossResult.decision as 'bat' | 'bowl', { striker: sName, nonStriker: nsName, bowler: bwrName, keeper: kprName }, (urlMatchId as string) || undefined);
                  }
                  
                  setIsSelectingOpeners(false);
                  setIsScoring(true);
               }}
             >
                <Text style={styles.startMatchMainBtnText}>
                   Start {
                     (currentIdx || 0) + 1 === 1 ? '1st' : 
                     (currentIdx || 0) + 1 === 2 ? '2nd' : 
                     (currentIdx || 0) + 1 === 3 ? '3rd' : 
                     '4th'
                   } Inning
                </Text>
             </TouchableOpacity>
         </View>
      </View>
    );
  };

  const renderTossConfiguration = () => {
    const handleFlip = () => {
      setIsFlipping(true);
      setTimeout(() => {
        setIsFlipping(false);
        const randomWinner = Math.random() > 0.5 ? selectedTeamA : selectedTeamB;
        setTossResult({ ...tossResult, winner: randomWinner,
});
      }, 1500);
    };

    return (
      <View style={styles.selectionView}>
         <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => setIsConfiguringToss(false)}>
               <ChevronLeft size={28} color="#01b854" />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>Toss Details</Text>
            <View style={{ width: 40 }} />
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            <Text style={styles.configLabel}>Flip the Coin</Text>
            <TouchableOpacity 
              style={[styles.coin, isFlipping && styles.coinFlipping]} 
              onPress={handleFlip}
              disabled={isFlipping}
            >
               <View style={styles.coinInner}>
                  <Text style={styles.coinText}>{isFlipping ? '?' : '₹'}</Text>
               </View>
            </TouchableOpacity>
            <Text style={styles.tapToFlipText}>{isFlipping ? 'Flipping...' : 'Tap for randomized result'}</Text>

            <View style={{ width: '100%', marginTop: 40 }}>
               <Text style={styles.configLabel}>Who won the toss?</Text>
               <View style={styles.tossWinnerSelection}>
                  {[selectedTeamA, selectedTeamB].map(team => (
                    <TouchableOpacity 
                      key={team?.id} 
                      style={[styles.tossTeamBtn, tossResult.winner?.id === team?.id && styles.tossTeamBtnActive]}
                      onPress={() => setTossResult({ ...tossResult, winner: team })}
                    >
                       <View style={[styles.miniAvatar, { backgroundColor: team?.bgColor || '#06392e', marginBottom: 8 }]}>
                          <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{team?.initials}</Text>
                       </View>
                       <Text style={[styles.tossTeamName, tossResult.winner?.id === team?.id && styles.tossTeamNameActive]}>{team?.name}</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>

            {tossResult.winner && (
              <View style={{ width: '100%', marginTop: 32 }}>
                 <Text style={styles.configLabel}>{tossResult.winner.name} won and elected to:</Text>
                 <View style={styles.decisionRow}>
                    {['Bat', 'Bowl'].map(d => (
                      <TouchableOpacity 
                        key={d} 
                        style={[styles.decisionBtn, tossResult.decision === d.toLowerCase() && styles.decisionBtnActive]}
                        onPress={() => setTossResult({ ...tossResult, decision: d.toLowerCase() as any })}
                      >
                         <Text style={[styles.decisionText, tossResult.decision === d.toLowerCase() && styles.decisionTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                 </View>
              </View>
            )}
         </ScrollView>

         <View style={styles.configFooter}>
            <TouchableOpacity 
              style={[styles.startMatchMainBtn, (!tossResult.winner || !tossResult.decision) && { opacity: 0.5 }]}
              disabled={!tossResult.winner || !tossResult.decision}
              onPress={() => {
                setIsConfiguringToss(false);
                setIsSelectingOpeners(true);
              }}
            >
               <Text style={styles.startMatchMainBtnText}>Ready to Play</Text>
            </TouchableOpacity>
         </View>
      </View>
    );
  };

  const renderMatchOfficials = () => (
    <View style={styles.selectionView}>
       <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => setIsConfiguringOfficials(false)}>
             <ChevronRight size={28} color="#01b854" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <Text style={styles.selectionTitle}>Match Officials</Text>
          <View style={{ width: 40 }} />
       </View>

       <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <View style={{ gap: 24 }}>
             <View>
                <Text style={styles.officialGroupTitle}>Umpires</Text>
                {[0, 1, 2, 3].map(i => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.officialInputRow}
                    onPress={() => {
                      setActiveOfficialSlot({ category: 'umpires', index: i,
});
                      setIsSearchingOfficial(true);
                    }}
                  >
                     <User size={18} color="#9CA3AF" />
                     <Text style={[styles.officialValueText, !matchConfig.officials.umpires[i] && styles.officialPlaceholderText]}>
                        {matchConfig.officials.umpires[i] || `Select Umpire ${i + 1}`}
                     </Text>
                  </TouchableOpacity>
                ))}
             </View>

             <View>
                <Text style={styles.officialGroupTitle}>Scorers</Text>
                {[0, 1].map(i => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.officialInputRow}
                    onPress={() => {
                      setActiveOfficialSlot({ category: 'scorers', index: i,
});
                      setIsSearchingOfficial(true);
                    }}
                  >
                     <Menu size={18} color="#9CA3AF" />
                     <Text style={[styles.officialValueText, !matchConfig.officials.scorers[i] && styles.officialPlaceholderText]}>
                        {matchConfig.officials.scorers[i] || `Select Scorer ${i + 1}`}
                     </Text>
                  </TouchableOpacity>
                ))}
             </View>

             <View>
                <Text style={styles.officialGroupTitle}>Match Referee</Text>
                <TouchableOpacity 
                  style={styles.officialInputRow}
                  onPress={() => {
                    setActiveOfficialSlot({ category: 'referee',
});
                    setIsSearchingOfficial(true);
                  }}
                >
                   <UserSquare2 size={18} color="#9CA3AF" />
                   <Text style={[styles.officialValueText, !matchConfig.officials.referee && styles.officialPlaceholderText]}>
                      {matchConfig.officials.referee || "Select Match Referee"}
                   </Text>
                </TouchableOpacity>
             </View>

             <View>
                <Text style={styles.officialGroupTitle}>Live Streamer</Text>
                <TouchableOpacity 
                  style={styles.officialInputRow}
                  onPress={() => {
                    setActiveOfficialSlot({ category: 'streamer',
});
                    setIsSearchingOfficial(true);
                  }}
                >
                   <Video size={18} color="#9CA3AF" />
                   <Text style={[styles.officialValueText, !matchConfig.officials.streamer && styles.officialPlaceholderText]}>
                      {matchConfig.officials.streamer || "Select Live Streamer"}
                   </Text>
                </TouchableOpacity>
             </View>

             <View>
                <Text style={styles.officialGroupTitle}>Commentators</Text>
                {[0, 1].map(i => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.officialInputRow}
                    onPress={() => {
                      setActiveOfficialSlot({ category: 'commentators', index: i,
});
                      setIsSearchingOfficial(true);
                    }}
                  >
                     <Mic2 size={18} color="#9CA3AF" />
                     <Text style={[styles.officialValueText, !matchConfig.officials.commentators[i] && styles.officialPlaceholderText]}>
                        {matchConfig.officials.commentators[i] || `Select Commentator ${i + 1}`}
                     </Text>
                  </TouchableOpacity>
                ))}
             </View>
          </View>
       </ScrollView>

       <View style={styles.configFooter}>
          <TouchableOpacity 
            style={styles.startMatchMainBtn}
            onPress={() => setIsConfiguringOfficials(false)}
          >
             <Text style={styles.startMatchMainBtnText}>Save Officials</Text>
          </TouchableOpacity>
       </View>
    </View>
  );

  const renderOfficialSearch = () => {
    const mockOfficials = [
      { name: 'Nitin Menon', phone: '9876543210', role: 'Umpire' },
      { name: 'Richard Kettleborough', phone: '8765432109', role: 'Umpire' },
      { name: 'Harsha Bhogle', phone: '7654321098', role: 'Commentator' }
    ];

    const filtered = mockOfficials.filter(o => o.phone.includes(searchQuery) || o.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSelect = (official: any) => {
      if (!activeOfficialSlot) return;
      const { category, index } = activeOfficialSlot;
      const newOfficials = { ...matchConfig.officials };
      
      if (typeof index === 'number') {
        const arr = [...(newOfficials as any)[category]];
        arr[index] = official.name;
        (newOfficials as any)[category] = arr;
      } else {
        (newOfficials as any)[category] = official.name;
      }

      setMatchConfig({ ...matchConfig, officials: newOfficials,
});
      setIsSearchingOfficial(false);
      setSearchQuery('');
    };

    return (
      <View style={styles.selectionView}>
         <View style={styles.selectionHeader}>
            <TouchableOpacity onPress={() => setIsSearchingOfficial(false)}>
               <ChevronRight size={28} color="#01b854" style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>Search Official</Text>
            <View style={{ width: 40 }} />
         </View>

         <View style={[styles.searchBarContainer, { marginHorizontal: 20 }]}>
            <Search size={18} color="#9CA3AF" />
            <TextInput 
              placeholder="Search by name or priority phone..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              keyboardType="number-pad"
            />
         </View>

         <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {searchQuery.trim().length > 0 && !filtered.find(o => o.name.toLowerCase() === searchQuery.toLowerCase()) && (
              <TouchableOpacity 
                style={[styles.officialResultCard, { borderStyle: 'dashed', borderColor: '#01b854', backgroundColor: '#F0FDF4' }]}
                onPress={() => {
                  setNewOfficialForm({ name: searchQuery, phone: '', });
                  setIsAddOfficialModalVisible(true);
                }}
              >
                <View style={[styles.miniAvatar, { backgroundColor: '#01b854' }]}><Plus size={20} color="#FFFFFF" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultName, { color: '#01b854' }]}>Add "{searchQuery}"</Text>
                  <Text style={styles.resultPhone}>Register as a new official</Text>
                </View>
                <ChevronRight size={20} color="#01b854" />
              </TouchableOpacity>
            )}

            {filtered.length > 0 ? (
              filtered.map((o, idx) => (
                <TouchableOpacity key={idx} style={styles.officialResultCard} onPress={() => handleSelect(o)}>
                   <View style={styles.miniAvatar}><Text style={{ color: '#FFFFFF' }}>{o.name[0]}</Text></View>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{o.name}</Text>
                      <Text style={styles.resultPhone}>{o.phone}</Text>
                   </View>
                   <Text style={styles.resultRole}>{o.role}</Text>
                </TouchableOpacity>
              ))
            ) : searchQuery.trim().length === 0 ? (
               <View style={styles.noResultArea}>
                  <Users size={48} color="#E5E7EB" />
                  <Text style={styles.noResultTitle}>Select Official</Text>
                  <Text style={styles.noResultSub}>Search by name or number to assign to this slot</Text>
               </View>
            ) : (
               <View style={styles.noResultArea}>
                  <Search size={48} color="#E5E7EB" />
                  <Text style={styles.noResultTitle}>No official found</Text>
                  <Text style={styles.noResultSub}>Try searching with a full mobile number or tap "Add {searchQuery}" above</Text>
               </View>
            )}
         </ScrollView>

         {/* Add Official Modal */}
         <Modal
           animationType="slide"
           transparent={true}
           visible={isAddOfficialModalVisible}
           onRequestClose={() => setIsAddOfficialModalVisible(false)}
         >
           <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsAddOfficialModalVisible(false)}
           >
              <Pressable 
                style={styles.modalContent} 
                onPress={e => Platform.OS === 'web' && (e as any).stopPropagation()}
              >
                 <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Register New Official</Text>
                    <TouchableOpacity onPress={() => setIsAddOfficialModalVisible(false)}>
                       <X size={24} color="#6B7280" />
                    </TouchableOpacity>
                 </View>

                 <View style={styles.formGroup}>
                    <Text style={styles.label}>Official Name</Text>
                    <TextInput 
                      style={styles.formInput}
                      placeholder="e.g. Richard Illingworth"
                      value={newOfficialForm.name}
                      onChangeText={val => setNewOfficialForm({ ...newOfficialForm, name: val })}
                    />
                 </View>

                 <View style={styles.formGroup}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <TextInput 
                      style={styles.formInput}
                      placeholder="+91 00000 00000"
                      keyboardType="number-pad"
                      value={newOfficialForm.phone}
                      onChangeText={val => setNewOfficialForm({ ...newOfficialForm, phone: val })}
                    />
                 </View>

                 <TouchableOpacity 
                   style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                   onPress={handleCreateOfficial}
                   disabled={isSubmitting}
                 >
                    <Text style={styles.submitBtnText}>{isSubmitting ? 'Registering...' : 'Register & Select Official'}</Text>
                 </TouchableOpacity>
              </Pressable>
           </TouchableOpacity>
         </Modal>
      </View>
    );
  };

  const [isConfiguringOfficials, setIsConfiguringOfficials] = useState(false);

  const renderMoreActionsSheet = () => {
    const gridItems = [
      { id: 'help', label: 'Need Help', icon: HelpCircle },
      { id: 'rules', label: 'Match Rules', icon: Settings },
      { id: 'scorer', label: 'Change Scorer', icon: UserSquare2 },
      { id: 'squad', label: 'Change Squad', icon: Users },
      { id: 'scorecard', label: 'Full Scorecard', icon: LayoutGrid },
      { id: 'overs', label: 'Match Overs', icon: Clock },
      { id: 'replace', label: 'Replace Batters', icon: RotateCcw },
      { id: 'bonus', label: 'Bonus Runs', icon: PlusCircle },
      { id: 'dropped', label: 'Dropped Catch', icon: Hand },
      { id: 'saved', label: 'Runs Saved/Missed', icon: TrendingUp },
      { id: 'keeper', label: 'Change Keeper', icon: UserSquare2 },
      { id: 'breaks', label: 'Match Breaks', icon: Coffee },
      { id: 'powerplay', label: 'Power Play', icon: Zap },
      { id: 'target', label: 'Revise Target', icon: Target },
      { id: 'bowler', label: 'Change Bowler', icon: RefreshCw },
      { id: 'hurt', label: 'Retired Hurt (Batter)', icon: UserMinus },
      { id: 'declare', label: 'Declare/End Innings', icon: AlertCircle },
      { id: 'finish', label: 'End Match (Force)', icon: Trophy },
    ];

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMoreSheetVisible}
        onRequestClose={() => setIsMoreSheetVisible(false)}
      >
        <TouchableOpacity 
          style={styles.sheetOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMoreSheetVisible(false)}
        >
          <View style={styles.sheetContent}>
             <View style={styles.sheetHandle} />
             <ScrollView contentContainerStyle={styles.sheetGrid}>
                {gridItems.map(item => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.sheetGridItem}
                    onPress={async () => {
                       setIsMoreSheetVisible(false);
                       if (item.id === 'scorecard') {
                          setIsFullScorecardVisible(true);
                       } else if (item.id === 'replace') {
                          swapBatters();
                       } else if (item.id === 'bowler') {
                          setIsSelectingNextBowler(true);
                       } else if (item.id === 'hurt') {
                          setIsRetiredHurtModalVisible(true);
                       } else if (item.id === 'target') {
                          setIsReviseTargetModalVisible(true);
                       } else if (item.id === 'help') {
                          setIsHelpModalVisible(true);
                       } else if (item.id === 'rules') {
                          setIsRulesModalVisible(true);
                       } else if (item.id === 'overs') {
                          setIsChangeOversModalVisible(true);
                       } else if (item.id === 'squad') {
                          setIsSelectingPlayers(true);
                       } else if (item.id === 'breaks') {
                          setIsBreakModalVisible(true);
                       } else if (item.id === 'declare') {
                          await declareInnings();
                       } else if (item.id === 'finish') {
                          const force = prompt('Type "FINISH" to manually complete this match:');
                          if (force === 'FINISH') {
                             const resultConfirm = prompt('Enter final result (e.g. Team A won by 20 runs):');
                             if (inn) {
                               await supabase.from('innings').update({ 
                                 status: 'completed', 
                                 runs: inn.runs, 
                                 wickets: inn.wickets, 
                                 legal_balls: inn.legalBalls 
                               }).eq('id', inn.inningsId);
                               await pushLiveState(inn, matchConfig, liveMatchId, resultConfirm);
                             }
                             await supabase.from('matches').update({ status: 'completed', result_text: resultConfirm }).eq('id', liveMatchId);
                             alert('Match marked as completed!');
                             router.push('/cricket/matches');
                          }
                       } else if (item.id === 'dropped' || item.id === 'saved') {
                          alert(`${item.label} recorded!`);
                       } else if (item.id === 'bonus') {
                          setActiveExtraType('penalty');
                          setIsExtraRunsSelectorVisible(true);
                       } else {
                          alert(`${item.label} coming soon!`);
                       }
                    }}
                  >
                     <View style={styles.sheetIconBox}>
                        <item.icon size={26} color="#06392e" strokeWidth={1.5} />
                     </View>
                     <Text style={styles.sheetItemLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
             </ScrollView>
             <TouchableOpacity 
               style={styles.showLessBtn}
               onPress={() => setIsMoreSheetVisible(false)}
             >
                <Text style={styles.showLessText}>Show less</Text>
             </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  const renderExtraRunsSelector = () => {
    if (!isExtraRunsSelectorVisible || !activeExtraType) return null;

    const runOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const typeLabel = activeExtraType === 'wide' ? 'WIDE' : activeExtraType === 'noball' ? 'NO BALL' : activeExtraType === 'bye' ? 'BYE' : 'LEG BYE';

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isExtraRunsSelectorVisible}
        onRequestClose={() => setIsExtraRunsSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.qrModalContent, { height: 'auto', maxHeight: '80%', padding: 0, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['#01b854', '#06392e']}
              style={[styles.modalHeaderPremium, { padding: 24 }]}
            >
              <View>
                <Text style={styles.modalTitlePremium}>Extras Selection</Text>
                <Text style={styles.modalSubtitlePremium}>{typeLabel}: Select additional runs scored</Text>
              </View>
              <TouchableOpacity onPress={() => setIsExtraRunsSelectorVisible(false)} style={styles.closeBtnPremium}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={{ padding: 24 }}>
               <View style={styles.extraRunsGrid}>
                  {runOptions.map(runs => (
                    <TouchableOpacity 
                      key={runs} 
                      style={styles.extraRunTile}
                      onPress={() => {
                         handleAddExtra(activeExtraType, runs);
                         setIsExtraRunsSelectorVisible(false);
                         setActiveExtraType(null);
                      }}
                    >
                       <Text style={styles.extraRunTileText}>+{runs}</Text>
                       <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>RUNS</Text>
                    </TouchableOpacity>
                  ))}
               </View>
            </View>

            <View style={styles.modalFooterPremium}>
               <TouchableOpacity 
                 style={[styles.closeBtnFooter, { backgroundColor: '#F3F4F6' }]}
                 onPress={() => setIsExtraRunsSelectorVisible(false)}
               >
                  <Text style={[styles.closeBtnFooterText, { color: '#4B5563' }]}>Cancel</Text>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderScoringSettingsSidebar = () => {
    const sections = [
      {
        title: 'Match Settings',
        options: [
          'Change Match Overs', 
          'Match Rules (WD, NB, WW)', 
          'Revise Target (DLS/VJD)',
          'Add Bonus Runs',
          'Give Penalty Runs',
          'End / Declare Innings',
          'End Match'
        ]
      },
      {
        title: 'Players Settings',
        options: [
          'Change Playing Squad',
          'Change Bowler',
          'Replace Batters',
          'Retired Hurt (Batter)'
        ]
      },
      {
        title: 'Scorer Settings',
        options: [
          'Change Scorer',
          'Add Match Officials/Streamer',
          'Select Power Play Overs',
          'Set Match Breaks (Lunch, Drinks, etc.)',
          'Add Scorer Notes'
        ]
      },
      {
        title: 'Other Options',
        options: ['Scoring Help']
      }
    ];

    const closeDrawer = () => {
      Animated.timing(drawerAnim, {
        toValue: 400,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsScoringSettingsVisible(false);
      });
    };

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={isScoringSettingsVisible}
        onRequestClose={closeDrawer}
      >
        <TouchableOpacity 
          style={styles.drawerOverlay} 
          activeOpacity={1} 
          onPress={closeDrawer}
        >
          <Animated.View 
            style={[
              styles.drawerContent,
              { transform: [{ translateX: drawerAnim }] }
            ]}
          >
             <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Settings</Text>
                <TouchableOpacity onPress={closeDrawer}>
                   <X size={24} color="#06392e" />
                </TouchableOpacity>
             </View>

             <ScrollView style={{ flex: 1 }}>
                {sections.map(section => (
                  <View key={section.title} style={styles.settingSection}>
                     <TouchableOpacity 
                       style={styles.sectionHeaderRow}
                       onPress={() => setExpandedSettingSection(expandedSettingSection === section.title ? null : section.title)}
                     >
                        <Text style={styles.sectionHeaderTextMenu}>{section.title}</Text>
                        {expandedSettingSection === section.title ? <ChevronDown size={20} color="#6B7280" /> : <ChevronRight size={20} color="#6B7280" />}
                     </TouchableOpacity>

                     {expandedSettingSection === section.title && (
                       <View style={styles.sectionOptionsList}>
                          {section.options.map(opt => (
                            <TouchableOpacity 
                              key={opt} 
                              style={styles.settingOptionRow}
                              onPress={async () => {
                                if (opt === 'End / Declare Innings') {
                                  closeDrawer();
                                  await declareInnings();
                                } else if (opt === 'Change Match Overs') {
                                  closeDrawer();
                                  setIsChangeOversModalVisible(true);
                                } else if (opt === 'Revise Target (DLS/VJD)') {
                                  closeDrawer();
                                  setIsReviseTargetModalVisible(true);
                                } else if (opt === 'Retired Hurt (Batter)') {
                                  closeDrawer();
                                  setIsRetiredHurtModalVisible(true);
                                } else if (opt === 'Change Bowler') {
                                  closeDrawer();
                                  setIsSelectingNextBowler(true);
                                } else if (opt === 'Replace Batters') {
                                  closeDrawer();
                                  swapBatters();
                                } else if (opt === 'Add Match Officials/Streamer') {
                                  closeDrawer();
                                  setIsConfiguringOfficials(true);
                                } else if (opt === 'Change Playing Squad') {
                                  closeDrawer();
                                  setIsSelectingPlayers(true);
                                } else if (opt === 'Give Penalty Runs' || opt === 'Add Bonus Runs') {
                                  closeDrawer();
                                  setActiveExtraType('penalty');
                                  setIsExtraRunsSelectorVisible(true);
                                } else if (opt === 'Set Match Breaks (Lunch, Drinks, etc.)') {
                                  closeDrawer();
                                  setIsBreakModalVisible(true);
                                } else if (opt === 'Scoring Help') {
                                  closeDrawer();
                                  setIsHelpModalVisible(true);
                                } else if (opt === 'Match Rules (WD, NB, WW)') {
                                  closeDrawer();
                                  setIsRulesModalVisible(true);
                                } else if (opt === 'End Match') {
                                  if (typeof window !== 'undefined') {
                                    if (window.confirm('Are you sure you want to end the entire match now? This will finalize the result as it stands.')) {
                                       closeDrawer();
                                       // Reuse declareInnings but we might need a specific End Match logic if we want to skip 2nd inning
                                       await declareInnings(); 
                                    }
                                  }
                                } else {
                                  alert(`Opening: ${opt}`);
                                }
                              }}
                            >
                               <Text style={styles.settingOptionText}>{opt}</Text>
                            </TouchableOpacity>
                          ))}
                       </View>
                     )}
                  </View>
                ))}
             </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderTeamProfileView = () => (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.profileHeader}>
        <View style={styles.profileHeaderTop}>
          <TouchableOpacity onPress={() => setIsAddPlayerViewVisible(false)}>
            <ChevronRight size={28} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity onPress={() => {
              setActiveTeamForQr(activeTeamForPlayers);
              setIsQrModalVisible(true);
            }}>
              <QrCode size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProfileSubTab('stats')}>
              <Sliders size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleShareTeam(activeTeamForPlayers)}>
              <Share2 size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileInfoRow}>
          <View style={[styles.profileAvatar, { backgroundColor: activeTeamForPlayers?.bgColor || '#06392e' }]}>
            <Text style={styles.profileAvatarText}>{activeTeamForPlayers?.initials || 'T'}</Text>
          </View>
          <View>
            <Text style={styles.profileNameText}>{activeTeamForPlayers?.name}</Text>
            <Text style={styles.profileMetaText}>Since 2026 • {activeTeamForPlayers?.location}</Text>
          </View>
        </View>

        <View style={styles.profileActionsRow}>
          <TouchableOpacity style={styles.rankBtn}>
             <Trophy size={18} color="#FFFFFF" />
             <Text style={styles.rankBtnText}>Team Rank</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.insightsBtn}>
             <BarChart3 size={18} color="#FFFFFF" />
             <Text style={styles.insightsBtnText}>Insights</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.profileTabsFixed}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 24 }}>
          {['Matches', 'Leaderboard', 'Stats', 'Members', 'Trophies', 'Photos', 'Profile'].map(tab => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setProfileSubTab(tab.toLowerCase())}
              style={[styles.profileSubTab, profileSubTab === tab.toLowerCase() && styles.profileSubTabActive]}
            >
               <Text style={[styles.profileSubTabText, profileSubTab === tab.toLowerCase() && styles.profileSubTabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
         {renderProfileSubContent()}
      </ScrollView>
    </View>
  );

  const renderProfileSubContent = () => {
    switch (profileSubTab) {
      case 'matches':
        return (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionHeading}>Upcoming Matches</Text>
            {fetchedMatches.slice(0, 1).map(match => <MatchCard key={match.id} match={match} />)}
            <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Past Matches</Text>
            <View style={styles.profilePlaceholder}>
               <History size={48} color="#E5E7EB" />
               <Text style={styles.placeholderTitle}>No past matches</Text>
            </View>
          </View>
        );
      case 'members':
        return (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <Text style={styles.sectionHeading}>{teamMembers.length} Members</Text>
               <TouchableOpacity style={styles.addMemberSmallBtn} onPress={() => setManagementTab('squad')}>
                  <Plus size={16} color="#01b854" />
                  <Text style={styles.addMemberSmallText}>Add New</Text>
               </TouchableOpacity>
            </View>
            {teamMembers.map((member, idx) => (
              <View key={idx} style={[styles.playerCardRow, { borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' }]}>
                 <View style={styles.avatarCircle}>
                    <User size={24} color="#6B7280" />
                 </View>
                 <View>
                    <Text style={styles.playerNameText}>{member.player_name}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>All-rounder</Text>
                 </View>
              </View>
            ))}
          </View>
        );
      case 'stats':
        return (
          <View style={{ gap: 16 }}>
             <View style={styles.statsSummaryGrid}>
                {[
                  { label: 'Matches', value: '12', color: '#06392e' },
                  { label: 'Won', value: '8', color: '#01b854' },
                  { label: 'Lost', value: '4', color: '#EF4444' },
                  { label: 'Win %', value: '66%', color: '#dcc093' }
                ].map((stat, i) => (
                  <View key={i} style={styles.statBox}>
                     <Text style={[styles.statBoxValue, { color: stat.color }]}>{stat.value}</Text>
                     <Text style={styles.statBoxLabel}>{stat.label}</Text>
                  </View>
                ))}
             </View>
             <View style={styles.performanceChart}>
                <Text style={styles.sectionHeading}>Team Form</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                   {['W', 'W', 'L', 'W', 'W'].map((r, i) => (
                     <View key={i} style={[styles.formCircle, { backgroundColor: r === 'W' ? '#01b854' : '#EF4444' }]}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>{r}</Text>
                     </View>
                   ))}
                </View>
             </View>
          </View>
        );
      case 'trophies':
        return (
          <View style={styles.trophyGrid}>
             <View style={styles.trophyBox}>
                <Trophy size={40} color="#dcc093" />
                <Text style={styles.trophyYear}>2025</Text>
                <Text style={styles.trophyEvent}>City Premier League</Text>
             </View>
             <View style={[styles.trophyBox, { opacity: 0.3, borderStyle: 'dashed' }]}>
                <Trophy size={40} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>Next Trophy?</Text>
             </View>
          </View>
        );
      case 'leaderboard':
        return (
          <View style={{ gap: 12 }}>
             <View style={styles.leaderboardSubTabs}>
                {['Bat', 'Bowl', 'Field', 'Partnership'].map(st => (
                  <TouchableOpacity 
                    key={st} 
                    style={[styles.lbSubTab, leaderboardSubTab === st.toLowerCase() && styles.lbSubTabActive]}
                    onPress={() => setLeaderboardSubTab(st.toLowerCase())}
                  >
                     <Text style={[styles.lbSubTabText, leaderboardSubTab === st.toLowerCase() && styles.lbSubTabTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
             </View>
             
             <Text style={styles.sectionHeading}>Top {leaderboardSubTab} ranking</Text>
             {teamMembers.length > 0 ? teamMembers.slice(0, 3).map((m, i) => (
               <View key={i} style={styles.leaderboardRow}>
                  <Text style={styles.rankNum}>{i+1}</Text>
                  <View style={[styles.miniAvatar, { backgroundColor: i === 0 ? '#dcc093' : '#06392e' }]}><Text style={{ color: '#FFFFFF', fontSize: 10 }}>{m.player_name[0]}</Text></View>
                  <View style={{ flex: 1 }}>
                     <Text style={{ fontWeight: '700' }}>{m.player_name}</Text>
                     <Text style={{ fontSize: 11, color: '#6B7280' }}>8 matches played</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                     <Text style={{ color: '#01b854', fontWeight: '800' }}>{400 + (100 - i * 20)} pts</Text>
                     <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Avg: {45 - i*5}.2</Text>
                  </View>
               </View>
             )) : (
                <View style={[styles.profilePlaceholder, { paddingTop: 20 }]}>
                   <BarChart3 size={40} color="#E5E7EB" />
                   <Text style={styles.placeholderTitle}>No stats yet</Text>
                </View>
             )}
          </View>
        );
      default:
        return (
          <View style={styles.profilePlaceholder}>
            <Image source={{ uri: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} style={styles.placeholderImg} />
            <Text style={styles.placeholderTitle}>No {profileSubTab} yet</Text>
            <Text style={styles.placeholderDesc}>Start playing matches to see your {profileSubTab} here.</Text>
          </View>
        );
    }
  };

  const renderAddPlayerView = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isAddPlayerViewVisible}
      onRequestClose={() => setIsAddPlayerViewVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsAddPlayerViewVisible(false)}
      >
        <Pressable 
          style={[styles.addPlayerModalContent, managementTab === 'profile' && { height: '95%', padding: 0 }]} 
          onPress={(e) => {
            if (Platform.OS === 'web') {
              (e as any).stopPropagation();
            }
          }}
        >
          {managementTab === 'profile' ? renderTeamProfileView() : (
          <View style={{ flex: 1 }}>
          <View style={styles.addPlayerHeader}>
            <TouchableOpacity onPress={() => setIsAddPlayerViewVisible(false)}>
               <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.addPlayerTitle}>Add Player</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.addPlayerScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.activeTeamInfo}>
               <View style={[styles.teamAvatarLarge, activeTeamForPlayers?.bgColor && { backgroundColor: activeTeamForPlayers.bgColor }]}>
                  {activeTeamForPlayers?.image ? <Image source={{ uri: activeTeamForPlayers.image }} style={styles.teamImage} /> : <Text style={styles.teamInitialsLarge}>{activeTeamForPlayers?.initials}</Text>}
               </View>
               <Text style={styles.activeTeamName}>{activeTeamForPlayers?.name}</Text>
               <Text style={styles.activeTeamMeta}>{activeTeamForPlayers?.location}</Text>
            </View>

            <View style={styles.assignAdminBanner}>
               <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>A</Text>
               </View>
               <Text style={styles.adminBannerText}>Assign Admin of the Team</Text>
            </View>

            <TouchableOpacity style={styles.promoBanner}>
               <View style={styles.promoContent}>
                  <View style={styles.promoIconPlaceholder} />
                  <Text style={styles.promoText}>Get Squad Banners</Text>
               </View>
               <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.squadSection}>
               {teamMembers.length > 0 ? (
                 teamMembers.map((member, idx) => (
                   <View key={idx} style={styles.playerCardRow}>
                      <View style={styles.playerAvatar}>
                         {/* Placeholder image or initial */}
                         <View style={styles.avatarCircle}>
                            <Users size={24} color="#6B7280" />
                         </View>
                         <View style={styles.onlineDot} />
                      </View>
                      <Text style={styles.playerNameText}>{member.player_name}</Text>
                   </View>
                 ))
               ) : (
                 <View style={{ paddingTop: 20 }}>
                    <Text style={styles.sectionHeading}>Invite players via</Text>
                    
                    <View style={styles.inviteContainer}>
                       <View style={styles.inviteLabelRow}>
                          <Text style={styles.inviteLabel}>Team Link</Text>
                          <Share2 size={20} color="#01b854" />
                       </View>
                       
                       <View style={styles.linkBox}>
                          <View style={styles.linkIconWrapper}>
                             <Link size={20} color="#01b854" />
                          </View>
                          <Text style={styles.linkText} numberOfLines={2}>
                            https://bookyourground.com/invite-team/{activeTeamForPlayers?.id}
                          </Text>
                       </View>

                       <TouchableOpacity 
                         style={styles.shareBtn}
                         onPress={() => handleShareTeam(activeTeamForPlayers)}
                       >
                          <Text style={styles.shareBtnText}>Share With Captain/players</Text>
                       </TouchableOpacity>
                    </View>

                    <Text style={[styles.sectionHeading, { marginTop: 32 }]}>Manually add players via</Text>
                    
                    <TouchableOpacity 
                      style={styles.manualOption}
                      onPress={() => setIsAddMemberModalVisible(true)}
                    >
                       <View style={styles.optionCircle}>
                          <Smartphone size={24} color="#01b854" />
                       </View>
                       <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Add via Phone Number</Text>
                          <Text style={styles.optionSubtext}>Best for adding multiple players quickly.</Text>
                       </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.manualOption}
                      onPress={() => setIsContactPickerVisible(true)}
                    >
                       <View style={styles.optionCircle}>
                          <UserPlus size={24} color="#01b854" />
                       </View>
                       <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Add from Contacts</Text>
                          <Text style={styles.optionSubtext}>Best if players are already in your contacts.</Text>
                       </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.manualOption}
                      onPress={() => {
                        setActiveTeamForQr(activeTeamForPlayers);
                        setIsQrModalVisible(true);
                      }}
                    >
                       <View style={styles.optionCircle}>
                          <QrCode size={24} color="#01b854" />
                       </View>
                       <View style={styles.optionContent}>
                          <Text style={styles.optionTitle}>Team QR code</Text>
                          <Text style={styles.optionSubtext}>Scan and add players directly in team via QR code.</Text>
                       </View>
                    </TouchableOpacity>
                 </View>
               )}
            </View>
          </ScrollView>
          </View>
          )}

          <View style={styles.squadFooter}>
             <TouchableOpacity 
               style={[styles.footerTab, managementTab === 'profile' && styles.footerTabActive]}
               onPress={() => setManagementTab('profile')}
             >
                <Text style={[styles.footerTabText, managementTab === 'profile' && styles.footerTabTextActive]}>Team Profile</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               style={[styles.footerTab, managementTab === 'squad' && styles.footerTabActive]}
               onPress={() => setManagementTab('squad')}
             >
                <Text style={[styles.footerTabText, managementTab === 'squad' && styles.footerTabTextActive]}>Add Player</Text>
             </TouchableOpacity>
          </View>
        </Pressable>
    </TouchableOpacity>
  </Modal>
  );

  const renderAddMemberModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isAddMemberModalVisible}
      onRequestClose={() => setIsAddMemberModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsAddMemberModalVisible(false)}
      >
        <Pressable 
          style={styles.modalContent} 
          onPress={(e) => {
            if (Platform.OS === 'web') {
              (e as any).stopPropagation();
            }
          }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Player Manually</Text>
            <TouchableOpacity onPress={() => setIsAddMemberModalVisible(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Player Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. MS Dhoni"
              placeholderTextColor="#9CA3AF"
              value={memberForm.name}
              onChangeText={(text) => setMemberForm({ ...memberForm, name: text })}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.formInput}
              placeholder="+91 99999 00000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={memberForm.phone}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, '');
                setMemberForm({ ...memberForm, phone: digits,
});
              }}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleAddMember}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>{isSubmitting ? 'Adding...' : 'Add Player to Squad'}</Text>
          </TouchableOpacity>
        </Pressable>
      </TouchableOpacity>
    </Modal>
  );

  const renderContactPicker = () => {
    const mockContacts = [
      { name: 'Arjun Sharma', phone: '+91 98765 43210', initials: 'AS' },
      { name: 'Rohit Verma', phone: '+91 87654 32109', initials: 'RV' },
      { name: 'Rahul Singh', phone: '+91 76543 21098', initials: 'RS' },
      { name: 'Sandeep Mani', phone: '+91 65432 10987', initials: 'SM' },
      { name: 'Vikram Batra', phone: '+91 54321 09876', initials: 'VB' },
    ];

    const filteredContacts = mockContacts.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isContactPickerVisible}
        onRequestClose={() => setIsContactPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsContactPickerVisible(false)}
        >
          <Pressable 
            style={[styles.modalContent, { height: '80%', paddingBottom: 0 }]} 
            onPress={(e) => {
              if (Platform.OS === 'web') {
                (e as any).stopPropagation();
              }
            }}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Contact</Text>
              <TouchableOpacity onPress={() => setIsContactPickerVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBarContainer, { marginHorizontal: 0, marginBottom: 16 }]}>
              <Search size={16} color="#9CA3AF" />
              <TextInput 
                 placeholder="Search recent contacts..." 
                 style={styles.searchInput}
                 value={searchQuery}
                 onChangeText={setSearchQuery}
                 placeholderTextColor="#9CA3AF"
              />
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { marginBottom: 12 }]}>Recent Selections</Text>
              {filteredContacts.length > 0 ? filteredContacts.map((contact, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.contactItem}
                  onPress={() => {
                    setMemberForm({ name: contact.name, phone: contact.phone,
});
                    setIsContactPickerVisible(false);
                    setIsAddMemberModalVisible(true);
                  }}
                >
                  <View style={styles.contactAvatar}>
                     <Text style={styles.contactInitial}>{contact.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.contactName}>{contact.name}</Text>
                     <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )) : (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Users size={48} color="#E5E7EB" />
                  <Text style={{ marginTop: 12, color: '#9CA3AF' }}>No contacts found</Text>
                </View>
              )}
            </ScrollView>
            
            <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
               <TouchableOpacity 
                 style={[styles.submitBtn, { backgroundColor: '#F3F4F6', marginTop: 0 }]}
                 onPress={() => {
                   setIsContactPickerVisible(false);
                   setIsAddMemberModalVisible(true);
                 }}
               >
                  <Text style={[styles.submitBtnText, { color: '#374151' }]}>Don't see them? Add manually</Text>
               </TouchableOpacity>
            </View>
          </Pressable>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderActionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isActionModalVisible}
      onRequestClose={() => setIsActionModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setIsActionModalVisible(false)}
      >
        <View style={styles.actionModalContent}>
           <Text style={styles.actionModalTitle}>What would you like to do?</Text>
           
           <View style={styles.actionGrid}>
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  setIsActionModalVisible(false);
                  setIsSelectingTeams(true);
                }}
              >
                 <View style={[styles.actionIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Swords size={28} color="#01b854" />
                 </View>
                 <Text style={styles.actionLabel}>Start a Match</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  setIsActionModalVisible(false);
                  setIsCreateTeamModalVisible(true);
                }}
              >
                 <View style={[styles.actionIconBox, { backgroundColor: '#f2f7f5' }]}>
                    <Users size={28} color="#06392e" />
                 </View>
                 <Text style={styles.actionLabel}>Create Team</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                  setIsActionModalVisible(false);
                  alert('Tournament registration coming soon!');
                }}
              >
                 <View style={[styles.actionIconBox, { backgroundColor: '#fcf8ef' }]}>
                    <Trophy size={28} color="#dcc093" />
                 </View>
                 <Text style={styles.actionLabel}>Host Tournament</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => {
                   setIsActionModalVisible(false);
                   alert('Match booking coming soon!');
                }}
              >
                 <View style={[styles.actionIconBox, { backgroundColor: '#FAF5FF' }]}>
                    <Calendar size={28} color="#518167" />
                 </View>
                 <Text style={styles.actionLabel}>Book Ground</Text>
              </TouchableOpacity>
           </View>

           <TouchableOpacity 
             style={styles.actionCloseBtn}
             onPress={() => setIsActionModalVisible(false)}
           >
              <Text style={styles.actionCloseBtnText}>Close</Text>
           </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderDashboardView = () => (
    <View style={{ flex: 1 }}>
       <View style={styles.tabsStickyWrapper}>
          <View style={styles.tabsInnerRow}>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                {TABS.map(tab => (
                   <TouchableOpacity 
                     key={tab.id} 
                     style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                     onPress={() => setActiveTab(tab.id)}
                   >
                      <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
                   </TouchableOpacity>
                ))}
             </ScrollView>
             <TouchableOpacity 
               style={styles.plusIconWrapper}
               onPress={() => setIsActionModalVisible(true)}
             >
                <Plus size={24} color="#01b854" />
             </TouchableOpacity>
          </View>
       </View>
       <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent}>
          {renderContent()}
       </ScrollView>
       {renderAddPlayerView()}
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'matches':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              {['All', 'Played'].map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]}
                  onPress={() => setSubTab(label.toLowerCase())}
                >
                  <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
              <View style={styles.matchesList}>
                {fetchedMatches
                  .filter(m => {
                    if (subTab === 'all') return true;
                    if (subTab === 'played') return m.status === 'Result' || m.status === 'completed';
                    return m.status.toLowerCase() === subTab.toLowerCase();
                  })
                  .map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))
                }
              </View>
            </ScrollView>
          </View>
        );
      case 'tournaments':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              {['All', 'Participate', 'Network', 'Nearby'].map((label) => (
                <TouchableOpacity key={label} style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]} onPress={() => setSubTab(label.toLowerCase())}>
                  <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.matchesList}>
               {TOURNAMENTS_DATA.map(tournament => (
                 <TournamentCard key={tournament.id} tournament={tournament} />
               ))}
               <View style={styles.adBanner}>
                  <Image source={{ uri: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg' }} style={styles.adImage} />
                  <View style={styles.adOverlay}>
                     <Text style={styles.adTitle}>Don't let good\n<Text style={styles.adTitleBold}>cricket go unseen</Text></Text>
                     <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Stream now</Text></TouchableOpacity>
                  </View>
               </View>
            </View>
          </View>
        );
      case 'teams':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              {['Your', 'Opponents', 'Following'].map((label) => (
                <TouchableOpacity key={label} style={[styles.subTab, subTab === label.toLowerCase() && styles.subTabActive]} onPress={() => setSubTab(label.toLowerCase())}>
                  <Text style={[styles.subTabText, subTab === label.toLowerCase() && styles.subTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.searchBarContainer}>
               <Search size={16} color="#9CA3AF" />
               <TextInput placeholder="Quick search" placeholderTextColor="#9CA3AF" style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            <View style={styles.matchesList}>
               <CreateTeamCard />
               {teams
                 .filter(team => {
                   const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase());
                   if (subTab === 'your') return team.isUserTeam && matchesSearch;
                   return matchesSearch;
                 })
                 .map(team => (
                 <TeamCard 
                   key={team.id} 
                   team={team} 
                   onSelect={pickingFor ? handleTeamSelect : undefined}
                 />
               ))}
               <View style={styles.adBanner}>
                  <Image source={{ uri: 'https://images.pexels.com/photos/3771811/pexels-photo-3771811.jpeg' }} style={styles.adImage} />
                  <View style={styles.adOverlay}>
                     <Text style={styles.adTitle}>Find a more fulfilling job.\n<Text style={styles.adTitleBold}>LinkedIn</Text></Text>
                     <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Get the app</Text></TouchableOpacity>
                  </View>
               </View>
            </View>
          </View>
        );
      case 'stats':
        let currentStats = BATTING_STATS;
        if (subTab === 'bowling') currentStats = BOWLING_STATS;
        if (subTab === 'fielding') currentStats = FIELDING_STATS;
        if (subTab === 'captain') currentStats = CAPTAIN_STATS;

        return (
          <View style={{ flex: 1 }}>
            <View style={styles.statsPromoHeader}>
               <Text style={styles.statsPromoText}>Want to improve your stats?</Text>
               <TouchableOpacity style={styles.analyzeBtn}><Text style={styles.analyzeBtnText}>Analyze</Text></TouchableOpacity>
            </View>

            <View style={styles.statsFilterBar}>
              {['Batting', 'Bowling', 'Fielding', 'Captain'].map((label) => (
                <TouchableOpacity 
                  key={label}
                  style={[styles.statPill, subTab === label.toLowerCase() && styles.statPillActive]} 
                  onPress={() => setSubTab(label.toLowerCase())}
                >
                  <Text style={[styles.statPillText, subTab === label.toLowerCase() && styles.statPillTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.statsContent}>
               <View style={styles.statsSectionHeader}>
                  <Text style={styles.statsSectionTitle}>Overall</Text>
                  <TouchableOpacity style={styles.compareBtn}>
                     <Users2 size={14} color="#FFFFFF" strokeWidth={2.5} />
                     <Text style={styles.compareBtnText}>Compare</Text>
                  </TouchableOpacity>
               </View>

               <View style={styles.statsGrid}>
                  {currentStats.map((stat, idx) => (
                    <View key={idx} style={[styles.statTile, subTab === 'captain' && { width: '23.5%' }]}>
                       <Text style={stat.value.toString().length > 5 ? {fontSize: 14} : styles.statValue}>{stat.value}</Text>
                       <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                  ))}
               </View>

               {(subTab === 'fielding' || subTab === 'captain') && (
                 <View style={[styles.adBanner, { backgroundColor: '#E0F2FE' }]}>
                    <Image source={{ uri: 'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg' }} style={styles.adImage} />
                    <View style={styles.adOverlay}>
                       <Text style={styles.adTitle}>Find products from the\n<Text style={styles.adTitleBold}>Best Collection</Text></Text>
                       <TouchableOpacity style={[styles.adBtn, { backgroundColor: '#2563EB' }]}><Text style={styles.adBtnText}>Shop now</Text></TouchableOpacity>
                    </View>
                 </View>
               )}

               {subTab === 'captain' && (
                 <View style={styles.captainFooter}>
                    <Text style={styles.ballTypeLabel}>Leather ball 🎾</Text>
                    
                    <View style={styles.adBanner}>
                        <Image source={{ uri: 'https://images.pexels.com/photos/159443/pexels-photo-159443.jpeg' }} style={styles.adImage} />
                        <View style={styles.adOverlay}>
                          <Text style={styles.adTitle}>Beat the summer!\n<Text style={styles.adTitleBold}>Blinkit</Text></Text>
                          <TouchableOpacity style={[styles.adBtn, { backgroundColor: '#06392e' }]}><Text style={styles.adBtnText}>Order Now</Text></TouchableOpacity>
                        </View>
                    </View>
                 </View>
               )}

               {(subTab !== 'fielding' && subTab !== 'captain') && (
                 <View style={styles.adBanner}>
                    <Image source={{ uri: 'https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg' }} style={styles.adImage} />
                    <View style={styles.adOverlay}>
                       <Text style={styles.adTitle}>Amazon Prime\n<Text style={styles.adTitleBold}>Join Prime at ₹125/month*</Text></Text>
                       <TouchableOpacity style={styles.adBtn}><Text style={styles.adBtnText}>Install now</Text></TouchableOpacity>
                    </View>
                 </View>
               )}
            </View>
          </View>
        );
      case 'highlights':
        return (
          <View style={styles.tabContent}>
             <View style={styles.placeholderIconArea}><PlayCircle size={48} color="#01b854" /></View>
            <Text style={styles.placeholderTitle}>Match Highlights</Text>
            <Text style={styles.placeholderDesc}>Relive the best moments from recent matches. Watch videos and view gallery of top plays.</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const content = (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center' }}>
      <View style={{ 
        width: '100%', 
        maxWidth: 1200, 
        flex: 1, 
        backgroundColor: '#FFFFFF', 
        borderRadius: 24,
        marginVertical: 20,
        marginHorizontal: 16,
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 12, 
        elevation: 5,
        overflow: 'hidden'
      }}>
        {!isConfiguringDismissal && (
          <View style={styles.scoringTopNav}>
            <TouchableOpacity 
              style={styles.backNavBtn}
              onPress={() => router.push('/cricket/matches')}
            >
              <ChevronLeft size={20} color="#6B7280" />
              <Text style={styles.backNavBtnText}>Back to Matches</Text>
            </TouchableOpacity>
          </View>
        )}
        {isConfiguringDismissal ? renderDismissalConfiguration() : 
         isScoring ? renderLiveScoring() : 
         isSearchingOfficial ? renderOfficialSearch() : 
         isConfiguringOfficials ? renderMatchOfficials() : 
         isSelectingOpeners ? renderOpeningSelection() : 
         isConfiguringToss ? renderTossConfiguration() : 
         isConfiguringMatch ? renderMatchConfiguration() : 
         isSelectingTeams ? renderTeamSelection() : 
         (urlMatchId && !resumeFailed) ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <Trophy size={64} color="#01b854" style={{ marginBottom: 24 }} />
              <Text style={{ color: '#06392e', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12 }}>
              {["Umpire is deciding whether to call for tea...", "The batsman is complaining about the sight-screen...", "Groundsman is fixing the landing area...", "Waiting for the sightscreen to be moved..."][Math.floor(Date.now() / 2500) % 4]}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 14 }}>Initializing your match...</Text>
            </View>
          ) : renderDashboardView()}
        {renderPlayerSelection()}
        {renderTeamListModal()}
        {renderMatchInfoModal()}
        {renderWagonWheelModal()}
        {renderMatchResultModal()}
        {renderQrScannerModal()}
        {renderAddMemberModal()}
        {renderCreateTeamModal()}
        {renderContactPicker()}
        {renderActionModal()}
        {renderQrModal()}
        {renderSuccessModal()}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      {content}
    </SafeAreaView>
  );
}
