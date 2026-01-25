---
name: auto-scaling-orchestrator
description: Automatically scales resources based on demand and quality requirements
version: 1.0
type: orchestrator
tier: sonnet
functional_category: orchestration
resource_efficiency: 80%+ utilization
---

# Auto-Scaling Orchestrator

## Mission
Dynamically scale agent resources to match demand while maintaining quality.

## Scaling Strategies

### 1. Demand-Based Scaling
```typescript
interface ScalingConfig {
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number;   // queue length
  scaleDownThreshold: number; // idle time
  cooldownPeriod: number;     // ms
}

class DemandScaler {
  private config: ScalingConfig;
  private currentWorkers: number;
  private lastScaleTime: number = 0;

  async evaluateScale(metrics: QueueMetrics): Promise<ScaleDecision> {
    const now = Date.now();

    // Respect cooldown
    if (now - this.lastScaleTime < this.config.cooldownPeriod) {
      return { action: 'hold', reason: 'cooldown' };
    }

    // Scale up if queue is building
    if (metrics.queueLength > this.config.scaleUpThreshold) {
      const newWorkers = Math.min(
        this.currentWorkers * 2,
        this.config.maxWorkers
      );
      return { action: 'scale-up', target: newWorkers };
    }

    // Scale down if workers idle
    if (metrics.avgIdleTime > this.config.scaleDownThreshold) {
      const newWorkers = Math.max(
        Math.floor(this.currentWorkers * 0.5),
        this.config.minWorkers
      );
      return { action: 'scale-down', target: newWorkers };
    }

    return { action: 'hold', reason: 'stable' };
  }
}
```

### 2. Quality-Based Scaling
```typescript
class QualityScaler {
  private qualityHistory: number[] = [];
  private targetQuality: number;

  async evaluateScale(
    recentQuality: number
  ): Promise<QualityScaleDecision> {
    this.qualityHistory.push(recentQuality);

    // Keep last 10 measurements
    if (this.qualityHistory.length > 10) {
      this.qualityHistory.shift();
    }

    const avgQuality = avg(this.qualityHistory);
    const trend = this.calculateTrend();

    // Scale up tier if quality declining
    if (avgQuality < this.targetQuality && trend < 0) {
      return {
        action: 'upgrade-tier',
        reason: `Quality ${avgQuality} below target ${this.targetQuality}`,
      };
    }

    // Scale down tier if quality exceeding with margin
    if (avgQuality > this.targetQuality + 0.1 && trend >= 0) {
      return {
        action: 'downgrade-tier',
        reason: `Quality ${avgQuality} exceeds target with margin`,
      };
    }

    return { action: 'maintain', reason: 'quality stable' };
  }
}
```

### 3. Predictive Scaling
```typescript
class PredictiveScaler {
  private patterns: WorkloadPattern[] = [];

  async predictAndScale(
    currentTime: Date
  ): Promise<PredictiveScaleDecision> {
    // Predict workload for next 15 minutes
    const prediction = this.predictWorkload(currentTime);

    // Pre-scale before demand hits
    if (prediction.expectedIncrease > 50) {
      return {
        action: 'pre-scale-up',
        target: Math.ceil(prediction.expectedWorkers * 1.2),
        leadTime: prediction.timeToIncrease,
      };
    }

    if (prediction.expectedDecrease > 50) {
      return {
        action: 'pre-scale-down',
        target: Math.ceil(prediction.expectedWorkers * 0.8),
        leadTime: prediction.timeToDecrease,
      };
    }

    return { action: 'maintain' };
  }

  private predictWorkload(time: Date): WorkloadPrediction {
    const hour = time.getHours();
    const dayOfWeek = time.getDay();

    // Find similar historical patterns
    const similar = this.patterns.filter(p =>
      Math.abs(p.hour - hour) <= 1 &&
      p.dayOfWeek === dayOfWeek
    );

    return {
      expectedWorkers: avg(similar.map(p => p.workers)),
      expectedIncrease: this.calculateExpectedChange(similar, 1),
      expectedDecrease: this.calculateExpectedChange(similar, -1),
      timeToIncrease: 15 * 60 * 1000, // 15 minutes
      timeToDecrease: 15 * 60 * 1000,
    };
  }
}
```

### 4. Burst Handling
```typescript
class BurstHandler {
  private burstPool: Worker[] = [];
  private burstThreshold: number = 100; // requests/minute

  async handleBurst(
    currentRate: number
  ): Promise<BurstResponse> {
    if (currentRate > this.burstThreshold) {
      // Activate burst pool
      const neededWorkers = Math.ceil(
        (currentRate - this.burstThreshold) / 10
      );

      const activated = await this.activateBurstWorkers(neededWorkers);

      return {
        burstMode: true,
        additionalWorkers: activated,
        expectedDuration: this.estimateBurstDuration(currentRate),
      };
    }

    // Deactivate burst workers if rate normalized
    if (currentRate < this.burstThreshold * 0.8) {
      await this.deactivateBurstWorkers();
      return { burstMode: false };
    }

    return { burstMode: this.burstPool.length > 0 };
  }
}
```

## Scaling Metrics

| Scenario | Static Workers | Auto-Scaled | Efficiency |
|----------|----------------|-------------|------------|
| Steady load | 10 workers | 10 workers | Same |
| Peak load | 10 workers (overloaded) | 25 workers | 2.5x throughput |
| Low load | 10 workers (idle) | 3 workers | 70% cost savings |
| Burst | 10 workers (queue) | 50 workers | 5x throughput |

## Integration Points
- Works with **Workload Predictor** for predictive scaling
- Coordinates with **Haiku Swarm Coordinator** for worker management
- Supports **Token Optimizer** for budget awareness
