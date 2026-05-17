# Web Stability & Architecture Guide

This document provides a comprehensive overview of the architectural patterns and fixes implemented to ensure stability, performance, and deterministic rendering for the BookYourGround web and mobile platforms.

---

## 1. Core Stability Principles

To prevent "dead links," unresponsive UIs, and "Rendered fewer hooks than expected" errors, follow these rules:

- **Hook Initialization Order**: All hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) MUST be called at the very top of the component, before any conditional `return` statements.
- **Static Component Tree**: Avoid conditional mounting of components that contain hooks. Prefer toggling visibility/styles or using the `href: null` pattern in navigation.
- **Provider Memoization**: All top-level context providers must memoize their value objects to prevent full-tree re-render loops.

---

## 2. React Hook Stability (Error #300)

We have refactored components to resolve "Rendered fewer hooks than expected" errors:

### Deterministic Hook Execution
- **Problem**: Early `return null;` before hooks were declared caused hook count mismatches.
- **Fix**: Move all hooks above any logical branching.
- **Example**: `app/(owner)/earnings.tsx` and `app/(admin)/earnings.tsx` now initialize all chart state before checking if data exists.

### Responsive Logic in Render
- **Problem**: Using `useWindowDimensions()` or `Dimensions.get()` outside of the render cycle (e.g., in a static `StyleSheet.create`).
- **Fix**: Move dimension checks into the component body and use `useMemo` for dynamic styles.
- **Example**: `components/landing/FindOpposition.tsx` refactored to use component-level responsive logic.

### Initialization & TDZ Protection
- **Problem**: Accessing memoized values or hooks (like `supportMultipleSlots` in `LandingBookingForm.tsx`) before their initialization statement causes standard V8/Hermes `ReferenceError: Cannot access 'variable' before initialization` crashes during re-renders or background state updates.
- **Fix**: Place essential reactive variables, hook wrappers, and `useMemo` blocks at the absolute top of the component body, directly following the state initializations, to ensure they are fully initialized and accessible to all other hooks, effects, and event handlers.

### Unified List Components
- **Problem**: Branching between `<FlatList />` and `<Animated.FlatList />` based on props.
- **Fix**: Use a single component (e.g., `Animated.FlatList`) with dynamic prop objects to maintain hook identity.

---

## 3. Navigation & URL Stability

### Preventing Re-render Loops
Re-render loops are the primary cause of "dead links" (where UI becomes unresponsive because the tree is unmounting/remounting constantly).

- **Path Logic Memoization**: In `WebLayout.tsx`, all path-derived flags (`isLanding`, `isMarketing`, etc.) are wrapped in `useMemo` to prevent calculation on every scroll event or minor state update.
- **Auth State Check**: `AuthContext.tsx` checks if the User ID has actually changed before updating state in `onAuthStateChange`.

### Expo Router Tab Stability
- **Problem**: Hiding tabs by conditionally rendering `Tabs.Screen` breaks the navigation state.
- **Fix**: Always render the screen, but use `href: null` in `options` to hide it from the UI.
- **Example**: `app/(tabs)/_layout.tsx` uses this for the `logout` and `admin` tabs.

### Conditional Navbar Links
- **CRICKET Tab**: This link is now conditionally rendered based on the `isAuthenticated` state to ensure users aren't directed to profile-specific pages when signed out.

---

## 4. Session & Data Persistence (Idle Fix)

We have implemented patterns to prevent data from "disappearing" when the browser tab has been idle or when the session refreshes in the background.

### AuthContext Hardening
- **Problem**: Background token refreshes were triggering auth state updates that temporarily wiped the `user` or `profile` objects.
- **Fix**: 
    - Added `isMounted` checks to all async auth listeners.
    - Preserved `profile` data during `TOKEN_REFRESHED` events; only wiped on explicit `SIGNED_OUT`.
    - Removed redundant `window.focus` listeners that caused race conditions.

### Stale-While-Revalidate (SWR) Pattern
- **Problem**: Components were showing loading spinners/blank screens every time they re-fetched data in the background.
- **Fix**: Only set `loading: true` if the local data state is currently empty.
- **Example**: `PopularGrounds.tsx`, `GroundsNearYou.tsx`, and `AdminDashboardScreen` now keep existing data visible while fetching updates.
- **Standard**:
  ```tsx
  if (data.length === 0) setLoading(true);
  ```

---

## 5. Layout Optimization (Web)

### Duplicate Layout Guard
- **Problem**: Nested components rendering their own `WebLayout` causing duplicate scroll listeners and headers.
- **Fix**: Use a `hideHeader` prop or check `segments` to ensure only one `WebLayout` exists in the tree.
- **Example**: `app/(tabs)/find-an-opponent.tsx` checks for parent layout before wrapping.

### Scroll Performance
- **Stable Listeners**: Scroll event handlers in `WebLayout` are memoized and use refs for position tracking to avoid triggering re-renders for every pixel moved.
- **Backdrop Filters**: Expensive CSS effects like `backdrop-filter` are optimized and conditionally applied based on scroll position.

---

## 5. Verification & Monitoring

In development mode (`__DEV__`), monitor the browser console for:
- `Root layout render: X`
- `WebLayout render: X`

If these counts climb rapidly without user interaction, a re-render loop has been introduced.

---
*Maintained by AI Assistant (Antigravity)*
