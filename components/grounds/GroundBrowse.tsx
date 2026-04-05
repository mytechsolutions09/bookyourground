import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
import { Alert } from 'react-native';
import type { GroundWithImages as GroundWithImagesType } from '@/types';

function makeGroundPath(ground: GroundWithImagesType): string {
  const name = (ground.name ?? '').toString().toLowerCase().trim();
  const city = (ground.city ?? '').toString().toLowerCase().trim();
  const slugify = (value: string) =>
    (value || 'ground')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  const citySlug = slugify(city || 'city');
  const nameSlug = slugify(name);
  return `/ground/${encodeURIComponent(citySlug)}/${encodeURIComponent(nameSlug)}`;
}

function FilterDropdown({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const display = (v: string) => (v === 'all' ? 'All' : v);

  return (
    <View style={styles.dropdownOuter}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.dropdownButton, open && styles.dropdownButtonOpen]}
      >
        <Text style={styles.dropdownButtonText}>{display(value)}</Text>
      </Pressable>

      {open ? (
        <>
          <Pressable
            style={styles.dropdownBackdrop}
            onPress={() => setOpen(false)}
          />
          <View style={styles.dropdownMenu}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={[styles.dropdownOption, opt === value && styles.dropdownOptionActive]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    opt === value && styles.dropdownOptionTextActive,
                  ]}
                >
                  {display(opt)}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

export default function GroundBrowse(props: { title?: string }) {
  const { title } = props;

  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('any');
  const [timeFilter, setTimeFilter] = useState<string>('any');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  useEffect(() => {
    loadGrounds();
    if (user?.id) {
      loadFavorites();
    } else {
      setFavoriteIds(new Set());
    }
  }, [user?.id]);

  const loadFavorites = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('ground_id')
        .eq('user_id', user.id);
      if (error) throw error;
      setFavoriteIds(new Set((data || []).map(f => f.ground_id)));
    } catch (e) {
      console.warn('Error loading favorites:', e);
    }
  };

  const loadGrounds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('grounds')
        .select(
          `
          *,
          ground_images(*),
          reviews(rating)
        `,
        )
        .eq('active', true)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrounds((data || []) as GroundWithImages[]);
    } catch (error) {
      console.error('Error loading grounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (groundId: string) => {
    if (!user) {
      Alert.alert('Login required', 'Please sign in to favorite grounds.');
      router.push('/(auth)/login' as any);
      return;
    }
    if (favoriteLoadingId) return;

    const isFav = favoriteIds.has(groundId);
    setFavoriteLoadingId(groundId);
    try {
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('ground_id', groundId);
        if (error) throw error;
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(groundId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, ground_id: groundId });
        if (error) throw error;
        setFavoriteIds(prev => new Set([...prev, groundId]));
      }
    } catch (e: any) {
      console.error('Error toggling favorite:', e);
      Alert.alert('Error', e.message ?? 'Failed to update favorites');
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  const locationOptions = useMemo(() => {
    const cities = Array.from(new Set(grounds.map((g) => g.city).filter(Boolean)));
    return ['all', ...cities];
  }, [grounds]);

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(grounds.map((g) => g.pitch_type).filter((t): t is string => !!t)));
    return ['all', ...types];
  }, [grounds]);

  const dateOptions = ['any', 'today', 'tomorrow', 'this week'];
  const timeOptions = ['any', 'morning', 'afternoon', 'evening', 'night'];

  const filteredGrounds = grounds.filter((ground) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ground.name.toLowerCase().includes(q) ||
      ground.city.toLowerCase().includes(q) ||
      ground.state.toLowerCase().includes(q);

    const matchesLocation = locationFilter === 'all' || ground.city === locationFilter;
    const matchesType = typeFilter === 'all' || ground.pitch_type === typeFilter;

    return matchesSearch && matchesLocation && matchesType;
  });

  const numColumns = Platform.OS === 'web'
    ? width >= 1200
      ? 3
      : width >= 800
      ? 2
      : 1
    : 1;

  return (
    <View style={styles.container}>
      <View style={styles.headerOuter}>
        <View style={[styles.header, Platform.OS === 'web' && styles.webHeader]}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or location"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.filtersWrap}>
            <View style={styles.filtersGroup}>
              <Text style={styles.filtersLabel}>Location</Text>
              <FilterDropdown
                options={locationOptions}
                value={locationFilter}
                onChange={setLocationFilter}
              />
            </View>

            <View style={styles.filtersGroup}>
              <Text style={styles.filtersLabel}>Type</Text>
              <FilterDropdown options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
            </View>

            <View style={styles.filtersGroup}>
              <Text style={styles.filtersLabel}>Date</Text>
              <FilterDropdown options={dateOptions} value={dateFilter} onChange={setDateFilter} />
            </View>

            <View style={styles.filtersGroup}>
              <Text style={styles.filtersLabel}>Time Slot</Text>
              <FilterDropdown options={timeOptions} value={timeFilter} onChange={setTimeFilter} />
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredGrounds}
        renderItem={({ item, index }) => {
          const isWebGrid = Platform.OS === 'web' && numColumns > 1;
          return (
            <View
              style={[
                isWebGrid && styles.cardColumn,
                isWebGrid && (index % numColumns !== numColumns - 1) && styles.cardColumnSpacing,
              ]}
            >
              <GroundCard
                ground={item}
                onPress={() => router.push(makeGroundPath(item) as any)}
                showBookingSchedule={false}
                isFavorite={favoriteIds.has(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                favoriteLoading={favoriteLoadingId === item.id}
              />
            </View>
          );
        }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGrounds} />}
        numColumns={numColumns}
        key={Platform.OS === 'web' ? `web-${numColumns}` : 'mobile'}
        columnWrapperStyle={Platform.OS === 'web' && numColumns > 1 ? styles.row : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{searchQuery ? 'No grounds found' : 'No grounds available'}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerOuter: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...Platform.select({
      web: {
        marginTop: 78,
        zIndex: 2000,
        position: 'relative' as any,
      },
    }),
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    overflow: 'visible' as any,
    zIndex: 2100,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  webHeader: {
    paddingTop: 20,
  },
  row: {
    gap: 16,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    zIndex: 1,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  cardColumn: {
    flex: 1,
  },
  cardColumnSpacing: {
    marginRight: 16,
  },
  filtersWrap: {
    marginTop: 12,
    gap: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filtersGroup: {},
  filtersLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  dropdownOuter: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 160,
  },
  dropdownButtonOpen: {
    borderColor: '#10b981',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    minWidth: 180,
    zIndex: 3100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(220,141,60,0.12)',
  },
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  dropdownOptionTextActive: {
    color: '#10b981',
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

