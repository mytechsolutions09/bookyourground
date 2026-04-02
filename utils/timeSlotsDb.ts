import { supabase as defaultSupabaseClient } from '@/lib/supabase';
import { DayOfWeek } from '@/types';
import { getSlotTemplatesForPitch } from '@/utils/bookingSlots';

const DAY_ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function hhmmToMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function minutesToHHMM(minutes: number): string {
  const totalMinutes = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function hhmmToDbTime(hhmm: string): string {
  // Postgres `time` columns accept `HH:MM:SS` strings.
  return `${hhmm}:00`;
}

function addMinutesToHHMM(startHHMM: string, minutesToAdd: number): string | null {
  const startMinutes = hhmmToMinutes(startHHMM);
  if (startMinutes === null) return null;
  return minutesToHHMM(startMinutes + minutesToAdd);
}

export function getDefaultSlotStartTimesForPitch(pitchType: string | null | undefined): string[] {
  const templates = getSlotTemplatesForPitch(pitchType);
  return templates.map((t) => t.value);
}

/**
 * Ensures default `time_slots` exist for a ground.
 * We only seed when there are currently *no* rows for the `ground_id`.
 *
 * This keeps custom edits intact.
 */
export async function ensureDefaultTimeSlotsForGround(params: {
  groundId: string;
  pitchType: string | null | undefined;
  supabaseClient?: typeof defaultSupabaseClient;
}): Promise<void> {
  const supabaseClient = params.supabaseClient ?? defaultSupabaseClient;

  const { groundId, pitchType } = params;

  const { data: existingRows, error: existingError } = await supabaseClient
    .from('time_slots')
    .select('id')
    .eq('ground_id', groundId);

  if (existingError) {
    console.warn('ensureDefaultTimeSlotsForGround: failed to read existing time_slots', existingError);
    return;
  }

  if (existingRows && existingRows.length > 0) return;

  const startTimes = getDefaultSlotStartTimesForPitch(pitchType);
  if (!startTimes.length) return;

  const rows: Array<any> = [];
  for (const day of DAY_ORDER) {
    for (const startHHMM of startTimes) {
      const endHHMM = addMinutesToHHMM(startHHMM, 60);
      if (!endHHMM) continue;
      rows.push({
        ground_id: groundId,
        day_of_week: day,
        start_time: hhmmToDbTime(startHHMM),
        end_time: hhmmToDbTime(endHHMM),
        custom_price: null,
        is_available: true,
      });
    }
  }

  if (!rows.length) return;

  const { error: insertError } = await supabaseClient.from('time_slots').insert(rows);
  if (insertError) {
    console.warn('ensureDefaultTimeSlotsForGround: failed to insert defaults', insertError);
  }
}

/**
 * Create new `time_slots` rows for the provided days + start times.
 * - Avoids inserting duplicates by checking existing (ground_id, day_of_week, start_time).
 * - Uses `durationMinutes` to calculate `end_time`.
 *
 * If `customPrice` is null, the ground default (base price) will be used by the booking UI.
 */
export async function createTimeSlotsForGround(params: {
  groundId: string;
  days: DayOfWeek[];
  startTimesHHMM: string[];
  durationMinutes?: number;
  isAvailable?: boolean;
  customPrice?: number | null;
  supabaseClient?: typeof defaultSupabaseClient;
}): Promise<{ created: number; skipped: number }> {
  const {
    groundId,
    days,
    startTimesHHMM,
    durationMinutes = 60,
    isAvailable = true,
    customPrice = null,
    supabaseClient,
  } = params;

  const client = supabaseClient ?? defaultSupabaseClient;

  const normalizedStartTimes: { hhmm: string; dbTime: string }[] = [];
  for (const t of startTimesHHMM) {
    const trimmed = String(t ?? '').trim();
    if (!trimmed) continue;
    const hhmm = normalizeStartTimeToHHMM(trimmed);
    if (!hhmm) continue;
    const dbTime = hhmmToDbTime(hhmm);
    normalizedStartTimes.push({ hhmm, dbTime });
  }

  if (!days.length || !normalizedStartTimes.length) {
    return { created: 0, skipped: 0 };
  }

  const dbStartTimes = normalizedStartTimes.map((t) => t.dbTime);
  const { data: existing, error: existingError } = await client
    .from('time_slots')
    .select('day_of_week, start_time')
    .eq('ground_id', groundId)
    .in('day_of_week', days)
    .in('start_time', dbStartTimes);

  if (existingError) {
    console.warn('createTimeSlotsForGround: failed to read existing slots', existingError);
    return { created: 0, skipped: 0 };
  }

  const existingSet = new Set<string>();
  (existing ?? []).forEach((row: any) => {
    if (!row) return;
    const day = row.day_of_week as DayOfWeek;
    const start = String(row.start_time ?? '');
    existingSet.add(`${day}__${start}`);
  });

  const rowsToInsert: Array<any> = [];
  let skipped = 0;

  for (const day of days) {
    for (const t of normalizedStartTimes) {
      const startDbTime = t.dbTime; // HH:MM:SS
      const slotEndHHMM = addMinutesToHHMM(t.hhmm, durationMinutes);
      if (!slotEndHHMM) continue;
      const endDbTime = hhmmToDbTime(slotEndHHMM);

      const key = `${day}__${startDbTime}`;
      if (existingSet.has(key)) {
        skipped += 1;
        continue;
      }

      rowsToInsert.push({
        ground_id: groundId,
        day_of_week: day,
        start_time: startDbTime,
        end_time: endDbTime,
        custom_price: customPrice,
        is_available: isAvailable,
      });
    }
  }

  if (!rowsToInsert.length) {
    return { created: 0, skipped };
  }

  const { error: insertError } = await client.from('time_slots').insert(rowsToInsert);
  if (insertError) {
    console.warn('createTimeSlotsForGround: failed to insert slots', insertError);
    return { created: 0, skipped: 0 };
  }

  return { created: rowsToInsert.length, skipped };
}

function normalizeStartTimeToHHMM(t: string): string | null {
  // Accept "8:00" or "08:00" and normalize to HH:MM.
  const s = String(t ?? '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  const hh2 = String(hh).padStart(2, '0');
  const mm2 = String(mm).padStart(2, '0');
  return `${hh2}:${mm2}`;
}

