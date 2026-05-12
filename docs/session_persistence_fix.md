# Session Persistence & Idle Data Fix

## Overview
This document outlines the architectural changes made to resolve the issue where application data would "disappear" after a period of user inactivity on the web platform, requiring a page refresh to restore.

## Problem Analysis
The root cause was identified as a combination of:
1.  **Auth State Flickering**: The `supabase.auth.onAuthStateChange` listener was sensitive to background token refreshes. When a session refreshed after idleness, the listener would occasionally trigger state updates that temporarily set `user` or `profile` to inconsistent states, causing components to unmount or reset.
2.  **Redundant Focus Listeners**: A manual `window` focus listener in `AuthContext` was attempting to refresh the session upon returning to the tab. This often raced with the internal Supabase listener, leading to multiple rapid state changes.
3.  **Aggressive Loading States**: Components were setting `loading: true` every time they re-fetched data. If a background refresh occurred (e.g., triggered by a session update), the UI would wipe existing data and show a spinner or empty state, which felt like data loss to the user.

## Implementation Details

### 1. Hardening AuthContext
- **Stable Listeners**: Refactored `AuthContext.tsx` to use `isMounted` checks and deep comparisons for profile data. This prevents unnecessary re-renders if the session refreshes but the user data remains the same.
- **Selective State Wiping**: The `profile` is now only set to `null` on explicit `SIGNED_OUT` events or if the initial session check definitively fails. It is preserved during `TOKEN_REFRESHED` events.
- **Safety Timeouts**: Reduced profile loading timeouts from 35s to 10s to ensure the app becomes interactive faster even if the database is slow.

### 2. Stale-While-Revalidate (SWR) Pattern
Applied the SWR pattern to major data-fetching components:
- **`PopularGrounds.tsx`**
- **`GroundsNearYou.tsx`**
- **`CalendarTabs.tsx`**
- **`AdminDashboardScreen`**

**The Pattern:**
```tsx
const loadData = async () => {
  try {
    // ONLY show loading spinner if we don't have data already
    if (data.length === 0) setLoading(true);
    
    const { data: result } = await supabase.from('...').select('*');
    setData(result);
  } finally {
    setLoading(false);
  }
};
```
This ensures that if the user returns to the app after 30 minutes and the app decides to refresh, they **still see the old data** until the new data arrives, rather than a blank screen.

## Verification
- [x] Session persistence across tab switching.
- [x] Background token refresh does not trigger UI flickering.
- [x] Admin dashboard stats persist during background updates.
- [x] Real-time venues list maintains visibility during idle state transitions.

## Files Modified
- `contexts/AuthContext.tsx`
- `components/landing/PopularGrounds.tsx`
- `components/landing/GroundsNearYou.tsx`
- `components/landing/CalendarTabs.tsx`
- `app/(admin)/dashboard.tsx`
