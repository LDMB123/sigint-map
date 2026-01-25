/**
 * Schema.org structured data generation utilities
 * Helps search engines understand content and enables rich snippets
 */

export interface ShowSchemaInput {
  id: number;
  date: string;
  venue?: {
    name: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  songCount?: number;
}

export interface SongSchemaInput {
  id: number;
  slug: string;
  title: string;
  totalTimes?: number;
}

export interface VenueSchemaInput {
  id: number;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Generate Event schema for a DMB concert
 * Enables rich results for concert pages
 */
export function getShowSchema(show: ShowSchemaInput, baseUrl: string = 'https://dmbalmanac.com') {
  const showUrl = `${baseUrl}/shows/${show.id}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': showUrl,
    name: `Dave Matthews Band - ${show.venue?.name || 'Concert'}`,
    description: buildShowDescription(show),
    url: showUrl,
    startDate: `${show.date}T19:00:00`,
    endDate: `${show.date}T23:00:00`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: show.venue?.name || 'Venue',
      address: {
        '@type': 'PostalAddress',
        ...(show.venue?.city && { addressCity: show.venue.city }),
        ...(show.venue?.state && { addressState: show.venue.state }),
        addressCountry: 'US'
      },
      ...(show.venue?.latitude &&
        show.venue?.longitude && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: show.venue.latitude,
          longitude: show.venue.longitude
        }
      })
    },
    performer: {
      '@type': 'MusicGroup',
      name: 'Dave Matthews Band',
      url: baseUrl
    },
    ...(show.songCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5',
        ratingCount: show.songCount,
        description: `${show.songCount} songs performed`
      }
    })
  };
}

/**
 * Generate MusicRecording schema for a song
 * Enables rich results for song pages
 */
export function getSongSchema(song: SongSchemaInput, baseUrl: string = 'https://dmbalmanac.com') {
  const songUrl = `${baseUrl}/songs/${song.slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    '@id': songUrl,
    name: song.title,
    description: buildSongDescription(song),
    url: songUrl,
    byArtist: {
      '@type': 'MusicGroup',
      name: 'Dave Matthews Band',
      url: baseUrl
    },
    ...(song.totalTimes && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Math.min(5, Math.max(1, 2 + song.totalTimes / 500)).toFixed(1),
        ratingCount: song.totalTimes,
        description: `Performed ${song.totalTimes} times`
      }
    })
  };
}

/**
 * Generate Place schema for a venue
 * Enables venue discovery and map integration
 */
export function getVenueSchema(
  venue: VenueSchemaInput,
  showCount: number = 0,
  baseUrl: string = 'https://dmbalmanac.com'
) {
  const venueUrl = `${baseUrl}/venues/${venue.id}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    '@id': venueUrl,
    name: venue.name,
    description: buildVenueDescription(venue, showCount),
    url: venueUrl,
    address: {
      '@type': 'PostalAddress',
      ...(venue.city && { addressCity: venue.city }),
      ...(venue.state && { addressState: venue.state }),
      addressCountry: venue.country || 'US'
    },
    ...(venue.latitude &&
      venue.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: venue.latitude,
        longitude: venue.longitude
      }
    })
  };
}

/**
 * Generate BreadcrumbList schema
 * Improves site navigation display in Google SERP
 */
export function getBreadcrumbSchema(
  breadcrumbs: Array<{ name: string; url?: string }>,
  baseUrl: string = 'https://dmbalmanac.com'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}` })
    }))
  };
}

/**
 * Generate Organization schema for the site
 * Add to homepage or global layout
 */
export function getOrganizationSchema(baseUrl: string = 'https://dmbalmanac.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DMB Almanac',
    description: 'The comprehensive database of Dave Matthews Band concert history, setlists, and statistics',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

// ==================== Helper Functions ====================

/**
 * Build SEO-friendly show description
 */
function buildShowDescription(show: ShowSchemaInput): string {
  const venue = show.venue?.name || 'venue';
  const location = show.venue?.city ? ` in ${show.venue.city}` : '';
  const songs = show.songCount ? ` with ${show.songCount} songs performed` : '';

  return `Dave Matthews Band live concert at ${venue}${location} on ${show.date}${songs}. View the complete setlist and concert details.`;
}

/**
 * Build SEO-friendly song description
 */
function buildSongDescription(song: SongSchemaInput): string {
  const performed = song.totalTimes ? ` Performed ${song.totalTimes} times in concert.` : '';
  return `${song.title} by Dave Matthews Band.${performed} View setlist history, lyrics, and statistics.`;
}

/**
 * Build SEO-friendly venue description
 */
function buildVenueDescription(venue: VenueSchemaInput, showCount: number): string {
  const location = venue.city ? ` in ${venue.city}${venue.state ? `, ${venue.state}` : ''}` : '';
  const shows = showCount ? ` Dave Matthews Band performed ${showCount} concerts` : 'Venue';

  return `${venue.name}${location}. ${shows} at this venue. View all shows, setlists, and venue details.`;
}

/**
 * Serialize schema to JSON-LD script tag
 * Usage: <script type="application/ld+json">{JSON.stringify(schema)}</script>
 */
export function serializeSchema(schema: Record<string, any>): string {
  return JSON.stringify(schema);
}
