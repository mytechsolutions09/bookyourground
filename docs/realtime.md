# Supabase Realtime Features

This document outlines the realtime capabilities implemented in the **BookYourGround** application.

## 1. Core Infrastructure
- **Database Subscriptions**: Enabled Realtime for `bookings`, `notifications`, `team_messages`, and `match_live_state`.
- **Global Setup**: Initialized in `lib/supabase.ts`.
- **SQL Helpers**: Created `send_system_notification` function to trigger realtime events directly from the database.

## 2. Team Chat Enhancements
- **Presence**: Real-time tracking of online team members.
- **Typing Indicators**: Ephemeral "User is typing..." notifications using Supabase Broadcast.
- **Media Sync**: Real-time broadcasting of media messages before they are fully processed by the database.
- **Hook**: `useTeamChat(teamId)` handles all channel multiplexing.

## 3. Live Match Scoring
- **Viewer Count**: Tracks the number of active spectators using Presence.
- **Live Reactions**: Interactive emoji reactions (Broadcast) that allow spectators to engage with the match.
- **Score Sync**: Instant updates for runs, wickets, and overs using Postgres Changes.
- **Hook**: `useLiveMatch(matchId)` manages the match-specific channel.

## 4. Components & Tools
- **RealtimeDemo**: A testing component to verify Broadcast and Presence functionality.
- **LiveMatchScoreboard**: A premium UI for displaying live scores and interactive reactions.
- **TeamChatTab**: An updated chat interface with typing indicators and online awareness.

## 5. Technical Implementation Details
- **Channel Naming**: Unique suffixes used for chat channels to prevent "already joined" errors during React component re-mounts.
- **Debouncing**: 3-second timeout for typing indicators to ensure a smooth user experience.
- **Optimistic UI**: Self-reactions and messages are shown immediately for zero-latency feel.
