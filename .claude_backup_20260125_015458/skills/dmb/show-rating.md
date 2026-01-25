---
name: dmb-show-rating
description: Comprehensive show quality assessment for Dave Matthews Band including objective factors (rarity, guests, bustouts), jam quality indicators, official release correlation, fan recommendations, and era-adjusted comparisons
version: 1.0.0
domain: dave-matthews-band
data-source: dmbalmanac.com
---

# DMB Show Rating Skill

## Overview
This skill provides multi-dimensional show rating and quality assessment, combining objective metrics (rarity, bustouts, guests) with subjective factors (jam quality, fan ratings, historical significance) to identify exceptional Dave Matthews Band performances.

## Core Concepts

### Rating Dimensions
1. **Rarity Score** (30%): Bustouts, debuts, rare songs
2. **Guest Factor** (15%): Guest musicians and collaborations
3. **Setlist Quality** (20%): Song selection, flow, diversity
4. **Jam Quality** (15%): Extended versions, improvisation
5. **Historical Significance** (10%): Special events, recordings
6. **Fan Rating** (10%): Community consensus

### Show Quality Tiers
- **Legendary** (95-100): Once-in-a-lifetime, often officially released
- **Elite** (85-94): Top 5% of all shows, must-hear status
- **Exceptional** (75-84): Top 10%, highly recommended
- **Outstanding** (65-74): Top 25%, above average quality
- **Good** (50-64): Solid show, worth listening
- **Standard** (0-49): Typical DMB show

## Data Structures

### Show Rating Object
```javascript
{
  showId: "1998-12-19",
  date: "1998-12-19",
  venue: "United Center",
  city: "Chicago",
  state: "IL",

  // Overall rating
  overallRating: 87.3,
  tier: "elite",
  percentileRank: 96.5,

  // Component scores (0-100 scale)
  scores: {
    rarityScore: 92,
    guestScore: 65,
    setlistQuality: 85,
    jamQuality: 88,
    historicalSignificance: 75,
    fanRating: 91
  },

  // Objective metrics
  metrics: {
    totalSongs: 24,
    rareSongs: 8,
    bustouts: [
      { song: "Halloween", gap: 234 },
      { song: "Deed Is Done", gap: 156 }
    ],
    debuts: [],
    guests: ["Tim Reynolds"],
    extendedJams: ["Two Step", "Lie in Our Graves", "Warehouse"],
    specialCircumstances: "Carter's birthday show"
  },

  // Fan data
  fanMetrics: {
    averageRating: 9.1,
    totalRatings: 247,
    recommendationRate: 94,
    keywords: ["bustouts", "extended jams", "birthday show"]
  },

  // Official status
  officialRelease: {
    released: true,
    releaseType: "Live Trax Vol. 6",
    releaseDate: "2005-12-06"
  },

  // Recommendations
  recommendations: {
    mustHear: true,
    topSongs: ["Halloween", "Two Step", "Lie in Our Graves"],
    similarShows: ["1995-08-15", "2015-10-31", "2000-07-10"],
    reason: "Multiple bustouts, extended jams, special occasion"
  }
}
```

### Jam Quality Metrics
```javascript
{
  show: "1998-12-19",
  jamAnalysis: {
    totalJams: 6,
    averageJamLength: 13.4, // minutes
    jamDensity: 0.25, // jams per song
    extendedSongs: [
      {
        song: "Two Step",
        duration: "17:23",
        extensionFactor: 1.49, // vs average duration
        jamType: "exploratory"
      },
      {
        song: "Warehouse",
        duration: "14:56",
        extensionFactor: 1.67,
        jamType: "high_energy"
      }
    ],
    jamQualityScore: 88,
    jamEra: "peak_improvisation"
  }
}
```

## Algorithms

### 1. Overall Show Rating Calculation

```javascript
// Master show rating algorithm
function calculateShowRating(show, allShows) {
  // Calculate component scores
  const scores = {
    rarityScore: calculateRarityScore(show, allShows),
    guestScore: calculateGuestScore(show),
    setlistQuality: calculateSetlistQuality(show, allShows),
    jamQuality: calculateJamQuality(show),
    historicalSignificance: calculateHistoricalSignificance(show),
    fanRating: calculateFanRating(show)
  };

  // Weights for overall calculation
  const weights = {
    rarityScore: 0.30,
    guestScore: 0.15,
    setlistQuality: 0.20,
    jamQuality: 0.15,
    historicalSignificance: 0.10,
    fanRating: 0.10
  };

  // Calculate weighted overall rating
  const overallRating = Object.keys(scores).reduce((total, key) => {
    return total + (scores[key] * weights[key]);
  }, 0);

  // Calculate percentile rank
  const percentileRank = calculatePercentileRank(overallRating, allShows);

  return {
    showId: show.showId,
    date: show.date,
    venue: show.venue,
    overallRating: overallRating.toFixed(2),
    tier: getShowTier(overallRating),
    percentileRank,
    scores,
    metrics: extractShowMetrics(show, allShows),
    recommendations: generateRecommendations(show, overallRating, scores)
  };
}

// Rarity Score (from rarity-scoring.md)
function calculateRarityScore(show, allShows) {
  const rarityIndex = calculateShowRarityIndex(show, allShows);
  return parseFloat(rarityIndex.showRarityIndex);
}

// Guest Score
function calculateGuestScore(show) {
  if (!show.guests || show.guests.length === 0) return 20;

  let guestPoints = 0;

  show.guests.forEach(guest => {
    const tier = getGuestTier(guest);

    switch(tier) {
      case 1: // Legendary (Tim Reynolds)
        guestPoints += 30;
        break;
      case 2: // Regular band members
        guestPoints += 20;
        break;
      case 3: // Frequent collaborators
        guestPoints += 15;
        break;
      case 4: // Notable musicians (Warren Haynes, Béla Fleck)
        guestPoints += 40;
        break;
      case 5: // Occasional guests
        guestPoints += 25;
        break;
      default:
        guestPoints += 15;
    }
  });

  // Multiple guests bonus
  if (show.guests.length > 1) {
    guestPoints += 15;
  }

  return Math.min(100, guestPoints);
}

// Setlist Quality Score
function calculateSetlistQuality(show, allShows) {
  let qualityScore = 0;

  // Length factor (optimal 18-24 songs)
  const length = show.setlist.length;
  if (length >= 18 && length <= 24) {
    qualityScore += 20;
  } else if (length >= 15 && length <= 27) {
    qualityScore += 15;
  } else if (length >= 25) {
    qualityScore += 25; // Epic show bonus
  } else {
    qualityScore += 10;
  }

  // Diversity factor (unique vs. repeated songs)
  const uniqueSongs = new Set(show.setlist).size;
  const diversityRatio = uniqueSongs / length;
  qualityScore += (diversityRatio * 20);

  // Opener quality
  const opener = show.setlist[0];
  if (isGreatOpener(opener)) {
    qualityScore += 10;
  }

  // Closer quality
  const closer = show.setlist[show.setlist.length - 1];
  if (isGreatCloser(closer)) {
    qualityScore += 10;
  }

  // Flow quality (balanced set structure)
  const flowScore = calculateFlowScore(show);
  qualityScore += flowScore;

  // Segue bonus
  if (show.segueMappings && show.segueMappings.length >= 3) {
    qualityScore += 15;
  }

  return Math.min(100, qualityScore);
}

// Jam Quality Score
function calculateJamQuality(show) {
  if (!show.durations) return 50; // Default if no duration data

  let jamScore = 0;
  const extendedSongs = [];

  show.setlist.forEach(song => {
    const duration = show.durations[song];
    if (!duration) return;

    const avgDuration = getAverageDuration(song);
    const durationMinutes = parseDuration(duration);

    // Check if extended (30% longer than average)
    if (durationMinutes > avgDuration * 1.3) {
      const extensionFactor = durationMinutes / avgDuration;
      extendedSongs.push({ song, extensionFactor });
      jamScore += Math.min(20, extensionFactor * 10);
    }
  });

  // Era bonus (early/middle era had better jams)
  const era = getShowEra(show.date);
  if (era === 'early') jamScore += 15;
  else if (era === 'middle') jamScore += 10;

  // Multiple extended songs bonus
  if (extendedSongs.length >= 3) {
    jamScore += 20;
  }

  return Math.min(100, jamScore);
}

// Historical Significance Score
function calculateHistoricalSignificance(show) {
  let significance = 0;

  // Official release (Live Trax, major live albums)
  if (show.officialRelease) {
    if (show.officialRelease.releaseType.includes('Live at')) {
      significance += 50; // Major live album
    } else if (show.officialRelease.releaseType.includes('Live Trax')) {
      significance += 30; // Live Trax series
    }
  }

  // Special events
  if (show.specialEvent) {
    if (show.specialEvent.includes('New Year')) significance += 20;
    if (show.specialEvent.includes('birthday')) significance += 15;
    if (show.specialEvent.includes('anniversary')) significance += 20;
    if (show.specialEvent.includes('benefit')) significance += 15;
    if (show.specialEvent.includes('tribute')) significance += 20;
  }

  // Milestone shows
  if (show.showNumber && show.showNumber % 100 === 0) {
    significance += 15;
  }

  // First/last show at venue
  if (show.venueFirst) significance += 10;
  if (show.venueLast) significance += 10;

  // Tour opener/closer
  if (show.tourPosition === 'opener') significance += 15;
  if (show.tourPosition === 'closer') significance += 15;

  return Math.min(100, significance);
}

// Fan Rating Score
function calculateFanRating(show) {
  if (!show.fanMetrics) return 50; // Default neutral

  const avgRating = show.fanMetrics.averageRating;
  const totalRatings = show.fanMetrics.totalRatings;

  // Convert average rating (0-10 scale) to 0-100
  let fanScore = avgRating * 10;

  // Confidence adjustment based on number of ratings
  if (totalRatings < 10) {
    fanScore *= 0.7; // Low confidence
  } else if (totalRatings < 50) {
    fanScore *= 0.85; // Medium confidence
  }
  // Full weight for 50+ ratings

  return Math.min(100, fanScore);
}

function getShowTier(rating) {
  if (rating >= 95) return 'legendary';
  if (rating >= 85) return 'elite';
  if (rating >= 75) return 'exceptional';
  if (rating >= 65) return 'outstanding';
  if (rating >= 50) return 'good';
  return 'standard';
}
```

### 2. Flow Quality Analysis

```javascript
// Analyze setlist flow and pacing
function calculateFlowScore(show) {
  let flowScore = 0;

  const setlist = show.setlist;

  // Check for balanced tempo distribution
  const tempos = setlist.map(song => getSongTempo(song));
  const tempoVariety = calculateVariety(tempos);
  flowScore += (tempoVariety * 15);

  // Check for energy arc (build and release)
  const energyLevels = setlist.map(song => getSongEnergy(song));
  const hasProperArc = detectEnergyArc(energyLevels);
  if (hasProperArc) flowScore += 15;

  // Check for thematic coherence
  const themes = setlist.map(song => getSongTheme(song));
  const thematicClusters = detectThematicClusters(themes);
  if (thematicClusters.length > 0) flowScore += 10;

  // Avoid too many similar songs in a row
  const repetitionPenalty = detectRepetitiveSections(setlist);
  flowScore -= repetitionPenalty;

  return Math.max(0, flowScore);
}

// Detect proper energy arc
function detectEnergyArc(energyLevels) {
  // Good shows typically build energy, release, rebuild
  const firstThird = energyLevels.slice(0, Math.floor(energyLevels.length / 3));
  const lastThird = energyLevels.slice(-Math.floor(energyLevels.length / 3));

  const firstAvg = average(firstThird);
  const lastAvg = average(lastThird);

  // Should end higher than it started
  return lastAvg > firstAvg * 1.1;
}

// Detect thematic clusters (similar songs grouped)
function detectThematicClusters(themes) {
  const clusters = [];
  let currentCluster = [themes[0]];

  for (let i = 1; i < themes.length; i++) {
    if (themes[i] === themes[i - 1]) {
      currentCluster.push(themes[i]);
    } else {
      if (currentCluster.length >= 2) {
        clusters.push(currentCluster);
      }
      currentCluster = [themes[i]];
    }
  }

  return clusters;
}
```

### 3. Must-Hear Show Identification

```javascript
// Identify must-hear shows
function identifyMustHearShows(allShows) {
  const ratings = allShows.map(show => ({
    show,
    rating: calculateShowRating(show, allShows)
  }));

  // Criteria for must-hear status
  const mustHear = ratings.filter(item => {
    const rating = item.rating;

    // Automatic must-hear if legendary tier
    if (rating.tier === 'legendary') return true;

    // Elite tier with multiple special factors
    if (rating.tier === 'elite') {
      const specialFactors = [
        rating.scores.rarityScore > 85,
        rating.metrics.bustouts.length >= 2,
        rating.scores.jamQuality > 85,
        rating.officialRelease?.released
      ].filter(Boolean).length;

      return specialFactors >= 2;
    }

    return false;
  }).sort((a, b) => parseFloat(b.rating.overallRating) - parseFloat(a.rating.overallRating));

  return {
    total: mustHear.length,
    shows: mustHear.map(item => ({
      date: item.show.date,
      venue: item.show.venue,
      rating: item.rating.overallRating,
      tier: item.rating.tier,
      highlights: extractHighlights(item.rating)
    }))
  };
}

function extractHighlights(rating) {
  const highlights = [];

  if (rating.metrics.bustouts.length > 0) {
    highlights.push(`${rating.metrics.bustouts.length} bustout(s)`);
  }

  if (rating.metrics.debuts.length > 0) {
    highlights.push(`${rating.metrics.debuts.length} debut(s)`);
  }

  if (rating.metrics.guests.length > 0) {
    highlights.push(`Guest: ${rating.metrics.guests.join(', ')}`);
  }

  if (rating.scores.jamQuality > 85) {
    highlights.push('Extended jams');
  }

  if (rating.officialRelease?.released) {
    highlights.push(`Released: ${rating.officialRelease.releaseType}`);
  }

  return highlights;
}
```

### 4. Similar Show Recommendations

```javascript
// Find similar shows based on characteristics
function findSimilarShows(targetShow, allShows, limit = 5) {
  const targetRating = calculateShowRating(targetShow, allShows);

  const similarities = allShows
    .filter(show => show.showId !== targetShow.showId)
    .map(show => {
      const showRating = calculateShowRating(show, allShows);

      // Calculate similarity score
      const similarity = calculateSimilarityScore(targetRating, showRating);

      return {
        show,
        rating: showRating,
        similarityScore: similarity
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);

  return similarities.map(item => ({
    date: item.show.date,
    venue: item.show.venue,
    similarityScore: item.similarityScore.toFixed(2),
    rating: item.rating.overallRating,
    sharedCharacteristics: identifySharedCharacteristics(targetRating, item.rating)
  }));
}

// Calculate similarity between two shows
function calculateSimilarityScore(rating1, rating2) {
  let similarity = 0;

  // Compare component scores
  Object.keys(rating1.scores).forEach(key => {
    const diff = Math.abs(rating1.scores[key] - rating2.scores[key]);
    const componentSimilarity = 100 - diff;
    similarity += componentSimilarity;
  });

  // Normalize
  similarity = similarity / Object.keys(rating1.scores).length;

  // Bonus for shared special characteristics
  if (rating1.metrics.bustouts.length > 0 && rating2.metrics.bustouts.length > 0) {
    similarity += 10;
  }

  if (rating1.metrics.guests.length > 0 && rating2.metrics.guests.length > 0) {
    similarity += 5;
  }

  return Math.min(100, similarity);
}

function identifySharedCharacteristics(rating1, rating2) {
  const shared = [];

  if (rating1.tier === rating2.tier) {
    shared.push(`Both ${rating1.tier} tier`);
  }

  if (rating1.metrics.bustouts.length > 0 && rating2.metrics.bustouts.length > 0) {
    shared.push('Bustouts');
  }

  if (rating1.scores.jamQuality > 80 && rating2.scores.jamQuality > 80) {
    shared.push('Extended jams');
  }

  if (rating1.metrics.guests.length > 0 && rating2.metrics.guests.length > 0) {
    shared.push('Guest appearances');
  }

  return shared;
}
```

### 5. Era-Adjusted Show Comparison

```javascript
// Compare shows with era adjustment
function compareShowsWithEraAdjustment(show1, show2, allShows) {
  const rating1 = calculateShowRating(show1, allShows);
  const rating2 = calculateShowRating(show2, allShows);

  // Get era-specific context
  const era1 = getShowEra(show1.date);
  const era2 = getShowEra(show2.date);

  const eraShows1 = allShows.filter(s => getShowEra(s.date) === era1);
  const eraShows2 = allShows.filter(s => getShowEra(s.date) === era2);

  // Calculate percentile within era
  const eraPercentile1 = calculatePercentileRank(
    parseFloat(rating1.overallRating),
    eraShows1
  );
  const eraPercentile2 = calculatePercentileRank(
    parseFloat(rating2.overallRating),
    eraShows2
  );

  return {
    show1: {
      date: show1.date,
      venue: show1.venue,
      era: era1,
      overallRating: rating1.overallRating,
      globalPercentile: rating1.percentileRank,
      eraPercentile: eraPercentile1
    },
    show2: {
      date: show2.date,
      venue: show2.venue,
      era: era2,
      overallRating: rating2.overallRating,
      globalPercentile: rating2.percentileRank,
      eraPercentile: eraPercentile2
    },
    comparison: {
      globalWinner: parseFloat(rating1.overallRating) > parseFloat(rating2.overallRating) ?
        show1.date : show2.date,
      eraAdjustedWinner: eraPercentile1.percentile > eraPercentile2.percentile ?
        show1.date : show2.date,
      analysis: generateComparisonAnalysis(rating1, rating2, eraPercentile1, eraPercentile2)
    }
  };
}

function generateComparisonAnalysis(rating1, rating2, era1, era2) {
  const analysis = [];

  // Overall comparison
  const diff = Math.abs(parseFloat(rating1.overallRating) - parseFloat(rating2.overallRating));

  if (diff < 5) {
    analysis.push("Very close in overall quality");
  } else if (diff < 10) {
    analysis.push("Similar quality with notable differences");
  } else {
    analysis.push("Significantly different quality levels");
  }

  // Era adjustment impact
  const eraDiff = Math.abs(era1.percentile - era2.percentile);
  if (eraDiff > 10) {
    analysis.push("Era adjustment significantly changes comparison");
  }

  // Strength comparison
  const strengths1 = getTopStrengths(rating1.scores);
  const strengths2 = getTopStrengths(rating2.scores);

  analysis.push(`Show 1 strongest in: ${strengths1.join(', ')}`);
  analysis.push(`Show 2 strongest in: ${strengths2.join(', ')}`);

  return analysis;
}

function getTopStrengths(scores) {
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key, _]) => key.replace('Score', ''));
}
```

### 6. Official Release Correlation

```javascript
// Analyze correlation between show rating and official release
function analyzeOfficialReleaseCorrelation(allShows) {
  const releasedShows = allShows.filter(s => s.officialRelease?.released);
  const unreleasedShows = allShows.filter(s => !s.officialRelease?.released);

  const releasedRatings = releasedShows.map(show =>
    parseFloat(calculateShowRating(show, allShows).overallRating)
  );

  const unreleasedRatings = unreleasedShows.map(show =>
    parseFloat(calculateShowRating(show, allShows).overallRating)
  );

  return {
    releasedShows: {
      count: releasedShows.length,
      averageRating: average(releasedRatings).toFixed(2),
      medianRating: median(releasedRatings).toFixed(2),
      topRated: Math.max(...releasedRatings).toFixed(2)
    },
    unreleasedShows: {
      count: unreleasedShows.length,
      averageRating: average(unreleasedRatings).toFixed(2),
      medianRating: median(unreleasedRatings).toFixed(2),
      topRated: Math.max(...unreleasedRatings).toFixed(2)
    },
    correlation: {
      ratingDifference: (average(releasedRatings) - average(unreleasedRatings)).toFixed(2),
      percentageDifference: ((average(releasedRatings) - average(unreleasedRatings)) /
        average(unreleasedRatings) * 100).toFixed(2),
      conclusion: average(releasedRatings) > average(unreleasedRatings) ?
        "Released shows tend to be higher rated" :
        "No strong correlation between release and rating"
    },
    topUnreleasedShows: findTopUnreleasedShows(allShows, 10)
  };
}

function findTopUnreleasedShows(allShows, limit) {
  return allShows
    .filter(show => !show.officialRelease?.released)
    .map(show => ({
      show,
      rating: calculateShowRating(show, allShows)
    }))
    .sort((a, b) => parseFloat(b.rating.overallRating) - parseFloat(a.rating.overallRating))
    .slice(0, limit)
    .map(item => ({
      date: item.show.date,
      venue: item.show.venue,
      rating: item.rating.overallRating,
      tier: item.rating.tier,
      highlights: extractHighlights(item.rating)
    }));
}
```

## Practical Query Examples

### Example 1: Rate a Specific Show
```javascript
const show = getShow("1998-12-19");
const allShows = getAllShows();

const rating = calculateShowRating(show, allShows);

console.log(`Show Rating: ${show.date} - ${show.venue}\n`);
console.log(`Overall Rating: ${rating.overallRating} (${rating.tier})`);
console.log(`Percentile Rank: Top ${(100 - rating.percentileRank.percentile).toFixed(2)}%\n`);

console.log("Component Scores:");
Object.entries(rating.scores).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log(`\nHighlights:`);
console.log(`  Rare Songs: ${rating.metrics.rareSongs}`);
console.log(`  Bustouts: ${rating.metrics.bustouts.length}`);
console.log(`  Guests: ${rating.metrics.guests.join(', ') || 'None'}`);

if (rating.recommendations.mustHear) {
  console.log(`\nMUST-HEAR SHOW`);
  console.log(`Reason: ${rating.recommendations.reason}`);
}
```

### Example 2: Find Top 20 Shows of All Time
```javascript
const allShows = getAllShows();

const topShows = allShows
  .map(show => ({
    show,
    rating: calculateShowRating(show, allShows)
  }))
  .sort((a, b) => parseFloat(b.rating.overallRating) - parseFloat(a.rating.overallRating))
  .slice(0, 20);

console.log("Top 20 Dave Matthews Band Shows of All Time:\n");

topShows.forEach((item, index) => {
  console.log(`${index + 1}. ${item.show.date} - ${item.show.venue}`);
  console.log(`   Rating: ${item.rating.overallRating} (${item.rating.tier})`);
  console.log(`   Highlights: ${extractHighlights(item.rating).join(', ')}\n`);
});
```

### Example 3: Compare Two Shows
```javascript
const show1 = getShow("1998-12-19");
const show2 = getShow("2015-10-31");

const comparison = compareShowsWithEraAdjustment(show1, show2, getAllShows());

console.log("Show Comparison:\n");
console.log(`Show 1: ${comparison.show1.date} (${comparison.show1.era} era)`);
console.log(`  Rating: ${comparison.show1.overallRating}`);
console.log(`  Global Percentile: ${comparison.show1.globalPercentile.percentile}%`);
console.log(`  Era Percentile: ${comparison.show1.eraPercentile.percentile}%\n`);

console.log(`Show 2: ${comparison.show2.date} (${comparison.show2.era} era)`);
console.log(`  Rating: ${comparison.show2.overallRating}`);
console.log(`  Global Percentile: ${comparison.show2.globalPercentile.percentile}%`);
console.log(`  Era Percentile: ${comparison.show2.eraPercentile.percentile}%\n`);

console.log("Comparison:");
console.log(`  Global Winner: ${comparison.comparison.globalWinner}`);
console.log(`  Era-Adjusted Winner: ${comparison.comparison.eraAdjustedWinner}`);
console.log(`\nAnalysis:`);
comparison.comparison.analysis.forEach(point => console.log(`  - ${point}`));
```

### Example 4: Find Must-Hear Shows
```javascript
const allShows = getAllShows();
const mustHear = identifyMustHearShows(allShows);

console.log(`Must-Hear DMB Shows (${mustHear.total} total):\n`);

mustHear.shows.slice(0, 25).forEach((show, index) => {
  console.log(`${index + 1}. ${show.date} - ${show.venue}`);
  console.log(`   Rating: ${show.rating} (${show.tier})`);
  console.log(`   ${show.highlights.join(' | ')}\n`);
});
```

### Example 5: Analyze Official Release Patterns
```javascript
const correlation = analyzeOfficialReleaseCorrelation(getAllShows());

console.log("Official Release Correlation Analysis:\n");

console.log("Released Shows:");
console.log(`  Count: ${correlation.releasedShows.count}`);
console.log(`  Average Rating: ${correlation.releasedShows.averageRating}`);
console.log(`  Median Rating: ${correlation.releasedShows.medianRating}\n`);

console.log("Unreleased Shows:");
console.log(`  Count: ${correlation.unreleasedShows.count}`);
console.log(`  Average Rating: ${correlation.unreleasedShows.averageRating}`);
console.log(`  Median Rating: ${correlation.unreleasedShows.medianRating}\n`);

console.log(`Conclusion: ${correlation.correlation.conclusion}`);
console.log(`Rating Difference: ${correlation.correlation.ratingDifference} points\n`);

console.log("Top Unreleased Shows:");
correlation.topUnreleasedShows.forEach((show, index) => {
  console.log(`${index + 1}. ${show.date} - ${show.venue} (${show.rating})`);
});
```

### Example 6: Find Similar Shows
```javascript
const targetShow = getShow("1998-12-19");
const similar = findSimilarShows(targetShow, getAllShows(), 10);

console.log(`Shows Similar to ${targetShow.date}:\n`);

similar.forEach((show, index) => {
  console.log(`${index + 1}. ${show.date} - ${show.venue}`);
  console.log(`   Similarity: ${show.similarityScore}%`);
  console.log(`   Rating: ${show.rating}`);
  console.log(`   Shared: ${show.sharedCharacteristics.join(', ')}\n`);
});
```

## Best Practices

1. **Multi-Dimensional**: Don't rely on single metric
2. **Era Context**: Adjust for different touring eras
3. **Objective + Subjective**: Combine metrics with fan input
4. **Update Regularly**: Fan ratings change over time
5. **Special Circumstances**: Note unique events
6. **Audio Quality**: Consider recording quality for fan ratings
7. **Release Bias**: Official releases may skew perception

## Common Pitfalls

1. Don't over-weight rarity (rare ≠ always better)
2. Don't ignore fan consensus completely
3. Don't compare cross-era without adjustment
4. Don't assume official release = best show
5. Don't forget about great "standard" shows
6. Don't let bustouts overshadow overall quality
7. Don't ignore jam quality in modern era shows
