# Platform Fee Structure

This document outlines the authoritative fee calculation logic used by the platform for both manual (offline) and online bookings.

## 1. Manual Booking (Cash / Ground Owner Entry)
When a ground owner enters a booking manually (Cash) via the owner dashboard:
- **Platform Fee (Fixed)**: ₹100 per team (₹100 for a partial match, ₹200 for a full match).
- **GST**: 18% of the service fee.
- **Admin Revenue**: ₹100/₹200 + GST.

## 2. Online Booking (User Booking via App/Web)
When a user books and pays online, the platform collects revenue from both the user and the owner.

### A. From the User (Service Fee)
- **User Platform Fee**: 5% of the ground price.
- **GST**: 18% of the 5% user fee.

### B. From the Ground Owner (Commission)
- **For Full Cricket Grounds**: Fixed ₹100/₹200 + GST (deducted from owner settlement).
- **For Box Cricket & Others**: 5% of ground price + GST (deducted from owner settlement).

### C. Payout Amount (Owner Settlement)
For online bookings, the payout amount transferred to the ground owner will be calculated as:
`Payout Amount = Ground Price - Platform Fee (including GST)`

- **Ground Price**: This is the base price set by the owner (excluding platform fee and GST charged to the user).
- **Platform Fee (including GST)**: This is the commission charged to the owner (Fixed or Percentage) plus the applicable GST on that fee.
- This rule applies if the platform fee is active from the admin (i.e., `charge_platform_fee` is not set to false for the owner).


---

## Example Calculation
**Scenario**: A full cricket ground match booked online for **₹10,000**.

| Item | Calculation | Amount |
| :--- | :--- | :--- |
| **Ground Price** | Base amount set by owner | ₹10,000 |
| **User Pays** | ₹10k + (5% fee) + (18% GST on fee) | **₹10,590** |
| **Owner Receives** | ₹10k - (₹200 fee) - (₹36 GST on fee) | **₹9,764** |
| **Admin Revenue** | ₹500 (User) + ₹200 (Owner) | **₹700** |

*Note: All GST amounts are collected and held by the platform for statutory compliance.*

---

## Configuration
These rates are controlled via the `platform_settings` table in the database:
- `user_platform_fee_rate`: Default `0.05` (5%)
- `gst_rate`: Default `0.18` (18%)
- `cricket_owner_fee_fixed`: Default `100` (₹100 per team)
