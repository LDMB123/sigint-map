# First-Principles Product Deconstruction (Condensed)

## Product Objective

Help a user answer a show/song/venue/tour question quickly, confidently, and reliably (including weak/no network conditions).

## Core Truths

- Users arrive with questions, not schema knowledge.
- Trust comes from clarity, speed, recency, and provenance.
- Summary-first improves time-to-answer; deep stats should remain accessible.
- Performance and stability are part of product quality, not separate concerns.

## Common Assumption Risks

- Dense first screens can slow comprehension.
- Taxonomy-heavy navigation can increase decision fatigue.
- Implicit trust signals can reduce confidence in answers.
- One IA path can underserve casual vs power users.

## Product Invariants

- Above the fold should answer key “what/when/where” context.
- Provenance/recency must be visible without deep navigation.
- Deep stats remain one action away.
- Core lookups must degrade gracefully offline.
- Layout/perf regressions should be treated as correctness issues.

## Decision Rules

When tradeoffs conflict:

- Choose clarity over density.
- Choose legibility over visual novelty.
- Choose speed over breadth in first interactions.
- Choose standard interaction patterns over clever custom flows.

## Validation Metrics

- Time-to-answer for common tasks.
- First-click accuracy on key journeys.
- User confidence in answer quality.
- Offline task success rate.

## Canonical References

- Current operational state: `STATUS.md`
- UX roadmap context: `docs/reports/STRATEGIC_ROADMAP_2026.md`
- QA strategy: `docs/guides/QUALITY_ASSURANCE_STRATEGY.md`

## Note

This condensed guide preserves decision-level principles while reducing token-heavy narrative detail.
