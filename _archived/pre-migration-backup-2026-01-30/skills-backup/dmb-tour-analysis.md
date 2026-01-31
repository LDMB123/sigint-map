---
name: dmb-tour-analysis
description: Tour routing and pattern analysis for Dave Matthews Band including geographic clustering, venue repeat patterns, multi-night runs, routing optimization, regional market coverage, and seasonal patterns
version: 1.0.0
domain: dave-matthews-band
data-source: dmbalmanac.com
---

# DMB Tour Analysis Skill

## Overview
This skill provides comprehensive analysis of Dave Matthews Band touring patterns, including route optimization, geographic clustering, venue preferences, and seasonal tour strategies.

## Core Concepts

### Tour Types
1. **Summer Tours**: Primary touring season (May-September)
2. **Fall Tours**: Secondary season (October-November)
3. **Winter Tours**: Rare, typically shorter runs
4. **Caravan**: Multi-act festival tour (2009, 2011, 2013)
5. **Weekend Warriors**: Limited 2-3 day runs
6. **Multi-Night Residencies**: 2-4 nights at single venue

### Geographic Regions
- **Northeast**: NY, NJ, PA, MA, CT, VT, NH, ME, RI
- **Southeast**: VA, NC, SC, GA, FL, TN, AL, MS, LA
- **Midwest**: OH, MI, IN, IL, WI, MN, IA, MO
- **Southwest**: TX, OK, NM, AZ
- **West**: CA, OR, WA, NV, CO, UT
- **Mountain**: MT, ID, WY, CO

## Data Structures

### Tour Object
```javascript
{
  tourId: "summer-2023",
  name: "Summer Tour 2023",
  startDate: "2023-05-19",
  endDate: "2023-09-16",
  totalShows: 47,
  totalLegs: 3,
  legs: [
    {
      legNumber: 1,
      startDate: "2023-05-19",
      endDate: "2023-06-24",
      shows: 18,
      regions: ["southeast", "midwest", "northeast"],
      primaryVenueType: "amphitheater"
    }
  ],
  regions: {
    northeast: 12,
    southeast: 8,
    midwest: 15,
    west: 10,
    southwest: 2
  },
  venueTypes: {
    amphitheater: 35,
    arena: 8,
    festival: 4
  },
  multiNightRuns: [
    {
      venue: "Saratoga Performing Arts Center",
      city: "Saratoga Springs, NY",
      dates: ["2023-06-02", "2023-06-03"],
      nights: 2
    },
    {
      venue: "Gorge Amphitheatre",
      city: "George, WA",
      dates: ["2023-09-01", "2023-09-02", "2023-09-03"],
      nights: 3
    }
  ],
  totalMiles: 12847,
  averageMilesBetweenShows: 273,
  restDays: 18,
  showDays: 47
}
```

### Venue Statistics Object
```javascript
{
  venue: "Red Rocks Amphitheatre",
  city: "Morrison",
  state: "CO",
  region: "west",
  capacity: 9525,
  venueType: "outdoor_amphitheater",
  totalShows: 67,
  firstShow: "1993-08-14",
  lastShow: "2023-09-06",
  yearsActive: 30,
  multiNightRuns: 15,
  averageShowsPerYear: 2.2,
  longestGap: 1456, // days
  typicalMonths: [6, 7, 8, 9], // Summer/Fall
  uniqueSongsPlayed: 187,
  totalSongsPlayed: 1342,
  averageSetlistLength: 20.0,
  specialCircumstances: [
    "Red Rocks 8.15.95 Live Album",
    "Annual Labor Day tradition (2000-2022)"
  ]
}
```

## Algorithms

### 1. Geographic Clustering Analysis

```javascript
// Analyze geographic clustering of tour dates
function analyzeGeographicClustering(tour) {
  const shows = tour.shows.sort((a, b) => new Date(a.date) - new Date(b.date));

  const clusters = [];
  let currentCluster = null;

  shows.forEach((show, index) => {
    if (!currentCluster) {
      currentCluster = {
        region: getRegion(show.state),
        shows: [show],
        startDate: show.date,
        endDate: show.date
      };
    } else if (getRegion(show.state) === currentCluster.region) {
      // Same region, add to cluster
      currentCluster.shows.push(show);
      currentCluster.endDate = show.date;
    } else {
      // New region, save current cluster and start new one
      clusters.push(currentCluster);
      currentCluster = {
        region: getRegion(show.state),
        shows: [show],
        startDate: show.date,
        endDate: show.date
      };
    }
  });

  // Don't forget last cluster
  if (currentCluster) {
    clusters.push(currentCluster);
  }

  // Analyze cluster efficiency
  return clusters.map(cluster => ({
    region: cluster.region,
    showCount: cluster.shows.length,
    duration: daysBetween(cluster.startDate, cluster.endDate),
    efficiency: (cluster.shows.length / daysBetween(cluster.startDate, cluster.endDate)).toFixed(2),
    shows: cluster.shows.map(s => ({ date: s.date, venue: s.venue, city: s.city }))
  }));
}

// Calculate region visit frequency
function calculateRegionalFrequency(tours) {
  const regionalData = {
    northeast: { shows: 0, tours: 0, years: new Set() },
    southeast: { shows: 0, tours: 0, years: new Set() },
    midwest: { shows: 0, tours: 0, years: new Set() },
    west: { shows: 0, tours: 0, years: new Set() },
    southwest: { shows: 0, tours: 0, years: new Set() }
  };

  tours.forEach(tour => {
    const tourRegions = new Set();

    tour.shows.forEach(show => {
      const region = getRegion(show.state);
      const year = new Date(show.date).getFullYear();

      if (regionalData[region]) {
        regionalData[region].shows++;
        regionalData[region].years.add(year);
        tourRegions.add(region);
      }
    });

    // Track which tours visited which regions
    tourRegions.forEach(region => {
      regionalData[region].tours++;
    });
  });

  return Object.entries(regionalData).map(([region, data]) => ({
    region,
    totalShows: data.shows,
    toursVisited: data.tours,
    yearsActive: data.years.size,
    averageShowsPerTour: (data.shows / data.tours).toFixed(2),
    averageShowsPerYear: (data.shows / data.years.size).toFixed(2)
  })).sort((a, b) => b.totalShows - a.totalShows);
}
```

### 2. Venue Repeat Pattern Analysis

```javascript
// Analyze venue visit patterns
function analyzeVenueRepeatPatterns(venue, allShows) {
  const venueShows = allShows
    .filter(show => show.venue === venue)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (venueShows.length === 0) {
    return { error: "No shows found at this venue" };
  }

  // Calculate gaps between visits
  const gaps = [];
  for (let i = 0; i < venueShows.length - 1; i++) {
    gaps.push({
      from: venueShows[i].date,
      to: venueShows[i + 1].date,
      days: daysBetween(venueShows[i].date, venueShows[i + 1].date),
      shows: calculateShowsBetween(venueShows[i].date, venueShows[i + 1].date)
    });
  }

  // Identify multi-night runs
  const multiNightRuns = identifyMultiNightRuns(venueShows);

  // Calculate typical visit pattern
  const yearlyDistribution = calculateYearlyDistribution(venueShows);

  return {
    venue,
    totalShows: venueShows.length,
    firstShow: venueShows[0].date,
    lastShow: venueShows[venueShows.length - 1].date,
    yearsActive: new Set(venueShows.map(s => new Date(s.date).getFullYear())).size,
    averageGapDays: average(gaps.map(g => g.days)),
    averageGapShows: average(gaps.map(g => g.shows)),
    longestGap: Math.max(...gaps.map(g => g.days)),
    shortestGap: Math.min(...gaps.map(g => g.days)),
    multiNightRuns,
    multiNightRunPercentage: (multiNightRuns.length / venueShows.length * 100).toFixed(2),
    yearlyDistribution,
    visitPattern: determineVisitPattern(yearlyDistribution),
    monthlyPattern: calculateMonthlyPattern(venueShows)
  };
}

// Identify multi-night runs at a venue
function identifyMultiNightRuns(venueShows) {
  const runs = [];
  let currentRun = [venueShows[0]];

  for (let i = 1; i < venueShows.length; i++) {
    const daysDiff = daysBetween(
      currentRun[currentRun.length - 1].date,
      venueShows[i].date
    );

    if (daysDiff <= 2) {
      // Consecutive or next-day show
      currentRun.push(venueShows[i]);
    } else {
      // Gap detected
      if (currentRun.length > 1) {
        runs.push({
          dates: currentRun.map(s => s.date),
          nights: currentRun.length
        });
      }
      currentRun = [venueShows[i]];
    }
  }

  // Don't forget last run
  if (currentRun.length > 1) {
    runs.push({
      dates: currentRun.map(s => s.date),
      nights: currentRun.length
    });
  }

  return runs;
}

// Determine visit pattern (annual, bi-annual, sporadic)
function determineVisitPattern(yearlyDistribution) {
  const yearsWithVisits = yearlyDistribution.filter(y => y.shows > 0).length;
  const totalYears = yearlyDistribution.length;
  const visitRate = yearsWithVisits / totalYears;

  const showsPerVisitYear = average(
    yearlyDistribution.filter(y => y.shows > 0).map(y => y.shows)
  );

  if (visitRate >= 0.9 && showsPerVisitYear >= 1.5) return "annual_multi_night";
  if (visitRate >= 0.9) return "annual_regular";
  if (visitRate >= 0.7) return "frequent";
  if (visitRate >= 0.4) return "occasional";
  return "sporadic";
}
```

### 3. Multi-Night Run Analysis

```javascript
// Analyze multi-night run patterns across all venues
function analyzeMultiNightRuns(allShows) {
  const venues = {};

  allShows.forEach(show => {
    const venueKey = `${show.venue}|${show.city}|${show.state}`;

    if (!venues[venueKey]) {
      venues[venueKey] = {
        venue: show.venue,
        city: show.city,
        state: show.state,
        shows: []
      };
    }

    venues[venueKey].shows.push(show);
  });

  // Analyze each venue for multi-night runs
  const multiNightVenues = Object.values(venues)
    .map(venueData => {
      venueData.shows.sort((a, b) => new Date(a.date) - new Date(b.date));
      const runs = identifyMultiNightRuns(venueData.shows);

      return {
        venue: venueData.venue,
        city: venueData.city,
        state: venueData.state,
        totalShows: venueData.shows.length,
        multiNightRuns: runs,
        totalMultiNightShows: runs.reduce((sum, run) => sum + run.nights, 0),
        longestRun: runs.length > 0 ? Math.max(...runs.map(r => r.nights)) : 0
      };
    })
    .filter(v => v.multiNightRuns.length > 0)
    .sort((a, b) => b.multiNightRuns.length - a.multiNightRuns.length);

  return {
    venuesWithMultiNight: multiNightVenues.length,
    totalMultiNightRuns: multiNightVenues.reduce((sum, v) => sum + v.multiNightRuns.length, 0),
    topVenues: multiNightVenues.slice(0, 20),
    runLengthDistribution: calculateRunLengthDistribution(multiNightVenues)
  };
}

// Calculate distribution of run lengths (2-night, 3-night, etc.)
function calculateRunLengthDistribution(multiNightVenues) {
  const distribution = {};

  multiNightVenues.forEach(venue => {
    venue.multiNightRuns.forEach(run => {
      const nights = run.nights;
      distribution[nights] = (distribution[nights] || 0) + 1;
    });
  });

  return Object.entries(distribution)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([nights, count]) => ({
      nights: parseInt(nights),
      count,
      label: `${nights}-night runs`
    }));
}
```

### 4. Tour Routing Optimization Analysis

```javascript
// Calculate tour routing efficiency
function analyzeTourRoutingEfficiency(tour) {
  const shows = tour.shows.sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalDistance = 0;
  const legs = [];

  for (let i = 0; i < shows.length - 1; i++) {
    const current = shows[i];
    const next = shows[i + 1];

    const distance = calculateDistance(
      current.latitude,
      current.longitude,
      next.latitude,
      next.longitude
    );

    const daysBetween = daysBetween(current.date, next.date);

    legs.push({
      from: { venue: current.venue, city: current.city, state: current.state },
      to: { venue: next.venue, city: next.city, state: next.state },
      distance: Math.round(distance),
      days: daysBetween,
      efficiency: distance / daysBetween
    });

    totalDistance += distance;
  }

  // Identify inefficient legs (backtracking, long distances)
  const inefficientLegs = legs.filter(leg => leg.distance > 500 || leg.efficiency > 400);

  // Calculate backtracking
  const backtracking = detectBacktracking(legs);

  return {
    totalDistance: Math.round(totalDistance),
    averageDistancePerShow: Math.round(totalDistance / (shows.length - 1)),
    totalLegs: legs.length,
    inefficientLegs: inefficientLegs.length,
    inefficientLegPercentage: (inefficientLegs.length / legs.length * 100).toFixed(2),
    backtrackingInstances: backtracking.length,
    efficiency: calculateOverallEfficiency(totalDistance, shows.length, tour.duration),
    longestLeg: legs.reduce((max, leg) => leg.distance > max.distance ? leg : max),
    mostEfficientLeg: legs.reduce((min, leg) => leg.efficiency < min.efficiency ? leg : min)
  };
}

// Detect backtracking in tour route
function detectBacktracking(legs) {
  const backtracking = [];

  for (let i = 0; i < legs.length - 2; i++) {
    const leg1 = legs[i];
    const leg2 = legs[i + 1];
    const leg3 = legs[i + 2];

    // Check if we're moving in opposite directions
    const direction1 = calculateBearing(leg1.from, leg1.to);
    const direction2 = calculateBearing(leg2.from, leg2.to);
    const direction3 = calculateBearing(leg3.from, leg3.to);

    const angleDiff = Math.abs(direction1 - direction3);

    // If angle difference > 90 degrees, likely backtracking
    if (angleDiff > 90 && angleDiff < 270) {
      backtracking.push({
        shows: [leg1.from.city, leg2.from.city, leg3.from.city],
        dates: [legs[i].date, legs[i + 1].date, legs[i + 2].date],
        reason: "Directional reversal detected"
      });
    }
  }

  return backtracking;
}

// Calculate overall routing efficiency score
function calculateOverallEfficiency(totalDistance, showCount, duration) {
  const distancePerShow = totalDistance / showCount;
  const showsPerDay = showCount / duration;

  // Ideal metrics (based on historical DMB touring)
  const idealDistancePerShow = 250; // miles
  const idealShowsPerDay = 0.7; // accounting for rest days

  const distanceScore = Math.max(0, 100 - (Math.abs(distancePerShow - idealDistancePerShow) / idealDistancePerShow * 100));
  const paceScore = Math.max(0, 100 - (Math.abs(showsPerDay - idealShowsPerDay) / idealShowsPerDay * 100));

  return {
    overallScore: ((distanceScore + paceScore) / 2).toFixed(2),
    distanceScore: distanceScore.toFixed(2),
    paceScore: paceScore.toFixed(2),
    rating: getEfficiencyRating((distanceScore + paceScore) / 2)
  };
}

function getEfficiencyRating(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Poor";
}
```

### 5. Regional Market Coverage Analysis

```javascript
// Analyze market coverage by region
function analyzeRegionalMarketCoverage(tours, timeframe = 'all') {
  const filteredTours = filterByTimeframe(tours, timeframe);

  const markets = {
    primary: {}, // Cities visited 5+ times
    secondary: {}, // Cities visited 2-4 times
    tertiary: {} // Cities visited once
  };

  const cityStats = {};

  filteredTours.forEach(tour => {
    tour.shows.forEach(show => {
      const cityKey = `${show.city}|${show.state}`;

      if (!cityStats[cityKey]) {
        cityStats[cityKey] = {
          city: show.city,
          state: show.state,
          region: getRegion(show.state),
          shows: 0,
          venues: new Set(),
          years: new Set()
        };
      }

      cityStats[cityKey].shows++;
      cityStats[cityKey].venues.add(show.venue);
      cityStats[cityKey].years.add(new Date(show.date).getFullYear());
    });
  });

  // Categorize markets
  Object.values(cityStats).forEach(city => {
    const marketData = {
      city: city.city,
      state: city.state,
      region: city.region,
      shows: city.shows,
      venues: city.venues.size,
      years: city.years.size
    };

    if (city.shows >= 5) {
      markets.primary[`${city.city}, ${city.state}`] = marketData;
    } else if (city.shows >= 2) {
      markets.secondary[`${city.city}, ${city.state}`] = marketData;
    } else {
      markets.tertiary[`${city.city}, ${city.state}`] = marketData;
    }
  });

  return {
    primaryMarkets: Object.values(markets.primary)
      .sort((a, b) => b.shows - a.shows),
    secondaryMarkets: Object.values(markets.secondary)
      .sort((a, b) => b.shows - a.shows),
    tertiaryMarkets: Object.values(markets.tertiary)
      .sort((a, b) => b.shows - a.shows),
    coverage: {
      totalCities: Object.keys(cityStats).length,
      primaryCount: Object.keys(markets.primary).length,
      secondaryCount: Object.keys(markets.secondary).length,
      tertiaryCount: Object.keys(markets.tertiary).length
    },
    regionalBreakdown: calculateRegionalCoverage(cityStats)
  };
}

// Calculate regional market penetration
function calculateRegionalCoverage(cityStats) {
  const regions = {};

  Object.values(cityStats).forEach(city => {
    if (!regions[city.region]) {
      regions[city.region] = {
        region: city.region,
        cities: 0,
        shows: 0,
        uniqueVenues: new Set()
      };
    }

    regions[city.region].cities++;
    regions[city.region].shows += city.shows;
    city.venues.forEach(v => regions[city.region].uniqueVenues.add(v));
  });

  return Object.values(regions).map(region => ({
    region: region.region,
    cities: region.cities,
    shows: region.shows,
    uniqueVenues: region.uniqueVenues.size,
    averageShowsPerCity: (region.shows / region.cities).toFixed(2)
  })).sort((a, b) => b.shows - a.shows);
}
```

### 6. Seasonal Pattern Analysis

```javascript
// Analyze seasonal touring patterns
function analyzeSeasonalPatterns(tours) {
  const seasons = {
    spring: { months: [3, 4, 5], shows: 0, tours: 0 },
    summer: { months: [6, 7, 8], shows: 0, tours: 0 },
    fall: { months: [9, 10, 11], shows: 0, tours: 0 },
    winter: { months: [12, 1, 2], shows: 0, tours: 0 }
  };

  const monthlyDistribution = Array(12).fill(0);

  tours.forEach(tour => {
    const tourSeasons = new Set();

    tour.shows.forEach(show => {
      const month = new Date(show.date).getMonth() + 1;
      monthlyDistribution[month - 1]++;

      // Determine season
      const season = Object.keys(seasons).find(s =>
        seasons[s].months.includes(month)
      );

      if (season) {
        seasons[season].shows++;
        tourSeasons.add(season);
      }
    });

    // Count tours per season
    tourSeasons.forEach(season => {
      seasons[season].tours++;
    });
  });

  return {
    seasonalBreakdown: Object.entries(seasons).map(([season, data]) => ({
      season,
      shows: data.shows,
      tours: data.tours,
      averageShowsPerTour: (data.shows / data.tours).toFixed(2),
      percentage: (data.shows / tours.reduce((sum, t) => sum + t.shows.length, 0) * 100).toFixed(2)
    })).sort((a, b) => b.shows - a.shows),
    monthlyBreakdown: monthlyDistribution.map((count, index) => ({
      month: index + 1,
      monthName: getMonthName(index + 1),
      shows: count,
      percentage: (count / tours.reduce((sum, t) => sum + t.shows.length, 0) * 100).toFixed(2)
    })),
    peakMonth: getMonthName(monthlyDistribution.indexOf(Math.max(...monthlyDistribution)) + 1),
    offSeason: identifyOffSeason(monthlyDistribution)
  };
}

function identifyOffSeason(monthlyDistribution) {
  const avgShows = average(monthlyDistribution);
  return monthlyDistribution
    .map((count, index) => ({ month: index + 1, count }))
    .filter(m => m.count < avgShows * 0.3)
    .map(m => getMonthName(m.month));
}
```

## Practical Query Examples

### Example 1: Analyze Specific Tour Routing
```javascript
const tour = getTour("summer-2023");
const efficiency = analyzeTourRoutingEfficiency(tour);

console.log(`Tour Routing Analysis: ${tour.name}`);
console.log(`Total Distance: ${efficiency.totalDistance} miles`);
console.log(`Average per Show: ${efficiency.averageDistancePerShow} miles`);
console.log(`Efficiency Rating: ${efficiency.efficiency.rating} (${efficiency.efficiency.overallScore})`);
console.log(`\nInefficient Legs: ${efficiency.inefficientLegs} (${efficiency.inefficientLegPercentage}%)`);
console.log(`Backtracking Instances: ${efficiency.backtrackingInstances}`);
console.log(`\nLongest Leg:`);
console.log(`  ${efficiency.longestLeg.from.city} → ${efficiency.longestLeg.to.city}`);
console.log(`  ${efficiency.longestLeg.distance} miles in ${efficiency.longestLeg.days} days`);
```

### Example 2: Find Top Multi-Night Venues
```javascript
const allShows = getAllShows();
const multiNightAnalysis = analyzeMultiNightRuns(allShows);

console.log("Top Multi-Night Venues:\n");
multiNightAnalysis.topVenues.slice(0, 15).forEach((venue, index) => {
  console.log(`${index + 1}. ${venue.venue} - ${venue.city}, ${venue.state}`);
  console.log(`   Total Shows: ${venue.totalShows}`);
  console.log(`   Multi-Night Runs: ${venue.multiNightRuns.length}`);
  console.log(`   Longest Run: ${venue.longestRun} nights\n`);
});

console.log("Run Length Distribution:");
multiNightAnalysis.runLengthDistribution.forEach(dist => {
  console.log(`  ${dist.label}: ${dist.count}`);
});
```

### Example 3: Regional Market Coverage
```javascript
const allTours = getAllTours();
const coverage = analyzeRegionalMarketCoverage(allTours, 'last_5_years');

console.log("Regional Market Coverage (Last 5 Years):\n");

console.log("Primary Markets (5+ shows):");
coverage.primaryMarkets.slice(0, 10).forEach(market => {
  console.log(`  ${market.city}, ${market.state}: ${market.shows} shows, ${market.venues} venues`);
});

console.log("\nRegional Breakdown:");
coverage.regionalBreakdown.forEach(region => {
  console.log(`  ${region.region}:`);
  console.log(`    Cities: ${region.cities}`);
  console.log(`    Shows: ${region.shows}`);
  console.log(`    Avg per City: ${region.averageShowsPerCity}`);
});
```

### Example 4: Venue Visit Pattern Analysis
```javascript
const venue = "Gorge Amphitheatre";
const pattern = analyzeVenueRepeatPatterns(venue, getAllShows());

console.log(`Venue Analysis: ${venue}\n`);
console.log(`Total Shows: ${pattern.totalShows}`);
console.log(`First Show: ${pattern.firstShow}`);
console.log(`Last Show: ${pattern.lastShow}`);
console.log(`Years Active: ${pattern.yearsActive}`);
console.log(`\nVisit Pattern: ${pattern.visitPattern}`);
console.log(`Average Gap: ${pattern.averageGapDays} days (${pattern.averageGapShows} shows)`);
console.log(`\nMulti-Night Runs: ${pattern.multiNightRuns.length}`);
pattern.multiNightRuns.forEach(run => {
  console.log(`  ${run.dates.join(', ')} (${run.nights} nights)`);
});
```

### Example 5: Seasonal Touring Patterns
```javascript
const tours = getAllTours();
const seasonal = analyzeSeasonalPatterns(tours);

console.log("Seasonal Touring Patterns:\n");

seasonal.seasonalBreakdown.forEach(season => {
  console.log(`${season.season.toUpperCase()}:`);
  console.log(`  Shows: ${season.shows} (${season.percentage}%)`);
  console.log(`  Tours: ${season.tours}`);
  console.log(`  Avg Shows/Tour: ${season.averageShowsPerTour}\n`);
});

console.log(`Peak Month: ${seasonal.peakMonth}`);
console.log(`Off Season: ${seasonal.offSeason.join(', ')}`);
```

### Example 6: Geographic Clustering Analysis
```javascript
const tour = getTour("summer-2023");
const clusters = analyzeGeographicClustering(tour);

console.log(`Geographic Clustering: ${tour.name}\n`);

clusters.forEach((cluster, index) => {
  console.log(`Leg ${index + 1}: ${cluster.region.toUpperCase()}`);
  console.log(`  Shows: ${cluster.showCount}`);
  console.log(`  Duration: ${cluster.duration} days`);
  console.log(`  Efficiency: ${cluster.efficiency} shows/day`);
  console.log(`  Cities: ${cluster.shows.map(s => s.city).join(' → ')}\n`);
});
```

## Known Venue Patterns

### Annual/Multi-Night Venues
- **Gorge Amphitheatre** (George, WA): 3-night Labor Day tradition
- **Alpine Valley** (East Troy, WI): Multi-night summer runs
- **Saratoga Performing Arts Center** (Saratoga Springs, NY): 2-night runs
- **Noblesville, IN** (Deer Creek/Ruoff): Annual summer stop
- **Bristow, VA** (Jiffy Lube Live): Annual Virginia homecoming

### Regional Hubs
- **Northeast**: NYC, Boston, Philadelphia, Saratoga
- **Southeast**: Virginia (home base), North Carolina, Atlanta
- **Midwest**: Chicago, Detroit, Cleveland, Noblesville
- **West**: Gorge, LA, SF Bay Area, Denver
- **Texas**: Dallas, Houston, Austin

### Venue Type Preferences
1. **Amphitheaters** (70%): Primary summer touring
2. **Arenas** (20%): Fall tours, bad weather markets
3. **Festivals** (5%): Special events, Caravan
4. **Outdoor Stadiums** (3%): Fenway, Wrigley special shows
5. **Theaters/Clubs** (2%): Early career, intimate shows

## Best Practices

1. **Season Context**: Consider time of year for venue selection
2. **Geographic Logic**: Analyze routing efficiency
3. **Market Saturation**: Track visit frequency by market
4. **Multi-Night Trends**: Note patterns in extended runs
5. **Regional Balance**: Ensure coverage across all regions
6. **Venue Capacity**: Match venue size to market demand
7. **Historical Patterns**: Learn from past tour routing

## Common Patterns

### Summer Tour Structure
- Late May/Early June: Tour opener (often Southeast)
- June-July: Northeast and Midwest amphitheaters
- August: Multi-night Western runs (Gorge, Colorado)
- September: Tour closer (historically Gorge Labor Day)

### Fall Tour Structure
- October-November: Arena tour
- Focus on markets skipped in summer
- Shorter runs, more rest days
- Often includes New York residency

### Tour Leg Typical Length
- Leg 1: 15-20 shows (3-4 weeks)
- Break: 1-2 weeks
- Leg 2: 12-18 shows (3 weeks)
- Break: 1-2 weeks
- Leg 3: 10-15 shows (2-3 weeks)
