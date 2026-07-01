# Application Layer Performance

## Event Loop (Node.js)

- Never block the event loop with CPU-bound work
- Offload to worker threads or job queues for hashing, compression, ML inference

## Batching

- Batch writes and external API calls where safe
- Debounce high-frequency UI-triggered API calls

## Memory

- Stream large payloads instead of buffering in memory
- Set explicit timeouts on all outbound HTTP calls

## Measurement

- Track p50/p95/p99 latency per endpoint
- Alert on regression >20% from baseline
