---
name: dmb-rarity-scoring
description: Comprehensive rarity scoring methodology for Dave Matthews Band shows and songs including Rarity Index calculations, weighted algorithms, percentile rankings, and era-adjusted metrics
version: 1.0.0
domain: dave-matthews-band
data-source: dmbalmanac.com
---

# DMB Rarity Scoring Skill

## Overview
This skill provides sophisticated algorithms for calculating show and song rarity scores, enabling fans to identify the most unique and special performances in DMB history.

## Core Rarity Concepts

### Rarity Dimensions
1. **Frequency Rarity**: How often a song is played
2. **Temporal Rarity**: How recently it was played (bustouts)
3. **Debut Rarity**: First-time performances
4. **Contextual Rarity**: Unique circumstances (guests, special versions)
5. **Structural Rarity**: Unusual setlist arrangements

### Rarity Tiers
- **Common**: Played 500+ times (Ants Marching, Crash Into Me)
- **Regular**: Played 200-499 times (Say Goodbye, Grey Street)
- **Uncommon**: Played 100-199 times (Pantala Naga Pampa, Rapunzel)
- **Rare**: Played 50-99 times (Deed Is Done, Little Thing)
- **Very Rare**: Played 20-49 times (Help Myself, Kit Kat Jam)
- **Ultra Rare**: Played <20 times (Halloween, Blue Water)

## Algorithms

### 1. Song Rarity Index (SRI)

```javascript
// Master Song Rarity Index Algorithm
function calculateSongRarityIndex(song, allShows, currentDate) {
  const playData = getPlayData(song, allShows);

  // Core metrics
  const frequency = playData.totalPlays;
  const liberation = calculateLiberationMetrics(song, currentDate, allShows);
  const debut = playData.debutDate;
  const careerSpan = daysBetween(debut, currentDate);

  // Component scores (0-100 scale)
  const scores = {
    frequencyScore: calculateFrequencyScore(frequency, allShows.length),
    liberationScore: calculateLiberationScore(liberation),
    debutBonusScore: calculateDebutBonus(debut, currentDate),
    gapScore: calculateGapScore(playData.gaps),
    eraScore: calculateEraRarityScore(song, playData)
  };

  // Weights for final calculation
  const weights = {
    frequencyScore: 0.40,    // Primary driver
    liberationScore: 0.25,   // Current gap matters
    gapScore: 0.20,          // Historical gap patterns
    eraScore: 0.10,          // Era-adjusted context
    debutBonusScore: 0.05    // Recent debuts get bonus
  };

  // Calculate weighted rarity index
  const rarityIndex = Object.keys(scores).reduce((total, key) => {
    return total + (scores[key] * weights[key]);
  }, 0);

  return {
    rarityIndex: rarityIndex.toFixed(2),
    tier: getRarityTier(frequency),
    scores,
    metadata: {
      totalPlays: frequency,
      showsSince: liberation.showsSince,
      careerSpan: Math.floor(careerSpan / 365) + " years"
    }
  };
}

// Frequency Score (inverse relationship - rarer = higher score)
function calculateFrequencyScore(plays, totalShows) {
  const playRate = plays / totalShows;

  if (playRate >= 0.80) return 10;  // Staple (Ants, Crash)
  if (playRate >= 0.50) return 20;  // Very common
  if (playRate >= 0.30) return 35;  // Common
  if (playRate >= 0.15) return 50;  // Regular rotation
  if (playRate >= 0.08) return 65;  // Uncommon
  if (playRate >= 0.04) return 80;  // Rare
  if (playRate >= 0.01) return 90;  // Very rare
  return 95;                        // Ultra rare
}

// Liberation Score (current gap relative to history)
function calculateLiberationScore(liberation) {
  if (!liberation || liberation.status === 'never_played') return 0;

  const gapRatio = liberation.showsSince / liberation.averageGap;

  if (gapRatio < 0.5) return 10;   // Recently played
  if (gapRatio < 1.0) return 25;   // Normal rotation
  if (gapRatio < 1.5) return 50;   // Approaching liberation
  if (gapRatio < 2.0) return 70;   // Liberation territory
  if (gapRatio < 3.0) return 85;   // Deep liberation
  return 95;                        // Potential bustout
}

// Gap Score (historical gap patterns)
function calculateGapScore(gaps) {
  if (!gaps || gaps.length === 0) return 0;

  const avgGap = average(gaps.map(g => g.shows));
  const maxGap = Math.max(...gaps.map(g => g.shows));
  const gapVariability = standardDeviation(gaps.map(g => g.shows));

  // Songs with large, consistent gaps are rarer
  const gapScore = Math.min(100, (avgGap / 10) + (maxGap / 20));

  // High variability means unpredictable (adds rarity)
  const variabilityBonus = Math.min(15, gapVariability / 5);

  return Math.min(100, gapScore + variabilityBonus);
}

// Debut Bonus (recent debuts are special)
function calculateDebutBonus(debutDate, currentDate) {
  const daysSinceDebut = daysBetween(debutDate, currentDate);
  const yearsSinceDebut = daysSinceDebut / 365;

  if (yearsSinceDebut < 0.25) return 100;  // New song this tour
  if (yearsSinceDebut < 0.5) return 75;    // New song this year
  if (yearsSinceDebut < 1.0) return 50;    // Debuted last year
  if (yearsSinceDebut < 2.0) return 25;    // Recent debut
  return 0;                                 // Established song
}

// Era-Adjusted Rarity Score
function calculateEraRarityScore(song, playData) {
  const eraBreakdown = categorizePlaysByEra(playData);
  const currentEra = getCurrentEra();

  // If song was common in one era but rare now, increase rarity
  const earlyRate = eraBreakdown.early.plays / eraBreakdown.early.totalShows;
  const modernRate = eraBreakdown.modern.plays / eraBreakdown.modern.totalShows;

  const eraShift = Math.abs(earlyRate - modernRate);

  // Songs that shifted from common to rare get higher scores
  if (earlyRate > 0.5 && modernRate < 0.1) return 85;
  if (earlyRate > 0.3 && modernRate < 0.05) return 70;
  if (eraShift > 0.3) return 60;
  if (eraShift > 0.15) return 40;
  return 20;
}
```

### 2. Show Rarity Index (ShRI)

```javascript
// Master Show Rarity Index Algorithm
function calculateShowRarityIndex(show, allShows) {
  const showMetrics = {
    rareSongs: 0,
    bustouts: [],
    debuts: [],
    guests: [],
    uniqueSegues: [],
    unusualStructure: false,
    totalSongRarity: 0
  };

  // Analyze each song in setlist
  show.setlist.forEach(song => {
    const songRarity = calculateSongRarityIndex(song, allShows, show.date);

    showMetrics.totalSongRarity += parseFloat(songRarity.rarityIndex);

    // Count rare songs (SRI > 70)
    if (parseFloat(songRarity.rarityIndex) > 70) {
      showMetrics.rareSongs++;
    }

    // Check for bustouts (showsSince > 100)
    if (songRarity.metadata.showsSince > 100) {
      showMetrics.bustouts.push({
        song,
        gap: songRarity.metadata.showsSince
      });
    }

    // Check for debuts
    if (isDebut(song, show, allShows)) {
      showMetrics.debuts.push(song);
    }
  });

  // Guest appearance bonus
  if (show.guests && show.guests.length > 0) {
    showMetrics.guests = show.guests;
  }

  // Calculate component scores
  const scores = {
    songRarityScore: calculateAverageSongRarityScore(showMetrics.totalSongRarity, show.setlist.length),
    bustoutScore: calculateBustoutScore(showMetrics.bustouts),
    debutScore: calculateDebutScore(showMetrics.debuts),
    guestScore: calculateGuestScore(showMetrics.guests),
    structureScore: calculateStructureScore(show),
    lengthScore: calculateLengthScore(show.setlist.length)
  };

  // Weights
  const weights = {
    songRarityScore: 0.35,
    bustoutScore: 0.25,
    debutScore: 0.15,
    guestScore: 0.10,
    structureScore: 0.10,
    lengthScore: 0.05
  };

  // Calculate weighted show rarity index
  const showRarityIndex = Object.keys(scores).reduce((total, key) => {
    return total + (scores[key] * weights[key]);
  }, 0);

  return {
    showRarityIndex: showRarityIndex.toFixed(2),
    tier: getShowRarityTier(showRarityIndex),
    scores,
    highlights: {
      rareSongs: showMetrics.rareSongs,
      bustouts: showMetrics.bustouts,
      debuts: showMetrics.debuts,
      guests: showMetrics.guests
    },
    percentile: calculatePercentileRank(showRarityIndex, allShows)
  };
}

// Average Song Rarity Score
function calculateAverageSongRarityScore(totalRarity, songCount) {
  const avgRarity = totalRarity / songCount;

  // Scale to 0-100
  return Math.min(100, avgRarity * 1.2);
}

// Bustout Score (exponential with gap length)
function calculateBustoutScore(bustouts) {
  if (bustouts.length === 0) return 0;

  const bustoutPoints = bustouts.reduce((total, bustout) => {
    // Exponential scoring for longer gaps
    if (bustout.gap > 500) return total + 50;
    if (bustout.gap > 300) return total + 35;
    if (bustout.gap > 200) return total + 25;
    if (bustout.gap > 100) return total + 15;
    return total + 10;
  }, 0);

  return Math.min(100, bustoutPoints);
}

// Debut Score
function calculateDebutScore(debuts) {
  if (debuts.length === 0) return 0;

  // Multiple debuts in one show is very special
  const baseScore = debuts.length * 30;
  const multipleBonus = debuts.length > 1 ? 20 : 0;

  return Math.min(100, baseScore + multipleBonus);
}

// Guest Score
function calculateGuestScore(guests) {
  if (!guests || guests.length === 0) return 0;

  // Tier-based scoring
  const guestPoints = guests.reduce((total, guest) => {
    const tier = getGuestTier(guest);

    switch(tier) {
      case 'special': return total + 40; // Legends (Warren Haynes, etc)
      case 'frequent': return total + 15; // Tim Reynolds, Rashawn Ross
      case 'notable': return total + 25;  // Known musicians
      default: return total + 10;         // Local guests
    }
  }, 0);

  return Math.min(100, guestPoints);
}

// Structure Score (unusual setlist structures)
function calculateStructureScore(show) {
  let structureScore = 0;

  // Long show bonus
  if (show.setlist.length > 25) structureScore += 20;
  if (show.setlist.length > 28) structureScore += 20;

  // Acoustic set bonus
  if (hasAcousticSet(show)) structureScore += 15;

  // Multiple encores
  const encoreCount = getEncoreCount(show);
  if (encoreCount > 2) structureScore += 15;

  // Unusual opener
  const opener = show.setlist[0];
  if (isUnusualOpener(opener)) structureScore += 10;

  // Extensive segueing
  if (show.segueMappings && show.segueMappings.length > 5) {
    structureScore += 10;
  }

  return Math.min(100, structureScore);
}

// Length Score
function calculateLengthScore(songCount) {
  // Normalize around typical show length (18-22 songs)
  if (songCount < 15) return 10;  // Short show
  if (songCount < 18) return 30;
  if (songCount < 23) return 50;  // Normal
  if (songCount < 26) return 70;  // Long show
  return 90;                      // Epic show
}
```

### 3. Percentile Ranking

```javascript
// Calculate percentile rank of show among all shows
function calculatePercentileRank(showRarityIndex, allShows) {
  const allRarityScores = allShows
    .map(show => calculateShowRarityIndex(show, allShows).showRarityIndex)
    .map(score => parseFloat(score))
    .sort((a, b) => a - b);

  const position = allRarityScores.filter(score => score <= showRarityIndex).length;
  const percentile = (position / allRarityScores.length) * 100;

  return {
    percentile: percentile.toFixed(2),
    rank: allRarityScores.length - position + 1,
    totalShows: allRarityScores.length,
    description: getPercentileDescription(percentile)
  };
}

function getPercentileDescription(percentile) {
  if (percentile >= 99) return "Top 1% - Legendary";
  if (percentile >= 95) return "Top 5% - Elite";
  if (percentile >= 90) return "Top 10% - Exceptional";
  if (percentile >= 75) return "Top 25% - Outstanding";
  if (percentile >= 50) return "Top 50% - Above Average";
  return "Bottom 50% - Standard";
}
```

### 4. Era-Adjusted Rarity

```javascript
// Adjust rarity scores based on era context
function calculateEraAdjustedRarity(song, show, allShows) {
  const showEra = getShowEra(show.date);
  const eraShows = allShows.filter(s => getShowEra(s.date) === showEra);

  // Calculate rarity within era
  const eraRarity = calculateSongRarityIndex(song, eraShows, show.date);

  // Calculate global rarity
  const globalRarity = calculateSongRarityIndex(song, allShows, show.date);

  return {
    eraRarity: parseFloat(eraRarity.rarityIndex),
    globalRarity: parseFloat(globalRarity.rarityIndex),
    adjustment: (parseFloat(eraRarity.rarityIndex) - parseFloat(globalRarity.rarityIndex)).toFixed(2),
    context: getEraContext(song, showEra)
  };
}

// Era Context Descriptions
function getEraContext(song, era) {
  const songIntro = getSongIntroductionEra(song);

  if (songIntro === era) {
    return "Contemporary song for this era";
  } else if (eraIndex(songIntro) < eraIndex(era)) {
    return "Throwback to earlier era";
  } else {
    return "Not yet released in this era";
  }
}

function eraIndex(era) {
  const eras = ['early', 'middle', 'modern'];
  return eras.indexOf(era);
}
```

### 5. Rarity Trending

```javascript
// Track how song rarity changes over time
function calculateRarityTrend(song, allShows) {
  const windows = [
    { name: "Last Year", shows: getShowsSince(daysAgo(365)) },
    { name: "Last 3 Years", shows: getShowsSince(daysAgo(1095)) },
    { name: "Last 5 Years", shows: getShowsSince(daysAgo(1825)) },
    { name: "All Time", shows: allShows }
  ];

  const trendData = windows.map(window => {
    const plays = window.shows.filter(s => s.setlist.includes(song)).length;
    const rate = (plays / window.shows.length * 100).toFixed(2);

    return {
      period: window.name,
      plays,
      totalShows: window.shows.length,
      rate: rate + "%"
    };
  });

  // Calculate trend direction
  const rates = trendData.map(d => parseFloat(d.rate));
  const trend = determineTrend(rates);

  return {
    trendData,
    trend,
    analysis: getTrendAnalysis(song, trend)
  };
}

function determineTrend(rates) {
  if (rates[0] > rates[1] * 1.5) return "surging";
  if (rates[0] > rates[1] * 1.2) return "increasing";
  if (rates[0] > rates[2] * 0.8) return "stable";
  if (rates[0] < rates[1] * 0.5) return "declining";
  return "sporadic";
}

function getTrendAnalysis(song, trend) {
  const analyses = {
    surging: `${song} has seen a significant increase in play frequency recently`,
    increasing: `${song} is being played more often in recent tours`,
    stable: `${song} maintains consistent rotation across eras`,
    declining: `${song} has been played less frequently in recent years`,
    sporadic: `${song} appears irregularly without clear pattern`
  };

  return analyses[trend];
}
```

## Data Structures

### Song Rarity Object
```javascript
{
  song: "Halloween",
  rarityIndex: 94.7,
  tier: "ultra-rare",
  scores: {
    frequencyScore: 95,
    liberationScore: 95,
    gapScore: 88,
    eraScore: 85,
    debutBonusScore: 0
  },
  metadata: {
    totalPlays: 12,
    showsSince: 487,
    careerSpan: "27 years"
  }
}
```

### Show Rarity Object
```javascript
{
  showId: "1998-12-19",
  showRarityIndex: 87.3,
  tier: "exceptional",
  scores: {
    songRarityScore: 72,
    bustoutScore: 45,
    debutScore: 0,
    guestScore: 25,
    structureScore: 60,
    lengthScore: 90
  },
  highlights: {
    rareSongs: 8,
    bustouts: [
      { song: "Halloween", gap: 234 },
      { song: "Deed Is Done", gap: 156 }
    ],
    debuts: [],
    guests: ["Tim Reynolds"]
  },
  percentile: {
    percentile: 96.5,
    rank: 87,
    totalShows: 2500,
    description: "Top 5% - Elite"
  }
}
```

## Practical Query Examples

### Example 1: Find Top 10 Rarest Shows Ever
```javascript
const allShows = getAllShows();

const showRarityScores = allShows.map(show => ({
  show,
  rarity: calculateShowRarityIndex(show, allShows)
}))
.sort((a, b) => parseFloat(b.rarity.showRarityIndex) - parseFloat(a.rarity.showRarityIndex))
.slice(0, 10);

console.log("Top 10 Rarest DMB Shows:");
showRarityScores.forEach((item, index) => {
  console.log(`\n${index + 1}. ${item.show.date} - ${item.show.venue}`);
  console.log(`   Rarity Index: ${item.rarity.showRarityIndex}`);
  console.log(`   Percentile: ${item.rarity.percentile.percentile}%`);
  console.log(`   Rare Songs: ${item.rarity.highlights.rareSongs}`);
  console.log(`   Bustouts: ${item.rarity.highlights.bustouts.length}`);
});

// Expected output includes shows like:
// 1. 1998-12-19 - United Center (Chicago)
// 2. 1995-08-15 - Red Rocks
// 3. 2015-10-31 - MGM Grand
```

### Example 2: Calculate Rarity for Specific Song
```javascript
const song = "Help Myself";
const currentDate = new Date().toISOString().split('T')[0];
const allShows = getAllShows();

const rarity = calculateSongRarityIndex(song, allShows, currentDate);

console.log(`Rarity Analysis: ${song}`);
console.log(`Rarity Index: ${rarity.rarityIndex}`);
console.log(`Tier: ${rarity.tier}`);
console.log(`\nComponent Scores:`);
console.log(`  Frequency: ${rarity.scores.frequencyScore}`);
console.log(`  Liberation: ${rarity.scores.liberationScore}`);
console.log(`  Gap: ${rarity.scores.gapScore}`);
console.log(`  Era: ${rarity.scores.eraScore}`);
console.log(`\nMetadata:`);
console.log(`  Total Plays: ${rarity.metadata.totalPlays}`);
console.log(`  Shows Since Last: ${rarity.metadata.showsSince}`);
```

### Example 3: Find Shows with Multiple Bustouts
```javascript
const allShows = getAllShows();
const bustoutThreshold = 150; // Shows since last played

const multiBustoutShows = allShows
  .map(show => {
    const rarity = calculateShowRarityIndex(show, allShows);
    return {
      show,
      bustouts: rarity.highlights.bustouts.filter(b => b.gap > bustoutThreshold)
    };
  })
  .filter(item => item.bustouts.length >= 2)
  .sort((a, b) => b.bustouts.length - a.bustouts.length);

console.log("Shows with 2+ Major Bustouts:");
multiBustoutShows.slice(0, 20).forEach(item => {
  console.log(`\n${item.show.date} - ${item.show.venue}`);
  console.log(`Bustouts (${item.bustouts.length}):`);
  item.bustouts.forEach(b => {
    console.log(`  - ${b.song} (${b.gap} shows)`);
  });
});
```

### Example 4: Compare Era-Adjusted Rarity
```javascript
const song = "Tripping Billies";
const targetShow = getShow("2023-06-15");
const allShows = getAllShows();

const eraAdjusted = calculateEraAdjustedRarity(song, targetShow, allShows);

console.log(`Era-Adjusted Rarity: ${song}`);
console.log(`Show: ${targetShow.date}`);
console.log(`\nRarity Scores:`);
console.log(`  Era Rarity (Modern): ${eraAdjusted.eraRarity}`);
console.log(`  Global Rarity: ${eraAdjusted.globalRarity}`);
console.log(`  Adjustment: ${eraAdjusted.adjustment}`);
console.log(`\nContext: ${eraAdjusted.context}`);
```

### Example 5: Track Rarity Trend Over Time
```javascript
const song = "Bartender";
const allShows = getAllShows();

const trend = calculateRarityTrend(song, allShows);

console.log(`Rarity Trend: ${song}`);
console.log(`\nPlay Rate by Period:`);
trend.trendData.forEach(period => {
  console.log(`${period.period}: ${period.plays}/${period.totalShows} (${period.rate})`);
});
console.log(`\nTrend: ${trend.trend}`);
console.log(`Analysis: ${trend.analysis}`);
```

### Example 6: Generate Rarity Report for Upcoming Show
```javascript
const predictedSetlist = [
  "Seek Up", "Ants Marching", "#41", "Crash Into Me",
  "Too Much", "Grey Street", "Warehouse", "Halloween", // Bustout!
  "Two Step", "Lie in Our Graves"
];

const currentDate = new Date().toISOString().split('T')[0];
const allShows = getAllShows();

console.log("Predicted Setlist Rarity Analysis:\n");

let totalRarity = 0;
const rarityBreakdown = predictedSetlist.map(song => {
  const rarity = calculateSongRarityIndex(song, allShows, currentDate);
  totalRarity += parseFloat(rarity.rarityIndex);

  return {
    song,
    rarityIndex: rarity.rarityIndex,
    tier: rarity.tier,
    showsSince: rarity.metadata.showsSince
  };
}).sort((a, b) => parseFloat(b.rarityIndex) - parseFloat(a.rarityIndex));

rarityBreakdown.forEach((item, index) => {
  console.log(`${index + 1}. ${item.song}`);
  console.log(`   Rarity: ${item.rarityIndex} (${item.tier})`);
  console.log(`   Last played: ${item.showsSince} shows ago\n`);
});

const avgRarity = (totalRarity / predictedSetlist.length).toFixed(2);
console.log(`Average Setlist Rarity: ${avgRarity}`);

if (avgRarity > 60) {
  console.log("This would be an exceptionally rare setlist!");
} else if (avgRarity > 45) {
  console.log("This would be an above-average rare setlist.");
} else {
  console.log("This would be a fairly standard setlist.");
}
```

## Best Practices

1. **Update Regularly**: Recalculate rarity scores after each show
2. **Context Matters**: Always provide era context for historical comparisons
3. **Multiple Metrics**: Don't rely on single rarity metric; use composite scores
4. **Sample Size**: Require minimum data for statistical validity
5. **Normalize Scores**: Keep all component scores on 0-100 scale
6. **Weight Appropriately**: Adjust weights based on fan preferences
7. **Document Outliers**: Note special circumstances that affect rarity

## Rarity Tier Definitions

### Show Rarity Tiers
- **Legendary** (95-100): Once-in-a-lifetime shows
- **Elite** (85-94): Top 5% of all shows
- **Exceptional** (75-84): Top 10% of all shows
- **Outstanding** (65-74): Top 25% of all shows
- **Above Average** (50-64): Better than typical
- **Standard** (0-49): Typical show

### Song Rarity Tiers
- **Ultra Rare** (90-100): <20 total plays
- **Very Rare** (80-89): 20-49 total plays
- **Rare** (70-79): 50-99 total plays
- **Uncommon** (50-69): 100-199 total plays
- **Regular** (30-49): 200-499 total plays
- **Common** (0-29): 500+ total plays

## Special Considerations

### Bustout Bonus Multipliers
- 500+ show gap: 2.0x multiplier
- 300-499 show gap: 1.5x multiplier
- 200-299 show gap: 1.25x multiplier
- 100-199 show gap: 1.1x multiplier

### Debut Bonus Timeline
- Same show as debut: +100 points
- Within 1 month: +75 points
- Within 6 months: +50 points
- Within 1 year: +25 points

### Guest Tier Classifications
- **Special**: Warren Haynes, Bela Fleck, Robert Randolph
- **Frequent**: Tim Reynolds (800+), Rashawn Ross (600+)
- **Notable**: Known musicians with 5+ appearances
- **Local**: One-time or local musicians

## Common Pitfalls

1. Don't compare raw rarity scores across different eras without adjustment
2. Don't ignore special circumstances (holidays, album releases)
3. Don't over-weight single factors (frequency alone isn't rarity)
4. Don't forget to account for acoustic vs. electric versions
5. Don't assume higher rarity = better show (subjective quality differs)
6. Don't use outdated data (liberation changes constantly)
