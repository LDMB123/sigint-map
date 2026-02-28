# Speakeasy v4 Full Audit (20 Prompt Batch)

## Scope
- Run: `/Users/louisherman/nanobanana-output/projects/img_1300/speakeasy-safe-fallback-20260221-190255/summary.json`
- Prompt pack: `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/speakeasy_20_prompts_two_piece_cutting_edge_v4.md`
- Evaluation target: raise quality pass rate by >=50% through prompt rewrite.

## 1) Problem Statement
The real problem is not identity or physics realism baseline. The dominant issue is **style/wardrobe drift under hard constraints**, especially:
- edge-energy collapse (editorial looks become safer/casual)
- attire topology collapse (two-piece intent drifts toward one-piece silhouettes)
- occasional prompt-material substitution (for example, lamé intent not rendered)

## 2) Observed Outcomes
- prompts: 20
- successful images: 17
- failed images: 3 (all due HTTP 429)
- qualityPass: 8
- qualityFail: 6
- qualityScorerUnavailable: 6

## 3) Dimension-Level Findings (scored subset n=11)
- identity mean: 9.364
- gaze mean: 9.136
- realism mean: 9.091
- physics mean: 9.200
- edge mean: 8.782 (lowest stable dimension)
- attireReplacement mean: 9.000 but high variance due substitution outliers

Failed-dimension frequency:
- edge: 3
- attireReplacement: 1

## 4) Prompt-Level Failure Signals
Quality-failed prompts with explicit diagnostics:
- 02 Piano Noir Voltage: edge too low, mood read as too bright/non-noir
- 09 Swing Floor Ruby Pulse: edge too low, weak editorial force
- 12 Vault Lamé Resolve: attireReplacement + edge failure, lamé intent collapsed

Scorer-unavailable prompts (parse issues) included 08 and 11 snippets showing likely low attireReplacement, indicating hidden topology drift risk.

## 5) First-Principles Analysis
Fundamental truths:
1. Model follows **strongest repeated invariants**; soft style language drifts.
2. Two-piece intent must be enforced as **topology constraints**, not just fashion adjectives.
3. Edge energy depends on **scene-lighting constraints**, not only wardrobe descriptors.
4. Material intent (lamé, satin, metallic) requires **optical behavior constraints** to avoid substitution.

Assumptions invalidated by this batch:
- Assumption: “physics block alone guarantees edgy output.”
  - Not true; high physics scores coexisted with low edge scores.
- Assumption: “two-piece wording is enough.”
  - Not true; some outputs drifted toward one-piece silhouettes.
- Assumption: “safe variant naturally keeps editorial edge.”
  - Not always; safe can become plain without edge lock constraints.

## 6) Root Causes
- Missing hard anti-substitution constraints for garment topology.
- Missing hard scene-mood constraints for noir/editorial contrast.
- Prompt-specific weak points lacked targeted guardrails (02, 08, 09, 11, 12).

## 7) Rewrite Strategy (v6)
Global additions to every primary/safe prompt:
- Two-piece topology lock (explicit visible separation).
- Forbidden substitutions list (one-piece dress/bodysuit/jumpsuit/etc).
- Material-color dominance lock.
- Edge mood lock (nightlife contrast; no flat/daylight/domestic read).
- Physics innovation stack restated as hard constraints.

Targeted corrective additions:
- 02: noir lighting correction block.
- 08: anti-one-piece integrity block.
- 09: edge-presence/crowd-deemphasis block.
- 11: anti-one-piece integrity block.
- 12: metallic lamé optical lock block.

## 8) Deliverables Produced
- Structured audit data:
  - `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/speakeasy_v4_full_audit.json`
- Human-readable audit:
  - `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/speakeasy_v4_full_audit.md`
- Rewritten prompt pack:
  - `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/speakeasy_20_prompts_two_piece_cutting_edge_v6_audit.md`
- Runner default updated to v6:
  - `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/run_speakeasy_safe_fallback_batch.mjs`

## 9) Success Criterion for Next Full Run
Primary metric target versus v4 baseline:
- qualityPass from 8 -> >=12 (>=50% lift)

Secondary targets:
- reduce edge failures from 3 -> <=1
- reduce attireReplacement failures from 1+hidden to 0 explicit failures
- keep identity/gaze/physics means >= current levels
