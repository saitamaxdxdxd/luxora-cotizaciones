/**
 * Vehicle Lifecycle Utilities — funciones puras de cálculo.
 *
 * Recibe los registros precargados (insurances/verifications/maintenances/taxes/alerts)
 * y devuelve el estado de salud del vehículo. No toca storage directamente.
 */

import type {
  Vehicle,
  VehicleInsurance,
  VehicleVerification,
  VehicleMaintenance,
  VehicleTax,
} from "@/lib/stores/vehicles";
import { type Alert, checkVehicleAlerts } from "./store";

/**
 * VehicleHealthStatus
 * Quick health check for a vehicle based on its related records.
 */
export interface VehicleHealthStatus {
  overall: "healthy" | "warning" | "critical";
  insuranceStatus: "ok" | "warning" | "expired";
  verificationStatus: "ok" | "warning" | "expired";
  maintenanceStatus: "ok" | "due";
  taxStatus: "ok" | "warning" | "overdue";
  alertCount: number;
  criticalAlertCount: number;
}

/**
 * getVehicleHealth()
 * Returns current health status of a vehicle based on all related records.
 */
export interface VehicleLifecycleDeps {
  insurances: VehicleInsurance[];
  verifications: VehicleVerification[];
  maintenances: VehicleMaintenance[];
  taxes: VehicleTax[];
  alerts: Alert[];
}

export function getVehicleHealth(vehicle: Vehicle, deps: VehicleLifecycleDeps): VehicleHealthStatus {
  const today = new Date();
  let overall: "healthy" | "warning" | "critical" = "healthy";

  // Insurance check
  const insurances = deps.insurances;
  let insuranceStatus: "ok" | "warning" | "expired" = "ok";
  if (insurances.length === 0) {
    insuranceStatus = "expired";
    overall = "critical";
  } else {
    const activeIns = insurances.find((i) => {
      const exp = new Date(i.expirationDate);
      return exp > today;
    });
    if (!activeIns) {
      insuranceStatus = "expired";
      overall = "critical";
    } else {
      const daysUntilExp = Math.floor((new Date(activeIns.expirationDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExp <= 30) {
        insuranceStatus = "warning";
        if (overall === "healthy") overall = "warning";
      }
    }
  }

  // Verification check
  const verifications = deps.verifications;
  let verificationStatus: "ok" | "warning" | "expired" = "ok";
  if (verifications.length === 0) {
    verificationStatus = "warning";
    if (overall === "healthy") overall = "warning";
  } else {
    const latestVer = verifications.sort((a, b) => new Date(b.verificationDate).getTime() - new Date(a.verificationDate).getTime())[0];
    const exp = new Date(latestVer.expirationDate);
    if (exp <= today) {
      verificationStatus = "expired";
      overall = "critical";
    } else {
      const daysUntilExp = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExp <= 30) {
        verificationStatus = "warning";
        if (overall === "healthy") overall = "warning";
      }
    }
  }

  // Maintenance check
  const maintenances = deps.maintenances;
  let maintenanceStatus: "ok" | "due" = "ok";
  if (maintenances.length > 0) {
    const lastMaint = maintenances.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];
    if (vehicle.kilometraje >= lastMaint.nextServiceMileage) {
      maintenanceStatus = "due";
      if (overall === "healthy") overall = "warning";
    }
  }

  // Tax check
  const taxes = deps.taxes;
  let taxStatus: "ok" | "warning" | "overdue" = "ok";
  const unpaidTaxes = taxes.filter((t) => !t.paid && new Date(t.dueDate) < today);
  if (unpaidTaxes.length > 0) {
    taxStatus = "overdue";
    overall = "critical";
  } else {
    const warningTaxes = taxes.filter((t) => !t.paid && new Date(t.dueDate) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));
    if (warningTaxes.length > 0) {
      taxStatus = "warning";
      if (overall === "healthy") overall = "warning";
    }
  }

  // Alert check
  const alerts = deps.alerts;
  const criticalAlerts = alerts.filter((a) => a.severity === "high");

  if (criticalAlerts.length > 0 && overall === "healthy") {
    overall = "critical";
  }

  return {
    overall,
    insuranceStatus,
    verificationStatus,
    maintenanceStatus,
    taxStatus,
    alertCount: alerts.length,
    criticalAlertCount: criticalAlerts.length,
  };
}

/**
 * isVehicleOperational()
 * Check if vehicle can be safely rented based on required records.
 * Returns false if insurance, verification, or critical taxes are missing/expired.
 */
export function isVehicleOperational(vehicle: Vehicle, deps: VehicleLifecycleDeps): boolean {
  const health = getVehicleHealth(vehicle, deps);

  // Must have valid insurance
  if (health.insuranceStatus === "expired") return false;

  // Must have valid verification
  if (health.verificationStatus === "expired") return false;

  // Must not have overdue taxes
  if (health.taxStatus === "overdue") return false;

  return true;
}

/**
 * getDaysUntilExpiration(dateStr)
 * Helper to calculate days remaining until a date.
 */
export function getDaysUntilExpiration(dateStr: string): number {
  const expDate = new Date(dateStr);
  const today = new Date();
  return Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * formatDateDifference(days)
 * Convert days remaining into human-readable format.
 */
export function formatDateDifference(days: number): string {
  if (days < 0) return "Expirado";
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days <= 7) return `${days} días`;
  if (days <= 30) return `${Math.ceil(days / 7)} semanas`;
  return `${Math.ceil(days / 30)} meses`;
}

/**
 * regenerateVehicleAlerts()
 * Force regeneration of all alerts for a specific vehicle.
 * Useful for manual refresh.
 */
export function regenerateVehicleAlerts(vehicleId: string): void {
  // Note: This is called as part of checkVehicleAlerts() which scans all vehicles
  // To refresh a single vehicle, just call checkVehicleAlerts() (it's optimized)
  checkVehicleAlerts();
}
