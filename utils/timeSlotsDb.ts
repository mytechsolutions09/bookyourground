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

