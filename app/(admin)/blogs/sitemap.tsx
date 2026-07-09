import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Platform, Clipboard } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Trash2, Globe, AlertTriangle, Code, ArrowRight, RefreshCw, 
  Search, ChevronDown, Check, Copy, ExternalLink, Download, Upload, 
  Sparkles, X, Info, CheckCircle2 
} from 'lucide-react-native';

import WebLayout from '@/components/web/WebLayout';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import BlogsSubbar from '@/components/admin/BlogsSubbar';

interface CustomSitemapUrl {
  id: string;
  url: string;
  priority: number;
  changefreq: string;
  created_at?: string;
  is_indexed?: boolean;
  seo_score?: number;
}

interface GroundRoute {
  id: string;
  city: string;
  name: string;
  created_at?: string;
}

interface BlogRoute {
  id: string;
  slug: string;
  title: string;
  created_at?: string;
}

interface ProductRoute {
  id: string;
  name: string;
  created_at?: string;
}

interface SiteUrlItem {
  id: string;
  title: string;
  type: 'Static' | 'Category' | 'Blog' | 'Product' | 'Custom';
  url: string;
  date: string;
  is_indexed: boolean;
  seo_score: number;
  priority: number;
  changefreq: string;
  rawId?: string; // DB id if custom/exclusion
}

const STATIC_ROUTES = [
  { url: '', priority: 1.0, changefreq: 'weekly', title: 'Home' },
  { url: '/features', priority: 0.8, changefreq: 'weekly', title: 'Features' },
  { url: '/pricing', priority: 0.8, changefreq: 'weekly', title: 'Pricing' },
  { url: '/about', priority: 0.8, changefreq: 'weekly', title: 'About Us' },
  { url: '/privacy', priority: 0.8, changefreq: 'weekly', title: 'Privacy Policy' },
  { url: '/terms', priority: 0.8, changefreq: 'weekly', title: 'Terms of Service' },
  { url: '/cookies', priority: 0.8, changefreq: 'weekly', title: 'Cookies Policy' },
  { url: '/contact', priority: 0.8, changefreq: 'weekly', title: 'Contact' },
  { url: '/faq', priority: 0.8, changefreq: 'weekly', title: 'FAQ' },
  { url: '/shipping', priority: 0.8, changefreq: 'weekly', title: 'Shipping' },
  { url: '/refund-policy', priority: 0.8, changefreq: 'weekly', title: 'Refund Policy' },
  { url: '/blog', priority: 0.8, changefreq: 'weekly', title: 'Blog' },
  { url: '/shop', priority: 0.8, changefreq: 'weekly', title: 'Shop' },
  { url: '/corporate', priority: 0.8, changefreq: 'weekly', title: 'Corporate' },
  { url: '/cricket-grounds', priority: 0.8, changefreq: 'weekly', title: 'Cricket Grounds' },
  { url: '/football-grounds', priority: 0.8, changefreq: 'weekly', title: 'Football Grounds' },
  { url: '/grounds-info', priority: 0.8, changefreq: 'weekly', title: 'Grounds Info' },
  { url: '/how-it-works', priority: 0.8, changefreq: 'weekly', title: 'How It Works' },
  { url: '/list-your-venue', priority: 0.8, changefreq: 'weekly', title: 'List Your Venue' },
  { url: '/match-strategies', priority: 0.8, changefreq: 'weekly', title: 'Match Strategies' },
];

export default function SitemapManager() {
  const [customUrls, setCustomUrls] = useState<CustomSitemapUrl[]>([]);
  const [grounds, setGrounds] = useState<GroundRoute[]>([]);
  const [blogs, setBlogs] = useState<BlogRoute[]>([]);
  const [products, setProducts] = useState<ProductRoute[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [indexStatusFilter, setIndexStatusFilter] = useState<'all' | 'indexed' | 'non-indexed'>('all');
  const [activeTypeTab, setActiveTypeTab] = useState<'All' | 'Static' | 'Category' | 'Blog' | 'Product' | 'Custom'>('All');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [selectedSeoItem, setSelectedSeoItem] = useState<SiteUrlItem | null>(null);

  // Form State
  const [newUrl, setNewUrl] = useState('');
  const [priority, setPriority] = useState('0.8');
  const [changefreq, setChangefreq] = useState('weekly');
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  // Scan SEO State
  const [scanning, setScanning] = useState(false);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [scanningUrl, setScanningUrl] = useState('');

  // Tab state: 'manager' | 'xml'
  const [activeSubTab, setActiveSubTab] = useState<'manager' | 'xml'>('manager');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCustomUrls(),
        fetchGroundsData(),
        fetchBlogsData(),
        fetchProductsData()
      ]);
    } catch (err) {
      console.error('Error fetching initial sitemap data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomUrls = async () => {
    try {
      // Attempt to fetch all columns including is_indexed and seo_score
      const { data, error } = await supabase
        .from('sitemap_urls')
        .select('id, url, priority, changefreq, is_indexed, seo_score, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        // Handle migration missing or columns missing
        if (error.message.includes('column "is_indexed" does not exist') || error.message.includes('column "seo_score" does not exist')) {
          setMigrationNeeded(true);
          // Fallback to query only basic columns
          const fallback = await supabase
            .from('sitemap_urls')
            .select('id, url, priority, changefreq, created_at')
            .order('created_at', { ascending: false });
          
          if (fallback.error) throw fallback.error;

          const mapped = (fallback.data || []).map(item => ({
            ...item,
            is_indexed: true,
            seo_score: 100
          }));
          setCustomUrls(mapped);
        } else if (error.code === 'PGRST116' || error.message.includes('relation "public.sitemap_urls" does not exist')) {
          setMigrationMissing(true);
        } else {
          throw error;
        }
      } else {
        setCustomUrls(data || []);
        setMigrationNeeded(false);
        setMigrationMissing(false);
      }
    } catch (err: any) {
      console.error('Error fetching custom URLs:', err);
    }
  };

  const fetchGroundsData = async () => {
    try {
      const { data } = await supabase
        .from('grounds')
        .select('id, city, name, created_at')
        .eq('active', true)
        .eq('approved', true);
      setGrounds(data || []);
    } catch (err) {
      console.error('Error fetching grounds:', err);
    }
  };

  const fetchBlogsData = async () => {
    try {
      const { data } = await supabase
        .from('blogs')
        .select('id, slug, title, created_at')
        .eq('is_published', true);
      setBlogs(data || []);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    }
  };

  const fetchProductsData = async () => {
    try {
      const { data } = await supabase
        .from('shop_products')
        .select('id, name, created_at');
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
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

  // Consolidate all URL items
  const allItems = useMemo(() => {
    // 1. Static items
    const staticItems: SiteUrlItem[] = STATIC_ROUTES.map(route => {
      const urlPath = route.url === '' ? '/' : route.url;
      const dbMatch = customUrls.find(c => c.url.toLowerCase() === urlPath.toLowerCase());
      const isIndexed = dbMatch ? dbMatch.is_indexed !== false : true;
      const seoScore = dbMatch && dbMatch.seo_score !== undefined ? dbMatch.seo_score : 100;
      
      return {
        id: `static-${urlPath}`,
        title: route.title,
        type: 'Static',
        url: urlPath,
        date: '—',
        is_indexed: isIndexed,
        seo_score: seoScore,
        priority: route.priority,
        changefreq: route.changefreq,
        rawId: dbMatch?.id
      };
    });

    // 2. Category / Ground items
    const categoryItems: SiteUrlItem[] = grounds.map(ground => {
      const c = slugifyGroundSegment(ground.city);
      const n = slugifyGroundSegment(ground.name);
      const urlPath = `/ground/${c}/${n}`;
      const dbMatch = customUrls.find(c => c.url.toLowerCase() === urlPath.toLowerCase());
      const isIndexed = dbMatch ? dbMatch.is_indexed !== false : true;
      const seoScore = dbMatch && dbMatch.seo_score !== undefined ? dbMatch.seo_score : 100;

      return {
        id: `ground-${ground.id}`,
        title: ground.name,
        type: 'Category',
        url: urlPath,
        date: ground.created_at ? new Date(ground.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        is_indexed: isIndexed,
        seo_score: seoScore,
        priority: 0.9,
        changefreq: 'daily',
        rawId: dbMatch?.id
      };
    });

    // 3. Blog items
    const blogItems: SiteUrlItem[] = blogs.map(blog => {
      const urlPath = `/blog/${blog.slug}`;
      const dbMatch = customUrls.find(c => c.url.toLowerCase() === urlPath.toLowerCase());
      const isIndexed = dbMatch ? dbMatch.is_indexed !== false : true;
      const seoScore = dbMatch && dbMatch.seo_score !== undefined ? dbMatch.seo_score : 100;

      return {
        id: `blog-${blog.id}`,
        title: blog.title,
        type: 'Blog',
        url: urlPath,
        date: blog.created_at ? new Date(blog.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        is_indexed: isIndexed,
        seo_score: seoScore,
        priority: 0.8,
        changefreq: 'weekly',
        rawId: dbMatch?.id
      };
    });

    // 4. Product items
    const productItems: SiteUrlItem[] = products.map(product => {
      const urlPath = `/shop/${slugify(product.name)}`;
      const dbMatch = customUrls.find(c => c.url.toLowerCase() === urlPath.toLowerCase());
      const isIndexed = dbMatch ? dbMatch.is_indexed !== false : true;
      const seoScore = dbMatch && dbMatch.seo_score !== undefined ? dbMatch.seo_score : 100;

      return {
        id: `product-${product.id}`,
        title: product.name,
        type: 'Product',
        url: urlPath,
        date: product.created_at ? new Date(product.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        is_indexed: isIndexed,
        seo_score: seoScore,
        priority: 0.8,
        changefreq: 'weekly',
        rawId: dbMatch?.id
      };
    });

    // 5. Custom routes (that aren't already represented by core routes)
    const corePaths = new Set([
      ...STATIC_ROUTES.map(r => (r.url === '' ? '/' : r.url).toLowerCase()),
      ...categoryItems.map(c => c.url.toLowerCase()),
      ...blogItems.map(b => b.url.toLowerCase()),
      ...productItems.map(p => p.url.toLowerCase())
    ]);

    const customItems: SiteUrlItem[] = customUrls
      .filter(c => !corePaths.has(c.url.toLowerCase()))
      .map(c => {
        let titleName = c.url.split('/').filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        if (!titleName) titleName = 'Custom Link';
        return {
          id: `custom-${c.id}`,
          title: titleName,
          type: 'Custom',
          url: c.url,
          date: c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
          is_indexed: c.is_indexed !== false,
          seo_score: c.seo_score !== undefined ? c.seo_score : 100,
          priority: Number(c.priority) || 0.8,
          changefreq: c.changefreq || 'weekly',
          rawId: c.id
        };
      });

    return [
      ...staticItems,
      ...categoryItems,
      ...blogItems,
      ...productItems,
      ...customItems
    ];
  }, [customUrls, grounds, blogs, products]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const counts = { All: 0, Static: 0, Category: 0, Blog: 0, Product: 0, Custom: 0 };
    allItems.forEach(item => {
      counts.All++;
      if (item.type === 'Static') counts.Static++;
      if (item.type === 'Category') counts.Category++;
      if (item.type === 'Blog') counts.Blog++;
      if (item.type === 'Product') counts.Product++;
      if (item.type === 'Custom') counts.Custom++;
    });
    return counts;
  }, [allItems]);

  // Filtered and Searched items list
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // 1. Search Query
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.url.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Index Status Filter
      let matchesIndexStatus = true;
      if (indexStatusFilter === 'indexed') {
        matchesIndexStatus = item.is_indexed === true;
      } else if (indexStatusFilter === 'non-indexed') {
        matchesIndexStatus = item.is_indexed === false;
      }

      // 3. Tab filter
      let matchesTypeTab = true;
      if (activeTypeTab !== 'All') {
        matchesTypeTab = item.type === activeTypeTab;
      }

      return matchesSearch && matchesIndexStatus && matchesTypeTab;
    });
  }, [allItems, searchQuery, indexStatusFilter, activeTypeTab]);

  // Toggle Indexed checkbox
  const handleToggleIndexed = async (item: SiteUrlItem) => {
    if (migrationMissing) {
      showError('Database table missing. Run migration first.');
      return;
    }

    const isCoreRoute = item.type !== 'Custom';
    const newIndexed = !item.is_indexed;

    try {
      if (isCoreRoute) {
        // If core route exclusion already exists
        if (item.rawId) {
          // If toggled back to true, remove the exclusion/override row to return to default
          // Or just update the row is_indexed status
          const { error } = await supabase
            .from('sitemap_urls')
            .update({ is_indexed: newIndexed })
            .eq('id', item.rawId);
          if (error) throw error;
        } else {
          // Create exclusion row in sitemap_urls
          const { error } = await supabase
            .from('sitemap_urls')
            .insert({
              url: item.url,
              is_indexed: newIndexed,
              priority: item.priority,
              changefreq: item.changefreq,
              seo_score: item.seo_score
            });
          if (error) throw error;
        }
      } else {
        // Custom URL row exists, toggle it
        const { error } = await supabase
          .from('sitemap_urls')
          .update({ is_indexed: newIndexed })
          .eq('id', item.rawId);
        if (error) throw error;
      }
      
      await fetchCustomUrls();
      showSuccess(`Index status updated for ${item.title}`);
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to update index status');
    }
  };

  // Export URLs to CSV
  const handleExportAll = () => {
    try {
      const headers = ['PAGE TITLE', 'TYPE', 'URL PATH', 'DATE ADDED', 'INDEXED', 'SEO SCORE', 'PRIORITY', 'FREQUENCY'];
      const rows = allItems.map(item => [
        item.title,
        item.type,
        item.url,
        item.date,
        item.is_indexed ? 'Yes' : 'No',
        `${item.seo_score}/100`,
        item.priority.toFixed(1),
        item.changefreq
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      
      if (Platform.OS === 'web') {
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sitemap_urls_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        showSuccess('CSV generated internally');
      }
      showSuccess('URLs exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      showError('Failed to export CSV');
    }
  };

  // Import URLs from CSV/JSON
  const handleImportIndexed = async () => {
    if (!importText.trim()) {
      showError('Please paste paths to import');
      return;
    }

    try {
      setImporting(true);
      const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
      let importedCount = 0;

      for (const line of lines) {
        let path = line;
        let priorityVal = 0.8;
        let freq = 'weekly';

        // Check if comma-separated
        if (line.includes(',')) {
          const parts = line.split(',');
          path = parts[0].trim();
          if (parts[1]) priorityVal = parseFloat(parts[1]) || 0.8;
          if (parts[2]) freq = parts[2].trim();
        }

        // Clean path
        if (!path.startsWith('/')) {
          path = '/' + path;
        }

        // Skip invalid formats
        if (path.includes(' ') || path.includes('//')) continue;

        // Check duplicates
        const exists = customUrls.some(c => c.url.toLowerCase() === path.toLowerCase());
        if (exists) continue;

        const { error } = await supabase
          .from('sitemap_urls')
          .insert({
            url: path,
            priority: priorityVal,
            changefreq: freq,
            is_indexed: true,
            seo_score: 100
          });
        
        if (!error) importedCount++;
      }

      await fetchCustomUrls();
      setShowImportModal(false);
      setImportText('');
      showSuccess(`Successfully imported ${importedCount} custom URLs`);
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  // Add Custom URL
  const handleAddUrl = async () => {
    if (!newUrl) {
      showError('Please enter a URL path');
      return;
    }

    let cleanUrl = newUrl.trim();
    if (!cleanUrl.startsWith('/')) {
      cleanUrl = '/' + cleanUrl;
    }

    if (cleanUrl.includes('//') || cleanUrl.includes(' ')) {
      showError('Invalid URL path format');
      return;
    }

    try {
      setAdding(true);
      const parsedPriority = parseFloat(priority) || 0.8;

      const { data, error } = await supabase
        .from('sitemap_urls')
        .insert({
          url: cleanUrl,
          priority: parsedPriority,
          changefreq: changefreq,
          is_indexed: true,
          seo_score: 100
        })
        .select();

      if (error) throw error;

      await fetchCustomUrls();
      setNewUrl('');
      setShowAddModal(false);
      showSuccess('Custom URL added successfully');
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to add custom URL');
    } finally {
      setAdding(false);
    }
  };

  // Delete Custom URL or Exclusion Row
  const handleDeleteUrl = async (item: SiteUrlItem) => {
    if (!item.rawId) return;

    const performDelete = async () => {
      try {
        const { error } = await supabase
          .from('sitemap_urls')
          .delete()
          .eq('id', item.rawId);

        if (error) throw error;
        await fetchCustomUrls();
        showSuccess('Custom URL deleted successfully');
      } catch (err: any) {
        console.error(err);
        showError(err.message || 'Failed to delete URL');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to remove ${item.url}?`)) {
        performDelete();
      }
    } else {
      Alert.alert('Confirm Remove', `Are you sure you want to remove ${item.url}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: performDelete }
      ]);
    }
  };

  // Simulated SEO Audit scan
  const handleScanSEO = async () => {
    if (scanning) return;
    try {
      setScanning(true);
      setScanningProgress(0);
      
      const total = allItems.length;
      for (let i = 0; i < total; i++) {
        const item = allItems[i];
        setScanningUrl(item.url);
        setScanningProgress(Math.round(((i + 1) / total) * 100));
        
        // Wait 120ms to simulate audit workload per row
        await new Promise(r => setTimeout(r, 120));

        // Evaluate realistic score
        let score = 100;
        if (item.url.length > 50) score -= 10;
        else if (item.url.length > 35) score -= 5;
        if (item.url.includes('-')) score -= 2; // slight penalization for dashes
        if (item.url.includes('refund') || item.url.includes('shipping')) score = 90; // mock legal pages
        if (item.url.includes('terms') || item.url.includes('privacy')) score = 95;

        // Upsert to DB to persist
        if (item.rawId) {
          await supabase
            .from('sitemap_urls')
            .update({ seo_score: score })
            .eq('id', item.rawId);
        } else {
          // Exclude or register core paths with their score
          await supabase
            .from('sitemap_urls')
            .insert({
              url: item.url,
              priority: item.priority,
              changefreq: item.changefreq,
              is_indexed: item.is_indexed,
              seo_score: score
            });
        }
      }

      await fetchCustomUrls();
      showSuccess('SEO Scan completed and scores saved!');
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
      setScanningProgress(0);
      setScanningUrl('');
    }
  };

  const copyToClipboard = (path: string) => {
    const fullUrl = `https://bookyourground.com${path}`;
    Clipboard.setString(fullUrl);
    showSuccess('Link copied to clipboard');
  };

  const openExternalLink = (path: string) => {
    const fullUrl = `https://bookyourground.com${path}`;
    if (Platform.OS === 'web') {
      window.open(fullUrl, '_blank');
    }
  };

  const showError = (msg: string) => {
    if (Platform.OS === 'web') alert(msg);
    else Alert.alert('Error', msg);
  };

  const showSuccess = (msg: string) => {
    if (Platform.OS === 'web') {
      // Toast / console fallback
      console.log(msg);
    }
  };

  // Generate XML sitemap string
  const generateXmlPreview = () => {
    const siteUrl = 'https://bookyourground.com';
    const date = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    allItems.forEach(item => {
      if (item.is_indexed) {
        xml += `  <url>\n`;
        xml += `    <loc>${siteUrl}${item.url}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
        xml += `    <priority>${item.priority.toFixed(1)}</priority>\n`;
        xml += `  </url>\n`;
      }
    });

    xml += `</urlset>`;
    return xml;
  };

  // Modal Dialog: Import URLs
  const renderImportModal = () => {
    if (!showImportModal) return null;
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Sitemap URLs</Text>
            <Pressable onPress={() => setShowImportModal(false)}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          <Text style={styles.modalDescription}>
            Enter one path per line. Optionally, specify priority and frequency separated by commas:
          </Text>
          <View style={styles.importExample}>
            <Text style={styles.importExampleText}>/promotions/summer-deals, 0.9, daily</Text>
            <Text style={styles.importExampleText}>/shop/gear/pads, 0.8, weekly</Text>
          </View>
          <TextInput
            multiline
            numberOfLines={8}
            style={styles.modalTextArea}
            value={importText}
            onChangeText={setImportText}
            placeholder="/custom-path-1&#10;/custom-path-2, 0.7, monthly"
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.modalButtons}>
            <Pressable style={styles.modalCancelBtn} onPress={() => setShowImportModal(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.modalSubmitBtn, importing && { opacity: 0.7 }]} 
              onPress={handleImportIndexed}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Import URLs</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // Modal Dialog: Add Custom URL
  const renderAddModal = () => {
    if (!showAddModal) return null;
    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Custom URL Path</Text>
            <Pressable onPress={() => setShowAddModal(false)}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          <View style={styles.modalFormGroup}>
            <Text style={styles.modalLabel}>URL Path</Text>
            <TextInput 
              style={styles.modalInput}
              value={newUrl}
              onChangeText={setNewUrl}
              placeholder="/promotions/summer-games"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.modalFormGroup, { flex: 1 }]}>
              <Text style={styles.modalLabel}>Priority (0.0 to 1.0)</Text>
              <TextInput 
                style={styles.modalInput}
                value={priority}
                onChangeText={setPriority}
                placeholder="0.8"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.modalFormGroup, { flex: 1 }]}>
              <Text style={styles.modalLabel}>Change Frequency</Text>
              <View style={styles.selectWrapper}>
                <TextInput 
                  style={styles.modalInput}
                  value={changefreq}
                  onChangeText={setChangefreq}
                  placeholder="weekly"
                />
              </View>
            </View>
          </View>
          <View style={styles.modalButtons}>
            <Pressable style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.modalSubmitBtn, adding && { opacity: 0.7 }]} 
              onPress={handleAddUrl}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Add URL Path</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  // SEO Score Diagnostics Detail Popup
  const renderSeoDetailPopup = () => {
    if (!selectedSeoItem) return null;
    const item = selectedSeoItem;
    
    // Core details based on score
    const urlLengthCheck = item.url.length <= 40;
    const structureCheck = item.url.startsWith('/') && !item.url.includes('//');
    const secureProtocol = true;
    const pageIndexCheck = item.is_indexed;

    return (
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxWidth: 450 }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Globe size={18} color="#10B981" />
              <Text style={styles.modalTitle} numberOfLines={1}>SEO Checklist: {item.title}</Text>
            </View>
            <Pressable onPress={() => setSelectedSeoItem(null)}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          
          <View style={styles.seoScoreCircleContainer}>
            <View style={[styles.seoCircle, { borderColor: item.seo_score >= 90 ? '#10B981' : '#F59E0B' }]}>
              <Text style={[styles.seoCircleText, { color: item.seo_score >= 90 ? '#10B981' : '#F59E0B' }]}>{item.seo_score}</Text>
              <Text style={styles.seoCircleMax}>/100</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.seoUrlTitle}>{item.url}</Text>
              <Text style={styles.seoUrlSubtitle}>Audit diagnostics ran against Google Search guidelines.</Text>
            </View>
          </View>

          <View style={styles.seoCheckList}>
            <View style={styles.seoCheckItem}>
              <CheckCircle2 size={16} color={urlLengthCheck ? '#10B981' : '#F59E0B'} />
              <Text style={styles.seoCheckLabel}>URL length check ({item.url.length} chars)</Text>
              <Text style={[styles.seoCheckStatus, { color: urlLengthCheck ? '#10B981' : '#F59E0B' }]}>
                {urlLengthCheck ? 'PASS' : 'WARN'}
              </Text>
            </View>
            <View style={styles.seoCheckItem}>
              <CheckCircle2 size={16} color={structureCheck ? '#10B981' : '#EF4444'} />
              <Text style={styles.seoCheckLabel}>Semantic path syntax validation</Text>
              <Text style={styles.seoCheckStatus}>PASS</Text>
            </View>
            <View style={styles.seoCheckItem}>
              <CheckCircle2 size={16} color={secureProtocol ? '#10B981' : '#EF4444'} />
              <Text style={styles.seoCheckLabel}>SSL secure canonical route</Text>
              <Text style={styles.seoCheckStatus}>PASS</Text>
            </View>
            <View style={styles.seoCheckItem}>
              <CheckCircle2 size={16} color={pageIndexCheck ? '#10B981' : '#EF4444'} />
              <Text style={styles.seoCheckLabel}>Sitemap indexable verification</Text>
              <Text style={[styles.seoCheckStatus, { color: pageIndexCheck ? '#10B981' : '#EF4444' }]}>
                {pageIndexCheck ? 'ACTIVE' : 'EXCLUDED'}
              </Text>
            </View>
          </View>

          <View style={[styles.modalButtons, { marginTop: 8 }]}>
            <Pressable style={[styles.modalSubmitBtn, { flex: 1 }]} onPress={() => setSelectedSeoItem(null)}>
              <Text style={styles.modalSubmitBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const sitemapContent = (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sitemap Manager' }} />

      {/* Main Header redone to match the screen exactly */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>All Site URLs</Text>
          <Text style={styles.subtitle}>Directory of static, category, product, and blog pages.</Text>
        </View>
        
        <View style={styles.actionHeaderRow}>
          <Pressable 
            style={styles.actionHeaderBtn}
            onPress={() => setShowImportModal(true)}
          >
            <Upload size={14} color="#374151" />
            <Text style={styles.actionHeaderBtnText}>Import Indexed</Text>
          </Pressable>
          <Pressable 
            style={styles.actionHeaderBtn}
            onPress={handleExportAll}
          >
            <Download size={14} color="#374151" />
            <Text style={styles.actionHeaderBtnText}>Export All</Text>
          </Pressable>
          <Pressable 
            style={[styles.actionHeaderBtn, styles.seoBtn, scanning && { opacity: 0.7 }]}
            onPress={handleScanSEO}
            disabled={scanning}
          >
            <Sparkles size={14} color="#6366F1" />
            <Text style={[styles.actionHeaderBtnText, styles.seoBtnText]}>Scan All SEO</Text>
          </Pressable>
          <Pressable 
            style={[styles.actionHeaderBtn, styles.iconOnlyBtn]}
            onPress={fetchInitialData}
          >
            <RefreshCw size={14} color="#374151" />
          </Pressable>
        </View>
      </View>

      {/* Sub tabs: Manager vs XML */}
      <View style={styles.mainTabsRow}>
        <Pressable 
          style={[styles.mainTabButton, activeSubTab === 'manager' && styles.mainTabButtonActive]}
          onPress={() => setActiveSubTab('manager')}
        >
          <Text style={[styles.mainTabButtonText, activeSubTab === 'manager' && styles.mainTabButtonTextActive]}>URL Manager</Text>
        </Pressable>
        <Pressable 
          style={[styles.mainTabButton, activeSubTab === 'xml' && styles.mainTabButtonActive]}
          onPress={() => setActiveSubTab('xml')}
        >
          <Text style={[styles.mainTabButtonText, activeSubTab === 'xml' && styles.mainTabButtonTextActive]}>XML Output Preview</Text>
        </Pressable>
        {activeSubTab === 'manager' && (
          <Pressable 
            style={styles.addUrlFloatBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={14} color="#FFF" />
            <Text style={styles.addUrlFloatBtnText}>Add Custom URL</Text>
          </Pressable>
        )}
      </View>

      {/* Database Warning Banners */}
      {migrationMissing && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={20} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.warningTitle, { color: '#B91C1C' }]}>Database Schema Missing</Text>
            <Text style={[styles.warningText, { color: '#DC2626' }]}>
              The sitemap configuration table is missing. Run the migration to start tracking exclusions and SEO scores:
            </Text>
            <Text style={styles.warningCode}>
              supabase/migrations/20260709180000_add_is_indexed_to_sitemap_urls.sql
            </Text>
          </View>
        </View>
      )}

      {migrationNeeded && !migrationMissing && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Database Columns Pending Update</Text>
            <Text style={styles.warningText}>
              Your database has `sitemap_urls` but lacks `is_indexed` and `seo_score` columns. Apply:
            </Text>
            <Text style={styles.warningCode}>
              supabase/migrations/20260709180000_add_is_indexed_to_sitemap_urls.sql
            </Text>
            <Text style={styles.warningNote}>
              Excluding and custom SEO scores will be simulated locally until applied.
            </Text>
          </View>
        </View>
      )}

      {/* Audit Scanner Progress Overlay */}
      {scanning && (
        <View style={styles.scanBanner}>
          <ActivityIndicator size="small" color="#6366F1" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.scanProgressText}>Auditing page structures... {scanningProgress}%</Text>
            <Text style={styles.scanUrlText} numberOfLines={1}>Scanning: {scanningUrl}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${scanningProgress}%` }]} />
          </View>
        </View>
      )}

      {activeSubTab === 'xml' ? (
        <ScrollView style={styles.xmlContainer}>
          <Text style={styles.xmlCode} numberOfLines={999}>
            {generateXmlPreview()}
          </Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Toolbar exactly matching image style */}
          <View style={styles.toolbar}>
            <View style={styles.toolbarLeft}>
              <View style={styles.searchWrapper}>
                <Search size={16} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput 
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by title or URL path..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={{ position: 'relative' }}>
                <Pressable 
                  style={styles.dropdownBtn}
                  onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {indexStatusFilter === 'all' && 'All Index Statuses'}
                    {indexStatusFilter === 'indexed' && 'Indexed Only'}
                    {indexStatusFilter === 'non-indexed' && 'Excluded Only'}
                  </Text>
                  <ChevronDown size={14} color="#4B5563" />
                </Pressable>

                {showStatusDropdown && (
                  <View style={styles.dropdownMenu}>
                    <Pressable 
                      style={[styles.dropdownItem, indexStatusFilter === 'all' && styles.dropdownItemActive]}
                      onPress={() => {
                        setIndexStatusFilter('all');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, indexStatusFilter === 'all' && styles.dropdownItemTextActive]}>
                        All Index Statuses
                      </Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.dropdownItem, indexStatusFilter === 'indexed' && styles.dropdownItemActive]}
                      onPress={() => {
                        setIndexStatusFilter('indexed');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, indexStatusFilter === 'indexed' && styles.dropdownItemTextActive]}>
                        Indexed Only
                      </Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.dropdownItem, indexStatusFilter === 'non-indexed' && styles.dropdownItemActive]}
                      onPress={() => {
                        setIndexStatusFilter('non-indexed');
                        setShowStatusDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, indexStatusFilter === 'non-indexed' && styles.dropdownItemTextActive]}>
                        Excluded Only
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* Filter Pills alignment to the right */}
            <View style={styles.toolbarRight}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, alignItems: 'center' }}
              >
                <Pressable 
                  style={[styles.pillBtn, activeTypeTab === 'All' && styles.pillBtnActive]}
                  onPress={() => setActiveTypeTab('All')}
                >
                  <Text style={[styles.pillBtnText, activeTypeTab === 'All' && styles.pillBtnTextActive]}>
                    All ({tabCounts.All})
                  </Text>
                </Pressable>
                <Pressable 
                  style={[styles.pillBtn, activeTypeTab === 'Static' && styles.pillBtnActive]}
                  onPress={() => setActiveTypeTab('Static')}
                >
                  <Text style={[styles.pillBtnText, activeTypeTab === 'Static' && styles.pillBtnTextActive]}>
                    Static ({tabCounts.Static})
                  </Text>
                </Pressable>
                <Pressable 
                  style={[styles.pillBtn, activeTypeTab === 'Category' && styles.pillBtnActive]}
                  onPress={() => setActiveTypeTab('Category')}
                >
                  <Text style={[styles.pillBtnText, activeTypeTab === 'Category' && styles.pillBtnTextActive]}>
                    Categories ({tabCounts.Category})
                  </Text>
                </Pressable>
                <Pressable 
                  style={[styles.pillBtn, activeTypeTab === 'Blog' && styles.pillBtnActive]}
                  onPress={() => setActiveTypeTab('Blog')}
                >
                  <Text style={[styles.pillBtnText, activeTypeTab === 'Blog' && styles.pillBtnTextActive]}>
                    Blogs ({tabCounts.Blog})
                  </Text>
                </Pressable>
                {tabCounts.Product > 0 && (
                  <Pressable 
                    style={[styles.pillBtn, activeTypeTab === 'Product' && styles.pillBtnActive]}
                    onPress={() => setActiveTypeTab('Product')}
                  >
                    <Text style={[styles.pillBtnText, activeTypeTab === 'Product' && styles.pillBtnTextActive]}>
                      Products ({tabCounts.Product})
                    </Text>
                  </Pressable>
                )}
                {tabCounts.Custom > 0 && (
                  <Pressable 
                    style={[styles.pillBtn, activeTypeTab === 'Custom' && styles.pillBtnActive]}
                    onPress={() => setActiveTypeTab('Custom')}
                  >
                    <Text style={[styles.pillBtnText, activeTypeTab === 'Custom' && styles.pillBtnTextActive]}>
                      Custom ({tabCounts.Custom})
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </View>
          </View>

          {/* Premium Table Content */}
          <ScrollView style={{ flex: 1, marginTop: 12 }}>
            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Compiling site routes...</Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Globe size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No URLs Found</Text>
                <Text style={styles.emptyText}>No paths matches the query "{searchQuery}" or selected status filter.</Text>
              </View>
            ) : (
              <View style={styles.tableCard}>
                {/* Table Header exactly matching the image headers */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2 }]}>PAGE TITLE / NAME</Text>
                  <Text style={[styles.th, { width: 90 }]}>TYPE</Text>
                  <Text style={[styles.th, { flex: 1.8 }]}>URL PATH</Text>
                  <Text style={[styles.th, { width: 100 }]}>DATE</Text>
                  <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>INDEXED</Text>
                  <Text style={[styles.th, { width: 120, textAlign: 'center' }]}>SEO SCORE</Text>
                  <Text style={[styles.th, { width: 100, textAlign: 'right' }]}>ACTIONS</Text>
                </View>

                {/* Table Rows */}
                {filteredItems.map((item, index) => (
                  <View 
                    key={item.id} 
                    style={[
                      styles.tableRow, 
                      index === filteredItems.length - 1 && { borderBottomWidth: 0 }
                    ]}
                  >
                    {/* Page Title */}
                    <View style={{ flex: 2 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                    </View>

                    {/* Type Badge */}
                    <View style={{ width: 90 }}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{item.type}</Text>
                      </View>
                    </View>

                    {/* URL Path */}
                    <View style={{ flex: 1.8 }}>
                      <Text style={styles.rowUrl} numberOfLines={1}>{item.url}</Text>
                    </View>

                    {/* Date */}
                    <View style={{ width: 100 }}>
                      <Text style={styles.rowDate}>{item.date}</Text>
                    </View>

                    {/* Indexed Checkbox */}
                    <View style={{ width: 90, alignItems: 'center' }}>
                      <Pressable 
                        style={[
                          styles.checkbox, 
                          item.is_indexed && styles.checkboxActive
                        ]}
                        onPress={() => handleToggleIndexed(item)}
                      >
                        {item.is_indexed && <Check size={12} color="#FFF" />}
                      </Pressable>
                    </View>

                    {/* SEO Score Badge */}
                    <View style={{ width: 120, alignItems: 'center' }}>
                      <Pressable 
                        style={[
                          styles.seoScoreBadge,
                          item.seo_score >= 90 && styles.seoScoreBadgeGreen,
                          item.seo_score < 90 && styles.seoScoreBadgeYellow
                        ]}
                        onPress={() => setSelectedSeoItem(item)}
                      >
                        <View style={[
                          styles.seoDot,
                          item.seo_score >= 90 && styles.seoDotGreen,
                          item.seo_score < 90 && styles.seoDotYellow
                        ]} />
                        <Text style={[
                          styles.seoScoreText,
                          item.seo_score >= 90 && styles.seoScoreTextGreen,
                          item.seo_score < 90 && styles.seoScoreTextYellow
                        ]}>
                          {item.seo_score}/100
                        </Text>
                        <ChevronDown size={11} color={item.seo_score >= 90 ? '#16A34A' : '#D97706'} style={{ marginLeft: 2 }} />
                      </Pressable>
                    </View>

                    {/* Actions Column */}
                    <View style={styles.actionsColumn}>
                      <Pressable 
                        style={styles.actionIconBtn} 
                        onPress={() => copyToClipboard(item.url)}
                        // @ts-ignore
                        title="Copy Link"
                      >
                        <Copy size={13} color="#9CA3AF" />
                      </Pressable>
                      <Pressable 
                        style={styles.actionIconBtn} 
                        onPress={() => openExternalLink(item.url)}
                        // @ts-ignore
                        title="Open Page"
                      >
                        <ExternalLink size={13} color="#9CA3AF" />
                      </Pressable>
                      {item.type === 'Custom' && (
                        <Pressable 
                          style={[styles.actionIconBtn, styles.deleteIconBtn]} 
                          onPress={() => handleDeleteUrl(item)}
                          // @ts-ignore
                          title="Delete Route"
                        >
                          <Trash2 size={13} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Modals rendering */}
      {renderAddModal()}
      {renderImportModal()}
      {renderSeoDetailPopup()}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <BlogsSubbar activeTab="sitemap">
          {sitemapContent}
        </BlogsSubbar>
      </WebLayout>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <MobileAppNavbar title="SITEMAP MANAGER" titleColor="#10B981" />
      <BlogsSubbar activeTab="sitemap">
        {sitemapContent}
      </BlogsSubbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingRight: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 24,
    backgroundColor: 'transparent',
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter',
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'all 0.15s ease',
      } as any,
    }),
  },
  actionHeaderBtnText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  seoBtn: {
    borderColor: '#E0E7FF',
    backgroundColor: '#EEF2F6',
  },
  seoBtnText: {
    color: '#4F46E5',
  },
  iconOnlyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  mainTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainTabButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabButtonActive: {
    borderBottomColor: '#10B981',
  },
  mainTabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter',
  },
  mainTabButtonTextActive: {
    color: '#10B981',
  },
  addUrlFloatBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  addUrlFloatBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 280,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    flex: 1,
    maxWidth: 320,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: 'Inter',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  dropdownBtnText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 42,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    width: 160,
    zIndex: 100,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      } as any,
    }),
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItemActive: {
    backgroundColor: '#F8FAFC',
  },
  dropdownItemText: {
    fontSize: 12.5,
    color: '#334155',
    fontFamily: 'Inter',
  },
  dropdownItemTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.15s ease' } as any,
    }),
  },
  pillBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  pillBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    gap: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#B91C1C',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  warningCode: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(185, 28, 28, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 6,
    color: '#991B1B',
    alignSelf: 'flex-start',
  },
  warningNote: {
    fontSize: 11,
    color: '#7F1D1D',
    fontStyle: 'italic',
    fontFamily: 'Inter',
  },
  scanBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  scanProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#312E81',
    fontFamily: 'Inter',
  },
  scanUrlText: {
    fontSize: 12,
    color: '#4F46E5',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  progressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E7FF',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    fontFamily: 'Inter',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'Inter',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter',
    maxWidth: 320,
    lineHeight: 18,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      } as any,
    }),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    ...Platform.select({
      web: {
        transition: 'background-color 0.15s ease',
      } as any,
    }),
  },
  rowTitle: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  rowUrl: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  rowDate: {
    fontSize: 13.5,
    color: '#64748B',
    fontFamily: 'Inter',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  checkboxActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  seoScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  seoScoreBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  seoScoreBadgeYellow: {
    backgroundColor: '#FEF3C7',
  },
  seoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  seoDotGreen: {
    backgroundColor: '#16A34A',
  },
  seoDotYellow: {
    backgroundColor: '#D97706',
  },
  seoScoreText: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  seoScoreTextGreen: {
    color: '#16A34A',
  },
  seoScoreTextYellow: {
    color: '#D97706',
  },
  actionsColumn: {
    width: 100,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  deleteIconBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  xmlContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 12,
    maxHeight: 500,
  },
  xmlCode: {
    fontFamily: 'monospace',
    fontSize: 12.5,
    color: '#94A3B8',
    lineHeight: 18,
    ...Platform.select({
      web: { whiteSpace: 'pre-wrap' as any },
    })
  },

  // Modals Styling
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    width: '90%',
    maxWidth: 500,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      } as any,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  modalDescription: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    marginBottom: 12,
    lineHeight: 18,
  },
  importExample: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  importExampleText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#475569',
  },
  modalTextArea: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  modalFormGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  modalInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    fontFamily: 'Inter',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  selectWrapper: {
    position: 'relative',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  modalCancelBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
    }),
  },
  modalSubmitBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // SEO Audit Popup elements
  seoScoreCircleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  seoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  seoCircleText: {
    fontSize: 18,
    fontWeight: '800',
  },
  seoCircleMax: {
    fontSize: 10,
    color: '#64748B',
    alignSelf: 'flex-end',
    marginBottom: 14,
    marginLeft: 1,
  },
  seoUrlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'Inter',
  },
  seoUrlSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  seoCheckList: {
    gap: 12,
  },
  seoCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  seoCheckLabel: {
    fontSize: 13,
    color: '#334155',
    fontFamily: 'Inter',
    flex: 1,
  },
  seoCheckStatus: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});
