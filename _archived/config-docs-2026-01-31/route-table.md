# Route Table Documentation

## Overview

The route table (`route-table.json`) provides semantic hash-based routing to map tasks to optimal agents based on domain, action type, complexity level, and context.

## File Location

```
/Users/louisherman/ClaudeCodeProjects/.claude/config/route-table.json
```

**Stats**: 567 lines, 20KB

## Architecture

### Hash Pattern Format

```
domain:action:complexity:context
```

**Components**:
- **domain**: Task domain (optimization, learning, feedback, parallel, execution, etc.)
- **action**: Action type (analyze, optimize, learn, execute, coordinate, etc.)
- **complexity**: Complexity level (low, medium, high, expert)
- **context**: Context-specific qualifier (performance, quantum, massive, etc.)

### Wildcard Support

The route table supports wildcards for flexible matching:
- `optimization:*:*:*` - Matches any optimization task
- `learning:learn:*:transfer` - Matches learning tasks with transfer context at any complexity
- `*:execute:medium:*` - Matches any medium-complexity execution task

## Available Agents

### Self-Improving Category

#### 1. recursive-optimizer
- **Tier**: Sonnet (Model: Opus)
- **Cost**: $0.03-0.08
- **Improvement Rate**: 5-10% per session
- **Capabilities**:
  - Performance self-analysis
  - Strategy evolution
  - Prompt self-improvement
  - Architecture self-modification
- **Best For**: Recursive optimization, performance analysis, strategy evolution

#### 2. feedback-loop-optimizer
- **Tier**: Haiku (Model: Sonnet)
- **Cost**: $0.001-0.01
- **Improvement**: Exponential compounding
- **Capabilities**:
  - Multi-level feedback systems
  - Automatic A/B testing
  - Gradient-based optimization
  - Reinforcement learning
- **Best For**: Continuous feedback loops, A/B testing, compounding improvements

#### 3. meta-learner
- **Tier**: Sonnet
- **Cost**: $0.01-0.08
- **Learning Acceleration**: 2-5x faster
- **Capabilities**:
  - Learning strategy library
  - Transfer learning optimization
  - Few-shot learning enhancement
  - Curriculum learning
- **Best For**: Meta-learning, transfer learning, few-shot learning, curriculum design

### Quantum-Parallel Category

#### 4. wave-function-optimizer
- **Tier**: Sonnet
- **Cost**: $0.01-0.08
- **Global Optimization**: Yes (avoids local minima)
- **Capabilities**:
  - Wave function propagation
  - Multi-objective optimization
  - Adaptive wave packet
  - Quantum annealing simulation
- **Best For**: Global optimization, multi-objective problems, avoiding local minima

#### 5. massive-parallel-coordinator
- **Tier**: Sonnet (Model: Opus)
- **Cost**: $0.10-0.30
- **Parallelism**: 100-1000x simultaneous operations
- **Capabilities**:
  - Worker pool management (500 Haiku workers)
  - Dynamic load balancing
  - Hierarchical parallel execution
  - Pipeline parallelism
- **Best For**: Massive parallelism, distributed systems, high-throughput tasks

#### 6. superposition-executor
- **Tier**: Sonnet
- **Cost**: $0.01-0.08
- **Parallelism**: 10-100x simultaneous branches
- **Capabilities**:
  - Superposition state management
  - Quantum interference optimization
  - Entanglement for correlated tasks
  - Quantum tunneling
- **Best For**: Parallel branch execution, quantum-inspired algorithms, superposition states

## Route Mapping Examples

### Optimization Routes

```json
"optimization:analyze:high:performance" → recursive-optimizer (0.95 confidence)
"optimization:search:high:global" → wave-function-optimizer (0.93 confidence)
"optimization:evolve:high:strategy" → recursive-optimizer (0.92 confidence)
```

### Learning Routes

```json
"learning:learn:medium:transfer" → meta-learner (0.94 confidence)
"learning:learn:low:few_shot" → meta-learner (0.92 confidence)
"learning:feedback:low:continuous" → feedback-loop-optimizer (0.93 confidence)
```

### Feedback Routes

```json
"feedback:test:medium:ab" → feedback-loop-optimizer (0.95 confidence)
"feedback:optimize:low:gradient" → feedback-loop-optimizer (0.92 confidence)
"feedback:compound:medium:improvement" → feedback-loop-optimizer (0.93 confidence)
```

### Parallel Routes

```json
"parallel:coordinate:high:massive" → massive-parallel-coordinator (0.96 confidence)
"parallel:execute:medium:superposition" → superposition-executor (0.95 confidence)
"parallel:distribute:high:load_balance" → massive-parallel-coordinator (0.94 confidence)
```

## Routing Algorithm

The semantic hash routing follows this algorithm:

1. **Parse task** into `domain:action:complexity:context` components
2. **Exact match check** in routes table
3. **Wildcard matching** if no exact match (e.g., `domain:action:*:*`)
4. **Fuzzy matching** using keyword-based similarity
5. **Complexity filtering** to select appropriate tier
6. **Context evaluation** for final selection
7. **Confidence scoring** - return agent with highest score
8. **Escalation** if confidence < 0.60

### Confidence Thresholds

- **High**: ≥ 0.90 - Direct routing, high confidence
- **Medium**: 0.75-0.89 - Good match, proceed
- **Low**: 0.60-0.74 - Acceptable, monitor
- **Escalate**: < 0.60 - Human review required

## Fuzzy Matching Patterns

The route table includes 10 fuzzy matching patterns for semantic similarity:

### 1. Optimization Keywords
**Keywords**: optimize, improve, enhance, tune, refine
**Agents**: recursive-optimizer, wave-function-optimizer, feedback-loop-optimizer
**Threshold**: 0.70

### 2. Learning Keywords
**Keywords**: learn, train, adapt, transfer, meta
**Agents**: meta-learner, feedback-loop-optimizer
**Threshold**: 0.75

### 3. Feedback Keywords
**Keywords**: feedback, loop, iterate, compound, reinforce
**Agents**: feedback-loop-optimizer, recursive-optimizer
**Threshold**: 0.75

### 4. Parallel Keywords
**Keywords**: parallel, concurrent, distribute, coordinate, swarm
**Agents**: massive-parallel-coordinator, superposition-executor
**Threshold**: 0.70

### 5. Execution Keywords
**Keywords**: execute, branch, superposition, quantum, collapse
**Agents**: superposition-executor, wave-function-optimizer
**Threshold**: 0.75

### 6. Search Keywords
**Keywords**: search, explore, global, anneal, wave
**Agents**: wave-function-optimizer, superposition-executor
**Threshold**: 0.80

### 7. Performance Keywords
**Keywords**: performance, analyze, profile, monitor, track
**Agents**: recursive-optimizer, feedback-loop-optimizer
**Threshold**: 0.75

### 8. Strategy Keywords
**Keywords**: strategy, evolve, genetic, mutation, crossover
**Agents**: recursive-optimizer, meta-learner
**Threshold**: 0.80

### 9. Curriculum Keywords
**Keywords**: curriculum, progressive, scaffold, few-shot
**Agents**: meta-learner
**Threshold**: 0.85

### 10. Testing Keywords
**Keywords**: test, ab, experiment, variant, hypothesis
**Agents**: feedback-loop-optimizer
**Threshold**: 0.85

## Complexity Mapping

### Low Complexity
**Indicators**: simple, basic, quick, fast, single
**Tier**: Haiku
**Agents**: feedback-loop-optimizer
**Cost**: $0.001-0.01

### Medium Complexity
**Indicators**: moderate, standard, typical, balanced
**Tier**: Sonnet
**Agents**: recursive-optimizer, meta-learner, superposition-executor, wave-function-optimizer
**Cost**: $0.01-0.08

### High Complexity
**Indicators**: complex, advanced, sophisticated, intricate
**Tier**: Sonnet
**Agents**: recursive-optimizer, wave-function-optimizer, massive-parallel-coordinator, superposition-executor
**Cost**: $0.01-0.30

### Expert Complexity
**Indicators**: expert, critical, massive, global, quantum
**Tier**: Opus
**Agents**: recursive-optimizer, massive-parallel-coordinator, wave-function-optimizer
**Cost**: $0.03-0.30

## Context Patterns

### Self-Improvement Context
**Agents**: recursive-optimizer, feedback-loop-optimizer, meta-learner
**Use Cases**: Improve own performance, learn to learn better, compound improvements

### Quantum-Inspired Context
**Agents**: wave-function-optimizer, superposition-executor
**Use Cases**: Global optimization, parallel exploration, quantum algorithms

### Massive Scale Context
**Agents**: massive-parallel-coordinator, superposition-executor
**Use Cases**: 100+ parallel workers, distributed systems, high throughput

### Continuous Learning Context
**Agents**: feedback-loop-optimizer, meta-learner
**Use Cases**: Online learning, adaptive systems, feedback loops

### Global Search Context
**Agents**: wave-function-optimizer, superposition-executor
**Use Cases**: Avoid local minima, explore solution space, multi-objective

## Usage Examples

### Example 1: Optimize ML Model Performance
```javascript
const task = "Optimize ML model performance recursively";
const hash = "optimization:analyze:high:performance";
// Routes to: recursive-optimizer (confidence: 0.95)
```

### Example 2: Learn from Few Examples
```javascript
const task = "Learn new domain from few examples";
const hash = "learning:learn:low:few_shot";
// Routes to: meta-learner (confidence: 0.92)
```

### Example 3: Coordinate Massive Parallelism
```javascript
const task = "Coordinate 500 parallel workers";
const hash = "parallel:coordinate:high:massive";
// Routes to: massive-parallel-coordinator (confidence: 0.96)
```

### Example 4: Execute Multiple Branches
```javascript
const task = "Execute multiple solution branches simultaneously";
const hash = "parallel:execute:medium:superposition";
// Routes to: superposition-executor (confidence: 0.95)
```

### Example 5: A/B Testing
```javascript
const task = "Set up A/B testing feedback loop";
const hash = "feedback:test:medium:ab";
// Routes to: feedback-loop-optimizer (confidence: 0.95)
```

### Example 6: Global Optimization
```javascript
const task = "Find global optimum avoiding local minima";
const hash = "optimization:search:high:global";
// Routes to: wave-function-optimizer (confidence: 0.93)
```

## Integration Guide

### Step 1: Parse Task Description
Extract domain, action, complexity, and context from natural language task description.

### Step 2: Generate Semantic Hash
Combine components into hash format: `domain:action:complexity:context`

### Step 3: Query Route Table
```javascript
const routes = require('./route-table.json');
const route = routes.routes[domain][hash];
```

### Step 4: Check Confidence
```javascript
if (route.confidence >= 0.90) {
  // High confidence - proceed
} else if (route.confidence >= 0.75) {
  // Medium confidence - proceed with monitoring
} else if (route.confidence >= 0.60) {
  // Low confidence - acceptable
} else {
  // Escalate to human review
}
```

### Step 5: Invoke Agent
```javascript
const agent = routes.agents[route.category][route.agent];
const result = await invokeAgent(agent, taskParams);
```

## Domain Coverage

The route table covers 7 primary domains:

1. **optimization** - 7 specific routes + wildcards
2. **learning** - 6 specific routes + wildcards
3. **feedback** - 5 specific routes + wildcards
4. **parallel** - 8 specific routes + wildcards
5. **execution** - 4 specific routes + wildcards
6. **performance** - 4 specific routes + wildcards
7. **coordination** - 4 specific routes + wildcards

**Total**: 50+ specific routes with fuzzy matching fallbacks

## Cost Optimization

### Tier Selection Strategy

1. **Use Haiku** for:
   - Simple feedback loops
   - Basic testing
   - Low-complexity continuous learning
   - Cost: $0.001-0.01

2. **Use Sonnet** for:
   - Medium-to-high complexity optimization
   - Transfer learning
   - Parallel execution (10-100x)
   - Most production workloads
   - Cost: $0.01-0.08

3. **Use Opus** for:
   - Massive parallelism (100-1000x)
   - Critical recursive optimization
   - Expert-level tasks
   - Cost: $0.10-0.30

### Cost-Benefit Analysis

**Example**: 500 parallel Haiku workers vs. sequential Opus
- **Cost**: 500 × $0.005 = $2.50 (vs. $15 for Opus sequential)
- **Throughput**: 400x faster
- **Effective**: 50x more work per dollar

## Maintenance

### Adding New Routes

To add a new route:

1. Define the semantic hash pattern
2. Map to appropriate agent
3. Set confidence score (0-1)
4. Provide reasoning
5. Update fuzzy patterns if needed

Example:
```json
"newdomain:action:complexity:context": {
  "agent": "agent-name",
  "tier": "sonnet",
  "confidence": 0.90,
  "reason": "Explanation of why this agent is optimal"
}
```

### Updating Confidence Scores

Monitor actual routing performance and adjust confidence scores based on:
- Success rate
- User feedback
- Agent performance metrics
- Cost-effectiveness

### Version History

- **v1.0.0** (2026-01-25): Initial route table with 6 agents, 50+ routes, 10 fuzzy patterns

## Statistics

- **Total Agents**: 6
- **Total Routes**: 50+
- **Fuzzy Patterns**: 10
- **Domains Covered**: 7
- **Tier Distribution**:
  - Haiku: 1 agent
  - Sonnet: 5 agents
  - Opus: 0 agents (2 use Opus model)

## Schema Version

**Current**: 1.0.0

The route table follows semantic versioning:
- **Major**: Breaking changes to hash format or structure
- **Minor**: New agents, routes, or fuzzy patterns
- **Patch**: Confidence score adjustments, documentation updates

## Support

For questions or issues with route table:
1. Check this documentation
2. Review integration examples
3. Verify hash format matches pattern
4. Check confidence thresholds
5. Consider fuzzy matching fallback

## References

- Agent definitions: `/Users/louisherman/ClaudeCodeProjects/.claude/agents/`
- Config directory: `/Users/louisherman/ClaudeCodeProjects/.claude/config/`
- Related configs: `model_tiers.yaml`, `parallelization.yaml`, `cost_limits.yaml`
