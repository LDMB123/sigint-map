# Share Target Flow Diagrams

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Mobile Device                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐         ┌──────────────┐                 │
│  │  Browser/App  │         │  DMB Almanac │                 │
│  │    (Source)   │         │     PWA      │                 │
│  └───────┬───────┘         └──────┬───────┘                 │
│          │                        │                          │
│          │  1. User selects text  │                          │
│          │     "2024-09-13"       │                          │
│          ├────────────────────────┤                          │
│          │                        │                          │
│          │  2. Taps Share         │                          │
│          ├────────────────────────┤                          │
│          │                        │                          │
│          │  3. Selects            │                          │
│          │     "DMB Almanac"      │                          │
│          ├───────────────────────>│                          │
│          │                        │                          │
│          │                        │  4. Opens PWA            │
│          │                        │     /search?source=share │
│          │                        │     &q=2024-09-13        │
│          │                        ├──────────┐               │
│          │                        │          │               │
│          │                        │  5. Parse content        │
│          │                        │<─────────┘               │
│          │                        │                          │
│          │                        │  6. Detect: show date    │
│          │                        │     High confidence      │
│          │                        ├──────────┐               │
│          │                        │          │               │
│          │                        │  7. Redirect to          │
│          │                        │     /shows/2024-09-13    │
│          │                        │<─────────┘               │
│          │                        │                          │
│          │                        ▼                          │
│          │                  Show Page                        │
│          │                  Displayed                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Processing Flow

```
User shares text to PWA
          │
          ▼
┌─────────────────────────┐
│ PWA Opens at:           │
│ /search?source=share    │
│         &q={text}       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Search Page Detects     │
│ source=share parameter  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Parse Shared Content    │
│ parseShareContent(text) │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ Priority Check│
    └───────┬───────┘
            │
  ┌─────────┴─────────┐
  │                   │
  ▼                   ▼
URL?              Date Pattern?
  │                   │
  │ Yes               │ Yes
  ▼                   ▼
Extract ID        Parse Date
  │                   │
  └────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Not found?   │
    └──────┬───────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
   Song?      Venue?
     │           │
     │ Yes       │ Yes
     ▼           ▼
  Get Slug   Get Name
     │           │
     └─────┬─────┘
           │
           ▼
    ┌──────────────┐
    │ Still none?  │
    └──────┬───────┘
           │
           ▼
    Generic Search
           │
           ▼
┌─────────────────────────┐
│ Determine Confidence    │
│ - high: URL/date        │
│ - medium: song/venue    │
│ - low: generic          │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ Confidence?   │
    └───────┬───────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
  HIGH            LOW/MEDIUM
    │                │
    ▼                ▼
Show Loading    Show Search
Indicator       Results
    │                │
    ▼                │
Wait 800ms          │
    │                │
    ▼                │
Auto Redirect       │
to Target           │
    │                │
    └────────┬───────┘
             │
             ▼
        User sees
      relevant page
```

## Parser Decision Tree

```
                        Input Text
                            │
                            ▼
                    ┌───────────────┐
                    │ Sanitize &    │
                    │ Normalize     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Check for URL │
                    └───────┬───────┘
                            │
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
                  YES              NO
                    │               │
                    │               ▼
                    │       ┌───────────────┐
                    │       │ Check ISO Date│
                    │       │ (YYYY-MM-DD)  │
                    │       └───────┬───────┘
                    │               │
                    │       ┌───────┴───────┐
                    │       │               │
                    │       ▼               ▼
                    │     YES              NO
                    │       │               │
                    │       │               ▼
                    │       │       ┌───────────────┐
                    │       │       │ Check Long    │
                    │       │       │ Date Format   │
                    │       │       └───────┬───────┘
                    │       │               │
                    │       │       ┌───────┴───────┐
                    │       │       │               │
                    │       │       ▼               ▼
                    │       │     YES              NO
                    │       │       │               │
                    │       │       │               ▼
                    │       │       │       ┌───────────────┐
                    │       │       │       │ Check US Date │
                    │       │       │       └───────┬───────┘
                    │       │       │               │
                    │       │       │       ┌───────┴───────┐
                    │       │       │       │               │
                    │       │       │       ▼               ▼
                    │       │       │     YES              NO
                    │       │       │       │               │
                    │       │       │       │               ▼
                    │       │       │       │       ┌───────────────┐
                    │       │       │       │       │ Check Quoted  │
                    │       │       │       │       │ Song Title    │
                    │       │       │       │       └───────┬───────┘
                    │       │       │       │               │
                    │       │       │       │       ┌───────┴───────┐
                    │       │       │       │       │               │
                    │       │       │       │       ▼               ▼
                    │       │       │       │     YES              NO
                    │       │       │       │       │               │
                    │       │       │       │       │               ▼
                    │       │       │       │       │       ┌───────────────┐
                    │       │       │       │       │       │ Check Known   │
                    │       │       │       │       │       │ Song Title    │
                    │       │       │       │       │       └───────┬───────┘
                    │       │       │       │       │               │
                    │       │       │       │       │       ┌───────┴───────┐
                    │       │       │       │       │       │               │
                    │       │       │       │       │       ▼               ▼
                    │       │       │       │       │     YES              NO
                    │       │       │       │       │       │               │
                    │       │       │       │       │       │               ▼
                    │       │       │       │       │       │       ┌───────────────┐
                    │       │       │       │       │       │       │ Check Known   │
                    │       │       │       │       │       │       │ Venue         │
                    │       │       │       │       │       │       └───────┬───────┘
                    │       │       │       │       │       │               │
                    │       │       │       │       │       │       ┌───────┴───────┐
                    │       │       │       │       │       │       │               │
                    │       │       │       │       │       │       ▼               ▼
                    │       │       │       │       │       │     YES              NO
                    │       │       │       │       │       │       │               │
                    │       │       │       │       │       │       │               ▼
                    │       │       │       │       │       │       │       ┌───────────────┐
                    │       │       │       │       │       │       │       │ Check Venue   │
                    │       │       │       │       │       │       │       │ Pattern       │
                    │       │       │       │       │       │       │       └───────┬───────┘
                    │       │       │       │       │       │       │               │
                    │       │       │       │       │       │       │       ┌───────┴───────┐
                    │       │       │       │       │       │       │       │               │
                    │       │       │       │       │       │       │       ▼               ▼
                    │       │       │       │       │       │       │     YES              NO
                    │       │       │       │       │       │       │       │               │
                    ▼       ▼       ▼       ▼       ▼       ▼       ▼       ▼               ▼
                ┌────────────────────────────────────────────────────────────────┐
                │                                                                 │
                ▼                                                                 ▼
          type: 'show'                                                    type: 'search'
          confidence: 'high'                                              confidence: 'low'
          value: {showId}                                                 value: {originalText}
                │                                                                 │
                └─────────────────────────┬───────────────────────────────────────┘
                                          │
                                          ▼
                                   Return Result
                                          │
                                          ▼
                                  getTargetUrl()
                                          │
                                          ▼
                                   Navigate User
```

## User Experience Flows

### Flow 1: High Confidence Show Date

```
User Action: Share "2024-09-13" from Messages
           │
           ▼
┌──────────────────────┐
│ DMB Almanac Opens    │
│ Search page visible  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Loading Indicator    │
│ "Processing shared   │
│  content"            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Message Shows        │
│ "Viewing show from   │
│  2024-09-13"         │
└──────────┬───────────┘
           │
           ▼ (800ms delay)
┌──────────────────────┐
│ Redirect to          │
│ /shows/2024-09-13    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Show Page Displays   │
│ - Venue info         │
│ - Setlist            │
│ - Notes              │
└──────────────────────┘

Total Time: ~900ms
```

### Flow 2: Medium Confidence Song

```
User Action: Share "Crash Into Me was amazing!" from Twitter
           │
           ▼
┌──────────────────────┐
│ DMB Almanac Opens    │
│ Search page visible  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Loading Indicator    │
│ "Processing shared   │
│  content"            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Message Shows        │
│ "Searching for song: │
│  Crash Into Me"      │
└──────────┬───────────┘
           │
           ▼ (800ms delay)
┌──────────────────────┐
│ Redirect to          │
│ /songs/crash-into-me │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Song Page Displays   │
│ - Performance stats  │
│ - Recent plays       │
│ - Lyrics             │
└──────────────────────┘

Total Time: ~900ms
```

### Flow 3: Low Confidence Generic Text

```
User Action: Share "Dave Matthews Band tour dates" from Notes
           │
           ▼
┌──────────────────────┐
│ DMB Almanac Opens    │
│ Search page visible  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ No Loading Indicator │
│ (low confidence)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Search Results Show  │
│ - Matching songs     │
│ - Matching venues    │
│ - Matching shows     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ User Browses Results │
│ or Refines Search    │
└──────────────────────┘

Total Time: ~100ms (no redirect)
```

## Error Handling Flow

```
User shares invalid/unexpected content
           │
           ▼
┌──────────────────────┐
│ Parser Attempts      │
│ Content Detection    │
└──────────┬───────────┘
           │
           ▼
     ┌─────────────┐
     │ Valid Input?│
     └──────┬──────┘
            │
    ┌───────┴────────┐
    │                │
    ▼                ▼
  YES               NO
    │                │
    │                ▼
    │       ┌────────────────┐
    │       │ Return Unknown │
    │       │ Type + Low     │
    │       │ Confidence     │
    │       └────────┬───────┘
    │                │
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐
    │ Fallback to    │
    │ Generic Search │
    └────────┬───────┘
             │
             ▼
    ┌────────────────┐
    │ Show Search    │
    │ Results or     │
    │ Empty State    │
    └────────────────┘
```

## State Diagram

```
    ┌─────────┐
    │ Initial │
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ Waiting │◄──────────┐
    └────┬────┘           │
         │                │
         │ Share Action   │
         │                │
         ▼                │
  ┌────────────┐          │
  │ Processing │          │
  └─────┬──────┘          │
        │                 │
        │ Parse Complete  │
        │                 │
        ▼                 │
   ┌──────────┐           │
   │Confidence│           │
   │  Check   │           │
   └────┬─────┘           │
        │                 │
   ┌────┴─────┐           │
   │          │           │
   ▼          ▼           │
┌──────┐  ┌──────┐        │
│ High │  │ Low  │        │
└──┬───┘  └───┬──┘        │
   │          │           │
   ▼          │           │
┌──────┐      │           │
│ Show │      │           │
│ Load │      │           │
│ State│      │           │
└──┬───┘      │           │
   │          │           │
   ▼          │           │
┌──────┐      │           │
│ Wait │      │           │
│ 800ms│      │           │
└──┬───┘      │           │
   │          │           │
   ▼          ▼           │
┌─────────────┐           │
│  Redirect/  │───────────┘
│   Search    │
└─────────────┘
```

## Component Interaction

```
┌──────────────────────────────────────────────────────────┐
│                     Browser/PWA                           │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Search Page Component                  │  │
│  ├────────────────────────────────────────────────────┤  │
│  │                                                      │  │
│  │  ┌────────────────────┐  ┌──────────────────────┐  │  │
│  │  │  URL Parameters    │  │  State Variables     │  │  │
│  │  │  - source=share    │  │  - shareProcessing   │  │  │
│  │  │  - q={text}        │  │  - shareMessage      │  │  │
│  │  └──────────┬─────────┘  └──────────┬───────────┘  │  │
│  │             │                       │              │  │
│  │             └───────┬───────────────┘              │  │
│  │                     │                              │  │
│  │                     ▼                              │  │
│  │         ┌───────────────────────┐                 │  │
│  │         │  Share Parser Utility │                 │  │
│  │         │  - parseShareContent  │                 │  │
│  │         │  - getTargetUrl       │                 │  │
│  │         │  - getShareDescription│                 │  │
│  │         └───────────┬───────────┘                 │  │
│  │                     │                              │  │
│  │                     ▼                              │  │
│  │         ┌───────────────────────┐                 │  │
│  │         │   Navigation Logic    │                 │  │
│  │         │   - goto()            │                 │  │
│  │         │   - replaceState      │                 │  │
│  │         └───────────┬───────────┘                 │  │
│  │                     │                              │  │
│  │                     ▼                              │  │
│  │         ┌───────────────────────┐                 │  │
│  │         │    Target Pages       │                 │  │
│  │         │    - /shows/{id}      │                 │  │
│  │         │    - /songs/{slug}    │                 │  │
│  │         │    - /search?q=...    │                 │  │
│  │         └───────────────────────┘                 │  │
│  │                                                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

**Visual Summary**: These diagrams show the complete flow from user share action through content parsing, decision making, and final navigation to the appropriate page.
