import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }

  return true;
}

/**
 * Schedules a local notification at 6 AM for matches happening today.
 * This should be called when the app starts or periodically.
 */
export async function scheduleMatchReminders(userId: string) {
  if (Platform.OS === 'web') return;

  try {
    const hasPermission = await registerForPushNotificationsAsync();
    if (!hasPermission) return;

    // Clear existing match-day notifications to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const today = new Date().toISOString().split('T')[0];

    // Fetch matches for today
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        ground:grounds(name)
      `)
      .eq('user_id', userId)
      .eq('booking_date', today)
      .eq('status', 'confirmed');

    if (error || !bookings || bookings.length === 0) return;

    // For each booking today, schedule a reminder at 6 AM
    // If it's already past 6 AM, schedule it for "now" or just skip
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(6, 0, 0, 0);

    for (const booking of bookings) {
      const groundName = booking.ground?.name || 'the ground';
      const startTime = booking.start_time.slice(0, 5);

      if (now < scheduledTime) {
        // Schedule for 6 AM today
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Match Day! 🏏",
            body: `Don't forget! Your match at ${groundName} starts at ${startTime} today.`,
            data: { bookingId: booking.id },
          },
          trigger: {
            hour: 6,
            minute: 0,
            repeats: false,
          },
        });
      } else {
        // It's already past 6 AM today. 
        // We could schedule a one-time "Immediate" notification if we haven't shown it yet,
        // but typically the 6 AM requirement implies a morning briefing.
        // We'll skip scheduling for today if it's already late.
      }
    }
  } catch (err) {
    console.error('Error scheduling match reminders:', err);
  }
}
