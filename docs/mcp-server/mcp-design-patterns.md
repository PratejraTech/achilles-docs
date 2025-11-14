# MCP Server Design Patterns (Achilles Gateway Reference)

## 1. Schema-First Contracts
- Keep transport models (enums + DTOs) centralized (`app/models/mcp.py`) so routers, clients, and tests share the same definitions.
- Treat these Pydantic models as the source of truth; any change must be coordinated with Achilles Core to avoid schema drift.
- Alias tricky fields (e.g., `metadata_`) and enforce validation ranges (confidence, batch limits) inside the models rather than in route handlers.

## 2. Dependency-Injected Clients
- The FastAPI router never constructs HTTP clients directly; it relies on `Depends(get_achilles_client)`.
- `AchillesClient` encapsulates authentication, retries, and logging. Extending the gateway means adding a new method here and wiring it into a route.
- Use short-lived clients (or lifespan-managed ones) to keep the service stateless and to allow per-request configuration overrides when needed.

## 3. Thin, Stateless Routes
- Each endpoint follows the same flow:
  1. Validate request body with the appropriate Pydantic model.
  2. Call the matching `AchillesClient` method.
  3. Return the response (optionally validated again) without mutating semantics.
- No caching, DB operations, or business logic—this keeps the gateway horizontally scalable and easy to reason about.

## 4. Mock-Friendly Testing
- Tests use `httpx.AsyncClient` + `ASGITransport` to talk to the FastAPI app in-memory.
- `respx` mocks Achilles Core responses so each route’s behavior (including partial failures) is covered without touching real infrastructure.
- When adding endpoints, mirror this pattern to keep regression coverage high.

## 5. Environment-Driven Configuration
- All secrets and URLs come from env vars (`app/config.py` + `.env.example`), making containers portable.
- Docker + docker-compose provide a reproducible way to run the gateway locally (`uvicorn app.main:app` on port 8080) while still pointing at any Achilles Core deployment.

## 6. Extension Playbook
1. Define or update transport schemas.
2. Add/adjust `AchillesClient` methods that target the upstream API.
3. Create/modify FastAPI routes using dependency injection.
4. Add pytest/respx coverage for the new flow.
5. Update docs (`docs/*.md`) so other teams know how to consume the endpoint.

Following these patterns ensures every MCP server we build remains transparent, testable, and aligned with Achilles Core expectations.

