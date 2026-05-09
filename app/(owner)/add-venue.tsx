import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LandPlot, PlusCircle } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';

export default function AddVenuePage() {
  return (
    <WebLayout hideHeader={true}>
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Venue</Text>
        <Text style={styles.subtitle}>Choose the type of venue you want to list</Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Add Ground Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(owner)/add-ground')}
        >
          <View style={[styles.iconContainer, styles.groundIconBg]}>
            <LandPlot size={32} color="#00ea6b" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Add a Ground</Text>
            <Text style={styles.cardDescription}>
              List a full-size cricket ground or box cricket venue with hourly slots.
            </Text>
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Add Cricket Net Card */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(owner)/add-net')}
        >
          <View style={[styles.iconContainer, styles.netIconBg]}>
            <PlusCircle size={32} color="#dcc093" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Add Cricket Net</Text>
            <Text style={styles.cardDescription}>
              List practice nets with options for overs or hours pricing and multiple lanes.
            </Text>
          </View>
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 0,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A', // Dark text
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B', // Gray text
    fontFamily: 'Inter',
  },
  cardsContainer: {
    gap: 20,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF', // White card
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0', // Light border
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  groundIconBg: {
    backgroundColor: 'rgba(0, 234, 107, 0.1)',
  },
  netIconBg: {
    backgroundColor: 'rgba(220, 192, 147, 0.1)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  arrowContainer: {
    marginLeft: 16,
  },
  arrow: {
    fontSize: 24,
    color: '#64748B',
    fontWeight: '300',
  },
});
