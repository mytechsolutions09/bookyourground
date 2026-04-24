import { hoursBetweenBooked, normalizeDbTimeToHHMM } from './bookingSlots';
import { cricketTeamsLabelFromBooking } from './cricketGround';

type BookingPriceInput = {
  total_amount?: number | null;
  price_per_hour?: number | null;
  discount_amount?: number | null;
  notes?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  ground?: {
    pitch_type?: string | null;
    base_price_per_hour?: number | null;
  } | null;
};

export function getBookingDisplayAmount(booking: BookingPriceInput | null | undefined): number {
  if (!booking) return 0;

  const storedAmount = Number(booking.total_amount ?? 0);
  
  // If we already have a stored amount (existing booking), use it as the source of truth.
  // This avoids recalculation bugs when custom slot pricing or specific team logic was applied.
  if (storedAmount > 0) {
    return storedAmount;
  }

  const pitchType = String(booking.ground?.pitch_type ?? '').toLowerCase();
  const unitPrice = Number(booking.price_per_hour ?? booking.ground?.base_price_per_hour ?? 0);
  const discountAmount = Number(booking.discount_amount ?? 0);

  if (pitchType.includes('box')) {
    const start = normalizeDbTimeToHHMM(booking.start_time);
    const end = normalizeDbTimeToHHMM(booking.end_time);
    const hours = start && end ? hoursBetweenBooked(start, end) : null;
    if (hours && Number.isFinite(hours) && unitPrice > 0) {
      return Math.max(0, Math.round(hours * unitPrice * 100) / 100 - discountAmount);
    }
  }

  if (pitchType.includes('cricket')) {
    const teamsLabel = cricketTeamsLabelFromBooking(booking.ground?.pitch_type, booking.notes);
    if (teamsLabel && unitPrice > 0) {
      const matchPrice = teamsLabel === '1 team' ? unitPrice / 2 : unitPrice;
      return Math.max(0, Math.round(matchPrice * 100) / 100 - discountAmount);
    }
  }

  return storedAmount;
}
