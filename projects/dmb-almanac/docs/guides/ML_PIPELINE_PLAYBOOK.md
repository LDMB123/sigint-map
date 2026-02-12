# ML Pipeline Playbook - DMB Almanac

## Objective
Deliver lightweight, trustworthy ML features (setlist prediction, liberation likelihood, and recommendation ranking) without compromising offline-first performance.

## Target Use Cases
- **Setlist prediction**: Suggest likely next songs for a tour stop.
- **Liberation likelihood**: Estimate probability of rare songs appearing.
- **Recommendation ranking**: Surface personalized "next to explore" shows/songs.

## Data Sources
- Historical show setlists (1991–present)
- Song metadata: debut date, total plays, gap days
- Venue metadata: region, capacity proxy, recurring tours
- Tour metadata: tour year, leg, recent rotation

## Feature Set (v1)
- Song recency: days since last played
- Tour rotation index: rolling 5-show frequency
- Venue recurrence: shows at venue in current year
- Opener/closer frequency for current tour
- Guest appearance patterns (binary)
- Seasonality: month and weekday

## Pipeline Stages
1. **Data prep**: normalize setlist entries + derive rolling features
2. **Training**: gradient-boosted ranking model (top-K)
3. **Evaluation**: top-10 accuracy, precision@5, recall@10
4. **Safety**: bias check (era recency bias) + drift check
5. **Deployment**: on-device inference for top-K, server fallback for cold start

## Artifacts
- `features.parquet` (feature store snapshot)
- `model.onnx` (portable inference)
- `eval.json` (metrics + slices)
- `serving.json` (config + thresholds)

## Monitoring
- Drift detection on recency distribution
- Prediction CTR and correction rate
- Latency p95 and memory usage

## Rollout Plan
- Phase 1: Shadow mode (no UI)
- Phase 2: Optional UI with user feedback
- Phase 3: Default predictions with explainability

## Explainability Requirements
- Show top 3 contributing signals: recency, tour rotation, venue history
- Display confidence bucket (low/medium/high)

## Cost Targets
- Training: < $50/month
- Inference: < $0.01 per session (on-device)

## Risks
- Overfitting to recent years
- Sparse data for early tours
- Loss of trust if predictions feel random
