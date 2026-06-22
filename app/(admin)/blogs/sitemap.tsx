import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Platform, FlatList } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Globe, AlertTriangle, Code, ArrowRight, RefreshCw, Calendar, Sparkles, Database } from 'lucide-react-native';

import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import BlogsSubbar from '@/components/admin/BlogsSubbar';
import Button from '@/components/ui/Button';

interface CustomSitemapUrl {
  id: string;
  url: string;
  priority: number;
  changefreq: string;
  created_at: string;
}

interface DynamicRoute {
  url: string;
  type: 'ground' | 'blog' | 'product';
  priority: number;
  changefreq: string;
}

const STATIC_ROUTES = [
  { url: '', priority: 1.0, changefreq: 'weekly' },
  { url: '/about', priority: 0.8, changefreq: 'weekly' },
  { url: '/contact', priority: 0.8, changefreq: 'weekly' },
  { url: '/faq', priority: 0.8, changefreq: 'weekly' },
  { url: '/terms', priority: 0.8, changefreq: 'weekly' },
  { url: '/privacy', priority: 0.8, changefreq: 'weekly' },
  { url: '/shipping', priority: 0.8, changefreq: 'weekly' },
  { url: '/refund-policy', priority: 0.8, changefreq: 'weekly' },
  { url: '/blog', priority: 0.8, changefreq: 'weekly' },
  { url: '/shop', priority: 0.8, changefreq: 'weekly' },
  { url: '/corporate', priority: 0.8, changefreq: 'weekly' },
  { url: '/cricket-grounds', priority: 0.8, changefreq: 'weekly' },
  { url: '/football-grounds', priority: 0.8, changefreq: 'weekly' },
  { url: '/how-it-works', priority: 0.8, changefreq: 'weekly' },
  { url: '/list-your-venue', priority: 0.8, changefreq: 'weekly' },
  { url: '/match-strategies', priority: 0.8, changefreq: 'weekly' },
  { url: '/pricing', priority: 0.8, changefreq: 'weekly' },
  { url: '/book-cricket-ground-in-delhi', priority: 0.8, changefreq: 'weekly' },
  { url: '/book-cricket-ground-in-gurugram', priority: 0.8, changefreq: 'weekly' },
];

export default function SitemapManager() {
  const [customUrls, setCustomUrls] = useState<CustomSitemapUrl[]>([]);
  const [dynamicUrls, setDynamicUrls] = useState<DynamicRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDynamic, setLoadingDynamic] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState(false);

  // Form State
  const [newUrl, setNewUrl] = useState('');
  const [priority, setPriority] = useState('0.8');
  const [changefreq, setChangefreq] = useState('weekly');
  const [adding, setAdding] = useState(false);

  // Tab state: 'custom' | 'static' | 'dynamic' | 'xml'
  const [activeSubTab, setActiveSubTab] = useState<'custom' | 'static' | 'dynamic' | 'xml'>('custom');

  useEffect(() => {
    fetchCustomUrls();
    fetchDynamicRoutes();
  }, []);

  const fetchCustomUrls = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sitemap_urls')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Handle table not found
        if (error.code === 'PGRST116' || error.message.includes('relation "public.sitemap_urls" does not exist')) {
          setMigrationMissing(true);
        } else {
          throw error;
        }
      } else {
        setCustomUrls(data || []);
        setMigrationMissing(false);
      }
    } catch (err: any) {
      console.error('Error fetching custom URLs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDynamicRoutes = async () => {
    try {
      setLoadingDynamic(true);
      const routes: DynamicRoute[] = [];

      // 1. Fetch grounds
      const { data: grounds } = await supabase
        .from('grounds')
        .select('city, name')
        .eq('active', true)
        .eq('approved', true);

      if (grounds) {
        grounds.forEach((ground: any) => {
          const c = slugifyGroundSegment(ground.city);
          const n = slugifyGroundSegment(ground.name);
          routes.push({
            url: `/ground/${c}/${n}`,
            type: 'ground',
            priority: 0.9,
            changefreq: 'daily',
          });
        });
      }

      // 2. Fetch blogs
      const { data: blogs } = await supabase
        .from('blogs')
        .select('slug')
        .eq('is_published', true);

      if (blogs) {
        blogs.forEach((blog: any) => {
          if (blog.slug) {
            routes.push({
              url: `/blog/${blog.slug}`,
              type: 'blog',
              priority: 0.8,
              changefreq: 'weekly',
            });
          }
        });
      }

      // 3. Fetch products
      const { data: products } = await supabase
        .from('shop_products')
        .select('name');

      if (products) {
        products.forEach((product: any) => {
          if (product.name) {
            routes.push({
              url: `/shop/${slugify(product.name)}`,
              type: 'product',
              priority: 0.8,
              changefreq: 'weekly',
            });
          }
        });
      }

      setDynamicUrls(routes);
    } catch (err: any) {
      console.error('Error loading dynamic routes:', err);
    } finally {
      setLoadingDynamic(false);
    }
  };

  const slugifyGroundSegment = (value: string) => {
    return (value || 'ground')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
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

  const handleAddUrl = async () => {
    if (!newUrl) {
      showError('Please enter a URL path');
      return;
    }

    let cleanUrl = newUrl.trim();
    if (!cleanUrl.startsWith('/')) {
      cleanUrl = '/' + cleanUrl;
    }

    // Basic validation
    if (cleanUrl.includes('//') || cleanUrl.includes(' ')) {
      showError('Invalid URL format');
      return;
    }

    try {
      setAdding(true);
      const parsedPriority = parseFloat(priority);

      const { data, error } = await supabase
        .from('sitemap_urls')
        .insert({
          url: cleanUrl,
          priority: isNaN(parsedPriority) ? 0.8 : parsedPriority,
          changefreq: changefreq,
        })
        .select();

      if (error) throw error;

      setCustomUrls([data[0], ...customUrls]);
      setNewUrl('');
      showSuccess('Custom URL added successfully');
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to add custom URL');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUrl = async (id: string) => {
    const performDelete = async () => {
      try {
        const { error } = await supabase
          .from('sitemap_urls')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setCustomUrls(customUrls.filter(item => item.id !== id));
        showSuccess('Custom URL deleted successfully');
      } catch (err: any) {
        console.error(err);
        showError(err.message || 'Failed to delete URL');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this custom sitemap URL?')) {
        performDelete();
      }
    } else {
      Alert.alert('Confirm Delete', 'Are you sure you want to delete this custom sitemap URL?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete }
      ]);
    }
  };

  const showError = (msg: string) => {
    if (Platform.OS === 'web') alert(msg);
    else Alert.alert('Error', msg);
  };

  const showSuccess = (msg: string) => {
    if (Platform.OS === 'web') console.log(msg); // toast or simple alert
  };

  // Generate XML string preview
  const generateXmlPreview = () => {
    const siteUrl = 'https://bookyourground.com';
    const date = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Statics
    STATIC_ROUTES.forEach(route => {
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}${route.url}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority.toFixed(1)}</priority>\n`;
      xml += `  </url>\n`;
    });

    // 2. Dynamics
    dynamicUrls.forEach(route => {
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}${route.url}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority.toFixed(1)}</priority>\n`;
      xml += `  </url>\n`;
    });

    // 3. Customs
    customUrls.forEach(route => {
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}${route.url}</loc>\n`;
      xml += `    <lastmod>${date}</lastmod>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${Number(route.priority).toFixed(1)}</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;
    return xml;
  };

  const content = (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sitemap Manager' }} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sitemap URL Manager</Text>
          <Text style={styles.subtitle}>Configure indexing parameters and custom landing paths for search bots.</Text>
        </View>
        <Pressable 
          style={styles.refreshBtn}
          onPress={() => {
            fetchCustomUrls();
            fetchDynamicRoutes();
          }}
        >
          <RefreshCw size={16} color="#4B5563" />
          <Text style={styles.refreshBtnText}>Reload Data</Text>
        </Pressable>
      </View>

      {/* Migration Warning Banner */}
      {migrationMissing && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Database Migration Required</Text>
            <Text style={styles.warningText}>
              The database table <Text style={{ fontWeight: '700' }}>sitemap_urls</Text> does not exist yet. Please run the SQL migration script:
            </Text>
            <Text style={styles.warningCode}>
              supabase/migrations/20260622150000_create_sitemap_urls.sql
            </Text>
            <Text style={styles.warningNote}>
              Until migrations are run, custom URL registering will be unavailable.
            </Text>
          </View>
        </View>
      )}

      {/* Inner Sub-Tabs */}
      <View style={styles.tabsRow}>
        <Pressable 
          style={[styles.tabButton, activeSubTab === 'custom' && styles.tabButtonActive]}
          onPress={() => setActiveSubTab('custom')}
        >
          <Database size={14} color={activeSubTab === 'custom' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabButtonText, activeSubTab === 'custom' && styles.tabButtonTextActive]}>
            Custom URLs ({customUrls.length})
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.tabButton, activeSubTab === 'static' && styles.tabButtonActive]}
          onPress={() => setActiveSubTab('static')}
        >
          <Sparkles size={14} color={activeSubTab === 'static' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabButtonText, activeSubTab === 'static' && styles.tabButtonTextActive]}>
            Static Routes ({STATIC_ROUTES.length})
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.tabButton, activeSubTab === 'dynamic' && styles.tabButtonActive]}
          onPress={() => setActiveSubTab('dynamic')}
        >
          <Globe size={14} color={activeSubTab === 'dynamic' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabButtonText, activeSubTab === 'dynamic' && styles.tabButtonTextActive]}>
            Dynamic Routes ({dynamicUrls.length})
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.tabButton, activeSubTab === 'xml' && styles.tabButtonActive]}
          onPress={() => setActiveSubTab('xml')}
        >
          <Code size={14} color={activeSubTab === 'xml' ? '#10B981' : '#6B7280'} />
          <Text style={[styles.tabButtonText, activeSubTab === 'xml' && styles.tabButtonTextActive]}>
            XML Preview
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Custom Tab Panel */}
        {activeSubTab === 'custom' && (
          <View style={styles.panel}>
            {!migrationMissing && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Add Custom Sitemap URL</Text>
                <View style={styles.formRow}>
                  <View style={{ flex: 3, minWidth: 200 }}>
                    <Text style={styles.inputLabel}>URL Path (e.g. /promotions/summer)</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={newUrl}
                      onChangeText={setNewUrl}
                      placeholder="/custom-path"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={styles.inputLabel}>Priority</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={priority}
                      onChangeText={setPriority}
                      placeholder="0.8"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1.5, minWidth: 120 }}>
                    <Text style={styles.inputLabel}>Change Freq</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={changefreq}
                      onChangeText={setChangefreq}
                      placeholder="weekly"
                    />
                  </View>
                  <View style={{ justifyContent: 'flex-end' }}>
                    <Pressable 
                      style={[styles.addButton, adding && { opacity: 0.7 }]} 
                      onPress={handleAddUrl}
                      disabled={adding}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.addButtonText}>{adding ? 'Adding...' : 'Add'}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {loading ? (
              <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 24 }} />
            ) : migrationMissing ? (
              <View style={styles.emptyState}>
                <Database size={32} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Custom URLs Unavailable</Text>
                <Text style={styles.emptyText}>Please set up the database table to start adding custom routes.</Text>
              </View>
            ) : customUrls.length === 0 ? (
              <View style={styles.emptyState}>
                <Database size={32} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Custom URLs Registered</Text>
                <Text style={styles.emptyText}>Any custom path added here will be merged into the static sitemap during builds.</Text>
              </View>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 3 }]}>Custom URL Path</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Priority</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Frequency</Text>
                  <Text style={[styles.th, { width: 80, textAlign: 'right' }]}>Action</Text>
                </View>
                {customUrls.map(item => (
                  <View key={item.id} style={styles.tableRow}>
                    <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ArrowRight size={14} color="#10B981" />
                      <Text style={styles.urlText} numberOfLines={1}>{item.url}</Text>
                    </View>
                    <Text style={[styles.tdText, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>
                      {Number(item.priority).toFixed(1)}
                    </Text>
                    <Text style={[styles.tdText, { flex: 1, textAlign: 'center', color: '#6B7280' }]}>
                      {item.changefreq}
                    </Text>
                    <View style={{ width: 80, flexDirection: 'row', justifyContent: 'flex-end' }}>
                      <Pressable onPress={() => handleDeleteUrl(item.id)} style={styles.deleteAction}>
                        <Trash2 size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Static Tab Panel */}
        {activeSubTab === 'static' && (
          <View style={styles.panel}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 3 }]}>Core Public URL Path</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Priority</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Frequency</Text>
              </View>
              {STATIC_ROUTES.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.urlText}>{item.url === '' ? '/' : item.url}</Text>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>
                    {item.priority.toFixed(1)}
                  </Text>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'center', color: '#6B7280' }]}>
                    {item.changefreq}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Dynamic Tab Panel */}
        {activeSubTab === 'dynamic' && (
          <View style={styles.panel}>
            {loadingDynamic ? (
              <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 24 }} />
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 3 }]}>Indexed Route URL</Text>
                  <Text style={[styles.th, { flex: 1.5, textAlign: 'center' }]}>Source Category</Text>
                  <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Priority</Text>
                </View>
                {dynamicUrls.map((item, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.urlText, { flex: 3 }]} numberOfLines={1}>{item.url}</Text>
                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                      <View style={[
                        styles.badge, 
                        item.type === 'ground' && styles.badgeGround,
                        item.type === 'blog' && styles.badgeBlog,
                        item.type === 'product' && styles.badgeProduct
                      ]}>
                        <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={[styles.tdText, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>
                      {item.priority.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* XML Preview Tab Panel */}
        {activeSubTab === 'xml' && (
          <View style={styles.panel}>
            <View style={styles.xmlContainer}>
              <Text style={styles.xmlCode} numberOfLines={999}>
                {generateXmlPreview()}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <MobileAppNavbar title="SITEMAP MANAGER" titleColor="#10B981" />
      <BlogsSubbar activeTab="sitemap">
        {content}
      </BlogsSubbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  body: {
    flex: 1,
    marginTop: 16,
  },
  panel: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
    gap: 8,
    ...Platform.select({
      web: { flexWrap: 'wrap' as any },
    })
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabButtonActive: {
    borderBottomColor: '#10B981',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  tabButtonTextActive: {
    color: '#10B981',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12.5,
    color: '#D97706',
    fontFamily: 'Inter',
    lineHeight: 16,
  },
  warningCode: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 6,
    color: '#B45309',
    alignSelf: 'flex-start',
  },
  warningNote: {
    fontSize: 11,
    color: '#92400E',
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-end',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  textInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#111827',
    fontFamily: 'Inter',
    backgroundColor: '#F9FAFB',
  },
  addButton: {
    height: 38,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
    fontFamily: 'Inter',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'Inter',
  },
  emptyText: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter',
    maxWidth: 320,
    lineHeight: 16,
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  urlText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    fontFamily: 'Inter',
    flex: 3,
  },
  tdText: {
    fontSize: 13,
    color: '#111827',
    fontFamily: 'Inter',
  },
  deleteAction: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  badgeGround: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  badgeBlog: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  badgeProduct: {
    backgroundColor: '#F3E8FF',
    borderColor: '#A855F7',
  },
  xmlContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  xmlCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
    ...Platform.select({
      web: { whiteSpace: 'pre-wrap' as any },
    })
  },
});
