/**
 * Share Target Parser for DMB Almanac PWA
 *
 * Intelligently parses shared text/URLs to extract DMB-related content:
 * - Show dates (YYYY-MM-DD)
 * - Song titles
 * - Venue names
 * - Direct app URLs
 *
 * Used by the Web Share Target API to process incoming shares.
 */

export interface ParsedShareContent {
	type: 'show' | 'song' | 'venue' | 'search' | 'unknown';
	value: string;
	originalText: string;
	confidence: 'high' | 'medium' | 'low';
}

/**
 * Regular expressions for parsing shared content
 */
const PATTERNS = {
	// Show date formats
	// YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY, Month DD, YYYY
	isoDate: /\b(\d{4})-(\d{2})-(\d{2})\b/,
	usDate: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,
	longDate: /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,

	// DMB-specific URLs
	dmbAlmanacUrl: /dmbalmanac\.com\/show\/([^\/\s?#]+)/i,
	appUrl: /\/shows\/([^\/\s?#]+)/i,

	// Common venue patterns
	venue: /\b(?:at|@)\s+([A-Z][A-Za-z\s&'.(),-]{3,50})/,
	gorge: /\b(the\s+)?gorge\b/i,
	spac: /\bspac\b/i,
	redRocks: /\bred\s+rocks?\b/i,
	alpine: /\balpine\s+valley\b/i,
	msg: /\bmsg\b|\bmadison\s+square\s+garden\b/i,

	// Song title patterns (quoted or in setlist)
	quotedSong: /"([^"]{2,50})"/,
	setlistSong: /\b(Crash Into Me|Ants Marching|Two Step|Warehouse|Satellite|Grey Street|The Stone|Lie In Our Graves|Tripping Billies|Jimi Thing|Bartender|Lover Lay Down|Dancing Nancies|#41|Recently|So Much to Say)\b/i
} as const;

/**
 * Month name to number mapping
 */
const MONTH_MAP: Record<string, number> = {
	jan: 1, january: 1,
	feb: 2, february: 2,
	mar: 3, march: 3,
	apr: 4, april: 4,
	may: 5,
	jun: 6, june: 6,
	jul: 7, july: 7,
	aug: 8, august: 8,
	sep: 9, september: 9,
	oct: 10, october: 10,
	nov: 11, november: 11,
	dec: 12, december: 12
};

/**
 * Normalize date string to YYYY-MM-DD format
 */
function normalizeDate(year: string, month: string, day: string): string {
	const y = parseInt(year, 10);
	const m = parseInt(month, 10);
	const d = parseInt(day, 10);

	// Validate date ranges
	if (y < 1991 || y > 2100) return '';
	if (m < 1 || m > 12) return '';
	if (d < 1 || d > 31) return '';

	// Format as YYYY-MM-DD
	return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

/**
 * Parse show date from various formats
 */
function parseShowDate(text: string): { date: string; confidence: 'high' | 'medium' } | null {
	// Try ISO format first (highest confidence)
	const isoMatch = text.match(PATTERNS.isoDate);
	if (isoMatch) {
		const [, year, month, day] = isoMatch;
		const normalized = normalizeDate(year, month, day);
		if (normalized) {
			return { date: normalized, confidence: 'high' };
		}
	}

	// Try long date format (e.g., "September 13, 2024")
	const longMatch = text.match(PATTERNS.longDate);
	if (longMatch) {
		const [, monthName, day, year] = longMatch;
		const month = MONTH_MAP[monthName.toLowerCase()];
		if (month) {
			const normalized = normalizeDate(year, month.toString(), day);
			if (normalized) {
				return { date: normalized, confidence: 'high' };
			}
		}
	}

	// Try US date format (MM/DD/YYYY or MM-DD-YYYY)
	const usMatch = text.match(PATTERNS.usDate);
	if (usMatch) {
		const [, month, day, year] = usMatch;
		const normalized = normalizeDate(year, month, day);
		if (normalized) {
			return { date: normalized, confidence: 'medium' };
		}
	}

	return null;
}

/**
 * Extract DMB Almanac show ID from URL
 */
function parseAlmanacUrl(text: string): string | null {
	const match = text.match(PATTERNS.dmbAlmanacUrl);
	if (match) {
		return match[1]; // Return the show ID/date
	}

	const appMatch = text.match(PATTERNS.appUrl);
	if (appMatch) {
		return appMatch[1]; // Return the show ID/date
	}

	return null;
}

/**
 * Extract venue name from text
 */
function parseVenue(text: string): string | null {
	// Check for known venues first
	if (PATTERNS.gorge.test(text)) return 'The Gorge Amphitheatre';
	if (PATTERNS.spac.test(text)) return 'SPAC';
	if (PATTERNS.redRocks.test(text)) return 'Red Rocks';
	if (PATTERNS.alpine.test(text)) return 'Alpine Valley';
	if (PATTERNS.msg.test(text)) return 'Madison Square Garden';

	// Try to extract venue from "at/@ <venue>" pattern
	const venueMatch = text.match(PATTERNS.venue);
	if (venueMatch) {
		return venueMatch[1].trim();
	}

	return null;
}

/**
 * Extract song title from text
 */
function parseSong(text: string): string | null {
	// Try quoted song first
	const quotedMatch = text.match(PATTERNS.quotedSong);
	if (quotedMatch) {
		return quotedMatch[1];
	}

	// Try known song titles
	const songMatch = text.match(PATTERNS.setlistSong);
	if (songMatch) {
		return songMatch[1];
	}

	return null;
}

/**
 * Main parser function - analyzes shared content and determines best match
 */
export function parseShareContent(text: string): ParsedShareContent {
	if (!text || typeof text !== 'string') {
		return {
			type: 'unknown',
			value: '',
			originalText: '',
			confidence: 'low'
		};
	}

	const trimmed = text.trim();

	// Priority 1: Direct URL match (highest confidence)
	const urlMatch = parseAlmanacUrl(trimmed);
	if (urlMatch) {
		// Could be a show date or other identifier
		if (/^\d{4}-\d{2}-\d{2}$/.test(urlMatch)) {
			return {
				type: 'show',
				value: urlMatch,
				originalText: trimmed,
				confidence: 'high'
			};
		}
		// If it's not a date, use as search query
		return {
			type: 'search',
			value: urlMatch,
			originalText: trimmed,
			confidence: 'high'
		};
	}

	// Priority 2: Show date (high confidence)
	const dateMatch = parseShowDate(trimmed);
	if (dateMatch) {
		return {
			type: 'show',
			value: dateMatch.date,
			originalText: trimmed,
			confidence: dateMatch.confidence
		};
	}

	// Priority 3: Song title (medium confidence)
	const songMatch = parseSong(trimmed);
	if (songMatch) {
		return {
			type: 'song',
			value: songMatch,
			originalText: trimmed,
			confidence: 'medium'
		};
	}

	// Priority 4: Venue name (medium confidence)
	const venueMatch = parseVenue(trimmed);
	if (venueMatch) {
		return {
			type: 'venue',
			value: venueMatch,
			originalText: trimmed,
			confidence: 'medium'
		};
	}

	// Priority 5: Fallback to search
	return {
		type: 'search',
		value: trimmed,
		originalText: trimmed,
		confidence: 'low'
	};
}

/**
 * Generate target URL from parsed content
 */
export function getTargetUrl(parsed: ParsedShareContent): string {
	switch (parsed.type) {
		case 'show':
			return `/shows/${parsed.value}`;
		case 'song':
			// Convert to slug format (lowercase, hyphenated)
			const slug = parsed.value
				.toLowerCase()
				.replace(/[^a-z0-9\s-]/g, '')
				.replace(/\s+/g, '-')
				.replace(/-+/g, '-');
			return `/songs/${slug}`;
		case 'venue':
			return `/search?q=${encodeURIComponent(parsed.value)}`;
		case 'search':
		case 'unknown':
		default:
			return `/search?q=${encodeURIComponent(parsed.value)}`;
	}
}

/**
 * Get user-friendly description of parsed content
 */
export function getShareDescription(parsed: ParsedShareContent): string {
	switch (parsed.type) {
		case 'show':
			return `Viewing show from ${parsed.value}`;
		case 'song':
			return `Searching for song: ${parsed.value}`;
		case 'venue':
			return `Searching for venue: ${parsed.value}`;
		case 'search':
			return `Searching for: ${parsed.value}`;
		case 'unknown':
		default:
			return 'Processing shared content...';
	}
}
