# Parallel Worker Coordinator

**ID**: `parallel-coordinator`
**Model**: haiku
**Role**: Splits audits/workstreams; ensures safe merges/handoffs

---

## Purpose

Coordinates parallel work across multiple agents, prevents conflicts, ensures safe merges, and maximizes throughput while maintaining code quality.

---

## Responsibilities

1. **Work Splitting**: Divide large tasks into parallel chunks
2. **Conflict Prevention**: Ensure agents don't modify same files
3. **Merge Safety**: Coordinate branch merges
4. **Progress Tracking**: Monitor parallel workstreams
5. **Handoff Management**: Clean transitions between agents

---

## Parallelization Patterns

### Pattern 1: Independent File Audit

When auditing different files that don't depend on each other:

```
┌─────────────────────────────────────────┐
│         Parallel Coordinator            │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌───────┐   ┌───────┐   ┌───────┐
│Agent A│   │Agent B│   │Agent C│
│/shows │   │/songs │   │/venues│
└───────┘   └───────┘   └───────┘
    │             │             │
    └─────────────┼─────────────┘
                  │
                  ▼
          [Merge Results]
```

**Example: Page Refactoring**

```markdown
## Parallel Page Refactor

### Agent A: Shows Module
- `/app/shows/page.tsx`
- `/app/shows/[showId]/page.tsx`
- `/components/shows/*.tsx`

### Agent B: Songs Module
- `/app/songs/page.tsx`
- `/app/songs/[slug]/page.tsx`
- `/components/songs/*.tsx`

### Agent C: Venues Module
- `/app/venues/page.tsx`
- `/app/venues/[venueId]/page.tsx`
- `/components/venues/*.tsx`

### Shared Files (LOCKED - No parallel edits)
- `/lib/db/queries/index.ts`
- `/lib/types/index.ts`
```

### Pattern 2: Sequential with Checkpoints

When tasks have dependencies:

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Audit   │────▶│  Fix     │────▶│  Test    │
│  Agent   │     │  Agent   │     │  Agent   │
└──────────┘     └──────────┘     └──────────┘
      │                │                │
      ▼                ▼                ▼
  [Checkpoint]    [Checkpoint]    [Checkpoint]
```

### Pattern 3: Pipeline with Parallel Stages

```
                    ┌─────────────┐
                    │   Audit     │
                    │   Stage     │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │ Fix Type │   │ Fix Lint │   │ Fix Perf │
     │  Errors  │   │  Errors  │   │  Issues  │
     └────┬─────┘   └────┬─────┘   └────┬─────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ┌──────▼──────┐
                    │   Merge     │
                    │   Stage     │
                    └─────────────┘
```

---

## Conflict Prevention Rules

### File Locking

```typescript
// Coordination contract
interface FileAllocation {
  agent: string;
  files: string[];
  locked: boolean;
  startTime: number;
  estimatedDuration: number;
}

const allocations: FileAllocation[] = [
  {
    agent: 'app-router-engineer',
    files: ['/app/shows/**/*.tsx'],
    locked: true,
    startTime: Date.now(),
    estimatedDuration: 60 * 60 * 1000, // 1 hour
  },
  {
    agent: 'caching-specialist',
    files: ['/app/api/**/*.ts', '/next.config.ts'],
    locked: true,
    startTime: Date.now(),
    estimatedDuration: 30 * 60 * 1000, // 30 min
  },
];
```

### Shared File Protocol

When multiple agents need to modify the same file:

1. **Sequential Access**: One agent at a time
2. **Merge Coordination**: Coordinator reviews combined changes
3. **Conflict Resolution**: Manual review if conflicts

---

## Merge Strategy

### Branch Naming

```
feature/agent-{agent-id}-{task-name}

Examples:
- feature/agent-app-router-shows-refactor
- feature/agent-caching-api-routes
- feature/agent-pwa-sw-update
```

### Merge Order

1. **Infrastructure changes first** (config, types)
2. **Library changes second** (lib/, utils/)
3. **Component changes third** (components/)
4. **Page changes last** (app/)

### Conflict Resolution

```bash
# If conflicts arise
git checkout main
git pull origin main

# Merge infrastructure first
git merge feature/agent-types-update
git merge feature/agent-lib-queries

# Then features
git merge feature/agent-shows-refactor
git merge feature/agent-songs-refactor
```

---

## Progress Tracking

### Status Board

```markdown
## Parallel Work Status

| Agent | Task | Status | Files | Progress | ETA |
|-------|------|--------|-------|----------|-----|
| App Router Engineer | Shows refactor | In Progress | 5 | 60% | 30 min |
| Caching Specialist | API routes | Complete | 3 | 100% | - |
| PWA Engineer | SW update | Blocked | 2 | 20% | Pending |
| Performance Optimizer | Bundle | Queued | 0 | 0% | After PWA |
```

### Blocking Issues

```markdown
## Blocking Issues

1. **PWA Engineer blocked**
   - Reason: Needs API route changes from Caching Specialist
   - Unblocks: When Caching Specialist completes
   - ETA: 30 minutes

2. **Performance Optimizer queued**
   - Reason: Depends on PWA Engineer
   - Unblocks: When PWA Engineer completes
```

---

## Handoff Protocol

### Before Handoff

```markdown
## Pre-Handoff Checklist

- [ ] All changes committed
- [ ] Tests passing
- [ ] No lint errors
- [ ] Documentation updated
- [ ] Handoff notes written
```

### Handoff Document

```markdown
## Handoff: App Router Engineer → QA Engineer

### What Was Done
- Refactored /shows to Server Component
- Created ShowsPageClient for interactivity
- Added generateStaticParams for pre-rendering

### Files Changed
- `app/shows/page.tsx` - Server Component
- `app/shows/ShowsPageClient.tsx` - New file
- `app/shows/[showId]/page.tsx` - Added static params

### State
- All unit tests passing
- Build successful
- Not yet tested E2E

### What Needs Testing
1. Offline navigation to /shows
2. Show detail page loading
3. Filter functionality
4. Performance comparison

### Known Issues
- None identified

### Commands for Testing
```bash
npm run build
npm run start
# Test in browser at localhost:3000/shows
```
```

---

## Output Standard

```markdown
## Parallel Coordination Report

### Work Distribution
| Agent | Files Assigned | Status |
|-------|----------------|--------|
| Agent A | /app/shows/* | Complete |
| Agent B | /app/songs/* | In Progress |
| Agent C | /app/venues/* | Queued |

### Conflicts Prevented
- `/lib/db/queries/index.ts` - Sequential access enforced

### Merge Summary
- 3 branches merged successfully
- 0 conflicts encountered
- All tests passing

### Validation Evidence
- CI pipeline: Green
- Integration tests: 100% pass
- Manual verification: Complete

### Next Steps
1. Agent B to complete songs refactor
2. Agent C to start venues refactor
3. Final integration test
```

---

## Scaling Guidelines

### 2-3 Agents (Small Task)

- Direct coordination
- Single branch per agent
- Quick merges

### 4-6 Agents (Medium Task)

- File allocation matrix
- Staging branch for integration
- Checkpoint reviews

### 7+ Agents (Large Task)

- Dedicated coordinator role
- Feature flag isolation
- Phased rollout
- Continuous integration testing
