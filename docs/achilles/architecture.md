# Architecture Summary

Achilles is split into independently deployable services that cooperate via Postgres and shared models under `achilles_core`. This separation keeps ingestion deterministic, processing idempotent, and insights reproducible.

## Services

- **`achilles_api` (FastAPI)**  
  Handles session/event ingestion, enforces validation + dedupe, and exposes read-only endpoints for sessions, events, errors, correlations, agent performance, and insights.

- **`achilles_processing` (Python workers)**  
  Polls for sessions that finished ingesting and runs deterministic jobs:
  - Noise compression / milestone inference  
  - Error clustering (`error_clusters`)  
  - Event correlation heuristics (`event_correlations`)  
  - Session summary updates (event counts, activity scores, error density)

- **`achilles_agent` (LangGraph-based)**  
  Light monitoring graph loads recent context, detects hotspots (high error density, agent-caused failures, break/fix loops), persists insights, and computes agent performance metrics. Providers/models are configurable so the agent can tag each insight with its LLM provenance.

- **Adapters (`adapters/*`)**  
  Thin clients (CLI, MCP Cursor bridge, CI scripts) that package local signals and call the API. They never mutate the DB directly.

- **Dashboard (`dashboard/web`)**  
  Next.js interface that consumes the read APIs to render session timelines, clusters, correlations, performance trends, and the insights feed.

## Data Contracts

`achilles_core` defines Pydantic + SQLAlchemy models that mirror Postgres tables described in `datamodel.mdc`. These include:

- `Event`, `Session`
- `ErrorCluster`, `EventCorrelation`
- `AgentPerformanceSnapshot`
- `Insight`

Validation helpers (`validate_event`, `validate_session`, `compute_event_hash`) are the only entry point for ingestion quality checks.

## Observability & Constraints

- **Deterministic Processing** – All background jobs can re-run without duplicating records thanks to delete-and-recompute or UPSERT patterns.
- **Read-Only Raw Events** – No service mutates rows in `events`; derivations live in separate tables.
- **OpenTelemetry Hooks** – `achilles_api` instruments requests, while workers/agents log structured metadata (`events_ingested`, `monitoring_agent_run`, etc.).
- **Non-Goals** – No PM features, no cross-session scheduling, no repo mutations, and no uncontrolled LLM behavior.

For processing details see `docs/processing.md`; for endpoints and schema references see `docs/api-schemas.md`.

