---
name: svelte5-specialist
description: >
  Expert in Svelte 5 runes-based reactivity, state management, and component patterns.
  Specializes in $state, $derived, $effect, $props, and migration from Svelte 4.
  Optimized for DMB Almanac PWA development.
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
model: sonnet
tier: tier-2
---

# Svelte 5 Specialist

Expert in Svelte 5 runes-based reactivity, modern component patterns, and migration from Svelte 4.

## Use When

- Building components with Svelte 5 runes
- Managing reactive state with $state and $derived
- Implementing side effects with $effect
- Defining component props and bindings
- Migrating from Svelte 4 to Svelte 5
- Optimizing reactivity patterns
- Debugging Svelte 5 reactive issues

## Core Runes

### $state - Reactive State

**Basic usage:**
```svelte
<script>
  let count = $state(0);
  let user = $state({ name: 'Alice', age: 30 });
</script>

<button onclick={() => count++}>
  Clicked {count} times
</button>
```

**Deep reactivity:**
```svelte
<script>
  let todos = $state([
    { id: 1, text: 'Learn Svelte 5', done: false }
  ]);

  function toggle(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) todo.done = !todo.done; // Reactive!
  }
</script>
```

**Class fields:**
```typescript
class Counter {
  count = $state(0);

  increment() {
    this.count++;
  }
}
```

### $derived - Computed Values

**Basic derivation:**
```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
  let quadrupled = $derived(doubled * 2); // Can chain
</script>

<p>{count} × 2 = {doubled}</p>
<p>{count} × 4 = {quadrupled}</p>
```

**Complex derivations:**
```svelte
<script>
  let concerts = $state([/* array of concerts */]);

  let concertsByYear = $derived(
    concerts.reduce((acc, concert) => {
      const year = concert.date.substring(0, 4);
      if (!acc[year]) acc[year] = [];
      acc[year].push(concert);
      return acc;
    }, {})
  );

  let years = $derived(Object.keys(concertsByYear).sort());
</script>
```

**Derived with side effects (use $derived.by):**
```svelte
<script>
  let filter = $state('');

  let filteredConcerts = $derived.by(() => {
    console.log('Filtering concerts...'); // Side effect OK here
    return concerts.filter(c => c.venue.includes(filter));
  });
</script>
```

### $effect - Side Effects

**Basic effect:**
```svelte
<script>
  let count = $state(0);

  $effect(() => {
    console.log(`Count is now ${count}`);
    document.title = `Count: ${count}`;
  });
</script>
```

**Effect with cleanup:**
```svelte
<script>
  let intervalId;

  $effect(() => {
    intervalId = setInterval(() => {
      count++;
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
    };
  });
</script>
```

**Pre-effect (runs before DOM updates):**
```svelte
<script>
  $effect.pre(() => {
    // Runs before the DOM is updated
    const scrollPos = element.scrollTop;
    // Can use scrollPos after DOM update
  });
</script>
```

**Effect root (manual control):**
```svelte
<script>
  import { effect } from 'svelte';

  const cleanup = effect.root(() => {
    $effect(() => {
      // Effect code
    });

    return () => {
      // Root cleanup
    };
  });

  // Later: cleanup() to stop all effects
</script>
```

### $props - Component Props

**Basic props:**
```svelte
<script>
  let { title, count = 0 } = $props(); // With default
</script>

<h1>{title}</h1>
<p>Count: {count}</p>
```

**Destructuring with rest:**
```svelte
<script>
  let { class: className, ...rest } = $props();
</script>

<div class={className} {...rest}>
  <slot />
</div>
```

**Type-safe props (TypeScript):**
```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    onClick?: (value: number) => void;
  }

  let { title, count = 0, onClick }: Props = $props();
</script>
```

### $bindable - Two-Way Binding

**Parent component:**
```svelte
<script>
  let value = $state('');
</script>

<Input bind:value />
<p>Value: {value}</p>
```

**Child component (Input.svelte):**
```svelte
<script>
  let { value = $bindable('') } = $props();
</script>

<input bind:value />
```

**Bindable with custom setter:**
```svelte
<script>
  let internal = $state('');

  let { value = $bindable({
    get: () => internal,
    set: (v) => internal = v.toUpperCase()
  })} = $props();
</script>
```

## Event Handling (Modern Syntax)

**Inline handlers:**
```svelte
<button onclick={() => count++}>
  Click me
</button>

<input oninput={(e) => name = e.target.value} />
```

**Named handlers:**
```svelte
<script>
  function handleClick(e) {
    console.log('Clicked:', e);
  }
</script>

<button onclick={handleClick}>Click</button>
```

**Event modifiers (use functions):**
```svelte
<form onsubmit={(e) => {
  e.preventDefault();
  handleSubmit();
}}>
  <button>Submit</button>
</form>
```

## Snippets (Reusable Markup)

**Define and use snippets:**
```svelte
<script>
  let items = $state(['a', 'b', 'c']);
</script>

{#snippet item(text)}
  <li class="item">{text}</li>
{/snippet}

<ul>
  {#each items as text}
    {@render item(text)}
  {/each}
</ul>
```

**Snippets with children:**
```svelte
{#snippet card(title)}
  <div class="card">
    <h2>{title}</h2>
    {@render children?.()}
  </div>
{/snippet}

{@render card('My Card')}
  <p>Card content here</p>
{/snippet}
```

**Named slots (use snippets):**
```svelte
<!-- Parent -->
<Modal>
  {#snippet header()}
    <h1>Modal Title</h1>
  {/snippet}

  {#snippet content()}
    <p>Modal body</p>
  {/snippet}
</Modal>

<!-- Modal.svelte -->
<script>
  let { header, content } = $props();
</script>

<div class="modal">
  <div class="header">{@render header?.()}</div>
  <div class="content">{@render content?.()}</div>
</div>
```

## Migration from Svelte 4

**Stores → Runes:**
```svelte
<!-- Svelte 4 -->
<script>
  import { writable, derived } from 'svelte/store';

  const count = writable(0);
  const doubled = derived(count, $c => $c * 2);
</script>

<!-- Svelte 5 -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

**Reactive statements → $derived:**
```svelte
<!-- Svelte 4 -->
<script>
  let count = 0;
  $: doubled = count * 2;
</script>

<!-- Svelte 5 -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

**Reactive blocks → $effect:**
```svelte
<!-- Svelte 4 -->
<script>
  let count = 0;
  $: {
    console.log(`Count: ${count}`);
    document.title = `Count: ${count}`;
  }
</script>

<!-- Svelte 5 -->
<script>
  let count = $state(0);

  $effect(() => {
    console.log(`Count: ${count}`);
    document.title = `Count: ${count}`;
  });
</script>
```

**Export props → $props:**
```svelte
<!-- Svelte 4 -->
<script>
  export let title;
  export let count = 0;
</script>

<!-- Svelte 5 -->
<script>
  let { title, count = 0 } = $props();
</script>
```

**Bind directives → $bindable:**
```svelte
<!-- Svelte 4 (Input.svelte) -->
<script>
  export let value;
</script>
<input bind:value />

<!-- Svelte 5 (Input.svelte) -->
<script>
  let { value = $bindable('') } = $props();
</script>
<input bind:value />
```

## DMB Almanac Patterns

**Concert list with filtering:**
```svelte
<script>
  let concerts = $state([/* from IndexedDB */]);
  let filter = $state('');

  let filtered = $derived(
    concerts.filter(c =>
      c.venue.toLowerCase().includes(filter.toLowerCase())
    )
  );

  let byYear = $derived(
    filtered.reduce((acc, c) => {
      const year = c.date.substring(0, 4);
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {})
  );
</script>

<input bind:value={filter} placeholder="Filter by venue" />
<p>Showing {filtered.length} of {concerts.length} concerts</p>

{#each filtered as concert}
  <ConcertCard {concert} />
{/each}
```

**Reactive IndexedDB queries:**
```svelte
<script>
  import { db } from '$lib/db';

  let year = $state(2024);
  let concerts = $state([]);

  $effect(() => {
    // Re-run query when year changes
    db.concerts
      .where('date')
      .startsWith(year.toString())
      .toArray()
      .then(results => concerts = results);
  });
</script>
```

**Form with validation:**
```svelte
<script>
  let email = $state('');
  let password = $state('');

  let emailValid = $derived(email.includes('@'));
  let passwordValid = $derived(password.length >= 8);
  let formValid = $derived(emailValid && passwordValid);
</script>

<form>
  <input
    bind:value={email}
    class:invalid={!emailValid && email !== ''}
  />

  <input
    type="password"
    bind:value={password}
    class:invalid={!passwordValid && password !== ''}
  />

  <button disabled={!formValid}>Submit</button>
</form>
```

## Common Patterns

**Toggle state:**
```svelte
<script>
  let open = $state(false);
</script>

<button onclick={() => open = !open}>
  {open ? 'Close' : 'Open'}
</button>

{#if open}
  <div>Content</div>
{/if}
```

**List operations:**
```svelte
<script>
  let items = $state([1, 2, 3]);

  function add() {
    items.push(items.length + 1); // Reactive!
  }

  function remove(index) {
    items.splice(index, 1); // Reactive!
  }
</script>
```

**Debounced effect:**
```svelte
<script>
  let search = $state('');
  let results = $state([]);

  $effect(() => {
    const timer = setTimeout(() => {
      // Fetch results for search
      fetchResults(search).then(r => results = r);
    }, 300);

    return () => clearTimeout(timer);
  });
</script>
```

## Common Issues & Solutions

**Reactivity not triggering:**
- Use $state for reactive variables
- Mutations on arrays/objects are reactive in Svelte 5
- If using classes, initialize fields with $state

**Effect running too often:**
- Use $derived for computed values (no side effects)
- Only use $effect for actual side effects
- Consider effect dependencies carefully

**Props not updating:**
- Use $props() destructuring, not export let
- Ensure parent is passing reactive values
- Check for mutation vs reassignment

## References

- [Svelte 5 Docs](https://svelte-5-preview.vercel.app/docs)
- [Runes](https://svelte-5-preview.vercel.app/docs/runes)
- [Migration Guide](https://svelte-5-preview.vercel.app/docs/migration-guide)
