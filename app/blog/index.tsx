import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router, Stack } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import { ChevronRight, Calendar, User, Clock } from 'lucide-react-native';

const ARTICLES = [
  {
    id: 'mvp-calculation',
    title: 'How Most Valuable Player (MVP) is Calculated?',
    excerpt: 'Ever wondered how we decide who the Player of the Match is? Dive into our advanced scoring algorithm that evaluates batting, bowling, and fielding.',
    date: 'April 13, 2026',
    author: 'Admin',
    readTime: '5 min read',
    image: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg'
  }
];

export default function BlogIndex() {
  return (
    <WebLayout>
      <Stack.Screen options={{ title: 'Blog - Book my ground' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
           <Text style={styles.title}>Cricket Blog</Text>
           <Text style={styles.subtitle}>Insights, strategies, and platform updates from the world of cricket.</Text>
        </View>

        <View style={styles.list}>
           {ARTICLES.map(article => (
             <TouchableOpacity 
               key={article.id} 
               style={styles.card}
               onPress={() => router.push(`/blog/${article.id}` as any)}
             >
                <Image source={{ uri: article.image }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                   <View style={styles.meta}>
                      <View style={styles.metaItem}><Calendar size={14} color="#9CA3AF" /><Text style={styles.metaText}>{article.date}</Text></View>
                      <View style={styles.metaItem}><Clock size={14} color="#9CA3AF" /><Text style={styles.metaText}>{article.readTime}</Text></View>
                   </View>
                   <Text style={styles.cardTitle}>{article.title}</Text>
                   <Text style={styles.cardExcerpt}>{article.excerpt}</Text>
                   <View style={styles.footer}>
                      <View style={styles.authorRow}><User size={16} color="#0D9488" /><Text style={styles.authorName}>{article.author}</Text></View>
                      <Text style={styles.readMore}>Read Article <ChevronRight size={16} color="#0D9488" /></Text>
                   </View>
                </View>
             </TouchableOpacity>
           ))}
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
