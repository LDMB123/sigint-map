/**
 * Web Share API utilities for sharing shows, songs, venues
 */

export interface ShareData {
  title: string;
  text?: string;
  url: string;
}

/**
 * Check if Web Share API is supported
 */
export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Check if we can share files (images, etc.)
 */
export function canShareFiles(): boolean {
  return isShareSupported() && 'canShare' in navigator;
}

/**
 * Share content using Web Share API
 * Falls back to clipboard copy on unsupported browsers
 */
export async function share(data: ShareData): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'failed' }> {
  if (isShareSupported()) {
    try {
      await navigator.share(data);
      return { success: true, method: 'share' };
    } catch (error) {
      // User cancelled or share failed
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn('[Share] Share failed:', error);
      }
    }
  }

  // Fallback: copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(data.url);
      return { success: true, method: 'clipboard' };
    } catch (error) {
      console.warn('[Share] Clipboard fallback failed:', error);
    }
  }

  return { success: false, method: 'failed' };
}

// Pre-built share functions for common entities
export function shareShow(showDate: string, venueName: string, showId: number): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'failed' }> {
  return share({
    title: `DMB at ${venueName} - ${showDate}`,
    text: `Check out this Dave Matthews Band show from ${showDate}!`,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/shows/${showId}`
  });
}

export function shareSong(songTitle: string, songSlug: string): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'failed' }> {
  return share({
    title: `${songTitle} - DMB Almanac`,
    text: `Learn about "${songTitle}" by Dave Matthews Band`,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/songs/${songSlug}`
  });
}

export function shareVenue(venueName: string, venueId: number): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'failed' }> {
  return share({
    title: `${venueName} - DMB Almanac`,
    text: `See all DMB shows at ${venueName}`,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/venues/${venueId}`
  });
}
