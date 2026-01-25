# DMBAlmanac Lists Page Selectors Reference

Quick reference for CSS selectors and HTML patterns used in the Curated Lists scraper.

## Lists Index Page (Lists.aspx)

### URL
```
https://dmbalmanac.com/Lists.aspx
```

### HTML Structure
```html
<table class="stacked-list-container">
  <tr>
    <td>
      <div class="release-series col-2">
        <div class="headerpanel">Songs</div>
        <div class="series-content">
          <div class="hanging-indent" style="border-bottom: 1px solid #2E2E2E">
            <a class="lightorange" href="/ListView.aspx?id=36">
              Rarest Song Performed Per Album
            </a>
          </div>
          <div class="hanging-indent">
            <a class="lightorange" href="/ListView.aspx?id=24">
              Top 20 Longest Say Goodbye Intros
            </a>
          </div>
        </div>
      </div>

      <div class="release-series col-2">
        <div class="headerpanel">Venues</div>
        <div class="series-content">
          <!-- More lists... -->
        </div>
      </div>
    </td>
  </tr>
</table>
```

### Key Selectors

| Purpose | Selector | Returns |
|---------|----------|---------|
| Category containers | `.release-series` | All category blocks |
| Category name | `.headerpanel` | Category title (e.g., "Songs") |
| List container | `.series-content` | Container for list links |
| List items | `.hanging-indent` | Individual list wrappers |
| List links | `a[href*='ListView.aspx']` | Links to list pages |
| List link class | `a.lightorange` | Styled list links |

### Parsing Example
```typescript
$(".release-series").each((_, seriesEl) => {
  const $series = $(seriesEl);
  const category = $series.find(".headerpanel").text().trim();

  $series.find("a[href*='ListView.aspx']").each((_, linkEl) => {
    const href = $(linkEl).attr("href");
    const idMatch = href.match(/id=(\d+)/);
    const listId = idMatch[1];
    const title = $(linkEl).text().trim();

    lists.push({ id: listId, title, category });
  });
});
```

### Categories Found (as of January 2026)
- Almanac Updates
- Songs
- Venues
- Releases
- Timelines
- Shows

## List Detail Page (ListView.aspx)

### URL Pattern
```
https://dmbalmanac.com/ListView.aspx?id={LIST_ID}
```

### HTML Structure Variants

#### Variant 1: Table-Based List
```html
<div class="subtitle">Longest Documented Performances By Song</div>

<div class="threedeetable">
  A comprehensive list of the longest recorded performances...
</div>

<table>
  <tr>
    <th>Song</th>
    <th>Duration</th>
    <th>Date</th>
    <th>Venue</th>
  </tr>
  <tr>
    <td><a href="/SongStats.aspx?sid=123">Lie in Our Graves</a></td>
    <td>42:15</td>
    <td>1995-08-15</td>
    <td><a href="/TourShowSet.aspx?id=456">Red Rocks</a></td>
  </tr>
  <!-- More rows... -->
</table>
```

#### Variant 2: Div-Based List
```html
<div class="subtitle">Live Trax Series Release Info Grid</div>

<div class="hanging-indent">
  <a href="/ReleaseInfo.aspx?rid=123">Live Trax Vol. 1</a>
  <span>12.19.02 - Continental Airlines Arena</span>
</div>
<div class="hanging-indent">
  <a href="/ReleaseInfo.aspx?rid=124">Live Trax Vol. 2</a>
  <span>08.31.02 - Gorge Amphitheatre</span>
</div>
```

#### Variant 3: Simple Link List
```html
<div class="subtitle">Shows Without Complete Audio Sources</div>

<a href="/TourShowSet.aspx?id=100">03.14.1991 - Trax</a><br>
<a href="/TourShowSet.aspx?id=101">03.16.1991 - Eastern Standard</a><br>
<a href="/TourShowSet.aspx?id=102">04.02.1991 - Flood Zone</a><br>
```

### Key Selectors

| Purpose | Selector | Returns |
|---------|----------|---------|
| List title | `.subtitle` | List name |
| Description | `.threedeetable` | List description/context |
| Table rows | `table tr` | All table rows |
| Table headers | `th` | Column headers |
| Table cells | `td` | Data cells |
| Div items | `.hanging-indent` | Div-based list items |
| Show links | `a[href*='TourShowSet']` | Links to show pages |
| Song links | `a[href*='SongStats']` | Links to song pages |
| Venue links | `a[href*='VenueStats']` | Links to venue pages |
| Guest links | `a[href*='GuestStats']` | Links to guest pages |
| Release links | `a[href*='Release']` | Links to release pages |

### ID Extraction Patterns

| Entity Type | URL Pattern | Regex | Example |
|-------------|-------------|-------|---------|
| Show | `TourShowSet.aspx?id=123` | `/id=(\d+)/` | id=456 |
| Song | `SongStats.aspx?sid=123` | `/sid=(\d+)/` | sid=123 |
| Venue | `VenueStats.aspx?vid=123` | `/vid=(\d+)/` | vid=789 |
| Guest | `GuestStats.aspx?gid=123` | `/gid=([^&]+)/` | gid=abc |
| Release | `ReleaseInfo.aspx?rid=123` | `/rid=(\d+)/` | rid=234 |

### Parsing Strategy

The scraper uses three strategies in order:

#### Strategy 1: Table-Based
```typescript
$("table tr").each((_, row) => {
  const $row = $(row);
  if ($row.find("th").length > 0) return; // Skip headers

  const link = $row.find("a[href*='TourShowSet'], a[href*='SongStats']").first();
  if (link.length > 0) {
    const itemTitle = link.text().trim();
    const itemLink = link.attr("href");
    // Extract ID and type...
  }
});
```

#### Strategy 2: Div-Based
```typescript
$(".hanging-indent, .list-item").each((_, itemEl) => {
  const $item = $(itemEl);
  const link = $item.find("a").first();

  if (link.length > 0) {
    const itemTitle = link.text().trim();
    const itemLink = link.attr("href");
    // Extract ID and type...
  }
});
```

#### Strategy 3: Simple Links
```typescript
$("a[href*='TourShowSet'], a[href*='SongStats'], ...").each((_, linkEl) => {
  const $link = $(linkEl);
  const itemTitle = $link.text().trim();
  const itemLink = $link.attr("href");
  // Extract ID and type...
});
```

## Item Type Detection

```typescript
function detectItemType(itemLink: string): {
  type: 'show' | 'song' | 'venue' | 'guest' | 'release' | 'text';
  id?: string;
} {
  if (itemLink.includes("TourShowSet")) {
    return {
      type: "show",
      id: itemLink.match(/id=(\d+)/)?.[1]
    };
  } else if (itemLink.includes("SongStats")) {
    return {
      type: "song",
      id: itemLink.match(/sid=(\d+)/)?.[1]
    };
  } else if (itemLink.includes("VenueStats")) {
    return {
      type: "venue",
      id: itemLink.match(/vid=(\d+)/)?.[1]
    };
  } else if (itemLink.includes("GuestStats")) {
    return {
      type: "guest",
      id: itemLink.match(/gid=([^&]+)/)?.[1]
    };
  } else if (itemLink.includes("Release")) {
    return {
      type: "release",
      id: itemLink.match(/rid=(\d+)/)?.[1]
    };
  } else {
    return { type: "text" };
  }
}
```

## Metadata Extraction

### From Table Cells
```typescript
const cells = $row.find("td");
const metadata: Record<string, string> = {};

cells.each((idx, cell) => {
  if (idx === 0) return; // Skip main link cell
  const cellText = $(cell).text().trim();
  if (cellText) {
    metadata[`column_${idx}`] = cellText;
  }
});
```

### From Notes/Text
```typescript
const notes = $item.text()
  .replace(itemTitle, "") // Remove main title
  .trim();

// Parse specific patterns
const durationMatch = notes.match(/(\d+:\d{2})/);
const dateMatch = notes.match(/(\d{4}-\d{2}-\d{2})/);
```

## URL Building

### Relative to Absolute
```typescript
function buildFullUrl(href: string): string {
  if (href.startsWith("http")) {
    return href;
  } else if (href.startsWith("./")) {
    return `${BASE_URL}/${href.slice(2)}`;
  } else if (href.startsWith("/")) {
    return `${BASE_URL}${href}`;
  } else {
    return `${BASE_URL}/${href}`;
  }
}
```

## Common Edge Cases

### 1. Lists with No Links
Some lists contain only text entries (e.g., country names without venue links).
```html
<div>United States - 1500+ shows</div>
<div>Canada - 75+ shows</div>
```
**Solution**: Set `itemType: "text"`, extract from div text.

### 2. Lists with Mixed Types
Some lists contain both shows and songs.
```html
<tr>
  <td><a href="/SongStats.aspx?sid=123">Ants Marching</a></td>
  <td><a href="/TourShowSet.aspx?id=456">1995-08-15</a></td>
</tr>
```
**Solution**: Detect all links in row, prioritize by context.

### 3. Lists with Nested Tables
Some lists have complex nested structures.
```html
<table>
  <tr>
    <td>
      <table><!-- Nested content --></table>
    </td>
  </tr>
</table>
```
**Solution**: Use more specific selectors, avoid nested tables.

### 4. Empty or Placeholder Lists
Some list IDs may not have content yet.
```html
<div class="subtitle">Coming Soon</div>
```
**Solution**: Check `itemCount === 0`, log warning, continue.

## Testing Selectors

### Using Browser Console
```javascript
// On Lists.aspx
document.querySelectorAll('.release-series').length;
document.querySelectorAll('a[href*="ListView.aspx"]').length;

// On ListView.aspx?id=XX
document.querySelectorAll('a[href*="TourShowSet"]').length;
document.querySelectorAll('a[href*="SongStats"]').length;
```

### Using Cheerio in Script
```typescript
import * as cheerio from "cheerio";

const html = await fetch("https://dmbalmanac.com/Lists.aspx")
  .then(r => r.text());
const $ = cheerio.load(html);

console.log("Categories:", $(".release-series").length);
console.log("Lists:", $("a[href*='ListView.aspx']").length);
```

## Selector Maintenance

If selectors break, check:

1. **Class names changed**: `.release-series` → `.list-series`
2. **URL patterns changed**: `ListView.aspx` → `ListDetail.aspx`
3. **Structure changed**: Divs replaced with different elements
4. **Dynamic content**: JavaScript-rendered content not in static HTML

Always inspect actual HTML when selectors fail.
