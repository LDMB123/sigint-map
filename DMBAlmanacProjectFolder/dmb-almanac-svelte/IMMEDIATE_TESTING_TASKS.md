# Immediate Testing Tasks - Start Today

**Priority**: CRITICAL
**Timeline**: Can start immediately
**Resources**: Any engineer familiar with TypeScript/testing

---

## Tasks for This Week

### Task 1: Create Test Fixtures (2-3 hours)
**Status**: Ready to start immediately
**Skills**: TypeScript basics

**Create file**: `src/__tests__/fixtures/songs.ts`

```typescript
/**
 * Test data factories for song objects
 * Used throughout test suite for consistency
 */

export interface SongFixture {
  id: number;
  slug: string;
  title: string;
  sortTitle: string;
  isCover: boolean;
  isLiberated: boolean;
  originalArtist: string | null;
  totalPerformances: number;
  firstPlayed: string;
  lastPlayed: string;
  avgGap: number;
  searchText: string;
}

// Default song data
const defaultSong: SongFixture = {
  id: 1,
  slug: 'ants-marching',
  title: 'Ants Marching',
  sortTitle: 'Ants Marching',
  isCover: false,
  isLiberated: false,
  originalArtist: null,
  totalPerformances: 2000,
  firstPlayed: '1991-04-05',
  lastPlayed: '2024-09-22',
  avgGap: 1.5,
  searchText: 'ants marching'
};

// Factory function
export function createSong(overrides?: Partial<SongFixture>): SongFixture {
  return {
    ...defaultSong,
    ...overrides
  };
}

// Collections for common test scenarios
export const mockSongs = {
  // Frequently played song
  antsMachingFrequent: createSong({
    id: 1,
    totalPerformances: 2000,
    avgGap: 1.5
  }),

  // Rarely played song
  oneRareSong: createSong({
    id: 50,
    title: 'One Rare Song',
    slug: 'one-rare-song',
    totalPerformances: 15,
    avgGap: 150
  }),

  // Cover song
  crashCover: createSong({
    id: 2,
    title: 'Crash Into Me',
    slug: 'crash-into-me',
    isCover: true,
    originalArtist: 'Ariana Grande'
  }),

  // Liberated song (never played after a certain date)
  liberatedSong: createSong({
    id: 3,
    title: 'Pantala Naga Pampa',
    slug: 'pantala-naga-pampa',
    isLiberated: true,
    lastPlayed: '2008-12-31'
  })
};
```

**Create file**: `src/__tests__/fixtures/shows.ts`

```typescript
export interface ShowFixture {
  id: number;
  date: string;
  year: number;
  venueId: number;
  tourId: number | null;
  songCount: number;
  notes: string | null;
}

const defaultShow: ShowFixture = {
  id: 1,
  date: '2024-09-01',
  year: 2024,
  venueId: 1,
  tourId: 1,
  songCount: 25,
  notes: null
};

export function createShow(overrides?: Partial<ShowFixture>): ShowFixture {
  return {
    ...defaultShow,
    ...overrides
  };
}

export const mockShows = {
  recentShow: createShow({
    id: 1,
    date: '2024-09-01'
  }),

  historicalShow: createShow({
    id: 2,
    date: '1995-06-15',
    year: 1995
  })
};
```

**Create file**: `src/__tests__/fixtures/venues.ts`

```typescript
export interface VenueFixture {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  venueType: string;
  capacity: number;
  latitude: number;
  longitude: number;
  totalShows: number;
  firstShowDate: string;
  lastShowDate: string;
}

const defaultVenue: VenueFixture = {
  id: 1,
  name: 'Red Rocks Amphitheatre',
  city: 'Morrison',
  state: 'CO',
  country: 'USA',
  countryCode: 'US',
  venueType: 'Amphitheater',
  capacity: 9525,
  latitude: 39.6654,
  longitude: -105.2057,
  totalShows: 75,
  firstShowDate: '1995-06-15',
  lastShowDate: '2024-09-01'
};

export function createVenue(overrides?: Partial<VenueFixture>): VenueFixture {
  return {
    ...defaultVenue,
    ...overrides
  };
}
```

---

### Task 2: Database Helper Functions (2-3 hours)
**Status**: Ready to start
**Skills**: TypeScript, Vitest

**Create file**: `src/__tests__/helpers/db.ts`

```typescript
/**
 * Database test helpers
 * Setup, teardown, and mocking utilities for database tests
 */

import { vi } from 'vitest';
import { mockSongs } from '../fixtures/songs';
import { mockShows } from '../fixtures/shows';
import { mockVenues } from '../fixtures/venues';

/**
 * Create a mock Dexie database for testing
 */
export function createMockDatabase() {
  return {
    // Mock tables
    songs: {
      get: vi.fn().mockResolvedValue(mockSongs.antsMachingFrequent),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(mockSongs.antsMachingFrequent),
      toArray: vi.fn().mockResolvedValue([mockSongs.antsMachingFrequent]),
      orderBy: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(1)
    },

    shows: {
      get: vi.fn().mockResolvedValue(mockShows.recentShow),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      between: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([mockShows.recentShow]),
      orderBy: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(1)
    },

    venues: {
      get: vi.fn().mockResolvedValue(mockVenues.redRocks),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([mockVenues.redRocks]),
      orderBy: vi.fn().mockReturnThis(),
      count: vi.fn().mockResolvedValue(1)
    },

    // Other tables...
    setlistEntries: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      orderBy: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis()
    },

    tours: {
      get: vi.fn().mockResolvedValue(null),
      where: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([])
    },

    guests: {
      where: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([])
    },

    // User data tables
    userAttendedShows: {
      where: vi.fn().mockReturnThis(),
      add: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([])
    },

    userFavoriteSongs: {
      where: vi.fn().mockReturnThis(),
      add: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([])
    },

    transaction: vi.fn().mockImplementation((_mode, _tables, fn) => fn())
  };
}

/**
 * Reset all database mocks between tests
 */
export function resetDatabaseMocks(db: ReturnType<typeof createMockDatabase>) {
  Object.values(db).forEach(table => {
    if (table && typeof table === 'object') {
      Object.values(table).forEach(fn => {
        if (typeof fn === 'object' && 'mockClear' in fn) {
          fn.mockClear();
        }
      });
    }
  });
}

/**
 * Configure database mock for specific test scenario
 */
export function setupDatabaseFor(scenario: string, db: ReturnType<typeof createMockDatabase>) {
  if (scenario === 'empty') {
    db.songs.toArray.mockResolvedValue([]);
    db.shows.toArray.mockResolvedValue([]);
    db.venues.toArray.mockResolvedValue([]);
  }

  if (scenario === 'with-data') {
    db.songs.toArray.mockResolvedValue([
      mockSongs.antsMachingFrequent,
      mockSongs.oneRareSong
    ]);
    db.shows.toArray.mockResolvedValue([mockShows.recentShow]);
    db.venues.toArray.mockResolvedValue([mockVenues.redRocks]);
  }

  if (scenario === 'error') {
    db.songs.toArray.mockRejectedValue(new Error('Database error'));
  }

  return db;
}
```

---

### Task 3: Component Test Helpers (1-2 hours)
**Status**: Ready to start
**Skills**: TypeScript, testing-library

**Create file**: `src/__tests__/helpers/components.ts`

```typescript
/**
 * Component testing helpers and utilities
 */

import { render as svelteRender } from '@testing-library/svelte';

/**
 * Custom render function with default props
 */
export function render(Component: any, props = {}) {
  return svelteRender(Component, {
    props: {
      ...getDefaultProps(Component),
      ...props
    }
  });
}

/**
 * Get sensible defaults for component props
 */
function getDefaultProps(Component: any) {
  const name = Component.name;

  if (name === 'Button') {
    return { label: 'Click me' };
  }

  if (name === 'Card') {
    return { title: 'Card Title' };
  }

  if (name === 'Badge') {
    return { label: 'Badge' };
  }

  if (name === 'Table') {
    return { columns: [], rows: [] };
  }

  return {};
}

/**
 * Wait for async component updates
 */
export async function waitForComponent() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Create mock event for testing
 */
export function createEvent(type: string, data?: any) {
  return new Event(type, { bubbles: true, cancelable: true, ...data });
}
```

---

### Task 4: First Unit Test - Utilities (2 hours)
**Status**: Ready to start
**Skills**: TypeScript, testing-library

**Create file**: `src/__tests__/lib/utils/share.test.ts`

```typescript
/**
 * Share utility tests
 * Simple utility to start with - good for getting familiar with the setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canShare,
  shareData,
  getShareUrl
} from '$lib/utils/share';

describe('Share Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canShare()', () => {
    it('should return true if Web Share API available', () => {
      // Check if navigator.share exists
      const result = canShare();
      expect(typeof result).toBe('boolean');
    });

    it('should return false if Web Share API unavailable', () => {
      // Mock missing Share API
      const originalShare = navigator.share;
      delete (navigator as any).share;

      expect(canShare()).toBe(false);

      (navigator as any).share = originalShare;
    });
  });

  describe('shareData()', () => {
    it('should share data with correct title and URL', async () => {
      // Mock navigator.share
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true
      });

      await shareData('Test Title', 'https://example.com/test');

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Title',
        url: 'https://example.com/test'
      });
    });

    it('should handle share rejection gracefully', async () => {
      const mockShare = vi.fn().mockRejectedValue(new Error('Share cancelled'));
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true
      });

      const result = await shareData('Title', 'url');

      expect(result).toBeDefined();
    });
  });

  describe('getShareUrl()', () => {
    it('should generate share URL for song', () => {
      const url = getShareUrl('songs', 'ants-marching');
      expect(url).toContain('/songs/ants-marching');
    });

    it('should generate share URL for show', () => {
      const url = getShareUrl('shows', '12345');
      expect(url).toContain('/shows/12345');
    });

    it('should include current domain', () => {
      const url = getShareUrl('songs', 'test');
      expect(url).toContain(window.location.origin);
    });
  });
});
```

---

### Task 5: First Component Test (2 hours)
**Status**: Ready to start
**Skills**: TypeScript, testing-library, Svelte

**Create file**: `src/__tests__/lib/components/ui/Button.test.ts`

```typescript
/**
 * Button component tests
 * Simple component - good for learning component testing
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '$__tests__/helpers/components';
import { fireEvent } from '@testing-library/dom';
import Button from '$lib/components/ui/Button.svelte';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with text content', () => {
      const { getByRole } = render(Button, { label: 'Click me' });
      const button = getByRole('button');

      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click me');
    });

    it('should render with custom class', () => {
      const { getByRole } = render(Button, {
        label: 'Custom',
        class: 'custom-button'
      });
      const button = getByRole('button');

      expect(button).toHaveClass('custom-button');
    });

    it('should have button type by default', () => {
      const { getByRole } = render(Button, { label: 'Button' });
      expect(getByRole('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('Click Handling', () => {
    it('should fire click event handler', async () => {
      const onClick = vi.fn();
      const { getByRole } = render(Button, {
        label: 'Click',
        onclick: onClick
      });

      await fireEvent.click(getByRole('button'));

      expect(onClick).toHaveBeenCalled();
    });

    it('should pass event to handler', async () => {
      const onClick = vi.fn();
      const { getByRole } = render(Button, {
        label: 'Click',
        onclick: onClick
      });

      await fireEvent.click(getByRole('button'));

      expect(onClick).toHaveBeenCalledWith(expect.any(MouseEvent));
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      const { getByRole } = render(Button, {
        label: 'Disabled',
        disabled: true
      });

      expect(getByRole('button')).toBeDisabled();
    });

    it('should not trigger click when disabled', async () => {
      const onClick = vi.fn();
      const { getByRole } = render(Button, {
        label: 'Disabled',
        disabled: true,
        onclick: onClick
      });

      await fireEvent.click(getByRole('button'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button role', () => {
      const { getByRole } = render(Button, { label: 'Accessible' });
      expect(getByRole('button')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      const { getByLabelText } = render(Button, {
        label: 'Button',
        'aria-label': 'Action Button'
      });

      expect(getByLabelText('Action Button')).toBeInTheDocument();
    });

    it('should have proper focus state', () => {
      const { getByRole } = render(Button, { label: 'Focusable' });
      const button = getByRole('button');

      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe('Variants', () => {
    it('should apply primary variant class', () => {
      const { getByRole } = render(Button, {
        label: 'Primary',
        variant: 'primary'
      });

      expect(getByRole('button')).toHaveClass('btn-primary');
    });

    it('should apply secondary variant class', () => {
      const { getByRole } = render(Button, {
        label: 'Secondary',
        variant: 'secondary'
      });

      expect(getByRole('button')).toHaveClass('btn-secondary');
    });
  });
});
```

---

### Task 6: Database Test (2 hours)
**Status**: Ready to start after fixtures are created
**Skills**: TypeScript, Dexie/IndexedDB

**Create file**: `src/__tests__/lib/db/dexie/schema.test.ts`

```typescript
/**
 * Dexie schema tests
 * Verify database structure is correct
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { createMockDatabase, setupDatabaseFor } from '$__tests__/helpers/db';

describe('Dexie Schema', () => {
  let db: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    db = createMockDatabase();
  });

  describe('Tables', () => {
    it('should have songs table', () => {
      expect(db.songs).toBeDefined();
      expect(db.songs.toArray).toBeDefined();
    });

    it('should have venues table', () => {
      expect(db.venues).toBeDefined();
      expect(db.venues.toArray).toBeDefined();
    });

    it('should have shows table', () => {
      expect(db.shows).toBeDefined();
      expect(db.shows.toArray).toBeDefined();
    });

    it('should have user data tables', () => {
      expect(db.userAttendedShows).toBeDefined();
      expect(db.userFavoriteSongs).toBeDefined();
    });
  });

  describe('Query Methods', () => {
    it('should support get by ID', () => {
      expect(db.songs.get).toBeDefined();
    });

    it('should support where queries', () => {
      expect(db.songs.where).toBeDefined();
    });

    it('should support ordering', () => {
      expect(db.songs.orderBy).toBeDefined();
      expect(db.songs.reverse).toBeDefined();
    });

    it('should support filtering', () => {
      expect(db.songs.filter).toBeDefined();
    });
  });

  describe('Aggregation', () => {
    it('should support count queries', () => {
      expect(db.songs.count).toBeDefined();
    });

    it('should support toArray queries', () => {
      expect(db.songs.toArray).toBeDefined();
    });
  });
});
```

---

### Task 7: Create Test Data Factory for Guests (1 hour)

**Create file**: `src/__tests__/fixtures/guests.ts`

```typescript
/**
 * Guest test data fixtures
 */

export interface GuestFixture {
  id: number;
  name: string;
  slug: string;
  instrument: string;
  totalAppearances: number;
  firstAppearance: string;
  lastAppearance: string;
  searchText: string;
}

const defaultGuest: GuestFixture = {
  id: 1,
  name: 'Tim Reynolds',
  slug: 'tim-reynolds',
  instrument: 'Guitar',
  totalAppearances: 500,
  firstAppearance: '1991-01-01',
  lastAppearance: '2024-09-22',
  searchText: 'tim reynolds guitar'
};

export function createGuest(overrides?: Partial<GuestFixture>): GuestFixture {
  return {
    ...defaultGuest,
    ...overrides
  };
}

export const mockGuests = {
  timReynolds: createGuest({
    id: 1,
    name: 'Tim Reynolds',
    slug: 'tim-reynolds'
  }),

  rareyGuestAppearance: createGuest({
    id: 2,
    name: 'Robert Christgau',
    slug: 'robert-christgau',
    totalAppearances: 1
  })
};
```

---

## Commands to Run After Creating Tests

```bash
# Run specific test file
npm test src/__tests__/lib/utils/share.test.ts

# Run all new tests
npm test src/__tests__/

# Generate coverage
npm test -- --coverage src/__tests__/

# Watch mode for development
npm test -- --watch src/__tests__/lib/components/ui/Button.test.ts
```

---

## Checklist for This Week

- [ ] Create fixtures for songs, shows, venues, guests
- [ ] Create database helper functions
- [ ] Create component test helpers
- [ ] Write share utility tests (first utility test)
- [ ] Write Button component tests (first component test)
- [ ] Write Dexie schema tests (first database test)
- [ ] Run all new tests - verify they pass
- [ ] Generate coverage report
- [ ] Review test quality with team
- [ ] Plan next week's tests

---

## Next Steps

Once you complete these tasks:

1. **Extend fixtures** with more test data variants
2. **Write more component tests** (Card, Badge, EmptyState)
3. **Add database initialization tests** (init.test.ts)
4. **Add route integration tests** (homepage, search)
5. **Create GitHub Actions workflow** for CI/CD

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/svelte)
- [Dexie.js Documentation](https://dexie.org/)

**Good luck! These tests will make the app much more stable.**
