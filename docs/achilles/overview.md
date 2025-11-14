# Achilles Overview

Achilles is an observability and build-intelligence platform for agentic development workflows. It captures activity from IDEs, CLIs, agents, and CI systems, aligns that activity with build milestones, and produces insights about both human and agent performance. Achilles never edits source code; it focuses purely on ingestion, analysis, and read-only reporting.

## Core Capabilities

- **Signal Ingestion** – Sessions and granular events arrive through adapters (IDE/MCP, CLI, CI) and are validated, hashed, and deduplicated before landing in Postgres.
- **Processing Engine** – Background jobs turn raw streams into higher-level artifacts: compressed timelines, error clusters, event correlations, and session summaries.
- **Monitoring Agent** – A LangGraph-based agent interprets processed data to emit insights and compute per-agent performance metrics, with multi-provider/model support for the LLM tier.
- **Read APIs & Dashboard** – FastAPI endpoints power IDE surfaces and the Next.js dashboard, enabling teams to inspect sessions, timelines, correlations, and insights without touching raw storage.

## High-Level Flow

1. **Adapters** submit `POST /v1/sessions/start`, `POST /v1/events/batch`, and `POST /v1/sessions/end`.
2. **Ingestion API** validates data using shared Pydantic models (`achilles_core`), computes dedupe hashes, and persists rows in `events` and `sessions`.
3. **Processing Engine** detects noise patterns, builds clusters/correlations, and updates summary metrics so outputs are always reproducible and idempotent.
4. **Monitoring Agent** reads the derived tables to describe risk patterns (e.g., break/fix loops, agent-induced errors) and to write structured `insights` plus `agent_performance`.
5. **Dashboard / API Consumers** query `/v1/sessions/*`, `/v1/insights/recent`, etc., to visualize timelines, insights, and trends.

## Non-Goals

- No issue tracking, sprint management, or PM workflows.
- No automated modifications to user repositories.
- No ML-driven inference beyond deterministic heuristics for the MVP (Phase 1–4).

See `docs/architecture.md` and `docs/processing.md` for deeper dives.

