# Cricket Scoring Engine - Stabilization & Features

This commit stabilizes the cricket scoring engine, fixes data persistence issues, and adds several requested rules and UI features.

## Key Changes

### 1. Resumption & Data Integrity
- **Dynamic State Reconstruction**: Fixed issues where team overs and CRR would reset to zero upon match resumption. The engine now correctly reconstructs the match state from the ball-by-ball logs.
- **Toss Persistence**: Corrected the display and persistence of toss results. The UI now accurately shows who won the toss and their decision after page refresh.
- **Live Scorecard Team Names**: Fixed the "Full Scorecard" and "Match Summary" views to dynamically resolve batting/bowling team names from the innings records, rather than relying on fixed document positions.

### 2. Rule Enforcement
- **Consecutive Over Rule**: Implemented a check to prevent the same bowler from bowling two consecutive overs, even across match pauses and resumes.
- **Bowler Over Limits**: Integrated match-wide over limits. Bowlers who reach their limit are now disabled in the selection UI, and attempts to assign them are blocked with a notification.
- **Undo Capability**: Activated the "Undo" button. Clicking it reverts the local state by one ball and permanently deletes the corresponding record from the database.

### 3. UI/UX Enhancements
- **Dynamic Cricket Loaders**: Replaced generic loading messages with fun, cricket-specific statements (e.g., "Third Umpire is checking the ultra-edge...") that rotate every few seconds.
- **Fixed Stylesheet Hoisting**: Resolved a major UI bug in `scoring.tsx` where late-defined styles were not being applied. Moved the design system to the top of the file for reliable rendering.
- **Scoreboard Polish**: Improved the layout of the live scoreboard to ensure all components are properly aligned and styled.

### 4. Technical Debt & Stabilization
- **Migration & Cleanup**: Moved `live_schema.sql` to the migrations directory and added a new migration to handle innings column fixes.
- **Component Repair**: Fixed several critical syntax errors (mismatched JSX tags, double imports) that were breaking the web build.

---
*Committed and Pushed on April 14, 2026*
