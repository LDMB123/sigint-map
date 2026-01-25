/**
 * Share Parser Tests
 *
 * Test cases for the share target content parser.
 * These demonstrate the supported formats and expected behavior.
 */

import { describe, it, expect } from 'vitest';
import { parseShareContent, getTargetUrl, getShareDescription } from '$lib/utils/shareParser';

describe('parseShareContent', () => {
	describe('Show dates', () => {
		it('should parse ISO date format (YYYY-MM-DD)', () => {
			const result = parseShareContent('2024-09-13');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
			expect(result.confidence).toBe('high');
		});

		it('should parse date in text context', () => {
			const result = parseShareContent('Check out the show from 2024-09-13 at The Gorge!');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
			expect(result.confidence).toBe('high');
		});

		it('should parse long date format', () => {
			const result = parseShareContent('September 13, 2024');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
			expect(result.confidence).toBe('high');
		});

		it('should parse abbreviated month', () => {
			const result = parseShareContent('Sep 13, 2024');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
			expect(result.confidence).toBe('high');
		});

		it('should parse US date format (MM/DD/YYYY)', () => {
			const result = parseShareContent('09/13/2024');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
			expect(result.confidence).toBe('medium');
		});

		it('should parse US date format with hyphens', () => {
			const result = parseShareContent('09-13-2024');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
			expect(result.confidence).toBe('medium');
		});

		it('should reject invalid dates', () => {
			const result = parseShareContent('2024-13-45'); // Invalid month/day
			expect(result.type).not.toBe('show');
		});

		it('should reject dates before 1991 (DMB founding)', () => {
			const result = parseShareContent('1990-01-01');
			expect(result.type).not.toBe('show');
		});
	});

	describe('DMB Almanac URLs', () => {
		it('should parse dmbalmanac.com show URL', () => {
			const result = parseShareContent('https://dmbalmanac.com/show/2024-09-13');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
			expect(result.confidence).toBe('high');
		});

		it('should parse app show URL', () => {
			const result = parseShareContent('https://example.com/shows/2024-09-13');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
			expect(result.confidence).toBe('high');
		});

		it('should handle URL with query params', () => {
			const result = parseShareContent('https://dmbalmanac.com/show/2024-09-13?source=share');
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13');
		});
	});

	describe('Song titles', () => {
		it('should parse quoted song title', () => {
			const result = parseShareContent('Check out "Crash Into Me" from last night!');
			expect(result.type).toBe('song');
			expect(result.value).toBe('Crash Into Me');
			expect(result.confidence).toBe('medium');
		});

		it('should parse known song title', () => {
			const result = parseShareContent('Amazing performance of Two Step tonight!');
			expect(result.type).toBe('song');
			expect(result.value).toBe('Two Step');
			expect(result.confidence).toBe('medium');
		});

		it('should match case-insensitive song titles', () => {
			const result = parseShareContent('they played ANTS MARCHING as the opener');
			expect(result.type).toBe('song');
			// Note: returns matched text as-is (not normalized case)
			expect(result.value).toBe('ANTS MARCHING');
			expect(result.confidence).toBe('medium');
		});
	});

	describe('Venue names', () => {
		it('should parse The Gorge', () => {
			const result = parseShareContent('Heading to The Gorge this weekend!');
			expect(result.type).toBe('venue');
			expect(result.value).toBe('The Gorge Amphitheatre');
			expect(result.confidence).toBe('medium');
		});

		it('should parse SPAC', () => {
			const result = parseShareContent('Can\'t wait for SPAC shows!');
			expect(result.type).toBe('venue');
			expect(result.value).toBe('SPAC');
			expect(result.confidence).toBe('medium');
		});

		it('should parse Red Rocks', () => {
			const result = parseShareContent('Red Rocks was incredible');
			expect(result.type).toBe('venue');
			expect(result.value).toBe('Red Rocks');
			expect(result.confidence).toBe('medium');
		});

		it('should parse venue with "at" pattern', () => {
			const result = parseShareContent('Great show at Madison Square Garden');
			expect(result.type).toBe('venue');
			expect(result.value).toBe('Madison Square Garden');
			expect(result.confidence).toBe('medium');
		});

		it('should parse venue with @ symbol', () => {
			const result = parseShareContent('Tonight @ Alpine Valley');
			expect(result.type).toBe('venue');
			expect(result.value).toBe('Alpine Valley');
			expect(result.confidence).toBe('medium');
		});
	});

	describe('Search fallback', () => {
		it('should fallback to search for generic text', () => {
			const result = parseShareContent('Dave Matthews Band tour dates');
			expect(result.type).toBe('search');
			expect(result.value).toBe('Dave Matthews Band tour dates');
			expect(result.confidence).toBe('low');
		});

		it('should handle empty string', () => {
			const result = parseShareContent('');
			expect(result.type).toBe('unknown');
			expect(result.value).toBe('');
		});

		it('should handle whitespace-only string', () => {
			const result = parseShareContent('   ');
			// Whitespace trims to empty string, falls back to search
			expect(result.type).toBe('search');
			expect(result.value).toBe('');
		});
	});

	describe('Priority ordering', () => {
		it('should prioritize URL over date in text', () => {
			const result = parseShareContent(
				'Check this out: https://dmbalmanac.com/show/2024-09-13 from September 14, 2024'
			);
			expect(result.type).toBe('show');
			expect(result.value).toBe('2024-09-13'); // URL date, not text date
			expect(result.confidence).toBe('high');
		});

		it('should prioritize date over song', () => {
			const result = parseShareContent('Two Step from 2024-09-13 was amazing!');
			expect(result.type).toBe('show'); // Date takes priority over song
			expect(result.value).toBe('2024-09-13');
		});

		it('should prioritize song over venue when no date', () => {
			const result = parseShareContent('"Ants Marching" at The Gorge');
			expect(result.type).toBe('song'); // Song takes priority over venue
			expect(result.value).toBe('Ants Marching');
		});
	});
});

describe('getTargetUrl', () => {
	it('should generate show URL', () => {
		const parsed = { type: 'show' as const, value: '2024-09-13', originalText: '', confidence: 'high' as const };
		expect(getTargetUrl(parsed)).toBe('/shows/2024-09-13');
	});

	it('should generate song URL with slug', () => {
		const parsed = { type: 'song' as const, value: 'Crash Into Me', originalText: '', confidence: 'medium' as const };
		expect(getTargetUrl(parsed)).toBe('/songs/crash-into-me');
	});

	it('should handle special characters in song slugs', () => {
		const parsed = { type: 'song' as const, value: '#41', originalText: '', confidence: 'medium' as const };
		expect(getTargetUrl(parsed)).toBe('/songs/41');
	});

	it('should generate search URL for venue', () => {
		const parsed = { type: 'venue' as const, value: 'The Gorge', originalText: '', confidence: 'medium' as const };
		expect(getTargetUrl(parsed)).toBe('/search?q=The%20Gorge');
	});

	it('should generate search URL for unknown', () => {
		const parsed = { type: 'unknown' as const, value: 'test', originalText: '', confidence: 'low' as const };
		expect(getTargetUrl(parsed)).toBe('/search?q=test');
	});
});

describe('getShareDescription', () => {
	it('should describe show parsing', () => {
		const parsed = { type: 'show' as const, value: '2024-09-13', originalText: '', confidence: 'high' as const };
		expect(getShareDescription(parsed)).toContain('2024-09-13');
	});

	it('should describe song parsing', () => {
		const parsed = { type: 'song' as const, value: 'Crash Into Me', originalText: '', confidence: 'medium' as const };
		expect(getShareDescription(parsed)).toContain('Crash Into Me');
	});

	it('should describe venue parsing', () => {
		const parsed = { type: 'venue' as const, value: 'SPAC', originalText: '', confidence: 'medium' as const };
		expect(getShareDescription(parsed)).toContain('SPAC');
	});
});

/**
 * Integration test examples showing real-world share scenarios
 */
describe('Real-world share scenarios', () => {
	it('should handle Twitter/X share of show', () => {
		const text = 'Just saw DMB at The Gorge! 2024-09-13 was epic! #DMB';
		const result = parseShareContent(text);
		expect(result.type).toBe('show');
		expect(result.value).toBe('2024-09-13');
	});

	it('should handle SMS share with casual date', () => {
		const text = 'Dude, check out the setlist from Sep 13, 2024';
		const result = parseShareContent(text);
		expect(result.type).toBe('show');
		expect(result.value).toBe('2024-09-13');
	});

	it('should handle copied URL from browser', () => {
		const text = 'https://dmbalmanac.com/show/2024-09-13';
		const result = parseShareContent(text);
		expect(result.type).toBe('show');
		expect(getTargetUrl(result)).toBe('/shows/2024-09-13');
	});

	it('should handle song recommendation', () => {
		const text = 'You have to hear "Bartender" from the Gorge Labor Day weekend';
		const result = parseShareContent(text);
		expect(result.type).toBe('song');
		expect(result.value).toBe('Bartender');
	});

	it('should handle venue recommendation', () => {
		const text = 'Going to my first show at Red Rocks next summer!';
		const result = parseShareContent(text);
		expect(result.type).toBe('venue');
		expect(result.value).toBe('Red Rocks');
	});
});
