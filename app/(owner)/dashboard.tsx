import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform, TouchableOpacity, useWindowDimensions, TextInput, ActivityIndicator } from 'react-native';
import { Building2, Calendar, IndianRupee, Star, LayoutDashboard, User, Mail, Phone, ShieldCheck, Pencil, Check, X, CalendarClock, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Card from '@/components/ui/Card';
import WebLayout from '@/components/web/WebLayout';
import { router } from 'expo-router';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';

const THEME_BG = '#043529';
const THEME_CARD_BG = '#06392e';
const THEME_ACCENT = '#00ea6b';
const THEME_TEXT = '#FFFFFF';
const THEME_GOLD = '#dcc093';

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
}

export default function OwnerDashboardScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const { user, profile, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'owner' | 'personal' | 'profile'>('owner');
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [
        groundsRes,
        bookingsOnMyGroundsRes,
        myBookingsRes,
        earningsRes,
        withdrawalsRes,
        userAllBookingsRes,
      ] = await Promise.all([
        supabase.from('grounds').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase
          .from('bookings')
          .select('id, ground:grounds!inner(owner_id)', { count: 'exact', head: true })
          .eq('ground.owner_id', user.id)
          .eq('status', 'confirmed'),
        supabase
          .from('bookings')
          .select('id, total_amount, status, ground:grounds!inner(owner_id)')
          .eq('user_id', user.id)
          .neq('ground.owner_id', user.id)
          .eq('status', 'confirmed'),
        supabase
          .from('bookings')
          .select('total_amount, status, ground:grounds!inner(owner_id)')
          .eq('ground.owner_id', user.id)
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
      ]);

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
      });
    } catch (e) {
      console.error('Error loading owner stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (field: 'full_name' | 'phone' | 'business_name', currentVal: string) => {
    setEditingField(field);
    setEditValue(currentVal || '');
  };

  const handleSave = async () => {
    if (!editingField || !user) return;
    
    try {
      setIsSaving(true);
      const { error } = await updateProfile({ [editingField]: editValue });
      if (error) throw error;
      setEditingField(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      // Optional: alert user of error
    } finally {
      setIsSaving(false);
    }
  };

  const IS_DARK = Platform.OS !== 'web' || isCompact;

  const content = (
    <ScrollView
      style={[styles.container, IS_DARK && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} tintColor={IS_DARK ? THEME_ACCENT : '#01b854'} />}
    >
      <View style={styles.mainWrapper}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'owner' && styles.activeTabButton, IS_DARK && activeTab === 'owner' && styles.activeTabButtonDark]} 
            onPress={() => setActiveTab('owner')}
          >
            <Text style={[styles.tabText, activeTab === 'owner' && styles.activeTabText]}>Owner Hub</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'personal' && styles.activeTabButton, IS_DARK && activeTab === 'personal' && styles.activeTabButtonDark]} 
            onPress={() => setActiveTab('personal')}
          >
            <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>Personal Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'profile' && styles.activeTabButton, IS_DARK && activeTab === 'profile' && styles.activeTabButtonDark]} 
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>My Profile</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'owner' && (
          <>
            <View style={styles.grid}>
              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Building2 size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>My grounds</Text>
                  <Text style={[styles.statsValue, IS_DARK && styles.statsValueDark]}>{stats.totalGrounds}</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>{stats.totalGrounds === 1 ? '1 active ground' : `${stats.totalGrounds} active grounds`}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.statBoxWrapper} onPress={() => router.push('/(owner)/bookings' as any)}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Calendar size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Bookings on my grounds</Text>
                  <Text style={[styles.statsValue, IS_DARK && styles.statsValueDark]}>{stats.totalBookingsOnMyGrounds}</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Confirmed games</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statBoxWrapper} onPress={() => router.push('/(owner)/inventory' as any)}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <CalendarClock size={24} color="#00ea6b" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Manage Slots</Text>
                  <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]}>Inventory</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Check availability</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Calendar size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Other ground bookings</Text>
                  <Text style={[styles.statsValue, IS_DARK && styles.statsValueDark]}>{stats.myOwnBookingsCount}</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Personal games</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <IndianRupee size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Total earnings</Text>
                  <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]}>₹{stats.totalEarningsOnMyGrounds.toLocaleString('en-IN')}</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Total revenue</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <IndianRupee size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Amount withdrawn</Text>
                  <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]}>₹{stats.totalWithdrawn.toLocaleString('en-IN')}</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Successfully paid</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <IndianRupee size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Total spent</Text>
                  <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]}>₹{stats.totalSpentOnOtherGrounds.toLocaleString('en-IN')}</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>On other grounds</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'personal' && (
          <View>
            <View style={styles.grid}>
              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Users size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Total Bookings</Text>
                  <Text style={[styles.statsValue, IS_DARK && styles.statsValueDark]}>{stats.myOwnBookingsCount}</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>{stats.myOwnBookingsCount === 1 ? '1 booking made' : `${stats.myOwnBookingsCount} bookings made`}</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Calendar size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Next booking</Text>
                  {stats.nextBooking ? (
                    <>
                      <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>{stats.nextBooking.ground?.name}</Text>
                      <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>{stats.nextBooking.booking_date}</Text>
                      <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark, { fontSize: 10 }]}>{formatBookingSlotSummary(stats.nextBooking.start_time, stats.nextBooking.end_time, stats.nextBooking.ground?.pitch_type)}</Text>
                    </>
                  ) : (
                    <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>No upcoming</Text>
                  )}
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Calendar size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Last booking</Text>
                  {stats.lastBooking ? (
                    <>
                      <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>{stats.lastBooking.ground?.name}</Text>
                      <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>{stats.lastBooking.booking_date}</Text>
                      <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark, { fontSize: 10 }]}>{formatBookingSlotSummary(stats.lastBooking.start_time, stats.lastBooking.end_time, stats.lastBooking.ground?.pitch_type)}</Text>
                    </>
                  ) : (
                    <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>No history</Text>
                  )}
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Star size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Favorite</Text>
                  {stats.favoriteGround ? (
                    <>
                      <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>{stats.favoriteGround.name}</Text>
                      <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>{stats.favoriteGround.count} {stats.favoriteGround.count === 1 ? 'visit' : 'visits'}</Text>
                    </>
                  ) : (
                    <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>N/A</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
        
        {activeTab === 'profile' && (
          <View>
            <View style={styles.grid}>
              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  {editingField !== 'full_name' && (
                    <TouchableOpacity 
                      style={styles.editBtn} 
                      onPress={() => startEditing('full_name', profile?.full_name || '')}
                    >
                      <Pencil size={12} color={IS_DARK ? THEME_ACCENT : '#01b854'} />
                    </TouchableOpacity>
                  )}
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <User size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Full Name</Text>
                  
                  {editingField === 'full_name' ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={[styles.editInput, IS_DARK && styles.editInputDark]}
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
                    <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>{profile?.full_name || 'N/A'}</Text>
                  )}
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Primary Account holder</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Mail size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Email Address</Text>
                  <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>{user?.email || 'N/A'}</Text>
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Login Email</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  {editingField !== 'phone' && (
                    <TouchableOpacity 
                      style={styles.editBtn} 
                      onPress={() => startEditing('phone', profile?.phone || '')}
                    >
                      <Pencil size={12} color={IS_DARK ? THEME_ACCENT : '#01b854'} />
                    </TouchableOpacity>
                  )}
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <Phone size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Phone Number</Text>
                  
                  {editingField === 'phone' ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={[styles.editInput, IS_DARK && styles.editInputDark]}
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
                    <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]}>{profile?.phone || 'Not provided'}</Text>
                  )}
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>Contact information</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={[styles.statBox, IS_DARK && styles.statBoxDark]}>
                  {editingField !== 'business_name' && (
                    <TouchableOpacity 
                      style={styles.editBtn} 
                      onPress={() => startEditing('business_name', profile?.business_name || '')}
                    >
                      <Pencil size={12} color={IS_DARK ? THEME_ACCENT : '#01b854'} />
                    </TouchableOpacity>
                  )}
                  <View style={[styles.iconCircle, IS_DARK && styles.iconCircleDark]}>
                    <ShieldCheck size={24} color="#01b854" />
                  </View>
                  <Text style={[styles.statsLabel, IS_DARK && styles.statsLabelDark]}>Business</Text>
                  
                  {editingField === 'business_name' ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={[styles.editInput, IS_DARK && styles.editInputDark]}
                        value={editValue}
                        onChangeText={setEditValue}
                        autoFocus
                        placeholder="Business name"
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
                    <Text style={[styles.statsValueSmall, IS_DARK && styles.statsValueSmallDark]} numberOfLines={1}>{profile?.business_name || 'Personal Account'}</Text>
                  )}
                  <Text style={[styles.statsCaption, IS_DARK && styles.statsCaptionDark]}>{profile?.business_verified ? 'Verified Partner' : 'Verification pending'}</Text>
                </View>
              </View>
            </View>
            
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout noCard>{content}</WebLayout>;
  }

  return (
    <View style={styles.nativeContainer}>
      <MobileAppNavbar title="Owner Dashboard" titleColor={THEME_ACCENT} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    backgroundColor: THEME_BG,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  containerDark: {
    backgroundColor: THEME_BG,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 0,
  },
  mainWrapper: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 12,
    letterSpacing: -0.5,
  },
  sectionTitleDark: {
    color: THEME_TEXT,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 999,
    padding: 6,
    marginBottom: 24,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  tabButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  activeTabButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
  },
  activeTabText: {
    color: '#01b854',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  statBoxWrapper: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '50%',
  },
  statBox: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statBoxDark: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(0,234,107,0.1)',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircleDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
    paddingVertical: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  statsLabelDark: {
    color: '#9ca3af',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 2,
    letterSpacing: -1,
  },
  statsValueDark: {
    color: THEME_TEXT,
  },
  statsValueSmall: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  statsValueSmallDark: {
    color: THEME_GOLD,
  },
  statsCaption: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  statsCaptionDark: {
    color: '#9ca3af',
    opacity: 0.8,
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
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 16,
    marginVertical: 2,
    maxWidth: '100%',
  },
  editInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '300',
    color: '#111827',
    paddingVertical: 6,
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
    outlineStyle: 'none',
  } as any,
  editInputDark: {
    color: THEME_TEXT,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
  },
});
