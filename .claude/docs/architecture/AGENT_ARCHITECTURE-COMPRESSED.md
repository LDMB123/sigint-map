<!-- Compressed: Original 20017B | Compressed 3341B | Ratio 83.3% | Date: 2026-02-02 -->
<!-- Full details: AGENT_ARCHITECTURE.md -->

# DMB Bustout Predictor - ML Architecture

## Problem
Predict which DMB songs get "busted out" (50+ day gap) at upcoming shows from 2,800+ historical performances and 500-song catalog.

## Ensemble: 3 Models

| Model | Role | Architecture | Weight |
|-------|------|-------------|--------|
| XGBoost | Primary pattern recognition | 200 trees, depth 8, lr 0.1, col/row subsample 0.9/0.8, early stop 25 rounds | 0.50 |
| Neural Net | Complex interactions | 256-128-64-32 dense + ReLU + BatchNorm + Dropout(0.2), Adam lr=0.001, patience=10 | 0.30 |
| Bayesian LogReg | Uncertainty quantification | Normal(0,1) prior, variational inference 5k steps, 1k MC posterior samples | 0.20 |

**Combination**: `P = 0.5*P_xgb + 0.3*P_nn + 0.2*P_bayes` (weights optimized on validation AUC)
- Confidence intervals from Bayesian 2.5th/97.5th percentiles

## Feature Engineering (500+ features per song)

| Category | Key Features |
|----------|-------------|
| Days Since Played | Raw, log transform, exponential decay (e^(-d/365)), percentile rank, bustout threshold (>300d) |
| Venue History | Play count at venue, specialty ratio, days since at venue, capacity category |
| Tour Structure | Leg position (open/mid/close), tour days elapsed, normalized show position, multi-night indicator |
| Seasonality | Month, season, historical monthly frequency, seasonal deviation (z-score) |
| Recent Patterns | Frequency in last 5/10/20 shows, gap trajectory (increasing/decreasing), co-appearance correlations |

## Training Pipeline

- **Data**: 2,400 shows x ~500 songs = ~1.2M instances, ~4% positive rate
- **Imbalance handling**: SMOTE (3:1 ratio) for trees, class weights (20x) for NN, stratified splits
- **Validation**: Time-series 5-fold CV (no future leakage), folds span 1991-2016
- **Metrics**: AUC-ROC, logloss, Precision@K, Recall@K (NOT accuracy)
- **Hyperparameter tuning**: Grid search on validation AUC

## Test Performance (2024 Q3-Q4 holdout)

| Model | AUC-ROC | Logloss | P@5 | R@5 |
|-------|---------|---------|-----|-----|
| XGBoost | 0.81 | 0.42 | 0.32 | 0.28 |
| Neural Net | 0.79 | 0.44 | 0.30 | 0.26 |
| Bayesian | 0.76 | 0.40 | 0.28 | 0.24 |
| **Ensemble** | **0.84** | **0.38** | **0.35** | **0.32** |

Per-song AUC range: 0.65 (Jimi Thing) to 0.92 (Ants Marching)

## Prediction Flow

1. **Input**: tour_date, venue, recent 10 setlists, tour context
2. **Feature eng**: 500+ features per song from historical data
3. **Inference**: 3 models produce probabilities
4. **Ensemble**: Weighted combination + Bayesian CI
5. **Output**: Ranked songs with probability [lower-upper CI], days since, key reason, set position prediction

## Calibration
- Binned predicted vs observed frequencies match closely
- Bayesian component ensures calibrated probabilities

## Monitoring & Retraining

- **Drift detection**: Alert on 5%+ AUC drop
- **Retrain triggers**: 50+ new shows OR 4 weeks OR drift detected
- **Deploy gate**: New model must improve AUC by >0.01

## Collaboration
- Receives from: commander (task delegation)
- Delegates to: specialized-agents (domain subtasks)
- Escalates to: orchestrator (complex scenarios)
- Returns to: commander (results/status)
- Cost tier: haiku (~$0.005/execution)
