/**
 * Content Index API utilities
 * Chrome 84+, makes offline content searchable
 *
 * Allows indexing shows, songs, venues, and tours for offline discovery
 * in browser search and various OS search integrations.
 */

/**
 * Represents indexable content for the Content Index API
 */
export interface IndexableContent {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'show' | 'song' | 'venue' | 'tour';
  icons?: Array<{
    src: string;
    sizes: string;
    type: string;
  }>;
  /**
   * Optional launch URL for when content is launched from search
   */
  launchUrl?: string;
}

/**
 * Show data for indexing
 */
export interface ShowData {
  id: number;
  date: string; // ISO date string
  venue: string;
  city?: string;
  tourName?: string;
  notes?: string;
}

/**
 * Song data for indexing
 */
export interface SongData {
  id: number;
  title: string;
  slug: string;
  artist?: string;
  album?: string;
  duration?: number;
}

/**
 * Venue data for indexing
 */
export interface VenueData {
  id: number;
  name: string;
  city: string;
  state?: string;
  country?: string;
  showCount?: number;
}

/**
 * Tour data for indexing
 */
export interface TourData {
  id: number;
  name: string;
  year: number;
  startDate?: string;
  endDate?: string;
  showCount?: number;
}

/**
 * Check if Content Index API is supported in the current environment
 * Returns false in SSR contexts and unsupported browsers
 */
export function isContentIndexSupported(): boolean {
  // SSR guard
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check for Service Worker support
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  // Check for Service Worker registration (may not exist during initial load)
  if (!navigator.serviceWorker.controller) {
    return false;
  }

  // Check for Content Index API
  return (
    'serviceWorker' in navigator &&
    'registration' in navigator.serviceWorker &&
    typeof (navigator.serviceWorker as any).ready !== 'undefined'
  );
}

/**
 * Get the service worker registration for Content Index operations
 * @throws Error if service worker is not registered
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!isContentIndexSupported()) {
    throw new Error('Content Index API not supported');
  }

  const registration = await navigator.serviceWorker.ready;
  if (!registration) {
    throw new Error('Service Worker registration not available');
  }

  return registration;
}

/**
 * Add content to the Content Index
 * Content becomes discoverable in browser search and OS search integrations
 *
 * @param content - The content to index
 * @returns true if indexing succeeded, false otherwise
 */
export async function addToContentIndex(content: IndexableContent): Promise<boolean> {
  try {
    if (!isContentIndexSupported()) {
      console.warn('Content Index API not supported');
      return false;
    }

    const registration = await getServiceWorkerRegistration();

    // Validate required fields
    if (!content.id || !content.title || !content.url || !content.category) {
      console.error('Content missing required fields for indexing');
      return false;
    }

    // Access contentIndex through the registration
    const index = (registration as any).index;
    if (!index || typeof index.add !== 'function') {
      console.warn('Content Index not available on service worker registration');
      return false;
    }

    // Prepare the content for indexing
    const indexEntry = {
      id: content.id,
      title: content.title,
      description: content.description,
      url: content.launchUrl || content.url,
      category: content.category,
      icons: content.icons || [],
    };

    // Add to index
    await index.add(indexEntry);

    return true;
  } catch (error) {
    console.error('Error adding content to index:', error);
    return false;
  }
}

/**
 * Remove content from the Content Index
 *
 * @param id - The ID of the content to remove
 * @returns true if removal succeeded, false otherwise
 */
export async function removeFromContentIndex(id: string): Promise<boolean> {
  try {
    if (!isContentIndexSupported()) {
      console.warn('Content Index API not supported');
      return false;
    }

    const registration = await getServiceWorkerRegistration();
    const index = (registration as any).index;

    if (!index || typeof index.delete !== 'function') {
      console.warn('Content Index not available on service worker registration');
      return false;
    }

    // Remove from index
    await index.delete(id);

    return true;
  } catch (error) {
    console.error('Error removing content from index:', error);
    return false;
  }
}

/**
 * Get all indexed content from the Content Index
 *
 * @returns Array of all indexed content
 */
export async function getIndexedContent(): Promise<IndexableContent[]> {
  try {
    if (!isContentIndexSupported()) {
      return [];
    }

    const registration = await getServiceWorkerRegistration();
    const index = (registration as any).index;

    if (!index || typeof index.getAll !== 'function') {
      console.warn('Content Index not available on service worker registration');
      return [];
    }

    // Get all indexed entries
    const entries = await index.getAll();

    return entries.map((entry: any) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      url: entry.url,
      category: entry.category,
      icons: entry.icons,
    }));
  } catch (error) {
    console.error('Error retrieving indexed content:', error);
    return [];
  }
}

/**
 * Index a show for offline search
 *
 * @param show - Show data to index
 * @returns true if indexing succeeded, false otherwise
 */
export async function indexShow(show: ShowData): Promise<boolean> {
  try {
    const dateObj = new Date(show.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const content: IndexableContent = {
      id: `show-${show.id}`,
      title: `${formattedDate} - ${show.venue}`,
      description: [
        `Show at ${show.venue}`,
        show.city && `in ${show.city}`,
        show.tourName && `(${show.tourName})`,
        show.notes && `${show.notes}`,
      ]
        .filter(Boolean)
        .join(' '),
      url: `/shows/${show.id}`,
      category: 'show',
      icons: [
        {
          src: '/icons/show-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    };

    return await addToContentIndex(content);
  } catch (error) {
    console.error('Error indexing show:', error);
    return false;
  }
}

/**
 * Index a song for offline search
 *
 * @param song - Song data to index
 * @returns true if indexing succeeded, false otherwise
 */
export async function indexSong(song: SongData): Promise<boolean> {
  try {
    const description = [
      song.artist && `by ${song.artist}`,
      song.album && `from ${song.album}`,
      song.duration && `(${formatDuration(song.duration)})`,
    ]
      .filter(Boolean)
      .join(' ');

    const content: IndexableContent = {
      id: `song-${song.id}`,
      title: song.title,
      description: description || 'Song',
      url: `/songs/${song.slug}`,
      category: 'song',
      icons: [
        {
          src: '/icons/song-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    };

    return await addToContentIndex(content);
  } catch (error) {
    console.error('Error indexing song:', error);
    return false;
  }
}

/**
 * Index a venue for offline search
 *
 * @param venue - Venue data to index
 * @returns true if indexing succeeded, false otherwise
 */
export async function indexVenue(venue: VenueData): Promise<boolean> {
  try {
    const location = [venue.city, venue.state, venue.country]
      .filter(Boolean)
      .join(', ');

    const description = [
      location && `Located in ${location}`,
      venue.showCount && `${venue.showCount} shows performed`,
    ]
      .filter(Boolean)
      .join(' ');

    const content: IndexableContent = {
      id: `venue-${venue.id}`,
      title: venue.name,
      description: description || 'Venue',
      url: `/venues/${venue.id}`,
      category: 'venue',
      icons: [
        {
          src: '/icons/venue-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    };

    return await addToContentIndex(content);
  } catch (error) {
    console.error('Error indexing venue:', error);
    return false;
  }
}

/**
 * Index a tour for offline search
 *
 * @param tour - Tour data to index
 * @returns true if indexing succeeded, false otherwise
 */
export async function indexTour(tour: TourData): Promise<boolean> {
  try {
    const description = [
      `${tour.year} tour`,
      tour.showCount && `${tour.showCount} shows`,
      tour.startDate &&
        tour.endDate &&
        `${new Date(tour.startDate).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })} - ${new Date(tour.endDate).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        })}`,
    ]
      .filter(Boolean)
      .join(' ');

    const content: IndexableContent = {
      id: `tour-${tour.id}`,
      title: tour.name,
      description: description || `${tour.year} Tour`,
      url: `/tours/${tour.id}`,
      category: 'tour',
      icons: [
        {
          src: '/icons/tour-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
      ],
    };

    return await addToContentIndex(content);
  } catch (error) {
    console.error('Error indexing tour:', error);
    return false;
  }
}

/**
 * Bulk index multiple content items
 * Useful for indexing large datasets after initial app load
 *
 * @param items - Array of content to index
 * @returns Number of successfully indexed items
 */
export async function bulkIndexContent(items: IndexableContent[]): Promise<number> {
  if (!isContentIndexSupported()) {
    console.warn('Content Index API not supported');
    return 0;
  }

  let successCount = 0;

  for (const item of items) {
    try {
      const success = await addToContentIndex(item);
      if (success) {
        successCount++;
      }
    } catch (error) {
      console.error(`Error bulk indexing item ${item.id}:`, error);
    }
  }

  return successCount;
}

/**
 * Clear all indexed content
 * Useful for cleanup operations
 *
 * @returns true if clearing succeeded, false otherwise
 */
export async function clearContentIndex(): Promise<boolean> {
  try {
    if (!isContentIndexSupported()) {
      return false;
    }

    const indexed = await getIndexedContent();

    for (const item of indexed) {
      await removeFromContentIndex(item.id);
    }

    return true;
  } catch (error) {
    console.error('Error clearing content index:', error);
    return false;
  }
}

/**
 * Index shows from the offline database
 * Call this during app initialization to populate the index
 *
 * @param shows - Array of shows to index
 * @returns Number of successfully indexed shows
 */
export async function indexOfflineShows(shows: ShowData[]): Promise<number> {
  let indexedCount = 0;

  for (const show of shows) {
    const success = await indexShow(show);
    if (success) {
      indexedCount++;
    }
  }

  return indexedCount;
}

/**
 * Index songs from the offline database
 * Call this during app initialization to populate the index
 *
 * @param songs - Array of songs to index
 * @returns Number of successfully indexed songs
 */
export async function indexOfflineSongs(songs: SongData[]): Promise<number> {
  let indexedCount = 0;

  for (const song of songs) {
    const success = await indexSong(song);
    if (success) {
      indexedCount++;
    }
  }

  return indexedCount;
}

/**
 * Index venues from the offline database
 * Call this during app initialization to populate the index
 *
 * @param venues - Array of venues to index
 * @returns Number of successfully indexed venues
 */
export async function indexOfflineVenues(venues: VenueData[]): Promise<number> {
  let indexedCount = 0;

  for (const venue of venues) {
    const success = await indexVenue(venue);
    if (success) {
      indexedCount++;
    }
  }

  return indexedCount;
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g., "3:45")
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Initialize Content Index with a dataset
 * Clears existing index and populates with new data
 * Use with caution - only call during setup/sync operations
 *
 * @param data - Object containing shows, songs, venues, tours to index
 * @returns Object with counts of indexed items
 */
export async function initializeContentIndex(data: {
  shows?: ShowData[];
  songs?: SongData[];
  venues?: VenueData[];
  tours?: TourData[];
}): Promise<{
  shows: number;
  songs: number;
  venues: number;
  tours: number;
}> {
  if (!isContentIndexSupported()) {
    console.warn('Content Index API not supported - skipping initialization');
    return { shows: 0, songs: 0, venues: 0, tours: 0 };
  }

  try {
    // Clear existing index
    await clearContentIndex();

    const results = {
      shows: 0,
      songs: 0,
      venues: 0,
      tours: 0,
    };

    // Index each category
    if (data.shows && data.shows.length > 0) {
      results.shows = await indexOfflineShows(data.shows);
    }

    if (data.songs && data.songs.length > 0) {
      results.songs = await indexOfflineSongs(data.songs);
    }

    if (data.venues && data.venues.length > 0) {
      results.venues = await indexOfflineVenues(data.venues);
    }

    if (data.tours && data.tours.length > 0) {
      for (const tour of data.tours) {
        const success = await indexTour(tour);
        if (success) {
          results.tours++;
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error initializing content index:', error);
    return { shows: 0, songs: 0, venues: 0, tours: 0 };
  }
}

/**
 * Check if a specific item is indexed
 *
 * @param id - The ID to check
 * @returns true if the item is indexed, false otherwise
 */
export async function isItemIndexed(id: string): Promise<boolean> {
  try {
    const indexed = await getIndexedContent();
    return indexed.some((item) => item.id === id);
  } catch (error) {
    console.error('Error checking if item is indexed:', error);
    return false;
  }
}

/**
 * Get statistics about the current index
 *
 * @returns Object with index statistics
 */
export async function getIndexStats(): Promise<{
  total: number;
  shows: number;
  songs: number;
  venues: number;
  tours: number;
}> {
  try {
    const indexed = await getIndexedContent();

    const stats = {
      total: indexed.length,
      shows: 0,
      songs: 0,
      venues: 0,
      tours: 0,
    };

    for (const item of indexed) {
      if (item.category === 'show') {
        stats.shows++;
      } else if (item.category === 'song') {
        stats.songs++;
      } else if (item.category === 'venue') {
        stats.venues++;
      } else if (item.category === 'tour') {
        stats.tours++;
      }
    }

    return stats;
  } catch (error) {
    console.error('Error getting index statistics:', error);
    return { total: 0, shows: 0, songs: 0, venues: 0, tours: 0 };
  }
}
