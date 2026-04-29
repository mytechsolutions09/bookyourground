# Walkthrough - Updated Money Flow & Razorpay Route

I have implemented the complete money flow for ground bookings as requested. This ensures transparency for the user and automated settlement for the ground owner.

## Key Changes

### 1. Database Schema
- **New Columns**: Added breakdown columns to the `bookings` table to track `ground_price`, `platform_fee_user`, `gst_user`, `platform_fee_owner`, `gst_owner`, `owner_settlement`, and `byg_net_revenue`.
- **Owner Details**: Added `razorpay_account_id` to the `owner_bank_details` table to enable Razorpay Route splits.

### 2. Edge Function Enhancements
- **Authoritative Pricing**: Updated the `calculateFinalAmounts` helper to compute the full breakdown based on the 5% platform fee and 18% GST rules.
- **Flexible Settlement**: 
    - **Razorpay Route**: If an owner has a `razorpay_account_id`, the system creates a split transfer with `on_hold: true`.
    - **Wallet System**: If no Razorpay ID is present, the system credits the owner's internal wallet with the `owner_settlement` amount (e.g., ₹9,410 for a ₹10,000 booking).
- **Withdrawal Ready**: Owners can then request a withdrawal from their wallet once the match is completed.
- **Atomic Persistence**: Upon payment verification, all breakdown details are now persisted to the booking record for accounting and GST filing.

### 3. Transparent Checkout UI
- **Single Line Item**: The platform fee is now shown as a single line item including GST.
- **Honest Disclosure**: Added an "inc. 18% GST" tag to the platform fee row for transparency.
- **Dynamic Calculation**: The total payable is dynamically calculated in the UI to ensure consistency with the backend.

## Verification

### Manual Verification Steps
1. **Deploy Migration**: Run the migration `20260427160000_update_money_flow.sql` in your Supabase SQL Editor.
2. **Update Edge Function**: Deploy the updated `payment-gateway` function using `supabase functions deploy payment-gateway`.
3. **Set Owner Account**: Add a `razorpay_account_id` for a test ground owner in the `owner_bank_details` table.
4. **Test Booking**: Create a ₹10,000 booking and verify that the checkout shows ₹10,590 total and the platform fee is clearly displayed.
5. **Check Razorpay**: Verify in the Razorpay Dashboard that the order was created with the correct transfer to the owner's account.

---

This implementation provides a professional, Airbnb-style marketplace flow that handles taxes and settlements automatically, whether via Razorpay Route or the internal wallet system.
