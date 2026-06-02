import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Search, Download, Globe, Phone, MapPin, Star, Info, FileDown, CheckCircle2, Mail } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const SUGGESTIONS = ['Cricket ground', 'Cricket turf', 'Box Cricket', 'Football turf', 'Sports ground', 'Playground'];

function FetchGroundsInner() {
  const placesLib = useMapsLibrary('places');
  const [query, setQuery] = useState('Cricket turf');
  const [city, setCity] = useState('Mumbai');
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [fetchCompleted, setFetchCompleted] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const paginationRef = useRef<any>(null);
  
  const isPaginatingRef = useRef(false);

  const fetchEmailsWithAI = async (venuesList: any[]) => {
    const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    if (!geminiApiKey || venuesList.length === 0) {
      return venuesList.map(v => ({ ...v, email: 'N/A' }));
    }

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a data enrichment assistant for BookYourGround.
We have a list of local sports venues/grounds that we just fetched from Google Places. We need to find their official contact email addresses (for bookings, customer service, or general inquiries) by checking your knowledge base or performing web search queries.

Here is the list of venues:
${venuesList.map((v, i) => `${i + 1}. Name: "${v.name}", Address: "${v.formatted_address}", Website: "${v.website}"`).join('\n')}

For each venue, find their official public email address (e.g. info@turf.com, bookings@venue.in, etc.). 
- Look for email addresses associated with this specific venue name, address, or website.
- If you find an official or commonly listed public email, return it.
- If you absolutely cannot find a valid email address, return "N/A".

Return your response strictly as a JSON array of objects, where each object has these exact keys:
- name: The exact venue name from the list above.
- email: The found email address (or "N/A").

Ensure the output is ONLY raw JSON. Do not wrap in markdown code blocks (\`\`\`json). Just the raw JSON string.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed)) {
        return venuesList.map(venue => {
          const found = parsed.find(p => p.name?.toLowerCase() === venue.name?.toLowerCase());
          return {
            ...venue,
            email: found && found.email !== 'N/A' ? found.email : 'N/A'
          };
        });
      }
    } catch (err) {
      console.warn('Gemini email fetch error:', err);
    }
    return venuesList.map(v => ({ ...v, email: 'N/A' }));
  };

  const runSearch = () => {
    if (!placesLib) {
      alert('Google Places Library is not loaded yet. Please wait a moment.');
      return;
    }

    if (!query.trim() || !city.trim()) {
      alert('Please enter both a search query and a city.');
      return;
    }

    setLoading(true);
    if (!isPaginatingRef.current) {
      setFetchCompleted(false);
      setResults([]);
      setHasNextPage(false);
      paginationRef.current = null;
    }
    setProgressText('Searching Google Places...');

    const dummy = document.createElement('div');
    const service = new google.maps.places.PlacesService(dummy);
    const searchQuery = `${query.trim()} in ${city.trim()}`;

    const performQuery = () => {
      service.textSearch(
        { query: searchQuery },
        async (places, status, pagination) => {
          paginationRef.current = pagination || null;
          setHasNextPage(!!(pagination && pagination.hasNextPage));

          if (status === google.maps.places.PlacesServiceStatus.OK && places) {
            const totalCount = places.length;
            const detailedResults: any[] = [];

            for (let i = 0; i < places.length; i++) {
              const place = places[i];
              setProgressText(`Fetching details for venue ${i + 1} of ${totalCount}...`);

              await new Promise<void>((resolve) => {
                service.getDetails(
                  {
                    placeId: place.place_id!,
                    fields: [
                      'name',
                      'formatted_address',
                      'formatted_phone_number',
                      'website',
                      'rating',
                      'geometry',
                    ],
                  },
                  (details, detailStatus) => {
                    if (detailStatus === google.maps.places.PlacesServiceStatus.OK && details) {
                      detailedResults.push({
                        name: details.name || place.name || 'N/A',
                        formatted_address: details.formatted_address || place.formatted_address || 'N/A',
                        formatted_phone_number: details.formatted_phone_number || 'N/A',
                        website: details.website || 'N/A',
                        rating: details.rating !== undefined ? details.rating : 'N/A',
                        latitude: details.geometry?.location?.lat() || '',
                        longitude: details.geometry?.location?.lng() || '',
                      });
                    } else {
                      detailedResults.push({
                        name: place.name || 'N/A',
                        formatted_address: place.formatted_address || 'N/A',
                        formatted_phone_number: 'N/A',
                        website: 'N/A',
                        rating: place.rating !== undefined ? place.rating : 'N/A',
                        latitude: place.geometry?.location?.lat() || '',
                        longitude: place.geometry?.location?.lng() || '',
                      });
                    }
                    // Throttle details calls by 200ms
                    setTimeout(resolve, 200);
                  }
                );
              });
            }

            setProgressText('Finding contact emails using Gemini AI...');
            const enrichedResults = await fetchEmailsWithAI(detailedResults);

            if (isPaginatingRef.current) {
              setResults(prev => [...prev, ...enrichedResults]);
            } else {
              setResults(enrichedResults);
            }

            setProgressText('');
            setLoading(false);
            setFetchCompleted(true);
          } else {
            setLoading(false);
            setProgressText('');
            alert(`No sports grounds found or Google Places error: ${status}`);
          }
        }
      );
    };

    performQuery();
  };

  const handleFetch = () => {
    isPaginatingRef.current = false;
    runSearch();
  };

  const handleLoadMore = () => {
    if (paginationRef.current && paginationRef.current.hasNextPage) {
      isPaginatingRef.current = true;
      setLoading(true);
      setProgressText('Fetching next page of venues...');
      paginationRef.current.nextPage();
    }
  };

  const escapeCsvCell = (val: any) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = ['Name', 'Address', 'Phone', 'Email', 'Website', 'Rating', 'Latitude', 'Longitude'];
    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        escapeCsvCell(r.name),
        escapeCsvCell(r.formatted_address),
        escapeCsvCell(r.formatted_phone_number),
        escapeCsvCell(r.email),
        escapeCsvCell(r.website),
        escapeCsvCell(r.rating),
        escapeCsvCell(r.latitude),
        escapeCsvCell(r.longitude)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fileName = `venues_${query.replace(/\s+/g, '_')}_${city.replace(/\s+/g, '_')}.csv`;
    link.setAttribute('download', fileName.toLowerCase());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      {Platform.OS === 'web' && (
        <View style={styles.header}>
          <Text style={styles.title}>Fetch Grounds</Text>
          <Text style={styles.subtitle}>Query Google Places and use Gemini to enrich contact emails, then export to a CSV file</Text>
        </View>
      )}

      {/* Info Callout */}
      <View style={styles.infoCard}>
        <Info size={16} color="#10b981" style={styles.infoIcon} />
        <Text style={styles.infoText}>
          Queries Google Places to fetch local venues and details. In addition, it runs an intelligent batch email discovery process using Gemini AI search grounding, allowing you to build and download a fully enriched CSV.
        </Text>
      </View>

      {/* Query Form */}
      <View style={styles.formCard}>
        <View style={styles.formRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Venue Type / Query</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. Cricket Turf"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location / City</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Mumbai"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Suggestion Chips */}
        <View style={styles.suggestionsRow}>
          {SUGGESTIONS.map((sug) => (
            <TouchableOpacity
              key={sug}
              style={[styles.suggestionChip, query === sug && styles.suggestionChipActive]}
              onPress={() => setQuery(sug)}
            >
              <Text style={[styles.suggestionText, query === sug && styles.suggestionTextActive]}>
                {sug}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          onPress={handleFetch}
          disabled={loading}
          style={[styles.fetchButton, loading && styles.fetchButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#043529" style={{ marginRight: 8 }} />
          ) : (
            <Search size={18} color="#043529" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.fetchButtonText}>
            {loading ? 'Fetching Details...' : 'Fetch Venues'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      {loading && progressText !== '' && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{progressText}</Text>
          <View style={styles.progressBarBg}>
            <View style={styles.progressBarFill} />
          </View>
        </View>
      )}

      {/* Results Header */}
      {fetchCompleted && results.length > 0 && (
        <View style={styles.resultsHeader}>
          <View style={styles.resultsHeaderLeft}>
            <CheckCircle2 size={18} color="#10b981" />
            <Text style={styles.resultsCountText}>
              Successfully fetched {results.length} venues
            </Text>
          </View>
          <TouchableOpacity onPress={exportToCSV} style={styles.csvButton}>
            <FileDown size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.csvButtonText}>Export to CSV</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sleek Results Table */}
      {results.length > 0 && (
        <>
          <ScrollView horizontal style={styles.tableScroll} showsHorizontalScrollIndicator={true}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 160 }]}>Name</Text>
                <Text style={[styles.th, { width: 220 }]}>Address</Text>
                <Text style={[styles.th, { width: 130 }]}>Phone</Text>
                <Text style={[styles.th, { width: 170 }]}>Email</Text>
                <Text style={[styles.th, { width: 170 }]}>Website</Text>
                <Text style={[styles.th, { width: 70, textAlign: 'center' }]}>Rating</Text>
                <Text style={[styles.th, { width: 140 }]}>Coordinates</Text>
              </View>

              {results.map((item, idx) => (
                <View
                  key={idx}
                  style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#f8fafc' }]}
                >
                  <Text style={[styles.td, styles.tdName, { width: 160 }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[styles.td, styles.tdAddress, { width: 220 }]} numberOfLines={2}>
                    {item.formatted_address}
                  </Text>
                  <View style={[styles.tdRow, { width: 130 }]}>
                    <Phone size={12} color="#10b981" style={{ marginRight: 4 }} />
                    <Text style={styles.tdPhone} numberOfLines={1}>{item.formatted_phone_number}</Text>
                  </View>
                  <View style={[styles.tdRow, { width: 170 }]}>
                    <Mail size={12} color="#10b981" style={{ marginRight: 4 }} />
                    <Text style={styles.tdEmail} numberOfLines={1}>{item.email}</Text>
                  </View>
                  <View style={[styles.tdRow, { width: 170 }]}>
                    <Globe size={12} color="#3b82f6" style={{ marginRight: 4 }} />
                    <Text
                      style={[styles.tdLink, item.website !== 'N/A' && { color: '#3b82f6', textDecorationLine: 'underline' }]}
                      numberOfLines={1}
                    >
                      {item.website}
                    </Text>
                  </View>
                  <View style={[styles.tdRow, { width: 70, justifyContent: 'center' }]}>
                    <Star size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                    <Text style={styles.tdRating}>{item.rating}</Text>
                  </View>
                  <View style={[styles.tdCoordinates, { width: 140 }]}>
                    <MapPin size={10} color="#9ca3af" />
                    <Text style={styles.tdCoordsText} numberOfLines={1}>
                      {item.latitude && item.longitude ? `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}` : 'N/A'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Pagination Load More Button */}
          {hasNextPage && (
            <TouchableOpacity
              onPress={handleLoadMore}
              disabled={loading}
              style={[styles.loadMoreButton, loading && styles.loadMoreButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Text style={styles.loadMoreText}>Load More Venues</Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}

      {results.length === 0 && !loading && fetchCompleted && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No results fetched. Enter a query and city, then hit Fetch Venues!</Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function AdminFetchGrounds() {
  const content = (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <FetchGroundsInner />
    </APIProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>
          {content}
        </SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        {content}
      </View>
    </SettingsSubbar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerContent: {
    padding: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#065f46',
    fontFamily: 'Inter',
  },
  formCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  formRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Inter',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  suggestionText: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  suggestionTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ea6b',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: Platform.OS === 'web' ? 'flex-start' : 'stretch',
    shadowColor: '#00ea6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  fetchButtonDisabled: {
    backgroundColor: '#93fcd3',
    opacity: 0.8,
  },
  fetchButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#043529',
    fontFamily: 'Inter',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  progressBarBg: {
    width: '100%',
    maxWidth: 400,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '80%', // Progressive bar styling
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  resultsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Inter',
  },
  csvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043529',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  csvButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  tableScroll: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  table: {
    flexDirection: 'column',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  td: {
    fontSize: 13,
    color: '#334155',
    fontFamily: 'Inter',
  },
  tdName: {
    fontWeight: '600',
    color: '#0f172a',
  },
  tdAddress: {
    color: '#64748b',
    fontSize: 12.5,
  },
  tdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tdPhone: {
    fontSize: 12.5,
    color: '#065f46',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  tdEmail: {
    fontSize: 12.5,
    color: '#065f46',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  tdLink: {
    fontSize: 12.5,
    color: '#64748b',
    fontFamily: 'Inter',
  },
  tdRating: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#92400e',
    fontFamily: 'Inter',
  },
  tdCoordinates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tdCoordsText: {
    fontSize: 11.5,
    color: '#64748b',
    fontFamily: 'Inter',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  loadMoreButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  loadMoreButtonDisabled: {
    opacity: 0.5,
  },
  loadMoreText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Inter',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
});
