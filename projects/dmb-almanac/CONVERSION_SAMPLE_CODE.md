# TypeScript to JavaScript Test Conversion - Sample Code

## 1. transform.test.js - Sample Conversions

### Mock Object with JSDoc
```javascript
/**
 * Mock song object for testing
 * @type {Object}
 */
const mockSongServer = {
  id: 1,
  title: 'Crash Into Me',
  slug: 'crash-into-me',
  sort_title: 'Crash Into Me',
  original_artist: null,
  is_cover: 0,
  is_original: 1,
  // ... more properties
};
```

### Test with Multiple Assertions
```javascript
it('should map all song fields correctly', async () => {
  const result = await transformSongs([mockSongServer]);
  const song = result.data[0];

  expect(song.id).toBe(1);
  expect(song.title).toBe('Crash Into Me');
  expect(song.slug).toBe('crash-into-me');
  expect(song.sortTitle).toBe('Crash Into Me');
  expect(song.originalArtist).toBeNull();
  expect(song.isCover).toBe(false);
  expect(song.isOriginal).toBe(true);
  expect(song.totalPerformances).toBe(500);
  expect(song.openerCount).toBe(25);
});
```

### Array Type Annotation
```javascript
/**
 * @type {Array<Object>}
 */
const songs = [
  {
    id: 1,
    title: 'Song 1',
    slug: 'song-1',
    sortTitle: 'Song 1',
    isCover: false,
    isOriginal: true,
    totalPerformances: 100,
    openerCount: 0,
    closerCount: 0,
    encoreCount: 0,
    firstPlayedDate: '2000-01-01',
    lastPlayedDate: '2024-01-01',
    searchText: 'song 1',
  },
];

const warnings = await validateForeignKeys(songs, venues, tours, shows, entries);
```

## 2. forceSimulation.test.js - Sample Conversions

### Factory Function with JSDoc
```javascript
/**
 * Create test simulation config
 * @param {Partial<Object>} overrides - Config overrides
 * @returns {Object} ForceSimulationConfig
 */
const createTestConfig = (overrides = {}) => ({
  nodes: [
    { id: 1, name: 'Node 1' },
    { id: 2, name: 'Node 2' },
    { id: 3, name: 'Node 3' },
  ],
  links: [
    { source: 1, target: 2 },
    { source: 2, target: 3 },
  ],
  width: 800,
  height: 600,
  ...overrides,
});
```

### TypedArray Operations Test
```javascript
it('should pack node positions correctly', () => {
  /**
   * @type {Array<Object>}
   */
  const nodes = [
    { id: 1, x: 10, y: 20, vx: 1, vy: 2, fx: null, fy: null },
    { id: 2, x: 30, y: 40, vx: 3, vy: 4, fx: 50, fy: 60 },
  ];
  const buffer = allocatePositionBuffer(2);

  packNodesIntoBuffer(nodes, buffer);

  // Node 0: [x, y, vx, vy, fx, fy]
  expect(buffer[0]).toBe(10);  // x
  expect(buffer[1]).toBe(20);  // y
  expect(buffer[2]).toBe(1);   // vx
  expect(buffer[3]).toBe(2);   // vy
  expect(Number.isNaN(buffer[4])).toBe(true);  // fx = null -> NaN
  expect(Number.isNaN(buffer[5])).toBe(true);  // fy = null -> NaN

  // Node 1: [x, y, vx, vy, fx, fy]
  expect(buffer[6]).toBe(30);  // x
  expect(buffer[7]).toBe(40);  // y
  expect(buffer[8]).toBe(3);   // vx
  expect(buffer[9]).toBe(4);   // vy
  expect(buffer[10]).toBe(50); // fx
  expect(buffer[11]).toBe(60); // fy
});
```

### Async Test with Vitest Mock
```javascript
it('should call tick callback during simulation', async () => {
  const tickCallback = vi.fn();
  const simulation = createMainThreadSimulation(createTestConfig({
    alphaMin: 0.99, // Stop immediately after one tick
  }));

  simulation.onTick(tickCallback);
  simulation.start();

  // Wait for at least one tick
  await new Promise(resolve => setTimeout(resolve, 50));

  expect(tickCallback).toHaveBeenCalled();
  expect(tickCallback).toHaveBeenCalledWith(expect.any(Array));

  simulation.stop();
});
```

## 3. pwa-race-conditions.test.js - Sample Conversions

### Complex Mock Object with JSDoc
```javascript
/**
 * Mock window object with listener tracking
 * @type {Object}
 */
mockWindow = {
  /**
   * @param {string} event
   * @param {EventListener} handler
   */
  addEventListener: vi.fn((event, handler) => {
    if (!eventListenerMap.has(event)) {
      eventListenerMap.set(event, new Set());
    }
    eventListenerMap.get(event).add(handler);
  }),
  /**
   * @param {string} event
   * @param {EventListener} handler
   */
  removeEventListener: vi.fn((event, handler) => {
    eventListenerMap.get(event)?.delete(handler);
  }),
  /**
   * @returns {Object}
   */
  matchMedia: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  navigator: {
    serviceWorker: {
      /**
       * @returns {Promise<Object>}
       */
      register: vi.fn(() => Promise.resolve({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        periodicSync: {
          /**
           * @returns {Promise<void>}
           */
          register: vi.fn(() => Promise.resolve())
        }
      }))
    },
    onLine: true
  },
  scrollY: 0
};
```

### Race Condition Test
```javascript
it('should not create duplicate listeners on multiple initialize() calls', async () => {
  // Import fresh instance
  const { installManager } = await import('$lib/pwa/install-manager');

  // First initialization
  installManager.initialize();

  const beforeInstallCountAfterFirst = eventListenerMap.get('beforeinstallprompt')?.size || 0;
  const appInstalledCountAfterFirst = eventListenerMap.get('appinstalled')?.size || 0;
  const scrollCountAfterFirst = eventListenerMap.get('scroll')?.size || 0;

  expect(beforeInstallCountAfterFirst).toBe(1);
  expect(appInstalledCountAfterFirst).toBe(1);
  expect(scrollCountAfterFirst).toBe(1);

  // Second initialization (race condition scenario)
  installManager.initialize();

  const beforeInstallCountAfterSecond = eventListenerMap.get('beforeinstallprompt')?.size || 0;
  const appInstalledCountAfterSecond = eventListenerMap.get('appinstalled')?.size || 0;
  const scrollCountAfterSecond = eventListenerMap.get('scroll')?.size || 0;

  // Should still be 1 (old listeners cleaned up)
  expect(beforeInstallCountAfterSecond).toBe(1);
  expect(appInstalledCountAfterSecond).toBe(1);
  expect(scrollCountAfterSecond).toBe(1);
});
```

### Integration Test
```javascript
it('should handle Promise.allSettled initialization pattern safely', async () => {
  const { pwaStore } = await import('$lib/stores/pwa');
  const { installManager } = await import('$lib/pwa/install-manager');

  // Simulate +layout.svelte initialization pattern
  const results = await Promise.allSettled([
    pwaStore.initialize(),
    Promise.resolve().then(() => installManager.initialize()),
    pwaStore.initialize(), // Duplicate call
    Promise.resolve().then(() => installManager.initialize()) // Duplicate call
  ]);

  // All should succeed
  expect(results.every(r => r.status === 'fulfilled')).toBe(true);

  // Should still only have one set of listeners
  const beforeInstallCount = eventListenerMap.get('beforeinstallprompt')?.size || 0;
  expect(beforeInstallCount).toBe(1);
});
```

## Type Annotation Patterns

### Removed TypeScript
```typescript
const mockWindow: any = { ... }
interface TransformResult { ... }
type ValidationWarning = { ... }
const result: Promise<TransformResult> = await transformSongs([...])
```

### Replaced with JSDoc
```javascript
/** @type {Object|null} */
let mockWindow;

/**
 * @type {Object}
 */
const mockWindow = { ... }

/**
 * @returns {Promise<Object>}
 */
async function transform() { ... }

/**
 * @type {Array<Object>}
 */
const results = [...]
```

## Files Status

All three files:
- ✓ Converted from TypeScript to JavaScript
- ✓ JSDoc annotations added throughout
- ✓ All test cases preserved
- ✓ All assertions maintained
- ✓ Syntax validated
- ✓ Ready for execution

## Next Steps

1. Run tests to verify functionality
2. Check IDE autocomplete works with JSDoc
3. Use for continuous integration
4. Archive original .ts files if needed
