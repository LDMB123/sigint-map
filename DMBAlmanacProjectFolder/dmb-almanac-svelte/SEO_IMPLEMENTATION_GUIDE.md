# SEO Implementation Guide - Quick Reference

This guide shows how to implement the SEO improvements identified in the audit.

## Files Created

1. **`/static/robots.txt`** - ✓ Search engine crawl directives
2. **`/src/lib/utils/schema.ts`** - ✓ Schema.org generation utilities
3. **`/src/routes/sitemap.xml/+server.ts`** - ✓ Sitemap index
4. **`/src/routes/sitemap-static.xml/+server.ts`** - ✓ Static pages sitemap
5. **`/src/routes/sitemap-shows.xml/+server.ts`** - ✓ Shows sitemap
6. **`/src/routes/sitemap-songs.xml/+server.ts`** - ✓ Songs sitemap
7. **`/src/routes/sitemap-venues.xml/+server.ts`** - ✓ Venues sitemap
8. **`/src/routes/sitemap-guests.xml/+server.ts`** - ✓ Guests sitemap

## Files That Need Modification

### 1. Update `/src/routes/+layout.svelte`

Add Open Graph and Twitter Card tags in the `<svelte:head>` section:

```svelte
<svelte:head>
	<title>DMB Almanac - Dave Matthews Band Concert Database</title>
	<meta name="description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />

	<!-- Open Graph Tags -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://dmbalmanac.com" />
	<meta property="og:title" content="DMB Almanac - Dave Matthews Band Concert Database" />
	<meta property="og:description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />
	<meta property="og:image" content="https://dmbalmanac.com/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="DMB Almanac" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter Card Tags -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="DMB Almanac - Dave Matthews Band Concert Database" />
	<meta name="twitter:description" content="The complete Dave Matthews Band concert database with setlists, statistics, and more." />
	<meta name="twitter:image" content="https://dmbalmanac.com/og-image.png" />

	<!-- Canonical (implicit for homepage) -->
	<link rel="canonical" href="https://dmbalmanac.com" />

	<!-- Existing tags -->
	<link rel="speculationrules" href="/speculation-rules.json" />
</svelte:head>
```

---

### 2. Update `/src/routes/shows/[showId]/+page.svelte`

Add meta tags, schema, and canonical link:

```svelte
<script lang="ts">
	import { page } from '$app/stores';
	import { getShowWithSetlist } from '$stores/dexie';
	import { getShowSchema } from '$lib/utils/schema';
	// ... existing imports

	// Existing code
	const showId = $derived(parseInt($page.params.showId ?? '0', 10));
	const showStore = $derived(getShowWithSetlist(showId));
	const show = $derived($showStore);

	// NEW: Generate meta description
	const metaDescription = $derived(
		show
			? `${show.date} DMB concert at ${show.venue?.name || 'venue'}${show.venue?.city ? ` in ${show.venue.city}` : ''}. View full setlist, songs performed, and concert details.`
			: 'Loading concert details...'
	);

	// NEW: Generate schema
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
</script>

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

		<!-- Twitter Cards -->
		<meta name="twitter:card" content="summary" />
		<meta name="twitter:title" content="{show.venue?.name} - {show.date}" />
		<meta name="twitter:description" content={metaDescription} />

		<!-- JSON-LD Schema -->
		{#if showSchema}
			<script type="application/ld+json">
				{JSON.stringify(showSchema)}
			</script>
		{/if}
	{:else}
		<title>Loading Show | DMB Almanac</title>
	{/if}
</svelte:head>

<!-- Rest of component remains the same -->
```

---

### 3. Update `/src/routes/songs/[slug]/+page.svelte`

Add meta tags, schema, and canonical link:

```svelte
<script lang="ts">
	import { getSongSchema } from '$lib/utils/schema';
	// ... existing imports

	// Existing code
	const slug = $derived($page.params.slug || '');
	const songStore = $derived(getSongBySlug(slug));
	const song = $derived($songStore);

	// NEW: Generate meta description
	const metaDescription = $derived(
		song && song.id
			? `${song.title} setlist statistics: Performed ${song.totalTimes || 0} times by Dave Matthews Band. View performances, statistics, and lyrics.`
			: song
				? `${song.title} - DMB Song Database`
				: 'Loading song information...'
	);

	// NEW: Generate schema
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
</script>

<svelte:head>
	<title>{song?.title || 'Loading...'} - DMB Almanac</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href="https://dmbalmanac.com/songs/{slug}" />

	<!-- Open Graph -->
	<meta property="og:type" content="music.song" />
	<meta property="og:url" content="https://dmbalmanac.com/songs/{slug}" />
	<meta property="og:title" content="{song?.title} - DMB Almanac" />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:image" content="https://dmbalmanac.com/og-songs-default.png" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="{song?.title} - DMB Almanac" />
	<meta name="twitter:description" content={metaDescription} />

	<!-- JSON-LD Schema -->
	{#if songSchema}
		<script type="application/ld+json">
			{JSON.stringify(songSchema)}
		</script>
	{/if}
</svelte:head>

<!-- Rest of component remains the same -->
```

---

### 4. Update `/src/routes/venues/[venueId]/+page.svelte`

Add meta tags, schema, and canonical link:

```svelte
<script lang="ts">
	import { getVenueSchema } from '$lib/utils/schema';
	// ... existing imports

	// Existing code
	let venueId = $derived.by(() => {
		const id = $page.params.venueId;
		return id ? parseInt(id) : 0;
	});

	let venue = $derived($venueStore);
	let shows = $derived($showsStore);

	// NEW: Generate meta description
	const metaDescription = $derived(
		venue
			? `${venue.name}${venue.city ? ` in ${venue.city}` : ''}. Dave Matthews Band performed ${shows?.length || 0} concerts here. View all shows, setlists, and venue details.`
			: 'Loading venue information...'
	);

	// NEW: Generate schema
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
</script>

<svelte:head>
	<title>{venue?.name || 'Venue'} - DMB Concert History | DMB Almanac</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href="https://dmbalmanac.com/venues/{venueId}" />

	<!-- Open Graph -->
	<meta property="og:type" content="place" />
	<meta property="og:url" content="https://dmbalmanac.com/venues/{venueId}" />
	<meta property="og:title" content="{venue?.name || 'Venue'}" />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:image" content="https://dmbalmanac.com/og-venues-default.png" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="{venue?.name || 'Venue'}" />
	<meta name="twitter:description" content={metaDescription} />

	<!-- JSON-LD Schema -->
	{#if venueSchema}
		<script type="application/ld+json">
			{JSON.stringify(venueSchema)}
		</script>
	{/if}
</svelte:head>

<!-- Rest of component remains the same -->
```

---

### 5. Update `/src/routes/guests/[slug]/+page.svelte`

Add meta tags and canonical link:

```svelte
<svelte:head>
	<title>{guest?.name || 'Guest'} - DMB Guest Musicians | DMB Almanac</title>
	<meta name="description" content="{guest?.name || 'Guest'} performed with Dave Matthews Band on {appearanceCount || 0} occasions. View all guest appearances and concert setlists." />
	<link rel="canonical" href="https://dmbalmanac.com/guests/{slug}" />

	<!-- Open Graph -->
	<meta property="og:type" content="profile" />
	<meta property="og:url" content="https://dmbalmanac.com/guests/{slug}" />
	<meta property="og:title" content="{guest?.name || 'Guest'} - DMB Guest Musicians" />
	<meta property="og:description" content="{guest?.name || 'Guest'} performed with Dave Matthews Band on {appearanceCount || 0} occasions." />
	<meta property="og:image" content="https://dmbalmanac.com/og-guests-default.png" />

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content="{guest?.name || 'Guest'} - DMB Guest Musicians" />
	<meta name="twitter:description" content="{guest?.name || 'Guest'} performed with Dave Matthews Band on {appearanceCount || 0} occasions." />
</svelte:head>
```

---

## Testing Your Implementation

### 1. Test Robots.txt
```bash
curl https://dmbalmanac.com/robots.txt
# Should return the robots.txt file with sitemaps
```

### 2. Test Sitemaps
```bash
curl https://dmbalmanac.com/sitemap.xml
curl https://dmbalmanac.com/sitemap-shows.xml
curl https://dmbalmanac.com/sitemap-songs.xml
curl https://dmbalmanac.com/sitemap-venues.xml
curl https://dmbalmanac.com/sitemap-guests.xml
```

### 3. Validate XML
- Use [XML Sitemap Validator](https://www.xmlsitemaps.com/validate-xml-sitemap.html)
- Validate schema with [Google's Rich Results Test](https://search.google.com/test/rich-results)

### 4. Check Meta Tags
- Use Chrome DevTools: Right-click → Inspect → Head
- Test with [Meta Tags Inspector](https://metatags.io/)

### 5. Test Schema
```bash
curl -H "User-Agent: Googlebot" https://dmbalmanac.com/shows/1
# Check for JSON-LD in the HTML response
```

---

## Submit to Google Search Console

1. **Add property**: https://search.google.com/search-console
2. **Verify ownership**: Add robots.txt file or meta tag
3. **Submit sitemaps**:
   - https://dmbalmanac.com/sitemap.xml (index)
   - https://dmbalmanac.com/sitemap-shows.xml
   - https://dmbalmanac.com/sitemap-songs.xml
   - https://dmbalmanac.com/sitemap-venues.xml
   - https://dmbalmanac.com/sitemap-guests.xml

4. **Request indexation**: Submit homepage + key pages
5. **Monitor**:
   - Coverage report (indexed vs not indexed)
   - Search performance (impressions, clicks, CTR)
   - Core Web Vitals

---

## Create OG Images

Create placeholder Open Graph images (1200x630px):

### Homepage OG Image
- File: `/static/og-image.png`
- Include: DMB Almanac logo, "Dave Matthews Band Concert Database"

### Shows OG Image
- File: `/static/og-shows-default.png`
- Include: Concert icon, music note, dark background

### Songs OG Image
- File: `/static/og-songs-default.png`
- Include: Music note, song list, dark background

### Venues OG Image
- File: `/static/og-venues-default.png`
- Include: Map pin, venue icon, dark background

### Guests OG Image
- File: `/static/og-guests-default.png`
- Include: Person icon, musician silhouette, dark background

---

## Monitoring Checklist

After implementation, monitor these metrics:

- [ ] robots.txt returns 200
- [ ] sitemap.xml returns valid XML
- [ ] Google Search Console shows indexed URLs increasing
- [ ] No indexation errors reported
- [ ] Rich snippets appear in search results (Event, MusicRecording)
- [ ] Meta descriptions appear in Google SERP
- [ ] Open Graph tags work when shared on social media
- [ ] Canonical tags prevent duplicate content issues
- [ ] Core Web Vitals remain stable

---

## Next Steps (After 2 Weeks)

1. Check Google Search Console for:
   - Indexation progress
   - Search performance data
   - Any crawl errors

2. Monitor rankings for key terms:
   - "DMB concerts 2024"
   - "[Venue] Dave Matthews Band"
   - "DMB songs A-Z"

3. Analyze organic traffic in GA4:
   - Top landing pages
   - Bounce rate by page
   - User engagement

4. Consider content optimization:
   - Expand descriptions on high-traffic pages
   - Link internal pages strategically
   - Create blog content for seasonal opportunities

---

**Timeline**: 2-3 weeks for first indexing signals, 2-3 months for ranking improvements.
