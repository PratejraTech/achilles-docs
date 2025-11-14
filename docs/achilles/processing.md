# Processing & Monitoring Pipeline

This document outlines the deterministic pipeline that turns raw session data into actionable insights.

## Ingestion Highlights

1. **Session lifecycle**  
   - `POST /v1/sessions/start` snapshots user/workspace metadata and sets `requires_processing = true`.  
   - `POST /v1/sessions/end` records completion time so processors know when to start derived jobs.

2. **Event batching**  
   - `POST /v1/events/batch` validates each payload via `achilles_core.validation.validate_event`.  
   - Deduplication combines `event_hash` and `(session_id, client_timestamp)` checks to guard against retries.  
   - Session counters (event totals, agent/human activity) are incremented as part of ingestion.

## Processing Engine (`achilles_processing`)

| Job | Purpose | Notes |
| --- | --- | --- |
| `cluster_errors_for_session` | Normalize error messages (strip file paths/line numbers) and write groups to `error_clusters`. | Deletes existing clusters before insert to stay idempotent. |
| `correlate_events_for_session` | Walk events chronologically to relate errors back to recent agent/human actions on the same file. | Records confidence (0.7 agent, 0.5 human) and time deltas. |
| `compute_session_summary` | Update `sessions` with event counts, activity scores, and error density; clears `requires_processing`. | Allows reprocessing without duplicates. |
| `process_session` | Orchestrates the three jobs in one transaction-safe call. | Used by worker + integration tests. |
| `ProcessingWorker` | Polls ended sessions flagged for processing and runs `process_session`. | Sleeps when no work remains. |

## Monitoring Agent (`achilles_agent`)

1. **Context Loading** – Fetches the latest events, clusters, correlations, and summary data for a session using shared DB tools.
2. **Insight Detection** – Heuristics surface:
   - High error density (>~25 errors per 100 events)
   - Agent-induced errors (based on correlations)
   - Break/fix loops (alternating agent/test events)
3. **Persistence & Metrics** – Writes structured rows to `insights` (severity, category, message, payload) and recomputes per-agent metrics (`agent_performance`). Each run tags outputs with the provider/model identifier.
4. **Entry Points** – `LightMonitoringAgent` can run for a specific `session_id` or scan the latest ended sessions; `achilles_agent/main.py` exposes a CLI for both workflows.

## Determinism & Safety

- Every derived table is recreated on each pass, so rerunning processing or the agent has no side effects beyond fresh data.
- The agent never mutates `events`; it only reads from canonical tables and writes new insights/metrics.
- All components share `achilles_core` models to ensure API schemas, DB records, and documentation stay aligned.

