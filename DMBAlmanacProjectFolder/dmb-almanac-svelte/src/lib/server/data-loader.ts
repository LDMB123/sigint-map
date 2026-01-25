/**
 * Server-Side Data Loader for SSR
 *
 * This module provides server-side data loading from static JSON files
 * for SSR (Server-Side Rendering). The data is loaded once and cached
 * in memory for subsequent requests.
 *
 * Architecture:
 * - Static JSON files in /static/data/ are read at server startup
 * - Data is cached in memory with lazy loading
 * - Cache headers are added to responses for CDN/browser caching
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  DexieShow,
  DexieSong,
  DexieVenue,
  DexieTour,
  DexieGuest,
  DexieLiberationEntry
} from '$db/dexie/schema';

// ============================================================
// CACHE MANAGEMENT
// ============================================================

interface DataCache {
  shows: DexieShow[] | null;
  songs: DexieSong[] | null;
  venues: DexieVenue[] | null;
  tours: DexieTour[] | null;
  guests: DexieGuest[] | null;
  liberationList: DexieLiberationEntry[] | null;
  loadedAt: number | null;
}

const cache: DataCache = {
  shows: null,
  songs: null,
  venues: null,
  tours: null,
  guests: null,
  liberationList: null,
  loadedAt: null
};

// Cache TTL: 1 hour (data is static, but allows for updates)
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Determine the correct data directory path
 * Works in both development and production builds
 */
function getDataPath(): string {
  // In production build, static files are in build/client/data
  // In development, they're in static/data
  const possiblePaths = [
    join(process.cwd(), 'static', 'data'),
    join(process.cwd(), 'build', 'client', 'data'),
    join(process.cwd(), '.svelte-kit', 'output', 'client', 'data')
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Default to static/data
  return join(process.cwd(), 'static', 'data');
}

/**
 * Load JSON file from the data directory
 */
function loadJsonFile<T>(filename: string): T {
  const dataPath = getDataPath();
  const filePath = join(dataPath, filename);

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`[SSR Data Loader] Failed to load ${filename}:`, error);
    throw new Error(`Failed to load data file: ${filename}`);
  }
}

/**
 * Check if cache is valid (not expired)
 */
function isCacheValid(): boolean {
  if (!cache.loadedAt) return false;
  return Date.now() - cache.loadedAt < CACHE_TTL;
}

// ============================================================
// DATA LOADING FUNCTIONS
// ============================================================

/**
 * Load all shows from JSON
 */
export function getShows(): DexieShow[] {
  if (!cache.shows || !isCacheValid()) {
    cache.shows = loadJsonFile<DexieShow[]>('shows.json');
    cache.loadedAt = Date.now();
  }
  return cache.shows;
}

/**
 * Load all songs from JSON
 */
export function getSongs(): DexieSong[] {
  if (!cache.songs || !isCacheValid()) {
    cache.songs = loadJsonFile<DexieSong[]>('songs.json');
    cache.loadedAt = Date.now();
  }
  return cache.songs;
}

/**
 * Load all venues from JSON
 */
export function getVenues(): DexieVenue[] {
  if (!cache.venues || !isCacheValid()) {
    cache.venues = loadJsonFile<DexieVenue[]>('venues.json');
    cache.loadedAt = Date.now();
  }
  return cache.venues;
}

/**
 * Load all tours from JSON
 */
export function getTours(): DexieTour[] {
  if (!cache.tours || !isCacheValid()) {
    cache.tours = loadJsonFile<DexieTour[]>('tours.json');
    cache.loadedAt = Date.now();
  }
  return cache.tours;
}

/**
 * Load all guests from JSON
 */
export function getGuests(): DexieGuest[] {
  if (!cache.guests || !isCacheValid()) {
    cache.guests = loadJsonFile<DexieGuest[]>('guests.json');
    cache.loadedAt = Date.now();
  }
  return cache.guests;
}

/**
 * Load liberation list from JSON
 */
export function getLiberationList(): DexieLiberationEntry[] {
  if (!cache.liberationList || !isCacheValid()) {
    cache.liberationList = loadJsonFile<DexieLiberationEntry[]>('liberation-list.json');
    cache.loadedAt = Date.now();
  }
  return cache.liberationList;
}

// ============================================================
// DERIVED DATA FUNCTIONS
// ============================================================

/**
 * Get global statistics for homepage
 */
export function getGlobalStats() {
  const shows = getShows();
  const songs = getSongs();
  const venues = getVenues();
  const tours = getTours();
  const guests = getGuests();

  // PERF: Use loop instead of Math.min/max(...spread) to avoid stack overflow on large arrays
  let firstYear = Infinity;
  let lastYear = -Infinity;
  for (const t of tours) {
    if (t.year < firstYear) firstYear = t.year;
    if (t.year > lastYear) lastYear = t.year;
  }

  return {
    totalSongs: songs.length,
    totalShows: shows.length,
    totalVenues: venues.length,
    totalGuests: guests.length,
    yearsActive: lastYear - firstYear + 1,
    firstYear,
    lastYear
  };
}

/**
 * Get recent shows (sorted by date, newest first)
 */
export function getRecentShows(limit = 5): DexieShow[] {
  const shows = getShows();
  return [...shows]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/**
 * Get song statistics
 * PERF: Single-pass counting instead of filter().length
 */
export function getSongStats() {
  const songs = getSongs();
  const total = songs.length;
  let covers = 0;
  for (const s of songs) {
    if (s.isCover) covers++;
  }

  return {
    total,
    originals: total - covers,
    covers
  };
}

/**
 * Get venue statistics
 */
export function getVenueStats() {
  const venues = getVenues();
  const total = venues.length;
  const totalShows = venues.reduce((sum, v) => sum + (v.totalShows || 0), 0);
  const states = new Set(venues.map((v) => v.state).filter(Boolean)).size;

  return {
    total,
    totalShows,
    states
  };
}

/**
 * Get top venues by show count
 */
export function getTopVenues(limit = 5): DexieVenue[] {
  const venues = getVenues();
  return [...venues]
    .sort((a, b) => (b.totalShows || 0) - (a.totalShows || 0))
    .slice(0, limit);
}

/**
 * Get tours grouped by decade
 */
export function getToursGroupedByDecade(): Record<string, DexieTour[]> {
  const tours = getTours();
  const grouped: Record<string, DexieTour[]> = {};

  // Sort by year descending first
  const sortedTours = [...tours].sort((a, b) => b.year - a.year);

  for (const tour of sortedTours) {
    const decadeStart = Math.floor(tour.year / 10) * 10;
    const decadeLabel = `${decadeStart}s`;

    if (!grouped[decadeLabel]) {
      grouped[decadeLabel] = [];
    }
    grouped[decadeLabel].push(tour);
  }

  return grouped;
}

/**
 * Get liberation list statistics
 */
export function getLiberationStats() {
  const list = getLiberationList();
  const nonLiberated = list.filter((e) => !e.isLiberated);

  if (nonLiberated.length === 0) {
    return {
      count: 0,
      longestWait: 0,
      mostShowsMissed: 0
    };
  }

  // PERF: Use loop instead of Math.max(...spread) to avoid stack overflow on large arrays
  let longestWait = 0;
  let mostShowsMissed = 0;
  for (const s of nonLiberated) {
    if (s.daysSince > longestWait) longestWait = s.daysSince;
    if (s.showsSince > mostShowsMissed) mostShowsMissed = s.showsSince;
  }

  return {
    count: nonLiberated.length,
    longestWait,
    mostShowsMissed
  };
}

/**
 * Clear the cache (useful for testing or force refresh)
 */
export function clearCache(): void {
  cache.shows = null;
  cache.songs = null;
  cache.venues = null;
  cache.tours = null;
  cache.guests = null;
  cache.liberationList = null;
  cache.loadedAt = null;
}
