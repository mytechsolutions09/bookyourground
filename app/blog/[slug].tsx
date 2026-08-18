import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import { ChevronLeft } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import { supabase } from '@/lib/supabase';
import Head from 'expo-router/head';
import BlogComments from '@/components/blog/BlogComments';

const isHtmlContent = (content?: string): boolean => {
  if (!content) return false;
  const clean = content.replace(/^\ufeff/g, '').trim(); // Remove BOM and trim whitespace
  return clean.startsWith('<') || clean.includes('<p>') || clean.includes('<h2>') || clean.includes('<!--');
};

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

function getCachedBlog(slugParam: string | string[] | undefined): Blog | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const cachePath = path.join(process.cwd(), 'tmp', 'blogs-cache.json');
    if (!fs.existsSync(cachePath)) return null;

    const blogsList = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const slugStr = Array.isArray(slugParam) ? slugParam[0] : slugParam;
    if (!slugStr) return null;

    const match = blogsList.find((b: any) => b.is_published && b.slug === slugStr);
    return match || null;
  } catch (err) {
    console.error('Error reading blogs cache:', err);
    return null;
  }
}

export async function generateStaticParams(): Promise<Record<string, string>[]> {
  try {
    if (typeof window === 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const cachePath = path.join(process.cwd(), 'tmp', 'blogs-cache.json');
        if (fs.existsSync(cachePath)) {
          const blogsList = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          if (Array.isArray(blogsList) && blogsList.length > 0) {
            return blogsList.filter((b: any) => b.slug).map((blog: any) => ({ slug: blog.slug }));
          }
        }
      } catch (_) {}
    }

    const { data, error } = await supabase
      .from('blogs')
      .select('slug')
      .eq('is_published', true);

    if (error) {
      console.error('Error fetching blogs for static params:', error);
      return [];
    }

    return (data || []).map((blog) => ({
      slug: blog.slug,
    }));
  } catch (err) {
    console.error('Error generating static params for blog:', err);
    return [];
  }
}

export default function DynamicBlogPage() {
  const { slug } = useLocalSearchParams();
  const cachedBlog = React.useMemo(() => getCachedBlog(slug), [slug]);
  const [blog, setBlog] = useState<Blog | null>(cachedBlog);
  const [loading, setLoading] = useState<boolean>(!cachedBlog);

  useEffect(() => {
    async function fetchBlog() {
      if (!slug) return;
      const slugStr = Array.isArray(slug) ? slug[0] : slug;
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slugStr)
        .eq('is_published', true)
        .maybeSingle();
        
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

        <script type="application/ld+json">{JSON.stringify(schemaMarkup)}</script>
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

            {isHtmlContent(blog.content) && Platform.OS === 'web' ? (
              <>
                <style dangerouslySetInnerHTML={{ __html: `
                  .html-blog-content p { margin-bottom: 16px; font-size: 16px; color: #4B5563; line-height: 28px; }
                  .html-blog-content h1 { font-size: 28px; font-weight: 800; color: #111827; margin-top: 24px; margin-bottom: 16px; }
                  .html-blog-content h2 { font-size: 24px; font-weight: 700; color: #111827; margin-top: 20px; margin-bottom: 12px; }
                  .html-blog-content h3 { font-size: 20px; font-weight: 600; color: #111827; margin-top: 16px; margin-bottom: 8px; }
                  .html-blog-content strong { font-weight: 700; color: #111827; }
                  .html-blog-content ul { margin-bottom: 16px; padding-left: 20px; }
                  .html-blog-content li { margin-bottom: 8px; font-size: 16px; color: #4B5563; }
                  .html-blog-content a { color: #0D9488; text-decoration: underline; }
                  .html-blog-content table { border-collapse: collapse; width: 100%; border: 1px solid #E5E7EB; border-radius: 8px; margin-bottom: 24px; margin-top: 12px; }
                  .html-blog-content th { background-color: #F9FAFB; font-weight: 700; color: #111827; border-right: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 12px; text-align: left; }
                  .html-blog-content td { color: #4B5563; border-right: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 12px; }
                `}} />
                <div 
                  dangerouslySetInnerHTML={{ __html: blog.content }} 
                  className="html-blog-content"
                />
              </>
            ) : (
              <Markdown style={markdownStyles}>
                {blog.content || ''}
              </Markdown>
            )}

            <BlogComments blogId={blog.id} blogAuthor={blog.author} />
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
