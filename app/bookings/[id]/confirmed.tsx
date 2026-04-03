import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';
import { cricketTeamsLabelFromBooking } from '@/utils/cricketGround';

export default function BookingConfirmedPage() {
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select(
            `
            *,
            ground:grounds(
              *,
              ground_images(*)
            )
          `,
          )
          .eq('id', id)
          .single();

        if (error) throw error;
        setBooking(data as BookingWithDetails);
      } catch (error) {
        console.error('Error loading confirmed booking', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const teamsLabel =
    booking != null
      ? cricketTeamsLabelFromBooking(booking.ground.pitch_type, booking.notes)
      : null;

  const body = loading ? (
    <View style={styles.loadingBox}>
      <Text style={styles.loadingText}>Loading…</Text>
    </View>
  ) : (
    <>
      <View style={styles.iconWrapper}>
        <CheckCircle2 size={56} color={Platform.OS === 'web' ? '#16a34a' : '#02c259'} />
      </View>
      <Text style={styles.title}>Booking confirmed</Text>
      <Text style={styles.subtitle}>
        Your ground has been booked successfully. A confirmation has been saved in your account.
      </Text>

      {booking && (
        <View style={styles.summary}>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Ground: </Text>
            <Text style={styles.summaryValue}>{booking.ground.name}</Text>
          </Text>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Date: </Text>
            <Text style={styles.summaryValue}>{formatDate(booking.booking_date)}</Text>
          </Text>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Time: </Text>
            <Text style={styles.summaryValue}>
              {formatBookingSlotSummary(
                booking.start_time,
                booking.end_time,
                booking.ground.pitch_type,
              )}
            </Text>
          </Text>
          {teamsLabel ? (
            <Text style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Teams: </Text>
              <Text style={styles.summaryValue}>{teamsLabel}</Text>
            </Text>
          ) : null}
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Amount: </Text>
            <Text style={styles.summaryValueAccent}>{formatCurrency(booking.total_amount)}</Text>
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title="View my bookings"
          onPress={() => router.replace('/(tabs)/bookings' as any)}
          fullWidth
          size="medium"
          style={Platform.OS !== 'web' ? styles.primaryButtonNative : undefined}
        />
        <Button
          title="Book another ground"
          variant="outline"
          onPress={() => router.replace('/book-my-ground' as any)}
          fullWidth
          size="medium"
          style={[styles.secondaryButton, Platform.OS !== 'web' && styles.outlineButtonNative]}
          textStyle={Platform.OS !== 'web' ? styles.outlineButtonTextNative : undefined}
        />
      </View>
    </>
  );

  const content = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {body}
    </ScrollView>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Booking confirmed',
          ...Platform.select({
            web: {},
            default: {
              headerStyle: { backgroundColor: '#043529' },
              headerTintColor: '#00ea6b',
              headerTitleStyle: { color: '#FFFFFF', fontWeight: '700' as const },
            },
          }),
        }}
      />
      {Platform.OS === 'web' ? <WebLayout>{content}</WebLayout> : content}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...Platform.select({
      web: { backgroundColor: '#F5F5F5' },
      default: { backgroundColor: '#043529' },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    ...Platform.select({
      web: {
        paddingTop: 48,
        justifyContent: 'center',
      },
      default: {
        paddingTop: 20,
        justifyContent: 'flex-start',
      },
    }),
  },
  loadingBox: {
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 15,
    ...Platform.select({
      web: { color: '#6B7280' },
      default: { color: '#E5E7EB' },
    }),
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    ...Platform.select({
      web: { color: '#111827' },
      default: { color: '#F9FAFB' },
    }),
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    ...Platform.select({
      web: { color: '#4B5563' },
      default: { color: '#E5E7EB' },
    }),
  },
  summary: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    ...Platform.select({
      web: { borderColor: '#E5E7EB' },
      default: { borderColor: 'rgba(2,194,89,0.45)' },
    }),
    marginBottom: 20,
  },
  summaryLine: {
    fontSize: 14,
    marginVertical: 2,
  },
  summaryLabel: {
    fontWeight: '600',
    ...Platform.select({
      web: { color: '#4B5563' },
      default: { color: '#A7F3D0' },
    }),
  },
  summaryValue: {
    ...Platform.select({
      web: { color: '#111827' },
      default: { color: '#F9FAFB' },
    }),
  },
  summaryValueAccent: {
    fontWeight: '700',
    ...Platform.select({
      web: { color: '#111827' },
      default: { color: '#02c259' },
    }),
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
  },
  secondaryButton: {
    marginTop: 4,
  },
  primaryButtonNative: {
    backgroundColor: '#02c259',
  },
  outlineButtonNative: {
    borderColor: '#02c259',
    backgroundColor: 'transparent',
  },
  outlineButtonTextNative: {
    color: '#02c259',
  },
});
