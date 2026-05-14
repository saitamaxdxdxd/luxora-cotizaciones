# LUXORA localStorage Payloads

Reference examples of how data is structured in localStorage for the new vehicle lifecycle entities.

---

## Vehicle Insurance

**Key:** `luxora_vehicle_insurances_v2`

```json
[
  {
    "id": "1712916245000-a1b2c3d",
    "vehicleId": "1712900000000-x9y8z7w",
    "insuranceCompany": "AXA México",
    "policyPdf": "data:application/pdf;base64,JVBERi0x...",
    "phone": "5551234567",
    "annualCost": 18500,
    "startDate": "2024-01-15",
    "expirationDate": "2025-01-15",
    "notes": "Cobertura completa, deducible $5000",
    "createdAt": "2024-04-01T14:30:45.000Z",
    "updatedAt": "2024-04-01T14:30:45.000Z"
  },
  {
    "id": "1712916350000-b2c3d4e",
    "vehicleId": "1712900000000-x9y8z7w",
    "insuranceCompany": "Seguros XYZ",
    "policyPdf": "data:application/pdf;base64,JVBERi0x...",
    "phone": "5559876543",
    "annualCost": 16200,
    "startDate": "2023-06-01",
    "expirationDate": "2024-06-01",
    "notes": "Política anterior - expirada",
    "createdAt": "2023-06-01T10:00:00.000Z",
    "updatedAt": "2023-06-01T10:00:00.000Z"
  }
]
```

---

## Vehicle Verification

**Key:** `luxora_vehicle_verifications_v2`

```json
[
  {
    "id": "1712920000000-c3d4e5f",
    "vehicleId": "1712900000000-x9y8z7w",
    "verificationDate": "2024-03-15",
    "monthsValid": 12,
    "holomgramColor": "Verde",
    "hologramType": "2024",
    "expirationDate": "2025-03-15",
    "notes": "Verificación centralizada, emitido en CDMX",
    "createdAt": "2024-03-15T09:15:00.000Z",
    "updatedAt": "2024-03-15T09:15:00.000Z"
  }
]
```

---

## Vehicle Maintenance

**Key:** `luxora_vehicle_maintenance_v2`

```json
[
  {
    "id": "1712921000000-d4e5f6g",
    "vehicleId": "1712900000000-x9y8z7w",
    "type": "oil_change",
    "mileage": 85000,
    "serviceDate": "2024-03-20",
    "nextServiceMileage": 90000,
    "nextServiceDate": "2024-05-15",
    "cost": 850,
    "notes": "Aceite sintético Mobil 1, filtro K&N",
    "createdAt": "2024-03-20T10:30:00.000Z",
    "updatedAt": "2024-03-20T10:30:00.000Z"
  },
  {
    "id": "1712921100000-e5f6g7h",
    "vehicleId": "1712900000000-x9y8z7w",
    "type": "inspection",
    "mileage": 82500,
    "serviceDate": "2024-02-10",
    "nextServiceMileage": 85000,
    "nextServiceDate": "2024-04-10",
    "cost": 500,
    "notes": "Inspección general, frenos OK, llantas 80% desgaste",
    "createdAt": "2024-02-10T14:00:00.000Z",
    "updatedAt": "2024-02-10T14:00:00.000Z"
  },
  {
    "id": "1712921200000-f6g7h8i",
    "vehicleId": "1712900000000-x9y8z7w",
    "type": "brakes",
    "mileage": 78000,
    "serviceDate": "2023-12-05",
    "nextServiceMileage": 95000,
    "nextServiceDate": "2025-01-05",
    "cost": 3200,
    "notes": "Pastillas y discos delanteros, revisión sistema ABS",
    "createdAt": "2023-12-05T11:45:00.000Z",
    "updatedAt": "2023-12-05T11:45:00.000Z"
  }
]
```

---

## Vehicle Taxes

**Key:** `luxora_vehicle_taxes_v2`

```json
[
  {
    "id": "1712922000000-g7h8i9j",
    "vehicleId": "1712900000000-x9y8z7w",
    "type": "tenencia",
    "year": 2024,
    "amount": 4200,
    "dueDate": "2024-06-30",
    "paid": true,
    "notes": "Pagado por transferencia bancaria 2024-06-25",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-06-25T16:30:00.000Z"
  },
  {
    "id": "1712922100000-h8i9j0k",
    "vehicleId": "1712900000000-x9y8z7w",
    "type": "tenencia",
    "year": 2025,
    "amount": 4500,
    "dueDate": "2025-06-30",
    "paid": false,
    "notes": "Pendiente de pago",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": "1712922200000-i9j0k1l",
    "vehicleId": "1712900000000-x9y8z7w",
    "type": "refrendo",
    "year": 2024,
    "amount": 1850,
    "dueDate": "2024-04-30",
    "paid": true,
    "notes": "Refrendo vehicular 2024, sin infracciones",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-04-28T09:00:00.000Z"
  }
]
```

---

## Alerts

**Key:** `luxora_alerts_v2`

```json
[
  {
    "id": "1712923000000-j0k1l2m",
    "entityType": "vehicle",
    "entityId": "1712900000000-x9y8z7w",
    "alertType": "insurance_expiring",
    "title": "Seguro AXA vence pronto",
    "description": "Póliza vence el 2025-01-15. Renueva antes de perder cobertura.",
    "dueDate": "2025-01-15",
    "severity": "medium",
    "resolved": false,
    "createdAt": "2025-01-10T08:00:00.000Z",
    "updatedAt": "2025-01-10T08:00:00.000Z"
  },
  {
    "id": "1712923100000-k1l2m3n",
    "entityType": "vehicle",
    "entityId": "1712900000000-x9y8z7w",
    "alertType": "maintenance_due",
    "title": "Mantenimiento próximo",
    "description": "Vehículo ha alcanzado 87500 km. Próximo mantenimiento en 90000 km (cambio de aceite).",
    "dueDate": "2024-05-15",
    "severity": "medium",
    "resolved": false,
    "createdAt": "2024-04-25T14:20:00.000Z",
    "updatedAt": "2024-04-25T14:20:00.000Z"
  },
  {
    "id": "1712923200000-l2m3n4o",
    "entityType": "vehicle",
    "entityId": "1712900000000-x9y8z7w",
    "alertType": "verification_expired",
    "title": "Verificación vehicular VENCIDA",
    "description": "Expiró el 2024-03-10. No puede circular.",
    "dueDate": "2024-03-10",
    "severity": "high",
    "resolved": false,
    "createdAt": "2024-03-11T10:00:00.000Z",
    "updatedAt": "2024-03-11T10:00:00.000Z"
  },
  {
    "id": "1712923300000-m3n4o5p",
    "entityType": "vehicle",
    "entityId": "1712900000000-x9y8z7w",
    "alertType": "tax_due",
    "title": "Tenencia 2025 por vencer",
    "description": "Vence el 2025-06-30. Monto: $4,500 MXN",
    "dueDate": "2025-06-30",
    "severity": "low",
    "resolved": false,
    "createdAt": "2025-06-01T08:00:00.000Z",
    "updatedAt": "2025-06-01T08:00:00.000Z"
  },
  {
    "id": "1712923400000-n4o5p6q",
    "entityType": "vehicle",
    "entityId": "1712900000000-x9y8z7w",
    "alertType": "insurance_expiring",
    "title": "Seguro AXA EXPIRADO",
    "description": "Póliza expiró el 2025-01-16. Acción inmediata requerida.",
    "dueDate": "2025-01-16",
    "severity": "high",
    "resolved": true,
    "createdAt": "2025-01-16T08:00:00.000Z",
    "updatedAt": "2025-02-01T16:45:00.000Z"
  }
]
```

---

## Operator Profile (Refactored)

**Key:** `luxora_operator_profiles_v2`

Note: This stores **only** operator-specific pay rates. Personal data comes from the linked `LuxUser`.

```json
[
  {
    "id": "1712924000000-o5p6q7r",
    "userId": "1712800000000-user-abc123",
    "salaryPerDay": 850,
    "foodPerDay": 300,
    "lodgingPerNight": 500,
    "notes": "Especializado en rutas ejecutivas CDMX-Monterrey",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-03-10T14:30:00.000Z"
  },
  {
    "id": "1712924100000-p6q7r8s",
    "userId": "1712800000000-user-def456",
    "salaryPerDay": 800,
    "foodPerDay": 280,
    "lodgingPerNight": 450,
    "notes": "Conductor VIP, inglés básico, experiencia 15 años",
    "createdAt": "2024-02-01T09:00:00.000Z",
    "updatedAt": "2024-02-01T09:00:00.000Z"
  }
]
```

The linked LuxUser looks like:

```json
{
  "id": "1712800000000-user-abc123",
  "curp": "ABCD781225HDFRML09",
  "rfc": "ABCD781225XXX",
  "nombre": "Carlos",
  "apellidoPaterno": "Rodríguez",
  "apellidoMaterno": "García",
  "email": "carlos.rodriguez@email.com",
  "emailVerified": true,
  "telefono": "5551234567",
  "fechaNacimiento": "1978-12-25",
  "actividadEconomica": "Transportista",
  "documents": [
    {
      "id": "1712800001000-doc-1",
      "type": "INE_FRONT",
      "label": "INE Frente",
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      "verified": true,
      "uploadedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "selfie": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "faceMatchScore": 0.95,
  "livenessOk": true,
  "address": {
    "calle": "Av. Paseo",
    "numero": "123",
    "colonia": "Centro",
    "ciudad": "CDMX",
    "estado": "Ciudad de México",
    "cp": "06600",
    "isPrimary": true,
    "verified": true
  },
  "kycStep": 5,
  "kycComplete": true,
  "riskScore": 78,
  "riskLevel": "APPROVED",
  "riskFactors": [],
  "acceptedTermsAt": "2024-01-15T10:00:00.000Z",
  "totalRentals": 42,
  "incidents": 0,
  "avgScore": 4.8,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-04-01T16:30:00.000Z"
}
```

---

## Complete Vehicle with All Relations

This is what you'd get from a "hydrated" query:

```typescript
interface VehicleHydrated extends Vehicle {
  insurances: VehicleInsurance[];
  verifications: VehicleVerification[];
  maintenances: VehicleMaintenance[];
  taxes: VehicleTax[];
  alerts: Alert[];
  health: VehicleHealthStatus;
}

// Example:
{
  // Vehicle base
  "id": "1712900000000-x9y8z7w",
  "marca": "Hyundai",
  "modelo": "Tucson",
  "anio": 2018,
  "placas": "PQR-012-G",
  "vin": "KM8J3CA22JU123456",
  "color": "Gris Oscuro",
  "kilometraje": 87500,
  "rentaDia": 1800,
  "status": "DISPONIBLE",
  "foto": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "notas": "SUV ejecutivo",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-04-01T14:30:00.000Z",

  // Relations
  "insurances": [ /* ... */ ],
  "verifications": [ /* ... */ ],
  "maintenances": [ /* ... */ ],
  "taxes": [ /* ... */ ],
  "alerts": [ /* ... */ ],

  // Computed health
  "health": {
    "overall": "warning",
    "insuranceStatus": "ok",
    "verificationStatus": "ok",
    "maintenanceStatus": "due",
    "taxStatus": "ok",
    "alertCount": 1,
    "criticalAlertCount": 0
  }
}
```

---

## Query Examples

### Get all vehicles with expired insurance

```typescript
const vehiclesWithExpiredIns = getVehicles().filter((v) => {
  const insurances = getVehicleInsurancesBy(v.id);
  return insurances.every((i) => new Date(i.expirationDate) < new Date());
});
```

### Get maintenance cost for a vehicle in 2024

```typescript
const maintenances = getVehicleMaintenancesBy(vehicleId);
const cost2024 = maintenances
  .filter((m) => m.serviceDate.startsWith("2024"))
  .reduce((sum, m) => sum + m.cost, 0);
```

### Get all critical alerts across all entities

```typescript
const criticalAlerts = getAlerts()
  .filter((a) => a.severity === "high" && !a.resolved)
  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
```

### Check if a vehicle can be safely rented

```typescript
if (!isVehicleOperational(vehicle)) {
  console.log("Cannot rent this vehicle:");
  const health = getVehicleHealth(vehicle);
  if (health.insuranceStatus === "expired") console.log("- Insurance expired");
  if (health.verificationStatus === "expired") console.log("- Verification expired");
  if (health.taxStatus === "overdue") console.log("- Taxes overdue");
}
```

---

## Storage Size Estimates

| Entity | Count | Avg Size | Total |
|--------|-------|----------|-------|
| Vehicle | 50 | 2 KB | 100 KB |
| Insurance | 200 | 1.5 KB | 300 KB |
| Verification | 50 | 1 KB | 50 KB |
| Maintenance | 500 | 1 KB | 500 KB |
| Taxes | 300 | 1 KB | 300 KB |
| Alerts | 100 | 1.5 KB | 150 KB |
| **TOTAL** | **1,200** | | **1.4 MB** |

With images and documents, the 5 MB localStorage limit is sufficient for:
- 50-100 vehicles
- 3-5 years of maintenance/tax history
- Active alerts

For larger fleets, implement:
- Archive old maintenance records to backend
- Compress/remove old alert records
- Use document cloud storage (S3, GCS) for PDFs

---

## Backward Compatibility

The legacy `Operator` entity (flat structure with personal data) can coexist with the new `OperatorProfile` during migration. Both are stored in localStorage:

- `luxora_operators_v2` (legacy, deprecated)
- `luxora_operator_profiles_v2` (new, normalized)

Frontend can check both:

```typescript
function getOperatorData(operatorId: string) {
  // Try new profile first (normalized)
  const profile = getOperatorProfiles().find((p) => p.id === operatorId);
  if (profile) {
    const user = getUserById(profile.userId);
    return { profile, user };
  }

  // Fall back to legacy operator (full data)
  const legacyOp = getOperators().find((o) => o.id === operatorId);
  if (legacyOp) {
    return { legacy: legacyOp };
  }
}
```

This allows gradual migration without breaking existing functionality.
