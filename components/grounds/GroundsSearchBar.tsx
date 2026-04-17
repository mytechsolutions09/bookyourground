import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Search, MapPin, Building2, ChevronRight, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { GroundWithImages } from '@/types';
import { slugifyGroundSegment } from '@/utils/groundSlug';

interface GroundsSearchBarProps {
  lightMode?: boolean;
}

export default function GroundsSearchBar({ lightMode = true }: GroundsSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query]);

  const fetchSuggestions = async (q: string) => {
    setLoading(true);
    try {
      const ts = `%${q.trim()}%`;
      const { data, error } = await supabase
        .from('grounds')
        .select('id, name, city, state')
        .or(`name.ilike.${ts},city.ilike.${ts},state.ilike.${ts},address.ilike.${ts}`)
        .eq('active', true)
        .eq('approved', true)
        .limit(6);

      if (error) throw error;
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    setShowSuggestions(false);
    setQuery('');
    const citySlug = slugifyGroundSegment(item.city);
    const nameSlug = slugifyGroundSegment(item.name);
    router.push(`/ground/${citySlug}/${nameSlug}` as any);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, lightMode ? styles.searchBoxLight : styles.searchBoxDark]}>
        <Search size={18} color={lightMode ? '#9CA3AF' : '#FFFFFF'} />
        <TextInput
          style={[styles.input, { color: lightMode ? '#111827' : '#FFFFFF' }]}
          placeholder="Search ground or location..."
          placeholderTextColor={lightMode ? '#9CA3AF' : 'rgba(255,255,255,0.6)'}
          value={query}
          onChangeText={setQuery}
          onFocus={() => query.length >= 2 && setShowSuggestions(true)}
        />
        {query.length > 0 && (
          <Pressable onPress={clearSearch} style={styles.clearBtn}>
            <X size={16} color={lightMode ? '#9CA3AF' : '#FFFFFF'} />
          </Pressable>
        )}
        {loading && (
          <ActivityIndicator size="small" color="#00ea6b" style={styles.loader} />
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={[styles.suggestions, lightMode ? styles.suggestionsLight : styles.suggestionsDark]}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.suggestionItem, lightMode ? styles.suggestionItemLight : styles.suggestionItemDark]}
                onPress={() => handleSelect(item)}
              >
                <View style={[styles.iconBox, lightMode ? styles.iconBoxLight : styles.iconBoxDark]}>
                  <Building2 size={16} color={lightMode ? '#4B5563' : '#00ea6b'} />
                </View>
                <View style={styles.suggestionTextWrapper}>
                  <Text style={[styles.suggestionName, { color: lightMode ? '#111827' : '#FFFFFF' }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.locationRow}>
                    <MapPin size={12} color={lightMode ? '#6B7280' : '#9CA3AF'} />
                    <Text style={[styles.suggestionLocation, { color: lightMode ? '#6B7280' : '#9CA3AF' }]} numberOfLines={1}>
                      {item.city}, {item.state}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color={lightMode ? '#E5E7EB' : '#374151'} />
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
          />
        </View>
      )}

      {showSuggestions && query.length >= 2 && !loading && suggestions.length === 0 && (
        <View style={[styles.noResults, lightMode ? styles.suggestionsLight : styles.suggestionsDark]}>
          <Text style={[styles.noResultsText, { color: lightMode ? '#6B7280' : '#9CA3AF' }]}>
            No grounds found for "{query}"
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
  },
  searchBoxLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchBoxDark: {
    backgroundColor: '#06392e',
    borderColor: 'rgba(0,234,107,0.2)',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }) as any,
  },
  clearBtn: {
    padding: 4,
  },
  loader: {
    marginLeft: 4,
  },
  suggestions: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 10001,
  },
  suggestionsLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F5F9',
  },
  suggestionsDark: {
    backgroundColor: '#043529',
    borderColor: 'rgba(0,234,107,0.15)',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  suggestionItemLight: {
    backgroundColor: 'transparent',
  },
  suggestionItemDark: {
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxLight: {
    backgroundColor: '#F3F4F6',
  },
  iconBoxDark: {
    backgroundColor: 'rgba(0,234,107,0.1)',
  },
  suggestionTextWrapper: {
    flex: 1,
    gap: 2,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  suggestionLocation: {
    fontSize: 12,
  },
  noResults: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 10001,
  },
  noResultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
