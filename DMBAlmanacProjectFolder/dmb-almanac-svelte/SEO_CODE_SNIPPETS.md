# SEO Code Snippets - Copy & Paste Ready

Quick reference for all code changes needed. Copy these directly into your files.

## 1. Update /src/routes/+layout.svelte

Find the existing `<svelte:head>` section and add these tags:

```svelte
<svelte:head>
	<title>DMB Almanac - Dave Matthews Band Concert Database</title>
	<meta name="description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />

	<!-- OPEN GRAPH TAGS -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://dmbalmanac.com" />
	<meta property="og:title" content="DMB Almanac - Dave Matthews Band Concert Database" />
	<meta property="og:description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />
	<meta property="og:image" content="https://dmbalmanac.com/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="DMB Almanac" />
	<meta property="og:locale" content="en_US" />

	<!-- TWITTER CARD TAGS -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://dmbalmanac.com" />
	<meta name="twitter:title" content="DMB Almanac - Dave Matthews Band Concert Database" />
	<meta name="twitter:description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />
	<meta name="twitter:image" content="https://dmbalmanac.com/og-image.png" />

	<!-- EXISTING -->
	<link rel="speculationrules" href="/speculation-rules.json" />
</svelte:head>
```

---

## 2. Update /src/routes/shows/[showId]/+page.svelte

### Add to imports (top of script):
```svelte
import { getShowSchema } from '$lib/utils/schema';
```

### Add to reactive state (after existing derives):
```svelte
// Generate meta description for SEO
const metaDescription = $derived(
	show
		? `${show.date} DMB concert at ${show.venue?.name || 'venue'}${show.venue?.city ? ` in ${show.venue.city}` : ''}. View full setlist, songs performed, and concert details.`
		: 'Loading concert details...'
);

// Generate JSON-LD schema for search engines
const showSchema = $derived(
	show
		? getShowSchema({
				id: showId,
				date: show.date,
				venue: show.venue,
				songCount: show.setlist?.length
			})
		: null
);
```

### Replace entire `<svelte:head>` section:
```svelte
<svelte:head>
	{#if show}
		<title>{show.venue?.name} - {show.date} | DMB Almanac</title>
		<meta name="description" content={metaDescription} />
		<link rel="canonical" href="https://dmbalmanac.com/shows/{showId}" />

		<!-- Open Graph -->
		<meta property="og:type" content="event" />
		<meta property="og:url" content="https://dmbalmanac.com/shows/{showId}" />
		<meta property="og:title" content="{show.venue?.name} - {show.date}" />
		<meta property="og:description" content={metaDescription} />
		<meta property="og:image" content="https://dmbalmanac.com/og-shows-default.png" />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />

		<!-- Twitter Cards -->
		<meta name="twitter:card" content="summary" />
		<meta name="twitter:url" content="https://dmbalmanac.com/shows/{showId}" />
		<meta name="twitter:title" content="{show.venue?.name} - {show.date}" />
		<meta name="twitter:description" content={metaDescription} />
		<meta name="twitter:image" content="https://dmbalmanac.com/og-shows-default.png" />

		<!-- JSON-LD Schema - Event -->
		{#if showSchema}
			<script type="application/ld+json">
				{JSON.stringify(showSchema)}
			</script>
		{/if}
	{:else}
		<title>Loading Show | DMB Almanac</title>
	{/if}
</svelte:head>
```

---

## 3. Update /src/routes/songs/[slug]/+page.svelte

### Add to imports:
```svelte
import { getSongSchema } from '$lib/utils/schema';
```

### Add to reactive state (after existing derives):
```svelte
// Generate meta description for SEO
const metaDescription = $derived(
	song && song.id
		? `${song.title} by Dave Matthews Band. Performed ${song.totalTimes || 0} times in concert. View setlist history, statistics, and lyrics.`
		: song
			? `${song.title} - DMB Song Database | DMB Almanac`
			: 'Loading song information...'
);

// Generate JSON-LD schema for search engines
const songSchema = $derived(
	song && song.id
		? getSongSchema({
				id: song.id,
				slug: slug,
				title: song.title,
				totalTimes: song.totalTimes
			})
		: null
);
```

### Replace entire `<svelte:head>` section:
```svelte
<svelte:head>
	<title>{song?.title || 'Loading...'} - DMB Almanac</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href="https://dmbalmanac.com/songs/{slug}" />

	<!-- Open Graph -->
	<meta property="og:type" content="music.song" />
	<meta property="og:url" content="https://dmbalmanac.com/songs/{slug}" />
	<meta property="og:title" content="{song?.title || 'Song'} - DMB Almanac" />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:image" content="https://dmbalmanac.com/og-songs-default.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:url" content="https://dmbalmanac.com/songs/{slug}" />
	<meta name="twitter:title" content="{song?.title || 'Song'} - DMB Almanac" />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:image" content="https://dmbalmanac.com/og-songs-default.png" />

	<!-- JSON-LD Schema - MusicRecording -->
	{#if songSchema}
		<script type="application/ld+json">
			{JSON.stringify(songSchema)}
		</script>
	{/if}
</svelte:head>
```

---

## 4. Update /src/routes/venues/[venueId]/+page.svelte

### Add to imports:
```svelte
import { getVenueSchema } from '$lib/utils/schema';
```

### Add to reactive state (after existing derives):
```svelte
// Generate meta description for SEO
const metaDescription = $derived(
	venue
		? `${venue.name}${venue.city ? ` in ${venue.city}` : ''}. Dave Matthews Band performed ${shows?.length || 0} concerts at this venue. View all shows, setlists, and venue details.`
		: 'Loading venue information...'
);

// Generate JSON-LD schema for search engines
const venueSchema = $derived(
	venue
		? getVenueSchema(
				{
					id: venueId,
					name: venue.name,
					city: venue.city,
					state: venue.state,
					country: venue.country,
					latitude: venue.latitude,
					longitude: venue.longitude
				},
				shows?.length || 0
			)
		: null
);
```

### Replace entire `<svelte:head>` section:
```svelte
<svelte:head>
	<title>{venue?.name || 'Venue'} - DMB Concert History | DMB Almanac</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href="https://dmbalmanac.com/venues/{venueId}" />

	<!-- Open Graph -->
	<meta property="og:type" content="place" />
	<meta property="og:url" content="https://dmbalmanac.com/venues/{venueId}" />
	<meta property="og:title" content="{venue?.name || 'Venue'} - DMB Concert History" />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:image" content="https://dmbalmanac.com/og-venues-default.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:url" content="https://dmbalmanac.com/venues/{venueId}" />
	<meta name="twitter:title" content="{venue?.name || 'Venue'} - DMB Concert History" />
	<meta name="twitter:description" content={metaDescription} />
	<meta name="twitter:image" content="https://dmbalmanac.com/og-venues-default.png" />

	<!-- JSON-LD Schema - Place -->
	{#if venueSchema}
		<script type="application/ld+json">
			{JSON.stringify(venueSchema)}
		</script>
	{/if}
</svelte:head>
```

---

## 5. Update /src/routes/guests/[slug]/+page.svelte

### Replace entire `<svelte:head>` section:
```svelte
<svelte:head>
	<title>{guest?.name || 'Guest'} - DMB Guest Musicians | DMB Almanac</title>
	<meta name="description" content="{guest?.name || 'Guest'} performed with Dave Matthews Band on {appearanceCount || 0} occasions. View all guest appearances, concert setlists, and collaboration details." />
	<link rel="canonical" href="https://dmbalmanac.com/guests/{slug}" />

	<!-- Open Graph -->
	<meta property="og:type" content="profile" />
	<meta property="og:url" content="https://dmbalmanac.com/guests/{slug}" />
	<meta property="og:title" content="{guest?.name || 'Guest'} - DMB Guest Musicians" />
	<meta property="og:description" content="{guest?.name || 'Guest'} performed with Dave Matthews Band on {appearanceCount || 0} occasions." />
	<meta property="og:image" content="https://dmbalmanac.com/og-guests-default.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:url" content="https://dmbalmanac.com/guests/{slug}" />
	<meta name="twitter:title" content="{guest?.name || 'Guest'} - DMB Guest Musicians" />
	<meta name="twitter:description" content="{guest?.name || 'Guest'} performed with Dave Matthews Band on {appearanceCount || 0} occasions." />
	<meta name="twitter:image" content="https://dmbalmanac.com/og-guests-default.png" />
</svelte:head>
```

---

## 6. Environment Variable (Optional but Recommended)

Add to `.env.local` or deploy config:

```env
PUBLIC_SITE_URL=https://dmbalmanac.com
```

This allows sitemaps to use the correct domain in production vs dev.

---

## Testing Commands

### Test robots.txt:
```bash
curl -I https://dmbalmanac.com/robots.txt
# Should return 200 OK
```

### Test sitemaps:
```bash
curl https://dmbalmanac.com/sitemap.xml
curl https://dmbalmanac.com/sitemap-static.xml
curl https://dmbalmanac.com/sitemap-shows.xml
```

### Check meta tags on page:
```bash
curl https://dmbalmanac.com/shows/1 | grep -o '<meta name="description"[^>]*>'
curl https://dmbalmanac.com/songs/sample-slug | grep -o 'og:title'
```

### Validate schema:
```bash
curl https://dmbalmanac.com/shows/1 | grep -i "application/ld+json" | head -1
```

### Check with Google's Tool:
1. Visit: https://search.google.com/test/rich-results
2. Enter: https://dmbalmanac.com/shows/1
3. Should show green checkmarks for Event schema

---

## Common Issues & Fixes

### Issue: Meta descriptions not showing
**Fix**: Wait 24-48 hours, then check Google Search Console

### Issue: Schema validation fails
**Fix**: Ensure JSON is valid:
```svelte
<!-- WRONG -->
<script type="application/ld+json">
  {JSON.stringify(showSchema)} <!-- Missing curly braces -->
</script>

<!-- RIGHT -->
<script type="application/ld+json">
  {JSON.stringify(showSchema)}
</script>
```

### Issue: OG images not showing in social media
**Fix**:
1. Create 1200x630px PNG files
2. Clear social media cache: https://developers.facebook.com/tools/debug
3. Wait 24 hours for platforms to re-cache

### Issue: Sitemaps not generating
**Fix**: Ensure data-loader functions exist:
```bash
# Check if these exist in /src/lib/server/data-loader.ts:
# - getAllShows()
# - getAllSongs()
# - getAllVenues()
# - getAllGuests()
```

### Issue: Canonical URLs showing wrong domain
**Fix**: Set PUBLIC_SITE_URL env var:
```env
# .env.local
PUBLIC_SITE_URL=https://dmbalmanac.com
```

---

## Rollback Instructions

If something breaks, revert changes:

```bash
# Revert specific file to original
git checkout src/routes/+layout.svelte

# Revert all files
git checkout src/

# Delete sitemap files
rm -rf src/routes/sitemap*.xml
```

Then restart dev server:
```bash
npm run dev
```

---

## Performance Notes

**robots.txt**: ~1KB, served instantly
**Sitemaps**: Generated on-request, cached for 24 hours
**Schema**: Inline JSON-LD, ~2-5KB per page (negligible impact)
**OG Images**: Referenced but not loaded (except when shared)

**No performance impact expected from these changes.**

---

## SEO Impact Checklist

Before Deployment:
- [ ] All code snippets copied correctly
- [ ] No syntax errors in files
- [ ] Schema validates with Rich Results Test
- [ ] OG images created (5 files)
- [ ] robots.txt accessible
- [ ] All sitemaps return valid XML

After Deployment:
- [ ] Monitor Google Search Console for errors
- [ ] Track indexation in first week
- [ ] Monitor click-through rates
- [ ] Check rankings after 2-4 weeks

---

**All code is production-ready. Copy, paste, deploy!**
