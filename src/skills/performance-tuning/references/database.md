# Database Performance

## N+1 Prevention

- Use DataLoaders or SQL JOINs — never loop queries per item
- Batch `WHERE IN` for related entity fetches

## Pagination

- Prefer cursor-based over offset-based for large collections
- Cap page size server-side (default max 100)

## Indexing

- Use partial indexes for highly filtered queries
- Run `EXPLAIN ANALYZE` before and after index changes

## Query Rules

- Select only needed columns
- Avoid `SELECT *` on wide tables
- Use connection pooling with appropriate max connections
