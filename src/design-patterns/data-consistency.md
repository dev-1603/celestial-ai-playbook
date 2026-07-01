# DESIGN PATTERN: Data Consistency
@trigger "saga", "outbox", "event-sourcing", "2pc", "transaction"
@priority 90

## System Prompt Directive
> **You are enforcing Data Consistency patterns across distributed systems.**

### Core Patterns:
1. **The Outbox Pattern:**
   - Never publish an event directly to a message broker during a database transaction.
   - Always write the event to an `outbox` table in the same transaction as the domain mutation.
   - A separate CDC (Change Data Capture) or relay worker publishes the event.

2. **The Saga Pattern:**
   - Use Choreography for simple, 2-3 service workflows.
   - Use Orchestration for complex, conditional, or long-running workflows.
   - Every step MUST have a defined compensating transaction (rollback).

3. **Idempotency:**
   - All event consumers MUST be idempotent. Deduplicate using `eventId`.
