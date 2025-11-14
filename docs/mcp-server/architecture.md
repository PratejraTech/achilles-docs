# Achilles MCP Gateway – Architecture Overview

## Purpose & Boundary
- Acts as the MCP-facing façade for Achilles Core (`init.md`, `prd.md`).
- Validates IDE/LLM input, adds attribution metadata, and forwards to Core; never stores data or runs analytics.
- Stateless by design: no DBs, caches, or background workers. If state is required, it must live in Achilles Core (see `AGENTS.md`).

## Runtime Components
- **FastAPI app (`app/main.py`):** Registers global CORS and mounts the MCP router at `/api/achilles/v1/mcp`.
- **Router (`app/routes/mcp.py`):** Declarative endpoints for health, handshake, sessions, projects, signals, snapshots, and insights. Each handler:
  1. Validates the request using the Pydantic transport models.
  2. Depends on `get_achilles_client` to obtain a short-lived HTTP client.
  3. Forwards the payload and returns the Achilles Core response verbatim.
- **AchillesClient (`app/clients/achilles.py`):** Thin httpx wrapper with retry/backoff logic, responsible for attaching bearer auth headers and keeping Core paths consistent.
- **Transport models (`app/models/mcp.py`, `app/models/health.py`):** Canonical DTOs shared by both router and client to prevent schema drift.
- **Settings (`app/config.py`):** Environment-driven configuration for base URL, API key, HTTP timeouts/retries, and service metadata.

## Configuration & Deployment
- Environment variables (or a `.env` referenced by docker compose) provide:
  - `ACHILLES_BASE_URL`, `ACHILLES_API_KEY`
  - Optional `HTTP_TIMEOUT_SECONDS`, `HTTP_MAX_RETRIES`
- `.env.example` documents required keys without secrets.
- **Dockerfile:** `python:3.11-slim`, installs runtime dependencies, copies `app/` + `pyproject.toml`, and runs `uvicorn app.main:app --host 0.0.0.0 --port 8080`.
- **docker-compose.yml:** Single service `achilles-mcp-gateway` (`build: .`, `env_file: .env`, `ports: 8080:8080`, `restart: unless-stopped`). Achilles Core should run separately; operators point `ACHILLES_BASE_URL` to the reachable Core endpoint.

## Validation & Testing
- Pytest + `pytest-asyncio` + `respx` cover each route with mocked Achilles responses (`tests/` directory), ensuring schema validation and pass-through semantics.
- Health verification: `docker compose up --build`, then GET `http://localhost:8080/api/achilles/v1/mcp/health` to confirm `status: ok`.

## Extension Guidelines
- Add new transport models in `app/models/mcp.py` (or submodules) first, then update the router and client in lockstep.
- Keep routes thin—no business logic, no data mutation beyond validation/normalization.
- Reuse the dependency-injected `AchillesClient` pattern for any new outbound call.
- Expand tests alongside new endpoints to guarantee contract stability.

