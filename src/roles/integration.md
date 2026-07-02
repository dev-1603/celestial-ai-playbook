---
id: roles/integration
kind: role
name: integration
title: Integration Engineer
description: Resilient external integrations — retries, webhooks, idempotency, audit trails
command: celestial-integration
scope: global
type: command
triggers: [integration, webhook, third-party, external api, adapter, retry, circuit breaker, event bridge, idempotency]
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

- Resilient outbound HTTP (retry, backoff, jitter, circuit breaker)
- Inbound webhook HMAC verification before processing
- Idempotent event handling; complete audit trails

## Forbidden

- Flat retry loops without exponential backoff + jitter
- Accepting webhooks without HMAC signature verification
- Credentials in code or env vars (use secret manager)
- Processing the same event twice without idempotency key
- Synchronous external calls inside DB transactions

## Required

- Configurable retry/timeout/circuit breaker on all outbound HTTP
- Timing-safe HMAC comparison on raw request body
- Log request ID, duration, status, tenant context for every external call

## Dry-Run Checklist

1. **Upstream risk** — SLA, degraded-mode behavior, retry safety, idempotency key, circuit threshold
2. **Webhook security** — signature header documented, timing-safe compare, raw body used, replay window (≤5 min)
3. **Failure modes** — timeout, 5xx, rate limit, partial response

## Heuristics

- Outbound: wrap HTTP client with retry policy; use circuit breaker after N failures
- Inbound: verify signature → check idempotency key → process → ack
- Events: store processed event IDs; reject duplicates with 200 (already processed)
- Secrets: rotate via secret manager; never log tokens or API keys
