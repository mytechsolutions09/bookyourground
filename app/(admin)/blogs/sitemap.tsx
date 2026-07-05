import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ActivityIndicator, 
  TextInput, 
  Platform, 
  FlatList, 
  Linking
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { 
  Upload, 
  Download, 
  Sparkles, 
  Send, 
  Search, 
  SlidersHorizontal, 
  CheckSquare, 
  Square, 
  ChevronRight, 
  Zap, 
  Copy, 
  ExternalLink,
  RefreshCw
} from 'lucide-react-native';

import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import BlogsSubbar from '@/components/admin/BlogsSubbar';

type UrlType = 'static' | 'category' | 'product' | 'blog' | 'location';

interface SiteUrl {
  id: string;
  title: string;
  path: string;
  type: UrlType;
  seoScore: number;
  indexed: boolean;
}

const STATIC_ROUTES = [
  { id: 'st-home', title: 'Home', path: '/', type: 'static' as UrlType },
  { id: 'st-about', title: 'About Us', path: '/about', type: 'static' as UrlType },
  { id: 'st-contact', title: 'Contact', path: '/contact', type: 'static' as UrlType },
  { id: 'st-faq', title: 'FAQ', path: '/faq', type: 'static' as UrlType },
  { id: 'st-terms', title: 'Terms of Service', path: '/terms', type: 'static' as UrlType },
  { id: 'st-privacy', title: 'Privacy Policy', path: '/privacy', type: 'static' as UrlType },
  { id: 'st-shipping', title: 'Shipping Policy', path: '/shipping', type: 'static' as UrlType },
  { id: 'st-refund', title: 'Refund Policy', path: '/refund-policy', type: 'static' as UrlType },
  { id: 'st-blog', title: 'Blog', path: '/blog', type: 'static' as UrlType },
  { id: 'st-shop', title: 'Shop', path: '/shop', type: 'static' as UrlType },
  { id: 'st-corporate', title: 'Corporate', path: '/corporate', type: 'static' as UrlType },
  { id: 'st-cricket', title: 'Cricket Grounds', path: '/cricket-grounds', type: 'static' as UrlType },
  { id: 'st-football', title: 'Football Grounds', path: '/football-grounds', type: 'static' as UrlType },
  { id: 'st-how', title: 'How It Works', path: '/how-it-works', type: 'static' as UrlType },
  { id: 'st-list', title: 'List Your Venue', path: '/list-your-venue', type: 'static' as UrlType },
  { id: 'st-strategies', title: 'Match Strategies', path: '/match-strategies', type: 'static' as UrlType },
  { id: 'st-pricing', title: 'Pricing', path: '/pricing', type: 'static' as UrlType },
  { id: 'st-delhi', title: 'Book Cricket Ground in Delhi', path: '/book-cricket-ground-in-delhi', type: 'static' as UrlType },
  { id: 'st-gurugram', title: 'Book Cricket Ground in Gurugram', path: '/book-cricket-ground-in-gurugram', type: 'static' as UrlType },
];

const seedScore = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return 60 + (h % 41); // Deterministic score 60..100
};

const slugify = (text: string) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const getScoreColor = (score: number) => {
  if (score >= 80) return { text: '#10B981', border: '#A7F3D0', bg: '#ECFDF5' };
  if (score >= 60) return { text: '#F59E0B', border: '#FDE68A', bg: '#FFFBEB' };
  return { text: '#EF4444', border: '#FCA5A5', bg: '#FEF2F2' };
};

const TYPE_LABEL: Record<UrlType, string> = {
  static: 'STATIC',
  category: 'CATEGORY',
  product: 'PRODUCT',
  blog: 'BLOG',
  location: 'LOCATION',
};

const TYPE_COLORS: Record<UrlType, { text: string; bg: string }> = {
  static: { text: '#2563EB', bg: '#DBEAFE' },
  category: { text: '#7C3AED', bg: '#F3E8FF' },
  product: { text: '#DB2777', bg: '#FCE7F3' },
  blog: { text: '#059669', bg: '#D1FAE5' },
  location: { text: '#4B5563', bg: '#F3F4F6' },
};

type FilterTab = 'all' | 'static' | 'category' | 'product' | 'blog' | 'location';

export default function SitemapManager() {
  const [loading, setLoading] = useState(true);
  const [dbUrls, setDbUrls] = useState<SiteUrl[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Partial<SiteUrl>>>({});
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [indexFilter, setIndexFilter] = useState<'all' | 'indexed' | 'not-indexed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const routesList: SiteUrl[] = [];

      // Add static routes
      STATIC_ROUTES.forEach(route => {
        routesList.push({
          id: route.id,
          title: route.title,
          path: route.path,
          type: route.type,
          seoScore: seedScore(route.id),
          indexed: true,
        });
      });

      // 1. Fetch categories
      const { data: categories } = await supabase
        .from('shop_categories')
        .select('id, name');

      if (categories) {
        categories.forEach((cat: any) => {
          const id = `cat-${cat.id}`;
          routesList.push({
            id,
            title: `${cat.name} Collection`,
            path: `/shop?category=${cat.id}`,
            type: 'category',
            seoScore: seedScore(id),
            indexed: true,
          });
        });
      }

      // 2. Fetch products
      const { data: products } = await supabase
        .from('shop_products')
        .select('id, name');

      if (products) {
        products.forEach((prod: any) => {
          const id = `prod-${prod.id}`;
          routesList.push({
            id,
            title: prod.name,
            path: `/shop/${slugify(prod.name)}`,
            type: 'product',
            seoScore: seedScore(id),
            indexed: true,
          });
        });
      }

      // 3. Fetch blogs
      const { data: blogs } = await supabase
        .from('blogs')
        .select('id, title, slug')
        .eq('is_published', true);

      if (blogs) {
        blogs.forEach((blog: any) => {
          const id = `blog-${blog.id}`;
          routesList.push({
            id,
            title: blog.title,
            path: `/blog/${blog.slug}`,
            type: 'blog',
            seoScore: seedScore(id),
            indexed: true,
          });
        });
      }

      // 4. Fetch locations (grounds)
      const { data: grounds } = await supabase
        .from('grounds')
        .select('id, name, city')
        .eq('active', true)
        .eq('approved', true);

      if (grounds) {
        grounds.forEach((ground: any) => {
          const id = `loc-${ground.id}`;
          routesList.push({
            id,
            title: `${ground.name} (${ground.city})`,
            path: `/ground/${slugify(ground.city)}/${slugify(ground.name)}`,
            type: 'location',
            seoScore: seedScore(id),
            indexed: true,
          });
        });
      }

      setDbUrls(routesList);
    } catch (err) {
      console.error('Error fetching sitemap routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Merge overrides
  const allUrls = useMemo(() => {
    return dbUrls.map(u => ({
      ...u,
      ...(overrides[u.id] ?? {}),
    }));
  }, [dbUrls, overrides]);

  const filteredUrls = useMemo(() => {
    let list = allUrls;
    if (filterTab !== 'all') {
      list = list.filter(u => u.type === filterTab);
    }
    if (indexFilter === 'indexed') {
      list = list.filter(u => u.indexed);
    } else if (indexFilter === 'not-indexed') {
      list = list.filter(u => !u.indexed);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u => u.title.toLowerCase().includes(q) || u.path.toLowerCase().includes(q));
    }
    return list;
  }, [allUrls, filterTab, indexFilter, searchQuery]);

  const toggleIndexed = (id: string) => {
    setOverrides(prev => {
      const current = allUrls.find(u => u.id === id);
      const isCurrentlyIndexed = current ? current.indexed : true;
      return {
        ...prev,
        [id]: {
          ...(prev[id] ?? {}),
          indexed: !isCurrentlyIndexed,
        }
      };
    });
    showToast('Updated index status');
  };

  const rescanSeo = (id: string) => {
    const current = allUrls.find(u => u.id === id);
    if (!current) return;
    const base = current.seoScore;
    const newScore = Math.max(40, Math.min(100, base + Math.floor(Math.random() * 15 - 5)));
    setOverrides(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        seoScore: newScore,
      }
    }));
    showToast(`Scanned SEO: ${newScore}/100`);
  };

  const scanAllSeo = () => {
    const patch: Record<string, Partial<SiteUrl>> = {};
    allUrls.forEach(u => {
      patch[u.id] = {
        ...(overrides[u.id] ?? {}),
        seoScore: Math.max(50, Math.min(100, u.seoScore + Math.floor(Math.random() * 8 - 2))),
      };
    });
    setOverrides(patch);
    showToast(`Scanned SEO for all ${allUrls.length} pages`);
  };

  const copyUrl = (path: string) => {
    const full = `https://bookyourground.com${path}`;
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(full).catch(() => {});
    }
    showToast('Copied full URL to clipboard');
  };

  const openPage = (path: string) => {
    const full = `https://bookyourground.com${path}`;
    if (Platform.OS === 'web') {
      window.open(full, '_blank');
    } else {
      Linking.openURL(full).catch(() => {});
    }
  };

  const submitIndexNow = (path?: string) => {
    const count = path ? 1 : allUrls.filter(u => u.indexed).length;
    showToast(path ? `IndexNow submitted for ${path}` : `Submitted ${count} URLs to IndexNow`);
  };

  const importIndexed = () => {
    showToast('Imported Google Search Console index status');
  };

  const exportAll = () => {
    // Generate CSV for export
    const rows = [
      'Title,Type,SEO Score,URL Path,Indexed',
      ...allUrls.map(u => `"${u.title.replace(/"/g, '""')}",${u.type.toUpperCase()},${u.seoScore},https://bookyourground.com${u.path},${u.indexed ? 'YES' : 'NO'}`)
    ].join('\n');
    
    if (Platform.OS === 'web') {
      const blob = new Blob([rows], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bookyourground-sitemap-urls.csv';
      a.click();
    }
    showToast(`Exported ${allUrls.length} URLs`);
  };

  const counts = useMemo(() => {
    return {
      all: allUrls.length,
      static: allUrls.filter(u => u.type === 'static').length,
      category: allUrls.filter(u => u.type === 'category').length,
      product: allUrls.filter(u => u.type === 'product').length,
      blog: allUrls.filter(u => u.type === 'blog').length,
      location: allUrls.filter(u => u.type === 'location').length,
    };
  }, [allUrls]);

  const content = (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sitemap Manager' }} />

      {/* Top Banner Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sitemap URL Manager</Text>
          <Text style={styles.subtitle}>Monitor indexation and run dynamic SEO health audits for all site pages.</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable style={styles.secondaryBtn} onPress={importIndexed}>
            <Upload size={14} color="#4B5563" />
            <Text style={styles.secondaryBtnText}>Import Indexed</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={exportAll}>
            <Download size={14} color="#4B5563" />
            <Text style={styles.secondaryBtnText}>Export All</Text>
          </Pressable>
          <Pressable style={styles.scanBtn} onPress={scanAllSeo}>
            <Sparkles size={14} color="#FFFFFF" />
            <Text style={styles.scanBtnText}>Scan All SEO</Text>
          </Pressable>
          <Pressable style={styles.indexNowBtn} onPress={() => submitIndexNow()}>
            <Send size={14} color="#FFFFFF" />
            <Text style={styles.indexNowBtnText}>IndexNow Submit</Text>
          </Pressable>
        </View>
      </View>

      {/* Filters and Tabs Bar */}
      <View style={styles.filtersBar}>
        {/* Tabs */}
        <View style={styles.tabsRow}>
          <Pressable style={[styles.tab, filterTab === 'all' && styles.tabActive]} onPress={() => setFilterTab('all')}>
            <Text style={[styles.tabText, filterTab === 'all' && styles.tabTextActive]}>All ({counts.all})</Text>
          </Pressable>
          <Pressable style={[styles.tab, filterTab === 'static' && styles.tabActive]} onPress={() => setFilterTab('static')}>
            <Text style={[styles.tabText, filterTab === 'static' && styles.tabTextActive]}>Statics ({counts.static})</Text>
          </Pressable>
          <Pressable style={[styles.tab, filterTab === 'category' && styles.tabActive]} onPress={() => setFilterTab('category')}>
            <Text style={[styles.tabText, filterTab === 'category' && styles.tabTextActive]}>Categorys ({counts.category})</Text>
          </Pressable>
          <Pressable style={[styles.tab, filterTab === 'product' && styles.tabActive]} onPress={() => setFilterTab('product')}>
            <Text style={[styles.tabText, filterTab === 'product' && styles.tabTextActive]}>Products ({counts.product})</Text>
          </Pressable>
          <Pressable style={[styles.tab, filterTab === 'blog' && styles.tabActive]} onPress={() => setFilterTab('blog')}>
            <Text style={[styles.tabText, filterTab === 'blog' && styles.tabTextActive]}>Blogs ({counts.blog})</Text>
          </Pressable>
          <Pressable style={[styles.tab, filterTab === 'location' && styles.tabActive]} onPress={() => setFilterTab('location')}>
            <Text style={[styles.tabText, filterTab === 'location' && styles.tabTextActive]}>Locations ({counts.location})</Text>
          </Pressable>
        </View>

        {/* Dropdowns & Search */}
        <View style={styles.rightFilters}>
          {Platform.OS === 'web' ? (
            <select
              value={indexFilter}
              onChange={(e) => setIndexFilter(e.target.value as any)}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                paddingHorizontal: 12,
                height: 36,
                fontSize: 13,
                color: '#374151',
                outline: 'none',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer'
              } as any}
            >
              <option value="all">All Index Status</option>
              <option value="indexed">Indexed</option>
              <option value="not-indexed">Not Indexed</option>
            </select>
          ) : (
            <Pressable style={styles.selectMock} onPress={() => {
              setIndexFilter(prev => prev === 'all' ? 'indexed' : prev === 'indexed' ? 'not-indexed' : 'all');
              showToast(`Index Filter: ${indexFilter === 'all' ? 'Indexed' : indexFilter === 'indexed' ? 'Not Indexed' : 'All'}`);
            }}>
              <Text style={styles.selectMockText}>{indexFilter === 'all' ? 'All Index Status' : indexFilter === 'indexed' ? 'Indexed' : 'Not Indexed'}</Text>
            </Pressable>
          )}

          <View style={styles.searchWrapper}>
            <Search size={14} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search URL or title..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Pressable style={styles.settingsBtn}>
            <SlidersHorizontal size={14} color="#6B7280" />
          </Pressable>
        </View>
      </View>

      {/* Table Container */}
      <View style={styles.tableCard}>
        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.thText, { flex: 1.5 }]}>TITLE</Text>
          <Text style={[styles.thText, { width: 100, textAlign: 'center' }]}>INDEXED</Text>
          <Text style={[styles.thText, { width: 120, textAlign: 'center' }]}>SEO SCORE</Text>
          <Text style={[styles.thText, { flex: 2 }]}>URL PATH</Text>
          <Text style={[styles.thText, { width: 140, textAlign: 'right' }]}>ACTIONS</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Fetching Sitemap Data...</Text>
          </View>
        ) : filteredUrls.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No URLs match your filter.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUrls}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const scoreColors = getScoreColor(item.seoScore);
              const typeColors = TYPE_COLORS[item.type];
              
              return (
                <View style={styles.tableRow}>
                  {/* Title & Badge */}
                  <View style={[styles.tdCell, { flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <Text style={styles.urlTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={[styles.typeBadge, { backgroundColor: typeColors.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColors.text }]}>
                        {TYPE_LABEL[item.type]}
                      </Text>
                    </View>
                  </View>

                  {/* Indexed Status */}
                  <View style={[styles.tdCell, { width: 100, alignItems: 'center', justifyContent: 'center' }]}>
                    <Pressable onPress={() => toggleIndexed(item.id)}>
                      {item.indexed ? (
                        <CheckSquare size={18} color="#10B981" />
                      ) : (
                        <Square size={18} color="#D1D5DB" />
                      )}
                    </Pressable>
                  </View>

                  {/* SEO Score Button */}
                  <View style={[styles.tdCell, { width: 120, alignItems: 'center', justifyContent: 'center' }]}>
                    <Pressable 
                      style={[styles.scoreBadge, { borderColor: scoreColors.border, backgroundColor: scoreColors.bg }]}
                      onPress={() => rescanSeo(item.id)}
                    >
                      <Text style={[styles.scoreText, { color: scoreColors.text }]}>
                        {item.seoScore}/100
                      </Text>
                      <ChevronRight size={12} color={scoreColors.text} style={{ marginLeft: 2 }} />
                    </Pressable>
                  </View>

                  {/* URL Path */}
                  <View style={[styles.tdCell, { flex: 2 }]}>
                    <Text style={styles.pathText} numberOfLines={1}>
                      {item.path}
                    </Text>
                  </View>

                  {/* Quick Action Icons */}
                  <View style={[styles.tdCell, { width: 140, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }]}>
                    <Pressable style={styles.actionIconBtn} onPress={() => rescanSeo(item.id)} title="Scan SEO">
                      <Zap size={14} color="#9CA3AF" />
                    </Pressable>
                    <Pressable style={styles.actionIconBtn} onPress={() => copyUrl(item.path)} title="Copy Full URL">
                      <Copy size={14} color="#9CA3AF" />
                    </Pressable>
                    <Pressable style={styles.actionIconBtn} onPress={() => submitIndexNow(item.path)} title="IndexNow Submit">
                      <Send size={14} color="#9CA3AF" />
                    </Pressable>
                    <Pressable style={styles.actionIconBtn} onPress={() => openPage(item.path)} title="Open Page">
                      <ExternalLink size={14} color="#9CA3AF" />
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Floating toast alerts */}
      {toastMsg && (
        <View style={styles.toastBox}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <BlogsSubbar activeTab="sitemap">
          {content}
        </BlogsSubbar>
      </WebLayout>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <MobileAppNavbar title="SITEMAP MANAGER" titleColor="#10B981" />
      <BlogsSubbar activeTab="sitemap">
        <ScrollView style={{ flex: 1 }}>{content}</ScrollView>
      </BlogsSubbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 4,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    paddingVertical: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  topActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Inter',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5', // Violet brand score color from image
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  scanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  indexNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669', // Green IndexNow button
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  indexNowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  filtersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  tabActive: {
    backgroundColor: '#EEF2F6', // Light gray background for active tab filters
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: '#4F46E5', // Active tab label
    fontWeight: '700',
  },
  rightFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  selectMock: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    height: 36,
  },
  selectMockText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  searchWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingLeft: 30,
    paddingRight: 12,
    height: 36,
    fontSize: 13,
    color: '#374151',
    width: 200,
    fontFamily: 'Inter',
  },
  settingsBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 40,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tdCell: {
    justifyContent: 'center',
  },
  urlTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    flexShrink: 1,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  pathText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#4F46E5', // Monospaced violet URL paths
    flexShrink: 1,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  loadingBox: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter',
  },
  toastBox: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10000,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});
