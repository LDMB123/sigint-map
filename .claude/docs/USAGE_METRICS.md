# Claude Code Usage Metrics Documentation

Track actual agent and system usage to optimize configuration.

## Purpose

Document real usage patterns to validate parallelization limits, identify optimization opportunities, and guide future configuration tuning.

## Metrics to Track

### Agent Concurrency
```yaml
date: 2026-01-30
peak_concurrent_agents:
  haiku: <actual_count> / 100 (burst: 150)
  sonnet: <actual_count> / 25 (burst: 30)
  opus: <actual_count> / 5
  total: <actual_count> / 130 (burst: 185)

average_concurrent:
  haiku: <avg>
  sonnet: <avg>
  opus: <avg>

utilization_percentage:
  haiku: <peak/limit * 100>%
  sonnet: <peak/limit * 100>%
  opus: <peak/limit * 100>%
```

### Agent Invocation Frequency
```yaml
most_used_agents:
  - name: code-generator
    invocations: <count>
    tier: sonnet
  - name: error-debugger
    invocations: <count>
    tier: sonnet
  - name: feature-dev:code-reviewer
    invocations: <count>
    tier: sonnet

least_used_agents:
  - name: <agent>
    invocations: <count>
    note: "Consider deprecating if consistently <5 uses/week"
```

### Route Table Accuracy
```yaml
routing_stats:
  total_requests: <count>
  route_table_hits: <count>
  category_fallbacks: <count>
  default_route_usage: <count>

  accuracy: <hits/total * 100>%
  fallback_rate: <fallbacks/total * 100>%

most_common_routes:
  - route_id: "0x0100000000000000"
    count: <invocations>
    agent: code-generator
  - route_id: "0x0800000000000000"
    count: <invocations>
    agent: test-generator
```

### Skill Usage
```yaml
most_used_skills:
  - name: organization
    invocations: <count>
  - name: sveltekit
    invocations: <count>

skill_effectiveness:
  - name: predictive-caching
    hit_rate: <percentage>
    token_savings: <amount>
  - name: cache-warmer
    files_cached: <count>
    cache_hit_rate: <percentage>
```

### Token Economy
```yaml
token_usage:
  total_tokens_session: <count>
  avg_tokens_per_request: <count>
  peak_tokens_single_request: <count>

token_savings:
  from_caching: <tokens_saved>
  from_compression: <tokens_saved>
  total_savings: <tokens_saved>
  efficiency: <savings/total * 100>%

token_budget_violations: <count>
```

### Performance Metrics
```yaml
response_times:
  p50: <milliseconds>
  p95: <milliseconds>
  p99: <milliseconds>

throughput:
  requests_per_minute: <count>
  peak_rpm: <count>

error_rate: <errors/total * 100>%
```

## How to Collect

### Manual Tracking (Current)
Log metrics at end of each significant session in this file.

### Future: Automated Tracking
Consider implementing:
- `.claude/telemetry/` directory with JSON logs
- Telemetry agent that monitors and logs usage
- Dashboard script to visualize metrics
- Weekly summary generation

## Usage Instructions

1. After major work session, update sections above
2. Note date and context (what work was done)
3. Track trends over time
4. Identify optimization opportunities

## Baseline Targets

Based on `.claude/config/parallelization.yaml`:
- Haiku burst capacity: 150 concurrent
- Sonnet burst capacity: 30 concurrent
- Opus limit: 5 concurrent
- Queue depth: 1000 max
- Request timeout: Varies by tier (30s-300s)

## Optimization Thresholds

**Underutilization** (< 30% of limit consistently):
- Consider reducing resource pool sizes
- May indicate over-provisioning

**High utilization** (> 80% of limit):
- Monitor for backpressure
- Consider burst mode activation
- May need limit increase

**Frequent fallbacks** (> 20% using default route):
- Optimize route table
- Add specialized routes
- Improve domain/action mapping

## Next Steps

1. Establish baseline metrics (first week)
2. Track weekly for one month
3. Analyze trends and patterns
4. Adjust parallelization config based on actual usage
5. Document before/after comparisons
