# ARCHITECTURE: Celestial Auth Control Plane
@files *
@priority 95

---

## Overview

The Celestial Auth Control Plane is the **central nervous system** of the entire B2B2C SaaS ecosystem. It is the sole authority for identity, authentication, and policy-based authorization across all verticals (Ecommerce, Fintech, CRM, Healthcare, LMS) and utility services (Gateway, OMS, CMS, Payments, AI Platform).

```
┌─────────────────────────────────────────────────────┐
│              CONTROL PLANE (THE BRAIN)              │
│                                                     │
│  ┌──────────────────┐    ┌──────────────────────┐  │
│  │  CELESTIAL AUTH  │    │   SUPERADMIN CONSOLE │  │
│  │  (IDP)           │◄──►│   (Config Mgmt)      │  │
│  └──────────────────┘    └──────────────────────┘  │
│           │                        │                │
│  Sync gRPC/REST           PUSH CONFIG JSON          │
│           ▼                        ▼                │
│  ┌──────────────────────────────────────────────┐   │
│  │        GLOBAL AUTHORIZER (PDP)               │   │
│  │   Policy Decision Point — Allow / Deny       │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
          │ Synchronous gRPC/REST
          ▼
    ┌───────────┐
    │ API       │ ← All traffic flows through here
    │ GATEWAY   │ → Injects X-User-Id, X-Tenant-Id, X-Roles
    └───────────┘
```

---

## 1. Identity Provider (IDP) — Celestial Auth

### 1.1 Responsibilities
- Issue and manage JWT access tokens + refresh tokens (RS256 signed)
- Federated identity: OAuth2/OIDC, SAML 2.0, domain-specific external identity providers
- Multi-tenant session isolation — sessions are scoped to `(user_id, tenant_id)` pairs
- Async user data provisioning to downstream verticals via event bus
- TOTP-based MFA for Superadmin and high-privilege tenant roles

### 1.2 Token Architecture
```typescript
// Access Token Payload (never expose refresh token to frontend)
interface CelestialAccessToken {
  sub: string;          // user UUID
  tid: string;          // tenant UUID
  roles: string[];      // e.g. ["vertical:role_name", "platform:admin"]
  sid: string;          // session UUID for tracing
  iss: string;          // "celestial-auth.platform.io"
  exp: number;          // configured per-tenant/role
  iat: number;
  jti: string;          // JWT ID for revocation tracking
}
```

### 1.3 Gateway Header Injection Contract
After token validation, the Gateway strips the Authorization header and injects:
```
X-User-Id:    <verified user UUID>
X-Tenant-Id:  <verified tenant UUID>
X-Roles:      vertical:role_name,platform:admin
X-Session-Id: <session UUID>
```
**CRITICAL:** Verticals MUST read these headers and NEVER re-validate tokens themselves.

---

## 2. Policy Decision Point (PDP) — Global Authorizer

### 2.1 Responsibilities
- Fine-grained RBAC + ABAC enforcement using Open Policy Agent (OPA) or custom rule engine
- Evaluates: `(subject, resource, action, context)` → `Allow | Deny`
- Supports tenant-level policy overrides — a tenant can restrict roles further but not elevate beyond platform defaults
- Real-time policy updates via config push from SuperAdmin Console

### 2.2 Authorization Check Flow
```
Vertical API Handler
  → Check X-User-Id + X-Tenant-Id headers present (401 if missing)
  → Read X-Roles header
  → Call PDP with: { userId, tenantId, roles, resource, action }
  → PDP returns: { decision: 'allow'|'deny', reason: string }
  → If 'deny': return 403 with reason
  → If 'allow': proceed with handler logic
```

### 2.3 Role Taxonomy (Platform-wide)
| Role | Scope | Description |
|------|-------|-------------|
| `platform:superadmin` | Global | Full system access, config management |
| `platform:support` | Global | Read-only cross-tenant access |
| `vertical:end_user` | Tenant | General user of a tenant application |
| `vertical:admin` | Tenant | Organization admin — manages team/config |
| `vertical:agent` | Tenant | Privileged user serving end users |

---

## 3. SuperAdmin Console

### 3.1 Access & Security
- Only accessible via `platform:superadmin` role + TOTP MFA (mandatory, no exception)
- Separate deployment, separate domain
- All actions produce immutable audit logs with actor, timestamp, affected resource, and diff

### 3.2 Capabilities
- Tenant lifecycle: create, suspend, activate, delete
- Push tenant-specific policy configurations to PDP
- View cross-tenant event streams (anonymized, no raw PII exposure)
- Force session revocation for a user or entire tenant
- Manage IDP federation config (SAML IdP metadata, OAuth2 client credentials)

### 3.3 Config Push Protocol
```json
{
  "tenantId": "uuid",
  "pushType": "policy_update",
  "payload": {
    "maxSessionDurationMinutes": 480,
    "mfaRequired": true,
    "allowedRoles": ["vertical:end_user", "vertical:agent"],
    "ipAllowlist": []
  },
  "version": 42,
  "pushedAt": "ISO-8601"
}
```

---

## 4. API Gateway

### 4.1 Routing Architecture
- **Post-login service calls** from verticals → Gateway validates token, injects headers, routes to downstream
- **Internal service calls** between verticals use mTLS + service accounts (no end-user token required)
- **Shared utility calls** (CMS, Payments, OMS, AI Platform) → Gateway routes with tenant context

### 4.2 Gateway Middleware Stack (in order)
1. Rate limiting (per tenant, per endpoint)
2. TLS termination
3. JWT validation (RS256 public key verification)
4. Token refresh if `exp - now < 60s`
5. Header injection (`X-User-Id`, `X-Tenant-Id`, `X-Roles`, `X-Session-Id`)
6. Request tracing header injection (`X-Trace-Id`, `X-Span-Id`)
7. Route to upstream vertical
8. Response sanitization (strip internal headers from client response)

---

## 5. Event Bus (Async User Data Provisioning)

### 5.1 IDP → Vertical Provisioning Events
```typescript
// Published by Celestial Auth after user account creation
interface UserProvisionedEvent {
  eventId: string;
  eventType: 'user.provisioned' | 'user.updated' | 'user.suspended';
  userId: string;
  tenantId: string;
  profile: {
    email: string;
    name: string;
    locale: string;
    timezone: string;
    domainContext?: Record<string, any>; // Vertical-specific extensions
  };
  roles: string[];
  publishedAt: string;       // ISO-8601
}
```
Verticals consume these events to pre-create local user records, avoiding on-demand N+1 profile fetches.

---

## 6. Non-Negotiable Architectural Constraints

1. **Auth is centralized.** No vertical has an auth database or issues tokens. Period.
2. **Stateless verticals.** Verticals hold no session state — all auth state lives in the IDP.
3. **Header trust boundary.** Within the cluster network (behind Gateway), `X-*` headers are trusted. At the public boundary (load balancer ingress), all `X-*` headers from external requests are STRIPPED before Gateway processing.
4. **PDP is the oracle.** For any permission check beyond "user is logged in", call PDP — do not replicate policy logic in vertical code.
5. **Audit everything.** Every auth decision (allow or deny) and every admin action must be published to the immutable audit log stream.
