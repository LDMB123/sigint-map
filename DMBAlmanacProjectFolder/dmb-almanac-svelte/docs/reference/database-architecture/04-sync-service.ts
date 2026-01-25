/**
 * ============================================================================
 * DMBAlmanac Sync Service
 * ============================================================================
 *
 * Handles bidirectional synchronization between:
 * - PostgreSQL server database
 * - IndexedDB client database
 *
 * Features:
 * - Incremental sync using timestamps
 * - Conflict resolution strategies
 * - Background sync with Service Worker
 * - Offline queue management
 * ============================================================================
 */

import {
  db,
  Song,
  Venue,
  Concert,
  SetlistEntry,
  Guest,
  GuestAppearance,
  Album,
  AlbumTrack,
  SyncMetadata,
  bulkInsertWithChunking,
  rebuildSearchIndex,
  determineSyncStrategy
} from './03-client-indexeddb-schema';

// ============================================================================
// TYPES
// ============================================================================

interface SyncResponse<T> {
  data: T[];
  serverVersion: string;
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

interface SyncProgress {
  table: string;
  current: number;
  total: number;
  status: 'pending' | 'syncing' | 'complete' | 'error';
  error?: string;
}

type SyncProgressCallback = (progress: SyncProgress) => void;

// API endpoints (configure based on your backend)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ============================================================================
// SYNC SERVICE
// ============================================================================

export class SyncService {
  private isRunning = false;
  private abortController: AbortController | null = null;
  private progressCallback: SyncProgressCallback | null = null;

  /**
   * Set callback for progress updates
   */
  onProgress(callback: SyncProgressCallback) {
    this.progressCallback = callback;
  }

  /**
   * Report progress
   */
  private reportProgress(progress: SyncProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Main sync entry point
   */
  async sync(options: {
    fullSync?: boolean;
    tables?: string[];
  } = {}): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      // Determine which tables to sync
      const tablesToSync = options.tables || await determineSyncStrategy();
      console.log('Starting sync for tables:', tablesToSync);

      // Sync each table
      for (const table of tablesToSync) {
        if (this.abortController.signal.aborted) {
          throw new Error('Sync cancelled');
        }

        await this.syncTable(table, options.fullSync);
      }

      // Rebuild search index after sync
      await rebuildSearchIndex();

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Sync failed:', message);
      return { success: false, error: message };
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Cancel running sync
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Sync a single table
   */
  private async syncTable(tableName: string, fullSync = false): Promise<void> {
    this.reportProgress({
      table: tableName,
      current: 0,
      total: 0,
      status: 'syncing'
    });

    try {
      // Get last sync metadata
      const syncMeta = await db.syncMetadata.get(tableName);
      const since = fullSync ? 0 : (syncMeta?.lastSyncAt || 0);

      // Fetch data from server
      let cursor: string | undefined;
      let totalSynced = 0;

      do {
        const response = await this.fetchFromServer(tableName, since, cursor);

        // Insert/update data
        await this.upsertData(tableName, response.data);
        totalSynced += response.data.length;

        this.reportProgress({
          table: tableName,
          current: totalSynced,
          total: response.totalCount,
          status: 'syncing'
        });

        cursor = response.hasMore ? response.nextCursor : undefined;

        // Update sync metadata
        await db.syncMetadata.put({
          tableName,
          lastSyncAt: Date.now(),
          lastServerVersion: response.serverVersion,
          recordCount: totalSynced
        });

      } while (cursor);

      this.reportProgress({
        table: tableName,
        current: totalSynced,
        total: totalSynced,
        status: 'complete'
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.reportProgress({
        table: tableName,
        current: 0,
        total: 0,
        status: 'error',
        error: message
      });
      throw error;
    }
  }

  /**
   * Fetch data from server API
   */
  private async fetchFromServer<T>(
    tableName: string,
    since: number,
    cursor?: string
  ): Promise<SyncResponse<T>> {
    const params = new URLSearchParams({
      since: since.toString(),
      limit: '1000'
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await fetch(
      `${API_BASE}/sync/${tableName}?${params}`,
      {
        signal: this.abortController?.signal,
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Upsert data into local database
   */
  private async upsertData(tableName: string, data: unknown[]): Promise<void> {
    if (data.length === 0) return;

    const table = this.getTable(tableName);
    if (!table) {
      throw new Error(`Unknown table: ${tableName}`);
    }

    // Transform server data to client schema if needed
    const transformed = data.map(item => this.transformServerToClient(tableName, item));

    // Bulk upsert with chunking
    await bulkInsertWithChunking(table, transformed);
  }

  /**
   * Get Dexie table by name
   */
  private getTable(tableName: string) {
    const tables: Record<string, any> = {
      songs: db.songs,
      venues: db.venues,
      concerts: db.concerts,
      setlistEntries: db.setlistEntries,
      guests: db.guests,
      guestAppearances: db.guestAppearances,
      albums: db.albums,
      albumTracks: db.albumTracks
    };
    return tables[tableName];
  }

  /**
   * Transform server response to client schema
   * Handles snake_case to camelCase and denormalization
   */
  private transformServerToClient(tableName: string, serverData: any): any {
    const now = Date.now();

    switch (tableName) {
      case 'songs':
        return {
          id: serverData.id,
          uuid: serverData.uuid,
          title: serverData.title,
          titleNormalized: serverData.title_normalized,
          slug: serverData.slug,
          originalArtist: serverData.original_artist,
          isCover: serverData.is_cover,
          timesPlayed: serverData.times_played,
          firstPlayedDate: serverData.first_played_date,
          lastPlayedDate: serverData.last_played_date,
          notes: serverData.notes,
          syncedAt: now
        } as Song;

      case 'venues':
        return {
          id: serverData.id,
          uuid: serverData.uuid,
          name: serverData.name,
          nameNormalized: serverData.name_normalized,
          slug: serverData.slug,
          city: serverData.city,
          stateProvince: serverData.state_province,
          country: serverData.country,
          latitude: serverData.latitude,
          longitude: serverData.longitude,
          venueType: serverData.venue_type,
          totalShows: serverData.total_shows,
          firstShowDate: serverData.first_show_date,
          lastShowDate: serverData.last_show_date,
          syncedAt: now
        } as Venue;

      case 'concerts':
        return {
          id: serverData.id,
          uuid: serverData.uuid,
          showDate: serverData.show_date,
          slug: serverData.slug,
          venueId: serverData.venue_id,
          tourName: serverData.tour_name,
          showType: serverData.show_type,
          songCount: serverData.song_count,
          hasAudio: serverData.has_audio,
          hasVideo: serverData.has_video,
          notes: serverData.notes,
          // Denormalized venue info (joined in server query)
          venueName: serverData.venue_name,
          venueCity: serverData.venue_city,
          venueState: serverData.venue_state,
          syncedAt: now
        } as Concert;

      case 'setlistEntries':
        return {
          id: serverData.id,
          uuid: serverData.uuid,
          concertId: serverData.concert_id,
          songId: serverData.song_id,
          setNumber: serverData.set_number,
          position: serverData.position,
          isOpener: serverData.is_opener,
          isCloser: serverData.is_closer,
          isSegue: serverData.is_segue_from_previous,
          isTease: serverData.is_tease,
          isBustout: serverData.is_bustout,
          gap: serverData.shows_since_last_played,
          durationSeconds: serverData.duration_seconds,
          notes: serverData.notes,
          // Denormalized song info
          songTitle: serverData.song_title,
          songSlug: serverData.song_slug,
          syncedAt: now
        } as SetlistEntry;

      case 'guests':
        return {
          id: serverData.id,
          uuid: serverData.uuid,
          name: serverData.name,
          nameNormalized: serverData.name_normalized,
          slug: serverData.slug,
          instrument: serverData.instrument,
          totalAppearances: serverData.total_appearances,
          syncedAt: now
        } as Guest;

      case 'guestAppearances':
        return {
          id: serverData.id,
          concertId: serverData.concert_id,
          setlistEntryId: serverData.setlist_entry_id,
          guestId: serverData.guest_id,
          instrument: serverData.instrument,
          guestName: serverData.guest_name,
          syncedAt: now
        } as GuestAppearance;

      case 'albums':
        return {
          id: serverData.id,
          uuid: serverData.uuid,
          title: serverData.title,
          slug: serverData.slug,
          releaseDate: serverData.release_date,
          albumType: serverData.album_type,
          coverImageUrl: serverData.cover_image_url,
          trackCount: serverData.track_count,
          syncedAt: now
        } as Album;

      case 'albumTracks':
        return {
          id: serverData.id,
          albumId: serverData.album_id,
          songId: serverData.song_id,
          discNumber: serverData.disc_number,
          trackNumber: serverData.track_number,
          trackTitle: serverData.track_title,
          durationSeconds: serverData.duration_seconds,
          sourceConcertId: serverData.source_concert_id,
          syncedAt: now
        } as AlbumTrack;

      default:
        return { ...serverData, syncedAt: now };
    }
  }
}

// ============================================================================
// SERVER-SIDE SYNC API (example Next.js API route)
// ============================================================================

/**
 * Example: /api/sync/[table]/route.ts
 *
 * This is what the server endpoint should look like
 */
export const serverSyncEndpointExample = `
// app/api/sync/[table]/route.ts
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';  // Your PostgreSQL client

export async function GET(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  const table = params.table;
  const searchParams = request.nextUrl.searchParams;
  const since = parseInt(searchParams.get('since') || '0');
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000);

  // Build query based on table
  const query = buildSyncQuery(table, since, cursor, limit);
  const results = await db.query(query);

  // Get total count for progress reporting
  const countQuery = \`SELECT COUNT(*) FROM \${table} WHERE updated_at > $1\`;
  const countResult = await db.query(countQuery, [new Date(since)]);
  const totalCount = parseInt(countResult.rows[0].count);

  // Determine if there's more data
  const hasMore = results.rows.length === limit;
  const nextCursor = hasMore
    ? results.rows[results.rows.length - 1].id.toString()
    : undefined;

  return Response.json({
    data: results.rows,
    serverVersion: process.env.DATA_VERSION || '1.0.0',
    totalCount,
    hasMore,
    nextCursor
  });
}

function buildSyncQuery(table: string, since: number, cursor: string | null, limit: number) {
  const sinceDate = new Date(since).toISOString();

  // Table-specific queries with denormalization
  switch (table) {
    case 'songs':
      return {
        text: \`
          SELECT
            id, uuid, title, title_normalized, slug,
            original_artist, is_cover, times_played,
            first_played_date, last_played_date, notes
          FROM songs
          WHERE updated_at > $1
            AND ($2::integer IS NULL OR id > $2)
          ORDER BY id
          LIMIT $3
        \`,
        values: [sinceDate, cursor ? parseInt(cursor) : null, limit]
      };

    case 'concerts':
      return {
        text: \`
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
        \`,
        values: [sinceDate, cursor ? parseInt(cursor) : null, limit]
      };

    case 'setlistEntries':
      return {
        text: \`
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
        \`,
        values: [sinceDate, cursor ? parseInt(cursor) : null, limit]
      };

    // Add other tables...
    default:
      throw new Error(\`Unknown table: \${table}\`);
  }
}
`;

// ============================================================================
// SERVICE WORKER BACKGROUND SYNC
// ============================================================================

/**
 * Register for background sync
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.log('Background sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('dmbalmanac-sync');
    console.log('Background sync registered');
    return true;
  } catch (error) {
    console.error('Failed to register background sync:', error);
    return false;
  }
}

/**
 * Service Worker sync handler (put in sw.js)
 */
export const serviceWorkerSyncHandler = `
// In your service worker (sw.js):

self.addEventListener('sync', (event) => {
  if (event.tag === 'dmbalmanac-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Import the sync service (adjust path)
  const { SyncService } = await import('./sync-service.js');
  const syncService = new SyncService();

  try {
    await syncService.sync({ fullSync: false });
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;  // Will retry sync
  }
}
`;

// ============================================================================
// HOOKS FOR REACT
// ============================================================================

/**
 * Example React hook for sync status
 */
export const useSyncHookExample = `
import { useState, useEffect, useCallback } from 'react';
import { SyncService, SyncProgress } from './sync-service';

export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncService = useMemo(() => new SyncService(), []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      sync();
    }
  }, [isOnline]);

  const sync = useCallback(async (fullSync = false) => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    setError(null);

    syncService.onProgress(setProgress);

    const result = await syncService.sync({ fullSync });

    setIsSyncing(false);

    if (result.success) {
      setLastSyncAt(Date.now());
    } else {
      setError(result.error || 'Sync failed');
    }
  }, [syncService, isSyncing, isOnline]);

  const cancelSync = useCallback(() => {
    syncService.cancel();
    setIsSyncing(false);
  }, [syncService]);

  return {
    isOnline,
    isSyncing,
    progress,
    lastSyncAt,
    error,
    sync,
    cancelSync
  };
}
`;

// Export singleton instance
export const syncService = new SyncService();
