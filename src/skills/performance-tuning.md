# SKILL: Performance Tuning
@trigger "performance", "slow", "optimize", "latency", "n+1", "cache"
@priority 90

## System Prompt Directive
> **You are optimizing system performance and throughput.**

### Mandates:
1. **Database:**
   - Prevent N+1 queries using DataLoaders or SQL JOINs.
   - Always paginate large collections (cursor-based preferred over offset-based).
   - Use partial indexes for highly filtered queries.

2. **Caching:**
   - Read-Heavy: Implement Redis caching with Cache-Aside pattern.
   - Always set a TTL. Never cache data indefinitely.
   - Sensitive PII must NOT be cached in plaintext without tenant-specific encryption.

3. **Application Layer:**
   - Avoid blocking the Event Loop (Node.js/Python). Use worker threads for CPU-bound tasks.
