# API & Schema Reference

This document summarizes the primary HTTP endpoints and the core data structures defined in `achilles_core`. Use it as a high-level contract; see the FastAPI routes for request/response details.

## Session & Event Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/v1/sessions/start` | POST | Begins a session. Body includes `user_id`, `workspace_id`, optional `external_session_key`, `start_time`, tags, and a `config_snapshot`. Returns `session_id`, status, and timestamps. |
| `/v1/sessions/end` | POST | Marks a session complete by `session_id` or `external_session_key`, records `end_time`, and leaves raw events untouched. |
| `/v1/events/batch` | POST | Accepts a list of event payloads. Each payload mirrors the `Event` model (see below). Server validates, hashes, deduplicates, and returns counts (`received`, `ingested`, `deduped`). |

## Session Read APIs

| Endpoint | Method | Output |
| --- | --- | --- |
| `/v1/sessions/{id}` | GET | `SessionResponse` (core metadata plus counters/metrics). |
| `/v1/sessions/{id}/events` | GET | Chronologically ordered events for the session (limited window). |
| `/v1/sessions/{id}/errors` | GET | Error clusters produced by processing. |
| `/v1/sessions/{id}/correlations` | GET | Event correlations linking causes (agent/human actions) to effects (errors). |
| `/v1/sessions/{id}/agent-performance` | GET | Per-agent metrics computed by the monitoring agent. |

## Insights API

| Endpoint | Method | Description |
| --- | --- | --- |
| `/v1/insights/recent` | GET | Returns recent insights, optionally filtered by `session_id`. Responses carry severity, category, title, message, and a structured payload containing provider/model metadata. |

## Key Schemas

- **Event**  
  - Fields: `id`, `session_id`, `event_type`, `source_type`, `source_name`, `file_path`, `project_root`, `language`, `payload`, `raw_message`, `attribution_source`, `attribution_confidence`, `client_timestamp`, `server_timestamp`, `event_hash`, `metadata`, `created_at`.  
  - Validation ensures enum correctness and timestamp sanity.

- **Session**  
  - Fields: `id`, `external_session_key`, `user_id`, `workspace_id`, `start_time`, `end_time`, `status`, `event_count`, `agent_activity_score`, `human_activity_score`, `error_density`, `milestone_breakdown`, `tags`, `config_snapshot`, `requires_processing`, `last_processed_at`, `created_at`, `updated_at`.

- **ErrorCluster**  
  - Fields: `id`, `session_id`, `normalized_error`, `error_type`, `representative_event_id`, `occurrence_count`, `last_seen_at`, `metadata`, timestamps.

- **EventCorrelation**  
  - Fields: `id`, `session_id`, `cause_event_id`, `effect_event_id`, `correlation_type`, `confidence`, `time_delta_ms`, `file_match`, `metadata`, `created_at`.

- **AgentPerformanceSnapshot**  
  - Fields: `id`, `agent_id`, `session_id`, `total_actions`, `successful_actions`, `induced_error_count`, `override_count`, derived rates, `metrics_version`, `created_at`, `regression_flags`.

- **Insight**  
  - Fields: `id`, `session_id`, `agent_id`, `severity`, `category`, `title`, `message`, `payload`, `created_at`.

These schemas live in both Pydantic form (`achilles_core/models/*.py`) and SQLAlchemy form (`achilles_core/db/models/*.py`), ensuring API requests, DB rows, and documentation stay aligned.

