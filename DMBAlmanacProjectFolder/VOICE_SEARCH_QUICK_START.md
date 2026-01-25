# Voice Search Quick Start Guide - DMB Almanac

## TL;DR

**Status**: READY FOR IMPLEMENTATION
- Zero existing voice code to modify
- Perfect search infrastructure (Dexie + indexing)
- High-value use case (music database)
- Estimate: 4-6 weeks for full Tier 1+2 implementation

---

## What's Already Working For Voice

### 1. Search Stores (src/lib/stores/dexie.ts)
```typescript
// These accept ANY text input - perfect for voice transcripts
export const songSearch = createDebouncedSearchStore<DexieSong>(async (q, l) => {
  const db = await getDb();
  return db.songs.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});

export const venueSearch = createDebouncedSearchStore<DexieVenue>(async (q, l) => {
  const db = await getDb();
  return db.venues.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});
```

**How to use with voice:**
```typescript
// User says: "Find Crash Into Me"
const transcript = "Find Crash Into Me";
songSearch.setQuery(transcript);
// Done! Store handles debouncing and DB queries
```

### 2. Search UI (src/routes/search/+page.svelte)
```svelte
<input
  type="search"
  id="search-input"
  value={searchInput}
  oninput={handleSearchInput}
/>
```

**How to use with voice:**
```typescript
// Voice transcript updates input
const transcript = "Red Rocks";
searchInput = transcript;
handleSearchInput({ target: { value: transcript } });
// Navigation + search results update automatically
```

### 3. Global Search (src/lib/stores/dexie.ts:1330)
```typescript
async function performGlobalSearch(query: string, limit = 10): Promise<GlobalSearchResults> {
  // Searches songs, venues, tours, guests, shows, releases
  // Single transaction, O(log n) with indexes
}

export const globalSearch = createGlobalSearchStore();
```

**Supports:**
- Song searches
- Venue searches
- Show filtering
- Tour lookups
- Guest musician searches

---

## What Needs Building

### Core Voice Infrastructure (Prerequisite)

```typescript
// 1. VoiceRecognizer wrapper (src/lib/voice/VoiceRecognizer.ts)
class VoiceRecognizer {
  start(callbacks: {
    onResult: (transcript: string, isFinal: boolean, confidence: number) => void;
    onError?: (error: SpeechRecognitionError) => void;
    onEnd?: () => void;
  }): void {
    // Wraps browser's Web Speech API
    // Emits interim + final transcripts
  }

  stop(): void { }
  abort(): void { }
  get listening(): boolean { }
}
```

```typescript
// 2. TextToSpeech wrapper (src/lib/voice/TextToSpeech.ts)
class TextToSpeech {
  async initialize(): Promise<void> { }
  async speak(text: string, options?: TTSOptions): Promise<void> { }
  stop(): void { }
  get speaking(): boolean { }
}
```

```typescript
// 3. VoiceCommandSystem (src/lib/voice/VoiceCommandSystem.ts)
class VoiceCommandSystem {
  registerCommand(command: VoiceCommand): void { }
  start(): void { }
  stop(): void { }
}

interface VoiceCommand {
  patterns: RegExp[];
  handler: (matches: RegExpMatchArray, transcript: string) => void | Promise<void>;
  description: string;
  examples?: string[];
}
```

---

## Tier 1 Commands (Easiest - Start Here)

### Command 1: Song Search
```typescript
// Pattern: "Find [Song Title]" or "Search [Song]" or "Show me [Song]"

const songSearchCommand: VoiceCommand = {
  patterns: [
    /^(?:find|search for|show me|look for)\s+(.+?)$/i,
    /^(?:play|find)(?:\s+song)?\s+(?:called|named)?\s*(.+)$/i
  ],
  handler: async ([_, songTitle]) => {
    songSearch.setQuery(songTitle);
    await goto('/search?q=' + encodeURIComponent(songTitle));
  },
  examples: [
    'Find Crash Into Me',
    'Show me Ants Marching',
    'Search for Two Step'
  ],
  description: 'Search for a song by name'
};
```

**Test phrases:**
- "Find Crash Into Me" (exact match)
- "Show me Two Step" (with verb)
- "Search for Satellite" (verbose)

**Expected accuracy**: 92-96% (songs are well-indexed)

---

### Command 2: Venue Search
```typescript
// Pattern: "Venues in [State]" or "Find [Venue]"

const venueSearchCommand: VoiceCommand = {
  patterns: [
    /^(?:find|show|venues?)\s+(?:in|at|named)?\s*(.+?)$/i,
    /^(?:shows?)\s+(?:at|in)\s+(.+?)$/i
  ],
  handler: async ([_, venueName]) => {
    venueSearch.setQuery(venueName);
    await goto('/search?q=' + encodeURIComponent(venueName));
  },
  examples: [
    'Venues in Colorado',
    'Find the Gorge',
    'Shows at Red Rocks',
    'SPAC'
  ],
  description: 'Search for a venue by name or state'
};
```

**Test phrases:**
- "Venues in Colorado"
- "Find the Gorge"
- "Show me SPAC"

**Expected accuracy**: 88-94% (venue names have variants)

---

### Command 3: Year Filtering
```typescript
// Pattern: "Shows from [Year]"

const yearFilterCommand: VoiceCommand = {
  patterns: [
    /^shows? (?:from|in|during)\s+(\d{4})$/i,
    /^(?:what about|tell me about)\s+(\d{4})$/i,
    /^(\d{4})\s+shows?$/i
  ],
  handler: async ([_, year]) => {
    globalSearch.setQuery(year);
    await goto('/search?q=' + year);
  },
  examples: [
    'Shows from 2023',
    'Tell me about 1995',
    '2022 shows'
  ],
  description: 'Find shows from a specific year'
};
```

**Test phrases:**
- "Shows from 2023"
- "What about 1995"
- "2022 shows"

**Expected accuracy**: 98%+ (numbers are very reliable)

---

## Tier 2 Commands (Moderate Complexity)

### Command 4: Venue State Filter
```typescript
// Pattern: "Venues in [State name]"

const venueStateCommand: VoiceCommand = {
  patterns: [
    /^(?:venues?|show me venues?)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/i
  ],
  handler: async ([_, stateName]) => {
    // Navigate to venues page with state filter
    await goto(`/venues?state=${encodeURIComponent(stateName)}`);
    // In component: filter grouped venues by state
  },
  examples: [
    'Venues in Colorado',
    'Venues in Massachusetts',
    'New York venues'
  ],
  description: 'Show all venues in a state'
};
```

**Contextual Biasing** - All 50 US states:
```typescript
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  // ... all 50 states
  'Washington DC'
];
```

---

### Command 5: Sort/Order Commands
```typescript
// Pattern: "Sort by [criteria]"

const sortCommand: VoiceCommand = {
  patterns: [
    /^(?:sort|order|show)\s+by\s+(\w+)/i,
    /^(?:most|top)\s+(played|performances?|openers?|closers?)/i
  ],
  handler: ([_, criteria]) => {
    const sortMap = {
      'most played': 'performances',
      'performances': 'performances',
      'alphabetical': 'alphabetical',
      'recently': 'recent',
      'openers': 'openers',
      'closers': 'closers'
    };
    // Update component state
    currentSort = sortMap[criteria.toLowerCase()];
  },
  examples: [
    'Sort by most played',
    'Show me top openers',
    'Order alphabetically',
    'Recently played songs'
  ],
  description: 'Sort songs or venues by various criteria'
};
```

---

## Tier 3 Commands (Advanced)

### Command 6: Multi-Step - "Shows where they played [Song]"
```typescript
// Pattern: "Find shows where they played [Song]"
// Requires: Song lookup -> Setlist join -> Show results

const showsBysongCommand: VoiceCommand = {
  patterns: [
    /^(?:find|show)\s+shows?(?:\s+where)?\s+(?:they\s+)?played\s+(.+?)$/i,
    /^when\s+(?:was|were)\s+(?:they\s+(?:playing|played)|playing)\s+(.+?)$/i
  ],
  handler: async ([_, songTitle]) => {
    // Step 1: Find song
    const db = await getDb();
    const song = await db.songs
      .where('searchText').startsWithIgnoreCase(songTitle).first();

    if (!song) {
      await tts.speak(`Sorry, I couldn't find ${songTitle}`);
      return;
    }

    // Step 2: Get all shows where played
    const entries = await db.setlistEntries
      .where('songId').equals(song.id).toArray();
    const showIds = [...new Set(entries.map(e => e.showId))];

    // Step 3: Fetch shows
    const shows = await db.shows.bulkGet(showIds);

    // Step 4: Display results
    await tts.speak(
      `${song.title} was played ${shows.length} times. ` +
      `Last played on ${formatDate(shows[0].date)}`
    );
  },
  examples: [
    'Find shows where they played Crash Into Me',
    'When was Ants Marching played',
    'Show shows with Two Step'
  ],
  description: 'Find all performances of a specific song'
};
```

---

## How to Add to Search Page

### Option 1: Microphone Button in Search Form

```svelte
<!-- src/routes/search/+page.svelte -->

<div class="search-input-wrapper">
  <input type="search" id="search-input" />

  <!-- Add voice button -->
  <button
    class="voice-button"
    aria-label="Search by voice"
    on:click={toggleVoiceSearch}
  >
    <Microphone />
  </button>

  <!-- Transcript display -->
  {#if isListening}
    <div class="voice-transcript" role="status">
      {currentTranscript}
    </div>
  {/if}
</div>

<script>
  let isListening = $state(false);
  let currentTranscript = $state('');

  function toggleVoiceSearch() {
    if (isListening) {
      recognizer.stop();
    } else {
      recognizer.start({
        onResult: (transcript, isFinal, confidence) => {
          currentTranscript = transcript;
          if (isFinal && confidence > 0.75) {
            searchInput = transcript;
            handleSearchInput({ target: { value: transcript } });
          }
        },
        onEnd: () => {
          isListening = false;
        }
      });
    }
    isListening = !isListening;
  }
</script>
```

### Option 2: Global Voice Search in Header

```svelte
<!-- src/lib/components/navigation/Header.svelte -->

<header class="header">
  <div class="header-content">
    <Logo />
    <SearchBar />
    <VoiceSearchButton /> <!-- NEW -->
  </div>
</header>
```

---

## Testing the Implementation

### Manual Testing Checklist

```
[ ] Song Search
  [ ] "Find Crash Into Me" - exact match
  [ ] "Show me Ants Marching" - with verb
  [ ] "Two Step" - just title
  [ ] "Unknown song" - error handling

[ ] Venue Search
  [ ] "Venues in Colorado" - state filter
  [ ] "Find the Gorge" - specific venue
  [ ] "SPAC" - abbreviation
  [ ] "Unknown venue" - error handling

[ ] Year Filtering
  [ ] "Shows from 2023" - standard pattern
  [ ] "1995" - just year
  [ ] "Future year" - no results handling

[ ] UI/UX
  [ ] Microphone button visible
  [ ] Listening indicator animates
  [ ] Transcript shows in real-time
  [ ] Results update automatically
  [ ] Offline handling (graceful degradation)

[ ] Accessibility
  [ ] Screen reader announces listening state
  [ ] Keyboard shortcut for voice (Ctrl+Shift+V?)
  [ ] ARIA live regions update
  [ ] Voice feedback works with screen reader
```

---

## Performance Notes

### No Negative Impact Expected
- Web Speech API uses native browser engine (no external calls)
- Dexie searches are already O(log n) with indexes
- Debouncing (300ms) prevents excessive queries
- Grammar-based biasing adds minimal memory (~50KB)

### Monitor These
- Microphone permission requests (show once)
- TTS audio playback (cache synthesized audio?)
- Command regex complexity (keep patterns simple)

---

## Browser Support

### Chrome 143+ (Target)
✅ Full Web Speech API support
✅ SpeechSynthesis API
✅ Grammar support

### Firefox
✅ SpeechSynthesis API
⚠️ Speech recognition support (limited)

### Safari
⚠️ Speech recognition (iOS only with webkitSpeechRecognition)
✅ SpeechSynthesis API

### Fallback Strategy
- Always keep text input available
- Voice is progressive enhancement
- Desktop Chrome-first experience

---

## Next Steps

1. **Read full analysis**: See `WEB_SPEECH_API_ANALYSIS.md`
2. **Review infrastructure**: Decide on component structure
3. **Implement Phase 1**: VoiceRecognizer + TextToSpeech wrappers
4. **Add Tier 1 commands**: Song, venue, year search
5. **Test**: Manual testing + user feedback
6. **Iterate**: Improve commands based on real usage

---

## Questions?

Refer to:
- `WEB_SPEECH_API_ANALYSIS.md` - Detailed technical analysis
- `WEB_SPEECH_FINDINGS.txt` - File-by-file breakdown
- Your Web Speech API implementation reference at top of this document

Voice search is a high-ROI feature for the DMB community. Let's build it!
