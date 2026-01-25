// Parse date from various formats to ISO date string
export function parseDate(dateStr: string): string {
  // Handle formats like "March 14, 1991" or "3/14/1991" or "1991-03-14"
  const cleanDate = dateStr.trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return cleanDate;
  }

  // MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
    const [month, day, year] = cleanDate.split("/").map(Number);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Month DD, YYYY format
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];

  const monthMatch = cleanDate.toLowerCase().match(
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/
  );

  if (monthMatch) {
    const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
    if (monthIndex !== -1) {
      const month = monthIndex + 1;
      const day = parseInt(monthMatch[2], 10);
      const year = parseInt(monthMatch[3], 10);
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Fallback - try native parsing
  const parsed = new Date(cleanDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  console.warn(`Could not parse date: ${dateStr}`);
  return cleanDate;
}

// Parse duration from "M:SS" or "MM:SS" format to seconds
export function parseDuration(durationStr: string): number | undefined {
  if (!durationStr || durationStr.trim() === "") return undefined;

  const match = durationStr.trim().match(/^(\d+):(\d{2})$/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }

  return undefined;
}

// Format duration from seconds to "M:SS"
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// Create URL-friendly slug from string
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

// Create sort title (remove leading articles)
export function createSortTitle(title: string): string {
  return title
    .replace(/^(the|a|an)\s+/i, "")
    .trim();
}

// Extract year from tour name or date
export function extractYear(str: string): number {
  const match = str.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : new Date().getFullYear();
}

// Normalize whitespace in string
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

// Check if string indicates a cover song
export function isCoverSong(notes: string): boolean {
  const coverIndicators = [
    "cover",
    "originally by",
    "written by",
    "traditional",
  ];
  const lower = notes.toLowerCase();
  return coverIndicators.some((indicator) => lower.includes(indicator));
}

// Parse guest instruments from string
export function parseInstruments(instrumentStr: string): string[] {
  return instrumentStr
    .split(/[,&]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}
