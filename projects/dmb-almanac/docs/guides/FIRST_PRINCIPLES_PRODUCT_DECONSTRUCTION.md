# First Principles Analysis: DMB Almanac Product

## 1. Problem Statement
Enable any DMB fan to answer a specific show, song, venue, or tour question in under 10 seconds with high confidence, across desktop and mobile, with offline resilience.

## 2. Assumptions Identified
| Assumption | Why We Believe It | Evidence | Challenge | Cost If Wrong |
| --- | --- | --- | --- | --- |
| Dense stats should be the first view | Almanac heritage | Current pages are long and stat-heavy | Does density reduce comprehension for casual users? | Users bounce before finding answers |
| Search is the primary entry point | Large corpus | Search route exists | Do users start from recent shows or a calendar entry? | IA optimizes the wrong entry path |
| Navigation must expose all content types | Many routes exist | Large nav footprint | Can task-first IA reduce decision fatigue? | Navigation fatigue and lower engagement |
| Brand should be neutral | Utility bias | Minimal styling | Does neutrality reduce trust and memory? | Product feels cold, less credible |
| API should mirror DB schema | Engineering convenience | Existing patterns | Should APIs mirror user tasks instead? | API hard to use, overfetching |
| All data needs to be visible | Completeness culture | Long detail pages | Would summary-first improve time-to-answer? | Slower task completion |
| Users know DMB terminology | Power user bias | Almanac audience | Do new fans understand setlist jargon? | Confusion, higher error rate |
| Offline mode is optional | Web default | PWA already exists | Is offline required for venues and travel? | Low reliability in the field |
| More filters always help | Power tools | Many filters possible | Do filters cause choice overload? | Reduced discoverability |
| One IA fits all personas | Simplicity | Single nav | Are power and casual paths different? | Friction for one cohort |
| Performance is separate from brand | Engineering separation | Perf docs elsewhere | Does performance affect perceived trust? | Brand damage from slow UX |
| Data accuracy is assumed | Source trust | DMB Almanac source | Should provenance be visible? | Trust gaps without proof |
| Visual hierarchy can be subtle | Minimalism | Light styling | Is strong hierarchy needed for scanability? | Slower scanning, higher errors |

## 3. Fundamental Truths
- Users arrive with a question, not a taxonomy.
- Trust is created by clarity, speed, provenance, and recency.
- The first screen must answer or orient, not list everything.
- Performance and stability are part of brand perception.
- A minority of power users want depth; most users want speed.
- Mobile bandwidth and attention are limited.
- Offline access is a core use case for live events.

## 4. Conventional Approach
- Build deep pages and expose all stats up front.
- Organize navigation around data tables.
- Add filters and sorting for power users.
- Ship with neutral, tool-like visual design.

## 5. First-Principles Approach
1. Start from the user question and define the shortest path to a trusted answer.
2. Provide a summary-first view that answers the top 3 questions immediately.
3. Use progressive disclosure for deep stats and power-user tools.
4. Surface provenance and recency as first-class signals.
5. Build performance into every interaction and treat speed as UX.

## 6. Comparison
| Aspect | Conventional | First-Principles |
| --- | --- | --- |
| Primary goal | Coverage | Time-to-answer |
| First screen | Dense stats | Summary-first |
| Navigation | Data taxonomy | Task-first IA |
| Trust signals | Implicit | Explicit provenance + recency |
| Performance | Secondary | Brand-critical |
| Visual design | Neutral | Warm, credible, legible |
| Power users | First-class | Progressive depth |

## 7. Recommendations
- Use a shared summary strip on all entity pages and list headers.
- Make search and recent activity the primary entry points.
- Show provenance (source, last updated) in the summary strip.
- Add a consistent Save and Share action cluster on detail pages.
- Align API responses to user tasks with summary-first payloads.
- Treat performance budgets as part of brand standards.

## 8. Validation Metrics
- Time to answer under 10 seconds for 80 percent of participants.
- Confidence rating above 5/7 for summary-first pages.
- First click accuracy above 85 percent.
- Task completion rate above 90 percent.

## 9. Failure Modes to Watch
- Summary strip hides critical data for power users.
- Over-simplified IA reduces discoverability for rare content.
- Visual design sacrifices legibility for aesthetics.
- Offline workflows are incomplete or inconsistent.

## 10. Fundamental Constraints (Non-Negotiables)
- **Truthfulness**: Never present derived stats without source visibility.
- **Speed**: First meaningful answer must appear under 2 seconds on M-series and under 4 seconds on mid-range mobile.
- **Offline Resilience**: Core entity pages (show, song, venue) must degrade gracefully without network.
- **Accessibility**: Every interaction must be keyboard- and screen-reader-safe.
- **Stability**: Summary-first layouts must not shift (CLS < 0.1).

## 11. Derived Product Invariants
These are the "physics rules" for the product. If they break, trust erodes.

- **Invariant A**: Every entity page answers "what, when, where" above the fold.
- **Invariant B**: Provenance and recency are visible without scrolling.
- **Invariant C**: Deep stats are always one action away, not hidden behind multiple hops.
- **Invariant D**: The UI never blocks a lookup on device connectivity.
- **Invariant E**: Performance budgets are enforced per route, not just globally.

## 12. Socratic Question Bank (Use During Reviews)
- What is the exact question the user is trying to answer on this page?
- What is the minimum information required to answer it confidently?
- Which data is proof vs. decoration?
- If offline, what is the minimum viable answer?
- If we removed 50% of the content, which 20% must remain?
- What is the cheapest way to verify accuracy?

## 13. Evidence Plan (How We Prove This Works)
- **Quant**: Time-to-answer, first click accuracy, error recovery time.
- **Qual**: Confidence ratings, trust signal recall, "what did you use to decide?"
- **Behavioral**: Scroll depth and disclosure rate by persona.
- **Operational**: Cache hit rate, offline success ratio, and crash-free sessions.

## 14. Decision Tree (When Tradeoffs Collide)
| Conflict | Choose This | Because |
| --- | --- | --- |
| Density vs. clarity | Clarity | Faster comprehension drives trust |
| Visual flair vs. legibility | Legibility | Brand is remembered through confidence |
| Feature breadth vs. speed | Speed | Task success is the primary value |
| Novel UI vs. standard patterns | Standard | Reduces cognitive load |
