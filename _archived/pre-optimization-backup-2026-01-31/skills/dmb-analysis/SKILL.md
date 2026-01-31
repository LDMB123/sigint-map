---
name: dmb-analysis
description: >
  Dave Matthews Band data analysis, setlist statistics, song tracking,
  tour analysis, venue intelligence, guest appearances, rarity scoring,
  and bustout prediction for the DMB Almanac project.
disable-model-invocation: true
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# DMB Analysis Skill

Comprehensive analysis toolkit for Dave Matthews Band concert data,
setlist patterns, and statistical insights.

## Capabilities

- **Song Statistics**: Play counts, frequency trends, gap analysis, rotation patterns
- **Setlist Analysis**: Pattern detection, song clustering, set position tracking
- **Tour Analysis**: Tour-level statistics, geographic patterns, leg comparisons
- **Venue Intelligence**: Venue-specific setlist trends, capacity correlations, regional patterns
- **Guest Appearance Tracking**: Frequency tiers, collaboration networks, instrument tracking
- **Rarity Scoring**: Song rarity classification, bustout threshold detection
- **Show Rating**: Multi-factor show quality assessment
- **Liberation Predictor**: Predict which songs are due for return based on gap analysis

## When to Use

- Analyzing DMB setlist data from dmbalmanac.com
- Building statistical models for song prediction
- Generating tour reports and venue analysis
- Tracking guest musician patterns
- Assessing show quality and song rarity

## Data Sources

- **dmbalmanac.com**: Primary source for historical show data (2,800+ shows)
- **Song catalog**: 500+ songs spanning 1991-present
- **Venue archives**: 100+ regular venues with complete history

## Key Concepts

### Guest Frequency Tiers
- **Tier 1 (Legendary)**: 800+ appearances (Tim Reynolds)
- **Tier 2 (Regular)**: 500-799 appearances (Rashawn Ross, Jeff Coffin)
- **Tier 3 (Frequent)**: 100-499 appearances (Butch Taylor, Buddy Strong)
- **Tier 4 (Notable)**: 20-99 appearances (Warren Haynes)
- **Tier 5 (Occasional)**: 5-19 appearances
- **Tier 6 (Rare)**: 1-4 appearances

### Rarity Classification
- **Common**: Played at 50%+ of shows in a tour
- **Regular**: Played at 20-49% of shows
- **Uncommon**: Played at 5-19% of shows
- **Rare**: Played at 1-4% of shows
- **Bustout**: Not played in 50+ consecutive shows

### Show Rating Factors
- Setlist uniqueness score
- Song rarity aggregate
- Jam quality indicators
- Guest appearance bonus
- Venue atmosphere factor

## Procedure

1. **Identify analysis type** (song stats, tour analysis, venue report, etc.)
2. **Gather data** from dmbalmanac.com scraper output or local database
3. **Apply statistical methods** appropriate to the question
4. **Generate visualizations** using D3.js components if needed
5. **Present findings** with supporting evidence and confidence levels

## Supporting Reference Files

See the following files in this directory for detailed reference material:

- `accessibility-reference.md` - A11y patterns for DMB Almanac UI
- `technical-reference.md` - Technical implementation details (ESM, browser APIs, etc.)
- `scraper-reference.md` - Scraping patterns and selector fixes for dmbalmanac.com
- `pwa-reference.md` - PWA features (install banner, file handler, service worker)
- `performance-reference.md` - Performance optimization (lazy loading, memory, profiling)
