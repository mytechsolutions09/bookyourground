import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ArrowLeft, Send } from 'lucide-react-native';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export default function SkillChatScreen() {
  const { skill } = useLocalSearchParams<{ skill: string }>();
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function fetchSkill() {
      setIsLoadingPrompt(true);
      try {
        const res = await fetch(`https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/skills/${skill}/SKILL.md`);
        if (!res.ok) throw new Error('Failed to fetch skill instructions');
        const text = await res.text();
        setSystemPrompt(text);
      } catch (e) {
        console.error(e);
        setSystemPrompt('Error loading skill instructions.');
      } finally {
        setIsLoadingPrompt(false);
      }
    }
    if (skill) {
      fetchSkill();
    }
  }, [skill]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsGenerating(true);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-pro',
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        })),
      });

      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();
      
      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: `Error: ${error?.message || 'Could not generate a response. Check your API key and connection.'}` }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text style={styles.title}>{skill ? String(skill).replace(/-/g, ' ') : 'Skill'}</Text>
      </View>

      {isLoadingPrompt ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading {skill} instructions from GitHub...</Text>
        </View>
      ) : (
        <>
          <ScrollView 
            style={styles.chatArea} 
            contentContainerStyle={styles.chatContent}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  I am initialized with the "{skill}" marketing instructions. 
                  Describe your goal or ask a question!
                </Text>
              </View>
            )}
            
            {messages.map((msg, i) => (
              <View key={i} style={[styles.bubbleWrapper, msg.role === 'user' ? styles.bubbleUser : styles.bubbleModel]}>
                <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUserInner : styles.bubbleModelInner]}>
                  <Text style={[styles.messageText, msg.role === 'user' ? styles.textUser : styles.textModel]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}
            
            {isGenerating && (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#6B7280" />
              </View>
            )}
          </ScrollView>

          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="Type your request here..."
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <Pressable 
              style={[styles.sendBtn, (!input.trim() || isGenerating) && styles.sendBtnDisabled]} 
              onPress={handleSend}
              disabled={!input.trim() || isGenerating}
            >
              <Send size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleWrapper: {
    width: '100%',
    flexDirection: 'row',
  },
  bubbleUser: {
    justifyContent: 'flex-end',
  },
  bubbleModel: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: Platform.OS === 'web' ? '70%' : '85%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleUserInner: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: 4,
  },
  bubbleModelInner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: '#FFFFFF',
  },
  textModel: {
    color: '#111827',
  },
  loadingBubble: {
    alignSelf: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: '#111827',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
});
