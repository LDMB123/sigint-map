/**
 * ============================================================================
 * DMBAlmanac Example API Routes (Next.js App Router)
 * ============================================================================
 *
 * Example implementations showing how to use the database architecture
 * with proper caching, pagination, and error handling.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { z } from 'zod';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper for running queries
async function query<T>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// ============================================================================
// CONCERTS API
// ============================================================================

// GET /api/concerts
// Paginated concert list with optional filters
const concertListSchema = z.object({
  year: z.coerce.number().optional(),
  venue: z.string().optional(),
  tour: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function getConcerts(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = concertListSchema.parse(searchParams);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (params.year) {
    conditions.push(`EXTRACT(YEAR FROM c.show_date) = $${paramIndex++}`);
    values.push(params.year);
  }

  if (params.venue) {
    conditions.push(`v.slug = $${paramIndex++}`);
    values.push(params.venue);
  }

  if (params.tour) {
    conditions.push(`c.tour_name = $${paramIndex++}`);
    values.push(params.tour);
  }

  // Keyset pagination
  if (params.cursor) {
    conditions.push(`c.show_date < $${paramIndex++}`);
    values.push(params.cursor);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `
    SELECT
      c.id,
      c.show_date,
      c.slug,
      c.tour_name,
      c.song_count,
      c.has_audio,
      c.has_video,
      jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'city', v.city,
        'state', v.state_province,
        'slug', v.slug
      ) AS venue
    FROM concerts c
    JOIN venues v ON v.id = c.venue_id
    ${whereClause}
    ORDER BY c.show_date DESC
    LIMIT $${paramIndex}
  `;

  values.push(params.limit + 1); // Fetch one extra to check for more

  const concerts = await query(sql, values);

  const hasMore = concerts.length > params.limit;
  const items = hasMore ? concerts.slice(0, -1) : concerts;
  const nextCursor = hasMore ? items[items.length - 1].show_date : null;

  return NextResponse.json({
    items,
    hasMore,
    nextCursor,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    }
  });
}

// GET /api/concerts/[slug]
// Single concert with full setlist
export async function getConcertBySlug(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  // Get concert with venue
  const [concert] = await query(`
    SELECT
      c.*,
      jsonb_build_object(
        'id', v.id,
        'name', v.name,
        'city', v.city,
        'state', v.state_province,
        'country', v.country,
        'latitude', v.latitude,
        'longitude', v.longitude,
        'slug', v.slug
      ) AS venue
    FROM concerts c
    JOIN venues v ON v.id = c.venue_id
    WHERE c.slug = $1
  `, [slug]);

  if (!concert) {
    return NextResponse.json(
      { error: 'Concert not found' },
      { status: 404 }
    );
  }

  // Get setlist with song details and guests
  const setlist = await query(`
    SELECT
      se.id,
      se.set_number,
      se.position,
      se.is_opener,
      se.is_closer,
      se.is_segue_from_previous AS is_segue,
      se.is_tease,
      se.is_bustout,
      se.shows_since_last_played AS gap,
      se.duration_seconds,
      se.notes,
      jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'slug', s.slug,
        'is_cover', s.is_cover,
        'original_artist', s.original_artist
      ) AS song,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
          'id', g.id,
          'name', g.name,
          'instrument', ga.instrument
        ))
        FROM guest_appearances ga
        JOIN guests g ON g.id = ga.guest_id
        WHERE ga.setlist_entry_id = se.id),
        '[]'::jsonb
      ) AS guests
    FROM setlist_entries se
    JOIN songs s ON s.id = se.song_id
    WHERE se.concert_id = $1
    ORDER BY se.set_number, se.position
  `, [concert.id]);

  // Get concert-level guests (not tied to specific songs)
  const concertGuests = await query(`
    SELECT DISTINCT
      g.id,
      g.name,
      g.slug,
      ga.instrument
    FROM guest_appearances ga
    JOIN guests g ON g.id = ga.guest_id
    WHERE ga.concert_id = $1 AND ga.setlist_entry_id IS NULL
  `, [concert.id]);

  return NextResponse.json({
    ...concert,
    setlist,
    guests: concertGuests,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    }
  });
}

// ============================================================================
// SONGS API
// ============================================================================

// GET /api/songs/[slug]
// Song detail with statistics
export async function getSongBySlug(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const [song] = await query(`
    SELECT
      s.id,
      s.title,
      s.slug,
      s.original_artist,
      s.is_cover,
      s.notes,
      s.lyrics,
      ms.times_played,
      ms.first_played,
      ms.last_played,
      ms.unique_venues,
      ms.years_played,
      ms.times_opened,
      ms.times_closed,
      ms.times_in_encore,
      ms.avg_position,
      ms.bustout_count,
      ms.max_gap,
      ms.avg_duration_seconds
    FROM songs s
    JOIN mv_song_statistics ms ON ms.song_id = s.id
    WHERE s.slug = $1
  `, [slug]);

  if (!song) {
    return NextResponse.json(
      { error: 'Song not found' },
      { status: 404 }
    );
  }

  // Get recent performances
  const recentPerformances = await query(`
    SELECT
      c.id AS concert_id,
      c.show_date,
      c.slug AS concert_slug,
      v.name AS venue_name,
      v.city AS venue_city,
      se.set_number,
      se.position,
      se.is_bustout,
      se.shows_since_last_played AS gap
    FROM setlist_entries se
    JOIN concerts c ON c.id = se.concert_id
    JOIN venues v ON v.id = c.venue_id
    WHERE se.song_id = $1
    ORDER BY c.show_date DESC
    LIMIT 10
  `, [song.id]);

  // Get "also played with" songs
  const playedWith = await query(`
    SELECT
      s.id,
      s.title,
      s.slug,
      mp.co_occurrence_count,
      ROUND(mp.co_occurrence_count::decimal / $2 * 100, 1) AS percentage
    FROM mv_song_pairs mp
    JOIN songs s ON s.id = CASE
      WHEN mp.song_a_id = $1 THEN mp.song_b_id
      ELSE mp.song_a_id
    END
    WHERE mp.song_a_id = $1 OR mp.song_b_id = $1
    ORDER BY mp.co_occurrence_count DESC
    LIMIT 10
  `, [song.id, song.times_played]);

  return NextResponse.json({
    ...song,
    recentPerformances,
    playedWith,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    }
  });
}

// GET /api/songs/[slug]/history
// Paginated song performance history
export async function getSongHistory(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const cursor = searchParams.cursor;
  const limit = Math.min(parseInt(searchParams.limit || '50'), 100);

  // Get song ID
  const [song] = await query<{ id: number }>(
    'SELECT id FROM songs WHERE slug = $1',
    [slug]
  );

  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  const cursorCondition = cursor
    ? 'AND c.show_date < $3'
    : '';

  const values = cursor
    ? [song.id, limit + 1, cursor]
    : [song.id, limit + 1];

  const history = await query(`
    SELECT
      c.id AS concert_id,
      c.show_date,
      c.slug AS concert_slug,
      v.name AS venue_name,
      v.city,
      v.state_province,
      v.slug AS venue_slug,
      se.set_number,
      se.position,
      se.is_opener,
      se.is_closer,
      se.is_bustout,
      se.shows_since_last_played AS gap,
      se.notes
    FROM setlist_entries se
    JOIN concerts c ON c.id = se.concert_id
    JOIN venues v ON v.id = c.venue_id
    WHERE se.song_id = $1
    ${cursorCondition}
    ORDER BY c.show_date DESC
    LIMIT $2
  `, values);

  const hasMore = history.length > limit;
  const items = hasMore ? history.slice(0, -1) : history;
  const nextCursor = hasMore ? items[items.length - 1].show_date : null;

  return NextResponse.json({
    items,
    hasMore,
    nextCursor,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    }
  });
}

// ============================================================================
// VENUES API
// ============================================================================

// GET /api/venues/nearby
// Find venues near a location
const nearbyVenuesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(500).default(100), // miles
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function getNearbyVenues(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const params = nearbyVenuesSchema.parse(searchParams);

  const radiusMeters = params.radius * 1609.34;

  const venues = await query(`
    SELECT
      v.id,
      v.name,
      v.city,
      v.state_province,
      v.country,
      v.slug,
      v.venue_type,
      v.total_shows,
      v.latitude,
      v.longitude,
      ROUND((ST_Distance(
        v.location,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
      ) / 1609.34)::numeric, 1) AS distance_miles
    FROM venues v
    WHERE v.location IS NOT NULL
      AND ST_DWithin(
        v.location,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
    ORDER BY distance_miles
    LIMIT $4
  `, [params.lat, params.lng, radiusMeters, params.limit]);

  return NextResponse.json({ venues });
}

// ============================================================================
// SEARCH API
// ============================================================================

// GET /api/search/typeahead
// Fast typeahead search
export async function typeaheadSearch(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || '';
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get('limit') || '10'),
    20
  );

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const normalized = q.toLowerCase();

  const results = await query(`
    WITH song_matches AS (
      SELECT
        'song' AS entity_type,
        id AS entity_id,
        title AS display_text,
        slug,
        times_played AS popularity,
        similarity(title_normalized, $1) AS sim_score
      FROM songs
      WHERE title_normalized % $1
      ORDER BY sim_score DESC, times_played DESC
      LIMIT $2
    ),
    venue_matches AS (
      SELECT
        'venue' AS entity_type,
        id AS entity_id,
        name || ', ' || city AS display_text,
        slug,
        total_shows AS popularity,
        similarity(name_normalized, $1) AS sim_score
      FROM venues
      WHERE name_normalized % $1
      ORDER BY sim_score DESC, total_shows DESC
      LIMIT $2
    ),
    guest_matches AS (
      SELECT
        'guest' AS entity_type,
        id AS entity_id,
        name AS display_text,
        slug,
        total_appearances AS popularity,
        similarity(name_normalized, $1) AS sim_score
      FROM guests
      WHERE name_normalized % $1
      ORDER BY sim_score DESC, total_appearances DESC
      LIMIT $2
    )
    SELECT * FROM song_matches
    UNION ALL SELECT * FROM venue_matches
    UNION ALL SELECT * FROM guest_matches
    ORDER BY sim_score DESC, popularity DESC
    LIMIT $2
  `, [normalized, limit]);

  return NextResponse.json({ results }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    }
  });
}

// ============================================================================
// STATISTICS API
// ============================================================================

// GET /api/stats/dashboard
// Dashboard statistics (heavily cached)
export async function getDashboardStats(request: NextRequest) {
  const [stats] = await query(`
    SELECT
      (SELECT COUNT(*) FROM concerts) AS total_concerts,
      (SELECT COUNT(*) FROM songs WHERE times_played > 0) AS total_songs_played,
      (SELECT COUNT(*) FROM songs) AS total_songs,
      (SELECT COUNT(*) FROM venues WHERE total_shows > 0) AS total_venues,
      (SELECT COUNT(*) FROM guests) AS total_guests,
      (SELECT MIN(show_date) FROM concerts) AS first_show,
      (SELECT MAX(show_date) FROM concerts) AS last_show,
      (SELECT COUNT(*) FROM concerts WHERE has_audio) AS shows_with_audio
  `);

  const yearlyStats = await query(`
    SELECT year, total_shows, unique_songs, avg_songs_per_show
    FROM mv_yearly_statistics
    ORDER BY year DESC
    LIMIT 10
  `);

  const topSongs = await query(`
    SELECT song_id, title, slug, times_played, last_played
    FROM mv_song_statistics
    ORDER BY times_played DESC
    LIMIT 10
  `);

  return NextResponse.json({
    overview: stats,
    yearlyStats,
    topSongs,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
    }
  });
}

// ============================================================================
// USER API
// ============================================================================

// POST /api/user/attendance
// Track show attendance
const attendanceSchema = z.object({
  concertId: z.number(),
  attended: z.boolean().default(true),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

export async function trackAttendance(request: NextRequest) {
  // Get user from auth (implementation depends on your auth system)
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const data = attendanceSchema.parse(body);

  const [result] = await query(`
    INSERT INTO user_concert_attendance (user_id, concert_id, attended, rating, notes)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, concert_id)
    DO UPDATE SET
      attended = EXCLUDED.attended,
      rating = EXCLUDED.rating,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id, concert_id, attended, rating, notes
  `, [userId, data.concertId, data.attended, data.rating, data.notes]);

  // Update user's show count
  await query(`
    UPDATE users SET
      shows_attended = (
        SELECT COUNT(*) FROM user_concert_attendance
        WHERE user_id = $1 AND attended = true
      ),
      updated_at = NOW()
    WHERE id = $1
  `, [userId]);

  return NextResponse.json(result);
}

// GET /api/user/stats
// User's personal statistics
export async function getUserStats(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stats] = await query(`
    SELECT
      u.shows_attended,
      u.favorite_songs_count,
      (
        SELECT COUNT(DISTINCT c.venue_id)
        FROM user_concert_attendance uca
        JOIN concerts c ON c.id = uca.concert_id
        WHERE uca.user_id = $1 AND uca.attended = true
      ) AS unique_venues,
      (
        SELECT COUNT(DISTINCT se.song_id)
        FROM user_concert_attendance uca
        JOIN setlist_entries se ON se.concert_id = uca.concert_id
        WHERE uca.user_id = $1 AND uca.attended = true
      ) AS unique_songs_seen,
      (
        SELECT jsonb_object_agg(
          EXTRACT(YEAR FROM c.show_date)::text,
          year_count
        )
        FROM (
          SELECT
            EXTRACT(YEAR FROM c.show_date) AS year,
            COUNT(*) AS year_count
          FROM user_concert_attendance uca
          JOIN concerts c ON c.id = uca.concert_id
          WHERE uca.user_id = $1 AND uca.attended = true
          GROUP BY EXTRACT(YEAR FROM c.show_date)
        ) yearly
        JOIN concerts c ON EXTRACT(YEAR FROM c.show_date) = yearly.year
      ) AS shows_by_year
    FROM users u
    WHERE u.id = $1
  `, [userId]);

  return NextResponse.json(stats);
}

// ============================================================================
// SYNC API (for PWA client)
// ============================================================================

// GET /api/sync/[table]
// Incremental sync endpoint for client database
export async function syncTable(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  const { table } = params;
  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const since = parseInt(searchParams.since || '0');
  const cursor = searchParams.cursor;
  const limit = Math.min(parseInt(searchParams.limit || '1000'), 5000);

  const sinceDate = new Date(since).toISOString();

  // Table-specific queries
  let sql: string;
  let values: any[];

  switch (table) {
    case 'songs':
      sql = `
        SELECT
          id, uuid, title, title_normalized, slug,
          original_artist, is_cover, times_played,
          first_played_date, last_played_date, notes
        FROM songs
        WHERE updated_at > $1
          AND ($2::integer IS NULL OR id > $2)
        ORDER BY id
        LIMIT $3
      `;
      values = [sinceDate, cursor ? parseInt(cursor) : null, limit];
      break;

    case 'concerts':
      sql = `
        SELECT
          c.id, c.uuid, c.show_date, c.slug, c.venue_id,
          c.tour_name, c.show_type, c.song_count,
          c.has_audio, c.has_video, c.notes,
          v.name AS venue_name, v.city AS venue_city,
          v.state_province AS venue_state
        FROM concerts c
        JOIN venues v ON v.id = c.venue_id
        WHERE c.updated_at > $1
          AND ($2::integer IS NULL OR c.id > $2)
        ORDER BY c.id
        LIMIT $3
      `;
      values = [sinceDate, cursor ? parseInt(cursor) : null, limit];
      break;

    case 'setlistEntries':
      sql = `
        SELECT
          se.id, se.uuid, se.concert_id, se.song_id,
          se.set_number, se.position, se.is_opener, se.is_closer,
          se.is_segue_from_previous, se.is_tease, se.is_bustout,
          se.shows_since_last_played, se.duration_seconds, se.notes,
          s.title AS song_title, s.slug AS song_slug
        FROM setlist_entries se
        JOIN songs s ON s.id = se.song_id
        WHERE se.created_at > $1
          AND ($2::integer IS NULL OR se.id > $2)
        ORDER BY se.id
        LIMIT $3
      `;
      values = [sinceDate, cursor ? parseInt(cursor) : null, limit];
      break;

    // Add other tables...
    default:
      return NextResponse.json(
        { error: `Unknown table: ${table}` },
        { status: 400 }
      );
  }

  const data = await query(sql, values);

  // Get total count for progress
  const [countResult] = await query<{ count: string }>(
    `SELECT COUNT(*) FROM ${table} WHERE updated_at > $1`,
    [sinceDate]
  );

  const totalCount = parseInt(countResult.count);
  const hasMore = data.length === limit;
  const nextCursor = hasMore ? (data[data.length - 1] as any).id.toString() : undefined;

  return NextResponse.json({
    data,
    serverVersion: process.env.DATA_VERSION || '1.0.0',
    totalCount,
    hasMore,
    nextCursor,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  // Implement based on your auth system
  // Example with JWT:
  // const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  // const decoded = verifyToken(token);
  // return decoded?.userId;
  return null;
}
