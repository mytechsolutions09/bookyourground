import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Quote, Star } from 'lucide-react-native';

const ownerTestimonials = [
  {
    name: 'Rahul S.',
    role: 'Turf Owner',
    quote: "Book Your Ground transformed how we manage our turf. We've seen a 40% increase in bookings and no more double-booking nightmares!",
    rating: 5,
  },
  {
    name: 'Vikram M.',
    role: 'Cricket Ground Manager',
    quote: 'The payment tracking and automated scheduling have saved me countless hours every week. It\'s the ultimate tool for any sports facility owner.',
    rating: 5,
  },
  {
    name: 'Priya K.',
    role: 'Sports Complex Director',
    quote: 'Partnering with Book Your Ground was the best decision for our arena. We now have a steady stream of players and complete visibility into our business.',
    rating: 5,
  },
];

const userTestimonials = [
  {
    name: 'Amit P.',
    role: 'Regular Player',
    quote: "Booking a cricket turf has never been this easy. We use the platform every single weekend without any hassle!",
    rating: 5,
  },
  {
    name: 'Rohan D.',
    role: 'Team Captain',
    quote: "The instant booking confirmation saves us so much time. We can just focus on our game and let the app handle the rest.",
    rating: 5,
  },
  {
    name: 'Sneha K.',
    role: 'Football Enthusiast',
    quote: "The ability to find opposition teams is a complete game changer for our weekend matches. Highly recommended!",
    rating: 5,
  },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export default function OwnerTestimonials() {
  const [activeTab, setActiveTab] = useState<'users' | 'owners'>('users');

  const testimonials = activeTab === 'owners' ? ownerTestimonials : userTestimonials;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Testimonials</Text>
        <Text style={styles.title}>Trusted by Everyone</Text>
        <Text style={styles.subtitle}>
          See what our community has to say about their experience
        </Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'users' && styles.activeTabButton]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>For Players</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'owners' && styles.activeTabButton]}
            onPress={() => setActiveTab('owners')}
          >
            <Text style={[styles.tabText, activeTab === 'owners' && styles.activeTabText]}>For Ground Owners</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {testimonials.map((item, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.quoteIconContainer}>
                <Quote size={28} color="#10B981" strokeWidth={2} style={styles.quoteIcon} />
              </View>
              
              <View style={styles.starsContainer}>
                {[...Array(item.rating)].map((_, i) => (
                  <Star key={i} size={18} color="#F59E0B" fill="#F59E0B" />
                ))}
              </View>

              <Text style={styles.quoteText}>"{item.quote}"</Text>

              <View style={styles.authorContainer}>
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>
                <View>
                  <Text style={styles.authorName}>{item.name}</Text>
                  <Text style={styles.authorRole}>{item.role}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: Platform.OS === 'web' ? 80 : 60,
    paddingHorizontal: 24,
  },
  content: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: '800',
    fontFamily: 'Inter',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
    maxWidth: 600,
    alignSelf: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 30,
    alignSelf: 'center',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F172A',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    width: Platform.OS === 'web' ? 360 : '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    position: 'relative',
  },
  quoteIconContainer: {
    marginBottom: 20,
    opacity: 0.2,
  },
  quoteIcon: {
    transform: [{ scaleX: -1 }],
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#334155',
    lineHeight: 26,
    fontStyle: 'italic',
    marginBottom: 24,
    flex: 1,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 20,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DEF7EC', // Light green background to match the theme
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#047857', // Darker green text
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
    color: '#0F172A',
    marginBottom: 4,
  },
  authorRole: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#64748B',
  },
});
