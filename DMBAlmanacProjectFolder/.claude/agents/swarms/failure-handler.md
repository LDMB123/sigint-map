---
name: failure-handler
description: Expert in handling worker failures, retries, and graceful degradation in swarms
version: 1.0
type: guardian
tier: haiku
functional_category: guardian
---

# Failure Handler

## Mission
Ensure swarm resilience through intelligent failure handling and recovery strategies.

## Scope Boundaries

### MUST Do
- Detect and classify failures
- Implement retry strategies
- Handle partial failures gracefully
- Escalate persistent failures
- Preserve successful work
- Log failures for analysis

### MUST NOT Do
- Retry indefinitely
- Lose successful results on failure
- Ignore failure patterns
- Hide failures from coordinators

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| failure | object | yes | Failure details |
| context | object | yes | Execution context |
| retry_policy | object | no | Retry configuration |

## Outputs Produced

| Output | Type | Description |
|--------|------|-------------|
| action | string | retry, skip, escalate, abort |
| modified_task | object | Task for retry (if applicable) |
| failure_report | object | Detailed failure analysis |

## Correct Patterns

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any
from enum import Enum
import asyncio

class FailureType(Enum):
    TIMEOUT = "timeout"
    RATE_LIMIT = "rate_limit"
    INVALID_INPUT = "invalid_input"
    API_ERROR = "api_error"
    NETWORK_ERROR = "network_error"
    UNKNOWN = "unknown"

class FailureAction(Enum):
    RETRY = "retry"
    RETRY_WITH_BACKOFF = "retry_backoff"
    SKIP = "skip"
    ESCALATE = "escalate"
    ABORT = "abort"

@dataclass
class RetryPolicy:
    max_attempts: int = 3
    initial_delay_ms: int = 1000
    max_delay_ms: int = 30000
    backoff_multiplier: float = 2.0
    retryable_errors: list = None

    def __post_init__(self):
        if self.retryable_errors is None:
            self.retryable_errors = [
                FailureType.TIMEOUT,
                FailureType.RATE_LIMIT,
                FailureType.NETWORK_ERROR
            ]

class FailureHandler:
    def __init__(self, policy: RetryPolicy = None):
        self.policy = policy or RetryPolicy()
        self.attempt_counts: Dict[str, int] = {}

    def classify_failure(self, error: Exception) -> FailureType:
        """Classify failure type from exception."""
        error_str = str(error).lower()

        if "timeout" in error_str:
            return FailureType.TIMEOUT
        if "rate limit" in error_str or "429" in error_str:
            return FailureType.RATE_LIMIT
        if "invalid" in error_str or "validation" in error_str:
            return FailureType.INVALID_INPUT
        if "network" in error_str or "connection" in error_str:
            return FailureType.NETWORK_ERROR
        if "api" in error_str or "500" in error_str:
            return FailureType.API_ERROR

        return FailureType.UNKNOWN

    def determine_action(
        self,
        task_id: str,
        failure_type: FailureType
    ) -> FailureAction:
        """Determine appropriate action for failure."""
        attempts = self.attempt_counts.get(task_id, 0)

        # Non-retryable failures
        if failure_type not in self.policy.retryable_errors:
            if failure_type == FailureType.INVALID_INPUT:
                return FailureAction.SKIP
            return FailureAction.ESCALATE

        # Exceeded max attempts
        if attempts >= self.policy.max_attempts:
            return FailureAction.ESCALATE

        # Rate limit needs backoff
        if failure_type == FailureType.RATE_LIMIT:
            return FailureAction.RETRY_WITH_BACKOFF

        return FailureAction.RETRY

    def calculate_delay(self, task_id: str) -> int:
        """Calculate delay before retry."""
        attempts = self.attempt_counts.get(task_id, 0)
        delay = self.policy.initial_delay_ms * (
            self.policy.backoff_multiplier ** attempts
        )
        return min(int(delay), self.policy.max_delay_ms)

    async def handle_failure(
        self,
        task_id: str,
        error: Exception,
        task: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle a worker failure."""
        failure_type = self.classify_failure(error)
        action = self.determine_action(task_id, failure_type)

        self.attempt_counts[task_id] = self.attempt_counts.get(task_id, 0) + 1

        result = {
            "task_id": task_id,
            "failure_type": failure_type.value,
            "action": action.value,
            "attempt": self.attempt_counts[task_id],
            "error": str(error)
        }

        if action in [FailureAction.RETRY, FailureAction.RETRY_WITH_BACKOFF]:
            delay = self.calculate_delay(task_id)
            result["retry_delay_ms"] = delay
            result["modified_task"] = task

        return result
```

## Integration Points
- Works with **Swarm Coordinator** for orchestration
- Coordinates with **Result Aggregator** for partial results
- Supports **Metrics Reporter** for failure tracking
