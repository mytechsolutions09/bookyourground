import { formatTime } from '@/utils/helpers';
import { getSlotTemplatesForPitch, normalizeDbTimeToHHMM } from '@/utils/bookingSlots';

/** Display line for booking cards: prefer named slot start when it matches templates. */
export function formatBookingSlotSummary(
  startTime: string,
  endTime: string,
  pitchType?: string | null,
  notes?: string | null,
): string {
  if (notes) {
    const matchSlots = /\(Slots:\s*([^)]+)\)/.exec(notes);
    if (matchSlots) {
      const slots = matchSlots[1].split(',').map(s => s.trim());
      if (slots.length > 1) {
        return `${slots.length} Slots: ${slots.join(', ')}`;
      }
    }
  }

  const st = normalizeDbTimeToHHMM(startTime);
  const et = normalizeDbTimeToHHMM(endTime);
  if (!st || !et) {
    return `${formatTime(startTime)} – ${formatTime(endTime)}`;
  }
  const templates = getSlotTemplatesForPitch(pitchType);
  const startNamed = templates.find((t) => t.value === st)?.label;
  if (startNamed) {
    return `${startNamed} – ${formatTime(et)}`;
  }
  return `${formatTime(st)} – ${formatTime(et)}`;
}
