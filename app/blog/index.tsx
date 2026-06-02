import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router, Stack } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import { ChevronRight, Calendar, User, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import Head from 'expo-router/head';

interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  read_time: string;
  image_url: string;
  created_at: string;
}

export default function BlogIndex() {
  const [articles, setArticles] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    async function fetchBlogs() {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setArticles(data);
      }
      setLoading(false);
    }
    fetchBlogs();
  }, []);

  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "BookYourGround Sports & Venue Blog",
    "description": "Insights, expert strategies, and updates for sports grounds, venue bookings, and multi-sports play.",
    "url": "https://bookyourground.com/blog",
    "publisher": {
      "@type": "Organization",
      "name": "BookYourGround",
      "logo": {
        "@type": "ImageObject",
        "url": "https://bookyourground.com/logo.png"
      }
    },
    "blogPost": articles.map(article => ({
      "@type": "BlogPosting",
      "headline": article.title,
      "url": `https://bookyourground.com/blog/${article.slug}`,
      "datePublished": article.created_at,
      "description": article.excerpt,
      "author": {
        "@type": "Person",
        "name": article.author
      }
    }))
  };

  return (
    <>
      <Head>
        <title>Sports & Venue Blog - Tips, Strategies & Ground Booking Updates | BookYourGround</title>
        <meta name="description" content="Read the latest sports tips, venue guides, ground booking strategies, and multi-sport play insights on the BookYourGround blog." />
        <meta name="keywords" content="sports blog, venue booking, book sports ground, football turf booking, box cricket ground, sports strategies, sports pitch booking, bookyourground" />
        <link rel="canonical" href="https://bookyourground.com/blog" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bookyourground.com/blog" />
        <meta property="og:title" content="Sports & Venue Blog - Tips, Strategies & Ground Booking Updates | BookYourGround" />
        <meta property="og:description" content="Read the latest sports tips, venue guides, ground booking strategies, and multi-sport play insights on the BookYourGround blog." />
        <meta property="og:image" content="https://bookyourground.com/assets/images/ground-booking-for-sports.png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://bookyourground.com/blog" />
        <meta property="twitter:title" content="Sports & Venue Blog - Tips, Strategies & Ground Booking Updates | BookYourGround" />
        <meta property="twitter:description" content="Read the latest sports tips, venue guides, ground booking strategies, and multi-sport play insights on the BookYourGround blog." />
        <meta property="twitter:image" content="https://bookyourground.com/assets/images/ground-booking-for-sports.png" />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        />
      </Head>
      <WebLayout>
        <Stack.Screen options={{ title: 'Blog - Book Your Ground' }} />
        <ScrollView style={styles.container}>
          <View style={[styles.header, { padding: isMobile ? 24 : 40 }]}>
             <Text accessibilityRole="header" aria-level={1} style={[styles.title, isMobile && { fontSize: 24, textAlign: 'center' }]}>Sports & Venue Blog</Text>
             <Text style={styles.subtitle}>Insights, expert strategies, and platform updates from the world of multi-sports and venue bookings.</Text>
          </View>

        <View style={[styles.list, { padding: isMobile ? 16 : 40 }]}>
           {loading ? (
             <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
           ) : articles.length === 0 ? (
             <Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>No articles published yet.</Text>
           ) : (
             articles.map(article => (
               <TouchableOpacity 
                 key={article.id} 
                 style={[styles.card, isMobile && styles.cardMobile]}
                 onPress={() => router.push(`/blog/${article.slug}` as any)}
               >
                  <Image 
                    source={{ uri: article.image_url || 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} 
                    style={[styles.cardImage, isMobile && styles.cardImageMobile]} 
                    resizeMode="cover"
                    alt={article.title}
                    accessibilityLabel={article.title}
                  />
                  <View style={styles.cardContent}>
                     <View style={styles.meta}>
                        <View style={styles.metaItem}><Calendar size={14} color="#9CA3AF" /><Text style={styles.metaText}>{new Date(article.created_at).toLocaleDateString()}</Text></View>
                        <View style={styles.metaItem}><Clock size={14} color="#9CA3AF" /><Text style={styles.metaText}>{article.read_time}</Text></View>
                     </View>
                     <Text style={styles.cardTitle}>{article.title}</Text>
                     <Text style={styles.cardExcerpt}>{article.excerpt}</Text>
                     <View style={styles.footer}>
                        <View style={styles.authorRow}><User size={16} color="#0D9488" /><Text style={styles.authorName}>{article.author}</Text></View>
                        <Text style={styles.readMore}>Read Article <ChevronRight size={16} color="#0D9488" /></Text>
                     </View>
                  </View>
               </TouchableOpacity>
             ))
           )}
        </View>
      </ScrollView>
    </WebLayout>
  </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 40, backgroundColor: '#F9FAF7', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#4B5563', textAlign: 'center', maxWidth: 600 },
  list: { padding: 40, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 32, flexDirection: 'row' },
  cardMobile: { flexDirection: 'column' },
  cardImage: { width: 300, height: '100%' },
  cardImageMobile: { width: '100%', height: 200, aspectRatio: 16 / 9 },
  cardContent: { flex: 1, padding: 24 },
  meta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#9CA3AF' },
  cardTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  cardExcerpt: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  readMore: { fontSize: 13, fontWeight: '700', color: '#0D9488' },
});
