---
name: dmb-liberation-predictor
description: Song liberation prediction system for Dave Matthews Band including gap analysis algorithms, liberation probability scoring, pattern recognition, tour opener predictions, seasonal song selection, and fan wishlist correlation
version: 1.0.0
domain: dave-matthews-band
data-source: dmbalmanac.com
---

# DMB Liberation Predictor Skill

## Overview
This skill provides sophisticated algorithms for predicting when songs will be "liberated" (played after extended gaps), identifying bustout candidates, and forecasting setlist patterns based on historical data and contextual factors.

## Core Concepts

### Liberation Definitions
- **Normal Rotation**: Gap < average gap for song
- **Approaching Liberation**: Gap between 1.0x - 1.5x average
- **Liberation Territory**: Gap between 1.5x - 2.0x average
- **Deep Liberation**: Gap between 2.0x - 3.0x average
- **Bustout Territory**: Gap > max historical gap or 100+ shows
- **Holy Grail**: Never played or gap > 500 shows

### Prediction Confidence Levels
- **Very High** (>80%): Strong historical pattern, multiple indicators
- **High** (60-79%): Clear pattern, some supporting factors
- **Moderate** (40-59%): Weak pattern, circumstantial evidence
- **Low** (20-39%): Speculative, limited evidence
- **Very Low** (<20%): Unlikely, historical precedent against

## Data Structures

### Liberation Prediction Object
```javascript
{
  song: "Halloween",
  currentGap: {
    shows: 487,
    days: 3345,
    lastPlayed: "2015-10-31"
  },

  historicalGaps: {
    average: 42,
    median: 38,
    max: 487, // Current gap is max
    min: 12,
    distribution: [
      { range: "0-20", count: 3 },
      { range: "21-50", count: 8 },
      { range: "51-100", count: 2 },
      { range: "100+", count: 1 } // Current
    ]
  },

  liberationStatus: "holy_grail",
  liberationProbability: 78.5,
  confidenceLevel: "high",

  predictionFactors: {
    gapFactor: 95, // Current gap vs historical
    seasonality: 85, // Halloween -> October
    tourPosition: 60, // Mid-tour typical
    venueType: 45, // Amphitheater less likely
    eraRelevance: 30, // Old song in modern era
    recentTrend: 20, // Rarely played recently
    fanDemand: 90 // High wishlist ranking
  },

  optimalConditions: {
    month: 10, // October
    venueType: "arena",
    tourPosition: "opener or special event",
    multiNightRun: "finale night",
    specialDate: "Halloween (10/31)"
  },

  predictions: {
    nextShow: {
      probability: 2.3,
      date: "2024-06-15",
      venue: "Gorge Amphitheatre"
    },
    nextTour: {
      probability: 15.7,
      tour: "Summer 2024",
      likelyShow: "Halloween show if scheduled"
    },
    nextYear: {
      probability: 45.2,
      conditions: "Halloween show or special event"
    }
  },

  similarBustoutPatterns: [
    {
      song: "Deed Is Done",
      lastBustout: "2015-09-12",
      gap: 234,
      circumstances: "Gorge 3-night run finale"
    }
  ],

  recommendation: "Very high liberation candidate for Halloween show or special event"
}
```

### Tour Opener Prediction Object
```javascript
{
  tour: "Summer 2024",
  tourOpener: "2024-05-20",
  venue: "Coastal Credit Union Music Park",
  city: "Raleigh, NC",

  predictions: [
    {
      song: "Don't Drink the Water",
      probability: 42.3,
      confidence: "high",
      reasoning: "Most common tour opener in recent era, strong Virginia connection",
      historicalPrecedent: {
        tourOpeners: 23,
        lastTourOpener: "2023-05-19"
      }
    },
    {
      song: "Seek Up",
      probability: 28.7,
      confidence: "moderate",
      reasoning: "Traditional tour opener, high energy, fan favorite",
      historicalPrecedent: {
        tourOpeners: 18,
        lastTourOpener: "2022-05-27"
      }
    }
  ],

  liberationCandidates: [
    {
      song: "MacHead",
      probability: 12.4,
      reasoning: "Tour openers often feature bustouts, deep liberation"
    }
  ]
}
```

## Algorithms

### 1. Liberation Probability Calculation

```javascript
// Master liberation probability algorithm
function calculateLiberationProbability(song, upcomingShow, allShows) {
  const currentDate = upcomingShow?.date || new Date().toISOString().split('T')[0];

  // Get historical data
  const liberation = calculateLiberationMetrics(song, currentDate, allShows);

  if (liberation.status === 'never_played') {
    return {
      probability: 0,
      status: 'never_played',
      message: "Song has never been played"
    };
  }

  // Calculate prediction factors
  const factors = {
    gapFactor: calculateGapFactor(liberation),
    seasonality: calculateSeasonalityFactor(song, upcomingShow),
    tourPosition: calculateTourPositionFactor(upcomingShow),
    venueType: calculateVenueTypeFactor(song, upcomingShow),
    eraRelevance: calculateEraRelevanceFactor(song, currentDate),
    recentTrend: calculateRecentTrendFactor(song, allShows),
    fanDemand: calculateFanDemandFactor(song),
    specialEvent: calculateSpecialEventFactor(song, upcomingShow)
  };

  // Weights
  const weights = {
    gapFactor: 0.30,
    seasonality: 0.15,
    tourPosition: 0.15,
    venueType: 0.10,
    eraRelevance: 0.10,
    recentTrend: 0.10,
    fanDemand: 0.05,
    specialEvent: 0.05
  };

  // Calculate weighted probability
  const baseProbability = Object.keys(factors).reduce((sum, key) => {
    return sum + (factors[key] * weights[key]);
  }, 0);

  // Apply special multipliers
  let probability = baseProbability;

  // Special event multiplier (Halloween for "Halloween", etc.)
  if (factors.specialEvent > 80) {
    probability *= 1.5;
  }

  // Tour opener multiplier
  if (upcomingShow?.tourPosition === 'opener' && liberation.showsSince > 50) {
    probability *= 1.3;
  }

  // Multi-night run finale multiplier
  if (upcomingShow?.multiNightRun?.isFinale) {
    probability *= 1.2;
  }

  probability = Math.min(100, probability);

  return {
    song,
    probability: probability.toFixed(2),
    confidenceLevel: getConfidenceLevel(probability, factors),
    liberationStatus: liberation.liberationStatus,
    currentGap: liberation.showsSince,
    factors,
    optimalConditions: determineOptimalConditions(song, factors),
    recommendation: generateLiberationRecommendation(probability, factors, liberation)
  };
}

// Gap Factor (0-100 scale)
function calculateGapFactor(liberation) {
  const ratio = liberation.showsSince / liberation.averageGap;

  if (ratio < 0.5) return 5;   // Recently played
  if (ratio < 1.0) return 20;  // Normal rotation
  if (ratio < 1.5) return 50;  // Approaching liberation
  if (ratio < 2.0) return 70;  // Liberation territory
  if (ratio < 3.0) return 85;  // Deep liberation
  if (liberation.showsSince > liberation.maxGap) return 95; // New max gap
  return 90; // Bustout territory
}

// Seasonality Factor
function calculateSeasonalityFactor(song, upcomingShow) {
  if (!upcomingShow) return 50;

  const SEASONAL_SONGS = {
    "Christmas Song": {
      months: [11, 12],
      bonus: 90
    },
    "Halloween": {
      months: [10],
      days: [31], // Halloween specifically
      bonus: 95
    },
    "Bartender": {
      months: [6, 7, 8], // Summer shows
      bonus: 70
    }
  };

  const seasonalData = SEASONAL_SONGS[song];
  if (!seasonalData) return 50; // Neutral

  const showDate = new Date(upcomingShow.date);
  const month = showDate.getMonth() + 1;
  const day = showDate.getDate();

  // Perfect match (Halloween on 10/31)
  if (seasonalData.days && seasonalData.days.includes(day) &&
      seasonalData.months.includes(month)) {
    return 95;
  }

  // Month match
  if (seasonalData.months.includes(month)) {
    return seasonalData.bonus;
  }

  // Wrong season penalty
  return 20;
}

// Tour Position Factor
function calculateTourPositionFactor(upcomingShow) {
  if (!upcomingShow?.tourInfo) return 50;

  const position = upcomingShow.tourInfo.showNumber;
  const total = upcomingShow.tourInfo.totalShows;

  // Tour opener (first 3 shows)
  if (position <= 3) return 85;

  // Tour closer (last 3 shows)
  if (position >= total - 2) return 80;

  // Milestone shows
  if (position % 50 === 0) return 70;

  // Early tour (shows 4-10)
  if (position <= 10) return 65;

  // Mid tour
  if (position <= total * 0.6) return 55;

  // Late tour
  return 45;
}

// Venue Type Factor
function calculateVenueTypeFactor(song, upcomingShow) {
  if (!upcomingShow?.venueType) return 50;

  // Get song's historical venue preferences
  const preferences = getSongVenuePreferences(song);

  const venueScores = {
    'amphitheater': preferences.amphitheater || 50,
    'arena': preferences.arena || 50,
    'theater': preferences.theater || 60,
    'festival': preferences.festival || 40,
    'stadium': preferences.stadium || 30
  };

  return venueScores[upcomingShow.venueType] || 50;
}

// Era Relevance Factor
function calculateEraRelevanceFactor(song, currentDate) {
  const songEra = getSongIntroductionEra(song);
  const currentEra = getCurrentEra(currentDate);

  // Same era = high relevance
  if (songEra === currentEra) return 80;

  // Modern era playing early era songs
  if (songEra === 'early' && currentEra === 'modern') return 35;

  // Middle era songs in modern era
  if (songEra === 'middle' && currentEra === 'modern') return 55;

  return 50;
}

// Recent Trend Factor
function calculateRecentTrendFactor(song, allShows) {
  const recentShows = getShowsSince(daysAgo(365 * 3)); // Last 3 years
  const olderShows = getShowsBetween(daysAgo(365 * 6), daysAgo(365 * 3)); // 3-6 years ago

  const recentPlays = recentShows.filter(s => s.setlist.includes(song)).length;
  const olderPlays = olderShows.filter(s => s.setlist.includes(song)).length;

  const recentRate = recentPlays / recentShows.length;
  const olderRate = olderPlays / olderShows.length;

  // Increasing trend
  if (recentRate > olderRate * 1.5) return 75;
  if (recentRate > olderRate * 1.2) return 65;

  // Stable
  if (Math.abs(recentRate - olderRate) < 0.02) return 50;

  // Declining trend
  if (recentRate < olderRate * 0.5) return 25;
  if (recentRate < olderRate * 0.8) return 35;

  return 45;
}

// Fan Demand Factor
function calculateFanDemandFactor(song) {
  // Based on wishlist data, forum activity, fan polls
  const HIGH_DEMAND = [
    "Halloween", "Deed Is Done", "Help Myself", "Kit Kat Jam",
    "Blue Water", "MacHead", "JTR"
  ];

  const MODERATE_DEMAND = [
    "Granny", "Pig", "Minarets", "#36", "Recently"
  ];

  if (HIGH_DEMAND.includes(song)) return 85;
  if (MODERATE_DEMAND.includes(song)) return 65;
  return 50;
}

// Special Event Factor
function calculateSpecialEventFactor(song, upcomingShow) {
  if (!upcomingShow) return 30;

  let eventScore = 30;

  // Song-specific events
  if (song === "Halloween" && upcomingShow.date.endsWith("-10-31")) {
    return 95; // Halloween on Halloween
  }

  if (song === "Christmas Song" && upcomingShow.date.includes("-12-")) {
    return 85; // Christmas song in December
  }

  // General special events
  if (upcomingShow.specialEvent) {
    if (upcomingShow.specialEvent.includes("New Year")) eventScore += 30;
    if (upcomingShow.specialEvent.includes("benefit")) eventScore += 20;
    if (upcomingShow.specialEvent.includes("tribute")) eventScore += 25;
    if (upcomingShow.specialEvent.includes("anniversary")) eventScore += 25;
  }

  // Multi-night run finale
  if (upcomingShow.multiNightRun?.isFinale) {
    eventScore += 20;
  }

  // Band member birthday
  if (upcomingShow.bandMemberBirthday) {
    eventScore += 15;
  }

  return Math.min(95, eventScore);
}

function getConfidenceLevel(probability, factors) {
  // Check how many factors are strongly positive
  const strongFactors = Object.values(factors).filter(f => f > 70).length;

  if (probability > 80 && strongFactors >= 3) return 'very_high';
  if (probability > 60 && strongFactors >= 2) return 'high';
  if (probability > 40) return 'moderate';
  if (probability > 20) return 'low';
  return 'very_low';
}
```

### 2. Tour Opener Prediction

```javascript
// Predict tour opening songs
function predictTourOpener(tour, allShows) {
  const tourOpenerShows = identifyTourOpeners(allShows);

  // Analyze historical tour opener frequency
  const openerFrequency = {};

  tourOpenerShows.forEach(show => {
    const opener = show.setlist[0];
    openerFrequency[opener] = (openerFrequency[opener] || 0) + 1;
  });

  // Get era-specific data
  const era = getCurrentEra(tour.startDate);
  const eraOpeners = tourOpenerShows
    .filter(show => getShowEra(show.date) === era)
    .map(show => show.setlist[0]);

  const eraFrequency = {};
  eraOpeners.forEach(song => {
    eraFrequency[song] = (eraFrequency[song] || 0) + 1;
  });

  // Calculate probabilities
  const predictions = Object.entries(eraFrequency)
    .map(([song, count]) => {
      const probability = (count / eraOpeners.length * 100);
      const lastUsed = findLastTourOpener(song, tourOpenerShows);

      return {
        song,
        probability: probability.toFixed(2),
        confidence: probability > 30 ? 'high' : probability > 15 ? 'moderate' : 'low',
        historicalCount: count,
        allTimeCount: openerFrequency[song] || 0,
        lastUsed: lastUsed?.date || 'Never',
        reasoning: generateOpenerReasoning(song, count, eraOpeners.length)
      };
    })
    .sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

  // Add liberation candidates
  const liberationCandidates = findLiberationTourOpeners(tour, allShows);

  return {
    tour: tour.name,
    tourOpener: tour.startDate,
    era,
    topPredictions: predictions.slice(0, 10),
    liberationCandidates,
    wildcardPicks: generateWildcardPicks(tour, allShows)
  };
}

// Find songs that might be liberated as tour openers
function findLiberationTourOpeners(tour, allShows) {
  const candidates = getAllUniqueSongs(allShows)
    .map(song => {
      const liberation = calculateLiberationMetrics(song, tour.startDate, allShows);

      return {
        song,
        gap: liberation.showsSince,
        liberationStatus: liberation.liberationStatus
      };
    })
    .filter(item =>
      item.liberationStatus === 'deep_liberation' ||
      item.liberationStatus === 'potential_bustout'
    )
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 10);

  return candidates.map(item => ({
    song: item.song,
    gap: item.gap,
    probability: calculateTourOpenerBustoutProbability(item.song, tour, allShows),
    reasoning: "Deep liberation, tour openers often feature bustouts"
  }));
}

function calculateTourOpenerBustoutProbability(song, tour, allShows) {
  // Tour openers have higher bustout probability
  const baseProbability = calculateLiberationProbability(song, {
    date: tour.startDate,
    tourPosition: 'opener'
  }, allShows);

  // Check if song has been tour opener before
  const tourOpeners = identifyTourOpeners(allShows);
  const wasOpenerBefore = tourOpeners.some(show =>
    show.setlist[0] === song
  );

  let probability = parseFloat(baseProbability.probability);

  if (wasOpenerBefore) {
    probability *= 1.4; // 40% boost
  }

  return Math.min(100, probability).toFixed(2);
}

function generateOpenerReasoning(song, count, total) {
  const percentage = (count / total * 100).toFixed(1);

  if (percentage > 30) {
    return `Very common tour opener (${percentage}% of recent tours)`;
  } else if (percentage > 15) {
    return `Frequent tour opener (${percentage}% of recent tours)`;
  } else {
    return `Occasional tour opener (${percentage}% of recent tours)`;
  }
}
```

### 3. Pattern Recognition

```javascript
// Recognize historical liberation patterns
function recognizeLiberationPatterns(allShows) {
  const liberations = [];

  // Find all significant liberations (100+ show gaps)
  const allSongs = getAllUniqueSongs(allShows);

  allSongs.forEach(song => {
    const performances = allShows
      .filter(show => show.setlist.includes(song))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let i = 0; i < performances.length - 1; i++) {
      const gap = allShows.filter(s =>
        new Date(s.date) > new Date(performances[i].date) &&
        new Date(s.date) <= new Date(performances[i + 1].date)
      ).length - 1;

      if (gap >= 100) {
        liberations.push({
          song,
          liberationShow: performances[i + 1],
          gap,
          lastPlayedBefore: performances[i].date,
          circumstances: extractCircumstances(performances[i + 1])
        });
      }
    }
  });

  // Analyze patterns
  return {
    totalLiberations: liberations.length,
    patterns: analyzeLiberationCircumstances(liberations),
    commonFactors: identifyCommonFactors(liberations),
    predictions: generatePatternBasedPredictions(liberations, allShows)
  };
}

// Analyze circumstances of past liberations
function analyzeLiberationCircumstances(liberations) {
  const circumstances = {
    tourOpeners: 0,
    tourClosers: 0,
    multiNightFinales: 0,
    specialEvents: 0,
    specificVenues: {},
    months: Array(12).fill(0),
    venueTypes: {}
  };

  liberations.forEach(lib => {
    const show = lib.liberationShow;

    if (lib.circumstances.tourPosition === 'opener') circumstances.tourOpeners++;
    if (lib.circumstances.tourPosition === 'closer') circumstances.tourClosers++;
    if (lib.circumstances.multiNightFinale) circumstances.multiNightFinales++;
    if (lib.circumstances.specialEvent) circumstances.specialEvents++;

    const venue = show.venue;
    circumstances.specificVenues[venue] = (circumstances.specificVenues[venue] || 0) + 1;

    const month = new Date(show.date).getMonth();
    circumstances.months[month]++;

    const venueType = show.venueType || 'unknown';
    circumstances.venueTypes[venueType] = (circumstances.venueTypes[venueType] || 0) + 1;
  });

  return {
    tourPosition: {
      openers: circumstances.tourOpeners,
      closers: circumstances.tourClosers,
      percentage: ((circumstances.tourOpeners + circumstances.tourClosers) / liberations.length * 100).toFixed(2)
    },
    multiNightRuns: {
      count: circumstances.multiNightFinales,
      percentage: (circumstances.multiNightFinales / liberations.length * 100).toFixed(2)
    },
    topVenues: sortByFrequency(circumstances.specificVenues).slice(0, 10),
    monthlyDistribution: circumstances.months.map((count, index) => ({
      month: index + 1,
      count,
      monthName: getMonthName(index + 1)
    })),
    venueTypes: sortByFrequency(circumstances.venueTypes)
  };
}

function identifyCommonFactors(liberations) {
  return {
    mostLikelyTime: "Tour openers and closers account for significant liberations",
    mostLikelyVenue: "Multi-night run finales have higher liberation frequency",
    seasonalTrend: "Summer tours (June-August) see more liberations",
    venuePreference: "Larger amphitheaters and special venues more likely"
  };
}
```

### 4. Seasonal Song Selection

```javascript
// Predict seasonal song selection patterns
function predictSeasonalSelection(month, allShows) {
  // Analyze historical monthly patterns
  const monthlyPlays = {};

  allShows
    .filter(show => new Date(show.date).getMonth() + 1 === month)
    .forEach(show => {
      show.setlist.forEach(song => {
        if (!monthlyPlays[song]) {
          monthlyPlays[song] = { count: 0, shows: [] };
        }
        monthlyPlays[song].count++;
        monthlyPlays[song].shows.push(show.date);
      });
    });

  // Find songs with strong monthly preference
  const seasonalSongs = Object.entries(monthlyPlays)
    .map(([song, data]) => {
      const totalPlays = allShows.filter(s => s.setlist.includes(song)).length;
      const monthlyRate = (data.count / totalPlays * 100);

      return {
        song,
        monthlyPlays: data.count,
        totalPlays,
        monthlyRate: monthlyRate.toFixed(2),
        overrepresentation: (monthlyRate / (1/12 * 100)).toFixed(2) // vs expected 8.33%
      };
    })
    .filter(item => parseFloat(item.overrepresentation) > 1.5) // 50% over-represented
    .sort((a, b) => parseFloat(b.overrepresentation) - parseFloat(a.overrepresentation));

  return {
    month,
    monthName: getMonthName(month),
    seasonalSongs: seasonalSongs.slice(0, 20),
    recommendations: generateSeasonalRecommendations(month, seasonalSongs)
  };
}

function generateSeasonalRecommendations(month, seasonalSongs) {
  const recommendations = [];

  if (month === 10) {
    recommendations.push("Halloween is strongly associated with October");
    recommendations.push("Extended jams more common in fall amphitheater season");
  }

  if (month === 12) {
    recommendations.push("Christmas Song highly likely in December");
    recommendations.push("New Year's Eve shows feature special setlists");
  }

  if ([6, 7, 8].includes(month)) {
    recommendations.push("Summer favorites like Bartender more common");
    recommendations.push("Longer shows typical of summer amphitheater season");
  }

  return recommendations;
}
```

### 5. Fan Wishlist Correlation

```javascript
// Correlate liberation probability with fan wishlist
function correlateFanWishlist(allShows) {
  const FAN_WISHLIST = [
    { song: "Halloween", demand: 95 },
    { song: "Deed Is Done", demand: 85 },
    { song: "Help Myself", demand: 80 },
    { song: "Kit Kat Jam", demand: 75 },
    { song: "Blue Water", demand: 90 },
    { song: "MacHead", demand: 70 },
    { song: "Granny", demand: 65 },
    { song: "Pig", demand: 60 },
    { song: "True Reflections", demand: 70 },
    { song: "JTR", demand: 75 }
  ];

  const currentDate = new Date().toISOString().split('T')[0];

  const analysis = FAN_WISHLIST.map(item => {
    const liberation = calculateLiberationMetrics(item.song, currentDate, allShows);
    const probability = calculateLiberationProbability(item.song, null, allShows);

    return {
      song: item.song,
      fanDemand: item.demand,
      gap: liberation.showsSince,
      liberationStatus: liberation.liberationStatus,
      probability: probability.probability,
      likelihood: getLikelihoodCategory(parseFloat(probability.probability))
    };
  }).sort((a, b) => parseFloat(b.probability) - parseFloat(a.probability));

  return {
    wishlistAnalysis: analysis,
    topCandidates: analysis.filter(item => parseFloat(item.probability) > 40),
    dreamBustouts: analysis.filter(item => item.gap > 200 && item.fanDemand > 80),
    recommendation: "Track tour openers and special events for best bustout opportunities"
  };
}

function getLikelihoodCategory(probability) {
  if (probability > 60) return 'Highly Likely';
  if (probability > 40) return 'Possible';
  if (probability > 20) return 'Unlikely';
  return 'Very Unlikely';
}
```

## Practical Query Examples

### Example 1: Predict Liberation for Specific Song
```javascript
const song = "Halloween";
const upcomingShow = {
  date: "2024-10-31",
  venue: "Madison Square Garden",
  venueType: "arena",
  tourInfo: { showNumber: 25, totalShows: 45 },
  specialEvent: "Halloween",
  multiNightRun: { isFinale: true, totalNights: 2 }
};

const prediction = calculateLiberationProbability(song, upcomingShow, getAllShows());

console.log(`Liberation Prediction: ${song}\n`);
console.log(`Current Gap: ${prediction.currentGap} shows`);
console.log(`Status: ${prediction.liberationStatus}`);
console.log(`Probability: ${prediction.probability}%`);
console.log(`Confidence: ${prediction.confidenceLevel}\n`);

console.log("Prediction Factors:");
Object.entries(prediction.factors).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

console.log(`\nOptimal Conditions:`);
console.log(`  Month: ${prediction.optimalConditions.month}`);
console.log(`  Venue Type: ${prediction.optimalConditions.venueType}`);
console.log(`  Tour Position: ${prediction.optimalConditions.tourPosition}`);

console.log(`\nRecommendation: ${prediction.recommendation}`);
```

### Example 2: Predict Tour Opener
```javascript
const tour = {
  name: "Summer 2024",
  startDate: "2024-05-20",
  endDate: "2024-09-15"
};

const openerPrediction = predictTourOpener(tour, getAllShows());

console.log(`Tour Opener Predictions: ${tour.name}\n`);
console.log("Top Predictions:");
openerPrediction.topPredictions.slice(0, 5).forEach((pred, index) => {
  console.log(`${index + 1}. ${pred.song}`);
  console.log(`   Probability: ${pred.probability}%`);
  console.log(`   Confidence: ${pred.confidence}`);
  console.log(`   Reasoning: ${pred.reasoning}\n`);
});

console.log("Liberation Candidates:");
openerPrediction.liberationCandidates.slice(0, 5).forEach((cand, index) => {
  console.log(`${index + 1}. ${cand.song}`);
  console.log(`   Gap: ${cand.gap} shows`);
  console.log(`   Probability: ${cand.probability}%\n`);
});
```

### Example 3: Analyze Liberation Patterns
```javascript
const patterns = recognizeLiberationPatterns(getAllShows());

console.log("Liberation Pattern Analysis:\n");
console.log(`Total Significant Liberations: ${patterns.totalLiberations}\n`);

console.log("Tour Position Correlation:");
console.log(`  Openers: ${patterns.patterns.tourPosition.openers}`);
console.log(`  Closers: ${patterns.patterns.tourPosition.closers}`);
console.log(`  Percentage: ${patterns.patterns.tourPosition.percentage}%\n`);

console.log("Multi-Night Run Correlation:");
console.log(`  Finale Liberations: ${patterns.patterns.multiNightRuns.count}`);
console.log(`  Percentage: ${patterns.patterns.multiNightRuns.percentage}%\n`);

console.log("Top Liberation Venues:");
patterns.patterns.topVenues.slice(0, 5).forEach(([venue, count]) => {
  console.log(`  ${venue}: ${count} liberations`);
});
```

### Example 4: Seasonal Predictions
```javascript
const month = 10; // October
const seasonal = predictSeasonalSelection(month, getAllShows());

console.log(`Seasonal Song Predictions: ${seasonal.monthName}\n`);

console.log("Songs with Seasonal Preference:");
seasonal.seasonalSongs.slice(0, 10).forEach((song, index) => {
  console.log(`${index + 1}. ${song.song}`);
  console.log(`   Monthly Rate: ${song.monthlyRate}%`);
  console.log(`   Over-representation: ${song.overrepresentation}x\n`);
});

console.log("Recommendations:");
seasonal.recommendations.forEach(rec => console.log(`  - ${rec}`));
```

### Example 5: Fan Wishlist Analysis
```javascript
const wishlist = correlateFanWishlist(getAllShows());

console.log("Fan Wishlist Liberation Analysis:\n");

console.log("Top Candidates:");
wishlist.topCandidates.forEach((item, index) => {
  console.log(`${index + 1}. ${item.song}`);
  console.log(`   Fan Demand: ${item.fanDemand}/100`);
  console.log(`   Gap: ${item.gap} shows`);
  console.log(`   Probability: ${item.probability}%`);
  console.log(`   Likelihood: ${item.likelihood}\n`);
});

console.log("Dream Bustouts (high demand, deep liberation):");
wishlist.dreamBustouts.forEach(item => {
  console.log(`  ${item.song}: ${item.gap} shows, ${item.fanDemand}/100 demand`);
});
```

### Example 6: Generate Liberation Watchlist
```javascript
const allSongs = getAllUniqueSongs(getAllShows());
const currentDate = new Date().toISOString().split('T')[0];

const watchlist = allSongs
  .map(song => {
    const liberation = calculateLiberationMetrics(song, currentDate, getAllShows());
    const prediction = calculateLiberationProbability(song, null, getAllShows());

    return {
      song,
      gap: liberation.showsSince,
      status: liberation.liberationStatus,
      probability: parseFloat(prediction.probability)
    };
  })
  .filter(item =>
    item.status === 'deep_liberation' || item.status === 'potential_bustout'
  )
  .sort((a, b) => b.probability - a.probability)
  .slice(0, 25);

console.log("Liberation Watchlist (Top 25):\n");

watchlist.forEach((item, index) => {
  console.log(`${index + 1}. ${item.song}`);
  console.log(`   Gap: ${item.gap} shows`);
  console.log(`   Status: ${item.status}`);
  console.log(`   Probability: ${item.probability.toFixed(2)}%\n`);
});
```

## Best Practices

1. **Update After Each Show**: Liberation probabilities change constantly
2. **Context Matters**: Special events dramatically increase probability
3. **Historical Patterns**: Past liberations inform future predictions
4. **Multiple Factors**: Don't rely on gap length alone
5. **Era Awareness**: Modern era has different patterns than early era
6. **Fan Demand**: Consider community interest in predictions
7. **Confidence Levels**: Communicate uncertainty appropriately

## Common Patterns

### High Liberation Probability Scenarios
- Tour openers (first 3 shows)
- Tour closers (last 3 shows)
- Multi-night run finales
- Halloween shows for "Halloween"
- Special event shows (New Year's, benefits)
- Venue debuts or returns after long gap

### Liberation Indicators
- Gap > 1.5x average gap
- Gap approaching or exceeding max historical gap
- Seasonal alignment (Halloween in October)
- Special venue (Red Rocks, Gorge, etc.)
- Fan demand trending high
- Similar song recently liberated

### False Positives to Avoid
- Don't assume every tour opener has bustouts
- Don't expect liberations at every special event
- Don't ignore era relevance (old songs may be retired)
- Don't forget about practical setlist flow
- Don't overlook band's current musical direction

## Reference Data

### Holy Grail Songs (500+ show gaps)
- Halloween: 487+ show gap
- Blue Water: Limited performances
- Various early-era rarities

### High Demand Liberation Candidates
- Deed Is Done
- Help Myself
- Kit Kat Jam
- MacHead
- Granny
- True Reflections

### Historical Liberation Success Rate
- Tour openers: ~35% feature significant liberation
- Multi-night finales: ~28% feature bustouts
- Halloween shows: 95% chance of special setlist
- Special events: ~40% feature rare songs
