# Phase 2 – Data & Model Alignment

- **Files read:** `init.md`, `prd.md`, `models_pre.mdx`, `fastapi.md`, `app/models/models.py`
- **Key findings:**
  - Canonical transport models (sessions, projects, events, snapshots, insights, health) are fully specified in `models_pre.mdx` and duplicated within `fastapi.md`.
  - The current implementation only contains `app/models/models.py`, which:
    - Reuses the DTO shapes but omits the shared enums (`EventType`, `SourceType`, etc.), making the file invalid Python.
    - Uses generic names (`SessionCreateRequest`, `EventIngest`) that do not match the `MCPSessionCreate`, `MCPEvent`, etc. names referenced throughout the specs.
    - Lumps health, session, project, snapshot, and insight models into one file instead of the documented `mcp.py` + `health.py` layout.
  - MCP-specific DTOs for handshake, agent performance snapshots, error correlations, and capability negotiation are not implemented yet (they live only in the PRD as future work).
- **Decisions & next steps:**
  - Recreate the transport layer exactly as documented by adding `app/models/mcp.py` and `app/models/health.py`, keeping names (`MCPSessionCreate`, `MCPEventBatch`, etc.) aligned with PRD terminology.
  - Remove or refactor `app/models/models.py` once the new modules exist, to avoid duplicate or broken schema definitions.
  - Defer optional/future models (handshake, agent performance, correlations) until they are formally scheduled; note their absence when planning client/route coverage.

- **Open questions / follow-ups:**
  - Confirm whether handshake DTOs should live alongside the core MCP transport models or in a dedicated control-plane module when that feature is greenlit.
  - Validate naming expectations (`MCPSession*` vs generic `Session*`) with downstream MCP clients before finalizing imports in the FastAPI routes.

# Phase 3 – Client & Router Adjustments

- **Files created/updated:** `app/config.py`, `app/models/mcp.py`, `app/models/health.py`, `app/clients/achilles.py`, `app/routes/mcp.py`, `app/main.py`
- **Key actions:**
  - Materialized the documented transport models (`MCPSessionCreate`, `MCPEventBatch`, `MCPHandshake*`, etc.) plus health schema in their dedicated modules, replacing the incomplete `app/models/models.py`.
  - Added a configurable `Settings` module that centralizes core URL, auth token, and HTTP behavior as referenced in the specs.
  - Implemented `AchillesClient` with lightweight retry semantics and parity methods for handshake, sessions, projects, signals, snapshots, and insights.
  - Implemented the FastAPI router + application wiring, exposing `/api/achilles/v1/mcp/*` endpoints that validate payloads and proxy directly to Achilles Core.
- **Gaps / considerations:**
  - Optional APIs (agent performance snapshots, error correlations) remain unimplemented; they will require additional models and client methods when prioritized.
  - The health endpoint currently reports gateway-local status; integrating upstream health checks can be considered once Achilles exposes a stable `/mcp/health`.

# Phase 4 – Testing & Error Handling Plan

- **Current state:** `tests/` directory is empty—no automated coverage exists for the new FastAPI surface or Achilles client.
- **Planned coverage:**
  - `tests/test_health.py`: in-process FastAPI test client verifying `/health` uptime fields and status code.
  - `tests/test_handshake.py`: respx-mocked Achilles interaction ensuring payload pass-through, feature flags echoed, and that missing auth bubbles up as 401.
  - `tests/test_sessions.py`: create/patch/resolve flows hitting the router with mocked upstream endpoints, asserting headers, serialized bodies, and retry cutoff behaviour.
  - `tests/test_projects.py`: positive + failure paths for `/projects/resolve`, including `create_if_missing=False` 404 handling.
  - `tests/test_snapshots.py`: `/state/session` happy path plus 500 retry coverage to ensure the client fails fast after `HTTP_MAX_RETRIES`.
  - `tests/test_signals.py`: batch-partial success semantics, verifying `failed` entries bubble through intact.
  - `tests/test_insights.py`: confirm list responses map into `InsightOut` objects and propagate upstream pagination limits.
- **Error-handling focus:**
  - Use respx to simulate 5xx responses and ensure the client retry cap behaves as expected (no infinite loops).
  - Add fixtures to override env vars for deterministic configs and to inject a shared AsyncClient across tests.
- **Next steps:** scaffold pytest fixtures (`conftest.py`) + `respx` mocks, then add the listed test modules to enforce MCP contract stability.

# Phase 5 – Documentation & Operational Notes

- **Gateway responsibilities:** Acts solely as a stateless validation + proxy layer. All persistence, analytics, and correlation logic stay within Achilles Core per `AGENTS.md`.
- **Configuration recap:** `app/config.py` exposes `ACHILLES_BASE_URL`, `ACHILLES_API_KEY`, and HTTP tuning knobs (`HTTP_TIMEOUT_SECONDS`, `HTTP_MAX_RETRIES`). Provide these via `.env`/environment variables; no secrets should be committed.
- **Security boundaries:** Only the gateway faces IDE/LLM traffic. Every outbound call attaches the Bearer token, and retry logic cuts off after `HTTP_MAX_RETRIES` to avoid overwhelming core services.
- **Integration workflow:** IDEs call `/mcp/handshake` → `/projects/resolve` → `/mcp/sessions` → `/signals/events/batch`, optionally `/state/session` + `/signals/insights`, matching the PRD’s lifecycle expectations.
- **Pending follow-ups:** add `.env.example`, document MCP tool wiring (e.g., `baseUrl`, endpoint templates), and elaborate on operational health checks once upstream `/mcp/health` exists.
- **Documentation status:** this log plus `docs/schema-alignment.md` capture schema alignment, endpoint coverage, and upcoming test work so collaborators can keep future phases scoped.

# Phase 6 – Containerisation & Deployment

- **Artifacts created:** `.env.example`, `Dockerfile`, and `docker-compose.yml` at repo root.
- **Dockerfile:** uses `python:3.11-slim`, installs runtime deps (`fastapi`, `uvicorn[standard]`, `httpx`, `pydantic`, `pydantic-settings`), copies `app/`, and launches `uvicorn app.main:app --host 0.0.0.0 --port 8080`. No secrets baked into the image; container remains stateless.
- **Compose setup:** single `achilles-mcp-gateway` service with `build: .`, `env_file: .env`, `ports: "8080:8080"`, `restart: unless-stopped`. Operators provide a real `.env` derived from `.env.example`, pointing `ACHILLES_BASE_URL` at their Achilles Core deployment.
- **Validation workflow:** run `docker compose up --build`, wait for `Uvicorn` logs, and hit `http://localhost:8080/api/achilles/v1/mcp/health` to confirm `status: ok`. Scaling additional instances only requires adding replicas; no stateful volumes or DB dependencies exist.

