---
name: celestial-performance-tuning
description: Diagnoses and fixes performance issues — N+1 queries, caching, latency, throughput
scope: global
type: skill
triggers: [performance, slow, optimize, latency, n+1, cache]
token_budget: 200
references: [references/database.md, references/caching.md, references/application.md]
---

## When to use

Load reference files on demand when optimizing slow code, databases, or APIs.

## Heuristics

1. Measure before optimizing — profile query plans, latency percentiles, event loop lag
2. Fix N+1 and missing indexes before adding cache layers
3. Set TTL on all caches; never cache plaintext PII without tenant-scoped encryption

## References (read JIT)

- `references/database.md` — query plans, pagination, indexes
- `references/caching.md` — cache-aside, TTL, invalidation
- `references/application.md` — event loop, worker threads, batching
