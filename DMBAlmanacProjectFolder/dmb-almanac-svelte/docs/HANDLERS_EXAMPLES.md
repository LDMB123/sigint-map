# Handler Examples & Recipes

Practical code examples for using DMB Almanac's file and protocol handlers in real-world scenarios.

## File Handler Examples

### Example 1: Creating a Concert Data File

Create a `.dmb` file with a single show's data:

```javascript
// Export concert data as .dmb file
async function exportShowAsFile(showId) {
  // Get show data from database
  const show = await db.shows.get(showId);
  const setlist = await db.setlistEntries.where('showId').equals(showId).toArray();

  // Build concert data structure
  const concertData = {
    date: show.date,
    venue: {
      id: show.venueId,
      name: show.venue?.name || 'Unknown',
      city: show.venue?.city || '',
      state: show.venue?.state || null,
      country: show.venue?.country || 'United States'
    },
    setlist: setlist.map(entry => ({
      position: entry.position,
      title: entry.songTitle,
      setName: entry.setName,
      durationSeconds: entry.durationSeconds,
      notes: entry.notes
    }))
  };

  // Create Blob and download
  const blob = new Blob([JSON.stringify(concertData, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dmb-${show.date}.dmb`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Usage
await exportShowAsFile(12345);
```

### Example 2: Creating a Multi-Show Concert Tour File

Create a `.dmb` file with multiple shows (e.g., spring tour):

```javascript
async function exportTourAsFile(tourId) {
  // Get all shows in tour
  const shows = await db.shows
    .where('tourId')
    .equals(tourId)
    .sortBy('date');

  // Build concert data with multiple shows
  const tourData = {
    tourId: tourId,
    tourName: 'Spring Tour 1991',
    showCount: shows.length,
    dateRange: {
      start: shows[0].date,
      end: shows[shows.length - 1].date
    },
    shows: await Promise.all(
      shows.map(async show => ({
        date: show.date,
        venue: {
          name: show.venue?.name,
          city: show.venue?.city,
          state: show.venue?.state,
          country: show.venue?.country
        },
        setlist: await db.setlistEntries
          .where('showId')
          .equals(show.id)
          .toArray()
          .then(entries =>
            entries.map(e => ({
              position: e.position,
              title: e.songTitle,
              setName: e.setName
            }))
          )
      }))
    )
  };

  // Download
  const blob = new Blob([JSON.stringify(tourData, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dmb-tour-${tourId}.dmb`;
  link.click();
  URL.revokeObjectURL(url);
}
```

### Example 3: Handling Dropped Files

Allow users to drop concert data files onto the page:

```svelte
<script>
  let isDragOver = $state(false);

  function handleDragOver(e) {
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    isDragOver = false;
  }

  async function handleDrop(e) {
    e.preventDefault();
    isDragOver = false;

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const validExtensions = ['.dmb', '.setlist', '.json'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      alert('Please drop a .dmb, .setlist, or .json file');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Encode and navigate
      const encoded = btoa(text);
      let type = 'concert';

      if (data.date) type = 'show';
      else if (data.slug) type = 'song';
      else if (Array.isArray(data)) type = 'batch';

      window.location.href = `/open-file?file=${encoded}&type=${type}`;
    } catch (error) {
      alert('Error reading file: ' + error.message);
    }
  }
</script>

<div
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  class:drag-over={isDragOver}
  class="drop-zone"
>
  <p>Drop concert data files here</p>
  <p class="hint">Supports .dmb, .setlist, and .json files</p>
</div>

<style>
  .drop-zone {
    border: 2px dashed var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-8);
    text-align: center;
    transition: all var(--transition-fast);
  }

  .drop-zone.drag-over {
    border-color: var(--color-primary-500);
    background: var(--background-secondary);
  }

  .hint {
    font-size: var(--text-sm);
    color: var(--foreground-muted);
  }
</style>
```

## Protocol Handler Examples

### Example 1: Creating Deep Links

Generate shareable links for different content types:

```javascript
// Create show link
function createShowLink(date) {
  return `web+dmb://show/${date}`;
}

// Create song link
function createSongLink(slug) {
  return `web+dmb://song/${slug}`;
}

// Create venue link
function createVenueLink(venueId) {
  return `web+dmb://venue/${venueId}`;
}

// Create search link
function createSearchLink(query) {
  return `web+dmb://search/${encodeURIComponent(query)}`;
}

// Usage
const showLink = createShowLink('1991-03-23');     // web+dmb://show/1991-03-23
const songLink = createSongLink('ants-marching');  // web+dmb://song/ants-marching
const searchLink = createSearchLink('phish jam');  // web+dmb://search/phish%20jam
```

### Example 2: Creating Share Buttons

Add share buttons to show/song pages:

```svelte
<script>
  import { page } from '$app/stores';

  let { show, song } = $props();

  function shareShow() {
    const url = `web+dmb://show/${show.date}`;
    const text = `Check out this DMB show from ${show.date}`;

    if (navigator.share) {
      navigator.share({
        title: 'DMB Almanac',
        text: text,
        url: url
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  }

  function copySongLink() {
    const url = `web+dmb://song/${song.slug}`;
    navigator.clipboard.writeText(url);
    alert('Song link copied!');
  }
</script>

<button onclick={shareShow} class="share-button">
  Share Show
</button>

<button onclick={copySongLink} class="copy-button">
  Copy Song Link
</button>
```

### Example 3: Smart Link with Fallback

Create a link that works both in and out of the PWA:

```javascript
// Generate a link that falls back to web version
function createSmartLink(resource, id) {
  const protocolUrl = `web+dmb://${resource}/${id}`;

  // Check if PWA is installed
  if (navigator.getInstalledRelatedApps) {
    return protocolUrl; // Use protocol if PWA might be installed
  }

  // Fallback to web URL
  const webUrls = {
    show: `/shows/${id}`,
    song: `/songs/${id}`,
    venue: `/venues/${id}`
  };

  return webUrls[resource] || '/';
}

// For HTML links with fallback
function createSmartHref(resource, id) {
  const protocolUrl = `web+dmb://${resource}/${id}`;
  const fallbackUrl = createSmartLink(resource, id);

  // Use protocol with JavaScript fallback
  return `javascript:void(window.location.href = '${protocolUrl}');`;
}

// Usage in Svelte
<a href={createSmartHref('show', '1991-03-23')}>
  Show Link
</a>
```

### Example 4: QR Code Deep Linking

Generate QR codes that open app when scanned:

```svelte
<script>
  import QRCode from 'qrcode';

  async function generateQRCode(resource, id) {
    const url = `web+dmb://${resource}/${id}`;

    // Generate QR code
    const canvas = document.getElementById('qr-canvas');
    await QRCode.toCanvas(canvas, url, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }

  function downloadQRCode(resource, id) {
    generateQRCode(resource, id);
    setTimeout(() => {
      const link = document.createElement('a');
      const canvas = document.getElementById('qr-canvas');
      link.href = canvas.toDataURL();
      link.download = `dmb-${resource}-${id}.png`;
      link.click();
    }, 100);
  }
</script>

<div>
  <canvas id="qr-canvas" class="qr-code"></canvas>
  <button onclick={() => downloadQRCode('show', '1991-03-23')}>
    Download QR Code
  </button>
</div>

<style>
  .qr-code {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }
</style>
```

## Integration Recipes

### Recipe 1: Export Concert Favorite

Allow users to export their favorite shows:

```svelte
<script>
  import { userAttendedShows } from '$stores/dexie';

  async function exportFavorites() {
    const favorites = $userAttendedShows.filter(s => s.isFavorite);

    const data = {
      exportDate: new Date().toISOString(),
      favoriteCount: favorites.length,
      shows: favorites.map(s => ({
        date: s.date,
        venue: s.venue?.name,
        songs: s.songCount
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dmb-favorites-${new Date().toISOString().split('T')[0]}.dmb`;
    link.click();
    URL.revokeObjectURL(url);
  }
</script>

<button onclick={exportFavorites}>
  Export Favorites
</button>
```

### Recipe 2: Import Concert Data

Allow users to import previously exported concert data:

```svelte
<script>
  import { db } from '$db/dexie/db';

  async function importConcertData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.shows && Array.isArray(data.shows)) {
        // Store imported shows in user data
        for (const show of data.shows) {
          await db.userAttendedShows.add({
            showId: show.date, // Use date as temporary ID
            date: show.date,
            venueName: show.venue,
            notes: 'Imported from file',
            createdAt: new Date()
          });
        }
        alert(`Imported ${data.shows.length} shows!`);
      }
    } catch (error) {
      alert('Error importing file: ' + error.message);
    }
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (file) {
      importConcertData(file);
    }
  }
</script>

<input type="file" accept=".dmb,.json" onchange={handleFileInput} />
```

### Recipe 3: Share Show with Friends

Send concert data via messaging apps:

```javascript
async function shareShowViaMessage(showId) {
  // Get show data
  const show = await db.shows.get(showId);
  const setlist = await db.setlistEntries
    .where('showId')
    .equals(showId)
    .toArray();

  // Create shareable data
  const shareData = {
    date: show.date,
    venue: show.venue?.name,
    songs: setlist.length,
    link: `web+dmb://show/${show.date}`
  };

  // Generate message
  const message = `
Check out this DMB show from ${show.date}:
${show.venue?.name} - ${setlist.length} songs
${shareData.link}
  `.trim();

  // Share options
  if (navigator.share) {
    navigator.share({
      title: 'DMB Show',
      text: message
    });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(message);
    alert('Message copied to clipboard');
  }
}
```

### Recipe 4: Batch Process Shows

Create a file with multiple shows for offline access:

```javascript
async function createOfflineBundle(tourId) {
  // Get tour shows
  const shows = await db.shows
    .where('tourId')
    .equals(tourId)
    .sortBy('date');

  // Build bundle
  const bundle = {
    type: 'offline-bundle',
    tourId: tourId,
    createdAt: new Date().toISOString(),
    shows: await Promise.all(
      shows.map(async show => ({
        id: show.id,
        date: show.date,
        venue: {
          id: show.venueId,
          name: show.venue?.name,
          city: show.venue?.city,
          state: show.venue?.state
        },
        metadata: {
          duration: show.duration,
          noteCount: show.noteCount,
          photos: show.photos
        }
      }))
    )
  };

  return bundle;
}
```

## Error Handling Recipes

### Recipe 1: Graceful Fallback

Handle cases where handlers aren't supported:

```javascript
async function openContentSafely(resource, id) {
  try {
    // Try protocol handler first
    const url = `web+dmb://${resource}/${id}`;
    window.location.href = url;

    // If protocol handler doesn't work, fallback after timeout
    setTimeout(() => {
      const fallbackUrl = {
        show: `/shows/${id}`,
        song: `/songs/${id}`,
        venue: `/venues/${id}`
      }[resource] || '/';

      window.location.href = fallbackUrl;
    }, 2000);
  } catch (error) {
    console.error('Error opening content:', error);
    // Navigate to fallback URL
    window.location.href = `/shows`;
  }
}
```

### Recipe 2: Validate File Before Import

Verify file structure before importing:

```javascript
async function validateConcertFile(file) {
  const errors = [];

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Check required fields
    if (!data.date && !data.shows) {
      errors.push('Missing required field: date or shows');
    }

    if (data.date && !data.venue) {
      errors.push('Show file missing venue information');
    }

    if (data.shows) {
      if (!Array.isArray(data.shows)) {
        errors.push('Shows must be an array');
      }
      if (data.shows.length === 0) {
        errors.push('Shows array is empty');
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors
      };
    }

    return {
      valid: true,
      data: data,
      type: data.date ? 'show' : 'batch'
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error.message}`]
    };
  }
}
```

## Analytics Recipes

### Recipe 1: Track Handler Usage

Log when handlers are used:

```javascript
function trackHandlerUsage(type, resource, id) {
  const event = {
    type: 'handler_usage',
    handler: type, // 'file' or 'protocol'
    resource: resource,
    id: id,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };

  // Send to analytics
  if (window.gtag) {
    gtag('event', `${type}_handler`, {
      resource: resource,
      id: id
    });
  }

  // Also store locally
  localStorage.setItem(
    'last_handler_usage',
    JSON.stringify(event)
  );
}
```

### Recipe 2: Most Shared Content

Track which shows/songs are shared most:

```javascript
async function recordShare(resource, id) {
  const key = `shares:${resource}:${id}`;
  const count = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(count + 1));

  // Update in database
  await db.userShares.add({
    resource: resource,
    id: id,
    timestamp: new Date().toISOString()
  });
}

// Get most shared shows
async function getMostSharedShows(limit = 10) {
  return await db.userShares
    .where('resource')
    .equals('show')
    .limit(limit)
    .toArray();
}
```

## Performance Tips

### Optimize File Size
```javascript
// Don't include unnecessary data
const optimizedShow = {
  date: show.date,
  venue: { name: show.venue?.name }, // Only essentials
  setlist: setlist.map(s => ({
    title: s.title,
    setName: s.setName
  }))
};
```

### Cache Protocol Results
```javascript
const protocolCache = new Map();

function getCachedProtocolUrl(resource, id) {
  const key = `${resource}:${id}`;
  if (!protocolCache.has(key)) {
    protocolCache.set(key, `web+dmb://${resource}/${id}`);
  }
  return protocolCache.get(key);
}
```

### Batch File Operations
```javascript
async function exportMultipleShows(showIds) {
  // Build all shows in one operation
  const shows = await db.shows.bulkGet(showIds);
  // Fetch setlists in parallel
  const setlists = await Promise.all(
    showIds.map(id =>
      db.setlistEntries.where('showId').equals(id).toArray()
    )
  );
  // Build combined file
  // ...
}
```

These examples provide practical implementations of file and protocol handler functionality for real-world usage patterns.
