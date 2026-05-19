# Muzztech SMS Gateway Integration Settings

This document outlines the configuration, DLT-registered templates, and integration patterns for the Muzztech SMS Gateway used in **BookYourGround** for Signup Verification and Login Two-Factor Authentication (2FA).

---

## 1. Gateway API Settings

These settings are configured in the application environment configuration:

| Setting Key | Value | Purpose |
| :--- | :--- | :--- |
| **API Base URL** | `https://connect.muzztech.com/api/sms/send` | Base SMS API endpoint |
| **API Key** | `[Configured in .env as EXPO_PUBLIC_MUZZTECH_API_KEY]` | Authentication credentials |
| **Sender Name** | `BYGBYG` | DLT-registered sender identifier |

---

## 2. DLT-Registered Message Templates

Indian DLT regulations strictly enforce whitespace and character matching. The API requests must precisely match the templates below (including the **leading space** at the start of each message string).

### A. Signup Verification Template
* **Template ID**: `1707177917840627538`
* **DLT Template Pattern**:
  ```text
   Your OTP {#var#} to authenticate your signup. Never share your OTP with anyone - https://bookyourground.com/ PRPBYG
  ```
* **Usage**: Used during player and ground owner registration to verify mobile numbers before committing the account to Supabase.

### B. Login 2FA Template
* **Template ID**: `1707177917746038437`
* **DLT Template Pattern**:
  ```text
   Your OTP {#var#} to authenticate your login. Never share your OTP with anyone - https://bookyourground.com/ PRPBYG
  ```
* **Usage**: Used when logging in as a second-factor authentication (2FA) checkpoint for users with a registered phone number.

---

## 3. Implementation Workflow

### Step 1: Phone Sanitization (`utils/sms.ts`)
Before dispatching an SMS request, numbers are sanitized to standard Indian 10-digit formats (removing spaces, non-digits, leading zeros, or country prefixes like `+91`):
```typescript
export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}
```

### Step 2: Signup Flow Interception
* **Player (`signup.tsx`)** and **Partner (`owner-signup.tsx`)** registration flows intercept form submission before contacting Supabase.
* Generates a 6-digit random code and dispatches it via Muzztech.
* Presents a blur-backed glassmorphic modal with individual auto-focusing digit inputs and a 60-second countdown timer.
* On successful OTP confirmation, standard `signUp` is called, supplying `phoneVerified: true` as metadata.

### Step 3: Postgres Sync Trigger
A database trigger catches the `phone_verified: true` flag inside `raw_user_meta_data` and automatically maps it to `public.profiles.phone_verified` atomically during insert.

### Step 4: Login 2FA Enforcement
* Standard email/password `signIn` is invoked first.
* Once the session starts, the main layout redirection hook checks if the user has a phone number on their profile.
* If so, redirection is paused, an OTP is dispatched via Muzztech, and a secure glassmorphic overlay demands the 6-digit code.
* If successful, the user is redirected; if canceled or failed, they are signed out to protect the account session.
