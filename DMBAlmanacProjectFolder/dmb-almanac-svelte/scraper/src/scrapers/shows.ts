import * as cheerio from "cheerio";
import {
  ScrapedShow,
  ScrapedSetlistEntry,
  ScrapedGuestAppearance,
  ScrapedTour,
} from "../types.js";
import { delay } from "../utils/rate-limit.js";
import { cacheHtml, getCachedHtml } from "../utils/cache.js";
import { normalizeWhitespace } from "../utils/helpers.js";
import { BaseScraper } from "../base/BaseScraper.js";
import { Page } from "playwright";

// Band member guest IDs to filter out from guest appearances
const BAND_MEMBER_GIDS = [
  "1",   // Dave Matthews
  "2",   // Carter Beauford
  "94",  // LeRoi Moore
  "75",  // Stefan Lessard
  "104", // Boyd Tinsley
  "3",   // Jeff Coffin
  "ds"   // Dave solo
];

export class ShowsScraper extends BaseScraper<ScrapedShow> {
  constructor() {
    super({
      name: "shows",
      baseUrl: "https://www.dmbalmanac.com",
      concurrency: 2,
      intervalCap: 5,
      interval: 10000,
    });
  }

  // Get list of all tour years - DMB has toured from 1991 to present
  private async getTourYears(): Promise<ScrapedTour[]> {
    console.log("Generating tour years (1991-present)...");

    const currentYear = new Date().getFullYear();
    const tours: ScrapedTour[] = [];

    // DMB has toured every year from 1991 to present
    for (let year = 1991; year <= currentYear; year++) {
      tours.push({
        name: `${year} Tour`,
        year,
        showCount: 0,
        showUrls: [],
      });
    }

    console.log(`Generated ${tours.length} tour years (1991-${currentYear})`);
    return tours;
  }

  // Get all show URLs for a specific tour year
  private async getShowUrlsForTour(tourYear: number): Promise<string[]> {
    console.log(`Fetching show URLs for ${tourYear}...`);

    if (!this.page) throw new Error("Page not initialized");

    const url = `${this.config.baseUrl}/TourShow.aspx?where=${tourYear}`;

    try {
      await this.page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    } catch (error) {
      console.error(`Failed to load ${url}:`, error);
      return [];
    }

    const html = await this.page.content();
    const $ = cheerio.load(html);

    const showUrls: string[] = [];

    // Find show links - look for links to individual show pages with 'id=' parameter
    $("a[href*='TourShowSet.aspx'][href*='id=']").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("id=")) {
        // Build full URL properly
        let fullUrl = href;
        if (!href.startsWith("http")) {
          if (href.startsWith("./")) {
            fullUrl = `${this.config.baseUrl}/${href.slice(2)}`;
          } else if (href.startsWith("/")) {
            fullUrl = `${this.config.baseUrl}${href}`;
          } else {
            fullUrl = `${this.config.baseUrl}/${href}`;
          }
        }

        if (!showUrls.includes(fullUrl)) {
          showUrls.push(fullUrl);
        }
      }
    });

    console.log(`Found ${showUrls.length} shows for ${tourYear}`);
    return showUrls;
  }

  // Parse a single show page
  private async parseShowPage(showUrl: string): Promise<ScrapedShow | null> {
    try {
      if (!this.page) throw new Error("Page not initialized");

      // Check cache first
      let html = getCachedHtml(showUrl);

      if (!html) {
        await this.page.goto(showUrl, { waitUntil: "networkidle" });
        html = await this.page.content();
        cacheHtml(showUrl, html);
      }

      const $ = cheerio.load(html);

      // Extract show ID from URL (use 'id=' parameter, not 'tid=')
      const idMatch = showUrl.match(/id=(\d+)/);
      const originalId = idMatch ? idMatch[1] : "";

      // Parse show date
      let dateStr = "";
      const dateOption = $("select option:selected").filter((i, el) => {
        const text = $(el).text();
        return /\d{2}\.\d{2}\.\d{4}/.test(text);
      }).first();

      if (dateOption.length) {
        const rawDate = dateOption.text().trim();
        // Convert MM.DD.YYYY to YYYY-MM-DD
        const dateMatch = rawDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (dateMatch) {
          const [, month, day, year] = dateMatch;
          dateStr = `${year}-${month}-${day}`;
        }
      }

      // Parse venue info
      let venueName = "";
      let city = "";
      let state = "";
      let country = "USA";

      const venueLink = $("a").filter((i, el) => {
        const onclick = $(el).attr("onclick") || "";
        return onclick.includes("VenueStats.aspx");
      }).first();

      if (venueLink.length) {
        venueName = normalizeWhitespace(venueLink.text());

        // Extract location from text after venue link
        const venueParent = venueLink.parent();
        const locationText = venueParent.text();
        const afterVenue = locationText.split(venueName)[1] || "";

        // Match "City, ST" or "City, ST, Country" pattern
        const locationMatch = afterVenue.match(/([^,]+),\s*([A-Z]{2})(?:,\s*(.+))?/);
        if (locationMatch) {
          city = locationMatch[1].trim();
          state = locationMatch[2].trim();
          country = locationMatch[3]?.trim() || "USA";
        }
      }

      // Extract tour year
      const tourYear = dateStr ? parseInt(dateStr.substring(0, 4), 10) : new Date().getFullYear();

      // Parse setlist
      const setlist: ScrapedSetlistEntry[] = [];
      let currentSet = "set1";

      const setTable = $("#SetTable");
      setTable.find("tr").each((_, row) => {
        const $row = $(row);

        // Skip header row
        if ($row.find(".setcolumn").length > 0) return;

        // Find song link
        const songLink = $row.find("td.setheadercell a.lightorange").first();

        if (songLink.length > 0) {
          const songTitle = normalizeWhitespace(songLink.text());

          // Get position from first cell
          const positionCell = $row.find("td.setheadercell").first();
          const position = parseInt(positionCell.text().trim(), 10);

          // Determine slot based on bgcolor
          const bgColor = positionCell.attr("bgcolor") || "";
          let slot: "opener" | "closer" | "standard" = "standard";
          if (bgColor === "#006666") {
            slot = "opener"; // Set opener (teal)
          } else if (bgColor === "#214263" || bgColor === "#336699") {
            slot = "closer"; // Set closer (blue variations)
          } else if (bgColor === "#660000" || bgColor === "#CC0000") {
            // Encore - track set change
            if (currentSet === "set1") currentSet = "set2";
            if (currentSet === "set2") currentSet = "encore";
          } else if (bgColor === "#004040") {
            currentSet = "set2"; // Set 2 opener
            slot = "opener";
          }

          // Get duration from third column
          const durationCell = $row.find("td.setcell").eq(0);
          const durationText = normalizeWhitespace(durationCell.text());
          const duration = durationText && durationText !== "&nbsp;" ? durationText : undefined;

          // Check for release icon in notes
          const notesCell = $row.find("td.endcell");
          const notesText = notesCell.text().trim();
          const hasRelease = $row.find("img[src*='cd'], img[src*='cast']").length > 0;

          // Find guest names
          const personnelCell = $row.find("td.setcell").filter((i, td) => {
            const id = $(td).attr("id") || "";
            return id.startsWith("personnelcell_");
          });

          const guestNames: string[] = [];
          personnelCell.find("a[href*='TourGuestShows.aspx']").each((_, guestLink) => {
            const href = $(guestLink).attr("href") || "";
            const gidMatch = href.match(/gid=([^&]+)/);
            if (gidMatch) {
              const gid = gidMatch[1];
              // Filter out band members
              if (!BAND_MEMBER_GIDS.includes(gid)) {
                guestNames.push(normalizeWhitespace($(guestLink).text()));
              }
            }
          });

          // Check for segue
          const setitemSpan = $row.find("span.setitem");
          const setitemContent = setitemSpan.text().trim();
          const isSegue = setitemContent.includes("»") || setitemContent.includes(">>");

          // Check for segue target in notes
          let segueIntoTitle: string | undefined;
          if (isSegue && notesText) {
            const segueMatch = notesText.match(/[→>]\s*(.+)/);
            segueIntoTitle = segueMatch ? normalizeWhitespace(segueMatch[1]) : undefined;
          }

          // Check for tease
          const isTease = notesText.toLowerCase().includes("tease");

          setlist.push({
            songTitle,
            position,
            set: currentSet,
            slot,
            duration,
            isSegue,
            segueIntoTitle,
            isTease,
            teaseOfTitle: undefined,
            hasRelease,
            releaseTitle: undefined,
            guestNames,
            notes: notesText || undefined,
          });
        }
      });

      // Post-process setlist
      for (let i = 0; i < setlist.length; i++) {
        const entry = setlist[i];

        // If this song has a segue but no target song name, use the next song
        if (entry.isSegue && !entry.segueIntoTitle && i + 1 < setlist.length) {
          entry.segueIntoTitle = setlist[i + 1].songTitle;
        }
      }

      // Mark last song of each set as closer
      const setGroups = new Map<string, ScrapedSetlistEntry[]>();
      for (const entry of setlist) {
        const entries = setGroups.get(entry.set) || [];
        entries.push(entry);
        setGroups.set(entry.set, entries);
      }
      for (const entries of setGroups.values()) {
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          if (lastEntry.slot === "standard") {
            lastEntry.slot = "closer";
          }
        }
      }

      // Parse guest appearances
      const guests: ScrapedGuestAppearance[] = [];
      $("a[href*='TourGuestShows.aspx']").each((_, guestLink) => {
        const href = $(guestLink).attr("href") || "";
        const gidMatch = href.match(/gid=([^&]+)/);
        if (gidMatch) {
          const gid = gidMatch[1];
          // Filter out band members
          if (!BAND_MEMBER_GIDS.includes(gid)) {
            const name = normalizeWhitespace($(guestLink).text());
            if (name && !guests.find((guest) => guest.name === name)) {
              guests.push({
                name,
                instruments: [],
                songs: [],
              });
            }
          }
        }
      });

      // Parse notes and soundcheck
      const notesText = $(".show-notes, .notes").text();
      const soundcheckMatch = notesText.match(/soundcheck:?\s*(.+)/i);

      return {
        originalId,
        date: dateStr,
        venueName,
        city,
        state,
        country,
        tourYear,
        notes: notesText ? normalizeWhitespace(notesText) : undefined,
        soundcheck: soundcheckMatch ? normalizeWhitespace(soundcheckMatch[1]) : undefined,
        setlist,
        guests,
      };
    } catch (error) {
      console.error(`Error parsing show ${showUrl}:`, error);
      return null;
    }
  }

  // Implementation of abstract scrape method
  async scrape(): Promise<ScrapedShow[]> {
    console.log("Starting show scraper...");

    // Get all tour years
    const tours = await this.getTourYears();

    // Check for existing checkpoint
    const checkpoint = this.loadCheckpoint<{
      completedYears: number[];
      shows: ScrapedShow[];
    }>("shows");

    const completedYears = checkpoint?.completedYears || [];
    const allShows: ScrapedShow[] = checkpoint?.shows || [];

    // Process each tour year
    for (const tour of tours) {
      if (completedYears.includes(tour.year)) {
        console.log(`Skipping ${tour.year} (already completed)`);
        continue;
      }

      console.log(`\nProcessing ${tour.year}...`);

      // Get show URLs for this tour
      const showUrls = await this.getShowUrlsForTour(tour.year);
      tour.showUrls = showUrls;
      tour.showCount = showUrls.length;

      // Parse each show
      for (const showUrl of showUrls) {
        await this.withRateLimit(async () => {
          const show = await this.parseShowPage(showUrl);
          if (show) {
            allShows.push(show);
            console.log(`  Parsed: ${show.date} - ${show.venueName}`);
          }
        });
      }

      // Save checkpoint after each year
      completedYears.push(tour.year);
      this.saveCheckpoint("shows", { completedYears, shows: allShows });

      console.log(`Completed ${tour.year}: ${allShows.length} total shows`);
      await delay(5000); // Extra delay between years
    }

    return allShows;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scraper = new ShowsScraper();
  scraper.run()
    .then(() => console.log("Done!"))
    .catch((error) => {
      console.error("Scraper failed:", error);
      process.exit(1);
    });
}

// WRAPPER EXPORTS FOR ORCHESTRATOR COMPATIBILITY
export async function scrapeAllShows(): Promise<ScrapedShow[]> {
  return new ShowsScraper().run();
}

export function saveShows(_shows: ScrapedShow[]): void {
  // ShowsScraper.run() handles saving internally
  console.log("Shows saved by scraper class.");
}
