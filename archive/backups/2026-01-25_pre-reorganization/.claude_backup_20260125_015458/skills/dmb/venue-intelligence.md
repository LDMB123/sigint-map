---
name: dmb-venue-intelligence
description: Comprehensive venue data and historical analysis for Dave Matthews Band including visit frequency, unique songs per venue, show length patterns, capacity data, regional importance, and multi-night run history
version: 1.0.0
domain: dave-matthews-band
data-source: dmbalmanac.com
---

# DMB Venue Intelligence Skill

## Overview
This skill provides deep venue-specific analysis for Dave Matthews Band, tracking historical patterns, song preferences, and venue significance in the band's touring history.

## Core Concepts

### Venue Significance Tiers
- **Legendary** (50+ shows): Red Rocks, Gorge, Deer Creek/Noblesville
- **Premier** (30-49 shows): Alpine Valley, Saratoga, Virginia venues
- **Regular** (15-29 shows): Annual or bi-annual tour stops
- **Occasional** (5-14 shows): Multi-tour venue
- **Rare** (1-4 shows): Limited or one-time appearances

### Venue Types
1. **Amphitheaters**: Outdoor, 10k-20k capacity (primary summer touring)
2. **Arenas**: Indoor, 15k-20k capacity (fall/winter tours)
3. **Stadiums**: Large outdoor, 40k+ capacity (special events)
4. **Theaters**: Intimate, 2k-5k capacity (early career, special shows)
5. **Festivals**: Multi-day events with multiple artists
6. **Clubs**: Small venues, <1k capacity (very early career)

## Data Structures

### Venue Profile Object
```javascript
{
  venue: "Red Rocks Amphitheatre",
  city: "Morrison",
  state: "CO",
  region: "west",
  venueType: "outdoor_amphitheater",
  capacity: 9525,

  // Historical data
  totalShows: 67,
  firstShow: "1993-08-14",
  lastShow: "2023-09-06",
  yearsActive: 30,
  significanceTier: "legendary",

  // Visit patterns
  averageShowsPerYear: 2.2,
  averageGap: 127, // days between shows
  longestGap: 1456, // days
  shortestGap: 1, // consecutive nights
  multiNightRuns: 15,

  // Setlist data
  uniqueSongsPlayed: 187,
  totalSongsPlayed: 1342,
  averageSetlistLength: 20.0,
  mostPlayedSongs: [
    { song: "Ants Marching", count: 52 },
    { song: "Two Step", count: 48 },
    { song: "Warehouse", count: 45 }
  ],
  venueBustouts: [
    { song: "Halloween", date: "2015-10-31", gap: 234 }
  ],
  venueDebuts: [
    { song: "Madman's Eyes", date: "2023-09-06" }
  ],

  // Special characteristics
  traditionalMonth: 9, // September (Labor Day)
  specialEvents: [
    "Red Rocks 8.15.95 Live Album",
    "Annual Labor Day tradition (2000-2022)"
  ],
  guestFrequency: 0.42, // 42% of shows have guests
  commonGuests: [
    { name: "Warren Haynes", count: 8 },
    { name: "Tim Reynolds", count: 67 }
  ],

  // Fan metrics
  averageRarityScore: 58.3,
  topRarityShows: [
    { date: "2015-10-31", rarityScore: 87.3 },
    { date: "1995-08-15", rarityScore: 82.1 }
  ]
}
```

### Venue Comparison Object
```javascript
{
  venues: ["Red Rocks Amphitheatre", "Gorge Amphitheatre", "Alpine Valley"],
  comparison: {
    totalShows: [67, 54, 48],
    uniqueSongs: [187, 165, 158],
    averageLength: [20.0, 19.5, 18.8],
    rarityScore: [58.3, 61.2, 54.7],
    guestRate: [42%, 38%, 35%],
    multiNightFrequency: [22%, 48%, 31%]
  },
  winner: {
    mostShows: "Red Rocks Amphitheatre",
    mostUniqueSongs: "Red Rocks Amphitheatre",
    longestShows: "Red Rocks Amphitheatre",
    rarest: "Gorge Amphitheatre",
    mostGuests: "Red Rocks Amphitheatre"
  }
}
```

## Algorithms

### 1. Venue Visit Frequency Analysis

```javascript
// Calculate comprehensive venue statistics
function analyzeVenueFrequency(venue, allShows) {
  const venueShows = allShows
    .filter(show => show.venue === venue)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (venueShows.length === 0) {
    return { error: "No shows found at this venue" };
  }

  // Calculate gaps between visits
  const gaps = [];
  for (let i = 0; i < venueShows.length - 1; i++) {
    gaps.push(daysBetween(venueShows[i].date, venueShows[i + 1].date));
  }

  // Identify years visited
  const yearsVisited = new Set(
    venueShows.map(show => new Date(show.date).getFullYear())
  );

  // Calculate multi-night runs
  const multiNightRuns = identifyMultiNightRuns(venueShows);

  return {
    venue,
    city: venueShows[0].city,
    state: venueShows[0].state,
    totalShows: venueShows.length,
    firstShow: venueShows[0].date,
    lastShow: venueShows[venueShows.length - 1].date,
    yearsActive: yearsVisited.size,
    significanceTier: getSignificanceTier(venueShows.length),
    averageShowsPerYear: (venueShows.length / yearsVisited.size).toFixed(2),
    averageGap: gaps.length > 0 ? Math.round(average(gaps)) : 0,
    longestGap: gaps.length > 0 ? Math.max(...gaps) : 0,
    shortestGap: gaps.length > 0 ? Math.min(...gaps) : 0,
    multiNightRuns,
    multiNightRunPercentage: (multiNightRuns.length / venueShows.length * 100).toFixed(2),
    visitPattern: determineVisitPattern(venueShows, yearsVisited)
  };
}

function getSignificanceTier(showCount) {
  if (showCount >= 50) return 'legendary';
  if (showCount >= 30) return 'premier';
  if (showCount >= 15) return 'regular';
  if (showCount >= 5) return 'occasional';
  return 'rare';
}

function determineVisitPattern(venueShows, yearsVisited) {
  const totalYears = new Date().getFullYear() - new Date(venueShows[0].date).getFullYear();
  const visitRate = yearsVisited.size / totalYears;

  if (visitRate >= 0.9) return 'annual';
  if (visitRate >= 0.5) return 'frequent';
  if (visitRate >= 0.3) return 'occasional';
  return 'sporadic';
}
```

### 2. Unique Songs Per Venue

```javascript
// Analyze unique songs played at a venue
function analyzeVenueSetlists(venue, allShows) {
  const venueShows = allShows.filter(show => show.venue === venue);

  if (venueShows.length === 0) {
    return { error: "No shows found at this venue" };
  }

  // Track all songs and their frequency
  const songFrequency = {};
  let totalSongs = 0;

  venueShows.forEach(show => {
    totalSongs += show.setlist.length;

    show.setlist.forEach(song => {
      songFrequency[song] = (songFrequency[song] || 0) + 1;
    });
  });

  const uniqueSongs = Object.keys(songFrequency).length;

  // Calculate diversity score
  const diversityScore = (uniqueSongs / totalSongs * 100).toFixed(2);

  // Find venue-specific patterns
  const mostPlayed = sortByFrequency(songFrequency).slice(0, 20);

  // Find songs ONLY played at this venue
  const exclusiveSongs = findExclusiveSongs(venue, allShows);

  // Find debuts and bustouts at this venue
  const debuts = findVenueDebuts(venue, allShows);
  const bustouts = findVenueBustouts(venue, allShows);

  return {
    venue,
    totalShows: venueShows.length,
    uniqueSongsPlayed: uniqueSongs,
    totalSongsPlayed: totalSongs,
    averageSetlistLength: (totalSongs / venueShows.length).toFixed(2),
    diversityScore: parseFloat(diversityScore),
    mostPlayedSongs: mostPlayed,
    exclusiveSongs,
    debuts,
    bustouts,
    rareSongsPlayed: findRareSongsAtVenue(venue, songFrequency, allShows)
  };
}

// Find songs only played at this venue
function findExclusiveSongs(venue, allShows) {
  const venueShows = allShows.filter(show => show.venue === venue);
  const otherShows = allShows.filter(show => show.venue !== venue);

  const venueSongs = new Set();
  venueShows.forEach(show => {
    show.setlist.forEach(song => venueSongs.add(song));
  });

  const otherSongs = new Set();
  otherShows.forEach(show => {
    show.setlist.forEach(song => otherSongs.add(song));
  });

  const exclusive = Array.from(venueSongs).filter(song => !otherSongs.has(song));

  return exclusive.map(song => {
    const performances = venueShows.filter(s => s.setlist.includes(song));
    return {
      song,
      performances: performances.length,
      dates: performances.map(s => s.date)
    };
  });
}

// Find debuts at this venue
function findVenueDebuts(venue, allShows) {
  const allShowsSorted = allShows.sort((a, b) => new Date(a.date) - new Date(b.date));
  const venueShows = allShowsSorted.filter(show => show.venue === venue);

  const debuts = [];
  const songFirstPlayed = {};

  // Track first play of each song globally
  allShowsSorted.forEach(show => {
    show.setlist.forEach(song => {
      if (!songFirstPlayed[song]) {
        songFirstPlayed[song] = show.date;
      }
    });
  });

  // Check which debuts happened at this venue
  venueShows.forEach(show => {
    show.setlist.forEach(song => {
      if (songFirstPlayed[song] === show.date) {
        debuts.push({
          song,
          date: show.date,
          showNumber: allShowsSorted.findIndex(s => s.date === show.date) + 1
        });
      }
    });
  });

  return debuts;
}

// Find bustouts at this venue
function findVenueBustouts(venue, allShows) {
  const allShowsSorted = allShows.sort((a, b) => new Date(a.date) - new Date(b.date));
  const venueShows = allShowsSorted.filter(show => show.venue === venue);

  const bustouts = [];

  venueShows.forEach(show => {
    show.setlist.forEach(song => {
      const previousPlays = allShowsSorted
        .filter(s => new Date(s.date) < new Date(show.date) && s.setlist.includes(song));

      if (previousPlays.length > 0) {
        const lastPlayed = previousPlays[previousPlays.length - 1];
        const gap = allShowsSorted.filter(s =>
          new Date(s.date) > new Date(lastPlayed.date) &&
          new Date(s.date) <= new Date(show.date)
        ).length - 1;

        if (gap >= 100) {
          bustouts.push({
            song,
            date: show.date,
            gap,
            lastPlayed: lastPlayed.date
          });
        }
      }
    });
  });

  return bustouts.sort((a, b) => b.gap - a.gap);
}

// Find rare songs played at venue
function findRareSongsAtVenue(venue, songFrequency, allShows) {
  const rareSongs = [];

  Object.entries(songFrequency).forEach(([song, venueCount]) => {
    const totalPlays = allShows.filter(s => s.setlist.includes(song)).length;

    // Song is rare globally (< 50 total plays)
    if (totalPlays < 50) {
      rareSongs.push({
        song,
        venueCount,
        totalPlays,
        venuePercentage: (venueCount / totalPlays * 100).toFixed(2)
      });
    }
  });

  return rareSongs.sort((a, b) => b.venueCount - a.venueCount);
}
```

### 3. Venue Show Length Patterns

```javascript
// Analyze show length patterns at a venue
function analyzeVenueShowLengths(venue, allShows) {
  const venueShows = allShows.filter(show => show.venue === venue);

  if (venueShows.length === 0) {
    return { error: "No shows found at this venue" };
  }

  const showLengths = venueShows.map(show => show.setlist.length);

  return {
    venue,
    totalShows: venueShows.length,
    averageLength: average(showLengths).toFixed(2),
    medianLength: median(showLengths),
    shortestShow: {
      length: Math.min(...showLengths),
      date: venueShows.find(s => s.setlist.length === Math.min(...showLengths)).date
    },
    longestShow: {
      length: Math.max(...showLengths),
      date: venueShows.find(s => s.setlist.length === Math.max(...showLengths)).date
    },
    lengthDistribution: calculateLengthDistribution(showLengths),
    trend: analyzeShowLengthTrend(venueShows),
    comparisonToGlobal: compareToGlobalAverage(showLengths, allShows)
  };
}

function calculateLengthDistribution(lengths) {
  const distribution = {
    'short (< 18)': 0,
    'standard (18-22)': 0,
    'long (23-26)': 0,
    'epic (27+)': 0
  };

  lengths.forEach(length => {
    if (length < 18) distribution['short (< 18)']++;
    else if (length <= 22) distribution['standard (18-22)']++;
    else if (length <= 26) distribution['long (23-26)']++;
    else distribution['epic (27+)']++;
  });

  return distribution;
}

function analyzeShowLengthTrend(venueShows) {
  // Split into thirds and compare
  const third = Math.floor(venueShows.length / 3);
  const early = venueShows.slice(0, third);
  const middle = venueShows.slice(third, third * 2);
  const recent = venueShows.slice(third * 2);

  return {
    earlyAverage: average(early.map(s => s.setlist.length)).toFixed(2),
    middleAverage: average(middle.map(s => s.setlist.length)).toFixed(2),
    recentAverage: average(recent.map(s => s.setlist.length)).toFixed(2),
    trend: determineLengthTrend(early, middle, recent)
  };
}

function determineLengthTrend(early, middle, recent) {
  const earlyAvg = average(early.map(s => s.setlist.length));
  const recentAvg = average(recent.map(s => s.setlist.length));

  if (recentAvg > earlyAvg * 1.1) return 'increasing';
  if (recentAvg < earlyAvg * 0.9) return 'decreasing';
  return 'stable';
}

function compareToGlobalAverage(venueLengths, allShows) {
  const venueAvg = average(venueLengths);
  const globalAvg = average(allShows.map(s => s.setlist.length));

  const difference = venueAvg - globalAvg;
  const percentDiff = (difference / globalAvg * 100).toFixed(2);

  return {
    venueAverage: venueAvg.toFixed(2),
    globalAverage: globalAvg.toFixed(2),
    difference: difference.toFixed(2),
    percentageDifference: percentDiff,
    comparison: percentDiff > 5 ? 'longer' : percentDiff < -5 ? 'shorter' : 'similar'
  };
}
```

### 4. Guest Appearance Patterns by Venue

```javascript
// Analyze guest patterns at specific venues
function analyzeVenueGuestPatterns(venue, allShows) {
  const venueShows = allShows.filter(show => show.venue === venue);
  const showsWithGuests = venueShows.filter(show => show.guests && show.guests.length > 0);

  const guestFrequency = {};

  showsWithGuests.forEach(show => {
    show.guests.forEach(guest => {
      if (!guestFrequency[guest.name]) {
        guestFrequency[guest.name] = {
          name: guest.name,
          appearances: 0,
          shows: [],
          instruments: new Set()
        };
      }

      guestFrequency[guest.name].appearances++;
      guestFrequency[guest.name].shows.push(show.date);
      if (guest.instrument) {
        guestFrequency[guest.name].instruments.add(guest.instrument);
      }
    });
  });

  const guests = Object.values(guestFrequency)
    .map(guest => ({
      name: guest.name,
      appearances: guest.appearances,
      appearanceRate: (guest.appearances / venueShows.length * 100).toFixed(2),
      instruments: Array.from(guest.instruments),
      shows: guest.shows
    }))
    .sort((a, b) => b.appearances - a.appearances);

  return {
    venue,
    totalShows: venueShows.length,
    showsWithGuests: showsWithGuests.length,
    guestRate: (showsWithGuests.length / venueShows.length * 100).toFixed(2),
    uniqueGuests: guests.length,
    topGuests: guests.slice(0, 10),
    venueGuestTradition: identifyGuestTradition(guests, venueShows.length)
  };
}

function identifyGuestTradition(guests, totalShows) {
  // Check if there's a "house guest" who appears frequently
  const frequentGuests = guests.filter(g =>
    g.appearances / totalShows >= 0.5 // 50% or more shows
  );

  if (frequentGuests.length > 0) {
    return {
      hasTradition: true,
      guests: frequentGuests.map(g => g.name),
      description: `${frequentGuests[0].name} is a frequent guest at this venue`
    };
  }

  return {
    hasTradition: false,
    description: "No strong guest tradition at this venue"
  };
}
```

### 5. Venue Comparison Analysis

```javascript
// Compare multiple venues
function compareVenues(venueList, allShows) {
  const comparison = venueList.map(venue => {
    const freq = analyzeVenueFrequency(venue, allShows);
    const setlists = analyzeVenueSetlists(venue, allShows);
    const lengths = analyzeVenueShowLengths(venue, allShows);
    const guests = analyzeVenueGuestPatterns(venue, allShows);

    return {
      venue,
      totalShows: freq.totalShows,
      uniqueSongs: setlists.uniqueSongsPlayed,
      averageLength: parseFloat(lengths.averageLength),
      guestRate: parseFloat(guests.guestRate),
      multiNightRate: parseFloat(freq.multiNightRunPercentage),
      significanceTier: freq.significanceTier,
      yearsActive: freq.yearsActive
    };
  });

  return {
    venues: venueList,
    comparison,
    rankings: {
      mostShows: comparison.sort((a, b) => b.totalShows - a.totalShows)[0].venue,
      mostUniqueSongs: comparison.sort((a, b) => b.uniqueSongs - a.uniqueSongs)[0].venue,
      longestShows: comparison.sort((a, b) => b.averageLength - a.averageLength)[0].venue,
      mostGuests: comparison.sort((a, b) => b.guestRate - a.guestRate)[0].venue,
      mostMultiNight: comparison.sort((a, b) => b.multiNightRate - a.multiNightRate)[0].venue
    }
  };
}
```

### 6. Regional Venue Importance

```javascript
// Analyze venue importance within its region
function analyzeRegionalImportance(venue, allShows) {
  const venueData = allShows.filter(show => show.venue === venue);

  if (venueData.length === 0) {
    return { error: "No shows found at this venue" };
  }

  const region = getRegion(venueData[0].state);
  const regionalShows = allShows.filter(show => getRegion(show.state) === region);
  const regionalVenues = [...new Set(regionalShows.map(s => s.venue))];

  const venueShowCount = venueData.length;
  const regionalShowCount = regionalShows.length;

  const regionalRank = regionalVenues
    .map(v => ({
      venue: v,
      shows: allShows.filter(s => s.venue === v).length
    }))
    .sort((a, b) => b.shows - a.shows)
    .findIndex(v => v.venue === venue) + 1;

  return {
    venue,
    region,
    regionalImportance: {
      venueShows: venueShowCount,
      regionalShows: regionalShowCount,
      percentageOfRegion: (venueShowCount / regionalShowCount * 100).toFixed(2),
      regionalRank,
      totalRegionalVenues: regionalVenues.length,
      status: getRegionalStatus(regionalRank, regionalVenues.length)
    },
    regionalComparison: getTopRegionalVenues(region, allShows, 5)
  };
}

function getRegionalStatus(rank, total) {
  if (rank === 1) return 'Regional Leader';
  if (rank <= 3) return 'Top Regional Venue';
  if (rank <= total * 0.25) return 'Major Regional Venue';
  if (rank <= total * 0.5) return 'Regular Regional Venue';
  return 'Occasional Regional Venue';
}

function getTopRegionalVenues(region, allShows, limit) {
  const regionalShows = allShows.filter(show => getRegion(show.state) === region);
  const venues = {};

  regionalShows.forEach(show => {
    venues[show.venue] = (venues[show.venue] || 0) + 1;
  });

  return Object.entries(venues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([venue, count]) => ({ venue, shows: count }));
}
```

## Practical Query Examples

### Example 1: Complete Venue Profile
```javascript
const venue = "Red Rocks Amphitheatre";
const allShows = getAllShows();

const frequency = analyzeVenueFrequency(venue, allShows);
const setlists = analyzeVenueSetlists(venue, allShows);
const lengths = analyzeVenueShowLengths(venue, allShows);
const guests = analyzeVenueGuestPatterns(venue, allShows);
const regional = analyzeRegionalImportance(venue, allShows);

console.log(`Complete Venue Profile: ${venue}\n`);
console.log(`Significance: ${frequency.significanceTier.toUpperCase()}`);
console.log(`Total Shows: ${frequency.totalShows} (${frequency.yearsActive} years)`);
console.log(`Visit Pattern: ${frequency.visitPattern}`);
console.log(`Multi-Night Runs: ${frequency.multiNightRuns.length}\n`);

console.log(`Setlist Data:`);
console.log(`  Unique Songs: ${setlists.uniqueSongsPlayed}`);
console.log(`  Average Length: ${lengths.averageLength} songs`);
console.log(`  Debuts: ${setlists.debuts.length}`);
console.log(`  Bustouts: ${setlists.bustouts.length}\n`);

console.log(`Guest Appearances:`);
console.log(`  Guest Rate: ${guests.guestRate}%`);
console.log(`  Top Guests: ${guests.topGuests.slice(0, 3).map(g => g.name).join(', ')}\n`);

console.log(`Regional Importance:`);
console.log(`  Region: ${regional.region}`);
console.log(`  Regional Rank: #${regional.regionalImportance.regionalRank}`);
console.log(`  Status: ${regional.regionalImportance.status}`);
```

### Example 2: Find Venues with Most Debuts
```javascript
const allShows = getAllShows();
const allVenues = [...new Set(allShows.map(s => s.venue))];

const venueDebuts = allVenues.map(venue => {
  const setlists = analyzeVenueSetlists(venue, allShows);
  return {
    venue,
    debuts: setlists.debuts.length,
    debutList: setlists.debuts
  };
}).sort((a, b) => b.debuts - a.debuts).slice(0, 15);

console.log("Venues with Most Song Debuts:\n");
venueDebuts.forEach((item, index) => {
  console.log(`${index + 1}. ${item.venue}: ${item.debuts} debuts`);
  if (item.debuts > 0) {
    console.log(`   Recent: ${item.debutList.slice(0, 3).map(d => d.song).join(', ')}`);
  }
  console.log('');
});
```

### Example 3: Compare Premier Venues
```javascript
const premierVenues = [
  "Red Rocks Amphitheatre",
  "Gorge Amphitheatre",
  "Alpine Valley Music Theatre",
  "Saratoga Performing Arts Center"
];

const comparison = compareVenues(premierVenues, getAllShows());

console.log("Premier Venue Comparison:\n");

comparison.comparison.forEach(venue => {
  console.log(`${venue.venue}:`);
  console.log(`  Shows: ${venue.totalShows}`);
  console.log(`  Unique Songs: ${venue.uniqueSongs}`);
  console.log(`  Avg Length: ${venue.averageLength}`);
  console.log(`  Guest Rate: ${venue.guestRate}%\n`);
});

console.log("Category Winners:");
console.log(`  Most Shows: ${comparison.rankings.mostShows}`);
console.log(`  Most Unique Songs: ${comparison.rankings.mostUniqueSongs}`);
console.log(`  Longest Shows: ${comparison.rankings.longestShows}`);
console.log(`  Most Guests: ${comparison.rankings.mostGuests}`);
```

### Example 4: Find Venues with Exclusive Songs
```javascript
const venue = "Trax";
const setlists = analyzeVenueSetlists(venue, getAllShows());

if (setlists.exclusiveSongs.length > 0) {
  console.log(`Exclusive Songs at ${venue}:\n`);
  setlists.exclusiveSongs.forEach(song => {
    console.log(`${song.song}:`);
    console.log(`  Played ${song.performances} times at this venue only`);
    console.log(`  Dates: ${song.dates.join(', ')}\n`);
  });
} else {
  console.log(`No exclusive songs at ${venue}`);
}
```

### Example 5: Analyze Show Length Trends
```javascript
const venue = "Gorge Amphitheatre";
const lengths = analyzeVenueShowLengths(venue, getAllShows());

console.log(`Show Length Analysis: ${venue}\n`);
console.log(`Average: ${lengths.averageLength} songs`);
console.log(`Range: ${lengths.shortestShow.length} - ${lengths.longestShow.length} songs\n`);

console.log(`Distribution:`);
Object.entries(lengths.lengthDistribution).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} shows`);
});

console.log(`\nTrend: ${lengths.trend.trend}`);
console.log(`  Early Average: ${lengths.trend.earlyAverage}`);
console.log(`  Recent Average: ${lengths.trend.recentAverage}`);

console.log(`\nComparison to Global Average:`);
console.log(`  Venue: ${lengths.comparisonToGlobal.venueAverage}`);
console.log(`  Global: ${lengths.comparisonToGlobal.globalAverage}`);
console.log(`  Assessment: ${lengths.comparisonToGlobal.comparison}`);
```

## Known Legendary Venues

### Red Rocks Amphitheatre (Morrison, CO)
- 67+ shows, Labor Day tradition
- Official live album (8.15.95)
- Highest unique song count
- Premier Western venue

### Gorge Amphitheatre (George, WA)
- 54+ shows, 3-night Labor Day runs
- Spectacular setting, fan favorite
- High multi-night run frequency
- Bustout potential

### Alpine Valley Music Theatre (East Troy, WI)
- 48+ shows, Midwest hub
- Multi-night summer traditions
- Large capacity amphitheater
- Strong guest appearance rate

### Deer Creek/Ruoff Music Center (Noblesville, IN)
- 45+ shows, annual stop
- Midwest cornerstone venue
- Consistent booking pattern
- Fan-accessible location

### Virginia Venues (Home State)
- Nissan Pavilion/Jiffy Lube Live (Bristow, VA)
- Hampton Coliseum
- Charlottesville roots
- Annual homecoming tradition

## Best Practices

1. **Update After Each Show**: Venue statistics change constantly
2. **Track Multi-Night Runs**: Important for venue significance
3. **Note Special Circumstances**: Album releases, live recordings
4. **Capacity Context**: Compare similar-sized venues
5. **Regional Balance**: Consider venue importance within region
6. **Historical Context**: Early venues may have limited data
7. **Guest Patterns**: Some venues attract more guests

## Common Patterns

### Amphitheater Season
- May-September primary touring
- Multi-night runs at premier venues
- Higher average song counts
- More guest appearances

### Arena Season
- October-November indoor touring
- Fewer multi-night runs
- Market-driven selections
- Weather-dependent scheduling

### Special Event Venues
- Fenway Park, Wrigley Field (stadiums)
- New Year's Eve locations
- Festival grounds
- One-time or rare appearances
