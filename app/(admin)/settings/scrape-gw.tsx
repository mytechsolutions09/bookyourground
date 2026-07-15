import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { Search, Download, Globe, Play, Star, Info, FileDown, CheckCircle2, Terminal } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';

const SUGGESTED_STATES = ['delhi', 'maharashtra', 'karnataka', 'telangana'];
const SUGGESTED_CITIES = ['delhi-ncr', 'mumbai', 'bengaluru', 'hyderabad'];
const SUGGESTED_SPORTS = ['cricket', 'football', 'badminton'];

export default function ScrapeGWPage() {
  const [stateSlug, setStateSlug] = useState('delhi');
  const [citySlug, setCitySlug] = useState('delhi-ncr');
  const [sportSlug, setSportSlug] = useState('cricket');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [scrapeCompleted, setScrapeCompleted] = useState(false);

  // CORS proxy settings
  const [useProxy, setUseProxy] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('https://thingproxy.freeboard.io/fetch/');

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const startScrape = async () => {
    if (!stateSlug.trim() || !citySlug.trim() || !sportSlug.trim() || !date.trim()) {
      alert('Please fill out all fields (state, city, sport, and date).');
      return;
    }

    setLoading(true);
    setScrapeCompleted(false);
    setResults([]);
    setLogs([]);
    addLog(`Starting scraper for state: "${stateSlug}", city: "${citySlug}", sport: "${sportSlug}", date: "${date}"`);

    try {
      let page = 1;
      let allGrounds: any[] = [];
      const pageSize = 30;

      while (true) {
        addLog(`Requesting page ${page}...`);
        setProgressText(`Fetching page ${page}...`);

        let targetUrl = `https://www.gwsportsapp.in/api/search/${stateSlug.trim()}/${citySlug.trim()}/${sportSlug.trim()}/${date.trim()}`;
        if (useProxy && proxyUrl.trim()) {
          targetUrl = `${proxyUrl.trim()}${targetUrl}`;
        }

        const body = {
          page: page,
          pageSize: pageSize,
          filter: {
            ground: "",
            timings: [
              { f: "06:00 AM", t: "10:00 AM" },
              { f: "10:00 AM", t: "02:00 PM" },
              { f: "02:00 PM", t: "05:00 PM" },
              { f: "05:00 PM", t: "10:00 PM" },
              { f: "10:00 PM", t: "06:00 AM" }
            ],
            amenities: [],
            availability: [],
            areas: [],
            from_rating: 0,
            to_rating: 5,
            only_favorites: false,
            isSltFltr: false
          },
          sort: { by: "rating", order: "desc" }
        };

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status} (${response.statusText})`);
        }

        const payload = await response.json();
        
        // Defensive check of envelope shape
        const innerData = payload?.data?.data;
        if (!innerData) {
          throw new Error(`Unexpected API response shape. Missing 'data.data'. Keys: ${Object.keys(payload || {})}`);
        }

        const grounds = innerData.grounds || [];
        if (grounds.length === 0) {
          addLog(`No grounds returned on page ${page}. Stopping pagination.`);
          break;
        }

        allGrounds = [...allGrounds, ...grounds];
        const maxPages = parseInt(innerData.maxPages || '1', 10);
        const totalRows = innerData.totalRows || allGrounds.length;

        addLog(`Successfully downloaded page ${page}/${maxPages}. Found ${grounds.length} grounds.`);

        if (page >= maxPages) {
          addLog(`Reached max page count: ${maxPages}`);
          break;
        }

        page++;
        // Throttling to be polite to the target server
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      addLog(`Total downloaded grounds: ${allGrounds.length}`);

      // Deduplicate on ground_id
      const uniqueGrounds: any[] = [];
      const seenIds = new Set();

      allGrounds.forEach((g: any) => {
        const id = g.ground_id || g.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);

          // Construct booking URL
          const bookingUrl = g.ground_url 
            ? `https://www.gwsportsapp.in/${citySlug}/${sportSlug}/booking/${encodeURIComponent(g.ground_url)}`
            : 'N/A';

          uniqueGrounds.push({
            ...g,
            ground_id: id,
            booking_url: bookingUrl,
            primary_image: g.thumb_image_url || 'N/A',
            gallery_urls_joined: Array.isArray(g.gallery_urls) ? g.gallery_urls.join(', ') : 'N/A'
          });
        }
      });

      addLog(`Deduplicated: ${allGrounds.length} -> ${uniqueGrounds.length} venues.`);
      setResults(uniqueGrounds);
      setProgressText('');
      setLoading(false);
      setScrapeCompleted(true);
      addLog('Scrape run completed successfully!');
    } catch (err: any) {
      addLog(`CRITICAL ERROR: ${err.message}`);
      setProgressText('');
      setLoading(false);
      alert(`Scrape error: ${err.message}\n\nNote: If you are running on Web, this is likely a CORS block. Try using the CORS proxy toggle below.`);
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

    const headers = [
      'Ground ID', 'Name', 'URL Slug', 'Booking URL', 'City', 'Area', 'Rating', 'Reviews Count', 'Primary Image', 'Gallery Image URLs'
    ];

    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        escapeCsvCell(r.ground_id || r.id),
        escapeCsvCell(r.ground_name || r.name),
        escapeCsvCell(r.ground_url),
        escapeCsvCell(r.booking_url),
        escapeCsvCell(r.city_name),
        escapeCsvCell(r.area_name),
        escapeCsvCell(r.rating),
        escapeCsvCell(r.reviews_count),
        escapeCsvCell(r.primary_image),
        escapeCsvCell(r.gallery_urls_joined)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fileName = `gw_${citySlug}_${sportSlug}_grounds.csv`;
    link.setAttribute('download', fileName.toLowerCase());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    if (results.length === 0) return;

    const jsonContent = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fileName = `gw_${citySlug}_${sportSlug}_grounds.json`;
    link.setAttribute('download', fileName.toLowerCase());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
      {Platform.OS === 'web' && (
        <View style={styles.header}>
          <Text style={styles.title}>GW Sports App Scraper</Text>
          <Text style={styles.subtitle}>Scrapes ground listings from www.gwsportsapp.in, applies deduplication, and lets you export to CSV/JSON</Text>
        </View>
      )}

      {/* Info Callout */}
      <View style={styles.infoCard}>
        <Info size={16} color="#10b981" style={styles.infoIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoText}>
            This scraper queries the public GW Sports search API to download pages of sports grounds.
          </Text>
          <Text style={[styles.infoText, { marginTop: 4, fontWeight: '600', color: '#047857' }]}>
            💡 CORS Note: Browsers block direct POST requests to other domains. If scraping from Local Web, use a browser extension like "CORS Unblock", or enable the CORS proxy option below.
          </Text>
        </View>
      </View>

      {/* Query Form */}
      <View style={styles.formCard}>
        <View style={styles.formRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>State Slug</Text>
            <TextInput
              value={stateSlug}
              onChangeText={setStateSlug}
              placeholder="e.g. delhi"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
            {/* Quick selectors */}
            <View style={styles.chipsRow}>
              {SUGGESTED_STATES.map((s) => (
                <TouchableOpacity key={s} onPress={() => setStateSlug(s)} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>City Slug</Text>
            <TextInput
              value={citySlug}
              onChangeText={setCitySlug}
              placeholder="e.g. delhi-ncr"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.chipsRow}>
              {SUGGESTED_CITIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => setCitySlug(c)} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.formRow, { marginTop: 12 }]}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Sport Slug</Text>
            <TextInput
              value={sportSlug}
              onChangeText={setSportSlug}
              placeholder="e.g. cricket"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.chipsRow}>
              {SUGGESTED_SPORTS.map((sp) => (
                <TouchableOpacity key={sp} onPress={() => setSportSlug(sp)} style={styles.chip}>
                  <Text style={styles.chipText}>{sp}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Scrape Target Date</Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.inputHint}>Must be today or a future date</Text>
          </View>
        </View>

        {/* Proxy Toggles */}
        <View style={styles.proxySection}>
          <View style={styles.switchRow}>
            <Text style={styles.proxyLabel}>Use CORS Proxy (For Web browser runs)</Text>
            <Switch value={useProxy} onValueChange={setUseProxy} trackColor={{ true: '#10b981' }} />
          </View>
          {useProxy && (
            <TextInput
              value={proxyUrl}
              onChangeText={setProxyUrl}
              placeholder="Proxy URL prefix"
              style={[styles.input, { marginTop: 8, fontSize: 12, backgroundColor: '#f1f5f9' }]}
            />
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          onPress={startScrape}
          disabled={loading}
          style={[styles.fetchButton, loading && styles.fetchButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#043529" style={{ marginRight: 8 }} />
          ) : (
            <Play size={18} color="#043529" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.fetchButtonText}>
            {loading ? 'Scraping gw...' : 'Start Scraper'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Real-time Logs Console */}
      {(loading || logs.length > 0) && (
        <View style={styles.logsConsole}>
          <View style={styles.logsHeader}>
            <Terminal size={14} color="#a7f3d0" style={{ marginRight: 6 }} />
            <Text style={styles.logsTitle}>Terminal Logs</Text>
          </View>
          <ScrollView style={styles.logsScroll} contentContainerStyle={{ padding: 12 }}>
            {logs.map((logStr, i) => (
              <Text key={i} style={styles.logLine}>
                {logStr}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Results Header */}
      {scrapeCompleted && results.length > 0 && (
        <View style={styles.resultsHeader}>
          <View style={styles.resultsHeaderLeft}>
            <CheckCircle2 size={18} color="#10b981" />
            <Text style={styles.resultsCountText}>
              Successfully scraped & deduplicated {results.length} venues
            </Text>
          </View>
          <View style={styles.exportButtonsGroup}>
            <TouchableOpacity onPress={exportToCSV} style={styles.csvButton}>
              <FileDown size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.csvButtonText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exportToJSON} style={[styles.csvButton, { backgroundColor: '#475569' }]}>
              <FileDown size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.csvButtonText}>JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sleek Results Table */}
      {results.length > 0 && (
        <ScrollView horizontal style={styles.tableScroll} showsHorizontalScrollIndicator={true}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 220 }]}>Name</Text>
              <Text style={[styles.th, { width: 140 }]}>Area</Text>
              <Text style={[styles.th, { width: 100 }]}>City</Text>
              <Text style={[styles.th, { width: 80, textAlign: 'center' }]}>Rating</Text>
              <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>Reviews</Text>
              <Text style={[styles.th, { width: 280 }]}>Booking Link</Text>
            </View>

            {results.map((item, idx) => (
              <View
                key={idx}
                style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#f8fafc' }]}
              >
                <Text style={[styles.td, styles.tdName, { width: 220 }]} numberOfLines={2}>
                  {item.ground_name || item.name || 'N/A'}
                </Text>
                <Text style={[styles.td, { width: 140 }]} numberOfLines={1}>
                  {item.area_name || 'N/A'}
                </Text>
                <Text style={[styles.td, { width: 100 }]} numberOfLines={1}>
                  {item.city_name || 'N/A'}
                </Text>
                <View style={[styles.tdRow, { width: 80, justifyContent: 'center' }]}>
                  <Star size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                  <Text style={styles.tdRating}>{item.rating || 'N/A'}</Text>
                </View>
                <Text style={[styles.td, { width: 100, textAlign: 'center' }]}>
                  {item.reviews_count ?? '0'}
                </Text>
                <View style={[styles.tdRow, { width: 280 }]}>
                  <Globe size={12} color="#3b82f6" style={{ marginRight: 4 }} />
                  <Text
                    style={[styles.tdLink, { color: '#3b82f6', textDecorationLine: 'underline' }]}
                    numberOfLines={1}
                    onPress={() => Platform.OS === 'web' && window.open(item.booking_url, '_blank')}
                  >
                    {item.booking_url}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {results.length === 0 && !loading && scrapeCompleted && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Scrape run finished but 0 results were parsed. Ensure parameters are correct.</Text>
        </View>
      )}
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>{content}</SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>{content}</View>
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
      web: { outlineStyle: 'none' } as any,
    }),
  },
  inputHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
  },
  chipText: {
    fontSize: 10.5,
    color: '#475569',
    fontFamily: 'Inter',
  },
  proxySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proxyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    fontFamily: 'Inter',
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
    marginTop: 20,
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
  logsConsole: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  logsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a7f3d0',
    fontFamily: 'Inter',
  },
  logsScroll: {
    maxHeight: 180,
  },
  logLine: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 11.5,
    color: '#e2e8f0',
    lineHeight: 18,
    marginBottom: 4,
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
  exportButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
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
  tdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tdRating: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#92400e',
    fontFamily: 'Inter',
  },
  tdLink: {
    fontSize: 12.5,
    color: '#64748b',
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
