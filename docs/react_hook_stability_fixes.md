# React Hook Stability & Error #300 Fixes

This document summarizes the architectural and code-level fixes implemented to resolve **React minified error #300** ("Rendered fewer hooks than expected") and ensure a deterministic component tree across the application.

## 1. Hook Initialization Order
**Problem**: Components used early `return` statements (e.g., `if (!data) return null;`) before all `useState` or `useEffect` hooks were declared.
**Fix**: Moved all hook initializations (State, Memo, Effects) to the very top of the component body, before any conditional returns.
**Examples**:
- `app/(owner)/earnings.tsx`: Moved `useState` for chart data before the `data.length === 0` check.
- `app/(admin)/earnings.tsx`: Similar fix for administrative charts.

## 2. Illegal Hook Usage in StyleSheet
**Problem**: `useWindowDimensions()` was called inside `StyleSheet.create()`, which is outside the component render cycle.
**Fix**: Moved responsive logic into the component body and used inline styles or `useMemo` for style objects that depend on window size.
**Examples**:
- `components/landing/FindOpposition.tsx`: Replaced module-level dimension checks with component-level responsive logic.

## 3. Navigation & Tab Stability
**Problem**: `Tabs.Screen` was conditionally rendered (`{user && <Tabs.Screen ... />}`), causing the React component tree to change its length when auth state updated.
**Fix**: Always render all `Tabs.Screen` entries. Use the `href: null` option to hide tabs from the UI without unmounting the screen from the React tree.
**Examples**:
- `app/(tabs)/_layout.tsx`: Always renders the `logout` tab but toggles `href` based on auth state.
- Registered missing files (matches, support) explicitly to prevent unstable auto-generated routes.

## 4. Preventing Nested Layouts (Web)
**Problem**: Sub-components like `FindAnOpponentScreen` were rendering their own `WebLayout` wrapper even when nested inside a parent that already provided a `WebLayout`. This caused duplicate `useEffect` registrations and scroll listeners.
**Fix**: Added a `hideHeader` prop (or similar flag) to sub-components to skip the `WebLayout` wrapper when being used as a tab or modal content.
**Examples**:
- `app/(tabs)/find-an-opponent.tsx`: Now checks `isWeb && !hideHeader` before wrapping in `WebLayout`.

## 5. Unified List Components
**Problem**: Branching between different list types (e.g., `<FlatList />` vs `<Animated.FlatList />`) based on props. React sees these as different component types, leading to hook reset issues.
**Fix**: Consolidated all logic into a single `Animated.FlatList` with dynamic prop objects.
**Examples**:
- `app/(tabs)/find-an-opponent.tsx`: Unified the main content into one `Animated.FlatList` that handles both web and native scrolling/refreshing logic.

## 6. Module-Scope Dimension Guards
**Problem**: Using `Dimensions.get('window').width` at the top level of a file to define static constants that don't update on rotation/resize.
**Fix**: Replaced with `useWindowDimensions()` inside components or dynamic `isSmall` checks within the render body.
**Examples**:
- `app/(tabs)/grounds.tsx`: Replaced module-level width checks with component-level responsive state.

---

### Best Practices for Future Development
- **No Early Returns**: Never return JSX or `null` before all hooks are called.
- **Static Component Tree**: Avoid conditional mounting of components that contain hooks. Prefer toggling visibility/styles.
- **Safe Layouts**: Always check if a layout wrapper (like `WebLayout`) is already present in the parent before rendering it again.
- **Hook Placement**: Always call hooks at the top level of your React function. Never call them inside loops, conditions, or nested functions.
