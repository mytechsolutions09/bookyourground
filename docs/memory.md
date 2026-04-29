# Match Info & Navigation Enhancements Memory

## Feature: Collapsible Header & Bottom Bar
Implemented a "Smart Header" system that maximizes screen real estate by hiding navigation elements on scroll.

### Technical Implementation
- **Files Affected**:
  - `app/live/[matchId].tsx`: Implemented `headerTranslateY` shared value and `verticalScrollHandler`.
  - `app/(tabs)/cricket/matches.tsx`: Ported the collapsible logic for a consistent experience.
  - `components/navigation/MobileTabBar.tsx`: Converted to an Animated component that responds to `isTabBarVisible` from `UIContext`.
  - `contexts/UIContext.tsx`: Added state for global tab bar visibility.

- **Animation Details**:
  - **Duration**: 600ms (Slowed down for a premium feel).
  - **Easing**: `Easing.out(Easing.exp)` (Exponential decay for natural motion).
  - **Sensitivity**: Threshold reduced to `1` (diff) to capture slow/deliberate swipes.

### UI/UX Decisions
- **Content immerson**: Removed static backgrounds from main containers. Switched to `paddingTop` inside internal scrolls so content fills the entire screen up to the status bar when the header hides.
- **Synchronized Hiding**: Both Top Bar and Bottom Tab Bar hide/show in unison to provide a "Live Mode" feel.
- **Platform Specifics**: Logic is optimized for Mobile (iOS/Android) while maintaining standard behavior for Web.

## Feature: Swipeable Tab Pager
Replaced manual PanResponder logic with a robust, high-performance horizontal pager.

### Technical Implementation
- **Architecture**: `Animated.ScrollView` with `pagingEnabled`.
- **Synchronization**: `translateX` shared value used to power the active tab indicator and auto-scrolling tab bar.
- **Scroll Handling**: Fixed potential dead-locks by passing `verticalScrollHandler` into internal tab components for shared vertical scroll state.

## Core State & Data
- **Auto-Refresh**: Integrated realtime Supabase subscriptions to refresh match data (ball-by-ball, score updates) while maintaining scroll position and animation state.
## Interactive UI Protections
- **Dropdown Logic**: Maintained high `zIndex` and proper overlay positioning for match filters (Category, Status, Date) and Commentary filters.
- **Scroll Conflict Resolution**: Ensured that the `verticalScrollHandler` doesn't conflict with interactive elements by using moderate thresholds and ensuring standard touch event propagation.
- **Header Settings**: Preserved settings and share buttons in the Match Info header during the transition to a collapsible model.

## Feature: Horizontal Swipe Pager (Cricket Hub)
Transformed the entire Cricket section into a swipeable, multi-tab interface.

### Technical Implementation
- **Architecture**: Refactored `app/(tabs)/cricket/_layout.tsx` to include an `Animated.ScrollView` (horizontal) with `pagingEnabled`.
- **Component Injection**: Manually imported and rendered all cricket sub-screens (`Matches`, `Teams`, `Stats`, etc.) as slides within the pager.
- **Scroll Sync**:
  - **Horizontal**: Tracks `onMomentumEnd` to update the active tab state.
  - **Vertical**: Each slide contains its own `Animated.ScrollView` that communicates with the global collapsible header logic.
- **Stability Fix**: Decoupled `router.replace` from the swipe state to prevent "Maximum update depth" infinite loops.

### UI/UX Decisions
- **Unified Navigation**: The top tab bar auto-scrolls horizontally to keep the active category in focus during swipes.
- **Zero-Latency Switching**: Pre-mounting all tabs in the pager provides instantaneous transitions between sections.

