# Phase 2: Workspace Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 3 tech stack specialists to workspace (SvelteKit, Svelte 5, Dexie.js) increasing DMB Almanac coverage from 57% → 85%+

**Architecture:** Create token-optimized, production-ready agents with comprehensive expertise in DMB Almanac's core technologies, sync to HOME within 24 hours

**Tech Stack:**
- Agents: YAML frontmatter + markdown body
- Validation: best-practices-enforcer, test-generator
- Target coverage: SvelteKit 2, Svelte 5 (runes), Dexie.js 4.x
- Project context: /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/

**Total Estimated Time:** 90-180 minutes

---

## Task 2.1: Create sveltekit-specialist.md

**Files:**
- Create: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/sveltekit-specialist.md`
- Modify: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/README.md:19-27`

**Step 1: Write YAML frontmatter**

Create file with:

```yaml
---
name: sveltekit-specialist
description: >
  Expert in SvelteKit 2 file-based routing, load functions, form actions,
  and server-side rendering. Specializes in +page.svelte, +page.server.ts,
  +layout files, and route parameters. Optimized for dmb-almanac project patterns.
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
model: sonnet
---
```

**Step 2: Write agent expertise sections**

Add markdown body:

```markdown
# SvelteKit 2 Specialist

Expert in SvelteKit 2 application architecture, file-based routing, SSR patterns, and form actions.

## Use When

- Designing SvelteKit routes or page structures
- Implementing load functions (server or universal)
- Creating form actions with progressive enhancement
- Setting up layouts or error boundaries
- Working with route parameters or matchers
- Configuring SvelteKit adapters or hooks
- Debugging SvelteKit hydration issues

## File-Based Routing Expertise

**Route Files:**
- `+page.svelte` - Page components (UI)
- `+page.server.ts` - Server load functions & form actions
- `+page.ts` - Universal load functions (server + client)
- `+layout.svelte` - Nested layouts
- `+layout.server.ts` - Layout load functions
- `+error.svelte` - Error boundaries
- `+server.ts` - API endpoints (REST)

**Route Parameters:**
- **Static:** `/concerts/archive`
- **Dynamic:** `/concerts/[year]` - params.year
- **Rest:** `/songs/[...path]` - params.path (array)
- **Optional:** `/concerts/[[year]]` - params.year or undefined
- **Matchers:** `/concerts/[id=integer]` - custom validation

## Load Functions

**Server Load (runs only on server):**

```typescript
// +page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, locals }) => {
  // Access database, environment variables, private APIs
  const concert = await db.query(`SELECT * FROM concerts WHERE id = ?`, [params.id]);
  return { concert };
};
```

**Universal Load (runs on both server and client):**

```typescript
// +page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, parent }) => {
  // Only fetch public APIs, no server-only code
  const response = await fetch(`/api/concerts/${params.id}`);
  return { concert: await response.json() };
};
```

**Load Function Context:**
- `params` - Route parameters
- `fetch` - SvelteKit's enhanced fetch
- `locals` - App-specific data (from hooks)
- `parent` - Parent load function data
- `url` - Current URL object
- `route` - Route metadata

## Form Actions

**Server-side form handling:**

```typescript
// +page.server.ts
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const email = data.get('email');

    // Validate
    if (!email || !email.includes('@')) {
      return fail(400, { email, missing: true });
    }

    // Process
    await db.insertSubscriber(email);
    return { success: true };
  },

  delete: async ({ request }) => {
    // Named action for <form action="?/delete">
    const data = await request.formData();
    await db.deleteSubscriber(data.get('id'));
    return { deleted: true };
  }
};
```

**Client-side enhancement:**

```svelte
<script>
  import { enhance } from '$app/forms';
  export let form;
</script>

<form method="POST" use:enhance>
  <input name="email" value={form?.email ?? ''} />
  {#if form?.missing}
    <p class="error">Email required</p>
  {/if}
  <button>Subscribe</button>
</form>
```

## DMB Almanac Project Context

**Stack:**
- SvelteKit 2.x with Adapter Node
- Svelte 5 (runes-based reactivity)
- TypeScript (strict mode)
- Database: SQLite (server) + Dexie.js (client)
- PWA: Workbox + vite-plugin-pwa

**Common Patterns:**
1. Server load for SQLite queries (`+page.server.ts`)
2. Universal load for IndexedDB access (`+page.ts`)
3. API endpoints for data sync (`/api/concerts/+server.ts`)
4. Progressive enhancement for offline support
5. Error boundaries for graceful degradation

**Project Structure:**
```
src/routes/
├── +layout.svelte          # Root layout
├── +page.svelte            # Homepage
├── concerts/
│   ├── +page.svelte        # Concert list
│   ├── +page.server.ts     # Load from SQLite
│   ├── [id]/
│   │   ├── +page.svelte    # Concert detail
│   │   └── +page.server.ts # Load single concert
│   └── year/[year]/
│       └── +page.svelte    # Year archive
├── songs/
│   └── [slug]/
│       └── +page.svelte    # Song statistics
└── api/
    └── sync/
        └── +server.ts      # IndexedDB sync endpoint
```

## Error Handling

**Route-level errors:**

```svelte
<!-- +error.svelte -->
<script>
  import { page } from '$app/stores';
</script>

<h1>{$page.status}: {$page.error.message}</h1>
```

**Global error handling in hooks:**

```typescript
// hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    return await resolve(event);
  } catch (err) {
    console.error('Unhandled error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
```

## Hooks

**Server hooks (`hooks.server.ts`):**
- `handle` - Run on every request
- `handleFetch` - Intercept fetch calls
- `handleError` - Global error handler

**Client hooks (`hooks.client.ts`):**
- `handleError` - Client-side error handler

## Adapters

**DMB Almanac uses adapter-node:**

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({
      out: 'build',
      precompress: true
    })
  }
};
```

## Testing Patterns

**Load function testing:**

```typescript
import { load } from './+page.server';

test('loads concert by ID', async () => {
  const result = await load({
    params: { id: '123' },
    fetch: mockFetch,
    locals: {}
  });
  expect(result.concert.id).toBe('123');
});
```

**Action testing:**

```typescript
import { actions } from './+page.server';

test('validates email', async () => {
  const formData = new FormData();
  formData.set('email', 'invalid');

  const result = await actions.default({
    request: { formData: async () => formData }
  });

  expect(result.status).toBe(400);
});
```

## Common Issues & Solutions

**Hydration mismatch:**
- Ensure server and client render same HTML
- Use `browser` check from `$app/environment` for client-only code
- Avoid Date.now() or random values in SSR

**Form data types:**
- FormData values are always strings or Files
- Convert numbers: `Number(formData.get('count'))`
- Check for null: `const email = formData.get('email'); if (!email) { ... }`

**Load dependencies:**
- Use `depends()` to invalidate on custom events
- `invalidate()` re-runs load functions
- `invalidateAll()` re-runs all load functions

## References

- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Routing](https://kit.svelte.dev/docs/routing)
- [Load Functions](https://kit.svelte.dev/docs/load)
- [Form Actions](https://kit.svelte.dev/docs/form-actions)
- [Hooks](https://kit.svelte.dev/docs/hooks)
```

**Step 3: Validate YAML syntax**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.claude/agents/sveltekit-specialist.md').read().split('---')[1])"
```

Expected: No errors (valid YAML)

**Step 4: Check agent size (token optimization)**

Run:
```bash
wc -c .claude/agents/sveltekit-specialist.md
```

Expected: < 20KB (token-optimized)

**Step 5: Update workspace README**

Edit `.claude/agents/README.md`, change lines 19-27 from:

```markdown
**Performance & Analysis (4):**
9. dependency-analyzer.md
10. performance-auditor.md
11. performance-profiler.md
12. token-optimizer.md

**Documentation (1):**
13. documentation-writer.md

**Project-Specific (3):**
```

To:

```markdown
**Performance & Analysis (4):**
9. dependency-analyzer.md
10. performance-auditor.md
11. performance-profiler.md
12. token-optimizer.md

**Documentation (1):**
13. documentation-writer.md

**Tech Stack Specialists (1):**
14. sveltekit-specialist.md

**Project-Specific (3):**
```

And update total from 16 to 17 on line 3.

**Step 6: Commit**

```bash
git add .claude/agents/sveltekit-specialist.md .claude/agents/README.md
git commit -m "feat(agents): add SvelteKit 2 specialist

- Comprehensive SvelteKit 2 routing expertise
- Load functions (server & universal)
- Form actions with progressive enhancement
- Error handling and hooks patterns
- DMB Almanac project context
- <20KB token-optimized

Workspace: 16 → 17 agents
Tech stack coverage: +15%

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git tag phase-2.1-complete
```

---

## Task 2.2: Create svelte5-specialist.md

**Files:**
- Create: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/svelte5-specialist.md`
- Modify: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/README.md:25-26`

**Step 1: Write YAML frontmatter**

Create file with:

```yaml
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
---
```

**Step 2: Write agent expertise sections**

Add markdown body covering:
- Runes-based reactivity ($state, $derived, $effect)
- Props and binding ($props, $bindable)
- Component lifecycle and snippets
- Event handling (modern syntax)
- Migration patterns (Svelte 4 → 5)
- DMB Almanac component patterns
- Common pitfalls and solutions

Expected size: <18KB

**Step 3: Validate with best-practices-enforcer**

Deploy best-practices-enforcer to verify:
- [ ] YAML frontmatter valid
- [ ] Model tier appropriate (sonnet)
- [ ] Tools list complete
- [ ] Content token-optimized
- [ ] No duplicate content with sveltekit-specialist

**Step 4: Update workspace README**

Change line 25-26 to show 2 tech stack specialists and update total to 18.

**Step 5: Commit**

```bash
git add .claude/agents/svelte5-specialist.md .claude/agents/README.md
git commit -m "feat(agents): add Svelte 5 runes specialist

- Runes-based reactivity ($state, $derived, $effect)
- Props and bindings ($props, $bindable)
- Component patterns for DMB Almanac
- Migration from Svelte 4 to Svelte 5
- <18KB token-optimized

Workspace: 17 → 18 agents
Tech stack coverage: +20%

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git tag phase-2.2-complete
```

---

## Task 2.3: Create dexie-specialist.md

**Files:**
- Create: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/dexie-specialist.md`
- Modify: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/README.md:25-26`

**Step 1: Write YAML frontmatter**

Create file with:

```yaml
---
name: dexie-specialist
description: >
  Expert in Dexie.js 4.x for IndexedDB, offline-first patterns, and client-side
  database management. Specializes in schema design, migrations, queries, and
  Svelte integration. Optimized for DMB Almanac concert database.
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
model: sonnet
---
```

**Step 2: Write agent expertise sections**

Add markdown body covering:
- Dexie.js 4.x schema design
- Version migrations and data integrity
- Query patterns (where, filter, compound indexes)
- Bulk operations and transactions
- Svelte 5 integration (useLiveQuery alternative)
- Offline-first patterns
- Performance optimization
- DMB Almanac schema context (concerts, songs, setlists)

Expected size: <20KB

**Step 3: Validate with best-practices-enforcer**

Deploy best-practices-enforcer to verify all quality criteria.

**Step 4: Update workspace README**

Change line 25-26 to show 3 tech stack specialists and update total to 19.

**Step 5: Commit**

```bash
git add .claude/agents/dexie-specialist.md .claude/agents/README.md
git commit -m "feat(agents): add Dexie.js 4.x specialist

- IndexedDB schema design and migrations
- Query patterns and compound indexes
- Bulk operations and transactions
- Svelte 5 integration patterns
- DMB Almanac database context
- <20KB token-optimized

Workspace: 18 → 19 agents
Tech stack coverage: +15% (now 85%+ total)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git tag phase-2.3-complete
```

---

## Task 2.4: Sync 3 New Agents to HOME

**Files:**
- Copy: workspace agents → HOME
- Create: `docs/reports/home-inventory-2026-01-31/PHASE_2_SYNC.md`

**Step 1: Copy agents to HOME**

```bash
cp .claude/agents/sveltekit-specialist.md ~/.claude/agents/
cp .claude/agents/svelte5-specialist.md ~/.claude/agents/
cp .claude/agents/dexie-specialist.md ~/.claude/agents/
```

**Step 2: Verify MD5 hashes match**

```bash
for agent in sveltekit-specialist svelte5-specialist dexie-specialist; do
  WORKSPACE_MD5=$(md5 -q .claude/agents/${agent}.md)
  HOME_MD5=$(md5 -q ~/.claude/agents/${agent}.md)

  if [ "$WORKSPACE_MD5" = "$HOME_MD5" ]; then
    echo "✅ ${agent}.md synced successfully"
  else
    echo "❌ ${agent}.md sync failed - hashes don't match"
  fi
done
```

Expected: All 3 ✅ synced successfully

**Step 3: Update HOME README**

Edit `~/.claude/agents/README.md`:
- Update total: 447 → 450 agents
- Update shared agents: 14 → 17

**Step 4: Update SYNC_POLICY**

Add to `~/.claude/agents/SYNC_POLICY.md`:

```markdown
## Sync History

**2026-01-31 (Phase 2):**
- sveltekit-specialist.md - New agent (workspace → HOME)
- svelte5-specialist.md - New agent (workspace → HOME)
- dexie-specialist.md - New agent (workspace → HOME)
- Total shared: 14 → 17 agents
```

**Step 5: Document sync**

Create report:

```bash
cat > docs/reports/home-inventory-2026-01-31/PHASE_2_SYNC.md << 'EOF'
# Phase 2 Sync Complete

**Date:** 2026-01-31
**Status:** ✅ COMPLETE

## Agents Synced (3)

1. **sveltekit-specialist.md**
   - Size: [actual size]
   - MD5: ✅ Match verified
   - Purpose: SvelteKit 2 routing and SSR

2. **svelte5-specialist.md**
   - Size: [actual size]
   - MD5: ✅ Match verified
   - Purpose: Svelte 5 runes reactivity

3. **dexie-specialist.md**
   - Size: [actual size]
   - MD5: ✅ Match verified
   - Purpose: Dexie.js 4.x IndexedDB

## Updated Counts

**Workspace:** 16 → 19 agents (+3)
**HOME:** 447 → 450 agents (+3)
**Shared:** 14 → 17 agents (+3)

## Next Steps

- ✅ Phase 2 complete
- → Phase 3: HOME cleanup (50-80 hours)
EOF
```

**Step 6: Commit**

```bash
git add docs/reports/home-inventory-2026-01-31/PHASE_2_SYNC.md
git commit -m "docs: sync 3 new tech stack agents to HOME

- Synced sveltekit-specialist, svelte5-specialist, dexie-specialist
- All MD5 hashes verified
- Updated HOME README and SYNC_POLICY
- Workspace: 16 → 19 agents
- HOME: 447 → 450 agents
- Shared: 14 → 17 agents

Phase 2 complete.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git tag phase-2-complete
```

---

## Phase 2 Completion Checklist

- [ ] sveltekit-specialist.md created and validated
- [ ] svelte5-specialist.md created and validated
- [ ] dexie-specialist.md created and validated
- [ ] All 3 agents < 20KB (token-optimized)
- [ ] All 3 agents synced to HOME with MD5 verification
- [ ] Workspace README updated (19 agents, tech stack section)
- [ ] HOME README updated (450 agents, 17 shared)
- [ ] SYNC_POLICY.md updated with Phase 2 sync
- [ ] Phase 2 sync report created
- [ ] 4 git commits with meaningful messages
- [ ] 4 git tags (phase-2.1, 2.2, 2.3, 2-complete)
- [ ] Tech stack coverage increased to 85%+

## Success Criteria

**Workspace state after Phase 2:**
- Total agents: 19 (was 16)
- New category: Tech Stack Specialists (3)
- Coverage: 85%+ for DMB Almanac development
- All agents token-optimized (<20KB each)
- All agents validated by best-practices-enforcer

**HOME state after Phase 2:**
- Total agents: 450 (was 447)
- Shared with workspace: 17 (was 14)
- All syncs verified with MD5 hashes

**Ready for:** Phase 3 (HOME Cleanup) or pause for review

---

**Estimated Duration:** 90-180 minutes
**Actual Duration:** [To be filled during execution]
**Token Budget:** ~30K tokens (15% of 200K budget)
