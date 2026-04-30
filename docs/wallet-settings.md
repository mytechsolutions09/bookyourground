# Wallet System Architecture (Refund-Only Model)

The BookYourGround wallet system is designed as a **Refund-Only Store Credit** model, inspired by platforms like Myntra. This approach ensures compliance with RBI regulations regarding Prepaid Payment Instruments (PPI) by not allowing direct user top-ups.

## Core Strategy
- **No Direct Top-ups**: Users cannot add money directly from their bank accounts to the wallet.
- **Internal Credits Only**: Money only enters the wallet through platform-initiated actions (Refunds, Referrals, Promotions).
- **Spending**: Wallet balance can be used to pay for any booking or shop order on the platform.

---

## Technical Architecture

### Database Schema
The system relies on two primary tables:
- `wallets`: Stores the current balance for each user.
- `wallet_transactions`: Logs every credit and debit operation.

### Transaction Types (`wallet_transaction_type`)
- `refund`: Credits from cancelled bookings.
- `referral`: Credits earned from inviting new users.
- `promo`: Promotional credits or rewards.
- `used`: Debits when a user pays for a booking using their wallet.

### Key Database Functions
#### `process_wallet_transaction` (RPC)
An atomic function that handles:
1. Identifying or creating the user's wallet.
2. Updating the wallet balance (increment for credit, decrement for debit).
3. Inserting a record into `wallet_transactions` with a link to the `booking_id` if applicable.

---

## Workflow Integrations

### 1. Refund Trigger (Admin Panel)
When an admin cancels a booking, they can trigger a refund.
- **Action**: Invokes the `payment-gateway` edge function with `action: 'refund-to-wallet'`.
- **Logic**: Automatically calculates the `total_amount` paid by the user and credits it back to their wallet.

### 2. Wallet Payment (Checkout)
Users with a positive balance see "Wallet Balance" as a payment option.
- **Action**: Invokes the `payment-gateway` edge function with `action: 'confirm-wallet'`.
- **Logic**: Deducts the amount from the wallet atomically before confirming the booking.

### 3. Revenue Reversal
If a booking paid via wallet is cancelled, the system handles the reversal for both the user (credit back) and the ground owner (debit revenue reversal) to maintain financial integrity.

---

## Security & Compliance
- **RLS Policies**: Users can only view their own wallet and transactions.
- **Server-Side Only**: All balance mutations happen via secure Edge Functions or Database RPCs, never directly from the client.
- **RBI Compliance**: Since it's a closed-loop store credit system where money cannot be withdrawn to a bank account (except for owner settlements), it does not require a PPI license.
