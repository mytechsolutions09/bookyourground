import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, Platform, Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { router, usePathname } from 'expo-router';
import { Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';
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
import WebLayout from '@/components/web/WebLayout';
import LandingScrollContent from '@/components/landing/LandingScrollContent';
import MobileAppNavbar from '../../components/MobileAppNavbar';

/** True when the URL is the marketing home (not /bookings, /profile, etc.). */
function isWebLandingPath(pathname: string | undefined): boolean {
  if (pathname == null || pathname === '') return true;
  const p = pathname.split('?')[0];
  if (p === '/' || p === '') return true;
  if (p === '/(tabs)' || p === '/(tabs)/') return true;
  return false;
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
        <View style={styles.dropdownMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => {
                onChange(opt);
                setOpen(false);
              }}
              style={[
                styles.dropdownOption,
                opt === value && styles.dropdownOptionActive,
              ]}
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
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const isFocused = useIsFocused();
  const pathname = usePathname();
  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const didRedirectRef = useRef(false);

  const loadGrounds = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('grounds')
        .select(`
          *,
          ground_images(*),
          reviews(rating)
        `)
        .eq('active', true)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGrounds(data || []);
    } catch (error) {
      console.error('Error loading grounds:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    loadGrounds();
  }, [loadGrounds]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isFocused) {
      didRedirectRef.current = false;
      return;
    }
    if (isWebLandingPath(pathname)) return;
    if (didRedirectRef.current) return;
    didRedirectRef.current = true;
    router.replace('/');
  }, [isFocused, pathname, router]);

  // Web: marketing home lives at `/` (hero). When the Home tab is focused on that route,
  // render the same landing as `app/index.tsx`. Returning `null` here produced a blank
  // screen after logo navigation to `/`.
  if (Platform.OS === 'web') {
    if (!isFocused) return null;
    if (isWebLandingPath(pathname)) {
      return (
        <WebLayout>
          <LandingScrollContent variant="web" />
        </WebLayout>
      );
    }
    return null;
  }

  const locationOptions = useMemo(() => {
    const cities = Array.from(new Set(grounds.map((g) => g.city).filter(Boolean)));
    return ['all', ...cities];
  }, [grounds]);

  const typeOptions = useMemo(() => {
    const types = Array.from(
      new Set(grounds.map((g) => g.pitch_type).filter((t): t is string => !!t)),
    );
    return ['all', ...types];
  }, [grounds]);

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

  const content = (
    <View style={styles.container}>
      <View style={[styles.header, (Platform.OS as any) === 'web' && styles.webHeader]}>
        <Text style={styles.title}>Find Cricket Grounds</Text>
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
            <FilterDropdown
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={filteredGrounds}
        renderItem={({ item }) => (
          <GroundCard
            ground={item}
            onPress={() => router.push(makeGroundPath(item))}
            showBookingSchedule={false}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadGrounds} />
        }
        numColumns={(Platform.OS as any) === 'web' ? 2 : 1}
        key={(Platform.OS as any) === 'web' ? 'web' : 'mobile'}
        columnWrapperStyle={(Platform.OS as any) === 'web' ? styles.row : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No grounds found' : 'No grounds available'}
            </Text>
          </View>
        }
      />
    </View>
  );

  // Native: wrap content with shared mobile navbar.
  return (
    <View style={styles.nativeScreen}>
      <MobileAppNavbar />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  nativeScreen: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#043529',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#06392e',
    overflow: 'visible' as any,
    zIndex: 50,
  },
  webHeader: {
    paddingTop: 16,
  },
  row: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06392e',
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
    color: '#F9FAFB',
  },
  list: {
    padding: 16,
    zIndex: 1,
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
    color: '#E5E7EB',
    marginBottom: 6,
  },
  dropdownOuter: {
    position: 'relative',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#043529',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 180,
  },
  dropdownButtonOpen: {
    borderColor: '#02c259',
    backgroundColor: '#043529',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#043529',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 6,
    zIndex: 10000,
    elevation: 50,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionActive: {
    backgroundColor: '#06392e',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  dropdownOptionTextActive: {
    color: '#02c259',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#043529',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chipActive: {
    borderColor: '#02c259',
    backgroundColor: '#06392e',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  chipTextActive: {
    color: '#02c259',
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
