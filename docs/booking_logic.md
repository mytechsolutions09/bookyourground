# Booking & Platform Fee Logic Summary

This document summarizes the logic implemented for calculating platform fees, durations, and related booking groups within the system, specifically for Cricket Grounds and Nets.

## 1. Related Booking Grouping
Bookings are grouped together if they share a common "Slots" identifier in their `notes` field.
- **Identifier Pattern**: `(Slots: HH:MM, HH:MM, ...)`
- **Query Logic**: The system searches for all bookings for the same `user_id` and `ground_id` that contain this exact slots string in their notes.
- **Cross-Date Support**: The grouping logic ignores the `booking_date`, allowing a single booking group to span multiple days (e.g., a weekend tournament).

## 2. Platform Fee Calculation (Owner Side)
The platform fee is calculated based on the pitch type and the number of teams/slots.

### Cricket Grounds
- **Model**: Fixed fee per team slot.
- **Logic**: `ownerPf = cricket_owner_fee_fixed * totalTeams`
- **Team Counting**: 
  - "Both Teams" = 2 team slots.
  - "1 Team" / "one" = 1 team slot.
- **Multi-slot Scaling**: If multiple slots are found in the group (or notes), the fee scales accordingly.
- **Remediation**: The system prioritizes the **calculated fee** over stored values in the database to ensure legacy bookings with incorrect percentages are corrected in the display.

### Nets / Lanes
- **Model**: Fixed fee per slot.
- **Logic**: `ownerPf = nets_owner_fee_fixed * slotCount`
- **Remediation**: Similar to Cricket, calculated values are prioritized to fix legacy data issues.

### GST
- A standard GST rate (default 18%) is applied on top of the `ownerPf`.
- **Display**: Shown as `Platform fee (inc. GST)`.

## 3. Duration Calculation
Total duration for a booking group is calculated by:
1. Identifying the duration of a single template slot (via `time_slots` and `day_of_week`).
2. Multiplying that duration by the total `slotCount` found in the `relatedBookings` group.
3. If no `relatedBookings` are found, it falls back to parsing the count from the `notes` field.

## 4. UI Display Logic
- **Venue Price**: The sum of `ground_price` across all related bookings.
- **Platform Fee**: Displayed as a deduction (negative) from the venue price for the owner.
- **Total Receivable**: `Venue Price - (Platform Fee + GST)`.

---
*Last Updated: 2026-05-16*
