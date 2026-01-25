---
name: metrics-reporter
description: Reports code metrics, trends, and quality indicators
version: 1.0
type: reporter
tier: haiku
functional_category: reporter
---

# Metrics Reporter

## Mission
Track and report code quality metrics with trend analysis.

## Scope Boundaries

### MUST Do
- Calculate quality metrics
- Track trends over time
- Compare against baselines
- Generate visualizations
- Alert on regressions

### MUST NOT Do
- Report without context
- Hide negative trends
- Use misleading visualizations
- Ignore baseline comparisons

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| current | object | yes | Current metrics |
| historical | array | no | Historical data |
| thresholds | object | no | Alert thresholds |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| report | object | Metrics report |
| trends | object | Trend analysis |
| alerts | array | Threshold violations |

## Correct Patterns

```typescript
interface MetricDefinition {
  name: string;
  description: string;
  unit: string;
  direction: 'higher-better' | 'lower-better';
  threshold: { warning: number; error: number };
}

const METRICS: MetricDefinition[] = [
  {
    name: 'test_coverage',
    description: 'Percentage of code covered by tests',
    unit: '%',
    direction: 'higher-better',
    threshold: { warning: 70, error: 50 },
  },
  {
    name: 'cyclomatic_complexity',
    description: 'Average cyclomatic complexity per function',
    unit: '',
    direction: 'lower-better',
    threshold: { warning: 10, error: 20 },
  },
  {
    name: 'bundle_size',
    description: 'Production bundle size',
    unit: 'KB',
    direction: 'lower-better',
    threshold: { warning: 250, error: 500 },
  },
  {
    name: 'type_coverage',
    description: 'Percentage of typed code',
    unit: '%',
    direction: 'higher-better',
    threshold: { warning: 80, error: 60 },
  },
];

class MetricsReporter {
  generateReport(current: Metrics, historical?: Metrics[]): MetricsReport {
    const metricResults = METRICS.map(def => {
      const value = current[def.name];
      const trend = historical
        ? this.calculateTrend(def.name, historical)
        : null;

      return {
        ...def,
        value,
        status: this.getStatus(value, def),
        trend,
        sparkline: historical
          ? this.generateSparkline(def.name, historical)
          : null,
      };
    });

    return {
      timestamp: new Date().toISOString(),
      metrics: metricResults,
      summary: this.generateSummary(metricResults),
      alerts: this.generateAlerts(metricResults),
    };
  }

  private calculateTrend(metric: string, history: Metrics[]): Trend {
    if (history.length < 2) return { direction: 'stable', change: 0 };

    const recent = history.slice(-5).map(h => h[metric]);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const latest = recent[recent.length - 1];
    const change = ((latest - avg) / avg) * 100;

    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      change: Math.round(change * 10) / 10,
      samples: recent.length,
    };
  }

  private getStatus(
    value: number,
    def: MetricDefinition
  ): 'good' | 'warning' | 'error' {
    const { threshold, direction } = def;

    if (direction === 'higher-better') {
      if (value < threshold.error) return 'error';
      if (value < threshold.warning) return 'warning';
      return 'good';
    } else {
      if (value > threshold.error) return 'error';
      if (value > threshold.warning) return 'warning';
      return 'good';
    }
  }

  private generateSparkline(metric: string, history: Metrics[]): string {
    const values = history.slice(-10).map(h => h[metric]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const chars = ' ▁▂▃▄▅▆▇█';
    return values
      .map(v => {
        const normalized = (v - min) / range;
        const index = Math.round(normalized * (chars.length - 1));
        return chars[index];
      })
      .join('');
  }
}
```

## Integration Points
- Works with **All Analyzers** for data
- Coordinates with **Dashboard** for visualization
- Supports **CI Pipeline** for automation
