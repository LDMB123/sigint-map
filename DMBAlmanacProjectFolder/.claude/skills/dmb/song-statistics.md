---
name: dmb-song-statistics
description: Comprehensive song performance metrics for Dave Matthews Band including play counts, slot breakdown, version types, duration patterns, and segue frequency tracking
version: 1.0.0
domain: dave-matthews-band
data-source: dmbalmanac.com
---

# DMB Song Statistics Skill

## Overview
This skill provides detailed statistical analysis of individual Dave Matthews Band songs, including performance frequency, positional preferences, version variations, and historical trends.

## Core Concepts

### Song Categories by Play Count
- **Staples** (500+): Core setlist songs played at majority of shows
- **Regular Rotation** (200-499): Frequently played, rotation varies by era
- **Occasional** (100-199): Played regularly but not every tour
- **Rare** (50-99): Sporadic appearances, special occasions
- **Very Rare** (20-49): Liberation candidates, years between plays
- **Ultra Rare** (<20): Holy grail songs, extreme liberation

### Setlist Positions
- **Opener**: First song of show
- **Early Set**: Positions 2-5
- **Mid Set**: Positions 6-10
- **Late Set 1**: Positions 11-15
- **Set 2 Opener**: First song of second set
- **Set 2 Body**: Middle of second set
- **Encore**: Final songs of show

## Data Structures

### Song Statistics Object
```javascript
{
  song: "Two Step",
  totalPlays: 876,
  firstPlayed: "1993-04-07",
  lastPlayed: "2023-09-16",
  careerSpan: { years: 30, days: 11150 },
  playRate: 35.2, // Percentage of all shows
  currentGap: { shows: 12, days: 287 },

  // Positional breakdown
  positions: {
    opener: 23,
    early: 145,
    middle: 312,
    late: 198,
    set2_opener: 87,
    set2_body: 98,
    encore: 13
  },

  // Most common positions
  mostCommonPosition: "middle_set1",
  averagePosition: 8.7,

  // Version tracking
  versions: {
    studio: 1,
    acoustic: 67,
    extended: 234,
    segued: 421
  },

  // Duration statistics
  duration: {
    shortest: "7:23",
    longest: "18:47",
    average: "11:42",
    median: "11:15"
  },

  // Segue statistics
  segues: {
    totalSegued: 421,
    segueRate: 48.1, // Percentage
    commonInto: [
      { song: "Help Myself", count: 89 },
      { song: "Jimi Thing", count: 34 }
    ],
    commonFrom: [
      { song: "Lie in Our Graves", count: 67 }
    ]
  },

  // Era breakdown
  eras: {
    early: { shows: 245, rate: 42.3 },
    middle: { shows: 387, rate: 51.2 },
    modern: { shows: 244, rate: 28.1 }
  },

  // Gap analysis
  gaps: {
    average: 2.8, // shows
    max: 89,
    min: 0, // consecutive shows
    current: 12
  }
}
```

### Song Performance Record
```javascript
{
  showId: "1998-12-19",
  date: "1998-12-19",
  venue: "United Center",
  city: "Chicago",
  state: "IL",
  song: "Two Step",
  position: 14,
  setNumber: 1,
  slot: "late_set1",
  version: "extended",
  duration: "13:24",
  seguedInto: "Help Myself",
  seguedFrom: null,
  notes: "Carter's birthday show, extended jam",
  guests: [],
  special: false
}
```

## Algorithms

### 1. Play Count and Frequency Analysis

```javascript
// Calculate comprehensive play statistics
function calculateSongStatistics(song, allShows) {
  const performances = allShows.filter(show =>
    show.setlist.includes(song)
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (performances.length === 0) {
    return { error: "Song never played" };
  }

  const totalPlays = performances.length;
  const firstPlayed = performances[0].date;
  const lastPlayed = performances[performances.length - 1].date;
  const playRate = (totalPlays / allShows.length * 100).toFixed(2);

  // Calculate gaps between performances
  const gaps = calculatePerformanceGaps(performances, allShows);

  return {
    song,
    totalPlays,
    firstPlayed,
    lastPlayed,
    careerSpan: {
      years: Math.floor(daysBetween(firstPlayed, lastPlayed) / 365),
      days: daysBetween(firstPlayed, lastPlayed)
    },
    playRate: parseFloat(playRate),
    tier: getPlayTier(totalPlays),
    gaps: {
      average: average(gaps.map(g => g.shows)).toFixed(2),
      max: Math.max(...gaps.map(g => g.shows)),
      min: Math.min(...gaps.map(g => g.shows)),
      current: gaps[gaps.length - 1]?.shows || 0
    },
    performances
  };
}

// Calculate gaps between performances
function calculatePerformanceGaps(performances, allShows) {
  const gaps = [];

  for (let i = 0; i < performances.length - 1; i++) {
    const current = performances[i];
    const next = performances[i + 1];

    const showsBetween = allShows.filter(show =>
      new Date(show.date) > new Date(current.date) &&
      new Date(show.date) < new Date(next.date)
    ).length;

    gaps.push({
      from: current.date,
      to: next.date,
      days: daysBetween(current.date, next.date),
      shows: showsBetween + 1 // Include the performance itself
    });
  }

  // Add current gap (since last performance)
  const currentDate = new Date().toISOString().split('T')[0];
  const lastPerformance = performances[performances.length - 1];
  const currentGap = allShows.filter(show =>
    new Date(show.date) > new Date(lastPerformance.date)
  ).length;

  gaps.push({
    from: lastPerformance.date,
    to: currentDate,
    days: daysBetween(lastPerformance.date, currentDate),
    shows: currentGap,
    current: true
  });

  return gaps;
}

function getPlayTier(count) {
  if (count >= 500) return 'staple';
  if (count >= 200) return 'regular';
  if (count >= 100) return 'occasional';
  if (count >= 50) return 'rare';
  if (count >= 20) return 'very_rare';
  return 'ultra_rare';
}
```

### 2. Slot Breakdown Analysis

```javascript
// Analyze positional preferences
function analyzeSlotBreakdown(song, allShows) {
  const performances = allShows.filter(show =>
    show.setlist.includes(song)
  );

  const positions = {
    opener: 0,
    early: 0,
    middle: 0,
    late: 0,
    set2_opener: 0,
    set2_body: 0,
    encore: 0
  };

  const actualPositions = [];

  performances.forEach(show => {
    const position = show.setlist.indexOf(song);
    actualPositions.push(position);

    const slot = determineSlot(show, position);
    if (positions.hasOwnProperty(slot)) {
      positions[slot]++;
    }
  });

  // Find most common position
  const mostCommonSlot = Object.entries(positions)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    positions,
    percentages: calculatePositionPercentages(positions, performances.length),
    mostCommonSlot: {
      slot: mostCommonSlot[0],
      count: mostCommonSlot[1],
      percentage: (mostCommonSlot[1] / performances.length * 100).toFixed(2)
    },
    averagePosition: average(actualPositions).toFixed(2),
    medianPosition: median(actualPositions),
    positionRange: {
      earliest: Math.min(...actualPositions),
      latest: Math.max(...actualPositions)
    }
  };
}

// Determine slot from position and show structure
function determineSlot(show, position) {
  const setBreaks = show.setBreaks || [Math.floor(show.setlist.length * 0.65)];
  const encoreStart = show.encoreStart || show.setlist.length - 2;

  if (position === 0) return 'opener';
  if (position >= encoreStart) return 'encore';
  if (position < 5) return 'early';
  if (position < setBreaks[0] - 3) return 'middle';
  if (position < setBreaks[0]) return 'late';
  if (position === setBreaks[0]) return 'set2_opener';
  return 'set2_body';
}

function calculatePositionPercentages(positions, total) {
  const percentages = {};
  Object.entries(positions).forEach(([slot, count]) => {
    percentages[slot] = (count / total * 100).toFixed(2);
  });
  return percentages;
}
```

### 3. Version Type Tracking

```javascript
// Track different versions of a song
function analyzeVersionTypes(song, allShows) {
  const performances = allShows.filter(show =>
    show.setlist.includes(song)
  );

  const versions = {
    studio: 0,        // Standard studio arrangement
    acoustic: 0,      // Acoustic version
    electric: 0,      // Electric version (for songs with both)
    extended: 0,      // Extended jam/length
    abbreviated: 0,   // Shortened version
    segued: 0,        // Segued with another song
    solo: 0,          // Dave solo
    guest: 0          // With guest musician
  };

  const versionDetails = [];

  performances.forEach(show => {
    const performance = getPerformanceDetails(show, song);

    // Classify version
    const versionType = classifyVersion(performance, show);

    if (versions.hasOwnProperty(versionType)) {
      versions[versionType]++;
    }

    versionDetails.push({
      date: show.date,
      venue: show.venue,
      version: versionType,
      duration: performance.duration,
      notes: performance.notes
    });
  });

  return {
    versionBreakdown: versions,
    versionPercentages: calculateVersionPercentages(versions, performances.length),
    mostCommonVersion: getMostCommonVersion(versions),
    versionHistory: versionDetails.sort((a, b) => new Date(b.date) - new Date(a.date))
  };
}

// Classify version type
function classifyVersion(performance, show) {
  // Check for guests
  if (show.guests && show.guests.length > 0) {
    const guestOnSong = show.guests.some(g =>
      g.songs && g.songs.includes(performance.song)
    );
    if (guestOnSong) return 'guest';
  }

  // Check for segue
  if (performance.seguedInto || performance.seguedFrom) {
    return 'segued';
  }

  // Check for acoustic
  if (performance.notes && performance.notes.toLowerCase().includes('acoustic')) {
    return 'acoustic';
  }

  // Check for solo
  if (performance.notes && performance.notes.toLowerCase().includes('solo')) {
    return 'solo';
  }

  // Check duration for extended/abbreviated
  if (performance.duration) {
    const avgDuration = getAverageDuration(performance.song);
    const durationMinutes = parseDuration(performance.duration);

    if (durationMinutes > avgDuration * 1.3) return 'extended';
    if (durationMinutes < avgDuration * 0.7) return 'abbreviated';
  }

  return 'studio';
}

function calculateVersionPercentages(versions, total) {
  const percentages = {};
  Object.entries(versions).forEach(([version, count]) => {
    percentages[version] = (count / total * 100).toFixed(2);
  });
  return percentages;
}

function getMostCommonVersion(versions) {
  const sorted = Object.entries(versions).sort((a, b) => b[1] - a[1]);
  return {
    version: sorted[0][0],
    count: sorted[0][1]
  };
}
```

### 4. Duration Pattern Analysis

```javascript
// Analyze song duration patterns
function analyzeDurationPatterns(song, allShows) {
  const performances = allShows.filter(show =>
    show.setlist.includes(song)
  );

  const durations = [];

  performances.forEach(show => {
    const performance = getPerformanceDetails(show, song);
    if (performance.duration) {
      durations.push({
        date: show.date,
        venue: show.venue,
        duration: performance.duration,
        minutes: parseDuration(performance.duration)
      });
    }
  });

  if (durations.length === 0) {
    return { error: "No duration data available" };
  }

  const durationMinutes = durations.map(d => d.minutes);

  // Sort to find extremes
  const sorted = [...durations].sort((a, b) => a.minutes - b.minutes);

  return {
    total: durations.length,
    shortest: {
      duration: sorted[0].duration,
      date: sorted[0].date,
      venue: sorted[0].venue
    },
    longest: {
      duration: sorted[sorted.length - 1].duration,
      date: sorted[sorted.length - 1].date,
      venue: sorted[sorted.length - 1].venue
    },
    average: minutesToDuration(average(durationMinutes)),
    median: minutesToDuration(median(durationMinutes)),
    distribution: calculateDurationDistribution(durationMinutes),
    trend: analyzeDurationTrend(durations)
  };
}

// Calculate duration distribution
function calculateDurationDistribution(durations) {
  const buckets = {
    'under_5': 0,
    '5_to_7': 0,
    '7_to_10': 0,
    '10_to_13': 0,
    '13_to_15': 0,
    'over_15': 0
  };

  durations.forEach(duration => {
    if (duration < 5) buckets.under_5++;
    else if (duration < 7) buckets['5_to_7']++;
    else if (duration < 10) buckets['7_to_10']++;
    else if (duration < 13) buckets['10_to_13']++;
    else if (duration < 15) buckets['13_to_15']++;
    else buckets.over_15++;
  });

  return buckets;
}

// Analyze duration trend over time
function analyzeDurationTrend(durations) {
  // Split into eras and compare
  const eras = {
    early: durations.filter(d => new Date(d.date) < new Date('1999-01-01')),
    middle: durations.filter(d =>
      new Date(d.date) >= new Date('1999-01-01') &&
      new Date(d.date) < new Date('2009-01-01')
    ),
    modern: durations.filter(d => new Date(d.date) >= new Date('2009-01-01'))
  };

  return {
    early: eras.early.length > 0 ? minutesToDuration(average(eras.early.map(d => d.minutes))) : 'N/A',
    middle: eras.middle.length > 0 ? minutesToDuration(average(eras.middle.map(d => d.minutes))) : 'N/A',
    modern: eras.modern.length > 0 ? minutesToDuration(average(eras.modern.map(d => d.minutes))) : 'N/A',
    trend: determineDurationTrend(eras)
  };
}

function determineDurationTrend(eras) {
  const earlyAvg = eras.early.length > 0 ? average(eras.early.map(d => d.minutes)) : 0;
  const modernAvg = eras.modern.length > 0 ? average(eras.modern.map(d => d.minutes)) : 0;

  if (modernAvg > earlyAvg * 1.2) return 'increasing';
  if (modernAvg < earlyAvg * 0.8) return 'decreasing';
  return 'stable';
}
```

### 5. Segue Frequency Analysis

```javascript
// Analyze segue patterns for a song
function analyzeSegueFrequency(song, allShows) {
  const performances = allShows.filter(show =>
    show.setlist.includes(song)
  );

  const segueData = {
    totalSegued: 0,
    seguedInto: {},
    seguedFrom: {}
  };

  performances.forEach(show => {
    const position = show.setlist.indexOf(song);

    // Check if segued INTO next song
    if (show.segueMappings && show.segueMappings.includes(`${position}-${position + 1}`)) {
      const nextSong = show.setlist[position + 1];
      segueData.seguedInto[nextSong] = (segueData.seguedInto[nextSong] || 0) + 1;
      segueData.totalSegued++;
    }

    // Check if segued FROM previous song
    if (show.segueMappings && show.segueMappings.includes(`${position - 1}-${position}`)) {
      const prevSong = show.setlist[position - 1];
      segueData.seguedFrom[prevSong] = (segueData.seguedFrom[prevSong] || 0) + 1;
    }
  });

  return {
    totalSegued: segueData.totalSegued,
    segueRate: (segueData.totalSegued / performances.length * 100).toFixed(2),
    mostCommonInto: sortByFrequency(segueData.seguedInto).slice(0, 10),
    mostCommonFrom: sortByFrequency(segueData.seguedFrom).slice(0, 10),
    segueProbability: calculateSegueProbability(segueData, performances.length)
  };
}

function calculateSegueProbability(segueData, totalPerformances) {
  return {
    willSegue: (segueData.totalSegued / totalPerformances * 100).toFixed(2) + '%',
    standalone: ((totalPerformances - segueData.totalSegued) / totalPerformances * 100).toFixed(2) + '%'
  };
}
```

### 6. Era-Based Comparison

```javascript
// Compare song statistics across eras
function compareAcrossEras(song, allShows) {
  const eras = {
    early: {
      name: "Early Era (1991-1998)",
      shows: allShows.filter(s => new Date(s.date) < new Date('1999-01-01'))
    },
    middle: {
      name: "Middle Era (1999-2008)",
      shows: allShows.filter(s =>
        new Date(s.date) >= new Date('1999-01-01') &&
        new Date(s.date) < new Date('2009-01-01')
      )
    },
    modern: {
      name: "Modern Era (2009-present)",
      shows: allShows.filter(s => new Date(s.date) >= new Date('2009-01-01'))
    }
  };

  const comparison = {};

  Object.entries(eras).forEach(([era, data]) => {
    const eraPerformances = data.shows.filter(show =>
      show.setlist.includes(song)
    );

    comparison[era] = {
      name: data.name,
      totalShows: data.shows.length,
      performances: eraPerformances.length,
      playRate: (eraPerformances.length / data.shows.length * 100).toFixed(2),
      averagePosition: eraPerformances.length > 0 ?
        average(eraPerformances.map(show => show.setlist.indexOf(song))).toFixed(2) : 'N/A',
      mostCommonSlot: eraPerformances.length > 0 ?
        analyzeSlotBreakdown(song, data.shows).mostCommonSlot : 'N/A'
    };
  });

  return {
    comparison,
    trend: determineEraTrend(comparison),
    peakEra: getPeakEra(comparison)
  };
}

function determineEraTrend(comparison) {
  const rates = [
    parseFloat(comparison.early.playRate),
    parseFloat(comparison.middle.playRate),
    parseFloat(comparison.modern.playRate)
  ];

  if (rates[2] > rates[0] * 1.5) return 'increasing';
  if (rates[2] < rates[0] * 0.5) return 'decreasing';
  if (rates[0] > rates[1] && rates[1] > rates[2]) return 'declining';
  if (rates[0] < rates[1] && rates[1] < rates[2]) return 'rising';
  return 'variable';
}

function getPeakEra(comparison) {
  const sorted = Object.entries(comparison)
    .sort((a, b) => parseFloat(b[1].playRate) - parseFloat(a[1].playRate));

  return {
    era: sorted[0][1].name,
    playRate: sorted[0][1].playRate + '%'
  };
}
```

## Practical Query Examples

### Example 1: Complete Song Statistics
```javascript
const song = "Two Step";
const allShows = getAllShows();

const stats = calculateSongStatistics(song, allShows);
const slots = analyzeSlotBreakdown(song, allShows);
const versions = analyzeVersionTypes(song, allShows);
const segues = analyzeSegueFrequency(song, allShows);
const eras = compareAcrossEras(song, allShows);

console.log(`Complete Statistics: ${song}\n`);
console.log(`Total Plays: ${stats.totalPlays} (${stats.playRate}% of all shows)`);
console.log(`First Played: ${stats.firstPlayed}`);
console.log(`Last Played: ${stats.lastPlayed}`);
console.log(`Career Span: ${stats.careerSpan.years} years`);
console.log(`\nGaps:`);
console.log(`  Average: ${stats.gaps.average} shows`);
console.log(`  Max: ${stats.gaps.max} shows`);
console.log(`  Current: ${stats.gaps.current} shows`);
console.log(`\nPositional Preferences:`);
console.log(`  Most Common: ${slots.mostCommonSlot.slot} (${slots.mostCommonSlot.percentage}%)`);
console.log(`  Average Position: #${slots.averagePosition}`);
console.log(`\nVersions:`);
console.log(`  Most Common: ${versions.mostCommonVersion.version} (${versions.mostCommonVersion.count} times)`);
console.log(`  Segue Rate: ${segues.segueRate}%`);
console.log(`\nEra Analysis:`);
console.log(`  Peak Era: ${eras.peakEra.era} (${eras.peakEra.playRate})`);
console.log(`  Trend: ${eras.trend}`);
```

### Example 2: Find Songs by Play Count Range
```javascript
const allSongs = getAllUniqueSongs(getAllShows());
const minPlays = 200;
const maxPlays = 500;

const songsInRange = allSongs
  .map(song => {
    const stats = calculateSongStatistics(song, getAllShows());
    return { song, stats };
  })
  .filter(item =>
    item.stats.totalPlays >= minPlays &&
    item.stats.totalPlays <= maxPlays
  )
  .sort((a, b) => b.stats.totalPlays - a.stats.totalPlays);

console.log(`Songs with ${minPlays}-${maxPlays} plays:\n`);
songsInRange.forEach((item, index) => {
  console.log(`${index + 1}. ${item.song}: ${item.stats.totalPlays} plays (${item.stats.playRate}%)`);
});
```

### Example 3: Compare Duration Patterns
```javascript
const songs = ["Two Step", "Lie in Our Graves", "#41"];

console.log("Duration Pattern Comparison:\n");

songs.forEach(song => {
  const durations = analyzeDurationPatterns(song, getAllShows());

  console.log(`${song}:`);
  console.log(`  Average: ${durations.average}`);
  console.log(`  Range: ${durations.shortest.duration} - ${durations.longest.duration}`);
  console.log(`  Trend: ${durations.trend.trend}`);
  console.log(``);
});
```

### Example 4: Find Most Segued Songs
```javascript
const allSongs = getAllUniqueSongs(getAllShows());

const segueRankings = allSongs
  .map(song => {
    const segues = analyzeSegueFrequency(song, getAllShows());
    return {
      song,
      totalSegued: segues.totalSegued,
      segueRate: parseFloat(segues.segueRate)
    };
  })
  .filter(item => item.totalSegued > 0)
  .sort((a, b) => b.segueRate - a.segueRate)
  .slice(0, 20);

console.log("Top 20 Most Segued Songs:\n");
segueRankings.forEach((item, index) => {
  console.log(`${index + 1}. ${item.song}`);
  console.log(`   Segued: ${item.totalSegued} times (${item.segueRate}%)`);
});
```

### Example 5: Analyze Slot Preferences
```javascript
const songs = ["Don't Drink the Water", "Warehouse", "Ants Marching"];

console.log("Slot Preference Analysis:\n");

songs.forEach(song => {
  const slots = analyzeSlotBreakdown(song, getAllShows());

  console.log(`${song}:`);
  console.log(`  Most Common Slot: ${slots.mostCommonSlot.slot} (${slots.mostCommonSlot.percentage}%)`);
  console.log(`  Average Position: #${slots.averagePosition}`);
  console.log(`  Range: #${slots.positionRange.earliest} - #${slots.positionRange.latest}\n`);
});
```

### Example 6: Era Comparison Report
```javascript
const song = "Bartender";
const eras = compareAcrossEras(song, getAllShows());

console.log(`Era Comparison Report: ${song}\n`);

Object.entries(eras.comparison).forEach(([era, data]) => {
  console.log(`${data.name}:`);
  console.log(`  Performances: ${data.performances}/${data.totalShows} (${data.playRate}%)`);
  console.log(`  Avg Position: ${data.averagePosition}`);
  console.log(``);
});

console.log(`Overall Trend: ${eras.trend}`);
console.log(`Peak Era: ${eras.peakEra.era}`);
```

## Reference Data

### Top 20 Most Played Songs (All-Time)
1. Ants Marching - 850+ plays
2. Warehouse - 820+ plays
3. Two Step - 876+ plays
4. Crash Into Me - 780+ plays
5. Tripping Billies - 765+ plays
6. #41 - 745+ plays
7. Satellite - 720+ plays
8. Too Much - 695+ plays
9. So Much to Say - 680+ plays
10. Lie in Our Graves - 665+ plays

### Common Segue Patterns
- Pantala Naga Pampa → Rapunzel (99% segue rate)
- Two Step → Help Myself (high frequency)
- #41 → Seek Up (traditional pairing)
- Ants Marching → Anyone Seen the Bridge? (early era)

### Average Song Durations
- Short (3-5 min): What Would You Say, Everyday
- Medium (6-9 min): Crash Into Me, Grey Street
- Long (10-13 min): Two Step, #41, Lie in Our Graves
- Extended (13+ min): Bartender, Warehouse, Seek Up

## Best Practices

1. **Update Regularly**: Song statistics change with each show
2. **Era Context**: Always consider which era when analyzing play rates
3. **Normalize Data**: Account for different total show counts per era
4. **Version Tracking**: Distinguish between acoustic/electric versions
5. **Segue Accuracy**: Track both "into" and "from" segues
6. **Duration Variance**: Note that jams extend typical durations
7. **Special Circumstances**: Flag debuts, bustouts, special versions

## Common Pitfalls

1. Don't compare raw play counts across eras without rate adjustment
2. Don't ignore version differences (acoustic vs. studio)
3. Don't forget to track partial performances (Dave solo, incomplete)
4. Don't assume position preference is consistent across eras
5. Don't overlook rare versions (one-time arrangements)
6. Don't mix up song titles with similar names
