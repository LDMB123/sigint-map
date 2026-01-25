# DMB Almanac PWA - Layout Templates & Visual Specifications
## Reference Layouts for Common Page Types

**Purpose:** Visual templates and specifications for common Almanac PWA layouts
**Use:** Reference while designing high-fidelity mockups and implementing components
**Last Updated:** January 19, 2026

---

## TEMPLATE 1: Homepage

### Layout Flow (Mobile-First)

```
╔════════════════════════════════╗
║    STICKY NAVIGATION (60px)    │
╚════════════════════════════════╝

┌────────────────────────────────┐
│                                │
│       HERO BANNER (300px)      │ ← cream bg (#faf8f3)
│                                │ ← DS Moster headline (32px)
│   "The Dave Matthews Band      │ ← subheading (16px)
│    Almanac"                    │
│                                │
│   Explore the complete history │ ← body text (14px)
│   of 30+ years of live music   │
│                                │
│   [Search Setlists] [Browse]   │ ← orange CTA buttons
│                                │
├────────────────────────────────┤
│ 🎵 [TAPE GRAPHIC TOP]          │
├────────────────────────────────┤
│   RECENT SETLISTS (Bluu Bold)  │ ← h2, 24px
│   (Browse the latest)           │ ← subtext, 14px gray
├────────────────────────────────┤
│                                │
│  ┌──────────────────────────┐  │
│  │   Setlist Card           │  │ ← 280px width
│  │   Red Rocks              │  │
│  │   May 15, 2024           │  │
│  │   ○ Set I ○ Set II       │  │
│  │   [View Setlist]         │  │ ← orange button
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │   Setlist Card           │  │
│  │   Alpine Valley           │  │
│  │   July 20, 2024          │  │
│  │   ○                      │  │
│  │   [View Setlist]         │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │ ← Full-width single column
│  │   Setlist Card           │  │    on mobile
│  │   Blossom Music Center   │  │
│  │   Aug 2-3, 2024          │  │
│  │   ○ ○                    │  │
│  │   [View Setlist]         │  │
│  └──────────────────────────┘  │
│                                │
│                  [View All →]   │ ← text link, orange
│                                │
├────────────────────────────────┤
│ [TAPE GRAPHIC BOTTOM]          │
├────────────────────────────────┤

┌────────────────────────────────┐
│ 🎵 [TAPE GRAPHIC TOP]          │
├────────────────────────────────┤
│   TOUR TIMELINE (Bluu Bold)    │ ← h2, 24px
│   (Upcoming & Recent)          │
├────────────────────────────────┤
│                                │
│   2024 TOUR                    │ ← DS Moster, 20px
│   ━━━━━━━━━━━━━━━━━━━━━━━━   │
│   June 12-14                   │ ← Bluu Bold 16px
│   Red Rocks Amphitheatre       │
│   Morrison, CO                 │ ← body gray
│   [Photos] [Tickets]           │ ← CTA buttons
│                                │
│   July 20                      │
│   Alpine Valley Music Theatre  │
│   East Troy, WI                │
│   [Setlist] [Tickets]          │
│                                │
│   August 2-3                   │
│   Blossom Music Center         │
│   Cuyahoga Falls, OH           │
│   [Setlist] [Tickets]          │
│                                │
│                  [See Full →]   │
│                                │
├────────────────────────────────┤
│ [TAPE GRAPHIC BOTTOM]          │
├────────────────────────────────┤

┌────────────────────────────────┐
│ 🎵 [TAPE GRAPHIC TOP]          │
├────────────────────────────────┤
│   THIS YEAR IN DMB HISTORY     │ ← h2, 24px
│   (Selected Anniversaries)     │
├────────────────────────────────┤
│                                │
│   1994 - First Show Together   │ ← Special Elite, 13px
│   A night that changed music   │
│   forever in Athens, GA        │
│   [Explore Timeline →]         │ ← orange link
│                                │
│   ──────────────────────────   │ ← divider
│                                │
│   2000 - Busted Stuff Release  │ ← milestone year
│   A turning point in the       │
│   band's sonic evolution       │
│   [Learn More →]               │
│                                │
│   ──────────────────────────   │
│                                │
│   2015 - Warehouse Founded     │ ← community milestone
│   Bringing fans closer         │
│   [About the Warehouse →]      │
│                                │
│                  [Full Timeline]│
│                                │
├────────────────────────────────┤
│ [TAPE GRAPHIC BOTTOM]          │
├────────────────────────────────┤

┌────────────────────────────────┐
│ NEWSLETTER SIGNUP (cream bg)   │ ← #f5f1e8
│                                │
│ Stay in the Loop              │ ← Bluu Bold, 20px
│ Weekly setlist updates &      │ ← body text, 14px
│ band news                      │
│                                │
│ [Email input] [Sign Up →]      │ ← orange CTA
│                                │
└────────────────────────────────┘

┌────────────────────────────────┐
│  FOOTER (dark bg #3a3a3a)      │
│                                │
│  Links | Social | About | FAQ  │
│  Copyright & Legal             │
│                                │
└────────────────────────────────┘
```

### Desktop Layout (1024px+)

```
╔════════════════════════════════════════════════╗
║          STICKY NAVIGATION (60px)              │
╚════════════════════════════════════════════════╝

┌────────────────────────────────────────────────┐
│                                                │
│            HERO BANNER (400px height)          │ ← full-width
│                                                │
│    The Dave Matthews Band Almanac              │ ← DS Moster 56px
│    Explore 30+ years of music history          │ ← body 16px
│                                                │
│    [Search Setlists] [Browse Archive]          │ ← side-by-side buttons
│                                                │
├────────────────────────────────────────────────┤
│ 🎵 [TAPE GRAPHIC] ← RECENT SETLISTS → [TAPE]   │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────┐ │
│  │ Setlist Card │  │ Setlist Card │  │ Card │ │ ← 3-column grid
│  │ Red Rocks    │  │ Alpine Valley│  │      │ │
│  │ [View]       │  │ [View]       │  │      │ │
│  └──────────────┘  └──────────────┘  └──────┘ │
│                                                │
│                      [View All →]              │ ← center aligned
│                                                │
├────────────────────────────────────────────────┤
│ [TAPE GRAPHIC] ← TOUR TIMELINE → [TAPE GRAPHIC]│
├────────────────────────────────────────────────┤
│  2024                    2023                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │ ← 2-col timeline
│  June 12-14              June 10-12           │
│  Red Rocks               Alpine Valley        │
│  [Tickets]               [Tickets]            │
│                                                │
│  July 20                 July 15               │
│  Alpine Valley           Red Rocks            │
│  [Setlist]               [Setlist]            │
│                                                │
│  Aug 2-3                 Aug 5                 │
│  Blossom                 Blossom              │
│  [Setlist]               [Setlist]            │
│                                                │
├────────────────────────────────────────────────┤

┌────────────────────────────────────────────────┐
│                                                │
│            THIS YEAR IN DMB HISTORY            │
│         (Timeline with Anniversary Markers)    │
│                                                │
│  ◆ 1994                                        │ ← diamond marker
│  First Show Together                           │ ← Special Elite
│  Athens, GA — A moment that changed music   │
│  [Timeline →]                                  │
│                                                │
│  ◆ 2000                                        │
│  Busted Stuff Release                          │
│  Evolution of the band's sound                 │
│  [Learn More →]                                │
│                                                │
│  ◆ 2015                                        │
│  Warehouse Founded                             │
│  Community at the center                       │
│  [Warehouse Info →]                            │
│                                                │
│  ◆ Recent Show                                 │
│  May 15, 2024 — Red Rocks                      │
│  [View Setlist →]                              │
│                                                │
│                    [Full Timeline]             │
│                                                │
├────────────────────────────────────────────────┤

┌────────────────────────────────────────────────┐
│             NEWSLETTER SIGNUP                  │ ← beige bg #f5f1e8
│    ┌─────────────────────────────────────┐    │
│    │ Stay in the Loop                    │    │
│    │ Get weekly setlist updates & news   │    │
│    │                                     │    │
│    │ [Email input___________] [Sign Up] │    │ ← orange CTA
│    └─────────────────────────────────────┘    │
│                                                │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ FOOTER (dark bg, 3-column layout)              │
│                                                │
│ Band Links | Community | Support               │
│ Tour Info  | Warehouse | About                │
│ Shop       | FAQ       | Contact              │
│                                                │
│ [Social Icons] ← centered at bottom           │
│ Copyright © 2026 Dave Matthews Band            │
│                                                │
└────────────────────────────────────────────────┘
```

---

## TEMPLATE 2: Setlists Archive Page

### Mobile Layout (320–767px)

```
╔════════════════════════════════╗
║    STICKY NAVIGATION           │
╚════════════════════════════════╝

┌────────────────────────────────┐
│   SETLISTS (DS Moster, 32px)   │ ← page title
│   Browse the complete archive  │ ← subtext
│                                │
│   [Filter: Year ▼]            │ ← dropdown
│   [Filter: Venue ▼]           │
│   [Search ___________]        │ ← search input
│                                │
└────────────────────────────────┘

┌────────────────────────────────┐
│ 2024 (Bluu Bold, 20px)         │ ← year header
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ ← divider
│                                │
│  ┌──────────────────────────┐  │
│  │ Red Rocks Amphitheatre   │  │ ← setlist card
│  │ Morrison, CO             │  │
│  │ June 12–14, 2024         │  │ ← Special Elite
│  │                          │  │
│  │ Set I:                   │  │
│  │ 1. All Along Watchtower  │  │
│  │ 2. Don't Drink Water     │  │
│  │ 3. Pantala Naga Pampa    │  │
│  │                          │  │
│  │ Intermission             │  │ ← italicized
│  │                          │  │
│  │ Set II:                  │  │
│  │ 1. Ants Marching         │  │
│  │ 2. Seven                 │  │
│  │ 3. Jimi Thing            │  │
│  │                          │  │
│  │ Encore:                  │  │
│  │ 1. Two Step              │  │
│  │                          │  │
│  │ [View Full] [Share]      │  │ ← CTA buttons
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ Alpine Valley Music      │  │
│  │ Theatre                  │  │
│  │ East Troy, WI            │  │
│  │ July 20, 2024            │  │
│  │ [View Full] [Share]      │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ Blossom Music Center     │  │
│  │ Cuyahoga Falls, OH       │  │
│  │ Aug 2–3, 2024            │  │
│  │ [View Full] [Share]      │  │
│  └──────────────────────────┘  │
│                                │
│            [Load More ▼]        │ ← load more button
│                                │
└────────────────────────────────┘

┌────────────────────────────────┐
│ 2023 (Bluu Bold, 20px)         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [Setlist Cards]          │  │
│  │ [continue same pattern]  │  │
│  └──────────────────────────┘  │
│                                │
└────────────────────────────────┘

[Pagination: 1 2 3 ... 42]
```

### Desktop Layout (1024px+)

```
╔════════════════════════════════════════════════╗
║          STICKY NAVIGATION                     │
╚════════════════════════════════════════════════╝

Breadcrumb: Home / Setlists / [Current Filter]

┌────────────────────────────────────────────────┐
│                                                │
│  SETLISTS (DS Moster, 48px)                    │
│  Browse concert archive by year, venue, song   │ ← 14px gray
│                                                │
│  Filters: [Year ▼] [Venue ▼] [Tour ▼] [Song ▼]│
│  [Search: __________________________] [X]      │
│                                                │
├────────────────────────────────────────────────┤

2024 Tour
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────┐ ┌──────────────────┐ ┌────┐
│ Red Rocks        │ │ Alpine Valley    │ │    │ ← 3-column
│ Morrison, CO     │ │ East Troy, WI    │ │    │ grid layout
│ June 12–14       │ │ July 20          │ │    │
│ ○ ○ ○            │ │ ○                │ │    │
│ [View Setlist]   │ │ [View Setlist]   │ │    │
└──────────────────┘ └──────────────────┘ └────┘

┌──────────────────┐ ┌──────────────────┐
│ Blossom          │ │ Red Rocks        │ ← 4th card on
│ Cuyahoga Falls   │ │ Morrison, CO     │ new row
│ Aug 2–3          │ │ Sept 15          │
│ ○ ○              │ │ ○                │
│ [View Setlist]   │ │ [View Setlist]   │
└──────────────────┘ └──────────────────┘

                    [Load More ↓]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2023 Tour
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Same 3-column layout]

Pagination: 1 2 3 ... 42
             Previous | Next
```

---

## TEMPLATE 3: Individual Setlist Detail Page

### Mobile Layout

```
╔════════════════════════════════╗
║    STICKY NAVIGATION           │
╚════════════════════════════════╝

Breadcrumb: Home / Setlists / 2024 / Red Rocks

┌────────────────────────────────┐
│                                │
│      [Hero Image: Red Rocks]   │ ← 4:3 aspect
│      (concert photo)           │ ← warm color grading
│                                │
└────────────────────────────────┘

┌────────────────────────────────┐
│                                │
│ Red Rocks Amphitheatre         │ ← Bluu Bold 22px
│ Morrison, Colorado             │ ← body text 14px
│                                │
│ Thursday, May 15, 2024         │ ← Special Elite 13px
│ Capacity: 9,500 | Weather: 65° │ ← meta info
│                                │
│ SET I:                         │ ← Bluu Bold, uppercase
│ 1. All Along the Watchtower    │ ← body text 14px
│ 2. Don't Drink the Water       │
│ 3. Pantala Naga Pampa          │
│ 4. Seven                       │
│                                │
│ Intermission                   │ ← italic
│ (approx 20 min)                │
│                                │
│ SET II:                        │
│ 1. Ants Marching               │
│ 2. Jimi Thing                  │
│ 3. The Riff                    │
│ 4. Two Step                    │
│ 5. Pig                         │
│                                │
│ ENCORE:                        │
│ 1. Drive In, Drive Out         │
│                                │
│ Total Runtime: 2h 45m          │ ← meta
│ Total Songs: 12                │
│                                │
├────────────────────────────────┤
│ FAN NOTES (Special Elite 13px) │
│ "The Watchtower jam was        │
│  magical. Stefan's slide work  │
│  was incredible. The crowd     │
│  sang along on Two Step."      │
│                                │
│ – Sarah M., Kansas City        │
│                                │
├────────────────────────────────┤
│ TOUR CONTEXT (Bluu Bold 16px)  │
│ Part of the 2024 Summer Tour   │
│ [See other '24 shows →]        │
│                                │
├────────────────────────────────┤
│ MORE LIVE RECORDINGS           │ ← section
│                                │
│ [Audio: Full Show]             │ ← clickable
│ Length: 2:45 | Size: 450MB     │
│ [Listen] [Download] [Share]    │
│                                │
│ [Audio: Set I Only]            │
│ [Listen] [Download] [Share]    │
│                                │
│ [Video: Highlights]            │
│ Length: 15:30                  │
│ [Watch] [Share]                │
│                                │
├────────────────────────────────┤
│ SONG HISTORY (Bluu Bold 16px)  │
│                                │
│ ALL ALONG THE WATCHTOWER       │ ← song played
│ First played: 1995 | 600+ times│
│ Original: Bob Dylan            │
│ [View all performances →]      │
│                                │
├────────────────────────────────┤
│                                │
│ [← Previous Show] [Next Show →]│ ← navigation
│                                │
├────────────────────────────────┤
│ SHARE THIS SETLIST             │
│ [Facebook] [Twitter] [Copy Link]│
│                                │
└────────────────────────────────┘
```

### Desktop Layout (1024px+)

```
[Header & Navigation as usual]

Breadcrumb: Home / Setlists / 2024 / Red Rocks

┌────────────────────────────────────────────────┐
│                                                │
│      [Hero Image: Red Rocks - Full Width]      │ ← 16:9 aspect
│      400px height, concert photo               │ ← warm tones
│                                                │
└────────────────────────────────────────────────┘

┌─────────────────────────┬──────────────────────┐
│ LEFT COLUMN (70%)       │ RIGHT COLUMN (30%)   │
├─────────────────────────┼──────────────────────┤
│                         │                      │
│ Red Rocks Amphitheatre  │ SETLIST STATS        │
│ Morrison, Colorado      │ ━━━━━━━━━━━━━━━━   │
│ Thursday, May 15, 2024  │ Total Runtime:      │
│                         │ 2 hours, 45 minutes │
│ Capacity: 9,500         │                      │
│ Weather: Clear, 65°F    │ Total Songs: 12     │
│                         │                      │
│ SET I:                  │ Avg Set Length:     │
│ 1. All Along Watchtower │ 36 min per set      │
│ 2. Don't Drink Water    │                      │
│ 3. Pantala Naga Pampa   │ TOUR CONTEXT        │
│ 4. Seven                │ ━━━━━━━━━━━━━━━━   │
│                         │ 2024 Summer Tour    │
│ Intermission            │ 25 shows scheduled  │
│ (approx 20 min)         │ [See All →]         │
│                         │                      │
│ SET II:                 │ ARTIST CREDITS      │
│ 1. Ants Marching        │ ━━━━━━━━━━━━━━━━   │
│ 2. Jimi Thing           │ Dave Matthews       │
│ 3. The Riff             │ Vocals, Guitar      │
│ 4. Two Step             │                      │
│ 5. Pig                  │ Stefan Lessard      │
│                         │ Bass                │
│ ENCORE:                 │                      │
│ 1. Drive In, Drive Out  │ [More Credits →]   │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│ FAN NOTES (full width, centered)               │
│ ┌──────────────────────────────────────────┐  │
│ │ "The Watchtower jam was absolutely       │  │
│ │  magical. Stefan's slide work was some   │  │
│ │  of the best I've heard. The crowd sang  │  │
│ │  along on Two Step. Perfect night."      │  │
│ │                                          │  │
│ │ – Sarah M., Kansas City, MO              │  │
│ └──────────────────────────────────────────┘  │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ LIVE RECORDINGS                                │
│                                                │
│ Full Show Audio                                │
│ Length: 2:45 | Format: FLAC | Size: 450MB    │
│ [🔊 Listen] [⬇ Download] [↗ Share]            │
│ (Recorded by: [engineer name])                 │
│                                                │
│ Set I Only                                     │
│ Length: 1:22 | Format: FLAC | Size: 210MB    │
│ [🔊 Listen] [⬇ Download] [↗ Share]            │
│                                                │
│ Highlights Video (YouTube Playlist)            │
│ [▶ Watch] [↗ Share]                            │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ SONG HISTORY                                   │
│                                                │
│ ALL ALONG THE WATCHTOWER                       │
│ Original Artist: Bob Dylan (1967)              │
│ First Played by DMB: 1995 (Athens, GA)        │
│ Times Played: 600+ shows                       │
│ [View all performances →]                      │
│                                                │
│ DON'T DRINK THE WATER                         │
│ Original Artist: Dave Matthews Band            │
│ Written: 1997                                  │
│ Times Played: 800+ shows                       │
│ [View all performances →]                      │
│                                                │
│ [More Song Details →]                          │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ [← Previous Show: Alpine Valley July 19]       │
│ [Next Show: Blossom Aug 2 →]                  │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ SHARE THIS SETLIST                             │
│ [f Facebook] [𝕏 Twitter] [📋 Copy Link]       │
│                                                │
└────────────────────────────────────────────────┘
```

---

## TEMPLATE 4: Tour Overview Page

### Layout Structure

```
╔════════════════════════════════════════════════╗
║          STICKY NAVIGATION                     │
╚════════════════════════════════════════════════╝

Breadcrumb: Home / Tours / 2024 Summer Tour

┌────────────────────────────────────────────────┐
│                                                │
│     2024 SUMMER TOUR (DS Moster, 48px)        │
│     [Hero Image: Stage at Festival]           │ ← 16:9, 400px
│                                                │
│     June 12 – September 30, 2024              │ ← Special Elite 14px
│     25 Shows | 5 Months | Across North America│
│                                                │
│     [Buy Tickets] [Add to Calendar]           │ ← CTA buttons
│                                                │
├────────────────────────────────────────────────┤
│ TOUR STATISTICS (Bluu Bold, 20px)             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                │
│ Total Attendance: 300,000+                    │
│ Gross Revenue: $45M                           │
│ Average Rating: 4.8/5 stars                   │
│ Average Set Length: 2h 45m                    │
│                                                │
├────────────────────────────────────────────────┤
│ TOUR HIGHLIGHTS (Bluu Bold, 20px)             │
│                                                │
│ ✦ Red Rocks Amphitheatre (3 nights)          │ ← special dates
│ ✦ Return to Alpine Valley (home turf)        │
│ ✦ New Venue: Acrisure Stadium                │
│ ✦ Record Attendance at Forest Hills          │
│                                                │
├────────────────────────────────────────────────┤
│ SCHEDULE (3-column on desktop, 1 on mobile)  │
│                                                │
│ JUNE                                           │ ← month header
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                │
│ ┌──────────────────┐ ┌─────────────────┐    │
│ │ Red Rocks        │ │ Red Rocks       │    │
│ │ Morrison, CO     │ │ Morrison, CO    │    │
│ │ Fri, Jun 12      │ │ Sat, Jun 13     │    │
│ │ Venue Capacity   │ │ Venue Capacity  │    │
│ │ 9,500            │ │ 9,500           │    │
│ │ [View Setlist]   │ │ [View Setlist]  │    │
│ │ [Buy Tickets]    │ │ [Buy Tickets]   │    │
│ │ Status: Sold Out │ │ Status: Sold Out│   │
│ └──────────────────┘ └─────────────────┘    │
│                                                │
│ ┌──────────────────┐                          │
│ │ Red Rocks        │                          │
│ │ Morrison, CO     │                          │
│ │ Sun, Jun 14      │                          │
│ │ [View Setlist]   │                          │
│ │ [Buy Tickets]    │                          │
│ │ Status: Sold Out │                          │
│ └──────────────────┘                          │
│                                                │
│ JULY                                           │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│ [Continue layout]                             │
│                                                │
├────────────────────────────────────────────────┤
│ TOUR INFORMATION (Bluu Bold, 20px)            │
│                                                │
│ Travel Amenities:                             │ ← Special Elite 13px
│ All tour stops include accessible parking,    │
│ wheelchair accessible seating, and            │
│ shuttle services. Full details at each venue. │
│                                                │
│ Parking & Transportation:                     │
│ We recommend arriving early. Parking info     │
│ and transit options available on each         │
│ venue page.                                   │
│                                                │
│ Setlist Archive:                              │
│ Every show's setlist will be updated within  │
│ 1 hour of encore ending. [Browse Archive]    │
│                                                │
├────────────────────────────────────────────────┤
│ TOUR GALLERY                                   │
│                                                │
│ [Photo Grid: 3-column on desktop]             │
│ [6-12 photos from tour]                       │
│ [Load More Photos →]                          │
│                                                │
├────────────────────────────────────────────────┤
│ RELATED TOURS                                  │
│ [2023 Summer Tour] [2022 Summer Tour]        │ ← linked tours
│ [2024 Fall Tour]                              │
│                                                │
└────────────────────────────────────────────────┘
```

---

## TEMPLATE 5: Search Results Page

```
╔════════════════════════════════════════════════╗
║          STICKY NAVIGATION                     │
╚════════════════════════════════════════════════╝

┌────────────────────────────────────────────────┐
│                                                │
│ SEARCH RESULTS (Bluu Bold, 28px)              │
│                                                │
│ Query: "All Along the Watchtower"             │ ← user's search
│ [Search: __________________________] [X]      │ ← search box
│                                                │
│ Results: 247 matches                          │ ← result count
│                                                │
├────────────────────────────────────────────────┤
│ FILTERS (left sidebar on desktop)             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│ Content Type:                                  │
│ ☐ Setlist (42 results)                       │
│ ☐ Tour Info (8 results)                      │
│ ☐ News/Article (5 results)                   │
│ ☐ Photo (192 results)                        │
│ ☐ Song Info (1 result)                       │
│                                                │
│ Date Range:                                    │
│ [1994-1999] [2000-2009] [2010-2019] [2020+]  │
│                                                │
│ Venue:                                         │
│ [Red Rocks] [Alpine Valley] [Forest Hills]   │
│                                                │
├────────────────────────────────────────────────┤
│ RESULTS (main content area)                   │
│                                                │
│ SONG: All Along The Watchtower               │ ← result type
│ Original by Bob Dylan (1967)                 │
│ First Played by DMB: 1995                    │
│ Total Performances: 600+                     │
│ [View Song History →]                         │
│                                                │
│ ─────────────────────────────────────────── │ ← divider
│                                                │
│ SETLIST: Red Rocks - May 15, 2024            │ ← result type
│ Set I, Song 1                                 │
│ [View Full Setlist →]                        │
│                                                │
│ ─────────────────────────────────────────── │
│                                                │
│ SETLIST: Alpine Valley - July 19, 2023       │
│ Set I, Song 3                                 │
│ [View Full Setlist →]                        │
│                                                │
│ [Load More Results ↓]                         │
│                                                │
└────────────────────────────────────────────────┘
```

---

## TEMPLATE 6: User Profile / Favorite Setlists

```
╔════════════════════════════════════════════════╗
║          STICKY NAVIGATION                     │
╚════════════════════════════════════════════════╝

┌────────────────────────────────────────────────┐
│                                                │
│ MY SETLIST FAVORITES (Bluu Bold, 28px)        │
│ (Warehouse Feature)                           │ ← Special Elite 13px
│                                                │
│ You've bookmarked 24 setlists                 │
│                                                │
│ Sort by: [Date Added ▼] [Rating ▼]           │ ← dropdowns
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ ★★★★★                                    │  │ ← rating
│ │ Red Rocks - May 15, 2024                 │  │
│ │ "Best show I've ever been to"            │  │
│ │                                          │  │
│ │ [View] [Edit Note] [Delete] [Share]      │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ ★★★★★                                    │  │
│ │ Alpine Valley - July 20, 2023            │  │
│ │ "Stefan's bass solo was incredible"      │  │
│ │                                          │  │
│ │ [View] [Edit Note] [Delete] [Share]      │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ ┌──────────────────────────────────────────┐  │
│ │ ★★★★☆                                    │  │
│ │ Forest Hills - August 5, 2022            │  │
│ │ [View] [Edit Note] [Delete] [Share]      │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│                    [Load More ↓]              │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Color Application Examples

### Example 1: Card Component in Context

```
┌─────────────────────────────────┐
│  Background: #faf8f3 (cream)    │
│  Border: 1px solid #e0d8cc      │
│  Shadow: 0 2px 8px rgba(0,0,0,0.1) │
│                                 │
│  HEADLINE (Bluu Bold)           │ ← color: #000000
│  #1e3a5f Text Link →            │ ← hover: color #d97706
│                                 │
│  Body text (sans-serif)         │ ← color: #2d2d2d
│  Secondary info in gray         │ ← color: #666666
│                                 │
│                 [Orange Button] │ ← bg: #d97706
│                                 │
│ Hover State:                    │
│ Shadow: 0 4px 12px rgba(0,0,0,0.15) │
│ Button bg: #c9600f              │
└─────────────────────────────────┘
```

### Example 2: Text Hierarchy on Cream Background

```
Contrast Validation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Black #000000 on Cream #faf8f3:     21:1 ✓✓✓ Excellent
Dark Gray #2d2d2d on Cream #faf8f3: 10:1 ✓✓ Excellent
Medium Gray #666666 on Cream:        5:1 ✓ Acceptable
Light Gray #999999 on Cream:         2:1 ✗ Too low
Orange #d97706 on White (for button): 8:1 ✓ Good
```

---

## Spacing Examples

### Section Spacing

```
┌─────────────────────────────────┐
│                                 │
│    Content (16px padding)       │ ← card padding
│                                 │
├─────────────────────────────────┤

  48px vertical gap               ← section spacing

├─────────────────────────────────┤
│                                 │
│    Next Section Content         │ ← 48px from previous
│                                 │
└─────────────────────────────────┘
```

### Card Grid Spacing

```
[Card]  12px  [Card]  12px  [Card]
         gap           gap

Top/Bottom cards: 12px gap

On tablet (2-column):
[Card]    16px    [Card]

On desktop (3-column):
[Card]  20px  [Card]  20px  [Card]
```

---

## Responsive Breakpoint Behavior

### Mobile (320–767px)
- Single-column layout
- Full-width cards with 16px padding
- Hamburger navigation
- Stacked buttons
- Image aspect: 4:3

### Tablet (768–1023px)
- 2-column layout for cards
- Navigation can be horizontal or hamburger
- Tablet-sized form inputs
- Image aspect: 4:3

### Desktop (1024–1439px)
- 3-column layout for cards
- Full horizontal navigation
- Side-by-side buttons
- Full-width sections max 1400px
- Image aspect: 16:9 for hero

### Large (1440px+)
- 4-column layout (if content supports)
- Same navigation and spacing as desktop
- Content constrained to 1440px max-width

---

**These templates provide the foundational layout patterns for the DMB Almanac PWA. Reference them when designing new page types, and ensure all new layouts follow these spacing, color, and typography conventions.**

**Version:** 1.0 | **Updated:** January 19, 2026
