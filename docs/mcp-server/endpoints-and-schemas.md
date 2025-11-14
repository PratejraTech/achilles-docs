# MCP Endpoints & Schemas

This document summarizes the HTTP surface exposed by `app/routes/mcp.py` and the transport models defined in `app/models/mcp.py` so developers can extend the gateway confidently.

## Base Path & Versioning
- All endpoints are served under `/api/achilles/v1/mcp`.
- Forwarded paths on Achilles Core mirror this structure (e.g., `/mcp/sessions`, `/signals/events/batch`) to keep IDE contracts stable with backend changes.

## Endpoint Matrix

| Path | Method | Description | Request Model | Response Model | Core Call |
| --- | --- | --- | --- | --- | --- |
| `/health` | GET | Gateway-local readiness (no upstream call) | – | `MCPHealthResponse` | – |
| `/handshake` | POST | Client/server capability negotiation | `MCPHandshakeRequest` | `MCPHandshakeResponse` | `POST /mcp/handshake` |
| `/sessions` | POST | Start a session tied to workspace + project | `MCPSessionCreate` | `SessionOut` | `POST /mcp/sessions` |
| `/sessions/{session_id}` | PATCH | Update session lifecycle (e.g., complete) | `MCPSessionUpdate` | `SessionOut` | `PATCH /mcp/sessions/{id}` |
| `/sessions/resolve` | POST | Idempotent lookup by `external_session_key` | `MCPSessionResolve` | `MCPSessionResolveResponse` | `POST /mcp/sessions/resolve` |
| `/projects/resolve` | POST | Map workspace → `project_id` (optionally create) | `MCPProjectResolve` | `ProjectResolveResponse` | `POST /projects/resolve` |
| `/signals/events/batch` | POST | Primary ingest path for IDE/agent events | `MCPEventBatch` | `EventBatchResponse` | `POST /signals/events/batch` |
| `/state/session` | POST | Persist a session snapshot (workspace state, etc.) | `MCPSessionSnapshotRequest` | `MCPSessionSnapshotResponse` | `POST /state/session` |
| `/signals/insights` | POST | Fetch insights for IDE UX | `MCPInsightsQuery` | `List[InsightOut]` | `POST /signals/insights` |

## Core Schemas (Selected Highlights)

### Sessions
- `MCPSessionCreate`: requires `external_session_key`, `user_id`, `workspace_id`, `start_time`. Optional `project_id`, `tags`, `config_snapshot`.
- `MCPSessionUpdate`: enforces `status` enum (`active|completed|abandoned|failed`) plus `end_time`.
- `SessionOut`: full Core session payload returned to clients; no stripping occurs, so stay aligned with Achilles’ schema.

### Projects
- `MCPProjectResolve`: minimal fields (`workspace_id`, `workspace_root`), optional `vcs_remote_url`, `labels`, `create_if_missing`.
- Response includes `project_id`, `created` flag, and optional metadata (canonical name, tags).

### Signals
- `MCPEvent`: all telemetry fields, including `metadata_` alias, `attribution_source`, optional `agent_metadata`, etc. Validation clamps `attribution_confidence` to `[0, 1]`.
- `MCPEventBatch`: wraps a list of `MCPEvent`.
- `EventBatchResponse`: contains `results` and `failed` arrays so partial successes surface upstream errors cleanly.

### Snapshots & Insights
- `MCPSessionSnapshotRequest`: `session_id`, `snapshot_type`, arbitrary `payload`.
- `InsightOut`: severity/category enums, optional `agent_id`, and fully structured payload for IDE rendering.
- `MCPInsightsQuery`: `session_id`, optional `since`, bounded `limit` (1–200).

### Handshake
- `MCPHandshakeRequest`: identifying info (client/IDE/workspace) plus capability flags dict.
- `MCPHandshakeResponse`: server metadata, `mcp_session_token`, resource limits (`preferred_batch_size`, `max_payload_bytes`), feature switches.

### Health
- `MCPHealthResponse`: `status`, `uptime_seconds`, `accepting_signals`, optional `last_ingest_error_at`; used both locally and when Core exposes `/mcp/health`.

## Adding / Updating Schemas
- Update `app/models/mcp.py` first; keep enums/field names consistent with Achilles Core’s OpenAPI spec.
- Re-export or alias models in `app/routes/mcp.py` and `app/clients/achilles.py` together to avoid mismatches.
- Extend tests in `tests/` to cover new request/response shapes with `respx` mocks.

