import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { GroundWithImages } from '@/types';
import GroundCard from '@/components/grounds/GroundCard';

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
              style={[styles.dropdownOption, opt === value && styles.dropdownOptionActive]}
            >
              <Text style={[styles.dropdownOptionText, opt === value && styles.dropdownOptionTextActive]}>
                {display(opt)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function GroundBrowse(props: { title?: string }) {
  const { title = 'Find Cricket Grounds' } = props;

  const [grounds, setGrounds] = useState<GroundWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadGrounds();
  }, []);

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

  const locationOptions = useMemo(() => {
    const cities = Array.from(new Set(grounds.map((g) => g.city).filter(Boolean)));
    return ['all', ...cities];
  }, [grounds]);

  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(grounds.map((g) => g.pitch_type).filter((t): t is string => !!t)));
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

  return (
    <View style={styles.container}>
      <View style={[styles.header, Platform.OS === 'web' && styles.webHeader]}>
        <Text style={styles.title}>{title}</Text>
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
            <FilterDropdown options={locationOptions} value={locationFilter} onChange={setLocationFilter} />
          </View>

          <View style={styles.filtersGroup}>
            <Text style={styles.filtersLabel}>Type</Text>
            <FilterDropdown options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
          </View>
        </View>
      </View>

      <FlatList
        data={filteredGrounds}
        renderItem={({ item }) => (
          <GroundCard
            ground={item}
            onPress={() => router.push(`/grounds/${item.id}`)}
            showBookingSchedule={false}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGrounds} />}
        numColumns={Platform.OS === 'web' ? 2 : 1}
        key={Platform.OS === 'web' ? 'web' : 'mobile'}
        columnWrapperStyle={Platform.OS === 'web' ? styles.row : undefined}
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    borderColor: '#dc8d3c',
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
    zIndex: 100,
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
    color: '#dc8d3c',
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

