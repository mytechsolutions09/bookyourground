import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, useWindowDimensions, TextInput, ActivityIndicator } from 'react-native';
import { Building2, Calendar, IndianRupee, Star, LayoutDashboard, User, Mail, Phone, ShieldCheck, Pencil, Check, X, CalendarClock, Users, Swords, PlusCircle, Settings, LifeBuoy, PieChart } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing, 
  useAnimatedScrollHandler,
  runOnJS
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const THEME_BG = '#F8FAFC';
const THEME_CARD_BG = '#FFFFFF';
const THEME_ACCENT = '#01b854';
const THEME_TEXT = '#0F172A';
const THEME_GOLD = '#10B981';
const THEME_BORDER = '#F1F5F9';
const THEME_MUTED = '#64748B';
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

interface DashboardStats {
  totalGrounds: number;
  totalBookingsOnMyGrounds: number;
  myOwnBookingsCount: number; // rename to count for clarity
  totalEarningsOnMyGrounds: number;
  totalSpentOnOtherGrounds: number;
  totalWithdrawn: number;

  totalBookedGrounds: number;
  nextBooking: any;
  lastBooking: any;
  favoriteGround: any;
  occupancyRate: number;
}

export default function OwnerDashboardScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const isTablet = width >= 600 && width < 900;
  const isUltraNarrow = width < 350;
  const { user, profile, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'owner' | 'personal' | 'profile' | 'payout'>('owner');
  const [hasBanking, setHasBanking] = useState<boolean | null>(null);
  const [bankingLoading, setBankingLoading] = useState(true);
  const [editingField, setEditingField] = useState<null | 'full_name' | 'phone' | 'business_name'>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalGrounds: 0,
    totalBookingsOnMyGrounds: 0,
    myOwnBookingsCount: 0,
    totalEarningsOnMyGrounds: 0,
    totalSpentOnOtherGrounds: 0,
    totalWithdrawn: 0,
    totalBookedGrounds: 0,
    nextBooking: null,
    lastBooking: null,
    favoriteGround: null,
    occupancyRate: 0,
  });
  const [loading, setLoading] = useState(true);

  // Bank Form State
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    if (user) {
      loadStats();
      checkBanking();
    }
  }, [user]);

  const checkBanking = async () => {
    if (!user) return;
    try {
      setBankingLoading(true);
      const { data, error } = await supabase
        .from('owner_bank_details')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (data) {
        setHasBanking(true);
        setBankName(data.bank_name || '');
        setAccountNumber(data.account_number || '');
        setIfsc(data.ifsc || '');
        setUpiId(data.upi_id || '');
      } else {
        setHasBanking(false);
        setActiveTab('payout');
      }
    } catch (err) {
      console.error('Error checking banking:', err);
    } finally {
      setBankingLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const groundsRes = await supabase.from('grounds').select('id', { count: 'exact' }).eq('owner_id', user.id);
      const ownerGroundIds = (groundsRes.data || []).map(g => g.id);

      const [
        bookingsOnMyGroundsRes,
        myBookingsRes,
        earningsRes,
        withdrawalsRes,
        userAllBookingsRes,
        timeSlotsRes,
        occupancyRes,
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .in('ground_id', ownerGroundIds)
          .eq('status', 'confirmed'),
        supabase
          .from('bookings')
          .select('id, total_amount, status')
          .eq('user_id', user.id)
          .not('ground_id', 'in', `(${ownerGroundIds.join(',')})`)
          .eq('status', 'confirmed'),
        supabase
          .from('bookings')
          .select('total_amount, status')
          .in('ground_id', ownerGroundIds)
          .eq('status', 'confirmed'),
        supabase
          .from('withdrawals')
          .select('amount, status')
          .eq('owner_id', user.id),
        supabase
          .from('bookings')
          .select(`
            id,
            booking_date,
            start_time,
            end_time,
            ground_id,
            status,
            ground:grounds(
              id,
              name,
              city,
              state,
              pitch_type
            )
          `)
          .eq('user_id', user.id)
          .order('booking_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('time_slots')
          .select('id, ground_id, day_of_week')
          .in('ground_id', ownerGroundIds),
        supabase.rpc('get_owner_occupancy_rate', { target_owner_id: user.id }),
      ]);
      
      const timeSlotsData = timeSlotsRes.data || [];
      const occupancyData = (occupancyRes as any).data?.[0] || { occupancy_percentage: 0 };
      const occupancyRate = occupancyData.occupancy_percentage || 0;


      const earningsRows =
        (earningsRes.data as { total_amount: number | null; status: string }[] | null) ?? [];
      const totalEarningsOnMyGrounds = earningsRows
        .reduce((sum, b) => sum + (b.total_amount ?? 0), 0);

      const otherGroundRows =
        (myBookingsRes.data as { id: string; total_amount: number | null; status: string }[] | null) ??
        [];
      const myOwnBookings = otherGroundRows.length;
      const totalSpentOnOtherGrounds = otherGroundRows
        .reduce((sum, b) => sum + (b.total_amount ?? 0), 0);

      const withdrawalRows =
        (withdrawalsRes.data as { amount: number | null; status: string }[] | null) ?? [];
      const totalWithdrawn = withdrawalRows
        .filter((w) => (w.status || '').toLowerCase() === 'completed')
        .reduce((sum, w) => sum + (w.amount ?? 0), 0);

      // User stats calculation
      const userBookings = userAllBookingsRes.data || [];
      const todayIso = new Date().toISOString().split('T')[0];
      const upcoming = userBookings.filter((b) => b.booking_date >= todayIso);
      const past = userBookings.filter((b) => b.booking_date < todayIso);

      const nextRaw = upcoming[0] ?? null;
      const nextBooking = nextRaw ? {
        ...nextRaw,
        ground: Array.isArray(nextRaw.ground) ? nextRaw.ground[0] : nextRaw.ground
      } : null;

      const lastRaw = past.length > 0 ? past[past.length - 1] : null;
      const lastBooking = lastRaw ? {
        ...lastRaw,
        ground: Array.isArray(lastRaw.ground) ? lastRaw.ground[0] : lastRaw.ground
      } : null;
      const totalBookedGrounds = new Set(userBookings.map((b) => b.ground_id)).size;

      let favoriteGround = null;
      if (userBookings.length > 0) {
        const counts: Record<string, { count: number; name: string }> = {};
        for (const b of userBookings) {
          const id = b.ground_id;
          if (!id) continue;
          const groundData = Array.isArray(b.ground) ? b.ground[0] : b.ground;
          if (!counts[id]) counts[id] = { count: 0, name: groundData?.name ?? 'Ground' };
          counts[id].count += 1;
        }
        let bestId = null;
        let bestCount = 0;
        Object.entries(counts).forEach(([id, value]) => {
          if (value.count > bestCount) {
            bestId = id;
            bestCount = value.count;
          }
        });
        if (bestId) favoriteGround = { name: counts[bestId].name, count: bestCount };
      }

      setStats({
        totalGrounds: groundsRes.count || 0,
        totalBookingsOnMyGrounds: bookingsOnMyGroundsRes.count || 0,
        myOwnBookingsCount: otherGroundRows.length,
        totalEarningsOnMyGrounds,
        totalSpentOnOtherGrounds,
        totalWithdrawn,
        totalBookedGrounds,
        nextBooking,
        lastBooking,
        favoriteGround,
        occupancyRate,
      });
    } catch (e) {
      console.error('Error loading owner stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (field: 'full_name' | 'phone' | 'business_name', value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (!user || !editingField) return;
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ [editingField]: editValue.trim() })
        .eq('id', user.id);

      if (error) throw error;
      
      if (updateProfile) {
        await updateProfile({ [editingField]: editValue.trim() });
      }
      
      setEditingField(null);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const insets = useSafeAreaInsets();
  const horizontalPagerRef = React.useRef<any>(null);
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const HEADER_HEIGHT = 100;

  const onTabPress = (tab: 'owner' | 'personal' | 'profile' | 'payout') => {
    if (!hasBanking && tab !== 'payout') return; // Block tabs if no banking
    setActiveTab(tab);
    const idx = tab === 'owner' ? 0 : tab === 'personal' ? 1 : tab === 'profile' ? 2 : 3;
    horizontalPagerRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  const horizontalScrollHandler = useAnimatedScrollHandler({
    onMomentumEnd: (event) => {
      const idx = Math.round(event.contentOffset.x / width);
      const tab = idx === 0 ? 'owner' : idx === 1 ? 'personal' : idx === 2 ? 'profile' : 'payout';
      if (!hasBanking && tab !== 'payout') {
        horizontalPagerRef.current?.scrollTo({ x: 3 * width, animated: true });
        runOnJS(setActiveTab)('payout');
      } else {
        runOnJS(setActiveTab)(tab as any);
      }
    },
  });

  const verticalScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;

      if (diff > 10 && currentY > 50) {
        headerTranslateY.value = withTiming(-HEADER_HEIGHT - insets.top, { duration: 600, easing: Easing.out(Easing.exp) });
      } else if (diff < -10 || currentY < 20) {
        headerTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) });
      }
      lastScrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#F8FAFC',
  }));

  const renderOwnerHub = () => (
    <View style={styles.grid}>
      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Building2 size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>My grounds</Text>
          <Text style={styles.statsValue}>{stats.totalGrounds}</Text>
          <Text style={styles.statsCaption}>{stats.totalGrounds === 1 ? '1 active ground' : `${stats.totalGrounds} active grounds`}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]} 
        onPress={() => router.push('/(owner)/ground-bookings' as any)}
      >
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Calendar size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Ground Bookings</Text>
          <Text style={styles.statsValue}>{stats.totalBookingsOnMyGrounds}</Text>
          <Text style={styles.statsCaption}>Confirmed games</Text>
        </View>
      </TouchableOpacity>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Swords size={22} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Other ground bookings</Text>
          <Text style={styles.statsValue}>{stats.myOwnBookingsCount}</Text>
          <Text style={styles.statsCaption}>Personal games</Text>
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <IndianRupee size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Total earnings</Text>
          <Text style={styles.statsValueSmall}>₹{stats.totalEarningsOnMyGrounds.toLocaleString('en-IN')}</Text>
          <Text style={styles.statsCaption}>Total revenue</Text>
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <PieChart size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Occupancy</Text>
          <Text style={styles.statsValue}>{stats.occupancyRate}%</Text>
          <Text style={styles.statsCaption}>Monthly utilization</Text>
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <IndianRupee size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Paid Out</Text>
          <Text style={styles.statsValueSmall}>₹{stats.totalWithdrawn.toLocaleString('en-IN')}</Text>
          <Text style={styles.statsCaption}>Successfully paid</Text>
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <IndianRupee size={22} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Total spent</Text>
          <Text style={styles.statsValueSmall}>₹{stats.totalSpentOnOtherGrounds.toLocaleString('en-IN')}</Text>
          <Text style={styles.statsCaption}>On other grounds</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]} 
        onPress={() => router.push('/(tabs)/bookings' as any)}
      >
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Calendar size={22} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>My Bookings</Text>
          <Text style={styles.statsValueSmall}>Player History</Text>
          <Text style={styles.statsCaption}>Your personal bookings</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]} 
        onPress={() => router.push('/(owner)/add-ground' as any)}
      >
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <PlusCircle size={22} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Add Ground</Text>
          <Text style={styles.statsValueSmall}>Register</Text>
          <Text style={styles.statsCaption}>List new property</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]} 
        onPress={() => router.push('/(owner)/settings' as any)}
      >
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Settings size={22} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Settings</Text>
          <Text style={styles.statsValueSmall}>Account</Text>
          <Text style={styles.statsCaption}>Business settings</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]} 
        onPress={() => router.push('/(tabs)/support' as any)}
      >
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <LifeBuoy size={22} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Support</Text>
          <Text style={styles.statsValueSmall}>Contact Us</Text>
          <Text style={styles.statsCaption}>Get help</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPersonalActivity = () => (
    <View style={styles.grid}>
      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Users size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Total Bookings</Text>
          <Text style={styles.statsValue}>{stats.myOwnBookingsCount}</Text>
          <Text style={styles.statsCaption}>{stats.myOwnBookingsCount === 1 ? '1 booking made' : `${stats.myOwnBookingsCount} bookings made`}</Text>
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Calendar size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Next booking</Text>
          {stats.nextBooking ? (
            <>
              <Text style={styles.statsValueSmall} numberOfLines={1}>{stats.nextBooking.ground?.name}</Text>
              <Text style={styles.statsCaption}>{stats.nextBooking.booking_date}</Text>
              <Text style={[styles.statsCaption, { fontSize: 10 }]}>{formatBookingSlotSummary(stats.nextBooking.start_time, stats.nextBooking.end_time, stats.nextBooking.ground?.pitch_type)}</Text>
            </>
          ) : (
            <Text style={styles.statsCaption}>No upcoming</Text>
          )}
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Calendar size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Last booking</Text>
          {stats.lastBooking ? (
            <>
              <Text style={styles.statsValueSmall} numberOfLines={1}>{stats.lastBooking.ground?.name}</Text>
              <Text style={styles.statsCaption}>{stats.lastBooking.booking_date}</Text>
              <Text style={[styles.statsCaption, { fontSize: 10 }]}>{formatBookingSlotSummary(stats.lastBooking.start_time, stats.lastBooking.end_time, stats.lastBooking.ground?.pitch_type)}</Text>
            </>
          ) : (
            <Text style={styles.statsCaption}>No history</Text>
          )}
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '23.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Star size={20} color="#FFA000" />
          </View>
          <Text style={styles.statsLabel}>Favorite</Text>
          {stats.favoriteGround ? (
            <>
              <Text style={styles.statsValueSmall} numberOfLines={1}>{stats.favoriteGround.name}</Text>
              <Text style={styles.statsCaption}>{stats.favoriteGround.count} {stats.favoriteGround.count === 1 ? 'visit' : 'visits'}</Text>
            </>
          ) : (
            <Text style={styles.statsCaption}>N/A</Text>
          )}
        </View>
      </View>
    </View>
  );

  const handleSaveBank = async () => {
    if (!user) return;
    if (!bankName.trim() || !accountNumber.trim() || !ifsc.trim() || !upiId.trim()) {
      alert('All fields including UPI are required for payout setup.');
      return;
    }
    try {
      setSavingBank(true);
      const { error } = await supabase
        .from('owner_bank_details')
        .upsert({
          owner_id: user.id,
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          ifsc: ifsc.trim().toUpperCase(),
          upi_id: upiId.trim().toLowerCase(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'owner_id' });

      if (error) throw error;
      setHasBanking(true);
      setActiveTab('owner');
      alert('Banking details saved successfully! Your dashboard is now active.');
    } catch (e: any) {
      console.error('Error saving bank details:', e);
      alert('Error: ' + e.message);
    } finally {
      setSavingBank(false);
    }
  };

  const renderPayoutSetup = () => (
    <View style={styles.payoutContainer}>
      <Card style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <IndianRupee size={32} color={THEME_ACCENT} />
          <Text style={styles.payoutTitle}>Payout Information Required</Text>
          <Text style={styles.payoutSubtitle}>Please provide your banking and UPI details to enable dashboard features and receive payouts.</Text>
        </View>

        <View style={styles.bankForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BANK NAME</Text>
            <TextInput
              style={styles.formInput}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. HDFC Bank"
              placeholderTextColor={THEME_MUTED}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ACCOUNT NUMBER</Text>
            <TextInput
              style={styles.formInput}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Enter your account number"
              placeholderTextColor={THEME_MUTED}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.inputLabel}>IFSC CODE</Text>
              <TextInput
                style={styles.formInput}
                value={ifsc}
                onChangeText={setIfsc}
                placeholder="HDFC0001234"
                placeholderTextColor={THEME_MUTED}
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>UPI ID</Text>
              <TextInput
                style={styles.formInput}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="name@upi"
                placeholderTextColor={THEME_MUTED}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, savingBank && { opacity: 0.7 }]} 
            onPress={handleSaveBank}
            disabled={savingBank}
          >
            {savingBank ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>SAVE & ACTIVATE DASHBOARD</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );

  const renderProfileTab = () => (
    <View style={styles.grid}>
      <View style={[styles.statBoxWrapper, { width: width > 900 ? '31.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          {editingField !== 'full_name' && (
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => startEditing('full_name', profile?.full_name || '')}
            >
              <Pencil size={12} color="#01b854" />
            </TouchableOpacity>
          )}
          <View style={styles.iconCircle}>
            <User size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Full Name</Text>
          
          {editingField === 'full_name' ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
                placeholder="Full name"
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator size="small" color="#01b854" /> : <Check size={18} color="#01b854" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingField(null)} disabled={isSaving}>
                  <X size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.statsValueSmall} numberOfLines={1}>{profile?.full_name || 'N/A'}</Text>
          )}
          <Text style={styles.statsCaption}>Primary Account holder</Text>
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '31.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          <View style={styles.iconCircle}>
            <Mail size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Email Address</Text>
          <Text style={styles.statsValueSmall} numberOfLines={1}>{user?.email || 'N/A'}</Text>
          <Text style={styles.statsCaption}>Login Email</Text>
        </View>
      </View>

      <View style={[styles.statBoxWrapper, { width: width > 900 ? '31.5%' : (isTablet ? '31.5%' : (isUltraNarrow ? '100%' : '48.5%')) }]}>
        <View style={[styles.statBox, isUltraNarrow && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 20 }]}>
          {editingField !== 'phone' && (
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => startEditing('phone', profile?.phone || '')}
            >
              <Pencil size={12} color="#01b854" />
            </TouchableOpacity>
          )}
          <View style={styles.iconCircle}>
            <Phone size={20} color="#01b854" />
          </View>
          <Text style={styles.statsLabel}>Phone Number</Text>
          
          {editingField === 'phone' ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
                placeholder="Phone"
                keyboardType="phone-pad"
              />
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator size="small" color="#01b854" /> : <Check size={18} color="#01b854" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingField(null)} disabled={isSaving}>
                  <X size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={styles.statsValueSmall}>{profile?.phone || 'Not provided'}</Text>
          )}
          <Text style={styles.statsCaption}>Contact information</Text>
        </View>
      </View>

    </View>
  );

  if (Platform.OS === 'web' && !isCompact) {
    return (
      <WebLayout>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} tintColor={THEME_ACCENT} />}
        >
          <View style={styles.mainWrapper}>
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'owner' && styles.activeTabButton, !hasBanking && styles.disabledTab]} 
                onPress={() => hasBanking && setActiveTab('owner')}
              >
                <Text style={[styles.tabText, activeTab === 'owner' && styles.activeTabText]}>Owner Hub</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'personal' && styles.activeTabButton, !hasBanking && styles.disabledTab]} 
                onPress={() => hasBanking && setActiveTab('personal')}
              >
                <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>Personal Activity</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'profile' && styles.activeTabButton, !hasBanking && styles.disabledTab]} 
                onPress={() => hasBanking && setActiveTab('profile')}
              >
                <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
              </TouchableOpacity>
              {!hasBanking && (
                <TouchableOpacity 
                  style={[styles.tabButton, activeTab === 'payout' && styles.activeTabButton]} 
                  onPress={() => setActiveTab('payout')}
                >
                  <Text style={[styles.tabText, activeTab === 'payout' && styles.activeTabText]}>Payout Setup</Text>
                </TouchableOpacity>
              )}
            </View>

            {activeTab === 'payout' ? renderPayoutSetup() : activeTab === 'owner' ? renderOwnerHub() : activeTab === 'personal' ? renderPersonalActivity() : renderProfileTab()}
          </View>
        </ScrollView>
      </WebLayout>
    );
  }

  return (
    <View style={styles.nativeContainer}>
      <Animated.View style={headerAnimatedStyle}>
        <MobileAppNavbar title="Owner Dashboard" titleColor={THEME_ACCENT} />
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'owner' && styles.activeTabButton, !hasBanking && styles.disabledTab]} 
            onPress={() => onTabPress('owner')}
          >
            <Text style={[styles.tabText, activeTab === 'owner' && styles.activeTabText]}>Owner Hub</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'personal' && styles.activeTabButton, !hasBanking && styles.disabledTab]} 
            onPress={() => onTabPress('personal')}
          >
            <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'profile' && styles.activeTabButton, !hasBanking && styles.disabledTab]} 
            onPress={() => onTabPress('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
          </TouchableOpacity>
          {!hasBanking && (
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'payout' && styles.activeTabButton]} 
              onPress={() => onTabPress('payout')}
            >
              <Text style={[styles.tabText, activeTab === 'payout' && styles.activeTabText]}>Setup</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <AnimatedScrollView
        ref={horizontalPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Platform.OS === 'web' ? undefined : horizontalScrollHandler}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* Slide 1: Owner Hub */}
        <View style={{ width }}>
          <AnimatedScrollView
            onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
            scrollEventThrottle={16}
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + insets.top + 16, paddingHorizontal: 16 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} tintColor={THEME_ACCENT} />}
          >
            {renderOwnerHub()}
          </AnimatedScrollView>
        </View>

        {/* Slide 2: Activity */}
        <View style={{ width }}>
          <AnimatedScrollView
            onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
            scrollEventThrottle={16}
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + insets.top + 16, paddingHorizontal: 16 }]}
            showsVerticalScrollIndicator={false}
          >
            {renderPersonalActivity()}
          </AnimatedScrollView>
        </View>

        {/* Slide 3: Profile */}
        <View style={{ width }}>
          <AnimatedScrollView
            onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
            scrollEventThrottle={16}
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + insets.top + 16, paddingHorizontal: 16 }]}
            showsVerticalScrollIndicator={false}
          >
            {renderProfileTab()}
          </AnimatedScrollView>
        </View>

        {/* Slide 4: Payout Setup */}
        {!hasBanking && (
          <View style={{ width }}>
            <AnimatedScrollView
              onScroll={Platform.OS === 'web' ? undefined : verticalScrollHandler}
              scrollEventThrottle={16}
              style={styles.container}
              contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_HEIGHT + insets.top + 16, paddingHorizontal: 16 }]}
              showsVerticalScrollIndicator={false}
            >
              {renderPayoutSetup()}
            </AnimatedScrollView>
          </View>
        )}
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 0,
  },
  mainWrapper: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 6,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  tabText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#01b854',
    fontWeight: '700',
  },
  disabledTab: {
    opacity: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  statBoxWrapper: {
    width: '48.5%',
    marginBottom: 16,
  },
  statBox: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statsLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  statsValue: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statsValueSmall: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  statsCaption: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
  },
  editBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 0,
    marginVertical: 2,
    maxWidth: '100%',
  },
  editInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    paddingVertical: 10,
    fontFamily: 'Inter',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      }
    })
  } as any,
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  payoutContainer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    marginTop: 20,
  },
  payoutCard: {
    padding: 32,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  payoutHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  payoutTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
    textAlign: 'center',
  },
  payoutSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  bankForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#01b854',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
