# Deployment Strategy

Configure deployment strategies: blue-green, canary, or rolling.

## Usage

`/deployment-strategy [strategy]` - Configure deployment strategy

## Arguments

- `strategy` (optional): canary (default), blue-green, rolling

## What This Skill Does

1. **Analyzes infrastructure** - K8s, ECS, or serverless
2. **Configures traffic splitting** - Gradual rollout percentages
3. **Sets up health checks** - Readiness and liveness probes
4. **Defines rollback triggers** - Error rate thresholds
5. **Creates runbooks** - Deployment and rollback procedures

## Strategies

### Canary
- 5% → 25% → 50% → 100% traffic progression
- Automatic rollback on error spike
- Metric comparison between versions

### Blue-Green
- Full environment duplication
- Instant traffic switch
- Easy rollback to previous environment

### Rolling
- Pod-by-pod replacement
- Zero downtime updates
- Resource efficient

## Output

```yaml
# canary deployment
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: {duration: 10m}
        - setWeight: 25
        - pause: {duration: 10m}
        - setWeight: 50
        - pause: {duration: 10m}
```
