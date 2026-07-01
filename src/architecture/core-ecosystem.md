# ARCHITECTURE: Core Ecosystem — Gateway, OMS, CMS, Payments, CRM, Analytics
@files *
@priority 90

---

## Overview

The Core Ecosystem comprises the shared utility services that all verticals consume. These are stateless, multi-tenant aware, and accessed via the API Gateway's **Shared Utility Call** routing path.

```
API GATEWAY
    │
    ├─── CMS / PAGE BUILDER      ← Content management, tenant-branded pages
    ├─── PAYMENT SERVICE         ← Billing, subscriptions, escrow, routing
    ├─── COMMON ORDERS MGMT      ← OMS — unified order lifecycle across verticals
    └─── AI PLATFORM             ← Shared AI inference, tokenization layer

Verticals (async events):
    Ecommerce ──► Event Reconciliation
    Fintech   ──► Loyalty Update Events
    CRM       ──► Async Event → Insights Ready
    Healthcare ──► Data-tokenized AI inference requests
```

---

## 1. API Gateway — Core Routing

### 1.1 Routing Types
| Call Type | Auth Mechanism | Use Case |
|-----------|---------------|----------|
| Post-Login Service Call | JWT via IDP | Vertical-specific user actions |
| Internal Service Call | mTLS + Service Account | Vertical ↔ Vertical async |
| Shared Utility Call | X-Tenant-Id header + service token | Utility service access |

### 1.2 Upstream Service Registry
Gateway resolves upstreams via a dynamic service registry (Consul or Kubernetes Service discovery). No hardcoded upstream URLs.

### 1.3 Observability
- All requests tagged with `X-Trace-Id` (distributed trace propagation via OpenTelemetry)
- Gateway emits: request count, latency histogram (p50/p95/p99), error rate per route per tenant
- Alert threshold: p99 latency > 500ms triggers PagerDuty

---

## 2. CMS / Page Builder

### 2.1 Architecture
- Headless CMS (Strapi or custom NestJS content service)
- Tenant-isolated content storage — each tenant's content resides in isolated namespaces
- Event: `content.updated` → published to event bus → consumed by CDN invalidation workers

### 2.2 Integration Pattern
```typescript
// Downstream service consuming CMS content
const content = await cmsClient.getPageContent({
  tenantId: req.headers['x-tenant-id'],   // always from gateway header
  pageSlug: 'home',
  locale: 'en-US',
});
```
- Sensitive PII MUST NOT be embedded in CMS content — CMS stores templates with placeholder tokens.

---

## 3. Payment Service

### 3.1 Architecture
- Wraps payment gateway integrations (Stripe, Razorpay, etc.)
- Implements idempotency keys on all payment initiation calls
- Maintains internal payment state machine: `INITIATED → PENDING → AUTHORIZED → CAPTURED | FAILED | REFUNDED`

### 3.2 Compliance Rules
- PCI-DSS Level 1: No raw card data touches application servers (tokenized at gateway level)
- All payment records retained for 7 years (financial compliance)
- Refund workflows require dual authorization for amounts over configured thresholds.

---

## 4. Common Orders Management (OMS)

### 4.1 Order Lifecycle
```typescript
enum OrderStatus {
  DRAFT       = 'draft',
  CONFIRMED   = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED   = 'completed',
  CANCELLED   = 'cancelled',
  DISPUTED    = 'disputed',
}
```

### 4.2 Multi-Vertical Order Model
```sql
-- Unified order table with vertical-specific extensions
CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  vertical    VARCHAR(50) NOT NULL,  -- 'ecommerce' | 'healthcare' | 'fintech'
  status      order_status NOT NULL,
  metadata    JSONB,                 -- vertical-specific fields
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- RLS enforced for tenant isolation
```

### 4.3 Event Emissions
- `order.created` → triggers payment initiation workflow
- `order.completed` → triggers loyalty points update, analytics ingestion
- `order.cancelled` → triggers refund workflow

---

## 5. CRM — Customer Relationship Management

### 5.1 Event Consumption
- Consumes `user.provisioned` events from IDP to create CRM contact records
- Consumes `order.completed` events to update customer lifetime value
- Emits `insights.ready` async events to Analytics platform

### 5.2 Multi-Tenant Data Model
- Each tenant has isolated contact, segment, and campaign datasets
- Cross-tenant analytics are **aggregated and anonymized only** — no raw cross-tenant PII access

---

## 6. Analytics Platform

### 6.1 Data Pipeline
```
Event Bus (Kafka/QStash)
    │
    ▼
Event Collectors (per vertical)
    │
    ▼
Data Warehouse (BigQuery / Redshift / Snowflake)
    │
    ▼
Analytics API (aggregated, anonymized)
    │
    ▼
Dashboard / Reporting UI
```

### 6.2 PII Segregation in Analytics
- Highly sensitive domain events are **excluded** from the analytics pipeline.
- Only behavioral data (page views, feature engagement, conversion funnel) flows through.
- Analytics tenant IDs are hashed (SHA-256) before storage to prevent re-identification.

---

## 7. AI Platform (Shared Inference Layer)

### 7.1 Architecture
- Centralized AI inference endpoint — all verticals route AI requests here
- Implements data token exchange: vertical sends token → AI Platform resolves to encrypted record → performs inference → returns result with token references (never raw sensitive data in response)

### 7.2 Safe Inference Contract
```typescript
interface AIPlatformRequest {
  tenantId: string;
  requestId: string;          // idempotency key
  modelId: string;            // model identifier
  dataTokens: string[];       // UUIDs — platform resolves these, never sends raw sensitive data to model
  prompt: string;             // Must not contain raw sensitive data — validated server-side
  maxTokens: number;
  temperature: number;
}
```
