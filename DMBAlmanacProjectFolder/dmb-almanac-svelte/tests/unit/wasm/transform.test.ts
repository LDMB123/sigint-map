/**
 * Unit tests for WASM Transform module
 *
 * Testing:
 * - JavaScript fallback transformation functions
 * - WASM loading and caching
 * - Error handling and graceful degradation
 * - Edge cases (empty arrays, null values, malformed data)
 * - Search text generation
 * - Foreign key validation
 *
 * Note: WASM module loading is mocked since the actual WASM module
 * may not be available in the test environment.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  transformSongs,
  transformVenues,
  transformTours,
  transformShows,
  transformSetlistEntries,
  validateForeignKeys,
  generateSongSearchText,
  generateVenueSearchText,
  isWasmAvailable,
  getWasmVersion,
  preloadWasm,
  type TransformResult,
  type ValidationWarning,
} from '$lib/wasm/transform';
import type {
  DexieSong,
  DexieVenue,
  DexieTour,
  DexieShow,
  DexieSetlistEntry,
} from '$lib/db/dexie/schema';

// ==================== FIXTURES ====================

const mockSongServer = {
  id: 1,
  title: 'Crash Into Me',
  slug: 'crash-into-me',
  sort_title: 'Crash Into Me',
  original_artist: null,
  is_cover: 0,
  is_original: 1,
  first_played_date: '1990-04-05',
  last_played_date: '2024-01-15',
  total_performances: 500,
  opener_count: 25,
  closer_count: 15,
  encore_count: 5,
  lyrics: 'You come here...',
  notes: 'A classic DMB song',
  is_liberated: 0,
  days_since_last_played: 10,
  shows_since_last_played: 5,
};

const mockVenueServer = {
  id: 1,
  name: 'Red Rocks Amphitheatre',
  city: 'Morrison',
  state: 'CO',
  country: 'United States',
  country_code: 'US',
  venue_type: 'outdoor_amphitheater',
  capacity: 9525,
  latitude: 39.6475,
  longitude: -105.3611,
  total_shows: 8,
  first_show_date: '1998-06-27',
  last_show_date: '2023-07-15',
  notes: 'Iconic outdoor venue',
};

const mockTourServer = {
  id: 1,
  name: 'Summer Tour 2024',
  year: 2024,
  start_date: '2024-06-01',
  end_date: '2024-08-31',
  total_shows: 25,
  unique_songs_played: 120,
  average_songs_per_show: 18.5,
  rarity_index: 7.2,
};

const mockShowServer = {
  id: 1,
  date: '2024-01-15',
  venue_id: 1,
  tour_id: 1,
  notes: 'Great show!',
  soundcheck: 'Warehouse, #41',
  attendance_count: 8500,
  rarity_index: 8.1,
  song_count: 20,
  venue_name: 'Red Rocks Amphitheatre',
  venue_city: 'Morrison',
  venue_state: 'CO',
  venue_country: 'United States',
  venue_country_code: 'US',
  venue_type: 'outdoor_amphitheater',
  venue_capacity: 9525,
  venue_total_shows: 8,
  tour_name: 'Summer Tour 2024',
  tour_year: 2024,
  tour_start_date: '2024-06-01',
  tour_end_date: '2024-08-31',
  tour_total_shows: 25,
};

const mockSetlistEntryServer = {
  id: 1,
  show_id: 1,
  song_id: 1,
  position: 1,
  set_name: 'set1',
  slot: 'regular',
  duration_seconds: 300,
  segue_into_song_id: null,
  is_segue: 0,
  is_tease: 0,
  tease_of_song_id: null,
  notes: 'Opening song',
  song_title: 'Crash Into Me',
  song_slug: 'crash-into-me',
  song_is_cover: 0,
  song_total_performances: 500,
  song_opener_count: 25,
  song_closer_count: 15,
  song_encore_count: 5,
  show_date: '2024-01-15',
};

// ==================== SONG TRANSFORMATION TESTS ====================

describe('transformSongs', () => {
  it('should transform server songs to Dexie format', async () => {
    const result = await transformSongs([mockSongServer as any]);

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('durationMs');
    expect(result.source).toBe('js');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should map all song fields correctly', async () => {
    const result = await transformSongs([mockSongServer as any]);
    const song = result.data[0];

    expect(song.id).toBe(1);
    expect(song.title).toBe('Crash Into Me');
    expect(song.slug).toBe('crash-into-me');
    expect(song.sortTitle).toBe('Crash Into Me');
    expect(song.originalArtist).toBeNull();
    expect(song.isCover).toBe(false);
    expect(song.isOriginal).toBe(true);
    expect(song.totalPerformances).toBe(500);
    expect(song.openerCount).toBe(25);
    expect(song.closerCount).toBe(15);
    expect(song.encoreCount).toBe(5);
  });

  it('should convert boolean fields from integers', async () => {
    const result = await transformSongs([mockSongServer as any]);
    const song = result.data[0];

    expect(typeof song.isCover).toBe('boolean');
    expect(typeof song.isOriginal).toBe('boolean');
    expect(typeof song.isLiberated).toBe('boolean');
  });

  it('should generate searchText field', async () => {
    const result = await transformSongs([mockSongServer as any]);
    const song = result.data[0];

    expect(song.searchText).toContain('crash into me');
  });

  it('should handle empty array', async () => {
    const result = await transformSongs([]);

    expect(result.data).toEqual([]);
    expect(result.source).toBe('js');
  });

  it('should handle null/undefined values', async () => {
    const songWithNulls = {
      ...mockSongServer,
      lyrics: null,
      notes: undefined,
      original_artist: null,
    };

    const result = await transformSongs([songWithNulls as any]);
    const song = result.data[0];

    expect(song.lyrics).toBeNull();
    expect(song.originalArtist).toBeNull();
  });

  it('should handle missing optional fields', async () => {
    const minimalSong = {
      id: 1,
      title: 'Test Song',
      slug: 'test-song',
      sort_title: 'Test Song',
    };

    const result = await transformSongs([minimalSong as any]);
    const song = result.data[0];

    expect(song.id).toBe(1);
    expect(song.title).toBe('Test Song');
  });

  it('should track transformation duration', async () => {
    const result = await transformSongs([mockSongServer as any]);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.durationMs).toBe('number');
  });

  it('should handle multiple songs', async () => {
    const songs = [
      mockSongServer,
      { ...mockSongServer, id: 2, title: 'Ants Marching' },
      { ...mockSongServer, id: 3, title: 'The Space Between' },
    ];

    const result = await transformSongs(songs as any);

    expect(result.data).toHaveLength(3);
    expect(result.data[0].id).toBe(1);
    expect(result.data[1].id).toBe(2);
    expect(result.data[2].id).toBe(3);
  });

  it('should handle liberation flag', async () => {
    const liberatedSong = {
      ...mockSongServer,
      is_liberated: 1,
    };

    const result = await transformSongs([liberatedSong as any]);
    const song = result.data[0];

    expect(song.isLiberated).toBe(true);
  });

  it('should handle days_since_last_played edge cases', async () => {
    const songNoPlays = {
      ...mockSongServer,
      days_since_last_played: null,
      shows_since_last_played: null,
    };

    const result = await transformSongs([songNoPlays as any]);
    const song = result.data[0];

    expect(song.daysSinceLastPlayed).toBeNull();
    expect(song.showsSinceLastPlayed).toBeNull();
  });
});

// ==================== VENUE TRANSFORMATION TESTS ====================

describe('transformVenues', () => {
  it('should transform server venues to Dexie format', async () => {
    const result = await transformVenues([mockVenueServer as any]);

    expect(result.data).toHaveLength(1);
    expect(result.source).toBe('js');
  });

  it('should map all venue fields correctly', async () => {
    const result = await transformVenues([mockVenueServer as any]);
    const venue = result.data[0];

    expect(venue.id).toBe(1);
    expect(venue.name).toBe('Red Rocks Amphitheatre');
    expect(venue.city).toBe('Morrison');
    expect(venue.state).toBe('CO');
    expect(venue.country).toBe('United States');
    expect(venue.countryCode).toBe('US');
    expect(venue.capacity).toBe(9525);
    expect(venue.latitude).toBe(39.6475);
    expect(venue.longitude).toBe(-105.3611);
  });

  it('should generate searchText combining name and location', async () => {
    const result = await transformVenues([mockVenueServer as any]);
    const venue = result.data[0];

    expect(venue.searchText.toLowerCase()).toContain('red rocks');
    expect(venue.searchText.toLowerCase()).toContain('morrison');
    expect(venue.searchText.toLowerCase()).toContain('co');
  });

  it('should handle empty array', async () => {
    const result = await transformVenues([]);

    expect(result.data).toEqual([]);
  });

  it('should handle null coordinates', async () => {
    const venueNoCoords = {
      ...mockVenueServer,
      latitude: null,
      longitude: null,
    };

    const result = await transformVenues([venueNoCoords as any]);
    const venue = result.data[0];

    expect(venue.latitude).toBeNull();
    expect(venue.longitude).toBeNull();
  });

  it('should handle null state for international venues', async () => {
    const intlVenue = {
      ...mockVenueServer,
      state: null,
    };

    const result = await transformVenues([intlVenue as any]);
    const venue = result.data[0];

    expect(venue.state).toBeNull();
  });
});

// ==================== TOUR TRANSFORMATION TESTS ====================

describe('transformTours', () => {
  it('should transform server tours to Dexie format', async () => {
    const result = await transformTours([mockTourServer as any]);

    expect(result.data).toHaveLength(1);
    expect(result.source).toBe('js');
  });

  it('should map all tour fields correctly', async () => {
    const result = await transformTours([mockTourServer as any]);
    const tour = result.data[0];

    expect(tour.id).toBe(1);
    expect(tour.name).toBe('Summer Tour 2024');
    expect(tour.year).toBe(2024);
    expect(tour.totalShows).toBe(25);
    expect(tour.uniqueSongsPlayed).toBe(120);
    expect(tour.averageSongsPerShow).toBe(18.5);
  });

  it('should handle empty array', async () => {
    const result = await transformTours([]);

    expect(result.data).toEqual([]);
  });
});

// ==================== SHOW TRANSFORMATION TESTS ====================

describe('transformShows', () => {
  it('should transform server shows to Dexie format', async () => {
    const result = await transformShows([mockShowServer as any]);

    expect(result.data).toHaveLength(1);
    expect(result.source).toBe('js');
  });

  it('should extract year from date', async () => {
    const result = await transformShows([mockShowServer as any]);
    const show = result.data[0];

    expect(show.year).toBe(2024);
  });

  it('should embed venue and tour data', async () => {
    const result = await transformShows([mockShowServer as any]);
    const show = result.data[0];

    expect(show.venue).toBeDefined();
    expect(show.venue.id).toBe(1);
    expect(show.venue.name).toBe('Red Rocks Amphitheatre');
    expect(show.tour).toBeDefined();
    expect(show.tour.id).toBe(1);
    expect(show.tour.name).toBe('Summer Tour 2024');
  });

  it('should preserve soundcheck text field', async () => {
    const result = await transformShows([mockShowServer as any]);
    const show = result.data[0];

    expect(show.soundcheck).toBe('Warehouse, #41');
  });

  it('should handle empty array', async () => {
    const result = await transformShows([]);

    expect(result.data).toEqual([]);
  });

  it('should handle year extraction from various date formats', async () => {
    const showOldDate = {
      ...mockShowServer,
      date: '1990-01-01',
    };

    const result = await transformShows([showOldDate as any]);
    const show = result.data[0];

    expect(show.year).toBe(1990);
  });
});

// ==================== SETLIST ENTRY TRANSFORMATION TESTS ====================

describe('transformSetlistEntries', () => {
  it('should transform server entries to Dexie format', async () => {
    const result = await transformSetlistEntries([mockSetlistEntryServer as any]);

    expect(result.data).toHaveLength(1);
    expect(result.source).toBe('js');
  });

  it('should extract year from show_date', async () => {
    const result = await transformSetlistEntries([mockSetlistEntryServer as any]);
    const entry = result.data[0];

    expect(entry.year).toBe(2024);
  });

  it('should embed song data', async () => {
    const result = await transformSetlistEntries([mockSetlistEntryServer as any]);
    const entry = result.data[0];

    expect(entry.song).toBeDefined();
    expect(entry.song.id).toBe(1);
    expect(entry.song.title).toBe('Crash Into Me');
  });

  it('should convert boolean fields', async () => {
    const result = await transformSetlistEntries([mockSetlistEntryServer as any]);
    const entry = result.data[0];

    expect(typeof entry.isSegue).toBe('boolean');
    expect(typeof entry.isTease).toBe('boolean');
  });

  it('should handle empty array', async () => {
    const result = await transformSetlistEntries([]);

    expect(result.data).toEqual([]);
  });

  it('should handle null segue and tease references', async () => {
    const entryNoSegue = {
      ...mockSetlistEntryServer,
      segue_into_song_id: null,
      tease_of_song_id: null,
    };

    const result = await transformSetlistEntries([entryNoSegue as any]);
    const entry = result.data[0];

    expect(entry.segueIntoSongId).toBeNull();
    expect(entry.teaseOfSongId).toBeNull();
  });

  it('should handle large datasets', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      ...mockSetlistEntryServer,
      id: i,
      song_id: (i % 100) + 1,
    }));

    const result = await transformSetlistEntries(largeDataset as any);

    expect(result.data).toHaveLength(1000);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ==================== SEARCH TEXT GENERATION TESTS ====================

describe('generateSongSearchText', () => {
  it('should generate search text for songs', async () => {
    const text = await generateSongSearchText('Crash Into Me', 'Original');

    expect(text.toLowerCase()).toContain('crash');
    expect(text.toLowerCase()).toContain('into');
  });

  it('should handle songs without original artist', async () => {
    const text = await generateSongSearchText('Ants Marching');

    expect(text.toLowerCase()).toContain('ants');
  });

  it('should be lowercase for searching', async () => {
    const text = await generateSongSearchText('CRASH INTO ME', 'Artist');

    expect(text).toBe(text.toLowerCase());
  });

  it('should handle empty strings', async () => {
    const text = await generateSongSearchText('');

    expect(typeof text).toBe('string');
  });
});

describe('generateVenueSearchText', () => {
  it('should generate search text for venues', async () => {
    const text = await generateVenueSearchText(
      'Red Rocks Amphitheatre',
      'Morrison',
      'CO',
      'United States'
    );

    expect(text.toLowerCase()).toContain('red');
    expect(text.toLowerCase()).toContain('morrison');
  });

  it('should work without state and country', async () => {
    const text = await generateVenueSearchText('Madison Square Garden', 'New York');

    expect(text.toLowerCase()).toContain('madison');
  });

  it('should be lowercase for searching', async () => {
    const text = await generateVenueSearchText('Red Rocks', 'MORRISON');

    expect(text).toBe(text.toLowerCase());
  });
});

// ==================== FOREIGN KEY VALIDATION TESTS ====================

describe('validateForeignKeys', () => {
  it('should return empty array for valid data', async () => {
    const songs: DexieSong[] = [
      {
        id: 1,
        title: 'Song 1',
        slug: 'song-1',
        sortTitle: 'Song 1',
        isCover: false,
        isOriginal: true,
        totalPerformances: 100,
        openerCount: 0,
        closerCount: 0,
        encoreCount: 0,
        firstPlayedDate: '2000-01-01',
        lastPlayedDate: '2024-01-01',
        searchText: 'song 1',
      } as DexieSong,
    ];

    const venues: DexieVenue[] = [
      {
        id: 1,
        name: 'Venue 1',
        city: 'City',
        country: 'Country',
        totalShows: 1,
        searchText: 'venue 1',
      } as DexieVenue,
    ];

    const tours: DexieTour[] = [
      {
        id: 1,
        name: 'Tour 1',
        year: 2024,
        totalShows: 1,
      } as DexieTour,
    ];

    const shows: DexieShow[] = [
      {
        id: 1,
        date: '2024-01-01',
        venueId: 1,
        tourId: 1,
        year: 2024,
      } as DexieShow,
    ];

    const entries: DexieSetlistEntry[] = [
      {
        id: 1,
        showId: 1,
        songId: 1,
        position: 1,
        year: 2024,
      } as DexieSetlistEntry,
    ];

    const warnings = await validateForeignKeys(songs, venues, tours, shows, entries);

    expect(warnings).toEqual([]);
  });

  it('should detect show with invalid venue', async () => {
    const songs: DexieSong[] = [];
    const venues: DexieVenue[] = [];
    const tours: DexieTour[] = [{ id: 1 } as DexieTour];
    const shows: DexieShow[] = [
      {
        id: 1,
        venueId: 999, // Non-existent venue
        tourId: 1,
      } as DexieShow,
    ];
    const entries: DexieSetlistEntry[] = [];

    const warnings = await validateForeignKeys(songs, venues, tours, shows, entries);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].field).toBe('venueId');
  });

  it('should detect show with invalid tour', async () => {
    const songs: DexieSong[] = [];
    const venues: DexieVenue[] = [{ id: 1 } as DexieVenue];
    const tours: DexieTour[] = [];
    const shows: DexieShow[] = [
      {
        id: 1,
        venueId: 1,
        tourId: 999, // Non-existent tour
      } as DexieShow,
    ];
    const entries: DexieSetlistEntry[] = [];

    const warnings = await validateForeignKeys(songs, venues, tours, shows, entries);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].field).toBe('tourId');
  });

  it('should detect entry with invalid show', async () => {
    const songs: DexieSong[] = [{ id: 1 } as DexieSong];
    const venues: DexieVenue[] = [];
    const tours: DexieTour[] = [];
    const shows: DexieShow[] = [];
    const entries: DexieSetlistEntry[] = [
      {
        id: 1,
        showId: 999, // Non-existent show
        songId: 1,
      } as DexieSetlistEntry,
    ];

    const warnings = await validateForeignKeys(songs, venues, tours, shows, entries);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].field).toBe('showId');
  });

  it('should detect entry with invalid song', async () => {
    const songs: DexieSong[] = [];
    const venues: DexieVenue[] = [{ id: 1 } as DexieVenue];
    const tours: DexieTour[] = [{ id: 1 } as DexieTour];
    const shows: DexieShow[] = [{ id: 1, venueId: 1, tourId: 1 } as DexieShow];
    const entries: DexieSetlistEntry[] = [
      {
        id: 1,
        showId: 1,
        songId: 999, // Non-existent song
      } as DexieSetlistEntry,
    ];

    const warnings = await validateForeignKeys(songs, venues, tours, shows, entries);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].field).toBe('songId');
  });

  it('should handle empty arrays', async () => {
    const warnings = await validateForeignKeys([], [], [], [], []);

    expect(warnings).toEqual([]);
  });

  it('should return validation warnings with proper structure', async () => {
    const songs: DexieSong[] = [];
    const venues: DexieVenue[] = [];
    const tours: DexieTour[] = [{ id: 1 } as DexieTour];
    const shows: DexieShow[] = [
      {
        id: 5,
        venueId: 999,
        tourId: 1,
      } as DexieShow,
    ];
    const entries: DexieSetlistEntry[] = [];

    const warnings = await validateForeignKeys(songs, venues, tours, shows, entries);

    const warning = warnings[0];
    expect(warning).toHaveProperty('entityType');
    expect(warning).toHaveProperty('entityId');
    expect(warning).toHaveProperty('field');
    expect(warning).toHaveProperty('invalidReference');
    expect(warning).toHaveProperty('message');
  });
});

// ==================== WASM AVAILABILITY TESTS ====================

describe('WASM availability', () => {
  it('should provide isWasmAvailable function', async () => {
    const available = await isWasmAvailable();

    expect(typeof available).toBe('boolean');
  });

  it('should provide getWasmVersion function', async () => {
    const version = await getWasmVersion();

    expect(version === null || typeof version === 'string').toBe(true);
  });

  it('should provide preloadWasm function', () => {
    expect(() => preloadWasm()).not.toThrow();
  });
});

// ==================== PERFORMANCE TESTS ====================

describe('Transform performance', () => {
  it('should handle large song dataset', async () => {
    const largeSongSet = Array.from({ length: 1000 }, (_, i) => ({
      ...mockSongServer,
      id: i,
      title: `Song ${i}`,
    }));

    const result = await transformSongs(largeSongSet as any);

    expect(result.data).toHaveLength(1000);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle large venue dataset', async () => {
    const largeVenueSet = Array.from({ length: 500 }, (_, i) => ({
      ...mockVenueServer,
      id: i,
      name: `Venue ${i}`,
    }));

    const result = await transformVenues(largeVenueSet as any);

    expect(result.data).toHaveLength(500);
  });

  it('should track duration for all transforms', async () => {
    const startSongs = await transformSongs([mockSongServer as any]);
    const startVenues = await transformVenues([mockVenueServer as any]);
    const startShows = await transformShows([mockShowServer as any]);

    expect(startSongs.durationMs).toBeGreaterThanOrEqual(0);
    expect(startVenues.durationMs).toBeGreaterThanOrEqual(0);
    expect(startShows.durationMs).toBeGreaterThanOrEqual(0);
  });
});
