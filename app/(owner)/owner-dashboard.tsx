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

const THEME_BG = '#F8FAFC';
const THEME_CARD_BG = '#FFFFFF';
const THEME_ACCENT = '#01b854';
const THEME_TEXT = '#0F172A';
const THEME_GOLD = '#10B981';
const THEME_BORDER = '#F1F5F9';
const THEME_MUTED = '#64748B';

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
    occupancyRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

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

  const content = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} tintColor={THEME_ACCENT} />}
    >
      <View style={styles.mainWrapper}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'owner' && styles.activeTabButton]} 
            onPress={() => setActiveTab('owner')}
          >
            <Text style={[styles.tabText, activeTab === 'owner' && styles.activeTabText]}>Owner Hub</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'personal' && styles.activeTabButton]} 
            onPress={() => setActiveTab('personal')}
          >
            <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>Personal Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'profile' && styles.activeTabButton]} 
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'owner' && (
          <>
            <View style={styles.grid}>
              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Building2 size={22} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>My grounds</Text>
                  <Text style={styles.statsValue}>{stats.totalGrounds}</Text>
                  <Text style={styles.statsCaption}>{stats.totalGrounds === 1 ? '1 active ground' : `${stats.totalGrounds} active grounds`}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.statBoxWrapper} onPress={() => router.push('/(owner)/ground-bookings' as any)}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Calendar size={22} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Ground Bookings</Text>
                  <Text style={styles.statsValue}>{stats.totalBookingsOnMyGrounds}</Text>
                  <Text style={styles.statsCaption}>Confirmed games</Text>
                </View>
              </TouchableOpacity>



              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Swords size={24} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Other ground bookings</Text>
                  <Text style={styles.statsValue}>{stats.myOwnBookingsCount}</Text>
                  <Text style={styles.statsCaption}>Personal games</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <IndianRupee size={22} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Total earnings</Text>
                  <Text style={styles.statsValueSmall}>₹{stats.totalEarningsOnMyGrounds.toLocaleString('en-IN')}</Text>
                  <Text style={styles.statsCaption}>Total revenue</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <PieChart size={22} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Occupancy</Text>
                  <Text style={styles.statsValue}>{stats.occupancyRate}%</Text>
                  <Text style={styles.statsCaption}>Monthly utilization</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <IndianRupee size={22} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Paid Out</Text>
                  <Text style={styles.statsValueSmall}>₹{stats.totalWithdrawn.toLocaleString('en-IN')}</Text>
                  <Text style={styles.statsCaption}>Successfully paid</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <IndianRupee size={24} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Total spent</Text>
                  <Text style={styles.statsValueSmall}>₹{stats.totalSpentOnOtherGrounds.toLocaleString('en-IN')}</Text>
                  <Text style={styles.statsCaption}>On other grounds</Text>
                </View>
              </View>



              <TouchableOpacity style={styles.statBoxWrapper} onPress={() => router.push('/(tabs)/bookings' as any)}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Calendar size={24} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>My Bookings</Text>
                  <Text style={styles.statsValueSmall}>Player History</Text>
                  <Text style={styles.statsCaption}>Your personal bookings</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statBoxWrapper} onPress={() => router.push('/(owner)/add-ground' as any)}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <PlusCircle size={24} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Add Ground</Text>
                  <Text style={styles.statsValueSmall}>Register</Text>
                  <Text style={styles.statsCaption}>List new property</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statBoxWrapper} onPress={() => router.push('/(owner)/settings' as any)}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Settings size={24} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Settings</Text>
                  <Text style={styles.statsValueSmall}>Account</Text>
                  <Text style={styles.statsCaption}>Business settings</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statBoxWrapper} onPress={() => router.push('/(tabs)/support' as any)}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <LifeBuoy size={24} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Support</Text>
                  <Text style={styles.statsValueSmall}>Contact Us</Text>
                  <Text style={styles.statsCaption}>Get help</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'personal' && (
          <View>
            <View style={styles.grid}>
              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Users size={22} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Total Bookings</Text>
                  <Text style={styles.statsValue}>{stats.myOwnBookingsCount}</Text>
                  <Text style={styles.statsCaption}>{stats.myOwnBookingsCount === 1 ? '1 booking made' : `${stats.myOwnBookingsCount} bookings made`}</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Calendar size={22} color="#01b854" />
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

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Calendar size={22} color="#01b854" />
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

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Star size={22} color="#FFA000" />
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
          </View>
        )}
        
        {activeTab === 'profile' && (
          <View>
            <View style={styles.grid}>
              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  {editingField !== 'full_name' && (
                    <TouchableOpacity 
                      style={styles.editBtn} 
                      onPress={() => startEditing('full_name', profile?.full_name || '')}
                    >
                      <Pencil size={12} color="#01b854" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.iconCircle}>
                    <User size={22} color="#01b854" />
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

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  <View style={styles.iconCircle}>
                    <Mail size={22} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Email Address</Text>
                  <Text style={styles.statsValueSmall} numberOfLines={1}>{user?.email || 'N/A'}</Text>
                  <Text style={styles.statsCaption}>Login Email</Text>
                </View>
              </View>

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  {editingField !== 'phone' && (
                    <TouchableOpacity 
                      style={styles.editBtn} 
                      onPress={() => startEditing('phone', profile?.phone || '')}
                    >
                      <Pencil size={12} color="#01b854" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.iconCircle}>
                    <Phone size={22} color="#01b854" />
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

              <View style={styles.statBoxWrapper}>
                <View style={styles.statBox}>
                  {editingField !== 'business_name' && (
                    <TouchableOpacity 
                      style={styles.editBtn} 
                      onPress={() => startEditing('business_name', profile?.business_name || '')}
                    >
                      <Pencil size={12} color="#01b854" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.iconCircle}>
                    <ShieldCheck size={22} color="#01b854" />
                  </View>
                  <Text style={styles.statsLabel}>Business</Text>
                  
                  {editingField === 'business_name' ? (
                    <View style={styles.editContainer}>
                      <TextInput
                        style={styles.editInput}
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
                    <Text style={styles.statsValueSmall} numberOfLines={1}>{profile?.business_name || 'Personal Account'}</Text>
                  )}
                  <Text style={styles.statsCaption}>{profile?.business_verified ? 'Verified Partner' : 'Verification pending'}</Text>
                </View>
              </View>
            </View>
            
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
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
    alignSelf: 'center',
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 12,
    letterSpacing: -0.5,
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
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  statBoxWrapper: {
    width: '48%',
    marginBottom: 12,
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
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  statsValue: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -1,
  },
  statsValueSmall: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  statsCaption: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 16,
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
  } as any,
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
});
