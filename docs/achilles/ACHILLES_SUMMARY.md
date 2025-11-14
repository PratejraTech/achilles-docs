# ACHILLES Summary (Frontend + MCP Reference)

Achilles is an observability and build-intelligence platform for agentic development. It ingests fine-grained IDE/agent/CI signals, derives higher-level intelligence (clusters, correlations, insights, performance metrics), and exposes read-only APIs for dashboards, IDEs, and MCP gateways.

This summary condenses the existing docs (`ARCHITECTURE.md`, `REQUIREMENTS.md`, `MODELS.md`, `TRACEABILITY.md`, MCP references) to guide frontend development and external integrations.

---

## Core Features

| Capability | Description |
| --- | --- |
| Session Lifecycle | `POST /v1/sessions/start` captures user/workspace metadata and freezes config snapshots; `POST /v1/sessions/end` timestamps completion without mutating events. |
| Event Ingestion | `POST /v1/events/batch` validates payloads, computes dedupe hashes, and persists raw events append-only. |
| Processing Engine | Worker jobs (`achilles_processing`) generate error clusters, event correlations, and session summaries; all jobs are idempotent. |
| Monitoring Agent | LangGraph-based `LightMonitoringAgent` reads processed data, emits structured insights, and recalculates per-agent performance. Providers/models are configurable so each insight includes provenance. |
| Read APIs | FastAPI service exposes typed endpoints for sessions, events, errors, correlations, agent performance, and insights—suitable for dashboards and MCP clients. |
| CLI & MCP | Adapters simulate/relay local activity (CLI demo, Cursor MCP bridge). End-to-end tests (`tests/e2e/test_mcp_flow.py`) cover the ingestion → processing → agent pipeline. |

---

## Services & Data Flow (Recap)

1. **Adapters** call ingestion endpoints (session start, event batch, session end).  
2. **Ingestion API (`achilles_api`)** enforces validation/dedupe and writes to Postgres.  
3. **Processing Worker (`achilles_processing`)** polls completed sessions, rebuilds `error_clusters`, `event_correlations`, and summary fields on `sessions`.  
4. **Monitoring Agent (`achilles_agent`)** loads recent context, detects hotspots (high error density, agent-induced failures, break/fix loops), persists insights + agent performance.  
5. **Dashboard/Next.js** queries read endpoints (sessions, timelines, clusters, correlations, insights, agent performance) to render the experience.  

All components rely on shared Pydantic/SQLAlchemy models in `achilles_core`, guaranteeing schema parity across ingestion, processing, and read APIs.

---

## Data Contracts (excerpt)

| Model | Purpose | Critical Fields |
| --- | --- | --- |
| `Event` | Atomic activity. | `event_type`, `source_type`, `file_path`, `payload`, `raw_message`, `client_timestamp`, `event_hash`. |
| `Session` | Logical run. | `status`, `event_count`, `agent_activity_score`, `human_activity_score`, `error_density`, `requires_processing`. |
| `ErrorCluster` | Normalized errors for UI. | `normalized_error`, `error_type`, `occurrence_count`, `representative_event_id`. |
| `EventCorrelation` | Cause→effect mapping. | `cause_event_id`, `effect_event_id`, `confidence`, `time_delta_ms`, `file_match`. |
| `Insight` | Monitoring agent output. | `severity`, `category`, `title`, `message`, `payload` (includes provider/model). |
| `AgentPerformanceSnapshot` | Per-agent metrics. | `total_actions`, `successful_actions`, `induced_error_count`, derived rates, `metrics_version`. |

Full definitions appear in `MODELS.md` and the shared module `src/docs/mcp_models.py`.

---

## Telemetry & Observability

- **OpenTelemetry hooks** wrap FastAPI middleware and critical worker/agent paths (e.g., `events_ingested`, `monitoring_agent_run`) to capture latency and throughput.  
- **Structured logs**: ingestion logs counts (received/ingested/deduped), worker logs number of sessions processed, agent logs provider/model + insight/metric counts.  
- **Recompute safety**: each derived table is delete-and-recompute or UPSERT-based; telemetry can re-run without duplicating data.  
- **No mutation of raw events**: telemetry must not write back to the `events` table.  

Frontend implications: dashboards should surface telemetry counters (ingestion throughput, worker backlog, agent runs) via dedicated API slices or by subscribing to observability streams if exposed later.

---

## API Endpoints (Frontend + MCP)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/sessions/start` | Begin session; returns `session_id`. |
| `POST` | `/v1/events/batch` | Batch-ingest validated events. |
| `POST` | `/v1/sessions/end` | Close session by ID or external key. |
| `GET` | `/v1/sessions/{id}` | Core session metadata + counters. |
| `GET` | `/v1/sessions/{id}/events` | Ordered events (windowed). |
| `GET` | `/v1/sessions/{id}/errors` | Error clusters (processing output). |
| `GET` | `/v1/sessions/{id}/correlations` | Event correlations (cause/effect pairs). |
| `GET` | `/v1/sessions/{id}/agent-performance` | Agent performance snapshots. |
| `GET` | `/v1/insights/recent` | Recent insights; filter by `session_id`. |

**MCP Gateway exposure**: these same endpoints form the contract for Cursor MCP or other adapters. The helper module `src/docs/mcp_models.py` supplies canonical Pydantic schemas for request/response validation.

---

## Next.js Frontend Requirements

To render the full dataflow, the dashboard should leverage:

1. **Server Components + Route Handlers**  
   - Use server-side data fetching for `/sessions`, `/sessions/{id}` to ensure consistent snapshots with processing results.  
   - Implement route handlers that proxy the FastAPI endpoints, applying auth and caching.

2. **Streaming/Segmented Timelines**  
   - Use Suspense/streaming to load raw event timelines incrementally (e.g., 50 events per chunk).  
   - Combine sessions, events, clusters, and correlations into a unified timeline visualization.

3. **React Query or App Router Cache**  
   - Manage polling for `/v1/insights/recent` or use websockets when available.  
   - Cache per-session data with revalidation when `requires_processing` flips to `false`.

4. **Insight & Performance Panels**  
   - Render severity badges, categories, provider/model metadata, and agent success metrics.  
   - Provide filters for agent names, severity, file paths.

5. **Error/Correlation Explorer**  
   - Table UI linking error clusters → correlated agent actions, with drill-down to raw events.

6. **Configuration Surfaces**  
   - UI controls to select monitoring-agent provider/model per workspace (mirrors `ACHILLES_AGENT_PROVIDERS` env).  
   - Display current telemetry (worker queue length, ingest throughput) for observability.

---

## Storage & Caching Strategy

- **Primary Storage**: Postgres is the canonical store for events, sessions, and all derived overlays. Ensure sufficient IOPS for high event throughput (10–50 events/sec per active session). Table sizes grow append-only; plan retention policies or archival jobs later.
- **Caching Layer**:
  - **API-level caching**: use HTTP cache headers on read endpoints when data is immutable (e.g., after `requires_processing` is `false`).  
  - **Next.js data cache**: configure ISR or `fetch` revalidation intervals (e.g., revalidate session detail every 5s while processing is pending; every 60s after completion).  
  - **In-memory worker cache**: optional short-lived cache for session metadata inside workers/agents to avoid repeated DB fetches within a single run.
- **File/Object Storage**: not required for MVP; all signals remain structured JSON in Postgres.

---

## Frontend Telemetry Hooks

- Emit page/view metrics for Session, Insights, and Timeline screens to correlate UI usage with backend telemetry.  
- Surface backend telemetry (ingestion counts, worker backlog) via metrics widgets sourced from `/metrics` or future observability endpoints to help operators gauge system health.

---

## Testing & MCP Simulation

- Use the supplied end-to-end pytest (`tests/e2e/test_mcp_flow.py`) as a reference for mocking MCP traffic.  
- Tests create sessions, stream events (including duplicates), run processing + monitoring agent, and assert downstream endpoints respond correctly.

---

## Configuration Touchpoints

- **Env Vars**: `ACHILLES_DATABASE_URL`, `ACHILLES_AGENT_PROVIDERS`, `ACHILLES_AGENT_DEFAULT_PROVIDER`, `ACHILLES_AGENT_RECENT_EVENT_LIMIT`.  
- **MCP Gateway**: Should adhere to the models/endpoints above, include provider/model metadata in insights, and respect the “read-only on raw events” rule.

---

This summary should serve as the go-to brief for frontend implementers and MCP integrators, tying together the canonical requirements, APIs, telemetry considerations, and storage/caching expectations.

