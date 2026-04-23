import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Info, ShieldCheck, Truck, RotateCcw, AlertCircle } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import MobileAppNavbar from '@/components/MobileAppNavbar';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function ShopTermsScreen() {
  const router = useRouter();

  const sections = [
    {
      title: '1. Product Information',
      icon: <Info size={20} color="#dc8d3c" />,
      content: 'We strive to provide accurate descriptions and high-quality images of our products. However, slight variations in color and appearance may occur due to screen settings or manufacturing batches.'
    },
    {
      title: '2. Shipping & Delivery',
      icon: <Truck size={20} color="#dc8d3c" />,
      content: 'Standard shipping takes 3-7 business days depending on your location. We provide tracking information once the order is dispatched. Free shipping is available on orders above ₹1,000.'
    },
    {
      title: '3. Returns & Refunds',
      icon: <RotateCcw size={20} color="#dc8d3c" />,
      content: 'Products can be returned within 7 days of delivery if they are unused and in original packaging. Refunds are processed within 5-7 business days after the quality check.'
    },
    {
      title: '4. Quality Guarantee',
      icon: <ShieldCheck size={20} color="#dc8d3c" />,
      content: 'All sports gear and equipment sold on our platform are sourced from authorized distributors and carry a manufacturer warranty where applicable.'
    },
    {
      title: '5. Order Cancellation',
      icon: <AlertCircle size={20} color="#dc8d3c" />,
      content: 'Orders can be cancelled before they are shipped. Once dispatched, cancellations are not allowed, but you may initiate a return after delivery.'
    }
  ];

  const content = (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {Platform.OS !== 'web' && (
        <MobileAppNavbar 
          title="Terms & Conditions" 
          titleColor="#FFFFFF"
          bgColor="#dc8d3c"
        />
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.subtitle}>Please read these terms carefully before placing an order.</Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              {section.icon}
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: April 23, 2026</Text>
          <Text style={styles.footerText}>For any queries, contact our support team at support@bookyourground.com</Text>
        </View>

        {Platform.OS === 'web' && <SiteFooter />}
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2b2f4b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2b2f4b',
  },
  sectionContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    paddingLeft: 32,
  },
  footer: {
    marginTop: 24,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
  },
});
