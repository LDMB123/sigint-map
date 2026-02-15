# V29 C Batch Synthesis (A/B Audit -> C Prompts)

## Purpose
Turn A-vs-B audit outcomes into deterministic, high-signal prompt guidance for C batch generation.
The C strategy is not a style blend. It is an evidence-based fusion that keeps the strongest baseline and imports only audited gains.

## Implementation Points
- `deriveStrategyCLessons(scoreA, scoreB, baseLessons, options)` in `vegas-v29-apex.js`
- Non-phased C generation path: logs `C PROMPT SYNTHESIS (A/B audit -> first-principles fusion):`
- Phased C generation path: logs `PHASE C SYNTHESIS (A/B audit -> first-principles fusion):`

## Inputs Used for C Synthesis
- A/B overall scores and metric scores:
  - `identity_score`
  - `anatomy_score`
  - `garment_physics_score`
  - `optics_score`
  - `realism_score`
  - `compliance_score`
- Deep audit metrics (`deepAudit.metrics`) when available.
- Shared and baseline lessons from prior passes.
- `concept` name and variation motif metadata when present.

## First-Principles Decision Model
1. Identify the better baseline: choose winner `A` or `B` by overall score.
2. Fix the objective: beat `best(A,B)` without identity drift or compliance regression.
3. Reject blanket merges: import only traits with metric-level evidence.
4. Preserve macro structure first, then add micro-upgrades.
5. Resolve conflicts by causal realism and guardrail safety, not intensity.

## Metric Fusion Rules
- Keep winner-led metrics with meaningful separation (`absDelta >= 0.25`).
- Import loser-led advantages as targeted directives (`absDelta >= 0.20`).
- Close winner weak spots for metrics with low absolute values (`<= 9.6`).
- If A/B are near-tied (`overallDelta < 0.2`), reduce style exploration and increase strictness.
- Otherwise, preserve winner backbone and treat loser as a selective upgrade source.

## Creative Event Anchoring
C prompts keep event intent explicit:
- Concept anchor: preserve one clear hero moment for the named concept.
- Motif anchor: preserve dominant motif signal while keeping subject prominence first.

## Variation Handling (Phased Path Fix)
In phased flow, `variationForC` is resolved before lesson synthesis:
1. Initialize `sharedVariation` if needed.
2. Initialize `variationC` (optionally locked to A/B variation).
3. Compute `variationForC = variationC || sharedVariation || null`.
4. Pass `variationForC` into both:
   - `deriveStrategyCLessons(...)`
   - `ensureApproachFrontierOutput(...)`

This prevents C synthesis from reading an undefined variation context.

## Output Shape
`deriveStrategyCLessons(...)` returns normalized lessons (capped) that include:
- First-principles scaffold directives.
- Winner/loser metric fusion directives.
- Gap-closing directives.
- Concept and motif anchors.
- Tie-sensitive control directives.

## Operational Checks
- Confirm synthesis logs appear for each concept before C generation.
- Confirm top lessons reflect winner backbone plus selective imports.
- If C degrades vs best(A,B), inspect:
  - audit deltas used for imports,
  - variation lock settings,
  - identity/compliance emphasis in synthesized lessons.
