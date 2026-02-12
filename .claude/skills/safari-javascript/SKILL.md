---
name: safari-javascript
description: >
  Expert in Safari 26.0-26.2 JavaScript and WebAssembly features including
  Math.sumPrecise, Map/WeakMap.getOrInsert, RegExp pattern modifiers,
  Intl improvements, Wasm resizable buffers, and JS String Builtins.
  Use for modern JS targeting Safari, cross-engine JS compatibility,
  or leveraging new language/runtime features.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebSearch
disable-model-invocation: false
---

# Safari 26.0-26.2 JavaScript & WebAssembly Skill

Expert knowledge of JavaScript and WebAssembly features in Safari 26.0 and 26.2.

## Math.sumPrecise() (26.2)

Accurate floating-point summation avoiding accumulation errors:

```js
// Problem: naive summation accumulates floating-point errors
const values = [0.1, 0.2, 0.3, 0.1, 0.2, 0.3, 0.1, 0.2, 0.3, 0.1];
values.reduce((a, b) => a + b, 0); // 2.0000000000000004

// Solution: Math.sumPrecise uses compensated summation
Math.sumPrecise(values); // 2.0 (exact)

// Practical use: financial calculations
const prices = [19.99, 4.50, 12.75, 8.25, 3.99];
const total = Math.sumPrecise(prices); // 49.48 (exact)

// Large datasets
const measurements = Float64Array.from({ length: 100000 }, () => Math.random());
const accurateSum = Math.sumPrecise(measurements);
```

## Map.prototype.getOrInsert() (26.2)

Atomic get-or-create for Maps:

```js
const cache = new Map();

// Before: verbose check-and-set
if (!cache.has(key)) {
  cache.set(key, computeExpensiveValue(key));
}
const value = cache.get(key);

// After: single atomic operation
const value = cache.getOrInsert(key, computeExpensiveValue(key));

// With lazy evaluation via callback
const value = cache.getOrInsertComputed(key, (k) => computeExpensiveValue(k));

// Real-world: memoization
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    return cache.getOrInsertComputed(key, () => fn(...args));
  };
}

// Grouping pattern
const grouped = new Map();
for (const item of items) {
  grouped.getOrInsertComputed(item.category, () => []).push(item);
}
```

## WeakMap.prototype.getOrInsert() (26.2)

Same pattern for WeakMap (object keys, GC-friendly):

```js
const metadata = new WeakMap();

// Attach metadata lazily
function getMetadata(element) {
  return metadata.getOrInsertComputed(element, (el) => ({
    created: Date.now(),
    interactions: 0,
    rect: el.getBoundingClientRect()
  }));
}

// Usage
const meta = getMetadata(document.querySelector('.card'));
meta.interactions++;
```

## RegExp Pattern Modifiers (26.0)

Fine-grained control over regex flags within pattern regions:

```js
// Syntax: (?flags:pattern) or (?flags-flags:pattern)

// Case-insensitive only for part of the pattern
const re = /hello (?i:world)/;
re.test('hello World');  // true
re.test('Hello world');  // false (only 'world' is case-insensitive)

// Enable/disable multiline for a region
const mixed = /^start(?m:$middle^)end$/;

// Nested modifiers
const complex = /(?i:foo(?-i:BAR)baz)/;
// 'foo' and 'baz' are case-insensitive, 'BAR' must be exact case

// Practical: parsing mixed-case protocols with case-sensitive paths
const urlPattern = /(?i:https?):\/\/(?i:[a-z0-9.-]+)\/([a-zA-Z0-9/]+)/;
```

## Intl Improvements (26.0)

### PluralRules notation
```js
// Notation option for number formatting context
const pr = new Intl.PluralRules('en', { notation: 'compact' });
pr.select(1000000); // applies compact notation rules
```

### Locale variants
```js
// Access locale variant subtags
const locale = new Intl.Locale('sl-IT-rozaj');
console.log(locale.variants); // ['rozaj']

const locale2 = new Intl.Locale('de-DE-1996');
console.log(locale2.variants); // ['1996']
```

## WebAssembly: Resizable Buffers (26.2)

```js
// Convert Wasm memory to resizable ArrayBuffer
const memory = new WebAssembly.Memory({
  initial: 1,    // 64KB pages
  maximum: 10
});

// Get a resizable buffer (can grow without detaching)
const resizable = memory.toResizableBuffer();
console.log(resizable.resizable); // true
console.log(resizable.maxByteLength); // 655360 (10 * 64KB)

// Views on resizable buffers auto-track growth
const view = new Uint8Array(resizable);
memory.grow(1);
console.log(view.byteLength); // automatically updated

// Convert back to fixed-length if needed
const fixed = memory.toFixedLengthBuffer();
console.log(fixed.resizable); // false
```

## WebAssembly: JS String Builtins (26.2)

Direct string constant access from Wasm without function call overhead:

```js
// Import string builtins into Wasm module
const importObject = {
  'wasm:js-string': {
    // These are now built-in, no JS wrapper needed
    cast: WebAssembly.String.cast,
    test: WebAssembly.String.test,
    fromCharCodeArray: WebAssembly.String.fromCharCodeArray,
    intoCharCodeArray: WebAssembly.String.intoCharCodeArray,
    fromCodePoint: WebAssembly.String.fromCodePoint,
    codePointAt: WebAssembly.String.codePointAt,
    charCodeAt: WebAssembly.String.charCodeAt,
    length: WebAssembly.String.length,
    concat: WebAssembly.String.concat,
    substring: WebAssembly.String.substring,
    equals: WebAssembly.String.equals,
    compare: WebAssembly.String.compare,
  }
};

// Instantiate with builtins
const { instance } = await WebAssembly.instantiate(module, importObject);
```

Benefits:
- Eliminates JS-to-Wasm boundary overhead for string operations
- Direct access to JS string internals from Wasm code
- Significant performance improvement for string-heavy Wasm apps

## WebCrypto: Ed Curve JWK (26.0)

```js
// Edwards-curve key with alg parameter
const keyPair = await crypto.subtle.generateKey(
  { name: 'Ed25519' },
  true,
  ['sign', 'verify']
);

// Export as JWK now includes 'alg' field
const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
// jwk.alg === 'EdDSA'
```

## SVG Enhancements (26.2)

```js
// SVG animation events
const anim = document.querySelector('animate');

// Fires on each animation iteration
anim.addEventListener('repeatEvent', (e) => {
  console.log(`Animation repeated, iteration: ${e.detail}`);
});

// Begin event handler property
anim.onbegin = () => console.log('Animation started');

// Async SVG scripts
// <script async href="module.js" /> now supported

// SVG link MIME types
// <a type="application/pdf" href="doc.pdf">Download</a>
```

## Feature Detection

```js
// Math.sumPrecise
if ('sumPrecise' in Math) { /* supported */ }

// Map.getOrInsert
if ('getOrInsert' in Map.prototype) { /* supported */ }

// WeakMap.getOrInsert
if ('getOrInsert' in WeakMap.prototype) { /* supported */ }

// RegExp pattern modifiers - test with try/catch
let hasPatternModifiers = false;
try {
  new RegExp('(?i:test)');
  hasPatternModifiers = true;
} catch {}

// Wasm resizable buffers
if ('toResizableBuffer' in WebAssembly.Memory.prototype) { /* supported */ }

// Intl.Locale variants
if ('variants' in Intl.Locale.prototype) { /* supported */ }
```

## Cross-Browser Status

| Feature | Safari 26.2 | Chrome 131+ | Firefox 135+ |
|---------|------------|-------------|--------------|
| Math.sumPrecise | Yes | Yes (131+) | Yes (134+) |
| Map.getOrInsert | Yes | Yes (133+) | No |
| RegExp modifiers | Yes (26.0) | Yes (125+) | No |
| Wasm resizable buffers | Yes | Yes (111+) | Yes (134+) |
| JS String Builtins (Wasm) | Yes | Yes (131+) | No |
| Intl.Locale.variants | Yes (26.0) | Yes | Yes |

## Practical Patterns

### Accurate Financial Totals
```js
function calculateTotal(lineItems) {
  if ('sumPrecise' in Math) {
    return Math.sumPrecise(lineItems.map(i => i.price * i.qty));
  }
  // Fallback: manual Kahan summation
  let sum = 0, comp = 0;
  for (const item of lineItems) {
    const val = item.price * item.qty;
    const y = val - comp;
    const t = sum + y;
    comp = (t - sum) - y;
    sum = t;
  }
  return sum;
}
```

### Lazy Initialization Cache
```js
class ComponentRegistry {
  #components = new Map();

  get(name) {
    if ('getOrInsertComputed' in Map.prototype) {
      return this.#components.getOrInsertComputed(name, (n) => this.#load(n));
    }
    if (!this.#components.has(name)) {
      this.#components.set(name, this.#load(name));
    }
    return this.#components.get(name);
  }

  #load(name) {
    return import(`./components/${name}.js`);
  }
}
```
