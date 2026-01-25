/**
 * ============================================================================
 * DMBAlmanac Search Infrastructure
 * ============================================================================
 *
 * Multi-tier search strategy:
 * 1. PostgreSQL pg_trgm for basic fuzzy search
 * 2. Meilisearch for advanced faceted/instant search
 * 3. Optional: Vector embeddings for semantic search
 *
 * This file provides the Meilisearch configuration and integration
 * ============================================================================
 */

import { MeiliSearch, Index, SearchParams, SearchResponse } from 'meilisearch';

// ============================================================================
// MEILISEARCH CONFIGURATION
// ============================================================================

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || '';

// Initialize client
export const meiliClient = new MeiliSearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY
});

// ============================================================================
// INDEX DEFINITIONS
// ============================================================================

export interface MeiliSong {
  id: string;
  title: string;
  slug: string;
  originalArtist: string | null;
  isCover: boolean;
  timesPlayed: number;
  firstPlayedYear: number | null;
  lastPlayedYear: number | null;
  lastPlayedDate: string | null;
  notes: string | null;
  lyrics: string | null;
}

export interface MeiliVenue {
  id: string;
  name: string;
  slug: string;
  city: string;
  stateProvince: string | null;
  country: string;
  venueType: string | null;
  totalShows: number;
  _geo: { lat: number; lng: number } | null;
}

export interface MeiliConcert {
  id: string;
  showDate: string;
  showDateTimestamp: number;  // For sorting/filtering
  year: number;
  month: number;
  slug: string;
  venueName: string;
  venueCity: string;
  venueState: string | null;
  tourName: string | null;
  showType: string;
  songCount: number;
  hasAudio: boolean;
  hasVideo: boolean;
  // Denormalized for search
  songTitles: string[];
  guestNames: string[];
}

export interface MeiliGuest {
  id: string;
  name: string;
  slug: string;
  instrument: string | null;
  totalAppearances: number;
}

// ============================================================================
// INDEX SETUP
// ============================================================================

/**
 * Initialize all Meilisearch indexes with proper settings
 */
export async function initializeMeilisearchIndexes(): Promise<void> {
  console.log('Initializing Meilisearch indexes...');

  // Songs index
  const songsIndex = meiliClient.index('songs');
  await songsIndex.updateSettings({
    searchableAttributes: [
      'title',
      'originalArtist',
      'lyrics',
      'notes'
    ],
    filterableAttributes: [
      'isCover',
      'timesPlayed',
      'firstPlayedYear',
      'lastPlayedYear'
    ],
    sortableAttributes: [
      'title',
      'timesPlayed',
      'lastPlayedDate',
      'firstPlayedYear'
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'timesPlayed:desc'  // Boost frequently played songs
    ],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8
      }
    },
    pagination: {
      maxTotalHits: 1000
    }
  });

  // Venues index
  const venuesIndex = meiliClient.index('venues');
  await venuesIndex.updateSettings({
    searchableAttributes: [
      'name',
      'city',
      'stateProvince',
      'country'
    ],
    filterableAttributes: [
      'stateProvince',
      'country',
      'venueType',
      'totalShows',
      '_geo'
    ],
    sortableAttributes: [
      'name',
      'totalShows',
      '_geoPoint'  // For distance sorting
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'totalShows:desc'
    ]
  });

  // Concerts index
  const concertsIndex = meiliClient.index('concerts');
  await concertsIndex.updateSettings({
    searchableAttributes: [
      'venueName',
      'venueCity',
      'tourName',
      'songTitles',
      'guestNames'
    ],
    filterableAttributes: [
      'year',
      'month',
      'venueState',
      'tourName',
      'showType',
      'hasAudio',
      'hasVideo',
      'showDateTimestamp'
    ],
    sortableAttributes: [
      'showDateTimestamp',
      'songCount'
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness'
    ],
    distinctAttribute: 'id'  // Prevent duplicates
  });

  // Guests index
  const guestsIndex = meiliClient.index('guests');
  await guestsIndex.updateSettings({
    searchableAttributes: [
      'name',
      'instrument'
    ],
    filterableAttributes: [
      'instrument',
      'totalAppearances'
    ],
    sortableAttributes: [
      'name',
      'totalAppearances'
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'totalAppearances:desc'
    ]
  });

  // Unified search index (for global search)
  const unifiedIndex = meiliClient.index('unified');
  await unifiedIndex.updateSettings({
    searchableAttributes: [
      'displayText',
      'searchText'
    ],
    filterableAttributes: [
      'entityType',
      'popularity'
    ],
    sortableAttributes: [
      'popularity'
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'popularity:desc'
    ]
  });

  console.log('Meilisearch indexes initialized');
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

export interface UnifiedSearchResult {
  entityType: 'song' | 'venue' | 'concert' | 'guest';
  entityId: number;
  displayText: string;
  slug: string;
  subtitle?: string;
  popularity: number;
}

/**
 * Global unified search across all entity types
 */
export async function unifiedSearch(
  query: string,
  options: {
    entityTypes?: ('song' | 'venue' | 'concert' | 'guest')[];
    limit?: number;
  } = {}
): Promise<UnifiedSearchResult[]> {
  const { entityTypes, limit = 10 } = options;

  const filter = entityTypes
    ? `entityType IN [${entityTypes.map(t => `"${t}"`).join(', ')}]`
    : undefined;

  const response = await meiliClient.index('unified').search(query, {
    limit,
    filter,
    attributesToRetrieve: ['entityType', 'entityId', 'displayText', 'slug', 'subtitle', 'popularity']
  });

  return response.hits as UnifiedSearchResult[];
}

/**
 * Faceted search for concerts with filters
 */
export interface ConcertSearchOptions {
  query?: string;
  years?: number[];
  states?: string[];
  tours?: string[];
  hasAudio?: boolean;
  hasVideo?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'date_desc' | 'date_asc' | 'songs_desc';
}

export async function searchConcerts(options: ConcertSearchOptions): Promise<{
  hits: MeiliConcert[];
  totalHits: number;
  facets: Record<string, Record<string, number>>;
}> {
  const {
    query = '',
    years,
    states,
    tours,
    hasAudio,
    hasVideo,
    limit = 20,
    offset = 0,
    sortBy = 'date_desc'
  } = options;

  // Build filter array
  const filters: string[] = [];

  if (years?.length) {
    filters.push(`year IN [${years.join(', ')}]`);
  }
  if (states?.length) {
    filters.push(`venueState IN [${states.map(s => `"${s}"`).join(', ')}]`);
  }
  if (tours?.length) {
    filters.push(`tourName IN [${tours.map(t => `"${t}"`).join(', ')}]`);
  }
  if (hasAudio !== undefined) {
    filters.push(`hasAudio = ${hasAudio}`);
  }
  if (hasVideo !== undefined) {
    filters.push(`hasVideo = ${hasVideo}`);
  }

  // Determine sort
  const sort: string[] = [];
  switch (sortBy) {
    case 'date_desc':
      sort.push('showDateTimestamp:desc');
      break;
    case 'date_asc':
      sort.push('showDateTimestamp:asc');
      break;
    case 'songs_desc':
      sort.push('songCount:desc');
      break;
  }

  const response = await meiliClient.index('concerts').search(query, {
    filter: filters.length ? filters.join(' AND ') : undefined,
    sort,
    limit,
    offset,
    facets: ['year', 'venueState', 'tourName', 'showType', 'hasAudio', 'hasVideo']
  });

  return {
    hits: response.hits as MeiliConcert[],
    totalHits: response.estimatedTotalHits || 0,
    facets: (response.facetDistribution || {}) as Record<string, Record<string, number>>
  };
}

/**
 * Search songs with filters
 */
export interface SongSearchOptions {
  query?: string;
  isCover?: boolean;
  minTimesPlayed?: number;
  maxTimesPlayed?: number;
  playedInYear?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'times_played' | 'last_played';
}

export async function searchSongs(options: SongSearchOptions): Promise<{
  hits: MeiliSong[];
  totalHits: number;
  facets: Record<string, Record<string, number>>;
}> {
  const {
    query = '',
    isCover,
    minTimesPlayed,
    maxTimesPlayed,
    playedInYear,
    limit = 20,
    offset = 0,
    sortBy = 'times_played'
  } = options;

  const filters: string[] = [];

  if (isCover !== undefined) {
    filters.push(`isCover = ${isCover}`);
  }
  if (minTimesPlayed !== undefined) {
    filters.push(`timesPlayed >= ${minTimesPlayed}`);
  }
  if (maxTimesPlayed !== undefined) {
    filters.push(`timesPlayed <= ${maxTimesPlayed}`);
  }
  if (playedInYear !== undefined) {
    filters.push(`firstPlayedYear <= ${playedInYear} AND lastPlayedYear >= ${playedInYear}`);
  }

  const sort: string[] = [];
  switch (sortBy) {
    case 'title':
      sort.push('title:asc');
      break;
    case 'times_played':
      sort.push('timesPlayed:desc');
      break;
    case 'last_played':
      sort.push('lastPlayedDate:desc');
      break;
  }

  const response = await meiliClient.index('songs').search(query, {
    filter: filters.length ? filters.join(' AND ') : undefined,
    sort,
    limit,
    offset,
    facets: ['isCover', 'firstPlayedYear', 'lastPlayedYear']
  });

  return {
    hits: response.hits as MeiliSong[],
    totalHits: response.estimatedTotalHits || 0,
    facets: (response.facetDistribution || {}) as Record<string, Record<string, number>>
  };
}

/**
 * Search venues with geo filtering
 */
export interface VenueSearchOptions {
  query?: string;
  states?: string[];
  countries?: string[];
  venueTypes?: string[];
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
  limit?: number;
  offset?: number;
}

export async function searchVenues(options: VenueSearchOptions): Promise<{
  hits: (MeiliVenue & { _geoDistance?: number })[];
  totalHits: number;
  facets: Record<string, Record<string, number>>;
}> {
  const {
    query = '',
    states,
    countries,
    venueTypes,
    nearLat,
    nearLng,
    radiusKm = 160,  // ~100 miles
    limit = 20,
    offset = 0
  } = options;

  const filters: string[] = [];

  if (states?.length) {
    filters.push(`stateProvince IN [${states.map(s => `"${s}"`).join(', ')}]`);
  }
  if (countries?.length) {
    filters.push(`country IN [${countries.map(c => `"${c}"`).join(', ')}]`);
  }
  if (venueTypes?.length) {
    filters.push(`venueType IN [${venueTypes.map(t => `"${t}"`).join(', ')}]`);
  }
  if (nearLat !== undefined && nearLng !== undefined) {
    filters.push(`_geoRadius(${nearLat}, ${nearLng}, ${radiusKm * 1000})`);
  }

  // Sort by distance if geo search, otherwise by total shows
  const sort = nearLat !== undefined && nearLng !== undefined
    ? [`_geoPoint(${nearLat}, ${nearLng}):asc`]
    : ['totalShows:desc'];

  const response = await meiliClient.index('venues').search(query, {
    filter: filters.length ? filters.join(' AND ') : undefined,
    sort,
    limit,
    offset,
    facets: ['stateProvince', 'country', 'venueType']
  });

  return {
    hits: response.hits as (MeiliVenue & { _geoDistance?: number })[],
    totalHits: response.estimatedTotalHits || 0,
    facets: (response.facetDistribution || {}) as Record<string, Record<string, number>>
  };
}

// ============================================================================
// TYPEAHEAD / AUTOCOMPLETE
// ============================================================================

/**
 * Fast typeahead for search input
 */
export async function typeahead(
  query: string,
  options: {
    entityTypes?: ('song' | 'venue' | 'concert' | 'guest')[];
    limit?: number;
  } = {}
): Promise<UnifiedSearchResult[]> {
  if (query.length < 2) return [];

  return unifiedSearch(query, {
    entityTypes: options.entityTypes,
    limit: options.limit || 8
  });
}

/**
 * Song title autocomplete (for setlist entry)
 */
export async function songAutocomplete(
  query: string,
  limit = 10
): Promise<{ id: number; title: string; slug: string; timesPlayed: number }[]> {
  if (query.length < 2) return [];

  const response = await meiliClient.index('songs').search(query, {
    limit,
    attributesToRetrieve: ['id', 'title', 'slug', 'timesPlayed']
  });

  return response.hits.map(hit => ({
    id: parseInt((hit as any).id),
    title: (hit as any).title,
    slug: (hit as any).slug,
    timesPlayed: (hit as any).timesPlayed
  }));
}

// ============================================================================
// INDEX POPULATION
// ============================================================================

/**
 * Populate Meilisearch from PostgreSQL
 */
export async function populateMeilisearchFromPostgres(
  pgClient: any,
  onProgress?: (table: string, current: number, total: number) => void
): Promise<void> {
  // Populate songs
  console.log('Populating songs index...');
  const songs = await pgClient.query(`
    SELECT
      id::text AS id,
      title,
      slug,
      original_artist AS "originalArtist",
      is_cover AS "isCover",
      times_played AS "timesPlayed",
      EXTRACT(YEAR FROM first_played_date)::int AS "firstPlayedYear",
      EXTRACT(YEAR FROM last_played_date)::int AS "lastPlayedYear",
      last_played_date::text AS "lastPlayedDate",
      notes,
      lyrics
    FROM songs
  `);

  await meiliClient.index('songs').addDocuments(songs.rows, { primaryKey: 'id' });
  onProgress?.('songs', songs.rows.length, songs.rows.length);

  // Populate venues
  console.log('Populating venues index...');
  const venues = await pgClient.query(`
    SELECT
      id::text AS id,
      name,
      slug,
      city,
      state_province AS "stateProvince",
      country,
      venue_type AS "venueType",
      total_shows AS "totalShows",
      CASE
        WHEN latitude IS NOT NULL AND longitude IS NOT NULL
        THEN jsonb_build_object('lat', latitude, 'lng', longitude)
        ELSE NULL
      END AS "_geo"
    FROM venues
  `);

  await meiliClient.index('venues').addDocuments(venues.rows, { primaryKey: 'id' });
  onProgress?.('venues', venues.rows.length, venues.rows.length);

  // Populate concerts with denormalized data
  console.log('Populating concerts index...');
  const concerts = await pgClient.query(`
    SELECT
      c.id::text AS id,
      c.show_date::text AS "showDate",
      EXTRACT(EPOCH FROM c.show_date)::bigint AS "showDateTimestamp",
      EXTRACT(YEAR FROM c.show_date)::int AS year,
      EXTRACT(MONTH FROM c.show_date)::int AS month,
      c.slug,
      v.name AS "venueName",
      v.city AS "venueCity",
      v.state_province AS "venueState",
      c.tour_name AS "tourName",
      c.show_type AS "showType",
      c.song_count AS "songCount",
      c.has_audio AS "hasAudio",
      c.has_video AS "hasVideo",
      COALESCE(
        (SELECT array_agg(s.title)
         FROM setlist_entries se
         JOIN songs s ON s.id = se.song_id
         WHERE se.concert_id = c.id),
        ARRAY[]::text[]
      ) AS "songTitles",
      COALESCE(
        (SELECT array_agg(DISTINCT g.name)
         FROM guest_appearances ga
         JOIN guests g ON g.id = ga.guest_id
         WHERE ga.concert_id = c.id),
        ARRAY[]::text[]
      ) AS "guestNames"
    FROM concerts c
    JOIN venues v ON v.id = c.venue_id
  `);

  await meiliClient.index('concerts').addDocuments(concerts.rows, { primaryKey: 'id' });
  onProgress?.('concerts', concerts.rows.length, concerts.rows.length);

  // Populate guests
  console.log('Populating guests index...');
  const guests = await pgClient.query(`
    SELECT
      id::text AS id,
      name,
      slug,
      instrument,
      total_appearances AS "totalAppearances"
    FROM guests
  `);

  await meiliClient.index('guests').addDocuments(guests.rows, { primaryKey: 'id' });
  onProgress?.('guests', guests.rows.length, guests.rows.length);

  // Populate unified index
  console.log('Populating unified search index...');
  const unified = [
    ...songs.rows.map((s: any) => ({
      id: `song-${s.id}`,
      entityType: 'song',
      entityId: parseInt(s.id),
      displayText: s.title,
      searchText: `${s.title} ${s.originalArtist || ''}`.toLowerCase(),
      slug: s.slug,
      subtitle: s.isCover ? `Cover of ${s.originalArtist}` : 'Original',
      popularity: s.timesPlayed
    })),
    ...venues.rows.map((v: any) => ({
      id: `venue-${v.id}`,
      entityType: 'venue',
      entityId: parseInt(v.id),
      displayText: v.name,
      searchText: `${v.name} ${v.city} ${v.stateProvince || ''}`.toLowerCase(),
      slug: v.slug,
      subtitle: `${v.city}, ${v.stateProvince || v.country}`,
      popularity: v.totalShows
    })),
    ...guests.rows.map((g: any) => ({
      id: `guest-${g.id}`,
      entityType: 'guest',
      entityId: parseInt(g.id),
      displayText: g.name,
      searchText: `${g.name} ${g.instrument || ''}`.toLowerCase(),
      slug: g.slug,
      subtitle: g.instrument,
      popularity: g.totalAppearances
    }))
  ];

  await meiliClient.index('unified').addDocuments(unified, { primaryKey: 'id' });
  onProgress?.('unified', unified.length, unified.length);

  console.log('Meilisearch population complete');
}

// ============================================================================
// SEMANTIC SEARCH (OPTIONAL - with embeddings)
// ============================================================================

/**
 * Example: Semantic search using embeddings
 *
 * This would require:
 * 1. A vector database (Pinecone, Weaviate, pgvector)
 * 2. An embedding model (OpenAI, Cohere, or open-source)
 */
export interface SemanticSearchConfig {
  embeddingModel: 'openai' | 'cohere' | 'sentence-transformers';
  vectorDB: 'pgvector' | 'pinecone' | 'weaviate';
}

export const semanticSearchExample = `
// Example with pgvector and OpenAI embeddings

import { OpenAI } from 'openai';

const openai = new OpenAI();

// Generate embedding for query
async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  return response.data[0].embedding;
}

// Search with embeddings in PostgreSQL (requires pgvector extension)
async function semanticSongSearch(query: string, limit = 10) {
  const embedding = await getQueryEmbedding(query);

  const result = await pgClient.query(\`
    SELECT
      id,
      title,
      slug,
      1 - (embedding <=> $1::vector) AS similarity
    FROM songs
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $2
  \`, [JSON.stringify(embedding), limit]);

  return result.rows;
}

// Hybrid search: combine keyword + semantic
async function hybridSearch(query: string, limit = 10) {
  const [keywordResults, semanticResults] = await Promise.all([
    searchSongs({ query, limit }),
    semanticSongSearch(query, limit)
  ]);

  // Reciprocal Rank Fusion to combine results
  const scores = new Map<number, number>();

  keywordResults.hits.forEach((hit, rank) => {
    const id = parseInt(hit.id);
    scores.set(id, (scores.get(id) || 0) + 1 / (rank + 60));
  });

  semanticResults.forEach((result, rank) => {
    scores.set(result.id, (scores.get(result.id) || 0) + 1 / (rank + 60));
  });

  // Sort by combined score
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score }));
}
`;

// ============================================================================
// NATURAL LANGUAGE QUERY PARSING
// ============================================================================

/**
 * Parse natural language queries into structured search
 */
export interface ParsedQuery {
  type: 'song' | 'concert' | 'venue' | 'guest' | 'general';
  keywords: string[];
  filters: {
    year?: number;
    years?: number[];
    state?: string;
    venue?: string;
    song?: string;
    guest?: string;
    hasAudio?: boolean;
  };
  intent: 'search' | 'stats' | 'history' | 'comparison';
}

export function parseNaturalLanguageQuery(query: string): ParsedQuery {
  const normalized = query.toLowerCase().trim();

  const result: ParsedQuery = {
    type: 'general',
    keywords: [],
    filters: {},
    intent: 'search'
  };

  // Detect year patterns
  const yearMatch = normalized.match(/\b(19[89]\d|20[0-2]\d)\b/g);
  if (yearMatch) {
    result.filters.years = yearMatch.map(y => parseInt(y));
  }

  // Detect state patterns
  const stateMatch = normalized.match(/\bin\s+(virginia|colorado|new york|california|georgia|massachusetts|north carolina|new jersey|pennsylvania|texas|washington|oregon|illinois|ohio|michigan|florida|maryland|wisconsin|minnesota|tennessee|arizona|nevada|connecticut|alabama|missouri|indiana|south carolina|kentucky|louisiana)/i);
  if (stateMatch) {
    result.filters.state = stateMatch[1];
  }

  // Detect intent
  if (/how many|count|total|statistics|stats/i.test(normalized)) {
    result.intent = 'stats';
  } else if (/history|all times?|every time/i.test(normalized)) {
    result.intent = 'history';
  } else if (/vs|versus|compare|compared to/i.test(normalized)) {
    result.intent = 'comparison';
  }

  // Detect entity type
  if (/songs?|played|performed|setlist/i.test(normalized)) {
    result.type = 'song';
  } else if (/shows?|concerts?|dates?/i.test(normalized)) {
    result.type = 'concert';
  } else if (/venues?|where|location|played at/i.test(normalized)) {
    result.type = 'venue';
  } else if (/guests?|sat in|joined|with/i.test(normalized)) {
    result.type = 'guest';
  }

  // Detect audio/video filter
  if (/with (audio|recording)/i.test(normalized)) {
    result.filters.hasAudio = true;
  }

  // Extract remaining keywords (remove stopwords and detected patterns)
  const stopwords = new Set(['the', 'a', 'an', 'in', 'at', 'on', 'of', 'to', 'for', 'with', 'and', 'or', 'but', 'is', 'was', 'are', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'how', 'many', 'times', 'what', 'when', 'where', 'who', 'which']);

  result.keywords = normalized
    .replace(/\b(19[89]\d|20[0-2]\d)\b/g, '')
    .replace(/\b(virginia|colorado|new york|california|georgia|massachusetts|north carolina|new jersey|pennsylvania|texas|washington|oregon|illinois|ohio|michigan|florida|maryland|wisconsin|minnesota|tennessee|arizona|nevada|connecticut|alabama|missouri|indiana|south carolina|kentucky|louisiana)\b/gi, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word));

  return result;
}

/**
 * Execute a parsed natural language query
 */
export async function executeNaturalLanguageQuery(query: string): Promise<any> {
  const parsed = parseNaturalLanguageQuery(query);
  const keywordQuery = parsed.keywords.join(' ');

  switch (parsed.type) {
    case 'song':
      return searchSongs({
        query: keywordQuery,
        limit: 20
      });

    case 'concert':
      return searchConcerts({
        query: keywordQuery,
        years: parsed.filters.years,
        states: parsed.filters.state ? [parsed.filters.state] : undefined,
        hasAudio: parsed.filters.hasAudio,
        limit: 20
      });

    case 'venue':
      return searchVenues({
        query: keywordQuery,
        states: parsed.filters.state ? [parsed.filters.state] : undefined,
        limit: 20
      });

    default:
      return unifiedSearch(keywordQuery, { limit: 20 });
  }
}
