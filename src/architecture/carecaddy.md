# ARCHITECTURE: CareCaddy Healthcare Vertical
@files *
@priority 95

---

## LAYER 3: PRODUCT OVERLAY NOTE
> **Layer Order:** Layer 3 (Product Specific)
> **Base Policy:** This file extends the domain-neutral Layer 1 global rules with healthcare-specific compliance and logic.

## Overview

CareCaddy is a **regulated B2B2C healthcare platform** operating under India's DPDP Act 2023 and ABDM framework. It connects Care Seekers (patients/clients) with Care Givers (providers: therapists, nurses, doctors, elder care specialists) across multiple care categories.

**Repository Ecosystem:**
| Repo | Stack | Purpose |
|------|-------|---------|
| `carecaddy-api` | NestJS + Prisma + PostgreSQL | Core backend — all business logic |
| `carecaddy-web` | Next.js 16 + App Router + Zustand | Patient/provider web application |
| `carecaddy-admin` | Next.js + React Admin | Platform admin dashboard |
| `carecaddy-packages` | TypeScript monorepo | Shared types, utils, validators |

---

## 1. Multi-Tenancy Architecture

### 1.1 Tenant Model
CareCaddy operates a **Platform-as-a-Service model** — each healthcare organization (hospital, clinic, home care agency) is a distinct tenant with:
- Isolated patient data (RLS-enforced)
- Customizable care categories and service offerings
- Tenant-specific branding and CMS content
- Independent payment configurations (some may use their own payment gateway)

### 1.2 Tenant Isolation Layers
```
Layer 1: API Gateway — X-Tenant-Id header injection
Layer 2: NestJS Guard — validates X-Tenant-Id on every request
Layer 3: Prisma middleware — injects { tenantId } filter on every query
Layer 4: PostgreSQL RLS — row-level enforcement even if app layer is bypassed
Layer 5: AES-256-GCM encryption — PHI encrypted with tenant-derived keys
```

### 1.3 Tenant Context Provider (NestJS)
```typescript
// carecaddy-api/src/common/guards/tenant.guard.ts
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    const userId = request.headers['x-user-id'];

    if (!tenantId || !userId) {
      throw new UnauthorizedException('Missing gateway context headers');
    }

    // Bind tenant context to the request for downstream use
    request.tenantContext = { tenantId, userId, roles: request.headers['x-roles']?.split(',') ?? [] };
    return true;
  }
}
```

---

## 2. Core Domain Model

### 2.1 User Roles & Personas
| Role | Description | PHI Access Level |
|------|-------------|-----------------|
| `care_seeker` | Patient, client, or their guardian | Own records only |
| `care_giver` | Licensed healthcare provider | Assigned caseload records |
| `org_admin` | Organization/clinic administrator | Aggregate reports, no raw PHI |
| `clinical_staff` | Nurses, coordinators supporting care givers | Limited to assigned cases |
| `platform_admin` | CareCaddy internal team | Anonymized cross-tenant visibility |

### 2.2 Care Categories
Based on planning: Mental Health, Elder Care, Physiotherapy, Pediatric Care, Chronic Disease Management, Post-Surgery Rehabilitation, Nutrition & Wellness.

### 2.3 Core Entities
```typescript
// Primary domain entities (Prisma schema excerpts)
model CarePlan {
  id           String    @id @default(cuid())
  tenantId     String
  careSeekerId String
  careGiverId  String
  category     CareCategory
  status       CarePlanStatus
  phiToken     String    // UUID referencing encrypted PHI vault record
  startDate    DateTime
  endDate      DateTime?
  sessions     Session[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([tenantId, careSeekerId])
  @@index([tenantId, careGiverId])
}

model Session {
  id          String        @id @default(cuid())
  tenantId    String
  carePlanId  String
  scheduledAt DateTime
  status      SessionStatus
  notes       String?       // Encrypted at rest — contains PHI
  recordingToken String?    // Token referencing encrypted R2 object
  carePlan    CarePlan      @relation(fields: [carePlanId], references: [id])

  @@index([tenantId, carePlanId])
}
```

---

## 3. CareGiver Proxy Architecture

### 3.1 Problem
Care Givers need to act on behalf of Care Seekers in some workflows (filling health intake forms, updating care journals, recording session notes). This must be audited and consent-gated.

### 3.2 Proxy Authorization Flow
```
CareGiver requests proxy action
    │
    ▼
Check: Does CareSeeker's care plan grant proxy permission?
    │
    ├─ No ──► 403 with care seeker consent link
    │
    └─ Yes ──► Record proxy session in audit log
                  │
                  ▼
              Action executed with BOTH actor (care_giver) and subject (care_seeker) IDs logged
```

### 3.3 Proxy Audit Record
```typescript
interface ProxyAuditRecord {
  id:            string;
  tenantId:      string;
  actorId:       string;        // care_giver UUID
  subjectId:     string;        // care_seeker UUID
  action:        string;        // 'session_notes.create', 'care_plan.update'
  resourceId:    string;
  consentRef:    string;        // Reference to consent record
  performedAt:   string;        // ISO-8601
  ipAddress:     string;        // For compliance tracing
}
```

---

## 4. PHI Handling Rules (Absolute Mandates)

### 4.1 PHI Definition (within CareCaddy)
Protected Health Information includes:
- Patient name, date of birth, contact details
- ABHA ID (Ayushman Bharat Health Account Number)
- Diagnosis codes (ICD-10), prescription data
- Session notes, clinical assessments
- Audio/video session recordings
- Insurance information

### 4.2 PHI Lifecycle
```
INGESTION                    STORAGE                      AI INFERENCE
User submits PHI             Encrypt: AES-256-GCM          PHI → PHI Token
    │                        Tenant key derivation              │
    ▼                            │                        Send token to AI Platform
PHI Validator                PHI Vault                    AI returns insights (no raw PHI)
(Pydantic/Zod)                   │                             │
    │                        R2 (files/audio)             Insights linked to PHI Token
    ▼                        Postgres (structured)        (resolve only on authorized fetch)
PHI Token (UUID) ──────────────────────────────────────────────┘
```

### 4.3 Encryption Specification
```typescript
// AES-256-GCM with tenant-specific key derivation
const encryptPHI = async (raw: string, tenantId: string): Promise<EncryptedPHI> => {
  const tenantKey = await deriveKey(MASTER_KEY, tenantId);  // HKDF-SHA256
  const iv = crypto.getRandomValues(new Uint8Array(12));     // 96-bit IV
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    tenantKey,
    new TextEncoder().encode(raw)
  );
  return {
    ciphertext: Buffer.from(cipher).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    keyVersion: CURRENT_KEY_VERSION,
    tenantId,
  };
};
```

### 4.4 ABHA Integration
- ABHA ID verification via NHA sandbox/production APIs
- ABHA-linked health records follow FHIR R4 standard
- Consent management: explicit digital consent required before linking ABHA records

---

## 5. AI-Powered Features

### 5.1 Feature Inventory (from planning)
| Feature | Model | PHI Safety |
|---------|-------|-----------|
| Smart CareGiver Matching | Gemini 2.5 Flash | No PHI — uses skill vectors & location |
| AI Session Notes Assistant | MedGemma-27b | PHI-tokenized session transcript |
| Care Plan Suggestion Engine | Gemini 2.5 Flash | PHI-tokenized patient history |
| Symptom Intake Pre-screening | MedGemma-27b | PHI-tokenized — clinical use |
| Wellness Content Generation | Gemini 2.5 Flash | No PHI — general content |
| Predictive Scheduling | Gemini 2.5 Flash | Aggregated, anonymized patterns |

### 5.2 AI Safety Enforcement
```typescript
// MANDATORY: Validate no raw PHI in AI prompt before sending
const validateAIPrompt = (prompt: string, phiPatterns: RegExp[]): void => {
  for (const pattern of phiPatterns) {
    if (pattern.test(prompt)) {
      throw new PHILeakageError(
        'Raw PHI detected in AI prompt. Use PHI tokens instead.'
      );
    }
  }
};

// PHI patterns to detect (never exhaustive — defense in depth)
const PHI_PATTERNS: RegExp[] = [
  /\b\d{14}\b/,                    // ABHA ID format
  /\b(ICD|F|G|J|K|M)\d{2,3}\.\d/i, // ICD-10 codes
  /[a-zA-Z]+ (diagnosed|prescribed|suffers)/i,
];
```

---

## 6. Scheduling & Availability Engine

### 6.1 Architecture
- Care Givers set availability slots (recurring + exceptions)
- Care Seekers browse and book slots
- Booking flow: `slot_hold (15min TTL in Redis)` → `payment capture` → `booking confirmed`
- Upstash Redis for slot hold with automatic TTL expiry

### 6.2 Conflict Prevention
```
Booking attempt
    │
    ▼
Acquire slot lock (Redis SETNX, 15-min TTL)
    │
    ├─ Lock acquired → initiate payment
    │       │
    │       ├─ Payment success → persist booking, release lock variant, send confirmation
    │       └─ Payment failure → release lock, slot available again
    │
    └─ Lock not acquired → slot taken → suggest next available
```

---

## 7. Compliance Requirements

### 7.1 DPDP Act 2023 (India)
- Explicit consent collection before PHI ingestion (timestamped, versioned)
- Data Principal (patient) rights: access, correction, erasure
- Data retention: clinical records minimum 7 years; delete on request after retention period
- Data Processing Agreement required with all AI model providers

### 7.2 ABDM Framework
- ABHA-linked records must follow FHIR R4 (HL7) standard
- Health Information Exchange (HIE) integration for record sharing with consent
- Audit trail required for all PHI access events

### 7.3 Operational Rules
- No CareCaddy employee (including platform admins) can access raw patient PHI directly — access requires break-glass procedure with automatic audit and dual approval
- All API responses containing PHI must set `Cache-Control: no-store`
- Session recordings stored in object storage with CORS restricted to app domain only
