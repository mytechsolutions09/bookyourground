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

  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blog.title,
    "description": blog.excerpt,
    "image": blog.image_url ? [blog.image_url] : ["https://bookyourground.com/assets/images/ground-booking-for-cricket.png"],
    "datePublished": blog.created_at,
    "dateModified": blog.created_at,
    "author": [{
      "@type": "Person",
      "name": blog.author
    }],
    "publisher": {
      "@type": "Organization",
      "name": "BookYourGround",
      "logo": {
        "@type": "ImageObject",
        "url": "https://bookyourground.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://bookyourground.com/blog/${blog.slug}`
    }
  };

  return (
    <>
      <Head>
        <title>{blog.title} | BookYourGround</title>
        <meta name="description" content={blog.excerpt} />
        <meta name="keywords" content={`cricket, ${blog.title.toLowerCase().split(' ').join(', ')}, bookyourground`} />
        <link rel="canonical" href={`https://bookyourground.com/blog/${blog.slug}`} />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://bookyourground.com/blog/${blog.slug}`} />
        <meta property="og:title" content={`${blog.title} | BookYourGround`} />
        <meta property="og:description" content={blog.excerpt} />
        <meta property="og:image" content={blog.image_url || "https://bookyourground.com/assets/images/ground-booking-for-cricket.png"} />
        <meta property="article:published_time" content={blog.created_at} />
        <meta property="article:author" content={blog.author} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://bookyourground.com/blog/${blog.slug}`} />
        <meta property="twitter:title" content={`${blog.title} | BookYourGround`} />
        <meta property="twitter:description" content={blog.excerpt} />
        <meta property="twitter:image" content={blog.image_url || "https://bookyourground.com/assets/images/ground-booking-for-cricket.png"} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        />
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
             <Text accessibilityRole="header" aria-level={1} style={styles.title}>{blog.title}</Text>
             <View style={styles.meta}>
                <Text style={styles.metaItem}>{new Date(blog.created_at).toLocaleDateString()}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.metaItem}>{blog.read_time}</Text>
             </View>
          </View>

          <View style={styles.content}>
            {blog.image_url ? (
              <Image 
                source={{ uri: blog.image_url }} 
                style={styles.articleImage} 
                resizeMode="cover"
                alt={blog.title}
                accessibilityLabel={blog.title}
              />
            ) : null}

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
  title: { fontSize: 36, fontWeight: '900', color: '#111827', textAlign: 'center', lineHeight: 44, maxWidth: 1000 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  metaItem: { fontSize: 13, color: '#6B7280' },
  dot: { marginHorizontal: 8, color: '#E5E7EB' },
  articleImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 32, backgroundColor: 'transparent' },
  content: { padding: 40, maxWidth: 1000, alignSelf: 'center', width: '100%' },
  footer: { padding: 60, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  footerText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  ctaBtn: { backgroundColor: '#0D9488', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
