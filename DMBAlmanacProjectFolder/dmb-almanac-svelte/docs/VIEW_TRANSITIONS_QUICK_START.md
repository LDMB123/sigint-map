# View Transitions Quick Start Guide

## TL;DR

View Transitions work automatically on all page navigations in the DMB Almanac PWA. Just navigate between pages - you'll see smooth animations!

**Browser Support**: Chrome 111+, Edge 111+, Brave 1.50+, Opera 97+ (works on macOS 26.2 with Apple Silicon)

## Automatic Transitions (Already Enabled)

No code needed! Every navigation automatically gets smooth transitions:

```
Home → Shows Page = fade transition (200ms)
Shows → Songs = slide-left transition (250ms)
Back Button = slide-right transition (250ms)
Songs → Song Details = zoom-in transition (300ms)
```

## Add Animation to Elements

Make elements animate when navigating to a new page:

### 1. Hero Section (Large featured content)

```svelte
<script>
  import { viewTransition } from '$lib/actions/viewTransition';
</script>

<div use:viewTransition={{ name: 'hero' }}>
  <h1>Featured Concert</h1>
  <p>This hero section scales smoothly during page transitions</p>
</div>
```

### 2. Card (List items, data cards)

```svelte
<div use:viewTransition={{ name: 'card' }}>
  <h3>Concert Title</h3>
  <p>Date and venue information</p>
</div>
```

### 3. Image (Photos, album art)

```svelte
<img
  use:viewTransition={{ name: 'image' }}
  src="concert-photo.jpg"
  alt="Concert"
/>
```

### 4. Visualization (D3 charts)

```svelte
<div use:viewTransition={{ name: 'visualization' }}>
  <!-- Your D3 chart or visualization component -->
</div>
```

### 5. Header

```svelte
<header use:viewTransition={{ name: 'header' }}>
  <h2>Page Title</h2>
</header>
```

### 6. Sidebar

```svelte
<aside use:viewTransition={{ name: 'sidebar' }}>
  <!-- Navigation or sidebar content -->
</aside>
```

## Programmatic Navigation with Transitions

For dynamic navigation (search, filters, etc.):

```svelte
<script>
  import { navigate } from '$app/navigation';
  import { startViewTransition } from '$lib/utils/viewTransitions';

  async function goToSongs() {
    const transition = startViewTransition(
      async () => await navigate('/songs'),
      'slide-left'
    );

    if (transition) {
      await transition.finished;
      console.log('Navigation complete');
    }
  }
</script>

<button onclick={goToSongs}>
  View All Songs
</button>
```

## Transition Type Reference

### fade (default)
- **Duration**: 200ms
- **Use**: General page transitions
- **Animation**: Simple cross-fade

### slide-left
- **Duration**: 250ms
- **Use**: Forward navigation, drilling down
- **Animation**: Old page slides left, new page enters from right

### slide-right
- **Duration**: 250ms
- **Use**: Back navigation
- **Animation**: Old page slides right, new page enters from left

### zoom-in
- **Duration**: 300ms
- **Use**: Opening details, viewing full items
- **Animation**: Old page zooms out, new page zooms in

## Animation Names Reference

Each element with `use:viewTransition={{ name: '...' }}` gets animated with CSS:

```css
::view-transition-old(card) {
  animation: vt-card-exit 300ms ...
}

::view-transition-new(card) {
  animation: vt-card-enter 300ms ...
}
```

| Name | Type | Duration | What Animates |
|------|------|----------|---------------|
| `root` | Fade | 200ms | Entire page (default) |
| `hero` | Scale + fade | 250ms | Large featured sections |
| `card` | Scale + slide | 300ms | Cards and list items |
| `image` | Scale | 200ms | Images and photos |
| `visualization` | Scale + fade | 200ms | Charts and D3 visuals |
| `header` | Subtle slide + fade | 150ms | Headers and titles |
| `sidebar` | Side slide | 200ms | Sidebars and panels |

## Real-World Examples

### Example 1: Show Listing Page

```svelte
<!-- src/routes/shows/+page.svelte -->

<script>
  import { viewTransition } from '$lib/actions/viewTransition';
  import { navigate } from '$app/navigation';

  let shows: ShowType[] = [];
</script>

<div use:viewTransition={{ name: 'hero' }}>
  <h1>DMB Concert Archive</h1>
  <p>{shows.length} concerts from 1991-present</p>
</div>

<div class="shows-grid">
  {#each shows as show (show.id)}
    <div
      use:viewTransition={{ name: 'card' }}
      class="show-card"
      onclick={() => navigate(`/shows/${show.id}`)}
    >
      <h3>{show.date}</h3>
      <p>{show.venue} - {show.city}</p>
      <p class="songs-count">{show.setlistEntries.length} songs</p>
    </div>
  {/each}
</div>
```

When you click a card:
1. View transition starts with name `card`
2. Current page scales and fades
3. New show page slides in
4. Result: Smooth visual connection

### Example 2: Song Details Page

```svelte
<!-- src/routes/songs/[slug]/+page.svelte -->

<script>
  import { viewTransition } from '$lib/actions/viewTransition';
  let song: SongType;
</script>

<div use:viewTransition={{ name: 'hero' }}>
  <h1>{song.title}</h1>
  <p>Written by {song.writer}</p>
</div>

<div use:viewTransition={{ name: 'visualization' }}>
  <!-- D3 chart showing song frequency across tours -->
</div>

<div class="statistics">
  {#each stats as stat}
    <div use:viewTransition={{ name: 'card' }}>
      <div class="stat-value">{stat.value}</div>
      <div class="stat-label">{stat.label}</div>
    </div>
  {/each}
</div>
```

When navigating to this page:
1. Hero title animates in with scale effect
2. Visualization (D3 chart) fades in
3. Stat cards slide in one by one
4. Result: Polished, professional page reveal

### Example 3: Venue Gallery

```svelte
<!-- src/routes/venues/+page.svelte -->

<script>
  import { viewTransition } from '$lib/actions/viewTransition';
  import { navigate } from '$app/navigation';

  let venues: VenueType[];
</script>

<h1 use:viewTransition={{ name: 'header' }}>
  Venues ({venues.length})
</h1>

<div class="gallery">
  {#each venues as venue (venue.id)}
    <figure
      use:viewTransition={{ name: 'image' }}
      onclick={() => navigate(`/venues/${venue.id}`)}
    >
      <img
        src={venue.photo}
        alt={venue.name}
      />
      <figcaption>
        <h3>{venue.name}</h3>
        <p>{venue.city}, {venue.state}</p>
      </figcaption>
    </figure>
  {/each}
</div>
```

When clicking an image:
1. Image scales smoothly
2. New venue page loads with its images
3. Result: Gallery-like browsing experience

## Accessibility

View Transitions automatically respect user accessibility preferences:

### Reduced Motion
If user has `prefers-reduced-motion` enabled (macOS Accessibility settings):
- Animations are disabled
- Pages load instantly
- No layout shifts

**Test in DevTools**: DevTools > Rendering > Emulate CSS media features > `prefers-reduced-motion: reduce`

### Keyboard Navigation
View Transitions work perfectly with keyboard:
- Tab through links
- Press Enter
- Smooth transition appears
- No issues with screen readers

## Performance Tips

### ✅ DO
- Use transitions on important UI elements
- Keep animations under 350ms
- Use only named transitions (hero, card, image, etc.)
- Test on 60fps displays

### ❌ DON'T
- Disable transitions on fast connections (always use them)
- Add transitions to every single element (use sparingly)
- Make animations longer than 500ms (feels slow)
- Change layout during transitions (use transform instead)

## Troubleshooting

### Transitions Not Working?

1. **Check browser support**:
   ```typescript
   import { isViewTransitionsSupported } from '$lib/utils/viewTransitions';
   console.log(isViewTransitionsSupported()); // Should be true
   ```

2. **Verify action is imported correctly**:
   ```svelte
   import { viewTransition } from '$lib/actions/viewTransition'; // ✓
   ```

3. **Check element has correct name**:
   ```svelte
   <div use:viewTransition={{ name: 'card' }}> <!-- ✓ card is valid -->
   <div use:viewTransition={{ name: 'invalid' }}> <!-- ✗ Invalid name -->
   ```

4. **Ensure you're navigating to a new page**:
   - Transitions only work on full page navigations
   - Use SvelteKit's `navigate()` function
   - Transitions won't appear for anchor links within same page

### Transitions Look Janky?

1. **Check browser tab isn't throttled** (DevTools > Performance > CPU throttling)
2. **Close other tabs** to free up GPU resources
3. **Restart browser** to clear GPU cache
4. **Profile with DevTools > Performance** to find bottlenecks

### Animations Respect prefers-reduced-motion But I Want Them?

Update your macOS settings:
1. System Settings > Accessibility > Display
2. Uncheck "Reduce motion"
3. Refresh browser

## Getting Help

### Resources
- Full API docs: `/docs/VIEW_TRANSITIONS_API.md`
- Working examples: `/src/lib/components/examples/ViewTransitionExample.svelte`
- CSS animations: `/src/lib/motion/viewTransitions.css`

### Questions?
1. Check the full documentation
2. Look at example component
3. Check browser DevTools console for errors
4. Test on Chrome 143+ (other browsers may vary)

## Next Steps

1. ✅ Verify transitions work on your pages
2. ✅ Add `use:viewTransition` to important elements
3. ✅ Test in Chrome DevTools Performance tab
4. ✅ Test on your target devices (Apple Silicon Mac)
5. ✅ Check accessibility with `prefers-reduced-motion`

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Automatic page transitions | ✅ Enabled | Works on all navigations |
| Element animations | ✅ Available | Add via `use:viewTransition` action |
| Custom timing | ✅ Supported | Customize per route |
| Accessibility | ✅ Built-in | Respects reduced motion |
| Performance | ✅ GPU-accelerated | Zero main thread impact |
| Browser support | ✅ Chrome 111+ | Graceful fallback |

---

**Quick Start Complete!** Your DMB Almanac PWA now has smooth, GPU-accelerated page transitions. Start navigating and enjoy the polished animations!

For questions or issues, see the full documentation at `/docs/VIEW_TRANSITIONS_API.md`
