import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { router, Stack } from 'expo-router';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';
import Button from '@/components/ui/Button';

export default function NotFoundScreen() {
  const content = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>
          The page you’re looking for doesn’t exist or the link may be incorrect.
        </Text>
        <Button
          title="Back to home"
          onPress={() => router.replace('/')}
          fullWidth
          size="large"
          style={styles.button}
        />
        <Button
          title="Browse grounds"
          onPress={() => router.replace('/book-my-ground' as any)}
          variant="outline"
          fullWidth
          size="large"
          style={styles.buttonSecondary}
        />
      </View>
      {Platform.OS === 'web' ? <SiteFooter /> : null}
    </ScrollView>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <View style={styles.nativeRoot}>{content}</View>
    </>
  );
}

const styles = StyleSheet.create({
  nativeRoot: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 48,
    paddingBottom: 32,
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? undefined : '100%',
  },
  card: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  code: {
    fontSize: 48,
    fontWeight: '800',
    color: '#dc8d3c',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    marginBottom: 24,
  },
  button: {
    marginBottom: 10,
  },
  buttonSecondary: {
    marginBottom: 0,
  },
});
