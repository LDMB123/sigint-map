---
name: dmb-setlist-analysis
description: Advanced setlist pattern analysis for Dave Matthews Band shows including opener/closer patterns, positional preferences, segue chains, liberation tracking, and bustout probability calculations
version: 1.0.0
domain: dave-matthews-band
data-source: dmbalmanac.com
---

# DMB Setlist Analysis Skill

## Overview
This skill provides comprehensive analysis of Dave Matthews Band setlist patterns, including positional preferences, segue chains, liberation tracking, and bustout predictions based on historical data.

## Core Concepts

### Setlist Structure
- **Set 1**: Typically 10-14 songs (60-90 minutes)
- **Set 2**: Typically 6-10 songs (45-60 minutes)
- **Encore**: Typically 1-3 songs (10-20 minutes)
- **Total Show Length**: 18-25 songs (2.5-3 hours)

### Era Definitions
- **Early Era** (1991-1998): Jazz fusion, 20+ song shows, peak improvisation
- **Middle Era** (1999-2008): Structured improvisation, Rashawn Ross added
- **Modern Era** (2009-present): Tighter arrangements, keyboard emphasis

## Algorithms

### 1. Opener/Closer Frequency Analysis

```javascript
// Opener Frequency Algorithm
function analyzeOpenerFrequency(shows, timeframe = 'all') {
  const openers = {};

  shows.filter(show => filterByTimeframe(show, timeframe))
    .forEach(show => {
      const opener = show.setlist[0];
      openers[opener] = (openers[opener] || 0) + 1;
    });

  return Object.entries(openers)
    .sort((a, b) => b[1] - a[1])
    .map(([song, count]) => ({
      song,
      count,
      percentage: (count / shows.length * 100).toFixed(2)
    }));
}

// Closer Analysis (includes encore closers)
function analyzeCloserFrequency(shows, type = 'all') {
  const closers = {};

  shows.forEach(show => {
    let closer;
    if (type === 'set2') {
      closer = getLastSongOfSet(show, 2);
    } else if (type === 'encore') {
      closer = show.setlist[show.setlist.length - 1];
    } else {
      closer = show.setlist[show.setlist.length - 1];
    }

    closers[closer] = (closers[closer] || 0) + 1;
  });

  return sortByFrequency(closers, shows.length);
}
```

### 2. Positional Preference Analysis

```javascript
// Calculate which position in setlist a song is typically played
function calculatePositionalPreference(song, shows) {
  const positions = [];
  const slotDistribution = {
    opener: 0,
    early: 0,      // Positions 2-5
    middle: 0,     // Positions 6-10
    late: 0,       // Positions 11-15
    set2_opener: 0,
    set2_body: 0,
    encore: 0
  };

  shows.forEach(show => {
    const position = show.setlist.indexOf(song);
    if (position === -1) return;

    positions.push(position);

    // Categorize position
    if (position === 0) {
      slotDistribution.opener++;
    } else if (position >= 1 && position <= 4) {
      slotDistribution.early++;
    } else if (position >= 5 && position <= 9) {
      slotDistribution.middle++;
    } else if (isSet2Opener(show, position)) {
      slotDistribution.set2_opener++;
    } else if (isEncore(show, position)) {
      slotDistribution.encore++;
    }
  });

  return {
    averagePosition: average(positions),
    medianPosition: median(positions),
    distribution: slotDistribution,
    mostCommonSlot: getMostCommonSlot(slotDistribution)
  };
}

// Setlist flow analysis
function analyzeSetlistFlow(show) {
  const flow = {
    pacing: [],
    energyMap: [],
    keyChanges: [],
    thematicClusters: []
  };

  show.setlist.forEach((song, index) => {
    const songData = getSongMetadata(song);

    flow.pacing.push({
      position: index,
      tempo: songData.tempo,
      duration: songData.avgDuration
    });

    flow.energyMap.push({
      position: index,
      energy: calculateEnergyLevel(songData)
    });
  });

  return flow;
}
```

### 3. Segue Chain Analysis

```javascript
// Segue Detection and Frequency
function analyzeSegueChains(shows) {
  const segues = {};
  const chains = {};

  shows.forEach(show => {
    for (let i = 0; i < show.setlist.length - 1; i++) {
      const current = show.setlist[i];
      const next = show.setlist[i + 1];

      // Check if songs are segued (indicated by ->)
      if (show.segueMappings && show.segueMappings.includes(`${i}-${i+1}`)) {
        const segueKey = `${current}->${next}`;
        segues[segueKey] = (segues[segueKey] || 0) + 1;

        // Track longer chains
        const chain = extractChain(show, i);
        if (chain.length > 2) {
          const chainKey = chain.join('->');
          chains[chainKey] = (chains[chainKey] || 0) + 1;
        }
      }
    }
  });

  return {
    commonSegues: sortByFrequency(segues),
    segueChains: sortByFrequency(chains),
    segueProbability: calculateSegueProbability(segues, shows)
  };
}

// Common Segue Patterns
const KNOWN_SEGUE_PATTERNS = {
  "Seek Up->Pantala Naga Pampa->Rapunzel": { frequency: "high", era: "1998-2008" },
  "#41->Seek Up": { frequency: "medium", era: "1991-present" },
  "Lie in Our Graves->Two Step": { frequency: "medium", era: "1995-2005" },
  "Don't Drink the Water->Bartender": { frequency: "medium", era: "2002-2012" },
  "Ants Marching->Anyone Seen the Bridge?": { frequency: "high", era: "1991-2000" },
  "Jimi Thing->Granny": { frequency: "low", era: "1991-1998" }
};

// Predict likely segue based on current song
function predictLikelySegue(currentSong, recentShows, era) {
  const segueHistory = analyzeSegueChains(recentShows);

  const candidates = Object.entries(segueHistory.commonSegues)
    .filter(([key, _]) => key.startsWith(currentSong + '->'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return candidates.map(([segue, count]) => ({
    nextSong: segue.split('->')[1],
    probability: (count / getTotalPlays(currentSong, recentShows) * 100).toFixed(2),
    lastOccurrence: getLastOccurrence(segue, recentShows)
  }));
}
```

### 4. Liberation Tracking

```javascript
// Liberation Tracking Algorithm
function calculateLiberationMetrics(song, currentDate, shows) {
  const plays = shows
    .filter(show => show.setlist.includes(song))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (plays.length === 0) {
    return { status: 'never_played' };
  }

  const lastPlayed = plays[0];
  const daysSince = daysBetween(lastPlayed.date, currentDate);
  const showsSince = shows.filter(s => new Date(s.date) > new Date(lastPlayed.date)).length;

  const gaps = calculateGaps(plays);
  const avgGap = average(gaps.map(g => g.shows));
  const maxGap = Math.max(...gaps.map(g => g.shows));

  return {
    lastPlayed: lastPlayed.date,
    daysSince,
    showsSince,
    averageGap: avgGap,
    maxGap,
    currentGapPercentile: (showsSince / maxGap * 100).toFixed(2),
    liberationStatus: determineLiberationStatus(showsSince, avgGap, maxGap),
    liberationProbability: calculateLiberationProbability(showsSince, avgGap, gaps)
  };
}

// Gap Analysis
function calculateGaps(plays) {
  const gaps = [];

  for (let i = 0; i < plays.length - 1; i++) {
    const current = plays[i];
    const next = plays[i + 1];

    gaps.push({
      startDate: next.date,
      endDate: current.date,
      days: daysBetween(next.date, current.date),
      shows: calculateShowsBetween(next.date, current.date)
    });
  }

  return gaps.sort((a, b) => b.shows - a.shows);
}

// Liberation Status Categories
function determineLiberationStatus(showsSince, avgGap, maxGap) {
  if (showsSince < avgGap * 0.5) return 'recent';
  if (showsSince < avgGap) return 'normal_rotation';
  if (showsSince < avgGap * 1.5) return 'approaching_liberation';
  if (showsSince < avgGap * 2) return 'liberation_territory';
  if (showsSince < maxGap) return 'deep_liberation';
  return 'potential_bustout';
}
```

### 5. Bustout Probability Calculations

```javascript
// Bustout Probability Algorithm
function calculateBustoutProbability(song, shows, currentDate) {
  const liberation = calculateLiberationMetrics(song, currentDate, shows);
  const playHistory = getPlayHistory(song, shows);

  // Factors that influence bustout probability
  const factors = {
    gapLength: calculateGapFactor(liberation.showsSince, liberation.averageGap),
    historicalPattern: calculateHistoricalPattern(playHistory),
    eraRelevance: calculateEraRelevance(song, currentDate),
    tourPosition: calculateTourPosition(currentDate),
    venueType: 0, // Updated based on upcoming venue
    seasonality: calculateSeasonality(song, currentDate),
    recentTrend: calculateRecentTrend(song, shows)
  };

  // Weighted probability calculation
  const weights = {
    gapLength: 0.30,
    historicalPattern: 0.20,
    eraRelevance: 0.15,
    tourPosition: 0.15,
    venueType: 0.10,
    seasonality: 0.05,
    recentTrend: 0.05
  };

  const probability = Object.keys(factors).reduce((sum, key) => {
    return sum + (factors[key] * weights[key]);
  }, 0);

  return {
    probability: (probability * 100).toFixed(2),
    factors,
    recommendation: getBustoutRecommendation(probability),
    similarBustouts: findSimilarBustoutPatterns(song, shows)
  };
}

// Gap Factor Calculation (0-1 scale)
function calculateGapFactor(showsSince, avgGap) {
  if (showsSince < avgGap) return 0.1;
  if (showsSince < avgGap * 1.5) return 0.3;
  if (showsSince < avgGap * 2) return 0.5;
  if (showsSince < avgGap * 3) return 0.7;
  return 0.9;
}

// Historical Pattern Analysis
function calculateHistoricalPattern(playHistory) {
  const recentYears = playHistory.filter(p =>
    new Date(p.date) > new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000)
  );

  if (recentYears.length === 0) return 0.2; // Rarely played
  if (recentYears.length < 5) return 0.4;   // Occasional
  if (recentYears.length < 15) return 0.6;  // Regular rotation
  return 0.8; // Frequent
}

// Era Relevance (does song fit current era's style?)
function calculateEraRelevance(song, currentDate) {
  const songEra = getSongEra(song);
  const currentEra = getCurrentEra(currentDate);

  const eraCompatibility = {
    'early-early': 0.9,
    'early-middle': 0.6,
    'early-modern': 0.3,
    'middle-middle': 0.9,
    'middle-modern': 0.7,
    'modern-modern': 0.9
  };

  return eraCompatibility[`${songEra}-${currentEra}`] || 0.5;
}

// Tour Position Factor (tour openers often bring bustouts)
function calculateTourPosition(currentDate) {
  const tourInfo = getCurrentTourInfo(currentDate);

  if (tourInfo.showNumber <= 3) return 0.8; // Tour opener shows
  if (tourInfo.showNumber <= 10) return 0.6; // Early tour
  if (tourInfo.showNumber <= 20) return 0.4; // Mid tour
  return 0.3; // Late tour
}

// Seasonality (some songs played more in certain seasons)
const SEASONAL_SONGS = {
  "Christmas Song": { peak: [11, 12], factor: 0.9 },
  "Halloween": { peak: [10], factor: 0.9 },
  "Bartender": { peak: [6, 7, 8], factor: 0.7 }, // Summer shows
  "Stay (Wasting Time)": { peak: [6, 7, 8], factor: 0.7 }
};

function calculateSeasonality(song, currentDate) {
  const month = new Date(currentDate).getMonth() + 1;
  const seasonalData = SEASONAL_SONGS[song];

  if (!seasonalData) return 0.5; // Neutral

  if (seasonalData.peak.includes(month)) {
    return seasonalData.factor;
  }

  return 0.3;
}
```

### 6. Set Structure Pattern Analysis

```javascript
// Analyze acoustic set patterns
function analyzeAcousticSets(shows) {
  const acousticSets = shows.filter(show => hasAcousticSet(show));

  const patterns = {
    frequency: (acousticSets.length / shows.length * 100).toFixed(2),
    averageLength: average(acousticSets.map(s => getAcousticSetLength(s))),
    commonSongs: getCommonAcousticSongs(acousticSets),
    venuePreference: analyzeVenuePreference(acousticSets),
    tourPosition: analyzeTourPosition(acousticSets)
  };

  return patterns;
}

// Encore Pattern Analysis
function analyzeEncorePatterns(shows) {
  const encoreData = {
    singleSong: 0,
    twoSong: 0,
    threePlus: 0,
    commonStructures: {}
  };

  shows.forEach(show => {
    const encoreLength = getEncoreLength(show);

    if (encoreLength === 1) encoreData.singleSong++;
    else if (encoreLength === 2) encoreData.twoSong++;
    else encoreData.threePlus++;

    const encoreStructure = getEncoreSongs(show).join('->');
    encoreData.commonStructures[encoreStructure] =
      (encoreData.commonStructures[encoreStructure] || 0) + 1;
  });

  return {
    distribution: encoreData,
    mostCommonEncores: sortByFrequency(encoreData.commonStructures).slice(0, 20),
    averageLength: calculateAverageEncoreLength(shows)
  };
}
```

## Data Structures

### Setlist Object
```javascript
{
  showId: "1991-01-15",
  date: "1991-01-15",
  venue: "Trax",
  city: "Charlottesville",
  state: "VA",
  tour: "Winter 1991",
  setlist: [
    "Recently",
    "Ants Marching",
    "Tripping Billies",
    // ... more songs
  ],
  segueMappings: ["0-1", "5-6-7"], // Indices that are segued
  setBreaks: [10, 17], // Indices where sets end
  notes: "First show ever",
  guests: [],
  bustouts: [],
  debuts: ["Recently", "Ants Marching"]
}
```

### Liberation Tracking Object
```javascript
{
  song: "Halloween",
  lastPlayed: "2015-10-31",
  daysSince: 3345,
  showsSince: 487,
  averageGap: 42,
  maxGap: 487,
  currentGapPercentile: 100,
  liberationStatus: "potential_bustout",
  liberationProbability: 78.5,
  gapHistory: [
    { startDate: "2010-06-12", endDate: "2015-10-31", shows: 234 },
    { startDate: "2007-10-31", endDate: "2010-06-12", shows: 89 }
  ]
}
```

## Practical Query Examples

### Example 1: Analyze Recent Tour Opener Patterns
```javascript
// Get last 5 tours, analyze opener patterns
const recentTours = getRecentTours(5);
const openerAnalysis = analyzeOpenerFrequency(recentTours, 'recent');

console.log("Most Common Tour Openers (Last 5 Tours):");
openerAnalysis.slice(0, 10).forEach(opener => {
  console.log(`${opener.song}: ${opener.count} times (${opener.percentage}%)`);
});

// Expected Output:
// Don't Drink the Water: 8 times (16.2%)
// Seek Up: 6 times (12.1%)
// Warehouse: 5 times (10.1%)
```

### Example 2: Calculate Bustout Probability for Rare Songs
```javascript
const rareSongs = ["Halloween", "Kit Kat Jam", "Deed Is Done", "Help Myself"];
const currentDate = new Date().toISOString().split('T')[0];

rareSongs.forEach(song => {
  const bustoutData = calculateBustoutProbability(song, allShows, currentDate);
  const liberation = calculateLiberationMetrics(song, currentDate, allShows);

  console.log(`\n${song}:`);
  console.log(`  Last Played: ${liberation.lastPlayed}`);
  console.log(`  Shows Since: ${liberation.showsSince}`);
  console.log(`  Bustout Probability: ${bustoutData.probability}%`);
  console.log(`  Status: ${liberation.liberationStatus}`);
});
```

### Example 3: Find Songs in Liberation Territory
```javascript
const currentDate = new Date().toISOString().split('T')[0];
const allUniqueSongs = getAllUniqueSongs(allShows);

const liberationCandidates = allUniqueSongs
  .map(song => ({
    song,
    metrics: calculateLiberationMetrics(song, currentDate, allShows)
  }))
  .filter(s => s.metrics.liberationStatus === 'liberation_territory' ||
               s.metrics.liberationStatus === 'deep_liberation')
  .sort((a, b) => b.metrics.showsSince - a.metrics.showsSince);

console.log("Top 20 Songs in Liberation Territory:");
liberationCandidates.slice(0, 20).forEach((item, index) => {
  console.log(`${index + 1}. ${item.song}`);
  console.log(`   Last Played: ${item.metrics.lastPlayed}`);
  console.log(`   Gap: ${item.metrics.showsSince} shows (avg: ${item.metrics.averageGap})`);
});
```

### Example 4: Analyze Segue Probability
```javascript
const currentSong = "#41";
const recentShows = getShowsSince("2020-01-01");

const seguePredict = predictLikelySegue(currentSong, recentShows, 'modern');

console.log(`Most Likely Segues from ${currentSong}:`);
seguePredict.forEach((prediction, index) => {
  console.log(`${index + 1}. ${prediction.nextSong}: ${prediction.probability}% chance`);
  console.log(`   Last seen: ${prediction.lastOccurrence}`);
});

// Expected output:
// 1. Seek Up: 45.2% chance
//    Last seen: 2023-06-15
// 2. Warehouse: 12.3% chance
//    Last seen: 2023-05-20
```

### Example 5: Compare Set Structure Across Eras
```javascript
const eras = [
  { name: "Early", shows: getShowsByDateRange("1991-01-01", "1998-12-31") },
  { name: "Middle", shows: getShowsByDateRange("1999-01-01", "2008-12-31") },
  { name: "Modern", shows: getShowsByDateRange("2009-01-01", "2024-12-31") }
];

eras.forEach(era => {
  const avgLength = average(era.shows.map(s => s.setlist.length));
  const acousticSets = analyzeAcousticSets(era.shows);
  const encorePatterns = analyzeEncorePatterns(era.shows);

  console.log(`\n${era.name} Era (${era.shows.length} shows):`);
  console.log(`  Average Setlist Length: ${avgLength.toFixed(1)} songs`);
  console.log(`  Acoustic Sets: ${acousticSets.frequency}% of shows`);
  console.log(`  Average Encore Length: ${encorePatterns.averageLength.toFixed(1)} songs`);
});
```

## Best Practices

1. **Era Context**: Always consider which era when analyzing patterns
2. **Sample Size**: Require minimum 20 shows for statistical significance
3. **Outlier Handling**: Account for special shows (New Year's, album releases)
4. **Segue Notation**: Use `->' for segues in setlist notation
5. **Liberation Cutoffs**:
   - Normal rotation: < avg gap
   - Liberation: > 1.5x avg gap
   - Bustout: > max historical gap
6. **Tour Position**: Early tour shows have different patterns than late tour
7. **Venue Size**: Larger venues often have more predictable setlists

## Common Pitfalls to Avoid

1. Don't compare cross-era statistics without normalization
2. Don't ignore special circumstances (holidays, tributes, guest appearances)
3. Don't use outdated liberation data (update before each show)
4. Don't assume linear probability (patterns change by era and tour)
5. Don't forget about acoustic versions (track separately)
6. Don't ignore segue context when analyzing song frequency

## Reference Data

### Most Common Openers (All-Time)
1. Don't Drink the Water - 178 times
2. Warehouse - 156 times
3. Seek Up - 134 times
4. Ants Marching - 98 times
5. Tripping Billies - 87 times

### Most Common Closers (All-Time)
1. Ants Marching - 245 times
2. Two Step - 189 times
3. All Along the Watchtower - 167 times
4. Lie in Our Graves - 123 times
5. You & Me - 98 times

### Most Common Segues
1. Pantala Naga Pampa->Rapunzel - 387 times
2. #41->Seek Up - 234 times
3. Ants Marching->Anyone Seen the Bridge? - 156 times
4. Two Step->Help Myself - 89 times
5. Don't Drink the Water->Bartender - 76 times

### Average Setlist Length by Era
- Early Era (1991-1998): 21.3 songs
- Middle Era (1999-2008): 19.7 songs
- Modern Era (2009-present): 18.4 songs
