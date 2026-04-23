import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  useWindowDimensions,
  Pressable,
  ActivityIndicator,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '../components/MobileAppNavbar';
import { Search, MapPin, Building2, Swords, Trophy, Star, ArrowRight, ChevronDown, Calendar } from 'lucide-react-native';
import { makeGroundPath } from '@/utils/groundSlug';
import { formatCurrency } from '@/utils/helpers';
import Button from '@/components/ui/Button';
import { Location, GroundType } from '@/types';

type SearchTab = 'all' | 'grounds' | 'matches';

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isCompact = width < 900;
  const IS_DARK = !isWeb || isCompact;
  
  const [query, setQuery] = useState((params.q as string) || '');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const labels: Record<string, string> = {
    all: 'All',
    grounds: 'Grounds',
    matches: 'Find Opposition'
  };
  const [results, setResults] = useState<{ grounds: any[], matches: any[] }>({ grounds: [], matches: [] });
  const [loading, setLoading] = useState(false);

   const [locationKey, setLocationKey] = useState<string>((params.location as string) || '');
  const [typeKey, setTypeKey] = useState<string>((params.type as string) || '');
  const [dateKey, setDateKey] = useState<string>('All');
  const [locations, setLocations] = useState<Location[]>([]);
  const [types, setTypes] = useState<GroundType[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  useEffect(() => {
    const loadFilters = async () => {
      const [locs, typs] = await Promise.all([
        supabase.from('locations').select('*').eq('active', true).order('sort_order'),
        supabase.from('ground_types').select('*').eq('active', true).order('sort_order')
      ]);
      setLocations(locs.data || []);
      setTypes(typs.data || []);
    };
    loadFilters();
  }, []);

  useEffect(() => {
    performSearch(query, locationKey, typeKey);
  }, [params.q, locationKey, typeKey]);

  const performSearch = async (s: string, locKey?: string, typKey?: string) => {
    setLoading(true);
    try {
      const ts = `%${(s || '').trim()}%`;

      // 1. Search Grounds
      let gQuery = supabase
        .from('grounds')
        .select('*, ground_images(*), reviews(rating)')
        .eq('active', true)
        .eq('approved', true);

      if (s.trim()) {
        gQuery = gQuery.or(`name.ilike.${ts},city.ilike.${ts},state.ilike.${ts},address.ilike.${ts}`);
      }

      if (locKey) {
        const [city, state] = locKey.split('__');
        gQuery = gQuery.eq('city', city).eq('state', state);
      }

      if (typKey) {
        gQuery = gQuery.eq('pitch_type', typKey);
      }

      const { data: gs } = await gQuery.limit(30);

      // 2. Search Matches using the same logic as "Find an Opponent"
      const todayISO = new Date().toISOString().split('T')[0];
      const { data: ms, error: mError } = await supabase
        .rpc('get_open_matchmaking_bookings', { p_today: todayISO })
        .select(`
          *,
          ground:grounds!inner(*, ground_images(*)),
          user:profiles(*)
        `);

      if (mError) console.error('Match search error:', mError);

      let filteredMs = ms || [];

      // Manual filtering for keywords/location/type on match results
      if (s.trim() || locKey || typKey) {
        filteredMs = filteredMs.filter((m: any) => {
          const matchesKeyword = !s.trim() || 
            (m.ground?.name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.ground?.city?.toLowerCase().includes(s.toLowerCase())) ||
            (m.user?.team_name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.user?.full_name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.opponent_team_name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.opponent_captain_name?.toLowerCase().includes(s.toLowerCase())) ||
            (m.notes?.toLowerCase().includes(s.toLowerCase()));
          
          const matchesLoc = !locKey || `${m.ground?.city}__${m.ground?.state}` === locKey;
          const matchesTyp = !typKey || m.ground?.pitch_type === typKey;

          return matchesKeyword && matchesLoc && matchesTyp;
        });
      }

      const { data: ps } = await supabase
        .from('profiles')
        .select(`
          team_name,
          full_name,
          bookings!user_id(
            *,
            ground:grounds(*, ground_images(*))
          )
        `)
        .or(`team_name.ilike.${ts},full_name.ilike.${ts}`)
        .limit(10);

      const additionalMs = (ps || [])
        .flatMap(p => (p.bookings || []).map(b => ({ ...b, user: { team_name: p.team_name, full_name: p.full_name } })))
        .filter(b => b.ground);

      setResults({
        grounds: gs || [],
        matches: [...(filteredMs || []), ...additionalMs].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMatch = (item: any) => {
    const citySlug = (item.ground?.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const nameSlug = (item.ground?.name || 'ground').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    router.push({
      pathname: `/ground/${citySlug}/${nameSlug}`,
      params: {
        date: item.booking_date,
        time: item.start_time?.slice(0, 5),
        teams: 'one',
        lock: 'true'
      }
    } as any);
  };

  const renderGround = ({ item }: { item: any }) => {
    const img = item.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
    const reviews = (item.reviews || []) as { rating: number }[];
    const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    const amenities = [
      { key: 'has_floodlights', label: 'Lights', icon: <Swords size={12} color="#fff" /> },
      { key: 'has_parking', label: 'Parking', icon: <Building2 size={12} color="#fff" /> },
      { key: 'has_changing_rooms', label: 'Changing rooms', icon: <Building2 size={12} color="#fff" /> },
      { key: 'has_pavilion', label: 'Pavilion', icon: <Building2 size={12} color="#fff" /> },
    ].filter(a => item[a.key]);

    return (
      <Pressable 
        style={styles.premiumCard}
        onPress={() => router.push(makeGroundPath(item) as any)}
      >
        <Image source={{ uri: img }} style={styles.premiumCardImage} />
        <View style={styles.premiumOverlay}>
          <Text style={styles.premiumTitle}>{item.name}</Text>
          
          <View style={styles.premiumInfoCard}>
            <View style={styles.premiumLocationRow}>
              <MapPin size={14} color="#fff" />
              <Text style={styles.premiumLocationText}>{item.city}, {item.state}</Text>
            </View>
            
            <View style={styles.premiumPriceRow}>
              <Text style={styles.premiumPriceText}>₹{item.base_price_per_hour}</Text>
              <Text style={styles.premiumPriceUnit}> / match</Text>
            </View>

            <View style={styles.premiumAmenities}>
              {amenities.map(a => (
                <View key={a.key} style={styles.premiumAmenityBadge}>
                  {a.icon}
                  <Text style={styles.premiumAmenityText}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.premiumBottomRow}>
            <View style={styles.premiumLocationLink}>
              <MapPin size={10} color="#FFFFFF" />
              <Text style={styles.premiumLocationLinkText}>{item.city}</Text>
            </View>
            
            <View style={styles.premiumRatingContainer}>
              <View style={styles.premiumStars}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={10} color={s <= avg ? "#FFA000" : "#fff"} fill={s <= avg ? "#FFA000" : "transparent"} />
                ))}
              </View>
              <Text style={styles.premiumReviewText}>
                {reviews.length > 0 ? `${reviews.length} reviews` : 'No reviews yet'}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderMatch = ({ item }: { item: any }) => {
    const img = item.ground?.ground_images?.[0]?.image_url || 'https://images.pexels.com/photos/1661950/pexels-photo-1661950.jpeg';
    const teamName = item.user?.team_name || 'Anonymous Team';
    const captainName = item.user?.full_name || 'Anonymous';
    
    return (
      <Pressable 
        style={styles.premiumCard} 
        onPress={() => handleJoinMatch(item)}
      >
        <Image source={{ uri: img }} style={styles.premiumCardImage} />
        <View style={styles.premiumOverlay}>
          <View style={styles.premiumMatchHeader}>
            <Text style={[styles.premiumTitle, { fontSize: 24, marginBottom: 2 }]}>Opposition - {teamName}</Text>
            <Text style={styles.premiumCaptainText}>Capt: {captainName}</Text>
          </View>
          
          <View style={styles.premiumInfoCard}>
            <View style={styles.premiumLocationRow}>
              <Swords size={16} color="#01b854" />
              <Text style={styles.premiumLocationText}>{item.ground?.name}</Text>
            </View>
            
            <View style={styles.premiumPriceRow}>
              <Text style={styles.premiumPriceText}>₹{item.total_amount || '---'}</Text>
              <Text style={styles.premiumPriceUnit}> / match</Text>
            </View>

            <View style={styles.premiumMatchMeta}>
                 <Text style={styles.premiumMatchMetaText}>{item.booking_date} @ {item.start_time?.slice(0, 5)}</Text>
            </View>
          </View>

          <View style={styles.premiumBottomRow}>
            <View style={styles.premiumLocationLink}>
              <MapPin size={10} color="#FFFFFF" />
              <Text style={styles.premiumLocationLinkText}>{item.ground?.city}</Text>
            </View>
            <Button 
                title="JOIN NOW" 
                onPress={() => handleJoinMatch(item)} 
                variant="primary"
                style={styles.premiumJoinBtnAction}
                textStyle={styles.premiumJoinBtnText}
            />
          </View>
        </View>
      </Pressable>
    );
  };

  const combinedResults = useMemo(() => {
    let filteredMatches = results.matches;
    if (dateKey !== 'All') {
      const today = new Date().toISOString().split('T')[0];
      if (dateKey === 'Today') {
        filteredMatches = filteredMatches.filter(m => m.booking_date === today);
      } else if (dateKey === 'Tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        filteredMatches = filteredMatches.filter(m => m.booking_date === tomorrowStr);
      }
    }

    if (activeTab === 'grounds') return results.grounds.map(g => ({ ...g, _type: 'ground' }));
    if (activeTab === 'matches') return filteredMatches.map(m => ({ ...m, _type: 'match' }));
    return [
      ...results.grounds.map(g => ({ ...g, _type: 'ground' })),
      ...filteredMatches.map(m => ({ ...m, _type: 'match' }))
    ];
  }, [results, activeTab, dateKey]);

  const content = (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {/* Sidebar */}
        {!isCompact && (
          <View style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScroll}>
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Search</Text>
                <View style={styles.sidebarSearchBox}>
                  <Search size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.sidebarSearchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Keywords..."
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={() => performSearch(query, locationKey, typeKey)}
                    returnKeyType="search"
                  />
                </View>
              </View>

              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Categories</Text>
                {(['all', 'grounds', 'matches'] as const).map(t => (
                  <Pressable 
                    key={t}
                    onPress={() => setActiveTab(t)}
                    style={[
                      styles.sidebarTab, 
                      activeTab === t && styles.sidebarTabActive
                    ]}
                  >
                    <Text style={[
                      styles.sidebarTabText, 
                      activeTab === t && styles.sidebarTabTextActive
                    ]}>
                        {labels[t]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {activeTab === 'matches' && (
                <View style={styles.sidebarSection}>
                  <Text style={styles.sidebarSectionTitle}>Game Date</Text>
                  <View style={styles.pillRow}>
                    {['All', 'Today', 'Tomorrow'].map(d => (
                      <Pressable 
                        key={d}
                        onPress={() => setDateKey(d)}
                        style={[styles.pill, dateKey === d && styles.pillActive]}
                      >
                        <Text style={[styles.pillText, dateKey === d && styles.pillTextActive]}>{d}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Location</Text>
                <Pressable style={styles.filterButton} onPress={() => setShowLocationModal(!showLocationModal)}>
                  <MapPin size={14} color="#01b854" />
                  <Text style={styles.filterButtonText} numberOfLines={1}>
                    {locationKey ? locations.find(l => `${l.city}__${l.state}` === locationKey)?.label || locationKey.split('__')[0] : 'All Locations'}
                  </Text>
                  <ChevronDown size={12} color="#9CA3AF" />
                </Pressable>
                {showLocationModal && (
                  <View style={styles.dropdownInline}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      <Pressable style={styles.dropdownOption} onPress={() => { setLocationKey(''); setShowLocationModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All Locations</Text>
                      </Pressable>
                      {locations.map(l => (
                        <Pressable key={`${l.city}__${l.state}`} style={styles.dropdownOption} onPress={() => { setLocationKey(`${l.city}__${l.state}`); setShowLocationModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{l.label || l.city}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

               <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Ground Type</Text>
                <Pressable style={styles.filterButton} onPress={() => setShowTypeModal(!showTypeModal)}>
                  <Building2 size={14} color="#01b854" />
                  <Text style={styles.filterButtonText} numberOfLines={1}>
                    {typeKey || 'All Types'}
                  </Text>
                  <ChevronDown size={12} color="#9CA3AF" />
                </Pressable>
                {showTypeModal && (
                  <View style={styles.dropdownInline}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      <Pressable style={styles.dropdownOption} onPress={() => { setTypeKey(''); setShowTypeModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All Types</Text>
                      </Pressable>
                      {types.map(t => (
                        <Pressable key={t.id} style={styles.dropdownOption} onPress={() => { setTypeKey(t.name); setShowTypeModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{t.label || t.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Results Area */}
        <View style={styles.resultsArea}>
          {isCompact && (
            <View style={styles.mobileHeader}>
              <View style={styles.sidebarSearchBox}>
                <Search size={16} color="#9CA3AF" />
                <TextInput
                  style={styles.sidebarSearchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Keywords..."
                  placeholderTextColor="#9CA3AF"
                  onSubmitEditing={() => performSearch(query, locationKey, typeKey)}
                  returnKeyType="search"
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileTabs}>
                {(['all', 'grounds', 'matches'] as const).map(t => (
                  <Pressable 
                    key={t}
                    onPress={() => setActiveTab(t)}
                    style={[
                      styles.tab, 
                      activeTab === t && styles.tabActive
                    ]}
                  >
                    <Text style={[
                      styles.tabText, 
                      activeTab === t && styles.tabTextActive
                    ]}>
                        {labels[t].toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileFiltersSlider}>
                <Pressable style={styles.mobileFilterPill} onPress={() => setShowLocationModal(true)}>
                  <MapPin size={12} color={locationKey ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.mobileFilterPillText, locationKey && styles.mobileFilterPillTextActive]}>
                    {locationKey ? locationKey.split('__')[0] : 'Location'}
                  </Text>
                </Pressable>

                {activeTab === 'matches' && (
                  <Pressable style={styles.mobileFilterPill} onPress={() => {
                    const nextDate = dateKey === 'All' ? 'Today' : dateKey === 'Today' ? 'Tomorrow' : 'All';
                    setDateKey(nextDate);
                  }}>
                    <Calendar size={12} color={dateKey !== 'All' ? '#01b854' : '#6B7280'} />
                    <Text style={[styles.mobileFilterPillText, dateKey !== 'All' && styles.mobileFilterPillTextActive]}>
                      {dateKey}
                    </Text>
                  </Pressable>
                )}

                <Pressable style={styles.mobileFilterPill} onPress={() => setShowTypeModal(true)}>
                  <Building2 size={12} color={typeKey ? '#01b854' : '#6B7280'} />
                  <Text style={[styles.mobileFilterPillText, typeKey && styles.mobileFilterPillTextActive]}>
                    {typeKey || 'Ground Type'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          )}

          {/* Inline Modals for Mobile */}
          {isCompact && (showLocationModal || showTypeModal) && (
            <View style={styles.mobileFilterDropdownOverlay}>
              <View style={styles.mobileFilterDropdownContent}>
                <View style={styles.mobileDropdownHeader}>
                  <Text style={styles.mobileDropdownTitle}>{showLocationModal ? 'Select Location' : 'Select Ground Type'}</Text>
                  <Pressable onPress={() => { setShowLocationModal(false); setShowTypeModal(false); }}>
                    <Text style={styles.closeText}>Done</Text>
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 300 }}>
                  {showLocationModal ? (
                    <>
                      <Pressable style={styles.dropdownOption} onPress={() => { setLocationKey(''); setShowLocationModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All Locations</Text>
                      </Pressable>
                      {locations.map(l => (
                        <Pressable key={`${l.city}__${l.state}`} style={styles.dropdownOption} onPress={() => { setLocationKey(`${l.city}__${l.state}`); setShowLocationModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{l.label || l.city}</Text>
                        </Pressable>
                      ))}
                    </>
                  ) : (
                    <>
                      <Pressable style={styles.dropdownOption} onPress={() => { setTypeKey(''); setShowTypeModal(false); }}>
                        <Text style={styles.dropdownOptionText}>All Types</Text>
                      </Pressable>
                      {types.map(t => (
                        <Pressable key={t.id} style={styles.dropdownOption} onPress={() => { setTypeKey(t.name); setShowTypeModal(false); }}>
                          <Text style={styles.dropdownOptionText}>{t.label || t.name}</Text>
                        </Pressable>
                      ))}
                    </>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color="#01b854" style={{ marginTop: 40 }} />
          ) : combinedResults.length === 0 ? (
            <View style={styles.empty}>
              <Trophy size={48} color="#E5E7EB" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Adjust your filters or try a different search term.</Text>
            </View>
          ) : (
            <FlatList
              data={combinedResults}
              key={isWeb && width > 1200 ? 'cols-2' : 'cols-1'}
              keyExtractor={item => item.id}
              renderItem={({ item }) => item._type === 'ground' ? renderGround({ item }) : renderMatch({ item })}
              contentContainerStyle={styles.list}
              numColumns={isWeb && width > 1200 ? 2 : 1}
              columnWrapperStyle={isWeb && width > 1200 ? { gap: 16 } : undefined}
            />
          )}
        </View>
      </View>
    </View>
  );

  if (isWeb) {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <View style={styles.container}>
      <MobileAppNavbar title="Search" />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: {
    backgroundColor: 'rgba(1,184,84,0.1)',
    borderColor: '#01b854',
  },
  pillText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#01b854',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 64,
        height: 'calc(100vh - 64px)' as any,
      }
    }) as any,
  },
  sidebarScroll: {
    padding: 16,
    gap: 20,
  },
  sidebarSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  sidebarSearchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }) as any,
  },
  sidebarSection: {
    gap: 8,
  },
  sidebarSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sidebarTab: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sidebarTabActive: {
    backgroundColor: 'rgba(1, 184, 84, 0.08)',
  },
  sidebarTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  sidebarTabTextActive: {
    color: '#01b854',
    fontWeight: '700',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  dropdownInline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 4,
    padding: 4,
  },
  dropdownOption: {
    padding: 10,
    borderRadius: 8,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  mobileFiltersSlider: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
  },
  mobileFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  mobileFilterPillText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  mobileFilterPillTextActive: {
    color: '#01b854',
  },
  mobileFilterDropdownOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    justifyContent: 'flex-end',
  },
  mobileFilterDropdownContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  mobileDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mobileDropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  closeText: {
    fontSize: 14,
    color: '#01b854',
    fontWeight: '700',
  },
  resultsArea: {
    flex: 1,
  },
  mobileHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  mobileTabs: {
    marginTop: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: '#01b854',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 80,
    gap: 16,
  },
  premiumCard: {
    flex: 1,
    height: 380,
    backgroundColor: '#111827',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  premiumCardImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  premiumOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  premiumMatchHeader: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  premiumTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  premiumCaptainText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  premiumInfoCard: {
    backgroundColor: 'rgba(25, 25, 25, 0.85)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    marginBottom: 24,
  },
  premiumLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
    width: '100%',
  },
  premiumLocationText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  premiumPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
    width: '100%',
  },
  premiumPriceText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#01b854',
    textAlign: 'center',
  },
  premiumPriceUnit: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  premiumAmenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  premiumAmenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumAmenityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  premiumRatingContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  premiumStars: {
    flexDirection: 'row',
    gap: 2,
  },
  premiumMatchMeta: {
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumMatchMetaText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  premiumBottomRow: {
    position: 'absolute' as any,
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  premiumReviewText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
  },
  premiumJoinBtnAction: {
    width: 140,
    height: 40,
    borderRadius: 99,
  },
  premiumJoinBtnText: {
    fontSize: 13,
    fontWeight: '900',
  },
  premiumLocationLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.9,
  },
  premiumLocationLinkText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardContent: {
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButton: {
    paddingHorizontal: 16,
    height: 36,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
});
