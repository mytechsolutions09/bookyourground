import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import { ChevronRight, Calendar, User, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

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

  return (
    <WebLayout>
      <Stack.Screen options={{ title: 'Blog - Book Your Ground' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
           <Text style={styles.title}>Cricket Blog</Text>
           <Text style={styles.subtitle}>Insights, strategies, and platform updates from the world of cricket.</Text>
        </View>

        <View style={styles.list}>
           {loading ? (
             <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />
           ) : articles.length === 0 ? (
             <Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>No articles published yet.</Text>
           ) : (
             articles.map(article => (
               <TouchableOpacity 
                 key={article.id} 
                 style={styles.card}
                 onPress={() => router.push(`/blog/${article.slug}` as any)}
               >
                  <Image 
                    source={{ uri: article.image_url || 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg' }} 
                    style={styles.cardImage} 
                    resizeMode="cover"
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 40, backgroundColor: '#F9FAF7', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#4B5563', textAlign: 'center', maxWidth: 600 },
  list: { padding: 40, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 32, flexDirection: 'row' },
  cardImage: { width: 300, height: '100%' },
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
