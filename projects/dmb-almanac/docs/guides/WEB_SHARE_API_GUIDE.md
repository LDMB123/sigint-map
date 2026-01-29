# Web Share API - Implementation Guide

## Overview

The DMB Almanac app now supports the Web Share API, enabling users to easily share shows, songs, and setlists using their device's native share functionality.

### Key Features

✅ **Native Share Sheet**: Uses device's built-in share functionality (SMS, email, social media, etc.)
✅ **Intelligent Fallback**: Automatically falls back to copy-to-clipboard on unsupported browsers
✅ **Specialized Functions**: Pre-built share functions for shows, songs, setlists, search results
✅ **Reusable Component**: `<ShareButton>` component with variants and sizes
✅ **Analytics Tracking**: Automatic tracking of share events
✅ **Toast Notifications**: User feedback for copy-to-clipboard fallback

### Browser Support

| Browser | Web Share | Files | Notes |
|---------|-----------|-------|-------|
| Chrome 89+ | ✅ | ✅ | Full support |
| Edge 93+ | ✅ | ✅ | Full support |
| Safari 12.1+ | ✅ | ⚠️ | iOS: full support<br />macOS: limited |
| Opera 76+ | ✅ | ✅ | Full support |
| Firefox | ❌ | ❌ | Falls back to copy |

**Fallback Behavior**:
- No Web Share: Copy URL to clipboard
- No clipboard: Open in new tab

---

## Quick Start

### 1. Share a Show

```svelte
<script>
  import ShareButton from '$lib/components/pwa/ShareButton.svelte';

  const show = {
    id: 'show-123',
    date: '2024-06-15',
    venueName: 'Red Rocks Amphitheatre',
    tourName: 'Summer 2024'
  };
</script>

<ShareButton
  data={{
    title: `DMB - ${show.date}`,
    text: `Check out this DMB show at ${show.venueName}`,
    url: `https://dmbalmanac.com/shows/${show.id}`
  }}
  variant="primary"
/>
```

### 2. Use Specialized Functions

```typescript
import { shareShow, shareSong, shareSetlist } from '$lib/pwa/web-share';

// Share a show
await shareShow({
  id: 'show-123',
  date: '2024-06-15',
  venueName: 'Red Rocks Amphitheatre',
  tourName: 'Summer 2024'
});

// Share a song
await shareSong({
  id: 'song-456',
  name: 'Ants Marching',
  timesPlayed: 1827,
  firstPlayed: '1991-03-14'
});

// Share a setlist
await shareSetlist(
  { id: 'show-123', date: '2024-06-15', venueName: 'Red Rocks' },
  [
    { songName: 'Ants Marching' },
    { songName: '#41' },
    { songName: 'Warehouse', notes: 'Extended jam' }
  ]
);
```

---

## Component Usage

### ShareButton Props

```typescript
interface ShareButtonProps {
  // Required: Share data
  data: {
    title: string;
    text: string;
    url: string;
    files?: File[];  // Optional: images, PDFs
  };

  // Optional: Share options
  options?: {
    trackAnalytics?: boolean;      // Default: true
    successMessage?: string;        // Custom toast message
    errorMessage?: string;          // Custom error message
    onSuccess?: () => void;         // Success callback
    onError?: (error: Error) => void;  // Error callback
  };

  // Styling
  variant?: 'primary' | 'secondary' | 'ghost';  // Default: 'secondary'
  size?: 'sm' | 'md' | 'lg';                    // Default: 'md'
  label?: string;                                // Custom label
  showIcon?: boolean;                            // Default: true
  showLabel?: boolean;                           // Default: true
  disabled?: boolean;                            // Default: false
}
```

### Examples

#### Primary Button (Prominent)

```svelte
<ShareButton
  data={{
    title: 'DMB Setlist',
    text: 'Check out this amazing setlist!',
    url: 'https://dmbalmanac.com/shows/123'
  }}
  variant="primary"
  size="lg"
/>
```

#### Secondary Button (Subtle)

```svelte
<ShareButton
  data={{
    title: 'Ants Marching',
    text: 'My favorite DMB song',
    url: 'https://dmbalmanac.com/songs/456'
  }}
  variant="secondary"
  size="md"
/>
```

#### Ghost Button (Minimal)

```svelte
<ShareButton
  data={{
    title: 'Search Results',
    text: 'Found 42 results for "warehouse"',
    url: 'https://dmbalmanac.com/search?q=warehouse'
  }}
  variant="ghost"
  size="sm"
/>
```

#### Icon Only (Mobile)

```svelte
<ShareButton
  data={{ title: '...', text: '...', url: '...' }}
  showLabel={false}
  variant="ghost"
/>
```

#### With Custom Success Message

```svelte
<ShareButton
  data={{ title: '...', text: '...', url: '...' }}
  options={{
    successMessage: 'Setlist copied! Share it with your friends.'
  }}
/>
```

---

## API Reference

### Core Functions

#### `share(data, options): Promise<ShareResult>`

Generic share function with automatic fallback.

```typescript
import { share } from '$lib/pwa/web-share';

const result = await share(
  {
    title: 'DMB Show',
    text: 'Check this out!',
    url: 'https://dmbalmanac.com/shows/123'
  },
  {
    trackAnalytics: true,
    onSuccess: () => console.log('Shared!'),
    onError: (error) => console.error('Share failed:', error)
  }
);

console.log(result);
// { success: true, method: 'native' }
// { success: true, method: 'copy' }
// { success: false, method: 'fallback', error: 'cancelled' }
```

#### `shareShow(show, options): Promise<ShareResult>`

Share a DMB show with pre-formatted title and text.

```typescript
await shareShow({
  id: 'show-123',
  date: '2024-06-15',
  venueName: 'Red Rocks Amphitheatre',
  tourName: 'Summer 2024'  // Optional
});

// Shares:
// Title: "Dave Matthews Band - June 15, 2024"
// Text: "Check out this DMB show at Red Rocks Amphitheatre (Summer 2024)"
// URL: "https://dmbalmanac.com/shows/show-123"
```

#### `shareSong(song, options): Promise<ShareResult>`

Share a song with statistics.

```typescript
await shareSong({
  id: 'song-456',
  name: 'Ants Marching',
  timesPlayed: 1827,        // Optional
  firstPlayed: '1991-03-14' // Optional
});

// Shares:
// Title: "Ants Marching - Dave Matthews Band"
// Text: "Check out \"Ants Marching\" by DMB (played 1827 times)"
// URL: "https://dmbalmanac.com/songs/song-456"
```

#### `shareSetlist(show, setlist, options): Promise<ShareResult>`

Share a formatted setlist.

```typescript
await shareSetlist(
  {
    id: 'show-123',
    date: '2024-06-15',
    venueName: 'Red Rocks'
  },
  [
    { songName: 'Ants Marching' },
    { songName: '#41' },
    { songName: 'Warehouse', notes: 'Extended jam' }
  ]
);

// Shares:
// Title: "DMB Setlist - June 15, 2024"
// Text:
// Dave Matthews Band
// Red Rocks
// June 15, 2024
//
// 1. Ants Marching
// 2. #41
// 3. Warehouse (Extended jam)
```

#### `shareSearchResults(query, resultCount, options): Promise<ShareResult>`

Share search results.

```typescript
await shareSearchResults('warehouse', 42);

// Shares:
// Title: "DMB Search: \"warehouse\""
// Text: "Found 42 results for \"warehouse\" on DMB Almanac"
// URL: "https://dmbalmanac.com/search?q=warehouse"
```

#### `shareUserStats(stats, options): Promise<ShareResult>`

Share user statistics.

```typescript
await shareUserStats({
  showsAttended: 15,
  favoriteSongs: ['Ants Marching', '#41', 'Warehouse'],
  totalListens: 2847
});

// Shares:
// Title: "My DMB Statistics"
// Text:
// Check out my Dave Matthews Band listening stats on DMB Almanac!
//
// 🎵 Shows attended: 15
// ⭐ Favorite songs: Ants Marching, #41, Warehouse
// 🎧 Total listens: 2847
```

### Utility Functions

#### `isWebShareSupported(): boolean`

Check if Web Share API is available.

```typescript
import { isWebShareSupported } from '$lib/pwa/web-share';

if (isWebShareSupported()) {
  // Show native share button
} else {
  // Show "Copy Link" button
}
```

#### `isFileShareSupported(): boolean`

Check if file sharing is supported.

```typescript
import { isFileShareSupported } from '$lib/pwa/web-share';

if (isFileShareSupported()) {
  // Allow sharing images, PDFs
}
```

#### `canShare(data): boolean`

Check if specific data can be shared.

```typescript
import { canShare } from '$lib/pwa/web-share';

const data = {
  title: 'DMB Show',
  text: 'Check this out',
  url: 'https://dmbalmanac.com/shows/123',
  files: [imageFile]
};

if (canShare(data)) {
  // This specific data can be shared
}
```

#### `getShareButtonConfig(): { label, icon, supported }`

Get appropriate button configuration for current browser.

```typescript
import { getShareButtonConfig } from '$lib/pwa/web-share';

const config = getShareButtonConfig();

// Chrome/Edge/Safari:
// { label: 'Share', icon: 'share', supported: true }

// Firefox (with clipboard):
// { label: 'Copy Link', icon: 'copy', supported: true }

// Old browsers:
// { label: 'Open', icon: 'external', supported: false }
```

---

## Advanced Usage

### Share with Files

Share images or PDFs along with text (supported browsers only).

```typescript
import { share, isFileShareSupported } from '$lib/pwa/web-share';

if (isFileShareSupported()) {
  // Create file (e.g., setlist as image)
  const canvas = document.createElement('canvas');
  // ... draw setlist ...

  canvas.toBlob(async (blob) => {
    const file = new File([blob], 'setlist.png', { type: 'image/png' });

    await share({
      title: 'DMB Setlist',
      text: 'Check out this setlist',
      url: 'https://dmbalmanac.com/shows/123',
      files: [file]
    });
  });
}
```

### Custom Analytics Tracking

```typescript
await share(
  { title: '...', text: '...', url: '...' },
  {
    trackAnalytics: true,  // Enable tracking
    onSuccess: () => {
      // Send custom analytics event
      gtag('event', 'share', {
        method: 'web_share_api',
        content_type: 'show',
        content_id: show.id
      });
    }
  }
);
```

### Handle Errors

```typescript
const result = await share(data, {
  onError: (error) => {
    if (error.name === 'AbortError') {
      // User cancelled - no action needed
      return;
    }

    // Actual error - show message
    console.error('Share failed:', error);
    showErrorToast('Failed to share. Please try again.');
  }
});
```

---

## Integration Examples

### Show Detail Page

```svelte
<!-- src/routes/shows/[id]/+page.svelte -->
<script lang="ts">
  import ShareButton from '$lib/components/pwa/ShareButton.svelte';
  import { shareShow } from '$lib/pwa/web-share';

  export let data;  // Show data from +page.ts

  async function handleShare() {
    const result = await shareShow(data.show, {
      onSuccess: () => {
        // Track in analytics
        trackEvent('show_shared', { show_id: data.show.id });
      }
    });

    if (!result.success && result.error !== 'cancelled') {
      // Show error message
      alert('Failed to share. Please try again.');
    }
  }
</script>

<div class="show-header">
  <h1>{data.show.venueName}</h1>
  <p>{formatDate(data.show.date)}</p>

  <ShareButton
    data={{
      title: `DMB - ${data.show.date}`,
      text: `Check out this show at ${data.show.venueName}`,
      url: `/shows/${data.show.id}`
    }}
    variant="secondary"
    on:click={handleShare}
  />
</div>
```

### Song Page

```svelte
<!-- src/routes/songs/[id]/+page.svelte -->
<script>
  import ShareButton from '$lib/components/pwa/ShareButton.svelte';
  import { shareSong } from '$lib/pwa/web-share';

  export let data;  // Song data

  const shareData = {
    title: `${data.song.name} - Dave Matthews Band`,
    text: `Check out "${data.song.name}" by DMB`,
    url: `/songs/${data.song.id}`
  };
</script>

<article>
  <header>
    <div class="header-content">
      <h1>{data.song.name}</h1>
      <ShareButton
        data={shareData}
        variant="ghost"
        size="sm"
      />
    </div>

    <p>Played {data.song.timesPlayed} times</p>
  </header>

  <!-- Song content -->
</article>
```

### Search Results

```svelte
<!-- src/routes/search/+page.svelte -->
<script>
  import ShareButton from '$lib/components/pwa/ShareButton.svelte';
  import { shareSearchResults } from '$lib/pwa/web-share';

  export let data;  // Search results

  $: shareData = {
    title: `DMB Search: "${data.query}"`,
    text: `Found ${data.results.length} results`,
    url: `/search?q=${encodeURIComponent(data.query)}`
  };
</script>

<div class="search-header">
  <h1>Search Results: "{data.query}"</h1>
  <p>{data.results.length} results</p>

  {#if data.results.length > 0}
    <ShareButton
      data={shareData}
      variant="secondary"
      size="sm"
      label="Share Results"
    />
  {/if}
</div>
```

---

## Styling

### Custom Button Styles

Override default styles using CSS variables:

```css
:global(.share-button.custom) {
  --share-button-bg: #1e40af;
  --share-button-color: white;
  --share-button-hover-bg: #1e3a8a;
  --share-button-padding: 0.75rem 1.5rem;
  --share-button-border-radius: 0.5rem;
}
```

### Responsive Behavior

The ShareButton component automatically hides labels on mobile:

```css
@media (max-width: 640px) {
  .share-button .label {
    display: none;  /* Icon only on mobile */
  }
}
```

---

## Analytics

### Tracked Events

Share events are automatically tracked with:

```javascript
{
  event: 'share',
  method: 'native' | 'copy' | 'fallback',
  title: string,  // Content title
  timestamp: number
}
```

### Custom Event Listener

Listen for share analytics events:

```typescript
// src/lib/analytics/share-tracking.ts

window.addEventListener('analytics-event', (event) => {
  const { event: eventName, method, title } = event.detail;

  if (eventName === 'share') {
    // Send to your analytics platform
    gtag('event', 'share', {
      method,
      content_type: 'show',  // or 'song', 'setlist'
      content_title: title
    });
  }
});
```

---

## Testing

### Manual Testing

**Test Native Share:**
1. Open app on mobile device (iOS Safari, Android Chrome)
2. Navigate to a show page
3. Click "Share" button
4. Verify native share sheet appears
5. Share to any app (Messages, Notes, etc.)
6. Verify shared content is correct

**Test Copy Fallback:**
1. Open app in Firefox
2. Click "Share" button (should say "Copy Link")
3. Verify "Link copied!" toast appears
4. Paste clipboard - verify URL is correct

**Test Open Fallback:**
1. Open app in old browser without Web Share or Clipboard API
2. Click "Share" button (should say "Open")
3. Verify new tab opens with correct URL

### Automated Testing

```typescript
// tests/e2e/web-share.spec.ts

import { test, expect } from '@playwright/test';

test('should trigger native share', async ({ page, context }) => {
  // Grant permissions
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/shows/123');

  // Mock native share
  await page.evaluate(() => {
    navigator.share = async (data) => {
      console.log('Share called with:', data);
    };
  });

  await page.click('[data-testid="share-button"]');

  // Verify share was called
  const logs = await page.evaluate(() => console.log);
  expect(logs).toContain('Share called with:');
});

test('should copy to clipboard as fallback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-write']);

  // Remove Web Share API to force fallback
  await page.evaluate(() => {
    delete navigator.share;
  });

  await page.goto('/shows/123');
  await page.click('[data-testid="share-button"]');

  // Verify toast appears
  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('.toast')).toContainText('Link copied');

  // Verify clipboard
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('/shows/123');
});
```

---

## Best Practices

### 1. Always Provide URL

Even if sharing just text, include a URL for fallback:

```typescript
// ❌ Bad: No URL
await share({
  title: 'DMB Song',
  text: 'Great song!'
  // Missing url - copy fallback won't work
});

// ✅ Good: Include URL
await share({
  title: 'DMB Song',
  text: 'Great song!',
  url: 'https://dmbalmanac.com/songs/123'
});
```

### 2. Handle User Cancellation

Don't show error messages when user cancels:

```typescript
const result = await share(data);

if (!result.success && result.error === 'cancelled') {
  // User cancelled - no error message needed
  return;
}

if (!result.success) {
  // Actual error - show message
  showErrorToast('Failed to share');
}
```

### 3. Use Specialized Functions

Use pre-built share functions for consistent formatting:

```typescript
// ❌ Bad: Manual formatting
await share({
  title: show.venue + ' - ' + show.date,
  text: 'Check this show',
  url: '/shows/' + show.id
});

// ✅ Good: Use specialized function
await shareShow(show);
```

### 4. Track Analytics

Enable analytics to understand share behavior:

```typescript
await share(data, {
  trackAnalytics: true  // Default: true
});
```

---

## Troubleshooting

### Issue: Share button doesn't work

**Cause**: User gesture required

**Solution**: Ensure share is triggered by user interaction (click event), not on page load.

```typescript
// ❌ Bad: Called on mount
onMount(async () => {
  await share(data);  // Will fail
});

// ✅ Good: Called from button click
<button on:click={() => share(data)}>Share</button>
```

### Issue: Files not sharing

**Cause**: File sharing not supported in browser

**Solution**: Check support before attempting:

```typescript
import { isFileShareSupported } from '$lib/pwa/web-share';

if (isFileShareSupported()) {
  await share({ ..., files: [file] });
} else {
  // Share without files
  await share({ ..., url: '...' });
}
```

### Issue: Wrong URL in shared content

**Cause**: Missing PUBLIC_SITE_URL environment variable

**Solution**: Set in `.env`:

```bash
PUBLIC_SITE_URL=https://dmbalmanac.com
```

---

## Resources

- [Web Share API Spec](https://www.w3.org/TR/web-share/)
- [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)
- [Web.dev Article](https://web.dev/web-share/)
- [Chrome Platform Status](https://chromestatus.com/feature/5668769141620736)

---

**Status**: Production Ready ✅
**Browser Coverage**: 85%+ (Chrome, Edge, Safari, Opera)
**Fallback**: Automatic copy-to-clipboard on unsupported browsers
