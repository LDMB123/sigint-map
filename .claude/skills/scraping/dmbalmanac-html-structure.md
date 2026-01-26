---
name: dmbalmanac-html-structure
version: 1.0.0
description: **Version:** 2.0
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: scraping
complexity: advanced
tags:
  - scraping
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/docs/scraping/DMBALMANAC_HTML_STRUCTURE_REFERENCE.md
migration_date: 2026-01-25
---

# DMBAlmanac.com HTML Structure Reference

**Version:** 2.0
**Last Updated:** January 25, 2026
**Purpose:** Comprehensive selector guide for scraper agents

---

## Table of Contents

1. [Site Overview](#site-overview)
2. [Global CSS Classes](#global-css-classes)
3. [URL Patterns](#url-patterns)
4. [Page Structures](#page-structures)
   - [Show Setlist Page](#show-setlist-page)
   - [Song Stats Page](#song-stats-page)
   - [Venue Stats Page](#venue-stats-page)
   - [Guest Stats Page](#guest-stats-page)
   - [Tour Listing Page](#tour-listing-page)
   - [Song List Page](#song-list-page)
5. [Common Selectors](#common-selectors)
6. [Data Extraction Patterns](#data-extraction-patterns)
7. [JavaScript Rendered Content](#javascript-rendered-content)
8. [Fallback Strategies](#fallback-strategies)
9. [Known Quirks](#known-quirks)

---

## Site Overview

DMBAlmanac.com is an ASP.NET WebForms application using:
- **Server-side rendering**: Most content is pre-rendered HTML
- **Table-based layouts**: Many pages use `<table>` for structure
- **Minimal CSS classes**: Limited semantic class naming
- **Query string navigation**: URLs use parameters like `id`, `sid`, `vid`, `gid`, `tid`
- **JavaScript charts**: Some pages use dynamic charts (plays_chart, slots_chart)

### Key Characteristics
- **Date format on site**: `MM.DD.YY` (e.g., `01.17.26`)
- **Date format for parsing**: Convert to ISO `YYYY-MM-DD`
- **No pagination**: Most lists load completely
- **Static content**: JavaScript primarily for modals/charts, not data loading

---

## Global CSS Classes

These classes appear across multiple page types:

### Layout Classes
```css
.findmenucell {
  padding: 4px 20px 2px 20px;
}
```

### Statistics Display Classes
```css
.stat-col1 { width: 50%; margin: 5px 5px 5px 0; float: left; }
.stat-col2 { width: 25%; margin: 5px; float: left; }
.stat-heading { margin: 0 0 6px 0; color: #FFC449; font-size: 18px; font-weight: bold; }
.stat-table { width: 100%; margin-bottom: 10px; }
```

### Set Position Color Classes
```css
.opener { background-color: #006666; }      /* Teal - Set opener */
.closer { background-color: #214263; }      /* Dark blue - Set closer */
.set1closer { background-color: #336699; }  /* Medium blue */
.set2opener { background-color: #004040; }  /* Dark teal */
.midset { background-color: #2E2E2E; }      /* Dark gray - Mid-set song */
.encore { background-color: #660000; }      /* Dark red - Encore */
.encore2 { background-color: #CC0000; }     /* Bright red - Encore 2 */
```

### Highlight Classes
```css
.mycell {
  font-weight: bold;
  color: #102142;
  background-color: #FFD34B;
  text-align: center;
}

.span-left { border-right: none; }
.bold { font-weight: bold; }
.guestrow { /* padding and font sizing for guest entries */ }
.ic, .sc { /* cell styling for date/slot columns */ }
```

---

## URL Patterns

### Parameter Reference

| Entity | Parameter | Example URL |
|--------|-----------|-------------|
| Show | `id` | `TourShowSet.aspx?id=453532912` |
| Song | `sid` | `SongStats.aspx?sid=1` |
| Venue | `vid` | `VenueStats.aspx?vid=100` |
| Guest | `gid` | `GuestStats.aspx?gid=15` |
| Tour | `tid` | `TourStats.aspx?tid=5` |
| Year | `where` | `TourShow.aspx?where=2024` |
| Release | `release` | `ReleaseView.aspx?release=XXX` |

### Full URL Templates

```
# Show pages
https://dmbalmanac.com/TourShowSet.aspx?id={showId}&tid={tourId}&where={year}
https://dmbalmanac.com/ShowSetlist.aspx?id={showId}

# Song pages
https://dmbalmanac.com/SongStats.aspx?sid={songId}
https://dmbalmanac.com/songs/summary.aspx?sid={songId}
https://dmbalmanac.com/TourSongShows.aspx?sid={songId}&tid={tourId}&where={year}

# Venue pages
https://dmbalmanac.com/VenueStats.aspx?vid={venueId}

# Guest pages
https://dmbalmanac.com/GuestStats.aspx?gid={guestId}
https://dmbalmanac.com/GuestStats.aspx?gid={guestId}&sid={songId}

# Tour pages
https://dmbalmanac.com/TourShowsByYear.aspx?year={year}
https://dmbalmanac.com/TourShow.aspx?where={year}
https://dmbalmanac.com/TourShowInfo.aspx?tid={tourId}&where={year}

# List pages
https://dmbalmanac.com/songs/all-songs.aspx
https://dmbalmanac.com/VenueList.aspx
https://dmbalmanac.com/GuestList.aspx
```

---

## Page Structures

### Show Setlist Page

**URLs:**
- `TourShowSet.aspx?id={id}&tid={tid}&where={year}`
- `ShowSetlist.aspx?id={id}`

#### Header Section

```html
<!-- Show date and venue typically in header area -->
<h1>Date - Venue Name</h1>
<!-- Or within table structure -->
<td>
  <a href="./VenueStats.aspx?vid={venueId}">Venue Name</a>
  - City, State
</td>
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| Venue Link | `a[href*="VenueStats.aspx"]` | Text containing venue pattern |
| Venue ID | Extract from href: `/vid=(\d+)/` | - |
| Location | Text after venue link | Adjacent `<td>` content |
| Date | Header text or URL parameter | `where` param parsing |

#### Setlist Table

The setlist uses a table-based structure:

```html
<table class="stat-table">
  <!-- Set header row -->
  <tr>
    <td colspan="X">Set 1</td>
  </tr>

  <!-- Song rows -->
  <tr class="opener|midset|closer|encore">
    <td>#</td>
    <td>
      <a href="./TourSongShows.aspx?sid={songId}&tid={tourId}&where={year}">
        Song Title
      </a>
    </td>
    <td>5:32</td>
    <td>
      <!-- Optional: Guest info -->
      <a href="./GuestStats.aspx?gid={guestId}">Guest Name</a>
    </td>
    <td>
      <!-- Optional: Segue indicator -->
      ->
    </td>
  </tr>
</table>
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| Set Headers | `tr td[colspan]` containing "Set" | Text matching `/Set \d|Encore/` |
| Song Rows | `tr.opener, tr.midset, tr.closer, tr.encore, tr.encore2` | `tr` with song links |
| Song Link | `a[href*="TourSongShows.aspx"]` | `a[href*="sid="]` |
| Song Title | Song link `.text()` | - |
| Song ID | Extract from href: `/sid=(\d+)/` | - |
| Duration | `td` containing `/\d+:\d{2}/` | Last numeric cell |
| Guests | `a[href*="GuestStats.aspx"]` | Text with musician names |
| Segue | Text containing `->` or `>` | Adjacent cell content |
| Position | First `td` in row (numeric) | Row index |

#### Set Position Classes
Use the row class to determine song position in set:
- `.opener` - First song in set
- `.midset` - Middle of set
- `.closer`, `.set1closer` - Last song in set
- `.set2opener` - First song in Set 2
- `.encore`, `.encore2` - Encore songs

---

### Song Stats Page

**URLs:**
- `SongStats.aspx?sid={songId}`
- `songs/summary.aspx?sid={songId}`

#### Statistics Panel

```html
<div class="stat-col1">
  <h2 class="stat-heading">Play Count</h2>
  <p>231 Known Plays over 35 years</p>
</div>

<div class="stat-col2">
  <h2 class="stat-heading">Gap</h2>
  <p>316 Days Since last fully played (03.15.25)</p>
</div>

<div class="stat-col2">
  <h2 class="stat-heading">Total Time</h2>
  <p>15:41:04 total song time</p>
</div>
```

**Selectors:**
| Data | Primary Selector | Pattern |
|------|-----------------|---------|
| Play Count | `.stat-col1` text | `/(\d+)\s*Known Plays/` |
| Gap Days | `.stat-col2` text | `/(\d+)\s*Days Since/` |
| Last Played | `.stat-col2` text | `/\((\d{2}\.\d{2}\.\d{2})\)/` |
| Total Time | Text matching | `/(\d+:\d{2}:\d{2})\s*total/` |
| First Played | Text or link | `/First.*?(\d{1,2}\/\d{1,2}\/\d{4})/` |

#### Performance History Table

```html
<table class="stat-table">
  <tr>
    <th>Length</th>
    <th>Date</th>
    <th>Location</th>
  </tr>
  <tr class="opener|midset|closer|encore">
    <td>5:32</td>
    <td>
      <a href="/TourShowSet.aspx?id={showId}">01/17/2026</a>
    </td>
    <td>Richmond, VA</td>
  </tr>
</table>
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| History Rows | `.stat-table tr` (skip header) | `table tr` with show links |
| Duration | First `td` text | `/\d+:\d{2}/` pattern |
| Show Link | `a[href*="TourShowSet.aspx"]` | `a[href*="id="]` |
| Show ID | Extract from href: `/id=(\d+)/` | - |
| Date | Show link text | `/\d{1,2}\/\d{1,2}\/\d{4}/` |
| Location | Last `td` text | Text after date |
| Position | Row class name | `opener/midset/closer/encore` |

#### Chart Containers

```html
<div id="plays_chart"></div>
<div id="slots_chart"></div>
<div id="length_chart"></div>
```

JavaScript initialization:
```javascript
playsbyyearchart("plays_chart", songID);
slotsbyyearchart("slots_chart", songID);
songlengthbarplot("length_chart", songID);
```

---

### Venue Stats Page

**URL:** `VenueStats.aspx?vid={venueId}`

#### Venue Header

```html
<h1>Venue Name</h1>
<p>City, State, Country</p>
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| Venue Name | `h1` | First heading element |
| Location | `p` after `h1` | Text below venue name |

#### Venue Statistics

```html
<div class="stats">
  <p>Total Shows: 45</p>
  <p>First Show: 03/15/1992</p>
  <p>Last Show: 07/04/2024</p>
</div>
```

**Selectors:**
| Data | Pattern |
|------|---------|
| Total Shows | `/Total Shows?:\s*(\d+)/i` |
| First Show | `/First Show?:\s*(\d{2}\/\d{2}\/\d{4})/i` |
| Last Show | `/Last Show?:\s*(\d{2}\/\d{2}\/\d{4})/i` |

#### Show History Table

```html
<table>
  <tr>
    <td><a href="./TourShowSet.aspx?id={showId}">01.17.26</a></td>
    <td>Show description/tour</td>
  </tr>
</table>
```

**Selectors:**
| Data | Primary Selector | Fallback |
|------|-----------------|----------|
| Show Links | `a[href*="TourShowSet.aspx"]` | `a[href*="id="]` |
| Show ID | Extract from href: `/id=(\d+)/` | - |
| Date | Link text | `/\d{2}\.\d{2}\.\d{2}/` pattern |

---

### Guest Stats Page

**URL:** `GuestStats.aspx?gid={guestId}`

#### Guest Header

```html
<h1>Guest Name</h1>
<p>"vocals, flute"</p>
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Guest Name | `h1` |
| Instruments | `p` text, often in quotes |

#### Statistics Summary

```html
<div class="stats">
  <h3>Live Stats</h3>
  <p>Show Appearances: 42</p>
  <p>Distinct Song Appearances: 15</p>
  <p>Total Song Appearances: 87</p>
</div>
```

**Selectors:**
| Data | Pattern |
|------|---------|
| Show Count | `/Show Appearances?:\s*(\d+)/i` |
| Distinct Songs | `/Distinct Song.*?:\s*(\d+)/i` |
| Total Songs | `/Total Song.*?:\s*(\d+)/i` |

#### Song Appearances Table

```html
<h4>Distinct Songs Guested</h4>
<table>
  <tr>
    <td>
      <a href="./GuestStats.aspx?gid={guestId}&sid={songId}">Song Title</a>
    </td>
    <td>(18)</td>
  </tr>
</table>
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Song Links | `a[href*="GuestStats.aspx"][href*="sid="]` |
| Song ID | Extract from href: `/sid=(\d+)/` |
| Play Count | Text in parentheses: `/\((\d+)\)/` |

#### Appearance History by Year

```html
<h3>2024</h3>
<div>
  <a href="./TourShowSet.aspx?id={showId}">6.27</a>
  <a href="./TourShowSet.aspx?id={showId}">10.31</a>
</div>

<h3>2023</h3>
<!-- More shows... -->
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Year Headers | `h3` containing year |
| Show Links | `a[href*="TourShowSet.aspx"]` within year section |
| Date | Link text in `M.DD` format |

---

### Tour Listing Page

**URL:** `TourShowsByYear.aspx?year={year}`

#### Show List Structure

```html
<!-- Each show entry -->
<a href="./TourShowSet.aspx?id={showId}&tid={tourId}&where={year}">
  01.17.26
</a>
<a href="javascript:void(0);">
  <img src="/images/showinfo.gif" />
</a>
<a href="./VenueStats.aspx?vid={venueId}">
  - Richmond, VA
</a>
```

**Selectors:**
| Data | Primary Selector | Notes |
|------|-----------------|-------|
| Show Links | `a[href*="TourShowSet.aspx"]` | Contains date |
| Show ID | Extract: `/id=(\d+)/` | From href |
| Tour ID | Extract: `/tid=(\d+)/` | From href |
| Date | Show link text | Format: `MM.DD.YY` |
| Info Button | `img[src*="showinfo.gif"]` | Triggers popup |
| Venue Link | `a[href*="VenueStats.aspx"]` | After date |
| Venue ID | Extract: `/vid=(\d+)/` | From href |
| Location | Venue link text | Includes city/state |

#### Tour Navigation

```html
<!-- Year links -->
<a href="./TourShow.aspx?where=2023">2023</a>
<a href="./TourShow.aspx?where=2024">2024</a>
<a href="./TourShow.aspx?where=2025">2025</a>
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Year Links | `a[href*="TourShow.aspx?where="]` |
| Year Value | Extract: `/where=(\d{4})/` |

#### Tour Statistics Summary

```
# Shows = 45
# Song Performances = 892
Average # Songs per Show = 19.8
# Different Songs Played = 87
```

**Patterns:**
| Data | Regex Pattern |
|------|---------------|
| Show Count | `/# Shows\s*=\s*(\d+)/` |
| Performances | `/# Song Performances\s*=\s*([\d,]+)/` |
| Average Songs | `/Average.*?=\s*([\d.]+)/` |
| Different Songs | `/Different Songs.*?=\s*(\d+)/` |

---

### Song List Page

**URL:** `songs/all-songs.aspx`

#### Song Entries

```html
<li>
  <a href="/songs/summary.aspx?sid={songId}">Song Title</a>
</li>
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Song Links | `a[href*="songs/summary.aspx"]` |
| Song ID | Extract: `/sid=(\d+)/` |
| Song Title | Link text |

#### Category Sections

```html
<h3>Studio Albums</h3>
<ul>
  <li><a href="...">Song 1</a></li>
  <li><a href="...">Song 2</a></li>
</ul>

<h3>Cover Songs</h3>
<!-- More songs... -->
```

#### Song Dropdown Filter

```html
<select name="SongNavControl_SelectList">
  <option>SELECT SONG...</option>
  <option value="{sid}">Song Title A</option>
  <option value="{sid}">Song Title B</option>
</select>
```

**Selectors:**
| Data | Primary Selector |
|------|-----------------|
| Dropdown | `select[name*="SongNav"]` |
| Options | `select option[value]` |
| Song ID | Option `value` attribute |

---

## Common Selectors

### Universal Link Extractors

```typescript
// Show links (multiple formats)
const showSelectors = [
  'a[href*="TourShowSet.aspx"]',
  'a[href*="ShowSetlist.aspx"]',
  'a[href*="id="][href*=".aspx"]'
];

// Song links
const songSelectors = [
  'a[href*="SongStats.aspx"]',
  'a[href*="songs/summary.aspx"]',
  'a[href*="TourSongShows.aspx"]'
];

// Venue links
const venueSelectors = [
  'a[href*="VenueStats.aspx"]',
  'a[href*="vid="]'
];

// Guest links
const guestSelectors = [
  'a[href*="GuestStats.aspx"]',
  'a[href*="gid="]'
];
```

### ID Extraction Regex

```typescript
const idPatterns = {
  show: /[?&]id=(\d+)/,
  song: /[?&]sid=(\d+)/,
  venue: /[?&]vid=(\d+)/,
  guest: /[?&]gid=(\d+)/,
  tour: /[?&]tid=(\d+)/,
  year: /[?&](?:where|year)=(\d{4})/
};

// Usage
function extractId(href: string, type: keyof typeof idPatterns): number | null {
  const match = href.match(idPatterns[type]);
  return match ? parseInt(match[1], 10) : null;
}
```

### Date Parsing

```typescript
// Site uses MM.DD.YY format
function parseSiteDate(dateStr: string): string | null {
  // Format: 01.17.26 -> 2026-01-17
  const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  if (match) {
    const [, month, day, year] = match;
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month}-${day}`;
  }

  // Fallback: MM/DD/YYYY format
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}
```

### Duration Parsing

```typescript
function parseDuration(durationStr: string): number {
  // Format: 5:32 -> 332 seconds
  const match = durationStr.match(/(\d+):(\d{2})/);
  if (!match) return 0;

  const [, minutes, seconds] = match.map(Number);
  return minutes * 60 + seconds;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

## Data Extraction Patterns

### Show Setlist Extraction

```typescript
interface SetlistEntry {
  position: number;
  set: string;           // "Set 1", "Set 2", "Encore", "Encore 2"
  songId: number;
  songTitle: string;
  duration: number | null;  // seconds
  segueNext: boolean;
  guests: { guestId: number; name: string }[];
  notes: string | null;
}

function extractSetlist($: CheerioAPI): SetlistEntry[] {
  const entries: SetlistEntry[] = [];
  let currentSet = 'Set 1';
  let position = 0;

  // Find all table rows
  $('table tr').each((_, row) => {
    const $row = $(row);

    // Check for set header
    const headerCell = $row.find('td[colspan]');
    if (headerCell.length && /Set|Encore/i.test(headerCell.text())) {
      currentSet = headerCell.text().trim();
      position = 0;
      return;
    }

    // Extract song row
    const songLink = $row.find('a[href*="TourSongShows.aspx"], a[href*="sid="]').first();
    if (!songLink.length) return;

    position++;
    const href = songLink.attr('href') || '';
    const songId = extractId(href, 'song');

    // Extract guests
    const guests = $row.find('a[href*="GuestStats.aspx"]').map((_, el) => {
      const guestHref = $(el).attr('href') || '';
      return {
        guestId: extractId(guestHref, 'guest'),
        name: $(el).text().trim()
      };
    }).get();

    // Check for segue
    const rowText = $row.text();
    const segueNext = /->|→|>/.test(rowText);

    // Extract duration
    const durationMatch = rowText.match(/(\d+:\d{2})/);

    entries.push({
      position,
      set: currentSet,
      songId: songId!,
      songTitle: songLink.text().trim(),
      duration: durationMatch ? parseDuration(durationMatch[1]) : null,
      segueNext,
      guests,
      notes: null
    });
  });

  return entries;
}
```

### Song Statistics Extraction

```typescript
interface SongStats {
  songId: number;
  title: string;
  playCount: number;
  firstPlayed: string | null;  // ISO date
  lastPlayed: string | null;   // ISO date
  gapDays: number;
  totalTime: string;           // HH:MM:SS
  openerCount: number;
  closerCount: number;
  encoreCount: number;
}

function extractSongStats($: CheerioAPI, songId: number): SongStats {
  const bodyText = $('body').text();

  return {
    songId,
    title: $('h1').first().text().trim(),
    playCount: parseInt(bodyText.match(/(\d+)\s*Known Plays/)?.[1] || '0'),
    gapDays: parseInt(bodyText.match(/(\d+)\s*Days Since/)?.[1] || '0'),
    lastPlayed: parseSiteDate(bodyText.match(/last.*?\((\d{2}\.\d{2}\.\d{2})\)/i)?.[1] || ''),
    firstPlayed: parseSiteDate(bodyText.match(/debut.*?(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1] || ''),
    totalTime: bodyText.match(/(\d+:\d{2}:\d{2})\s*total/)?.[1] || '0:00:00',
    openerCount: parseInt(bodyText.match(/Opener[s]?:\s*(\d+)/i)?.[1] || '0'),
    closerCount: parseInt(bodyText.match(/Closer[s]?:\s*(\d+)/i)?.[1] || '0'),
    encoreCount: parseInt(bodyText.match(/Encore[s]?:\s*(\d+)/i)?.[1] || '0')
  };
}
```

---

## JavaScript Rendered Content

### Chart Containers (Handled by JS)

The following elements are populated via JavaScript and contain chart data:

```html
<div id="plays_chart"></div>   <!-- Plays by year chart -->
<div id="slots_chart"></div>   <!-- Set slot distribution -->
<div id="length_chart"></div>  <!-- Song length histogram -->
```

**Note:** These charts are rendered client-side. Data is passed via JavaScript:

```javascript
playsbyyearchart("plays_chart", songID);
slotsbyyearchart("slots_chart", songID);
songlengthbarplot("length_chart", songID);
```

**Scraping Strategy:**
1. Wait for `networkidle` to ensure charts load
2. Or extract data from embedded JSON in page scripts
3. Charts are supplementary; core data is in HTML tables

### Info Button Popups

```html
<a href="javascript:void(0);">
  <img src="/images/showinfo.gif" />
</a>
```

**Note:** These trigger modal popups. Data may be fetched via AJAX or already in page.

---

## Fallback Strategies

### Strategy 1: Multi-Selector Cascade

```typescript
function extractTitle($: CheerioAPI): string {
  // Primary: Semantic class
  let title = $('.page-title').text().trim();

  // Fallback 1: Heading element
  if (!title) title = $('h1').first().text().trim();

  // Fallback 2: Title tag
  if (!title) title = $('title').text().split('|')[0].trim();

  // Fallback 3: Regex on body
  if (!title) {
    const match = $('body').text().match(/^([A-Z][^<\n]{5,50})/);
    title = match?.[1]?.trim() || 'Unknown';
  }

  return title;
}
```

### Strategy 2: Context-Aware Extraction

```typescript
function extractVenueFromShowPage($: CheerioAPI): Venue | null {
  // Strategy 1: Direct venue link
  const venueLink = $('a[href*="VenueStats.aspx"]').first();
  if (venueLink.length) {
    return {
      id: extractId(venueLink.attr('href')!, 'venue'),
      name: venueLink.text().trim()
    };
  }

  // Strategy 2: Look in header table
  const headerCells = $('table').first().find('td');
  for (const cell of headerCells) {
    const link = $(cell).find('a[href*="vid="]');
    if (link.length) {
      return {
        id: extractId(link.attr('href')!, 'venue'),
        name: link.text().trim()
      };
    }
  }

  // Strategy 3: Parse from page text
  const pageText = $('body').text();
  const venueMatch = pageText.match(/at\s+(.+?),\s*([A-Z]{2})/);
  if (venueMatch) {
    return {
      id: null,  // Unknown ID
      name: `${venueMatch[1]}, ${venueMatch[2]}`
    };
  }

  return null;
}
```

### Strategy 3: Robust Row Parsing

```typescript
function extractTableRow($row: Cheerio, $: CheerioAPI): RowData | null {
  const cells = $row.find('td').toArray().map(el => $(el).text().trim());

  // Try expected structure first
  if (cells.length >= 3) {
    const [position, song, duration] = cells;
    if (/^\d+$/.test(position) && duration.match(/\d+:\d{2}/)) {
      return { position: parseInt(position), song, duration };
    }
  }

  // Fallback: Find song link anywhere
  const songLink = $row.find('a[href*="sid="]');
  if (songLink.length) {
    const duration = $row.text().match(/(\d+:\d{2})/)?.[1];
    return {
      position: null,
      song: songLink.text().trim(),
      duration: duration || null
    };
  }

  return null;
}
```

---

## Known Quirks

### 1. Date Format Variations
- Standard: `MM.DD.YY` (01.17.26)
- Alternative: `M/D/YYYY` (1/17/2026)
- In URLs: `year=2024` (full year)

### 2. Missing Data Patterns
- Early shows (pre-1992) may lack duration data
- Some venues have unknown IDs
- Guest information may be incomplete for older shows

### 3. URL Encoding Issues
- Some venue names with special characters may have encoded URLs
- Apostrophes in song titles may appear as `&#39;` or `'`

### 4. Table Structure Variations
- Some pages use `<table class="stat-table">`, others use plain `<table>`
- Row classes (`.opener`, `.midset`) not always present
- Some setlists lack set break indicators

### 5. Pagination Absence
- Most lists load completely (no pagination)
- Very long lists may have performance issues
- Liberation list, rarity index are single-page

### 6. Image-Based Info
- Some icons (like `/images/showinfo.gif`) trigger JavaScript
- Info popups may contain additional data not in main HTML

### 7. Session-Dependent Content
- Some statistics may vary based on current tour
- "X days since" calculations are relative to today

---

## Testing Selectors

### Verification Checklist

Before using selectors in production, verify:

```bash
# 1. Test on multiple page examples
curl "https://dmbalmanac.com/SongStats.aspx?sid=1" | grep -c "stat-table"
curl "https://dmbalmanac.com/SongStats.aspx?sid=42" | grep -c "stat-table"

# 2. Test fallback selectors
# If primary fails, does fallback work?

# 3. Test edge cases
# - Oldest show in database
# - Most recent show
# - Song with no plays
# - Venue with one show
```

### Browser Console Testing

```javascript
// Test selectors in browser console
document.querySelectorAll('a[href*="SongStats.aspx"]').length
document.querySelectorAll('.stat-table tr').length
document.querySelectorAll('[class*="opener"],[class*="closer"]').length
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-25 | 2.0 | Complete rewrite with detailed selectors |
| 2026-01-23 | 1.0 | Initial structure documentation |

---

## Related Documents

- `/docs/scraping/missing-scrapers-specification.md` - Gap analysis
- `/docs/quick-references/scraper-quick-reference.md` - Quick reference
- `/.claude/skills/scraping/playwright-scraper-architecture.md` - Architecture
