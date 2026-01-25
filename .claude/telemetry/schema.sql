-- Universal Agent Framework - Telemetry Database Schema
-- SQLite schema for tracking agent usage, performance, and costs

-- Agent invocations (core telemetry table)
CREATE TABLE IF NOT EXISTS agent_invocations (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Agent identification
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agent_category TEXT,
    model_tier TEXT NOT NULL CHECK(model_tier IN ('haiku', 'sonnet', 'opus')),
    model_id TEXT,

    -- Invocation context
    invocation_source TEXT CHECK(invocation_source IN ('user', 'orchestrator', 'swarm', 'escalation')),
    parent_invocation_id TEXT,
    workflow_id TEXT,
    swarm_id TEXT,

    -- Performance metrics
    duration_ms INTEGER,
    queue_time_ms INTEGER,
    processing_time_ms INTEGER,

    -- Token usage
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,

    -- Cost tracking
    input_cost_usd REAL DEFAULT 0.0,
    output_cost_usd REAL DEFAULT 0.0,
    total_cost_usd REAL DEFAULT 0.0,

    -- Status
    status TEXT NOT NULL CHECK(status IN ('success', 'error', 'timeout', 'cancelled')),
    error_type TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    escalated_to TEXT,

    -- Context
    task_type TEXT,
    file_count INTEGER,
    complexity_score REAL,

    FOREIGN KEY (parent_invocation_id) REFERENCES agent_invocations(id)
);

CREATE INDEX idx_invocations_timestamp ON agent_invocations(timestamp);
CREATE INDEX idx_invocations_agent_id ON agent_invocations(agent_id);
CREATE INDEX idx_invocations_model_tier ON agent_invocations(model_tier);
CREATE INDEX idx_invocations_status ON agent_invocations(status);
CREATE INDEX idx_invocations_workflow ON agent_invocations(workflow_id);

-- Collaboration events
CREATE TABLE IF NOT EXISTS collaboration_events (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Collaboration participants
    from_agent_id TEXT NOT NULL,
    to_agent_id TEXT NOT NULL,
    collaboration_type TEXT NOT NULL CHECK(collaboration_type IN ('delegates_to', 'escalates_to', 'receives_from', 'returns_to')),

    -- Context
    invocation_id TEXT NOT NULL,
    swarm_pattern TEXT,
    delegation_depth INTEGER DEFAULT 1,

    -- Outcome
    success BOOLEAN DEFAULT TRUE,
    duration_ms INTEGER,

    FOREIGN KEY (invocation_id) REFERENCES agent_invocations(id)
);

CREATE INDEX idx_collaboration_from_agent ON collaboration_events(from_agent_id);
CREATE INDEX idx_collaboration_to_agent ON collaboration_events(to_agent_id);
CREATE INDEX idx_collaboration_type ON collaboration_events(collaboration_type);
CREATE INDEX idx_collaboration_timestamp ON collaboration_events(timestamp);

-- Performance metrics (detailed timing breakdowns)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    invocation_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Timing breakdown
    context_load_ms INTEGER,
    model_inference_ms INTEGER,
    result_processing_ms INTEGER,
    cache_lookup_ms INTEGER,

    -- Resource usage
    memory_peak_mb REAL,
    cpu_usage_percent REAL,

    -- Concurrency
    concurrent_agents INTEGER,
    queue_depth INTEGER,

    FOREIGN KEY (invocation_id) REFERENCES agent_invocations(id)
);

CREATE INDEX idx_performance_invocation ON performance_metrics(invocation_id);
CREATE INDEX idx_performance_timestamp ON performance_metrics(timestamp);

-- Cache performance
CREATE TABLE IF NOT EXISTS cache_events (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Cache layer
    cache_layer TEXT NOT NULL CHECK(cache_layer IN ('L1_routing', 'L2_context', 'L3_semantic')),
    cache_type TEXT NOT NULL CHECK(cache_type IN ('result', 'context', 'pattern')),

    -- Event details
    event_type TEXT NOT NULL CHECK(event_type IN ('hit', 'miss', 'eviction', 'invalidation')),
    cache_key TEXT,
    lookup_time_ms INTEGER,

    -- Associated invocation
    invocation_id TEXT,

    FOREIGN KEY (invocation_id) REFERENCES agent_invocations(id)
);

CREATE INDEX idx_cache_layer ON cache_events(cache_layer);
CREATE INDEX idx_cache_type ON cache_events(event_type);
CREATE INDEX idx_cache_timestamp ON cache_events(timestamp);

-- Cost tracking (aggregated by time period)
CREATE TABLE IF NOT EXISTS cost_rollups (
    id TEXT PRIMARY KEY,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    granularity TEXT NOT NULL CHECK(granularity IN ('minute', 'hour', 'day', 'week', 'month')),

    -- Grouping dimensions
    model_tier TEXT,
    agent_category TEXT,
    workflow_type TEXT,

    -- Aggregated metrics
    invocation_count INTEGER DEFAULT 0,
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0.0,

    -- Performance
    avg_duration_ms REAL,
    p95_duration_ms REAL,
    error_count INTEGER DEFAULT 0,
    error_rate REAL,

    UNIQUE(period_start, granularity, model_tier, agent_category, workflow_type)
);

CREATE INDEX idx_cost_rollups_period ON cost_rollups(period_start, period_end);
CREATE INDEX idx_cost_rollups_tier ON cost_rollups(model_tier);
CREATE INDEX idx_cost_rollups_granularity ON cost_rollups(granularity);

-- Error tracking
CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Error details
    invocation_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    model_tier TEXT NOT NULL,

    error_type TEXT NOT NULL,
    error_message TEXT,
    error_stack TEXT,

    -- Context
    retry_count INTEGER DEFAULT 0,
    recoverable BOOLEAN DEFAULT FALSE,
    recovery_action TEXT,

    FOREIGN KEY (invocation_id) REFERENCES agent_invocations(id)
);

CREATE INDEX idx_errors_timestamp ON error_logs(timestamp);
CREATE INDEX idx_errors_agent ON error_logs(agent_id);
CREATE INDEX idx_errors_type ON error_logs(error_type);

-- Swarm executions
CREATE TABLE IF NOT EXISTS swarm_executions (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Swarm configuration
    orchestrator_agent_id TEXT NOT NULL,
    swarm_pattern TEXT NOT NULL CHECK(swarm_pattern IN ('fan_out', 'hierarchical', 'consensus', 'pipeline', 'self_healing')),
    worker_count INTEGER NOT NULL,

    -- Performance
    total_duration_ms INTEGER,
    avg_worker_duration_ms REAL,
    parallelization_efficiency REAL,  -- Actual speedup vs theoretical

    -- Outcome
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0.0
);

CREATE INDEX idx_swarm_timestamp ON swarm_executions(timestamp);
CREATE INDEX idx_swarm_orchestrator ON swarm_executions(orchestrator_agent_id);
CREATE INDEX idx_swarm_pattern ON swarm_executions(swarm_pattern);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Alert details
    alert_rule TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),

    -- Triggering metrics
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    threshold_value REAL NOT NULL,

    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_at DATETIME,
    resolved_at DATETIME,

    -- Context
    description TEXT,
    related_invocation_id TEXT
);

CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_status ON alerts(status);

-- Configuration changes (audit trail)
CREATE TABLE IF NOT EXISTS config_changes (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Change details
    config_type TEXT NOT NULL CHECK(config_type IN ('agent', 'skill', 'model_tier', 'parallelization', 'cost_limit')),
    entity_id TEXT NOT NULL,

    -- Change tracking
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,

    -- Metadata
    reason TEXT,
    impact_description TEXT
);

CREATE INDEX idx_config_timestamp ON config_changes(timestamp);
CREATE INDEX idx_config_type ON config_changes(config_type);
CREATE INDEX idx_config_entity ON config_changes(entity_id);

-- Materialized view: Agent usage summary
CREATE VIEW IF NOT EXISTS v_agent_usage_summary AS
SELECT
    agent_id,
    agent_name,
    model_tier,
    COUNT(*) as invocation_count,
    AVG(duration_ms) as avg_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(total_cost_usd) as total_cost_usd,
    AVG(total_cost_usd) as avg_cost_per_invocation,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
    CAST(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as error_rate,
    SUM(CASE WHEN escalated_to IS NOT NULL THEN 1 ELSE 0 END) as escalation_count,
    MAX(timestamp) as last_invocation
FROM agent_invocations
GROUP BY agent_id, agent_name, model_tier;

-- Materialized view: Model tier distribution
CREATE VIEW IF NOT EXISTS v_tier_distribution AS
SELECT
    model_tier,
    COUNT(*) as invocations,
    SUM(total_cost_usd) as total_cost,
    AVG(duration_ms) as avg_latency_ms,
    CAST(COUNT(*) AS REAL) * 100.0 / (SELECT COUNT(*) FROM agent_invocations) as percentage,
    SUM(input_tokens + output_tokens) as total_tokens
FROM agent_invocations
GROUP BY model_tier;

-- Materialized view: Hourly cost trend (last 7 days)
CREATE VIEW IF NOT EXISTS v_hourly_cost_trend AS
SELECT
    datetime(timestamp, 'start of hour') as hour,
    model_tier,
    SUM(total_cost_usd) as cost,
    COUNT(*) as invocations,
    AVG(duration_ms) as avg_duration_ms
FROM agent_invocations
WHERE timestamp >= datetime('now', '-7 days')
GROUP BY hour, model_tier
ORDER BY hour DESC;

-- Materialized view: Collaboration network
CREATE VIEW IF NOT EXISTS v_collaboration_network AS
SELECT
    from_agent_id,
    to_agent_id,
    collaboration_type,
    COUNT(*) as edge_weight,
    AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(duration_ms) as avg_duration_ms
FROM collaboration_events
GROUP BY from_agent_id, to_agent_id, collaboration_type;

-- Materialized view: Sonnet-first compliance
CREATE VIEW IF NOT EXISTS v_sonnet_first_compliance AS
SELECT
    date(timestamp) as date,
    model_tier,
    COUNT(*) as invocations,
    CAST(COUNT(*) AS REAL) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY date(timestamp)) as percentage,
    SUM(total_cost_usd) as cost,
    AVG(duration_ms) as avg_latency_ms
FROM agent_invocations
GROUP BY date, model_tier
ORDER BY date DESC, model_tier;

-- Materialized view: Cache performance summary
CREATE VIEW IF NOT EXISTS v_cache_performance AS
SELECT
    cache_layer,
    cache_type,
    COUNT(*) as total_events,
    SUM(CASE WHEN event_type = 'hit' THEN 1 ELSE 0 END) as hits,
    SUM(CASE WHEN event_type = 'miss' THEN 1 ELSE 0 END) as misses,
    CAST(SUM(CASE WHEN event_type = 'hit' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as hit_rate,
    AVG(lookup_time_ms) as avg_lookup_ms
FROM cache_events
GROUP BY cache_layer, cache_type;

-- Materialized view: Top costly agents
CREATE VIEW IF NOT EXISTS v_top_costly_agents AS
SELECT
    agent_id,
    agent_name,
    model_tier,
    COUNT(*) as invocations,
    SUM(total_cost_usd) as total_cost,
    AVG(total_cost_usd) as avg_cost_per_invocation,
    SUM(total_cost_usd) * 100.0 / (SELECT SUM(total_cost_usd) FROM agent_invocations) as cost_percentage
FROM agent_invocations
GROUP BY agent_id, agent_name, model_tier
ORDER BY total_cost DESC
LIMIT 20;

-- Materialized view: Error rate by agent
CREATE VIEW IF NOT EXISTS v_error_rates AS
SELECT
    agent_id,
    agent_name,
    model_tier,
    COUNT(*) as total_invocations,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
    CAST(SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as error_rate,
    COUNT(DISTINCT error_type) as unique_error_types
FROM agent_invocations
GROUP BY agent_id, agent_name, model_tier
HAVING error_rate > 0
ORDER BY error_rate DESC;

-- Materialized view: Swarm efficiency
CREATE VIEW IF NOT EXISTS v_swarm_efficiency AS
SELECT
    swarm_pattern,
    COUNT(*) as execution_count,
    AVG(worker_count) as avg_workers,
    AVG(parallelization_efficiency) as avg_efficiency,
    AVG(total_cost_usd) as avg_cost,
    SUM(success_count) as total_successes,
    SUM(error_count) as total_errors
FROM swarm_executions
GROUP BY swarm_pattern
ORDER BY execution_count DESC;
