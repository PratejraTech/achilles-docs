# Operational Runbook – Achilles MCP Gateway

This runbook outlines the minimal operational procedures required to deploy, monitor, and troubleshoot the gateway.

## 1. Prerequisites
- **Environment variables:** ensure `ACHILLES_BASE_URL`, `ACHILLES_API_KEY`, `HTTP_TIMEOUT_SECONDS`, and `HTTP_MAX_RETRIES` are provided (see `.env.example`).
- **Achilles Core reachability:** the URL configured in `ACHILLES_BASE_URL` must be accessible from the gateway’s runtime environment (Kubernetes pod, container host, etc.).
- **Runtime requirements:** Python 3.11+ or the provided Docker image (`python:3.11-slim` base).

## 2. Deployment
### Docker Compose (local or staging)
```bash
cp .env.example .env    # update values appropriately
docker compose up --build
```
- Access the health endpoint: `curl http://localhost:8080/api/achilles/v1/mcp/health`.

### Kubernetes or other orchestrators
- Build/push the Docker image or reuse the `Dockerfile`.
- Configure:
  - Container command: `uvicorn app.main:app --host 0.0.0.0 --port 8080`.
  - Port: `8080`.
  - Env vars: same as `.env.example` (mount secrets/config maps).

## 3. Health & Monitoring
- **Local health:** `/api/achilles/v1/mcp/health` always returns gateway status (process uptime, accepting signals flag). This does not call Achilles Core.
- **Upstream health (optional):** `AchillesClient.health()` can be wired to a future `/mcp/health` endpoint on Core. Until then, monitor upstream errors via logs.
- **Logging:** default Python logging (structuring is left to deployment). Ensure logs capture request IDs/correlation IDs if added later.

## 4. Scaling & Availability
- Stateless design allows horizontal scaling—add replicas behind a load balancer with sticky sessions *not* required.
- Each request initializes its own `AchillesClient` instance (or shares via lifespan) to avoid shared state.
- If Achilles Core is unavailable, the gateway fails fast with upstream HTTP errors; operators should rely on retry/backoff at the IDE or CI agent layer.

## 5. Troubleshooting
1. **Health fails / service down:**
   - Check container logs for startup errors (misconfigured env vars, missing dependencies).
   - Retry using `uvicorn` locally to isolate from orchestration issues.
2. **Upstream 4xx/5xx:**
   - Inspect gateway logs; `AchillesClient` surfaces HTTP status codes.
   - Verify `ACHILLES_BASE_URL` and `ACHILLES_API_KEY`.
   - Use `tests/` with `pytest` to reproduce schema-level issues locally.
3. **Schema mismatches:**
   - Confirm the transport models match Achilles Core’s OpenAPI. Schema drift should be resolved by updating both sides in lockstep.
4. **Performance issues:**
   - Tune `HTTP_TIMEOUT_SECONDS` / `HTTP_MAX_RETRIES` via env vars.
   - Consider reusing `httpx.AsyncClient` via FastAPI lifespan to reduce connection churn if profiling indicates overhead.

## 6. Maintenance Tasks
- **Dependency updates:** modify `pyproject.toml` and rebuild the Docker image.
- **Config changes:** adjust `.env` or Kubernetes secrets; no code changes required for base URL or tokens.
- **Schema/endpoint extensions:** follow the extensibility guide (see `docs/extensibility.md`).
- **Test suite:** run `pytest` before releases to ensure mocks still align with Achilles Core contracts.

