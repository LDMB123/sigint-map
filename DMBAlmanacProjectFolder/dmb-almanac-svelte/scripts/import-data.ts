import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  closeDb,
  getDb,
  initializeDb,
  insertMany,
  insertManyIgnore,
  run,
} from "../lib/db/index.js";

const OUTPUT_DIR = join(process.cwd(), "scraper", "output");

interface ScrapedVenue {
  originalId?: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  venueType?: string;
  capacity?: number;
}

interface ScrapedSong {
  originalId?: string;
  title: string;
  originalArtist?: string;
  isCover: boolean;
  lyrics?: string;
  notes?: string;
  firstPlayedDate?: string;
  lastPlayedDate?: string;
  totalPlays?: number;
  totalPerformances?: number;
}

interface ScrapedGuest {
  originalId?: string;
  name: string;
  instruments: string[];
  notes?: string;
}

interface ScrapedRelease {
  originalId?: string;
  title: string;
  releaseType: string;
  releaseDate?: string;
  coverArtUrl?: string;
  tracks: ScrapedReleaseTrack[];
  notes?: string;
}

interface ScrapedReleaseTrack {
  trackNumber: number;
  discNumber: number;
  songTitle: string;
  duration?: string;
  showDate?: string;
  venueName?: string;
}

interface _ScrapedSongStatistics {
  originalId?: string;
  title: string;
  composer?: string;
  composerYear?: number;
  albumId?: string;
  albumName?: string;
  isCover: boolean;
  originalArtist?: string;
  firstPlayedDate?: string;
  lastPlayedDate?: string;
  totalPlays?: number;
  avgLengthSeconds?: number;
  songHistory?: string;
}

interface ScrapedLiberationEntry {
  songId: string;
  songTitle: string;
  lastPlayedDate: string;
  lastPlayedShowId: string;
  daysSince: number;
  showsSince: number;
  notes?: string;
  configuration?: string;
  isLiberated?: boolean;
  liberatedDate?: string;
  liberatedShowId?: string;
}

interface ScrapedCuratedListItem {
  position: number;
  itemType: string;
  itemId?: string;
  itemTitle?: string;
  itemLink?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

interface ScrapedCuratedList {
  originalId?: string;
  title: string;
  slug: string;
  category?: string;
  description?: string;
  itemCount?: number;
  items: ScrapedCuratedListItem[];
}

interface ScrapedVenueWithAliases {
  originalId?: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  venueType?: string;
  totalShows?: number;
  aliases?: Array<{
    name: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

interface ScrapedSetlistEntry {
  position: number;
  songId?: string;
  songTitle?: string;
  set: string;
  slot: string;
  duration?: string | number;
  isSegue: boolean;
  isTease: boolean;
  teaseOfId?: string;
  notes?: string;
  guestIds?: string[];
  guestNames?: string[];
}

interface ScrapedGuestAppearance {
  name: string;
  instruments?: string[];
  songs?: string[];
}

interface ScrapedShow {
  originalId?: string;
  date: string;
  venueId?: string;
  venueName?: string;
  city?: string;
  state?: string;
  country?: string;
  tourName?: string;
  tourYear?: number;
  notes?: string;
  setlist: ScrapedSetlistEntry[];
  guests?: ScrapedGuestAppearance[];
}

// Validation helper functions
function isValidVenueName(venueName: string | undefined): boolean {
  if (!venueName || venueName.trim() === "") return false;
  return true;
}

function isValidCity(city: string | undefined): boolean {
  if (!city || city.trim() === "") return false;
  // Filter out garbage data - cities shouldn't be full sentences
  if (city.length > 50) return false;
  if (city.includes("but") || city.includes("however") || city.includes("likely")) return false;
  if (city.includes("mislabeled") || city.includes("circulating")) return false;
  return true;
}

function isValidShow(show: ScrapedShow): boolean {
  return isValidVenueName(show.venueName) && isValidCity(show.city);
}

function isValidGuestName(name: string): boolean {
  if (!name || name.trim() === "") return false;

  // Normalize spaces (convert non-breaking spaces to regular spaces)
  const normalizedName = name
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lowerName = normalizedName.toLowerCase();

  // Length validation (early check)
  if (name.length > 100) return false; // Guest names shouldn't be this long
  if (name.length < 3) return false; // Too short to be a real name

  // Filter out bracketed annotations
  if (name.includes("[") || name.includes("]")) return false;

  // Filter out song titles in quotes
  if (name.includes('"')) return false;

  // Filter out song lyric patterns
  if (name.includes("/") && !name.includes("Jr.") && !name.includes("Sr.")) return false;

  // Exclude Dave Matthews Band members (all variations)
  const bandMembers = [
    "dave",
    "dave matthews",
    "carter",
    "carter beauford",
    "stefan",
    "stefan lessard",
    "boyd",
    "boyd tinsley",
    "leroi",
    "leroi moore",
    "roi",
    "leroi moore (r.i.p.)",
    "leroi moore (r.i.p)",
    "tim reynolds",
    "tim",
    "rashawn",
    "rashawn ross",
    "jeff",
    "jeff coffin",
    "buddy",
    "buddy strong",
    "butch",
    "butch taylor",
    "peter",
    "peter griesar",
    "rashawn ross and jeff coffin",
    "jeff coffin and rashawn ross",
    "dave and tim",
    "dave & tim",
    "dave and trey",
    "only dave & tim on stage",
  ];

  // Exact match for band members (case-insensitive)
  if (bandMembers.includes(lowerName)) return false;

  // Special patterns for band member combinations
  if (
    lowerName.match(
      /^(dave|carter|stefan|boyd|leroi|roi|rashawn|jeff|buddy)(\s+(and|&)\s+(dave|carter|stefan|boyd|leroi|roi|rashawn|jeff|buddy|trey))+$/
    )
  ) {
    return false;
  }

  // Filter standalone first names that are likely band members
  const standaloneFirstNames = ["carter", "stefan", "boyd", "roi", "rashawn", "butch", "peter"];
  if (standaloneFirstNames.includes(lowerName) && !name.includes(" ")) return false;

  // Filter band member names with performance notes: "Dave solo", "Carter intro", etc.
  const bandMemberPerformancePattern =
    /^(dave|carter|stefan|boyd|leroi|roi|tim|rashawn|jeff|buddy|butch|peter)\s+(solo|intro|outro|jam|on\s+\w+|says|mentions|tells|plays|sings)(\s+\w+)?$/i;
  if (bandMemberPerformancePattern.test(lowerName)) return false;

  // Filter out song annotations and metadata patterns
  if (lowerName.includes("first time")) return false;
  if (lowerName.includes("last time")) return false;
  if (lowerName.includes("interpolation")) return false;
  if (lowerName.includes("tease")) return false;
  if (lowerName.includes("released on")) return false;
  if (lowerName.includes("youtube")) return false;
  if (lowerName.includes("warm-up")) return false;
  if (lowerName.includes("warming up")) return false;
  if (lowerName.includes("dedicated to")) return false;
  if (lowerName.includes("part of the")) return false;
  if (lowerName.includes("as part of")) return false;
  if (lowerName.includes("set closer")) return false;
  if (lowerName.includes("set opener")) return false;
  if (lowerName.includes("segue")) return false;
  if (lowerName.includes("includes prelude")) return false;
  if (lowerName.includes("includes") && lowerName.includes("prelude")) return false;

  // Filter out performance notes - ONLY reject if entry is PURELY a performance note
  const purePerformanceNote =
    /^(intro|outro|solo|jam|snippet|quote|riff|prelude|reprise)(\s+(intro|outro|solo|jam|snippet|quote|riff|prelude|reprise))*$/i;
  if (purePerformanceNote.test(lowerName)) return false;

  // Reject entries that are ONLY performance descriptions without a proper name
  // Pattern: "Nature intro", "Short instrumental intro", "Truncated version"
  const performanceOnlyPattern =
    /^(nature|short|long|instrumental|truncated|extended|acoustic|electric|full\s+band|partial|typical)\s*(intro|outro|solo|jam|interpolation|snippet|version|situation)(\s+(intro|outro|solo|jam|interpolation|snippet|version))?$/i;
  if (performanceOnlyPattern.test(lowerName)) return false;

  // Reject "Dance Away outro (lyrics)" pattern or any song performance with (lyrics)
  if (lowerName.match(/\s+(intro|outro|solo|jam)\s*\(lyrics\)$/i)) return false;

  // Reject entries ending with performance notes (even if they have a name prefix)
  // e.g., "Greg Howard solo intro", "Warren Haynes jam outro"
  if (lowerName.match(/\s+(solo|jam)\s+(intro|outro)$/i)) return false;
  if (lowerName.match(/\s+(intro|outro)$/i) && lowerName.split(" ").length > 2) return false;

  // Reject entries that are full sentences or descriptions
  if (
    lowerName.includes(" is ") ||
    lowerName.includes(" are ") ||
    lowerName.includes(" was ") ||
    lowerName.includes(" were ")
  )
    return false;
  if (lowerName.includes(" the ") && lowerName.split(" ").length > 4) return false;
  if (
    lowerName.includes(" during ") ||
    lowerName.includes(" while ") ||
    lowerName.includes(" after ")
  )
    return false;

  // Filter out lyric annotations
  if (lowerName.includes("(lyrics)")) return false;
  if (lowerName.match(/^lyrics?$/i)) return false;

  // Filter out instrumentation notes that don't include a name
  if (
    lowerName.match(/^(on\s+)?(drums|guitar|bass|saxophone|violin|keyboard|keytar|maracas|piano)$/i)
  )
    return false;

  // Filter out names that are just semicolon-separated descriptions
  if (name.includes(";")) {
    const parts = name.split(";").map((p) => p.trim());
    // If all parts contain annotation keywords, reject
    const annotationKeywords = [
      "first",
      "last",
      "played",
      "time",
      "dedicated",
      "acoustic",
      "electric",
    ];
    if (parts.every((p) => annotationKeywords.some((kw) => p.toLowerCase().includes(kw)))) {
      return false;
    }
  }

  // POSITIVE PATTERN: If it looks like a proper name (First Last), allow it
  // This helps preserve legitimate guests like "Warren Haynes", "Greg Howard", "Bela Fleck"
  const properNamePattern = /^[A-Z][a-z]+(\s+[A-Z][a-z']+)+$/;
  if (properNamePattern.test(normalizedName)) {
    // But reject if it starts with "The" (likely a song title)
    if (lowerName.startsWith("the ")) return false;

    // Reject common song title patterns and known song titles
    if (lowerName.match(/^(little|christmas|winter|santa|jingle|mary|good|bad|ugly)/)) return false;

    // Reject known song titles that match proper name pattern
    const songTitlePatterns = [
      "also sprach zarathustra",
      "american baby",
      "bibbidi bobbidi boo",
      "buffalo soldier",
      "come together",
      "eleanor rigby",
      "everyday outro",
      "feels so good",
      "first time",
      "golden years",
      "jamaican farewell",
      "louie louie",
      "low rider",
      "my favorite things",
      "na na hey",
      "norwegian wood",
      "on broadway",
      "pretty girl",
      "save me",
      "slow jam",
      "some do",
      "swim naked",
      "wild thing",
      "wonderful tonight",
      "you can call",
      "new year",
      "queen rita",
      "big voice",
      "money harm",
    ];
    if (songTitlePatterns.some((pattern) => lowerName.includes(pattern))) return false;

    // Reject group/orchestra/band names (usually contain Orchestra, Symphony, Dancers, Horns, Root)
    if (lowerName.match(/(orchestra|symphony|dancers|horns|root)$/)) return false;

    return true;
  }

  // If we got here and it doesn't look like a proper name, it's likely noise
  // Reject anything that's not in proper name format
  return false;
}

function loadJsonFile<T>(filename: string): T | null {
  const filepath = join(OUTPUT_DIR, filename);
  if (!existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return null;
  }

  const content = readFileSync(filepath, "utf-8");
  const data = JSON.parse(content);
  return data;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function createSortTitle(title: string): string {
  return title.replace(/^(the|a|an)\s+/i, "").toLowerCase();
}

function getCountryCode(country: string | undefined): string | null {
  if (!country) return null;
  const codes: Record<string, string> = {
    USA: "US",
    "United States": "US",
    AUS: "AU",
    Australia: "AU",
    GER: "DE",
    Germany: "DE",
    UAE: "AE",
    "United Arab Emirates": "AE",
    CAN: "CA",
    Canada: "CA",
    UK: "GB",
    "United Kingdom": "GB",
    MEX: "MX",
    Mexico: "MX",
  };
  return codes[country] || country.substring(0, 2).toUpperCase();
}

async function importVenues(): Promise<Map<string, number>> {
  console.log("Importing venues...");
  const venueMap = new Map<string, number>();

  // Try to load venues.json first, then extract from shows.json
  const venuesData = loadJsonFile<{ venues: ScrapedVenue[] }>("venues.json");
  const showsData = loadJsonFile<{ shows: ScrapedShow[] }>("shows.json");

  const uniqueVenues = new Map<string, ScrapedVenue>();

  // Load from venues.json if available
  if (venuesData?.venues) {
    venuesData.venues.forEach((v) => {
      const key = `${v.name}|${v.city}|${v.state || ""}|${v.country}`.toLowerCase();
      if (!uniqueVenues.has(key)) {
        uniqueVenues.set(key, v);
      }
    });
  }

  // Extract venues from shows.json
  if (showsData?.shows) {
    showsData.shows.forEach((show) => {
      if (!isValidShow(show)) return;

      const key =
        `${show.venueName}|${show.city}|${show.state || ""}|${show.country}`.toLowerCase();
      if (!uniqueVenues.has(key)) {
        uniqueVenues.set(key, {
          // biome-ignore lint/style/noNonNullAssertion: validated by isValidShow() which checks venueName is not empty
          name: show.venueName!,
          // biome-ignore lint/style/noNonNullAssertion: validated by isValidShow() which checks city is not empty
          city: show.city!,
          state: show.state,
          country: show.country || "USA",
          venueType: "other",
        });
      }
    });
  }

  if (uniqueVenues.size === 0) {
    console.log("No venues to import");
    return venueMap;
  }

  // Convert to array and insert (without explicit id, let DB auto-generate)
  const venues = Array.from(uniqueVenues.values()).map((v) => ({
    name: v.name,
    city: v.city,
    state: v.state && v.state.trim() !== "" ? v.state : null,
    country: v.country || "USA",
    country_code: getCountryCode(v.country),
    venue_type: v.venueType || "other",
    capacity: v.capacity || null,
    total_shows: 0,
  }));

  // Use INSERT OR IGNORE to avoid conflicts with existing venues
  insertManyIgnore("venues", venues);

  // Build map from database - query actual venue IDs
  const db = getDb();
  const allVenues = db.prepare("SELECT id, name, city, state, country FROM venues").all() as {
    id: number;
    name: string;
    city: string;
    state: string | null;
    country: string;
  }[];
  allVenues.forEach((venue) => {
    const key = `${venue.name.toLowerCase()}|${venue.city.toLowerCase()}|${venue.state?.toLowerCase() || ""}`;
    venueMap.set(key, venue.id);
  });

  console.log(`Imported ${venues.length} venues (${allVenues.length} total in database)`);
  return venueMap;
}

async function importSongs(): Promise<Map<string, number>> {
  console.log("Importing songs...");
  const songMap = new Map<string, number>();

  // Try to load songs.json first, then extract from shows.json setlists
  const songsData = loadJsonFile<{ songs: ScrapedSong[] }>("songs.json");
  const showsData = loadJsonFile<{ shows: ScrapedShow[] }>("shows.json");

  const uniqueSongs = new Map<string, ScrapedSong>();

  // Load from songs.json if available
  if (songsData?.songs) {
    songsData.songs.forEach((s) => {
      const key = s.title.toLowerCase();
      if (!uniqueSongs.has(key)) {
        uniqueSongs.set(key, s);
      }
    });
  }

  // Extract songs from shows.json setlists
  if (showsData?.shows) {
    showsData.shows.forEach((show) => {
      if (!isValidShow(show)) return;

      show.setlist.forEach((entry) => {
        if (!entry.songTitle) return;

        const key = entry.songTitle.toLowerCase();
        if (!uniqueSongs.has(key)) {
          // Determine if it's likely a cover based on title patterns
          const isCover =
            entry.songTitle.includes("[") ||
            entry.songTitle.toLowerCase().includes("tease") ||
            /^(the )?(beatles|stones|neil young|bob dylan)/i.test(entry.songTitle);

          uniqueSongs.set(key, {
            title: entry.songTitle,
            isCover: isCover,
            totalPlays: 0,
            totalPerformances: 0,
          });
        }
      });
    });
  }

  if (uniqueSongs.size === 0) {
    console.log("No songs to import");
    return songMap;
  }

  // Convert to array and insert (without explicit id, let DB auto-generate)
  const songs = Array.from(uniqueSongs.values()).map((s) => ({
    title: s.title,
    slug: slugify(s.title),
    sort_title: createSortTitle(s.title),
    original_artist: s.originalArtist || null,
    is_cover: s.isCover ? 1 : 0,
    is_original: s.isCover ? 0 : 1,
    first_played_date: s.firstPlayedDate || null,
    last_played_date: s.lastPlayedDate || null,
    total_performances: s.totalPerformances || s.totalPlays || 0,
    lyrics: s.lyrics || null,
    notes: s.notes || null,
  }));

  // Use INSERT OR IGNORE to avoid conflicts with existing songs
  insertManyIgnore("songs", songs);

  // Build map from database - query actual song IDs
  const db = getDb();
  const allSongs = db.prepare("SELECT id, title FROM songs").all() as {
    id: number;
    title: string;
  }[];
  allSongs.forEach((song) => {
    songMap.set(song.title.toLowerCase(), song.id);
  });

  console.log(`Imported ${songs.length} songs (${allSongs.length} total in database)`);
  return songMap;
}

async function importGuests(): Promise<Map<string, number>> {
  console.log("Importing guests...");
  const guestMap = new Map<string, number>();

  // Try to load guests.json first, then extract from shows.json
  const guestsData = loadJsonFile<{ guests: ScrapedGuest[] }>("guests.json");
  const showsData = loadJsonFile<{ shows: ScrapedShow[] }>("shows.json");

  const uniqueGuests = new Map<string, ScrapedGuest>();

  // Load from guests.json if available
  if (guestsData?.guests) {
    guestsData.guests.forEach((g) => {
      const key = g.name.toLowerCase();
      if (!uniqueGuests.has(key)) {
        uniqueGuests.set(key, g);
      }
    });
  }

  // Extract guests from shows.json
  if (showsData?.shows) {
    showsData.shows.forEach((show) => {
      if (!isValidShow(show)) return;

      // From show-level guests
      show.guests?.forEach((guest) => {
        if (!isValidGuestName(guest.name)) return;

        const key = guest.name.toLowerCase();
        if (!uniqueGuests.has(key)) {
          uniqueGuests.set(key, {
            name: guest.name,
            instruments: guest.instruments || [],
          });
        }
      });

      // From setlist entry guest names
      show.setlist.forEach((entry) => {
        entry.guestNames?.forEach((guestName) => {
          if (!isValidGuestName(guestName)) return;

          const key = guestName.toLowerCase();
          if (!uniqueGuests.has(key)) {
            uniqueGuests.set(key, {
              name: guestName,
              instruments: [],
            });
          }
        });
      });
    });
  }

  if (uniqueGuests.size === 0) {
    console.log("No guests to import");
    return guestMap;
  }

  // Convert to array and insert
  const guests = Array.from(uniqueGuests.values()).map((g, index) => ({
    id: index + 1,
    name: g.name,
    slug: slugify(g.name),
    instruments: JSON.stringify(g.instruments || []),
    total_appearances: 0,
    notes: g.notes || null,
  }));

  insertMany("guests", guests);

  // Build map
  Array.from(uniqueGuests.keys()).forEach((key, index) => {
    guestMap.set(key, index + 1);
  });

  console.log(`Imported ${guests.length} guests`);
  return guestMap;
}

async function importTours(): Promise<Map<string, number>> {
  console.log("Importing tours...");
  const tourMap = new Map<string, number>();

  // We'll create tours from show data
  const data = loadJsonFile<{ shows: ScrapedShow[] }>("shows.json");
  if (!data?.shows) {
    console.log("No shows to extract tours from");
    return tourMap;
  }

  // Extract unique tour/year combinations
  const tourSet = new Map<string, { name: string; year: number }>();
  data.shows.forEach((show) => {
    const year = show.tourYear || new Date(show.date).getFullYear();
    const name = show.tourName || `${year} Tour`;
    const key = `${year}-${name}`;
    if (!tourSet.has(key)) {
      tourSet.set(key, { name, year });
    }
  });

  const tours = Array.from(tourSet.entries()).map(([_key, tour], index) => ({
    id: index + 1,
    name: tour.name,
    year: tour.year,
    total_shows: 0,
  }));

  insertMany("tours", tours);

  // Build map
  Array.from(tourSet.entries()).forEach(([key], index) => {
    tourMap.set(key, index + 1);
  });

  console.log(`Imported ${tours.length} tours`);
  return tourMap;
}

function parseDuration(duration: string | number | undefined): number | null {
  if (!duration) return null;
  if (typeof duration === "number") return duration;
  // Parse "MM:SS" format
  const match = duration.match(/(\d+):(\d+)/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return null;
}

async function importShows(
  venueMap: Map<string, number>,
  songMap: Map<string, number>,
  guestMap: Map<string, number>,
  tourMap: Map<string, number>
): Promise<void> {
  console.log("Importing shows and setlists...");

  const data = loadJsonFile<{ shows: ScrapedShow[] }>("shows.json");
  if (!data?.shows) {
    console.log("No shows to import");
    return;
  }

  // Deduplicate shows - keep the one with the most complete setlist for each date/venue
  console.log("Deduplicating shows...");
  const showsByDateVenue = new Map<string, ScrapedShow>();

  data.shows.forEach((show) => {
    if (!isValidShow(show)) return;

    const venueKey =
      `${show.venueName}|${show.city}|${show.state || ""}|${show.country}`.toLowerCase();
    const dateVenueKey = `${show.date}|${venueKey}`;

    const existing = showsByDateVenue.get(dateVenueKey);
    if (!existing) {
      showsByDateVenue.set(dateVenueKey, show);
    } else {
      // Keep the show with more setlist entries, or more guests
      const existingScore = (existing.setlist?.length || 0) * 10 + (existing.guests?.length || 0);
      const newScore = (show.setlist?.length || 0) * 10 + (show.guests?.length || 0);

      if (newScore > existingScore) {
        showsByDateVenue.set(dateVenueKey, show);
      }
    }
  });

  const uniqueShows = Array.from(showsByDateVenue.values());
  console.log(`Deduplicated ${data.shows.length} shows to ${uniqueShows.length} unique shows`);

  const db = getDb();
  let showCount = 0;
  let entryCount = 0;
  let appearanceCount = 0;

  const insertShow = db.prepare(`
    INSERT INTO shows (date, venue_id, tour_id, notes)
    VALUES (?, ?, ?, ?)
  `);

  const insertEntry = db.prepare(`
    INSERT INTO setlist_entries (show_id, song_id, position, set_name, slot, duration_seconds, is_segue, is_tease, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAppearance = db.prepare(`
    INSERT INTO guest_appearances (guest_id, show_id, setlist_entry_id)
    VALUES (?, ?, ?)
  `);

  const importAll = db.transaction(() => {
    let skippedCount = 0;

    for (const show of uniqueShows) {
      // Find venue ID using composite key
      const venueKey =
        `${show.venueName}|${show.city}|${show.state || ""}|${show.country}`.toLowerCase();
      const venueId = venueMap.get(venueKey);

      if (!venueId) {
        console.log(
          `Warning: Venue not found for show ${show.date}: ${show.venueName} in ${show.city}`
        );
        skippedCount++;
        continue;
      }

      // Find tour ID
      const year = show.tourYear || new Date(show.date).getFullYear();
      const tourName = show.tourName || `${year} Tour`;
      const tourKey = `${year}-${tourName}`;
      const tourId = tourMap.get(tourKey) || 1;

      // Insert show
      const result = insertShow.run(show.date, venueId, tourId, show.notes || null);
      const showId = result.lastInsertRowid as number;
      showCount++;

      // Insert setlist entries
      for (const entry of show.setlist || []) {
        // Skip entries without a song title
        if (!entry.songTitle) {
          continue;
        }

        // Find song by title
        const songId = songMap.get(entry.songTitle.toLowerCase());
        if (!songId) {
          console.log(`Warning: Song not found for show ${show.date}: "${entry.songTitle}"`);
          skippedCount++;
          continue;
        }

        const durationSeconds = parseDuration(entry.duration);

        let entryId: number;
        try {
          const entryResult = insertEntry.run(
            showId,
            songId,
            entry.position,
            entry.set || "set1",
            entry.slot || "standard",
            durationSeconds,
            entry.isSegue ? 1 : 0,
            entry.isTease ? 1 : 0,
            entry.notes || null
          );
          entryId = entryResult.lastInsertRowid as number;
          entryCount++;
        } catch (_err) {
          // Skip setlist entry if it fails (e.g., foreign key issue)
          continue;
        }

        // Insert guest appearances from entry.guestIds
        for (const guestId of entry.guestIds || []) {
          const dbGuestId = guestMap.get(guestId) || guestMap.get(guestId.toString());
          if (dbGuestId) {
            insertAppearance.run(dbGuestId, showId, entryId);
            appearanceCount++;
          }
        }

        // Insert guest appearances from entry.guestNames
        for (const guestName of entry.guestNames || []) {
          if (!isValidGuestName(guestName)) continue;

          const dbGuestId = guestMap.get(guestName.toLowerCase());
          if (dbGuestId) {
            try {
              insertAppearance.run(dbGuestId, showId, entryId);
              appearanceCount++;
            } catch (_err) {}
          }
        }
      }

      // Insert show-level guest appearances
      for (const guest of show.guests || []) {
        if (!isValidGuestName(guest.name)) continue;

        const dbGuestId = guestMap.get(guest.name.toLowerCase());
        if (dbGuestId) {
          // For show-level guests without specific entry, link to first entry
          try {
            insertAppearance.run(dbGuestId, showId, null);
            appearanceCount++;
          } catch (_err) {}
        }
      }
    }

    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} invalid shows (empty venue or garbage data)`);
    }
  });

  importAll();

  console.log(
    `Imported ${showCount} shows with ${entryCount} setlist entries and ${appearanceCount} guest appearances`
  );
}

async function updateCounts(): Promise<void> {
  console.log("Updating counts...");

  // Update venue show counts
  run(`
    UPDATE venues SET total_shows = (
      SELECT COUNT(*) FROM shows WHERE shows.venue_id = venues.id
    )
  `);

  // Update song performance counts
  run(`
    UPDATE songs SET total_performances = (
      SELECT COUNT(*) FROM setlist_entries WHERE setlist_entries.song_id = songs.id
    )
  `);

  // Update tour show counts
  run(`
    UPDATE tours SET total_shows = (
      SELECT COUNT(*) FROM shows WHERE shows.tour_id = tours.id
    )
  `);

  // Update guest appearance counts
  run(`
    UPDATE guests SET total_appearances = (
      SELECT COUNT(DISTINCT show_id) FROM guest_appearances WHERE guest_appearances.guest_id = guests.id
    )
  `);

  // Update song slot counts (opener, closer, encore)
  run(`
    UPDATE songs SET
      opener_count = (SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id AND slot = 'opener'),
      closer_count = (SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id AND slot = 'closer'),
      encore_count = (SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id AND set_name LIKE 'encore%')
  `);

  console.log("Counts updated");
}

function updateSongDates(): void {
  console.log("Updating song first/last played dates...");

  run(`
    UPDATE songs SET
      first_played_date = COALESCE(
        (SELECT MIN(sh.date) FROM shows sh
         JOIN setlist_entries se ON se.show_id = sh.id
         WHERE se.song_id = songs.id),
        first_played_date
      ),
      last_played_date = COALESCE(
        (SELECT MAX(sh.date) FROM shows sh
         JOIN setlist_entries se ON se.show_id = sh.id
         WHERE se.song_id = songs.id),
        last_played_date
      ),
      total_performances = COALESCE(
        NULLIF((SELECT COUNT(*) FROM setlist_entries WHERE song_id = songs.id), 0),
        total_performances
      )
  `);

  console.log("Song dates updated");
}

function updateGuestDates(): void {
  console.log("Updating guest first/last appearance dates...");

  run(`
    UPDATE guests SET
      first_appearance_date = (
        SELECT MIN(sh.date) FROM shows sh
        JOIN guest_appearances ga ON ga.show_id = sh.id
        WHERE ga.guest_id = guests.id
      ),
      last_appearance_date = (
        SELECT MAX(sh.date) FROM shows sh
        JOIN guest_appearances ga ON ga.show_id = sh.id
        WHERE ga.guest_id = guests.id
      ),
      total_appearances = (
        SELECT COUNT(DISTINCT show_id) FROM guest_appearances WHERE guest_id = guests.id
      )
  `);

  console.log("Guest dates updated");
}

function updateTourStats(): void {
  console.log("Updating tour statistics...");
  run(`
    UPDATE tours SET
      unique_songs_played = (
        SELECT COUNT(DISTINCT se.song_id)
        FROM shows sh
        JOIN setlist_entries se ON se.show_id = sh.id
        WHERE sh.tour_id = tours.id
      ),
      average_songs_per_show = (
        SELECT ROUND(AVG(song_count), 1)
        FROM shows
        WHERE tour_id = tours.id AND song_count > 0
      )
  `);
  console.log("Tour statistics updated.");
}

function updateShowSongCounts(): void {
  console.log("Updating show song counts...");
  run(`
    UPDATE shows SET song_count = (
      SELECT COUNT(*) FROM setlist_entries WHERE show_id = shows.id
    )
  `);
  console.log("Show song counts updated.");
}

function _populateLiberationList(): void {
  console.log("Populating liberation list...");
  run(`DELETE FROM liberation_list`);

  // Insert songs based on their last_played_date (from metadata or calculated)
  run(`
    INSERT INTO liberation_list (song_id, last_played_date, last_played_show_id, days_since, shows_since)
    SELECT
      s.id,
      s.last_played_date,
      (
        SELECT sh.id FROM shows sh
        JOIN setlist_entries se ON se.show_id = sh.id
        WHERE se.song_id = s.id
        ORDER BY sh.date DESC
        LIMIT 1
      ),
      CAST(julianday('now') - julianday(s.last_played_date) AS INTEGER),
      COALESCE(
        (SELECT COUNT(*) FROM shows WHERE date > s.last_played_date),
        0
      )
    FROM songs s
    WHERE s.last_played_date IS NOT NULL
      AND s.total_performances > 0
    ORDER BY s.last_played_date ASC
    LIMIT 100
  `);

  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as count FROM liberation_list").get() as {
    count: number;
  };
  console.log(`Liberation list populated with ${count.count} songs`);
}

async function importReleases(songMap: Map<string, number>): Promise<Map<string, number>> {
  console.log("Importing releases...");
  const releaseMap = new Map<string, number>();

  const data = loadJsonFile<{ releases: ScrapedRelease[] }>("releases.json");
  if (!data?.releases) {
    console.log("No releases to import");
    return releaseMap;
  }

  const db = getDb();
  const insertRelease = db.prepare(`
    INSERT INTO releases (title, slug, release_type, release_date, cover_art_url, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertTrack = db.prepare(`
    INSERT INTO release_tracks (release_id, song_id, track_number, disc_number, duration_seconds, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const importAll = db.transaction(() => {
    let releaseCount = 0;
    let trackCount = 0;
    let skippedTracks = 0;

    for (const release of data.releases) {
      // Normalize release type to match schema enum
      let releaseType = release.releaseType.toLowerCase();
      const validTypes = ["studio", "live", "compilation", "ep", "single", "video", "box_set"];
      if (!validTypes.includes(releaseType)) {
        releaseType = "studio"; // Default fallback
      }

      // Insert release
      const result = insertRelease.run(
        release.title,
        slugify(release.title),
        releaseType,
        release.releaseDate || null,
        release.coverArtUrl || null,
        release.notes || null
      );

      const releaseId = result.lastInsertRowid as number;
      releaseMap.set(release.originalId || release.title.toLowerCase(), releaseId);
      releaseCount++;

      // Insert tracks
      for (const track of release.tracks) {
        // Find song by title
        const songId = songMap.get(track.songTitle.toLowerCase());
        if (!songId) {
          console.log(
            `Warning: Song not found for track: "${track.songTitle}" on ${release.title}`
          );
          skippedTracks++;
          continue;
        }

        // Parse duration
        const durationSeconds = parseDuration(track.duration);

        // Create notes field with show info for live tracks
        let notes = null;
        if (track.showDate) {
          notes = `Recorded: ${track.showDate}`;
          if (track.venueName) {
            notes += ` at ${track.venueName}`;
          }
        }

        insertTrack.run(
          releaseId,
          songId,
          track.trackNumber,
          track.discNumber,
          durationSeconds,
          notes
        );
        trackCount++;
      }
    }

    console.log(`Skipped ${skippedTracks} tracks with missing song references`);
    console.log(`Imported ${releaseCount} releases with ${trackCount} tracks`);
  });

  importAll();

  return releaseMap;
}

async function importSongStatistics(songMap: Map<string, number>): Promise<void> {
  console.log("Importing song statistics...");

  // Load song-stats.json from scraper output
  // The file can have either { songs: [...] } or { stats: [...] } format
  const data = loadJsonFile<{ songs?: any[]; stats?: any[] }>("song-stats.json");

  const songs = data?.songs || data?.stats || [];
  if (songs.length === 0) {
    console.log("No song statistics to import");
    return;
  }

  const db = getDb();

  const upsertStats = db.prepare(`
    INSERT INTO song_statistics (
      song_id,
      slot_opener, slot_set1_closer, slot_set2_opener, slot_closer, slot_midset, slot_encore, slot_encore2,
      version_full, version_tease, version_partial, version_reprise, version_fake, version_aborted,
      avg_duration_seconds, longest_duration_seconds, longest_show_id, shortest_duration_seconds, shortest_show_id,
      release_count_total, release_count_studio, release_count_live, release_count_dmblive,
      release_count_warehouse, release_count_livetrax, release_count_broadcasts,
      current_gap_days, current_gap_shows,
      plays_by_year, artist_stats, top_segues_into, top_segues_from
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(song_id) DO UPDATE SET
      slot_opener = excluded.slot_opener,
      slot_set1_closer = excluded.slot_set1_closer,
      slot_set2_opener = excluded.slot_set2_opener,
      slot_closer = excluded.slot_closer,
      slot_midset = excluded.slot_midset,
      slot_encore = excluded.slot_encore,
      slot_encore2 = excluded.slot_encore2,
      version_full = excluded.version_full,
      version_tease = excluded.version_tease,
      version_partial = excluded.version_partial,
      version_reprise = excluded.version_reprise,
      version_fake = excluded.version_fake,
      version_aborted = excluded.version_aborted,
      avg_duration_seconds = excluded.avg_duration_seconds,
      longest_duration_seconds = excluded.longest_duration_seconds,
      longest_show_id = excluded.longest_show_id,
      shortest_duration_seconds = excluded.shortest_duration_seconds,
      shortest_show_id = excluded.shortest_show_id,
      release_count_total = excluded.release_count_total,
      release_count_studio = excluded.release_count_studio,
      release_count_live = excluded.release_count_live,
      release_count_dmblive = excluded.release_count_dmblive,
      release_count_warehouse = excluded.release_count_warehouse,
      release_count_livetrax = excluded.release_count_livetrax,
      release_count_broadcasts = excluded.release_count_broadcasts,
      current_gap_days = excluded.current_gap_days,
      current_gap_shows = excluded.current_gap_shows,
      plays_by_year = excluded.plays_by_year,
      artist_stats = excluded.artist_stats,
      top_segues_into = excluded.top_segues_into,
      top_segues_from = excluded.top_segues_from,
      updated_at = CURRENT_TIMESTAMP
  `);

  const importAll = db.transaction(() => {
    let importCount = 0;
    let skippedCount = 0;

    for (const song of songs) {
      if (!song.title) {
        skippedCount++;
        continue;
      }

      // Find the song ID by title
      const songId = songMap.get(song.title.toLowerCase());
      if (!songId) {
        const normalizedTitle = song.title.replace(/^["']|["']$/g, "").toLowerCase();
        const altSongId = songMap.get(normalizedTitle);
        if (!altSongId) {
          skippedCount++;
          continue;
        }
      }

      const finalSongId =
        songId || songMap.get(song.title.replace(/^["']|["']$/g, "").toLowerCase());
      if (!finalSongId) {
        skippedCount++;
        continue;
      }

      try {
        const slots = song.slotBreakdown || {};
        const versions = song.versionTypes || {};
        const releases = song.releaseCounts || {};
        // Handle both currentGap (old format) and daysSinceLastPlayed (new format)
        const gapDays = song.currentGap?.days ?? song.daysSinceLastPlayed ?? null;
        const gapShows = song.currentGap?.shows ?? null;

        // Parse average length from string like "4:21" if not in seconds
        let avgSeconds = song.avgLengthSeconds;
        if (!avgSeconds && song.artistStats?.[0]?.avgLength) {
          const parts = song.artistStats[0].avgLength.split(":");
          if (parts.length === 2) {
            avgSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }
        }

        // Parse longest version duration
        let longestSeconds = song.longestVersion?.durationSeconds;
        if (!longestSeconds && song.longestVersions?.[0]?.length) {
          const parts = song.longestVersions[0].length.split(":");
          if (parts.length === 2) {
            longestSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }
        }

        // Parse shortest version duration
        let shortestSeconds = song.shortestVersion?.durationSeconds;
        if (!shortestSeconds && song.shortestVersions?.[0]?.length) {
          const parts = song.shortestVersions[0].length.split(":");
          if (parts.length === 2) {
            shortestSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }
        }

        upsertStats.run(
          finalSongId,
          slots.opener || 0,
          slots.set1Closer || 0,
          slots.set2Opener || 0,
          slots.closer || 0,
          slots.midset || 0,
          slots.encore || 0,
          slots.encore2 || 0,
          versions.full || 0,
          versions.tease || 0,
          versions.partial || 0,
          versions.reprise || 0,
          versions.fake || 0,
          versions.aborted || 0,
          avgSeconds || null,
          longestSeconds || null,
          null, // longest_show_id - would need lookup
          shortestSeconds || null,
          null, // shortest_show_id - would need lookup
          releases.total || 0,
          releases.studio || 0,
          releases.live || 0,
          releases.dmblive || 0,
          releases.warehouse || 0,
          releases.liveTrax || 0,
          releases.broadcasts || 0,
          gapDays,
          gapShows,
          song.playsByYear ? JSON.stringify(song.playsByYear) : null,
          song.artistStats ? JSON.stringify(song.artistStats) : null,
          song.topSeguesInto || song.topSegues
            ? JSON.stringify(song.topSeguesInto || song.topSegues)
            : null,
          song.topSeguesFrom ? JSON.stringify(song.topSeguesFrom) : null
        );
        importCount++;
      } catch (err) {
        console.log(
          `Warning: Failed to import stats for song "${song.title}": ${(err as Error).message}`
        );
        skippedCount++;
      }
    }

    console.log(`Imported ${importCount} song statistics, skipped ${skippedCount}`);
  });

  importAll();

  // Also update songs table with total performances and slot counts
  console.log("Updating songs with performance counts...");
  const updateSong = db.prepare(`
    UPDATE songs SET
      total_performances = COALESCE(?, total_performances),
      opener_count = ?,
      closer_count = ?,
      encore_count = ?
    WHERE id = ?
  `);

  const updateSongs = db.transaction(() => {
    let updated = 0;
    for (const song of songs) {
      if (!song.title) continue;
      const songId =
        songMap.get(song.title.toLowerCase()) ||
        songMap.get(song.title.replace(/^["']|["']$/g, "").toLowerCase());
      if (!songId) continue;

      const slots = song.slotBreakdown || {};
      const totalPlays = song.totalPlays || song.knownPlays || 0;

      if (totalPlays > 0) {
        updateSong.run(totalPlays, slots.opener || 0, slots.closer || 0, slots.encore || 0, songId);
        updated++;
      }
    }
    console.log(`Updated ${updated} songs with performance counts`);
  });

  updateSongs();
}

async function importLiberationList(songMap: Map<string, number>): Promise<void> {
  console.log("Importing liberation list from scraped data...");

  const data = loadJsonFile<{ entries: ScrapedLiberationEntry[] }>("liberation.json");
  if (!data?.entries) {
    console.log("No liberation data to import");
    return;
  }

  const db = getDb();

  // First clear existing liberation list
  run(`DELETE FROM liberation_list`);

  // Add the new columns if they don't exist (for backward compatibility)
  try {
    run(`ALTER TABLE liberation_list ADD COLUMN configuration TEXT`);
  } catch {
    // Column already exists
  }
  try {
    run(`ALTER TABLE liberation_list ADD COLUMN is_liberated INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }
  try {
    run(`ALTER TABLE liberation_list ADD COLUMN liberated_date TEXT`);
  } catch {
    // Column already exists
  }
  try {
    run(`ALTER TABLE liberation_list ADD COLUMN liberated_show_id INTEGER`);
  } catch {
    // Column already exists
  }

  const insertLiberation = db.prepare(`
    INSERT INTO liberation_list (
      song_id, last_played_date, last_played_show_id, days_since, shows_since,
      notes, configuration, is_liberated, liberated_date, liberated_show_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Build a show lookup map by original ID
  const showLookup = new Map<string, number>();
  const shows = db.prepare(`SELECT id, date FROM shows`).all() as Array<{
    id: number;
    date: string;
  }>;
  shows.forEach((show) => {
    // Index by date for fallback matching
    showLookup.set(show.date, show.id);
  });

  const importAll = db.transaction(() => {
    let importCount = 0;
    let skippedCount = 0;

    for (const entry of data.entries) {
      // Find song by title
      const songId = songMap.get(entry.songTitle.toLowerCase());
      if (!songId) {
        console.log(`Warning: Song not found for liberation entry: "${entry.songTitle}"`);
        skippedCount++;
        continue;
      }

      // Find show ID - try to match by date from the last_played_date
      let lastPlayedShowId: number | null = null;
      if (entry.lastPlayedDate) {
        lastPlayedShowId = showLookup.get(entry.lastPlayedDate) || null;
      }

      // If we can't find the show, use a placeholder (first show)
      if (!lastPlayedShowId) {
        const firstShow = db.prepare(`SELECT id FROM shows ORDER BY date LIMIT 1`).get() as
          | { id: number }
          | undefined;
        lastPlayedShowId = firstShow?.id || 1;
      }

      // Find liberated show ID if applicable
      let liberatedShowId: number | null = null;
      if (entry.isLiberated && entry.liberatedDate) {
        liberatedShowId = showLookup.get(entry.liberatedDate) || null;
      }

      try {
        insertLiberation.run(
          songId,
          entry.lastPlayedDate,
          lastPlayedShowId,
          entry.daysSince,
          entry.showsSince,
          entry.notes || null,
          entry.configuration || null,
          entry.isLiberated ? 1 : 0,
          entry.liberatedDate || null,
          liberatedShowId
        );
        importCount++;
      } catch (err) {
        console.log(
          `Warning: Failed to import liberation entry for "${entry.songTitle}": ${(err as Error).message}`
        );
        skippedCount++;
      }
    }

    console.log(`Imported ${importCount} liberation list entries, skipped ${skippedCount}`);
  });

  importAll();
}

async function importCuratedLists(): Promise<void> {
  console.log("Importing curated lists...");

  const data = loadJsonFile<{ lists: ScrapedCuratedList[] }>("lists.json");
  if (!data?.lists) {
    console.log("No curated lists to import");
    return;
  }

  const db = getDb();

  const insertList = db.prepare(`
    INSERT INTO curated_lists (original_id, title, slug, category, description, item_count)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      category = excluded.category,
      description = excluded.description,
      item_count = excluded.item_count,
      updated_at = CURRENT_TIMESTAMP
  `);

  const insertItem = db.prepare(`
    INSERT INTO curated_list_items (list_id, position, item_type, show_id, song_id, venue_id, guest_id, release_id, item_title, item_link, notes, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Clear existing list items to avoid duplicates on re-import
  run(`DELETE FROM curated_list_items`);

  const importAll = db.transaction(() => {
    let listCount = 0;
    let itemCount = 0;
    let skippedLists = 0;

    for (const list of data.lists) {
      if (!list.title || !list.slug) {
        skippedLists++;
        continue;
      }

      // Validate and sanitize the item type - matches CHECK constraint in schema
      const validItemTypes = ["show", "song", "venue", "release", "guest", "text"];

      try {
        // Insert or update the list
        const _result = insertList.run(
          list.originalId || null,
          list.title,
          list.slug,
          list.category || null,
          list.description || null,
          list.items?.length || 0
        );

        // Get the list ID - always query by slug to be safe since ON CONFLICT DO UPDATE
        // doesn't reliably return the right lastInsertRowid
        const existingList = db
          .prepare(`SELECT id FROM curated_lists WHERE slug = ?`)
          .get(list.slug) as { id: number };
        const listId = existingList.id;

        listCount++;

        // Insert list items
        for (const item of list.items || []) {
          // Normalize item type - 'text' instead of 'custom' to match schema CHECK constraint
          let itemType = item.itemType?.toLowerCase() || "text";
          if (!validItemTypes.includes(itemType)) {
            itemType = "text";
          }

          // Note: Original item IDs from scraped data don't match our database IDs
          // We store the item_link which contains the original ID for reference
          // Setting all FK references to null for now
          const showId: number | null = null;
          const songId: number | null = null;
          const venueId: number | null = null;
          const guestId: number | null = null;
          const releaseId: number | null = null;

          try {
            insertItem.run(
              listId,
              item.position,
              itemType,
              showId,
              songId,
              venueId,
              guestId,
              releaseId,
              item.itemTitle || "Unknown",
              item.itemLink || null,
              item.notes || null,
              item.metadata ? JSON.stringify(item.metadata) : null
            );
            itemCount++;
          } catch (itemErr) {
            // Log first few item errors to debug
            if (itemCount < 3) {
              console.log(
                `  Item error for list ${listId}, pos ${item.position}: ${(itemErr as Error).message}`
              );
            }
          }
        }
      } catch (err) {
        console.log(`Warning: Failed to import list "${list.title}": ${(err as Error).message}`);
        skippedLists++;
      }
    }

    console.log(
      `Imported ${listCount} curated lists with ${itemCount} items, skipped ${skippedLists} lists`
    );
  });

  importAll();
}

async function importVenueAliases(venueMap: Map<string, number>): Promise<void> {
  console.log("Importing venue aliases...");

  // Try venue-stats.json first, then fall back to venues.json
  let data = loadJsonFile<{ venues: ScrapedVenueWithAliases[] }>("venue-stats.json");
  if (!data?.venues) {
    data = loadJsonFile<{ venues: ScrapedVenueWithAliases[] }>("venues.json");
  }

  if (!data?.venues) {
    console.log("No venue data to import aliases from");
    return;
  }

  const db = getDb();

  const insertAlias = db.prepare(`
    INSERT INTO venue_aliases (venue_id, alias_name, is_primary, years_used)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(venue_id, alias_name) DO UPDATE SET
      is_primary = excluded.is_primary,
      years_used = excluded.years_used
  `);

  const importAll = db.transaction(() => {
    let aliasCount = 0;
    let skippedCount = 0;

    for (const venue of data.venues) {
      if (!venue.aliases || venue.aliases.length === 0) {
        continue;
      }

      // Find venue by composite key
      const venueKey =
        `${venue.name}|${venue.city}|${venue.state || ""}|${venue.country}`.toLowerCase();
      let venueId = venueMap.get(venueKey);

      // If not found by composite key, try to find by name and city
      if (!venueId) {
        const existingVenue = db
          .prepare(`
          SELECT id FROM venues
          WHERE LOWER(name) = LOWER(?) AND LOWER(city) = LOWER(?)
          LIMIT 1
        `)
          .get(venue.name, venue.city) as { id: number } | undefined;

        venueId = existingVenue?.id;
      }

      if (!venueId) {
        console.log(`Warning: Venue not found for aliases: "${venue.name}" in ${venue.city}`);
        skippedCount++;
        continue;
      }

      // Import each alias
      for (const alias of venue.aliases) {
        if (!alias.name || alias.name.trim() === "") {
          continue;
        }

        // Determine if this is the primary alias
        const isPrimary = alias.type?.toLowerCase() === "primary" ? 1 : 0;

        // Build years_used from startDate and endDate if available
        let yearsUsed: string | null = null;
        if (alias.startDate || alias.endDate) {
          yearsUsed = `${alias.startDate || "?"}-${alias.endDate || "?"}`;
        }

        try {
          insertAlias.run(venueId, alias.name.trim(), isPrimary, yearsUsed);
          aliasCount++;
        } catch (_err) {}
      }
    }

    console.log(
      `Imported ${aliasCount} venue aliases, skipped ${skippedCount} venues with missing references`
    );
  });

  importAll();
}

async function main(): Promise<void> {
  console.log("Starting data import...\n");

  // Initialize database
  initializeDb();

  try {
    // Import in order (respecting foreign keys)
    const venueMap = await importVenues();
    const songMap = await importSongs();
    const guestMap = await importGuests();
    const tourMap = await importTours();
    await importShows(venueMap, songMap, guestMap, tourMap);

    // Import releases (depends on songs)
    await importReleases(songMap);

    // Update derived counts
    await updateCounts();

    // Update date fields based on actual show data
    updateSongDates();
    updateGuestDates();

    // Update show and tour statistics
    updateShowSongCounts();
    updateTourStats();

    // Import extended song statistics (depends on songs)
    await importSongStatistics(songMap);

    // Import liberation list from scraped data (replaces populateLiberationList)
    await importLiberationList(songMap);

    // Import curated lists (independent of other data)
    await importCuratedLists();

    // Import venue aliases (depends on venues)
    await importVenueAliases(venueMap);

    console.log("\nImport complete!");
  } finally {
    closeDb();
  }
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
