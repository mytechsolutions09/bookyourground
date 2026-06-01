import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, Platform, Switch } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Save, ArrowLeft, Image as ImageIcon, Wand2, Upload, Bold } from 'lucide-react-native';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as ImagePicker from 'expo-image-picker';
import WebLayout from '@/components/web/WebLayout';
import SettingsSubbar from '@/components/admin/SettingsSubbar';
import { useAuth } from '@/contexts/AuthContext';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export default function AdminBlogEdit() {
  const { id } = useLocalSearchParams();
  const isNew = id === 'new';
  const { user } = useAuth();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentForm, setContentForm] = useState('');
  const [author, setAuthor] = useState('Admin');
  const [readTime, setReadTime] = useState('5 min read');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  useEffect(() => {
    if (!isNew) {
      fetchBlog();
    }
  }, [id]);

  const fetchBlog = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt || '');
        setContentForm(data.content || '');
        setAuthor(data.author || 'Admin');
        setReadTime(data.read_time || '5 min read');
        setImageUrl(data.image_url || '');
        setIsPublished(data.is_published || false);
      }
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !slug || !contentForm) {
      const msg = 'Title, Slug, and Content are required';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title,
        slug,
        excerpt,
        content: contentForm,
        author,
        read_time: readTime,
        image_url: imageUrl,
        is_published: isPublished
      };

      let error;
      if (isNew) {
        const { error: insertError } = await supabase.from('blogs').insert([payload]);
        error = insertError;
      } else {
        const { error: updateError } = await supabase.from('blogs').update(payload).eq('id', id);
        error = updateError;
      }

      if (error) throw error;
      
      router.back();
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert(err.message);
      else Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFormatBold = () => {
    const { start, end } = selection;
    if (start === end) {
      const before = contentForm.substring(0, start);
      const after = contentForm.substring(start);
      setContentForm(`${before}**bold text**${after}`);
    } else {
      const before = contentForm.substring(0, start);
      let selected = contentForm.substring(start, end);
      const after = contentForm.substring(end);
      
      // Markdown requires ** to touch the text without spaces
      const leadingSpace = selected.match(/^\s*/)?.[0] || '';
      const trailingSpace = selected.match(/\s*$/)?.[0] || '';
      selected = selected.trim();
      
      setContentForm(`${before}${leadingSpace}**${selected}**${trailingSpace}${after}`);
    }
  };

  const generateWithAI = async () => {
    if (!API_KEY) {
      const msg = 'EXPO_PUBLIC_GEMINI_API_KEY is not configured';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }
    
    if (!aiTopic) {
      const msg = 'Please enter a topic for the AI to write about.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    try {
      setGenerating(true);
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are an expert SEO content writer for a platform called BookYourGround, a website that helps people book sports grounds online (cricket, football, box cricket, etc.).
      
Write a highly engaging, SEO-optimized blog post about the following topic: "${aiTopic}".

Please provide the output in strict JSON format with the following keys exactly:
- title: A catchy, SEO-friendly title
- slug: A URL-friendly slug based on the title (e.g. how-to-book-a-cricket-ground)
- excerpt: A short 1-2 sentence meta description/excerpt
- content: The full body of the blog post written in GitHub Flavored Markdown format. Make it engaging, structured with headings (##), bullet points, and actionable advice.
- read_time: Estimated read time (e.g. "4 min read")
- image_search_query: A short 2-3 word search query to find a good stock image on Unsplash for this post.

Ensure the output is ONLY raw JSON. Do not wrap in markdown code blocks (\`\`\`json). Just the raw JSON string.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);

      if (parsed.title) setTitle(parsed.title);
      if (parsed.slug) setSlug(parsed.slug);
      if (parsed.excerpt) setExcerpt(parsed.excerpt);
      if (parsed.content) setContentForm(parsed.content);
      if (parsed.read_time) setReadTime(parsed.read_time);
      // We can use Unsplash source URL based on the search query
      if (parsed.image_search_query) {
        setImageUrl(`https://source.unsplash.com/1200x800/?${encodeURIComponent(parsed.image_search_query)}`);
      }

    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert('AI Generation failed: ' + err.message);
      else Alert.alert('Error', 'AI Generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setLoading(true);
        
        let fileExt = 'jpeg';
        let fileName = `${Date.now()}.${fileExt}`;
        
        if (Platform.OS === 'web') {
          // Web environment upload
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(`${user?.id}/blogs/${fileName}`, blob);
          
          if (uploadError) throw uploadError;
        } else {
          // Native environment upload using base64 or fetch
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(`${user?.id}/blogs/${fileName}`, blob);
            
          if (uploadError) throw uploadError;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(`${user?.id}/blogs/${fileName}`);
        setImageUrl(data.publicUrl);
      }
    } catch (err: any) {
      console.error(err);
      if (Platform.OS === 'web') alert('Image upload failed: ' + err.message);
      else Alert.alert('Error', 'Image upload failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    const loader = (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
    if (Platform.OS === 'web') {
      return (
        <WebLayout noCard>
          <SettingsSubbar>
            {loader}
          </SettingsSubbar>
        </WebLayout>
      );
    }
    return (
      <SettingsSubbar>
        <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
          {loader}
        </View>
      </SettingsSubbar>
    );
  }

  const content = (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isNew ? 'Create Blog' : 'Edit Blog' }} />
      
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color="#6B7280" />
          </Pressable>
          <Text style={styles.title}>{isNew ? 'New Blog Post' : 'Edit Blog Post'}</Text>
        </View>
        <Pressable 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Save size={20} color="#FFFFFF" />}
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Gemini AI Generator Section */}
        <View style={styles.aiSection}>
          <View style={styles.aiHeader}>
            <Wand2 size={20} color="#8B5CF6" />
            <Text style={styles.aiTitle}>Generate with Gemini AI</Text>
          </View>
          <Text style={styles.aiDesc}>Enter a topic and let AI draft an SEO-optimized blog post, title, slug, and suggest an image for you.</Text>
          <View style={styles.aiInputRow}>
            <TextInput 
              style={styles.aiInput}
              placeholder="e.g. Top 5 Cricket Grounds in Hyderabad"
              placeholderTextColor="#9CA3AF"
              value={aiTopic}
              onChangeText={setAiTopic}
            />
            <Pressable 
              style={[styles.aiBtn, generating && { opacity: 0.7 }]}
              onPress={generateWithAI}
              disabled={generating}
            >
              {generating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.aiBtnText}>Generate</Text>}
            </Pressable>
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={(val) => {
                setTitle(val);
                if (isNew && !slug) {
                  setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                }
              }}
              placeholder="Post title"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Slug</Text>
            <TextInput
              style={styles.input}
              value={slug}
              onChangeText={setSlug}
              placeholder="url-friendly-slug"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Excerpt</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={excerpt}
            onChangeText={setExcerpt}
            placeholder="Short description for SEO and previews"
            multiline
          />
        </View>

        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Content (Markdown)</Text>
            <View style={styles.toolbar}>
              <Pressable style={styles.toolbarBtn} onPress={handleFormatBold}>
                <Bold size={16} color="#4B5563" />
              </Pressable>
            </View>
          </View>
          <TextInput
            style={[styles.input, { height: 300, textAlignVertical: 'top', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}
            value={contentForm}
            onChangeText={setContentForm}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder="Write your content here using markdown..."
            multiline
          />
        </View>

        <View style={styles.formRow}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Author</Text>
            <TextInput
              style={styles.input}
              value={author}
              onChangeText={setAuthor}
              placeholder="e.g. Admin"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Read Time</Text>
            <TextInput
              style={styles.input}
              value={readTime}
              onChangeText={setReadTime}
              placeholder="e.g. 5 min read"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Image URL</Text>
          <View style={styles.imageInputRow}>
            <View style={styles.imageInputWrapper}>
              <ImageIcon size={20} color="#9CA3AF" style={styles.imageIcon} />
              <TextInput
                style={[styles.input, { paddingLeft: 40, flex: 1 }]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://..."
              />
            </View>
            <Pressable style={styles.uploadBtn} onPress={pickImage}>
              <Upload size={18} color="#4B5563" />
              <Text style={styles.uploadBtnText}>Upload</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.publishRow}>
          <View>
            <Text style={styles.label}>Publish Status</Text>
            <Text style={styles.helperText}>Published posts are visible to the public</Text>
          </View>
          <Switch 
            value={isPublished}
            onValueChange={setIsPublished}
            trackColor={{ false: '#D1D5DB', true: '#10b981' }}
          />
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <WebLayout noCard>
        <SettingsSubbar>
          {content}
        </SettingsSubbar>
      </WebLayout>
    );
  }

  return (
    <SettingsSubbar>
      <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
        {content}
      </View>
    </SettingsSubbar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  content: { padding: 24, maxWidth: 900, alignSelf: 'center', width: '100%' },
  
  aiSection: { backgroundColor: '#F3E8FF', padding: 24, borderRadius: 12, marginBottom: 32, borderWidth: 1, borderColor: '#E9D5FF' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiTitle: { fontSize: 18, fontWeight: '700', color: '#6B21A8' },
  aiDesc: { fontSize: 14, color: '#7E22CE', marginBottom: 16 },
  aiInputRow: { flexDirection: 'row', gap: 12 },
  aiInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8B4FE', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#4C1D95' },
  aiBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  aiBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  
  formRow: { flexDirection: 'row', gap: 24 },
  formGroup: { flex: 1, marginBottom: 24 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  toolbarBtn: { padding: 4, borderRadius: 4, backgroundColor: '#F3F4F6' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#111827' },
  
  imageInputRow: { flexDirection: 'row', gap: 12 },
  imageInputWrapper: { flex: 1, position: 'relative', justifyContent: 'center' },
  imageIcon: { position: 'absolute', left: 12, zIndex: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, gap: 8, borderWidth: 1, borderColor: '#D1D5DB' },
  uploadBtnText: { color: '#4B5563', fontWeight: '600', fontSize: 14 },
  
  publishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 12 },
  helperText: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});
