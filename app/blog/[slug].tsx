import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import { ChevronLeft } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { supabase } from '@/lib/supabase';
import Head from 'expo-router/head';

interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  read_time: string;
  image_url: string;
  created_at: string;
}

export default function DynamicBlogPage() {
  const { slug } = useLocalSearchParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBlog() {
      if (!slug) return;
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
        
      if (!error && data) {
        setBlog(data);
      }
      setLoading(false);
    }
    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <WebLayout>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      </WebLayout>
    );
  }

  if (!blog) {
    return (
      <WebLayout>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 18, color: '#6B7280' }}>Blog post not found.</Text>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.push('/blog' as any)}>
            <Text style={{ color: '#0D9488', fontWeight: '600' }}>Return to Blogs</Text>
          </TouchableOpacity>
        </View>
      </WebLayout>
    );
  }

  return (
    <>
      <Head>
        <title>{blog.title} | BookYourGround</title>
        <meta name="description" content={blog.excerpt} />
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={blog.excerpt} />
        {blog.image_url && <meta property="og:image" content={blog.image_url} />}
      </Head>
      <WebLayout>
        <Stack.Screen options={{ title: blog.title }} />
        <ScrollView style={styles.container}>
          <View style={styles.hero}>
             <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/blog' as any)}>
                <ChevronLeft size={20} color="#6B7280" />
                <Text style={styles.backText}>Back to Blog</Text>
             </TouchableOpacity>
             <Text style={styles.category}>ARTICLE</Text>
             <Text style={styles.title}>{blog.title}</Text>
             <View style={styles.meta}>
                <Text style={styles.metaItem}>{new Date(blog.created_at).toLocaleDateString()}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.metaItem}>{blog.read_time}</Text>
             </View>
          </View>

          {blog.image_url ? (
            <Image 
              source={{ uri: blog.image_url }} 
              style={styles.heroImage} 
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.content}>
            <Markdown style={markdownStyles}>
              {blog.content || ''}
            </Markdown>
          </View>

          <View style={styles.footer}>
             <Text style={styles.footerText}>Ready for your next match?</Text>
             <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/cricket' as any)}>
                <Text style={styles.ctaText}>Book a Ground Now</Text>
             </TouchableOpacity>
          </View>
        </ScrollView>
      </WebLayout>
    </>
  );
}

const markdownStyles = {
  body: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 28,
  },
  heading1: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 24,
    marginBottom: 16,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 16,
  },
  strong: {
    fontWeight: '700',
    color: '#111827',
  },
  list_item: {
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 24,
    marginTop: 12,
  },
  tr: {
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
  },
  th: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F9FAFB',
    fontWeight: '700',
    color: '#111827',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  td: {
    flex: 1,
    padding: 12,
    color: '#4B5563',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: { padding: 40, alignItems: 'center', backgroundColor: '#F9FAF7' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 32 },
  backText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  category: { fontSize: 12, fontWeight: '800', color: '#0D9488', letterSpacing: 1.2, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: '900', color: '#111827', textAlign: 'center', lineHeight: 44, maxWidth: 800 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  metaItem: { fontSize: 13, color: '#6B7280' },
  dot: { marginHorizontal: 8, color: '#E5E7EB' },
  heroImage: { width: '100%', height: 400 },
  content: { padding: 40, maxWidth: 800, alignSelf: 'center', width: '100%' },
  footer: { padding: 60, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  ctaBtn: { backgroundColor: '#0D9488', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
