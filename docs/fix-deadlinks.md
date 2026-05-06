# Stabilizing React Navigation Web Performance

This document outlines the architectural changes made to resolve "dead links" and navigator remounting issues on the web platform.

## The Problem
React Navigation (via Expo Router) would frequently unmount and remount the entire navigation tree. This caused:
1.  Interactive elements (links, buttons) to become unresponsive after a few seconds.
2.  Navigation state resets (returning to home or losing screen history).
3.  High CPU usage due to re-render loops.

The root cause was **Unstable Context Providers** and **Non-memoized Layout Logic** at the top of the React tree.

## Implemented Fixes

### 1. Provider Memoization (Critical)
The top-level context providers were creating new object references on every render, triggering full-tree updates:
- **`AuthContext.tsx`**: Wrapped `user`, `profile`, and all auth functions (`signIn`, `signUp`, etc.) in `useMemo` and `useCallback`.
- **`UIContext.tsx`**: Memoized the visibility and animation states.
- **`LocationContext.tsx`**: Memoized location and weather data updates.

### 2. Auth State Stabilization
Refactored the `onAuthStateChange` listener in `AuthContext` to prevent redundant `setUser` calls. It now checks if the user ID actually changed before triggering a state update.

### 3. WebLayout Optimization
- **Path Logic**: All path-derived variables (`isLanding`, `isMarketing`, etc.) are now memoized using `useMemo`.
- **Scroll Listeners**: Refactored scroll event handlers to be stable and avoid frequent state updates.
- **Conditional Rendering**: Moved away from recalculating complex UI states in the component body.

### 4. Hook Stability
- **`useIsCompact.ts`**: The results of window dimension checks are now memoized to prevent re-renders when the window width changes but doesn't cross the threshold.
- **`TabLayout`**: Updated to use the stabilized `useIsCompact` hook.

## Verification
In development mode (`__DEV__`), use the browser console to monitor:
- `Root layout render: X`
- `WebLayout render: X`

These counts should remain stable after the initial page load. If they start climbing rapidly, it indicates a new re-render loop has been introduced.

---
*Maintained by AI Assistant (Antigravity)*
