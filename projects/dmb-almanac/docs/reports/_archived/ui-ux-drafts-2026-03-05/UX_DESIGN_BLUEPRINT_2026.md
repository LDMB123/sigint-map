# UX Design Blueprint - DMB Almanac 2026

## Design Summary
A task-first IA with summary-first entity pages that prioritize time-to-answer. Summary strips provide the first answer; deep stats are available via progressive disclosure. The design aligns with power-user needs without overwhelming casual users.

## User Context
- Primary personas:
  - Power Archivist: heavy stats usage, wants depth fast
  - Casual Explorer: wants quick answers and clarity
  - Newcomer: unfamiliar with terminology, needs guidance

## User Goals
- Confirm a show quickly.
- Understand a song's live history quickly.
- Track personal show history quickly.
- Save and share discoveries with minimal friction.

## Information Architecture
- Home: Search, Recent, This Day, My Shows, Highlights
- Core entities: Shows, Songs, Venues, Tours
- Secondary: Guests, Releases, Stats, About

## User Flow
1. Entry (Search or Recent) -> 2. Entity Summary -> 3. Deep Stats -> 4. Save/Share

### Happy Path
User searches for a show, lands on the summary strip, confirms date and venue, then drills into setlist if needed.

### Edge Cases
- No results: show suggestions and related matches.
- Offline: show cached summary and last updated date.
- Empty data: show clear fallback and alternate paths.

### Error States
- Data load fails: show error with retry and tips.
- Partial load: render summary strip first, stats later.

## Summary Strip Fields
- Show: Date, Venue, Tour, Song Count, Rarity, Last Updated
- Song: Total Plays, Last Played, Debut Date, Opener Count, Liberation Status
- Venue: Total Shows, First Show, Last Show, Top Song, City/State

## Wireframes (ASCII)

HOME
[Search bar]
[Recent Shows] [This Day] [Top Songs] [My Shows]
[Highlights strip]

RESULTS
[Search]
[Tabs: All | Shows | Songs | Venues]
[List rows with one-line summaries]

SHOW DETAIL
[Hero: date + venue]
[Summary strip]
[Save][Share]
[Tabs: Setlist | Stats | Guests | Notes]

## Interaction Specifications
- Summary strip expands with hover for metadata on desktop.
- Save button shows inline confirmation state.
- Search results use view transitions for continuity.

## Accessibility Considerations
- Summary strip uses semantic list (dl/dt/dd).
- Keyboard accessible tabs and accordions.
- Focus visible for all interactive elements.
- Reduced motion honored.

## Design Decisions & Rationale
- Summary-first to reduce cognitive load and improve time-to-answer.
- Progressive disclosure for power users without overwhelming casuals.
- Explicit provenance to build trust.

## UX Metrics
- Time to answer under 10 seconds.
- Completion rate above 90 percent.
- Confidence rating above 5/7.

## Next Steps
- Prototype summary-first detail pages.
- Validate via usability testing.
- Iterate summary fields based on insights.

## IA Map (Text)
- Home
  - Search
  - Recent Shows
  - This Day
  - Highlights
- Explore
  - Shows
  - Songs
  - Venues
  - Tours
  - Guests
- Library
  - Releases
  - Stats
  - About

## Screen Requirements (Summary)
| Screen | Must Answer | First Interaction |
| --- | --- | --- |
| Show Detail | Date + Venue + Tour + Setlist count | Setlist tab or share |
| Song Detail | Last played + total plays | View history |
| Venue Detail | Total shows + last show | View shows |
| Tour Detail | Number of shows + highlights | View shows |

## Disclosure Patterns
- Summary strip answers "what matters now."
- Tabs or accordions reveal deep stats.
- "More" links are label-specific (e.g., "View full setlist").

## Content Hierarchy
1. Title + primary identifiers
2. Summary strip (3–6 items)
3. Primary action cluster (save, share, add to shows)
4. Deep content: tabs or sections

## Microcopy Guidelines
- Dates always include month + day + year.
- Avoid "last played" without a date.
- Use "Unknown" only when data truly missing.

## Error & Empty States
- "No data yet" with next-step suggestions.
- Offline: show cached timestamp and invite refresh.
- Partial load: show summary immediately, stats later.
