import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'bookyourground_pending_booking_draft_v1';

/** Drafts older than this are ignored and removed. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingBookingDraftV1 = {
  v: 1;
  savedAt: number;
  landing?: {
    locationKey: string;
    typeKey: string;
    bookingDate: string;
    startTime: string;
    teamType: 'one' | 'both';
    selectedGroundId: string | null;
    /** User had tapped Search at least once — re-run search after restore. */
    hadCompletedSearch: boolean;
  };
  groundDetail?: {
    groundId: string;
    bookingDate: string;
    startTime: string;
    teamType: 'one' | 'both';
  };
};

export async function savePendingBookingDraft(
  draft: Omit<PendingBookingDraftV1, 'savedAt' | 'v'>,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const payload: PendingBookingDraftV1 = { ...draft, v: 1, savedAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('savePendingBookingDraft', e);
  }
}

export async function peekPendingBookingDraft(): Promise<PendingBookingDraftV1 | null> {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBookingDraftV1;
    if (parsed?.v !== 1 || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingBookingDraft(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
