# Extensibility Guide – Achilles MCP Gateway

Use this guide when adding new functionality while keeping the gateway thin, stateless, and aligned with Achilles Core.

## 1. Evaluate the Requirement
Before coding, confirm:
- Does the feature belong in the gateway? (Validation, attribution, pass-through logic are ok; analytics or persistence should go to Achilles Core.)
- Do upstream APIs already exist? Coordinate with the Core team to avoid inventing schemas.

## 2. Schema-First Workflow
1. Update or add transport models in `app/models/mcp.py` (or a dedicated submodule if the area grows).
2. Include enums, request/response DTOs, and validation constraints directly in the models.
3. Document the change in `docs/endpoints-and-schemas.md` to keep other teams informed.

## 3. AchillesClient Enhancements
- Add a method per new Core endpoint inside `app/clients/achilles.py`.
- Reuse `_request` for auth and retries; only set HTTP method/path/payload.
- Keep method signatures typed with the transport models.

## 4. Router Updates
- Create a route in `app/routes/mcp.py` that:
  - Validates the incoming payload via Pydantic.
  - Calls the new `AchillesClient` method.
  - Returns the response without mutating semantics.
- If the endpoint is optional or dev-only, gate it behind feature flags or configuration to avoid surprising clients.

## 5. Testing
- Add or extend pytest modules (`tests/`) to cover new routes and failure modes:
  - Use `respx` to mock upstream Achilles responses.
  - Assert both successful and error scenarios to confirm pass-through behavior.

## 6. Documentation & Communication
- Update relevant docs:
  - `docs/architecture.md` if the runtime structure changes.
  - `docs/endpoints-and-schemas.md` for new API surface.
  - `docs/mcp-design-patterns.md` if the pattern evolves.
- Communicate schema changes to downstream IDE/agent teams to maintain compatibility.

## 7. Deployment Considerations
- No additional services should be introduced in Docker Compose unless explicitly required for local testing (and clearly labeled as such).
- Ensure `.env.example` stays up to date with any new configuration knobs.

Following these steps keeps the MCP Gateway extensible without compromising the stateless proxy guarantees it provides.

