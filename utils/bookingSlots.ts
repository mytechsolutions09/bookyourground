function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Hours between start/end; if end is earlier on the clock, treat as next day (e.g. 23:00 → 00:00). */
export function hoursBetweenBooked(start: string, end: string): number | null {
  const a = parseTimeToMinutes(start);
  const b = parseTimeToMinutes(end);
  if (a === null || b === null) return null;
  let diff = b - a;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

/** Normalize DB `time` / strings like `08:00:00` to `HH:MM`. */
export function normalizeDbTimeToHHMM(t: string | null | undefined): string | null {
  if (t == null || t === '') return null;
  const s = String(t).trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return null;
  const hh = m[1].padStart(2, '0');
  const mm = m[2];
  return `${hh}:${mm}`;
}

export function formatSlotLabelHour(hour24: number): string {
  const isNoon = hour24 === 12;
  const isMidnight = hour24 === 0;
  if (isNoon) return '12 Noon';
  if (isMidnight) return '12 AM';
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12} ${ampm}`;
}

export function formatTime12h(hhmm: string): string {
  const [hhStr, mmStr] = hhmm.split(':');
  const hh = parseInt(hhStr ?? '', 10);
  const mm = parseInt(mmStr ?? '', 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return hhmm;

  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 || 12;
  const minPart = mm === 0 ? '' : `:${String(mm).padStart(2, '0')}`;

  return `${hour12}${minPart} ${ampm}`;
}

function pad2(n: number): string {
  return `${n}`.padStart(2, '0');
}

/** Same rules as the landing booking form: Box Cricket hourly 6–23; Cricket Ground fixed four. */
export function getSlotTemplatesForPitch(pitch: string | null | undefined): { value: string; label: string }[] {
  const p = (pitch ?? '').toLowerCase();
  const isBox = p.includes('box');
  if (isBox) {
    const slots: { value: string; label: string }[] = [];
    for (let h = 6; h <= 23; h += 1) {
      slots.push({ value: `${pad2(h)}:00`, label: formatSlotLabelHour(h) });
    }
    return slots;
  }
  const hours = [8, 12, 16, 20];
  return hours.map((h) => ({ value: `${pad2(h)}:00`, label: formatSlotLabelHour(h) }));
}

/**
 * Human-readable booking window for dashboards (matches landing slot rules; no per-ground DB field).
 */
export function getGroundBookingScheduleLines(pitch: string | null | undefined): {
  datesLine: string;
  slotsLine: string;
} {
  const slots = getSlotTemplatesForPitch(pitch);
  const datesLine = 'Dates: Any day (Mon–Sun)';
  if (!slots.length) {
    return { datesLine, slotsLine: 'Time slots: — (set ground type)' };
  }
  const p = (pitch ?? '').toLowerCase();
  const isBox = p.includes('box');
  if (isBox) {
    const first = slots[0]?.label ?? '';
    const last = slots[slots.length - 1]?.label ?? '';
    return {
      datesLine,
      slotsLine: `Time slots: ${first} – ${last} (hourly)`,
    };
  }
  return {
    datesLine,
    slotsLine: `Time slots: ${slots.map((s) => s.label).join(', ')}`,
  };
}

export function bookingStatusBlocksSlot(status: string): boolean {
  return status !== 'cancelled' && status !== 'rejected';
}
