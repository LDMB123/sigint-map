/**
 * Unit tests for Dexie Query Functions
 *
 * Tests database query functions with mocked IndexedDB/Dexie layer.
 *
 * Run with: npm run test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database module before importing queries
const mockDb = {
  handleError: vi.fn(),
  songs: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    above: vi.fn().mockReturnThis(),
    startsWithIgnoreCase: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    sortBy: vi.fn().mockResolvedValue([]),
    filter: vi.fn().mockReturnThis()
  },
  venues: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    above: vi.fn().mockReturnThis(),
    startsWithIgnoreCase: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    sortBy: vi.fn().mockResolvedValue([]),
    filter: vi.fn().mockReturnThis()
  },
  shows: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    between: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    bulkGet: vi.fn().mockResolvedValue([]),
    sortBy: vi.fn().mockResolvedValue([]),
    eachUniqueKey: vi.fn().mockResolvedValue(undefined)
  },
  setlistEntries: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    between: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0)
  },
  tours: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0)
  },
  guests: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    startsWithIgnoreCase: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    sortBy: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0)
  },
  guestAppearances: {
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    sortBy: vi.fn().mockResolvedValue([])
  },
  liberationList: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    between: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined)
  },
  userAttendedShows: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(undefined)
  },
  userFavoriteSongs: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(undefined)
  },
  userFavoriteVenues: {
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(undefined)
  },
  transaction: vi.fn().mockImplementation((_mode, _tables, fn) => fn())
};

vi.mock('$db/dexie/db', () => ({
  getDb: () => mockDb
}));

// Mock the cache module
const mockCache = {
  get: vi.fn().mockReturnValue(undefined),
  set: vi.fn()
};

vi.mock('$db/dexie/cache', () => ({
  getQueryCache: () => mockCache,
  CacheKeys: {
    songStats: () => 'stats:songs',
    venueStats: () => 'stats:venues',
    globalStats: () => 'stats:global',
    globalStatsExtended: () => 'stats:global:extended',
    yearRange: () => 'stats:yearRange',
    showsByYearSummary: () => 'stats:showsByYear',
    venueYearBreakdown: (venueId: number) => `venue:${venueId}:yearBreakdown`,
    songYearBreakdown: (songId: number) => `song:${songId}:yearBreakdown`,
    guestYearBreakdown: (guestId: number) => `guest:${guestId}:yearBreakdown`,
    tourStatsByYear: (year: number) => `tour:${year}:stats`,
    topOpenersByYear: (year: number, limit: number) => `tour:${year}:openers:${limit}`,
    topClosersByYear: (year: number, limit: number) => `tour:${year}:closers:${limit}`,
    topEncoresByYear: (year: number, limit: number) => `tour:${year}:encores:${limit}`,
    avgSongsPerShowByYear: (year: number) => `tour:${year}:avgSongs`,
    topSongsByPerformances: (limit: number) => `songs:top:performances:${limit}`,
    topOpeningSongs: (limit: number) => `songs:top:openers:${limit}`,
    topClosingSongs: (limit: number) => `songs:top:closers:${limit}`,
    topEncoreSongs: (limit: number) => `songs:top:encores:${limit}`,
    topVenuesByShows: (limit: number) => `venues:top:shows:${limit}`,
    toursGroupedByDecade: () => 'tours:byDecade',
    liberationList: (limit: number) => `liberation:${limit}`,
    fullLiberationList: () => 'liberation:full'
  },
  CacheTTL: {
    STATS: 300000,
    AGGREGATION: 600000,
    STATIC: 3600000
  }
}));

// Import queries after mocking
import {
  getAllSongs,
  getSongBySlug,
  getSongById,
  getSongStats,
  getTopSongsByPerformances,
  searchSongs,
  getAllVenues,
  getVenueById,
  getVenueStats,
  searchVenues,
  getAllShows,
  getShowById,
  getRecentShows,
  getSetlistForShow,
  getShowsForSong,
  getYearBreakdownForSong,
  getYearBreakdownForVenue,
  getAllTours,
  getTourById,
  getToursGroupedByDecade,
  getShowsForTour,
  getAllGuests,
  getGuestBySlug,
  getGuestById,
  getAppearancesByGuest,
  getYearBreakdownForGuest,
  searchGuests,
  getGlobalStats,
  hasUserAttendedShow,
  hasUserFavoritedSong,
  globalSearch
} from '$db/dexie/queries';

// ==================== TEST DATA ====================

const mockSongs = [
  {
    id: 1,
    slug: 'ants-marching',
    title: 'Ants Marching',
    sortTitle: 'Ants Marching',
    isCover: false,
    isLiberated: false,
    originalArtist: null,
    totalPerformances: 2000,
    firstPlayed: '1991-04-05',
    lastPlayed: '2024-09-22',
    avgGap: 1.5,
    searchText: 'ants marching'
  },
  {
    id: 2,
    slug: 'crash-into-me',
    title: 'Crash Into Me',
    sortTitle: 'Crash Into Me',
    isCover: false,
    isLiberated: false,
    originalArtist: null,
    totalPerformances: 1500,
    firstPlayed: '1996-04-30',
    lastPlayed: '2024-09-21',
    avgGap: 2.0,
    searchText: 'crash into me'
  }
];

const mockVenues = [
  {
    id: 1,
    name: 'Red Rocks Amphitheatre',
    city: 'Morrison',
    state: 'CO',
    country: 'USA',
    countryCode: 'US',
    venueType: 'Amphitheater',
    capacity: 9525,
    latitude: 39.6654,
    longitude: -105.2057,
    totalShows: 75,
    firstShowDate: '1995-06-15',
    lastShowDate: '2024-09-01',
    searchText: 'red rocks amphitheatre morrison co'
  },
  {
    id: 2,
    name: 'The Gorge Amphitheatre',
    city: 'George',
    state: 'WA',
    country: 'USA',
    countryCode: 'US',
    venueType: 'Amphitheater',
    capacity: 27500,
    latitude: 47.1016,
    longitude: -119.9963,
    totalShows: 90,
    firstShowDate: '1996-09-06',
    lastShowDate: '2024-09-08',
    searchText: 'gorge amphitheatre george wa'
  }
];

const mockShows = [
  {
    id: 1,
    date: '2024-09-01',
    year: 2024,
    venueId: 1,
    tourId: 1,
    venue: {
      id: 1,
      name: 'Red Rocks Amphitheatre',
      city: 'Morrison',
      state: 'CO',
      country: 'USA'
    },
    tour: {
      id: 1,
      name: 'Summer Tour 2024'
    },
    songCount: 25,
    notes: null
  },
  {
    id: 2,
    date: '2024-09-06',
    year: 2024,
    venueId: 2,
    tourId: 1,
    venue: {
      id: 2,
      name: 'The Gorge Amphitheatre',
      city: 'George',
      state: 'WA',
      country: 'USA'
    },
    tour: {
      id: 1,
      name: 'Summer Tour 2024'
    },
    songCount: 28,
    notes: null
  }
];

const mockSetlistEntries = [
  {
    id: 1,
    showId: 1,
    songId: 1,
    position: 1,
    set: 1,
    year: 2024,
    isOpener: true,
    isCloser: false,
    isEncore: false,
    segue: null,
    notes: null
  },
  {
    id: 2,
    showId: 1,
    songId: 2,
    position: 2,
    set: 1,
    year: 2024,
    isOpener: false,
    isCloser: false,
    isEncore: false,
    segue: '>',
    notes: null
  }
];

const mockTours = [
  {
    id: 1,
    name: 'Summer Tour 2024',
    year: 2024,
    startDate: '2024-05-17',
    endDate: '2024-09-22',
    totalShows: 45
  }
];

const mockGuests = [
  {
    id: 1,
    name: 'Tim Reynolds',
    slug: 'tim-reynolds',
    instrument: 'Guitar',
    totalAppearances: 500,
    firstAppearance: '1991-01-01',
    lastAppearance: '2024-09-22',
    searchText: 'tim reynolds guitar'
  }
];

// ==================== SONG QUERIES ====================

describe('Song Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.get.mockReturnValue(undefined);
  });

  describe('getAllSongs()', () => {
    it('should return all songs ordered by sortTitle', async () => {
      mockDb.songs.toArray.mockResolvedValueOnce(mockSongs);

      const result = await getAllSongs();

      expect(mockDb.songs.orderBy).toHaveBeenCalledWith('sortTitle');
      expect(mockDb.songs.limit).toHaveBeenCalledWith(2000);
      expect(result).toEqual(mockSongs);
    });

    it('should handle empty result', async () => {
      mockDb.songs.toArray.mockResolvedValueOnce([]);

      const result = await getAllSongs();

      expect(result).toEqual([]);
    });
  });

  describe('getSongBySlug()', () => {
    it('should return song by slug', async () => {
      mockDb.songs.first.mockResolvedValueOnce(mockSongs[0]);

      const result = await getSongBySlug('ants-marching');

      expect(mockDb.songs.where).toHaveBeenCalledWith('slug');
      expect(mockDb.songs.equals).toHaveBeenCalledWith('ants-marching');
      expect(result).toEqual(mockSongs[0]);
    });

    it('should return undefined for non-existent slug', async () => {
      mockDb.songs.first.mockResolvedValueOnce(undefined);

      const result = await getSongBySlug('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getSongById()', () => {
    it('should return song by ID', async () => {
      mockDb.songs.get.mockResolvedValueOnce(mockSongs[0]);

      const result = await getSongById(1);

      expect(mockDb.songs.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSongs[0]);
    });
  });

  describe('getSongStats()', () => {
    it('should return cached stats if available', async () => {
      const cachedStats = { total: 100, covers: 20, originals: 80 };
      mockCache.get.mockReturnValueOnce(cachedStats);

      const result = await getSongStats();

      expect(result).toEqual(cachedStats);
      expect(mockDb.songs.count).not.toHaveBeenCalled();
    });

    it('should compute and cache stats if not cached', async () => {
      mockDb.songs.count.mockResolvedValueOnce(100);
      mockDb.songs.count.mockResolvedValueOnce(20); // covers count from filter

      const result = await getSongStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('covers');
      expect(result).toHaveProperty('originals');
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('getTopSongsByPerformances()', () => {
    it('should return top songs by performance count', async () => {
      mockDb.songs.toArray.mockResolvedValueOnce(mockSongs);

      await getTopSongsByPerformances(10);

      expect(mockDb.songs.orderBy).toHaveBeenCalledWith('totalPerformances');
      expect(mockDb.songs.reverse).toHaveBeenCalled();
      expect(mockDb.songs.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('searchSongs()', () => {
    it('should return empty array for empty query', async () => {
      const result = await searchSongs('');

      expect(result).toEqual([]);
      expect(mockDb.songs.where).not.toHaveBeenCalled();
    });

    it('should search songs by text', async () => {
      mockDb.songs.sortBy.mockResolvedValueOnce(mockSongs);

      await searchSongs('ants');

      expect(mockDb.songs.where).toHaveBeenCalledWith('searchText');
      expect(mockDb.songs.startsWithIgnoreCase).toHaveBeenCalledWith('ants');
    });
  });

  describe('getYearBreakdownForSong()', () => {
    it('should return cached breakdown if available', async () => {
      const cachedBreakdown = [{ year: 2024, count: 10 }];
      mockCache.get.mockReturnValueOnce(cachedBreakdown);

      const result = await getYearBreakdownForSong(1);

      expect(result).toEqual(cachedBreakdown);
    });

    it('should compute and cache breakdown if not cached', async () => {
      mockDb.setlistEntries.toArray.mockResolvedValueOnce([
        { songId: 1, year: 2024 },
        { songId: 1, year: 2024 },
        { songId: 1, year: 2023 }
      ]);

      const result = await getYearBreakdownForSong(1);

      expect(result).toEqual([
        { year: 2024, count: 2 },
        { year: 2023, count: 1 }
      ]);
      expect(mockCache.set).toHaveBeenCalled();
    });
  });
});

// ==================== VENUE QUERIES ====================

describe('Venue Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.get.mockReturnValue(undefined);
  });

  describe('getAllVenues()', () => {
    it('should return all venues ordered by name', async () => {
      mockDb.venues.toArray.mockResolvedValueOnce(mockVenues);

      const result = await getAllVenues();

      expect(mockDb.venues.orderBy).toHaveBeenCalledWith('name');
      expect(result).toEqual(mockVenues);
    });
  });

  describe('getVenueById()', () => {
    it('should return venue by ID', async () => {
      mockDb.venues.get.mockResolvedValueOnce(mockVenues[0]);

      const result = await getVenueById(1);

      expect(mockDb.venues.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockVenues[0]);
    });
  });

  describe('getVenueStats()', () => {
    it('should return venue statistics', async () => {
      const cachedStats = { total: 100, totalShows: 3000 };
      mockCache.get.mockReturnValueOnce(cachedStats);

      const result = await getVenueStats();

      expect(result).toHaveProperty('total');
    });
  });

  describe('searchVenues()', () => {
    it('should return empty array for empty query', async () => {
      const result = await searchVenues('');

      expect(result).toEqual([]);
    });

    it('should search venues by text', async () => {
      mockDb.venues.sortBy.mockResolvedValueOnce(mockVenues);

      await searchVenues('red rocks');

      expect(mockDb.venues.where).toHaveBeenCalledWith('searchText');
    });
  });

  describe('getYearBreakdownForVenue()', () => {
    it('should return cached breakdown if available', async () => {
      const cachedBreakdown = [{ year: 2024, count: 3 }];
      mockCache.get.mockReturnValueOnce(cachedBreakdown);

      const result = await getYearBreakdownForVenue(1);

      expect(result).toEqual(cachedBreakdown);
    });
  });
});

// ==================== SHOW QUERIES ====================

describe('Show Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.get.mockReturnValue(undefined);
  });

  describe('getAllShows()', () => {
    it('should return all shows ordered by date descending', async () => {
      mockDb.shows.toArray.mockResolvedValueOnce(mockShows);

      await getAllShows();

      expect(mockDb.shows.orderBy).toHaveBeenCalledWith('date');
      expect(mockDb.shows.reverse).toHaveBeenCalled();
    });
  });

  describe('getShowById()', () => {
    it('should return show by ID', async () => {
      mockDb.shows.get.mockResolvedValueOnce(mockShows[0]);

      const result = await getShowById(1);

      expect(mockDb.shows.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockShows[0]);
    });
  });

  describe('getRecentShows()', () => {
    it('should return recent shows with limit', async () => {
      mockDb.shows.toArray.mockResolvedValueOnce(mockShows);

      await getRecentShows(10);

      expect(mockDb.shows.limit).toHaveBeenCalledWith(10);
    });
  });
});

// ==================== SETLIST QUERIES ====================

describe('Setlist Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSetlistForShow()', () => {
    it('should return setlist entries using compound index', async () => {
      mockDb.setlistEntries.toArray.mockResolvedValueOnce(mockSetlistEntries);

      await getSetlistForShow(1);

      expect(mockDb.setlistEntries.where).toHaveBeenCalledWith('[showId+position]');
    });
  });

  describe('getShowsForSong()', () => {
    it('should return shows that include a song', async () => {
      mockDb.setlistEntries.toArray.mockResolvedValueOnce(mockSetlistEntries);
      mockDb.shows.bulkGet.mockResolvedValueOnce(mockShows);

      await getShowsForSong(1);

      expect(mockDb.setlistEntries.where).toHaveBeenCalledWith('songId');
    });
  });
});

// ==================== TOUR QUERIES ====================

describe('Tour Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllTours()', () => {
    it('should return all tours ordered by year descending', async () => {
      mockDb.tours.toArray.mockResolvedValueOnce(mockTours);

      await getAllTours();

      expect(mockDb.tours.orderBy).toHaveBeenCalledWith('year');
      expect(mockDb.tours.reverse).toHaveBeenCalled();
    });
  });

  describe('getTourById()', () => {
    it('should return tour by ID', async () => {
      mockDb.tours.get.mockResolvedValueOnce(mockTours[0]);

      const result = await getTourById(1);

      expect(mockDb.tours.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTours[0]);
    });
  });

  describe('getToursGroupedByDecade()', () => {
    it('should group tours by decade', async () => {
      mockDb.tours.toArray.mockResolvedValueOnce(mockTours);

      const result = await getToursGroupedByDecade();

      expect(result).toHaveProperty('2020s');
    });
  });

  describe('getShowsForTour()', () => {
    it('should return shows for a tour', async () => {
      mockDb.shows.toArray.mockResolvedValueOnce(mockShows);

      await getShowsForTour(1);

      expect(mockDb.shows.where).toHaveBeenCalledWith('[tourId+date]');
    });
  });
});

// ==================== GUEST QUERIES ====================

describe('Guest Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.get.mockReturnValue(undefined);
  });

  describe('getAllGuests()', () => {
    it('should return all guests ordered by name', async () => {
      mockDb.guests.toArray.mockResolvedValueOnce(mockGuests);

      await getAllGuests();

      expect(mockDb.guests.orderBy).toHaveBeenCalledWith('name');
    });
  });

  describe('getGuestBySlug()', () => {
    it('should return guest by slug', async () => {
      mockDb.guests.first.mockResolvedValueOnce(mockGuests[0]);

      await getGuestBySlug('tim-reynolds');

      expect(mockDb.guests.where).toHaveBeenCalledWith('slug');
    });
  });

  describe('getGuestById()', () => {
    it('should return guest by ID', async () => {
      mockDb.guests.get.mockResolvedValueOnce(mockGuests[0]);

      const result = await getGuestById(1);

      expect(mockDb.guests.get).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockGuests[0]);
    });
  });

  describe('getAppearancesByGuest()', () => {
    it('should return appearances for a guest', async () => {
      mockDb.guestAppearances.sortBy.mockResolvedValueOnce([]);

      await getAppearancesByGuest(1);

      expect(mockDb.guestAppearances.where).toHaveBeenCalledWith('guestId');
    });
  });

  describe('getYearBreakdownForGuest()', () => {
    it('should return year breakdown for guest appearances', async () => {
      mockDb.guestAppearances.toArray.mockResolvedValueOnce([
        { guestId: 1, showId: 1, year: 2024 },
        { guestId: 1, showId: 2, year: 2024 },
        { guestId: 1, showId: 3, year: 2023 }
      ]);

      const result = await getYearBreakdownForGuest(1);

      expect(result).toEqual([
        { year: 2024, count: 2 },
        { year: 2023, count: 1 }
      ]);
    });
  });

  describe('searchGuests()', () => {
    it('should return empty array for empty query', async () => {
      const result = await searchGuests('');

      expect(result).toEqual([]);
    });
  });
});

// ==================== USER DATA QUERIES ====================

describe('User Data Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasUserAttendedShow()', () => {
    it('should return true if user attended show', async () => {
      mockDb.userAttendedShows.first.mockResolvedValueOnce({ showId: 1 });

      const result = await hasUserAttendedShow(1);

      expect(result).toBe(true);
    });

    it('should return false if user has not attended show', async () => {
      mockDb.userAttendedShows.first.mockResolvedValueOnce(undefined);

      const result = await hasUserAttendedShow(999);

      expect(result).toBe(false);
    });
  });

  describe('hasUserFavoritedSong()', () => {
    it('should check if song is favorited', async () => {
      mockDb.userFavoriteSongs.first.mockResolvedValueOnce({ songId: 1 });

      const result = await hasUserFavoritedSong(1);

      expect(result).toBe(true);
    });

    it('should return false if song is not favorited', async () => {
      mockDb.userFavoriteSongs.first.mockResolvedValueOnce(undefined);

      const result = await hasUserFavoritedSong(999);

      expect(result).toBe(false);
    });
  });
});

// ==================== GLOBAL SEARCH ====================

describe('Global Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('globalSearch()', () => {
    it('should return empty array for empty query', async () => {
      const result = await globalSearch('');

      expect(result).toEqual([]);
    });

    it('should search across multiple entity types', async () => {
      // searchSongs, searchVenues, searchGuests use toArray() not sortBy()
      mockDb.songs.toArray.mockResolvedValueOnce([mockSongs[0]]);
      mockDb.venues.toArray.mockResolvedValueOnce([mockVenues[0]]);
      mockDb.guests.toArray.mockResolvedValueOnce([]);

      const result = await globalSearch('ants');

      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ==================== GLOBAL STATS ====================

describe('Global Stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.get.mockReturnValue(undefined);
  });

  describe('getGlobalStats()', () => {
    it('should return cached stats if available', async () => {
      const cachedStats = {
        totalShows: 3000,
        totalSongs: 300,
        totalVenues: 200,
        totalGuests: 50,
        yearRange: { min: 1991, max: 2024 },
        totalSetlistEntries: 150000
      };
      mockCache.get.mockReturnValueOnce(cachedStats);

      const result = await getGlobalStats();

      expect(result).toEqual(cachedStats);
    });

    it('should compute stats if not cached', async () => {
      mockDb.shows.count.mockResolvedValueOnce(3000);
      mockDb.songs.count.mockResolvedValueOnce(300);
      mockDb.venues.count.mockResolvedValueOnce(200);
      mockDb.guests.count.mockResolvedValueOnce(50);
      mockDb.setlistEntries.count.mockResolvedValueOnce(150000);
      mockDb.shows.first.mockResolvedValueOnce({ year: 2024 });
      mockDb.shows.first.mockResolvedValueOnce({ year: 1991 });

      const result = await getGlobalStats();

      expect(result).toHaveProperty('totalShows');
      expect(result).toHaveProperty('totalSongs');
      expect(result).toHaveProperty('totalVenues');
    });
  });
});

// ==================== PERFORMANCE TESTS ====================

describe('Query Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCache.get.mockReturnValue(undefined);
  });

  it('should cache expensive aggregations', async () => {
    // First call computes
    mockDb.songs.count.mockResolvedValueOnce(100);
    mockDb.songs.count.mockResolvedValueOnce(20);
    await getSongStats();

    // Second call should use cache
    mockCache.get.mockReturnValueOnce({ total: 100, covers: 20, originals: 80 });
    const result = await getSongStats();

    expect(mockCache.get).toHaveBeenCalled();
    expect(result.total).toBe(100);
  });

  it('should limit result sets to prevent memory issues', async () => {
    mockDb.songs.toArray.mockResolvedValueOnce(mockSongs);

    await getAllSongs();

    // Verify limit is applied
    expect(mockDb.songs.limit).toHaveBeenCalledWith(2000);
  });
});

// ==================== EDGE CASES ====================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle null/undefined inputs gracefully', async () => {
    mockDb.songs.first.mockResolvedValueOnce(undefined);
    const result = await getSongBySlug(undefined as unknown as string);
    expect(result).toBeUndefined();
  });

  it('should handle empty search results', async () => {
    mockDb.songs.sortBy.mockResolvedValueOnce([]);
    mockDb.venues.sortBy.mockResolvedValueOnce([]);
    mockDb.guests.sortBy.mockResolvedValueOnce([]);

    const result = await globalSearch('xyznonexistent123');

    expect(result).toEqual([]);
  });

  it('should return empty array when database returns empty', async () => {
    mockDb.songs.toArray.mockResolvedValueOnce([]);

    const result = await getAllSongs();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});
