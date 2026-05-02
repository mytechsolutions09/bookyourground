# Investigation: Bottom White Strip on Mobile Web

## The Problem
A persistent light grey/white strip was visible at the bottom of the screen on mobile web, especially noticeable when the bottom tab bar was hidden during scroll.

## Root Cause
The issue was caused by **fixed layout padding** in `WebLayout.tsx`. 

1. **Implicit Space Reservation**: A `paddingBottom: 72px` was applied to the main content wrapper. This was intended to prevent the fixed bottom bar from covering the last few items on a page.
2. **Visual Discontinuity**: The main layout container has a background color of `#F5F5F5`. When the bottom bar (which normally covered this padding) was hidden via the scroll animation, it exposed the empty padded area of the container. 
3. **Background Mismatch**: Since the landing page sections often have their own specific background colors or images, the light grey container padding appeared as a "white strip" that didn't match the content.

## The Fix
1. **Removed Fixed Padding**: I removed the `paddingBottom` from the main content wrapper and the conditional landing page styles.
2. **Natural Content Flow**: By removing the padding, the content now flows all the way to the bottom of the viewport.
3. **Overlay Interaction**: The bottom tab bar now functions as a true overlay. When it slides out of view, the content already occupied that space, resulting in a seamless transition with no "dead" space left behind.

## Technical Details
Modified `WebLayout.tsx`:
- Removed `paddingBottom: isCompact ? 80 : 0` from the landing page conditional style.
- Removed `paddingBottom: 72` from the `bodyStyle` wrapper view.
