import { Platform } from 'react-native';

/**
 * Stubbed implementation to completely bypass the expo-notifications module.
 * This resolves the Xcode build aps-environment / Push Notifications entitlement requirement.
 */

export async function registerForPushNotificationsAsync() {
  return null;
}

export async function scheduleMatchReminders(userId: string) {
  // Bypassed for this target to support local building without APNS capability.
  return;
}
