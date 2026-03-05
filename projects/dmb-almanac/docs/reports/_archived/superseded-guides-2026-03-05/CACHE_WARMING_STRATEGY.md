# Cache Warming Strategy - DMB Almanac
**Note**: Codex context caching lives at `docs/CODEX_CACHE_WARMING_STRATEGY.md`.

## Objective
Deliver instant-feeling navigation by warming both **page caches** and **data caches** before users click.

## Layers
- **L1: Query Cache (in-memory)**  
  Stores hot Dexie query results for 1–30 minutes.
- **L2: Data Warming (Dexie liveQuery)**  
  Preloads likely next-page data into the query cache.
- **L3: Page Warming (HTML prefetch + Service Worker)**  
  Prefetches/warms predicted pages for near-zero navigation delay.

## Prediction Inputs
- Navigation graph (localStorage + recency weighting)
- Seed transitions for first-run behavior
- Device profile (Apple Silicon gets higher prefetch ceilings)

## Warming Flow
1. Navigation occurs → record transition.
2. Predict next routes (top N).
3. Warm data stores for predicted routes.
4. Prefetch HTML for predicted routes.
5. Service Worker warms Cache API (if enabled).

## Data Warming Coverage
| Route | Stores Warmed |
| --- | --- |
| `/shows` | `allShows`, `globalStats`, `globalStatsExtended`, `showsByYearSummary` |
| `/tours` | `toursGroupedByDecade` |
| `/guests` | `allGuests` |
| `/liberation` | `liberationList` |
| `/discography` | `allReleases` |
| `/visualizations` | `allShows` |
| `/songs` | `allSongs`, `songStats`, `topSongsByPerformances` |
| `/venues` | `allVenues`, `venueStats`, `topVenuesByShows` |
| `/my-shows` | `userAttendedShows`, `userFavoriteSongs`, `userFavoriteVenues`, `allShows`, `allSongs`, `allVenues` |
| `/stats` | `globalStats`, `globalStatsExtended`, `topSongsByPerformances`, `topVenuesByShows`, `toursGroupedByDecade` |
| `/` | `globalStatsExtended`, `topSongsByPerformances`, `topVenuesByShows` |
| `/shows/[id]` | `getShowWithSetlist`, `getAdjacentShows` |
| `/songs/[slug]` | `getSongBySlug`, `getSongPerformances`, `getSongYearBreakdown` |
| `/venues/[id]` | `getVenueById`, `getVenueShows`, `getVenueSongStats` |
| `/tours/[year]` | `getTourByYear`, `getTourShows` |
| `/guests/[slug]` | `getGuestBySlug`, `getGuestAppearances` |
| `/releases/[slug]` | `getReleaseBySlug`, `getReleaseTracks` |

## Guardrails
- Respect Data Saver and slow connections.
- Skip when offline for page prefetch (data warming still allowed).
- Cap warm paths by device memory and CPU.

## Observability
Tracked in the Storage panel:
- Data warming status + last warmed paths
- Query cache hit rate and evictions
  
## Tuning Targets
- Query cache hit rate > 80%
- Warming latency < 1s idle budget
- Prefetch success > 60%
