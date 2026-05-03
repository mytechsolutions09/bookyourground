# Discount & Coupon System Documentation

This document outlines the architecture and business logic for the discount and coupon system in the BookYourGround platform.

## Overview

The platform supports two types of coupons:
1. **Admin Coupons**: Created by super admins, applicable to all grounds globally.
2. **Owner Coupons**: Created by ground owners, applicable only to their specific grounds.

## Database Schema

### `coupons` Table
- `id`: UUID (Primary Key)
- `code`: TEXT (Unique, case-insensitive)
- `discount_type`: TEXT ('percentage' or 'flat')
- `discount_value`: NUMERIC
- `min_booking_amount`: NUMERIC (Minimum ground price required to apply)
- `max_discount`: NUMERIC (Cap for percentage-based discounts)
- `usage_limit`: INTEGER (Total number of times the coupon can be used)
- `used_count`: INTEGER (Current usage count)
- `max_uses_per_user`: INTEGER (Defaults to 1)
- `expiry_date`: TIMESTAMP
- `is_active`: BOOLEAN
- `owner_id`: UUID (Reference to the profile of the creator)
- `ground_id`: UUID (NULL for Admin coupons, non-NULL for Owner coupons)

## Application Logic

### 1. Discovery
The checkout page fetches available coupons using the following filter logic:
- `is_active = true`
- `expiry_date > now()` (or NULL)
- `ground_id = current_ground_id` OR `ground_id IS NULL`

### 2. Validation (`validate_coupon` RPC)
The validation is performed via a database function to ensure security and data integrity:
- **Scope Check**: If a coupon has a `ground_id`, it must match the booking's `ground_id`.
- **Usage Check**: Verifies that the `used_count` is below the `usage_limit`.
- **User Check**: Verifies that the current user has not exceeded `max_uses_per_user` for this coupon.
- **Minimum Amount**: The base ground price (before platform fees) must meet the `min_booking_amount`.

### 3. Calculation
The discount is calculated on the **Base Ground Price** only. Platform fees and GST are calculated separately on the post-discount or pre-discount amount depending on platform settings (currently calculated on the final base price).

- **Percentage**: `(Base Price * Value / 100)` capped at `max_discount`.
- **Flat**: `Value`.

## User Experience Rules

1. **One Coupon Per Booking**: Only one coupon can be applied at a time.
2. **Explicit Removal**: If a user wants to try a different coupon, they must first "Remove" the current one.
3. **Real-time Feedback**: Any change in the ground price (e.g., changing slots) that invalidates a coupon will trigger an update in the total payable.

## Management

- **Super Admins**: Can manage all coupons via the Admin Dashboard.
- **Ground Owners**: Can create and manage coupons for their own grounds through the Owner Portal.
