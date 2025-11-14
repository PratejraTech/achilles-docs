# Schema & Model Alignment

## Source References
- `models_pre.mdx` and `fastapi.md` contain the canonical MCP transport schemas referenced by `init.md` and `prd.md`.
- Naming follows the `MCP*` prefix for transport DTOs and `*Out` for Achilles Core responses, ensuring contract symmetry.
- Textual guidance in `fastapi.md` dictates placement: transport models live in `app/models/mcp.py`, health responses in `app/models/health.py`, configuration in `app/config.py`, and routing/client logic under `app/routes` and `app/clients`.

## `app/models/mcp.py`
- **Enums:** `EventType`, `SourceType`, `AttributionSource`, `SessionStatus`, `InsightSeverity`, `InsightCategory` exactly mirror `models_pre.mdx`.
- **Session DTOs:** `MCPSessionCreate`, `MCPSessionUpdate`, `MCPSessionResolve`, `SessionOut`, `MCPSessionResolveResponse` capture required identifiers (`external_session_key`, `user_id`, etc.) and optional tagging/config fields; all timestamps remain ISO strings per PRD.
- **Projects:** `MCPProjectResolve` and `ProjectResolveResponse` implement the workspace→project mapping flow mandated before session creation.
- **Signals:** `MCPEvent`, `MCPEventBatch`, `EventBatchResult`, `EventBatchFailed`, `EventBatchResponse` match the ingest structure; `metadata_` keeps its alias (`Field(..., alias="metadata_")`) to mirror Achilles' schema.
- **Snapshots & Insights:** `MCPSessionSnapshotRequest/Response`, `InsightOut`, and `MCPInsightsQuery` carry the payload/resolution contracts required for `/state/session` and `/signals/insights`.
- **Handshake:** `MCPHandshakeRequest/Response` reflect the PRD control-plane exchange (token negotiation, batch sizing, feature flags).
- **Validation notes:** `attribution_confidence` enforces `ge=0`, `le=1`; batch `limit` range is `1-200`; `preferred_batch_size`/`max_payload_bytes` maintain positive constraints.

## `app/models/health.py`
- Defines `MCPHealthResponse` (status, uptime, `accepting_signals`, optional `last_ingest_error_at`) used both for local health and proxied upstream responses per `fastapi.md`.

## Supporting Components
- **`app/config.py`:** `Settings` (`ACHILLES_BASE_URL`, `ACHILLES_API_KEY`, timeout/retry knobs, service metadata) matches the environment requirements in `fastapi.md`.
- **`app/clients/achilles.py`:** Provides parity methods (`handshake`, `health`, `start_session`, `end_session`, `resolve_session`, `resolve_project`, `send_signals_batch`, `snapshot_session_state`, `get_insights`) using the transport models; ensures headers include Bearer auth as required by the PRD's security boundary.
- **`app/routes/mcp.py`:** FastAPI router exposes `/api/achilles/v1/mcp/*`, validates via the above models, and forwards to `AchillesClient`, satisfying the “thin stateless gateway” rule from `AGENTS.md`.
- **`app/main.py`:** Registers the MCP router with global CORS allowances, aligning with the documented service skeleton in `fastapi.md`.

### Coverage & Gaps
- Covered endpoints per PRD: `handshake`, `health`, `sessions` (create/update/resolve), `projects/resolve`, `signals/events/batch`, `signals/insights`, `state/session`.
- Missing/deferrable endpoints: `/agents/performance`, `/errors/*`, single-event ingest (`/signals/events`), insights GET variant, and any `/mcp/*` registration/capability negotiation beyond the basic handshake. These remain future work per PRD optional scope.
- Dependency wiring: `get_achilles_client` yields a per-request client; consider FastAPI lifespan for connection reuse if latency becomes an issue.

## Constraints & Behaviours
- Required vs optional fields match `models_pre.mdx`; no server-managed fields are accepted from clients.
- Alias usage (`metadata_`) and enum validation protect Achilles Core from malformed traffic.
- Transport schemas remain 1:1 with Achilles internal models to prevent schema drift, fulfilling the Schema Guardian requirements.

