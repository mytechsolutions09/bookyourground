import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import WebLayout from '@/components/web/WebLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { BookingWithDetails } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { formatBookingSlotSummary } from '@/utils/bookingSlotFormat';

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
        // swallow for now; show generic content
        console.error('Error loading confirmed booking', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const content = (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Card style={styles.card}>
          <View style={styles.iconWrapper}>
            <CheckCircle2 size={56} color={Platform.OS === 'web' ? '#16a34a' : '#4CAF50'} />
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
              <Text style={styles.summaryLine}>
                <Text style={styles.summaryLabel}>Amount: </Text>
                <Text style={styles.summaryValue}>{formatCurrency(booking.total_amount)}</Text>
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="View my bookings"
              onPress={() => router.replace('/(tabs)/bookings' as any)}
              fullWidth
              size="medium"
            />
            <Button
              title="Book another ground"
              variant="outline"
              onPress={() => router.replace('/book-my-ground' as any)}
              fullWidth
              size="medium"
              style={styles.secondaryButton}
            />
          </View>
        </Card>
      </View>
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
    backgroundColor: '#F5F5F5',
    ...Platform.select({
      web: {
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 32,
      },
    }),
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  summary: {
    alignSelf: 'stretch',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  summaryLine: {
    fontSize: 14,
    marginVertical: 2,
  },
  summaryLabel: {
    fontWeight: '600',
    color: '#4B5563',
  },
  summaryValue: {
    color: '#111827',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
  },
  secondaryButton: {
    marginTop: 4,
  },
});

