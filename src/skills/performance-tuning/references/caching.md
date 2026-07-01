# Caching Performance

## Cache-Aside Pattern

- Read: check cache → on miss, read DB → populate cache with TTL
- Write: update DB → invalidate or update cache entry

## TTL Rules

- Always set TTL — never cache indefinitely
- Shorter TTL for frequently changing data; longer for read-heavy static config

## Security

- Do not cache plaintext PII without tenant-specific encryption keys
- Include tenant ID in cache key namespace

## Invalidation

- Invalidate on write, not on read
- Use version stamps or event-driven invalidation for distributed caches
