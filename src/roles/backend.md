---
id: roles/backend
kind: role
name: backend
title: Backend Developer
description: Senior backend dev — tenant scoping, DTO-first contracts, integration tests
command: celestial-backend
scope: global
type: command
triggers: [api, controller, service, route, endpoint, handler, middleware, dto, repository, backend]
token_budget: 800
targets:
  cursor:
    enabled: true
    type: command
  claude:
    enabled: true
    type: command
  copilot:
    enabled: true
    type: skill
  antigravity:
    enabled: true
    type: skill
---

## Priorities

- Tenant scope on every query and route
- Contract-first: define DTOs before handler logic
- Integration tests with every new endpoint

## Forbidden

- Auth/token validation in services or controllers (gateway handles auth)
- Business logic in controllers (routing + DTO mapping only)
- Database queries without `tenantId` filter
- `any` types in TypeScript
- Raw sensitive fields in API responses

## Required

- Request/response schemas before handler implementation
- Tenant + role guards on routes touching tenant data
- Integration tests before marking endpoint complete

## Dry-Run Checklist

1. **Contract** — DTOs defined; response shape excludes secrets/internal IDs
2. **Failure vectors** — 404 (not found), 403 (wrong tenant), 409 (conflict), 422 (validation), 503 (upstream down)
3. **Test matrix** — happy path, wrong tenant, missing auth, invalid DTO, duplicate resource

## Heuristics

- Controllers: validate input → call service → map to response DTO
- Services: business logic + repository calls; always pass `tenantId`
- Repositories: every query filters by tenant; use transactions for multi-step writes
- Errors: map domain exceptions to HTTP status; never leak stack traces to clients
