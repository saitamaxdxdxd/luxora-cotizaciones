# LUXORA Organizations Module — Complete Guide

## Overview

The Organizations module enables LUXORA to support both **B2C (individual customers)** and **B2B (corporate accounts)** rental operations. It introduces:

- **Organizations (Companies)** with legal representation
- **Company Members** with distinct roles
- **Flexible Participants** that can be individuals or organizations
- **Contract clarity** showing legal entities and representatives

---

## Data Model

### 1. Organization

```typescript
interface Organization {
  id: string;
  businessName: string;      // razón social
  rfc: string;              // RFC (tax identifier)
  calle: string;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  createdAt: string;
  updatedAt: string;
}
```

**Example JSON:**

```json
{
  "id": "1712234567000-a1b2c3d4e5f6g7h8",
  "businessName": "Viajes del Norte SA de CV",
  "rfc": "VDN201203ABC123",
  "calle": "Av. Paseo de la Reforma 505",
  "colonia": "Cuauhtémoc",
  "ciudad": "México",
  "estado": "Ciudad de México",
  "cp": "06500",
  "createdAt": "2025-04-10T14:22:47.000Z",
  "updatedAt": "2025-04-10T14:22:47.000Z"
}
```

### 2. Company Member (Role within Company)

```typescript
type CompanyMemberRole = "LEGAL_REPRESENTATIVE" | "ADMIN" | "CONTACT";

interface CompanyMember {
  id: string;
  organizationId: string;
  userId: string;            // reference to LuxUser
  role: CompanyMemberRole;   // company-level role
  isPrimary: boolean;        // is primary representative
  createdAt: string;
  updatedAt: string;
}
```

**Example JSON:**

```json
{
  "id": "1712234567100-x1y2z3a4b5c6d7e8",
  "organizationId": "1712234567000-a1b2c3d4e5f6g7h8",
  "userId": "1712100000000-user001",
  "role": "LEGAL_REPRESENTATIVE",
  "isPrimary": true,
  "createdAt": "2025-04-10T14:23:10.000Z",
  "updatedAt": "2025-04-10T14:23:10.000Z"
}
```

### 3. Reservation Participant (Enhanced)

```typescript
interface CaseParticipant {
  // Identity — EITHER individual OR organization
  userId?: string;                // individual person
  organizationId?: string;        // company
  representativeUserId?: string;  // required if organizationId set

  // Participant context
  role: ParticipantRole;          // RESPONSABLE | AVAL | OPERADOR
  status: ParticipantStatus;
  progress: number;
  kycComplete: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  inviteToken: string;
  inviteSentAt: string;
}
```

**Validations:**

- If `organizationId` is set → `representativeUserId` is **required**
- Exactly one of `userId` or `organizationId` must be set
- `role` and company-member `role` are **independent** concepts

---

## Core Concepts

### Distinction: Company Roles vs. Reservation Roles

```
COMPANY ROLES (CompanyMember.role)
├── LEGAL_REPRESENTATIVE: Can sign contracts legally
├── ADMIN: Manages company & members
└── CONTACT: Primary point of contact

RESERVATION ROLES (CaseParticipant.role)
├── RESPONSABLE: Primary lessee, liable for vehicle
├── AVAL: Guarantor / co-signer
└── OPERADOR: Vehicle operator / driver (optional)
```

**Key Difference:**
- Company roles define **organizational hierarchy**
- Reservation roles define **contract obligations**
- **A person can be ADMIN in a company but OPERADOR in a rental**

---

## Usage Examples

### Example 1: Individual Rental

```json
{
  "caseId": "LUX-2025-0042",
  "participants": [
    {
      "userId": "user-juan-123",
      "role": "RESPONSABLE",
      "status": "INVITADO"
    },
    {
      "userId": "user-maria-456",
      "role": "AVAL",
      "status": "PENDIENTE"
    }
  ]
}
```

**Contract Preview:**
```
Responsable: Juan Pérez García
Aval: María López González
```

---

### Example 2: Corporate Rental (B2B)

```json
{
  "caseId": "LUX-2025-0043",
  "participants": [
    {
      "organizationId": "org-viajes-norte-001",
      "representativeUserId": "user-carlos-789",
      "role": "RESPONSABLE",
      "status": "INVITADO"
    },
    {
      "userId": "user-ana-abc",
      "role": "AVAL",
      "status": "PENDIENTE"
    }
  ]
}
```

**Contract Preview:**
```
Responsable: Viajes del Norte SA de CV
  Representante Legal: Carlos Mendoza
Aval: Ana González Ruiz
```

---

### Example 3: Mixed Corporate + Individual

```json
{
  "caseId": "LUX-2025-0044",
  "participants": [
    {
      "organizationId": "org-logistica-express",
      "representativeUserId": "user-director-x",
      "role": "RESPONSABLE",
      "status": "COMPLETADO"
    },
    {
      "organizationId": "org-viajes-norte-001",
      "representativeUserId": "user-carlos-789",
      "role": "AVAL",
      "status": "COMPLETADO"
    },
    {
      "userId": "user-driver-123",
      "role": "OPERADOR",
      "status": "COMPLETADO"
    }
  ]
}
```

---

## UI Module 1: Company Management (`/empresas`)

### Features

- **List View**: Table of all companies with member counts
- **Create/Edit**: Form to add company details (name, RFC, address)
- **Members Management**: Add users, assign roles, set primary representative

### File Structure

```
client/pages/Empresas.tsx
├── List View
│   └── Search, filter, create/edit/delete companies
├── Form View
│   └── Business details form
└── Members View
    └── Member list, add/remove, set primary
```

### Key Functions

```typescript
// Organization CRUD
getOrganizations(): Organization[]
saveOrganization(org: Organization): void
deleteOrganization(id: string): void
getOrganizationById(id: string): Organization | undefined

// Member CRUD
getCompanyMembers(): CompanyMember[]
getCompanyMembersBy(orgId: string): CompanyMember[]
saveCompanyMember(member: CompanyMember): void
deleteCompanyMember(id: string): void
setPrimaryRepresentative(orgId: string, memberId: string): void
```

---

## UI Module 2: Participant Selector (`ParticipantSelector.tsx`)

### Component Props

```typescript
interface ParticipantSelectorProps {
  participants: CaseParticipant[];
  onAddParticipant: (participant: CaseParticipant) => void;
  onRemoveParticipant: (userId?: string, orgId?: string) => void;
}
```

### Usage in Reservaciones

```typescript
import { ParticipantSelector } from "@/components/reservaciones/ParticipantSelector";

export default function StepReservacion() {
  const [case, setCase] = useState<RentalCase>(...);

  return (
    <ParticipantSelector
      participants={case.participants}
      onAddParticipant={(p) => {
        const updated = {
          ...case,
          participants: [...case.participants, p],
        };
        setCase(updated);
        saveCase(updated);
      }}
      onRemoveParticipant={(userId, orgId) => {
        const updated = {
          ...case,
          participants: case.participants.filter(
            (p) => p.userId !== userId && p.organizationId !== orgId
          ),
        };
        setCase(updated);
        saveCase(updated);
      }}
    />
  );
}
```

### Workflow

1. User clicks "Agregar Participante"
2. Selects person OR company
3. If company → selects representative from company members
4. Selects role (RESPONSABLE, AVAL, OPERADOR)
5. Participant is added to reservation
6. Shows in list with remove button

---

## Integration Points

### 1. With KYC Flow

When a company participant is invited:

```
1. Send KYC link to representative
2. Representative completes KYC (selfie, documents)
3. Associate KYC data with representative user
4. Mark organization participant as KYC_COMPLETE when representative KYC done
```

### 2. With Contract Generation

Preview before signing:

```
Contrato de Arrendamiento

RESPONSABLE:
  Viajes del Norte SA de CV
  Representante Legal: Carlos Mendoza López
  RFC: VDN201203ABC123
  Domicilio: Av. Paseo de la Reforma 505, Cuauhtémoc,
           Ciudad de México, CP 06500

AVAL:
  Ana González Ruiz
  RFC: AGRL950620ABC
  Domicilio: ...

OPERADOR:
  Luis García Pérez
```

### 3. With Risk Scoring

Factor in organizational history:

```typescript
function calcularRiesgoOrganization(org: Organization): RiskLevel {
  // Check past rental history
  const pastRentals = getCases().filter(
    (c) => c.participants.some((p) => p.organizationId === org.id)
  );
  
  const successRate = pastRentals.filter(c => c.status === "CERRADO").length / pastRentals.length;
  
  return successRate > 0.9 ? "APPROVED" : successRate > 0.7 ? "REVIEW" : "REJECTED";
}
```

---

## Data Flow: Adding a Corporate Participant

```
User clicks "Agregar Participante"
          ↓
ParticipantSelector opens
          ↓
Select type: "Empresa"
          ↓
Search and select: "Viajes del Norte SA de CV"
          ↓
Select from company members → "Carlos Mendoza" (LEGAL_REPRESENTATIVE)
          ↓
Select role for rental → "RESPONSABLE"
          ↓
Create CaseParticipant:
  {
    organizationId: "org-viajes-norte-001",
    representativeUserId: "user-carlos-789",
    role: "RESPONSABLE",
    status: "PENDIENTE",
    ...
  }
          ↓
onAddParticipant(participant)
          ↓
Reservation is updated with new participant
          ↓
saveCase(updated)
```

---

## Validation Rules

### At Participant Addition

```typescript
// Only one RESPONSABLE allowed per reservation
if (role === "RESPONSABLE" && caseHasResponsable) {
  throw new Error("Ya existe un Responsable en esta reservación");
}

// Company participant requires representative
if (organizationId && !representativeUserId) {
  throw new Error("Se requiere un representante legal para participantes empresariales");
}

// Representative must be member of company
const isMember = getCompanyMembersBy(organizationId).some(
  (m) => m.userId === representativeUserId
);
if (!isMember) {
  throw new Error("El representante debe ser miembro de la empresa");
}
```

---

## localStorage Keys

```typescript
const ORGS_KEY = "luxora_organizations_v2";
const MEMBERS_KEY = "luxora_company_members_v2";

// In CaseParticipant (part of CASES_KEY = "luxora_cases_v2")
```

---

## Next Steps / Extensions

### Phase 2

- [ ] **Organization KYC**: Upload RFC certifications, legal docs
- [ ] **Invoice Generation**: Auto-bill organizations
- [ ] **Multi-branch Support**: Organizations with multiple locations
- [ ] **Payment Terms**: Net-30, Net-60 for corporate accounts

### Phase 3

- [ ] **API Integration**: Sync with real business registry
- [ ] **Signer Authority**: Track who can legally sign per organization
- [ ] **Organization Users**: Self-serve portal for company admins
- [ ] **Audit Logs**: Track all organization actions

---

## Testing Checklist

- [ ] Create organization with valid RFC
- [ ] Add multiple members with different roles
- [ ] Set primary representative
- [ ] Create rental with organization as RESPONSABLE
- [ ] Select different representative for same company
- [ ] Generate contract preview showing company + representative
- [ ] Send KYC link to representative
- [ ] Verify representative KYC data attached to org participant
- [ ] Prevent duplicate RESPONSABLE roles
- [ ] Validate representative is company member

---

## File Reference

| File | Purpose |
|------|---------|
| `client/lib/store.ts` | Organization & Member CRUD functions |
| `client/pages/Empresas.tsx` | Company management UI |
| `client/components/reservaciones/ParticipantSelector.tsx` | Participant selection component |
| `client/pages/Reservaciones.tsx` | Updated to use ParticipantSelector |
| `docs/ORGANIZATIONS_GUIDE.md` | This document |

---

## Summary

The Organizations module provides a **production-ready B2B rental system** supporting:

✅ Individual rentals (B2C)
✅ Corporate account management
✅ Legal representative tracking
✅ Flexible participant composition
✅ Contract clarity
✅ Risk scoring integration
✅ Scalable for future integrations
