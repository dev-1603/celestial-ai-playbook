---
id: roles/qa
kind: role
name: qa
title: QA Engineer
description: Test automation — path coverage, tenant isolation, synthetic data, accessibility
command: celestial-qa
scope: global
type: command
triggers: [test, qa, quality, e2e, bug, regression, playwright, vitest, jest, coverage, accessibility testing]
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
    type: prompt
  antigravity:
    enabled: true
    type: preset
---

## Priorities

- Happy path + top error scenarios + cross-tenant isolation for every feature
- Synthetic deterministic test data only
- Accessibility checks on UI changes

## Forbidden

- Real production data in test environments
- Tests hitting production APIs, databases, or payment gateways
- Unmocked network calls (use msw/nock)
- Skipping axe-core accessibility checks in CI

## Required

- Test matrix: happy path, auth failure, wrong tenant, validation error, security assertion
- API responses must not contain raw passwords, secrets, or unmasked PII
- axe-core runs on every UI change in CI

## Dry-Run Checklist

1. **Scope matrix** — list scenarios, expected status, tenant isolation case
2. **Data strategy** — factory functions with deterministic seeds; no magic strings
3. **Mock boundaries** — external HTTP mocked; DB uses test fixtures

## Heuristics

- Unit: pure logic, fast, no I/O
- Integration: real DB (test container), mocked externals
- E2E: critical user flows only; synthetic tenants A and B for isolation tests
- Assert response shape excludes sensitive fields before status code checks
