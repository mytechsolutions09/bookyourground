import React from 'react';
import { View, Text, ScrollView, Platform, StyleSheet, Image } from 'react-native';
import WebLayout from '@/components/web/WebLayout';
import SiteFooter from '@/components/web/SiteFooter';

export default function AboutScreen() {
  const content = (
    <View style={styles.page}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>About Us</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.paragraph}>
              At Book my ground, our mission is to make sports accessible to everyone. 
              We bridge the gap between sports enthusiasts and ground owners by providing a 
              seamless, technology-driven booking platform. Whether it's a late-night cricket match 
              with friends or a corporate tournament, we ensure that finding and booking the perfect 
              venue is just a few clicks away.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What We Offer</Text>
            <Text style={styles.paragraph}>
              We provide an integrated ecosystem for both players and ground owners:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Real-time availability of cricket grounds and box turfs.</Text>
              <Text style={styles.bulletItem}>• Secure online payments and instant booking confirmations.</Text>
              <Text style={styles.bulletItem}>• Advanced management tools for ground owners to track bookings and revenue.</Text>
              <Text style={styles.bulletItem}>• Matchmaking features to help players find opponents and join matches.</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Story</Text>
            <Text style={styles.paragraph}>
              Founded in 2026, Book my ground started with a simple problem: the difficulty of 
              finding locally available turfs without making dozens of phone calls. Today, we are 
              growing into a community of thousands of players and hundreds of partner venues, 
              striving to digitize the local sports infrastructure.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            <Text style={styles.paragraph}>
              Book my ground is a registered platform dedicated to sports infrastructure management. 
              We operate with transparency, integrity, and a passion for the game.
            </Text>
          </View>
        </View>

        <SiteFooter />
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return <WebLayout>{content}</WebLayout>;
  }

  return content;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 32 : 64,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#043529',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
  },
  bulletList: {
    marginTop: 10,
    paddingLeft: 8,
  },
  bulletItem: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 6,
  },
});
