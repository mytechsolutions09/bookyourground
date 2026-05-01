# Team Rating & Matchmaking System

This document outlines the design and implementation of the team rating system within the BookYourGround platform. The system is designed to facilitate high-quality matchmaking by providing clear visual indicators of team skill and performance.

## 1. Rating Components

### 1.1 Star Rating
- **Source**: Aggregated from post-match feedback provided by opposing captains.
- **Display**: A star icon followed by the average rating (e.g., 4.5).
- **Goal**: Reflects the overall behavior and reliability of the team.

### 1.2 Skill Levels
Teams are categorized into four primary skill levels to ensure balanced matches:
- **Pro** (`#1E293B`): Elite teams with high competitive experience.
- **Competitive** (`#01b854`): Strong teams looking for regular challenge.
- **Semi-Pro** (`#10B981`): Developing teams with moderate experience.
- **Amateur** (`#94A3B8`): Casual teams playing for recreation.

### 1.3 Win Rate
- **Calculation**: (Matches Won / Total Matches Played) * 100.
- **Display**: Shown as a percentage on the team card.

## 2. Matchmaking Benefits
- **Balanced Games**: Captains can filter or select opponents within their own skill bracket.
- **Expectation Management**: Knowing the rank and rating of an opponent helps teams prepare accordingly.
- **Reputation**: High-rated teams are more likely to get their match requests accepted.

## 3. Future Roadmap
- **Detailed Reviews**: Allow captains to leave text-based comments on opponents.
- **Leaderboards**: Monthly rankings based on wins and fair-play ratings.
- **Dynamic Skill Level**: Automatically adjust a team's skill level based on their performance against other ranked teams.
