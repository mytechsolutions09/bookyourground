import { formatTime } from '@/utils/helpers';
import { getSlotTemplatesForPitch, normalizeDbTimeToHHMM } from '@/utils/bookingSlots';

/** Display line for booking cards: prefer named slot start when it matches templates. */
export function formatBookingSlotSummary(
  startTime: string,
  endTime: string,
  pitchType?: string | null,
): string {
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
