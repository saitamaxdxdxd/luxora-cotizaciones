/**
 * LUXORA Cotizador - Lógica de Cálculo de Costos
 *
 * Las distancias y peajes se reciben ya calculados (ida + regreso) desde Index.tsx.
 * calculateQuote no duplica nada internamente.
 */

import {
  type Vehicle,
  type FuelPrices,
  type OperatorData,
  TOLL_RATE_MXN_PER_KM,
  roundUpTo100,
  roundUpTo200,
  roundUpTo500,
} from "@/data/config";
import type { RouteLeg } from "./routesApi";

// ─── Tipos de Cotización ────────────────────────────────────────────────────

export interface QuoteInput {
  departureDateTime: Date;
  returnDateTime: Date;
  vehicle: Vehicle | any;  // Accepts both config Vehicle and store Vehicle

  /** Distancia total de IDA (suma de todos los tramos) en km */
  distanceOutboundKm: number;
  /** Distancia de REGRESO (último punto → origen) en km */
  distanceReturnKm: number;

  /**
   * Costo real de casetas TOTAL (ida + regreso) en MXN de Google Routes API.
   * Si es undefined → se usa estimación con tollKmTotal.
   */
  tollDirectCostMXN?: number;
  /**
   * Km de casetas estimados totales (ida + regreso).
   * Solo se usa si tollDirectCostMXN es undefined.
   */
  tollKmTotal: number;

  /** Fuente del dato de casetas */
  tollSource: "google" | "estimation";

  /** Tramos de la ruta de ida (para mostrar en resultados) */
  outboundLegs: RouteLeg[];
  /** Tramo de regreso */
  returnLeg: RouteLeg;

  includeOperator: boolean;
  fuelPrices: FuelPrices;
  operatorData: OperatorData | any;  // Accepts both config OperatorData and quotationEngine OperatorCosts
}

export interface OperatorBreakdown {
  salary: number;
  meals: number;
  hotel: number;
  total: number;
}

export interface QuoteResult {
  // ─ Ruta
  distanceOutboundKm: number;
  distanceReturnKm: number;
  distanceTotalKm: number;
  outboundLegs: RouteLeg[];
  returnLeg: RouteLeg;

  // ─ Tiempo
  rentalDays: number;

  // ─ Combustible
  liters: number;
  fuelCostRaw: number;
  fuelCostRounded: number;

  // ─ Casetas
  tollCostRaw: number;
  tollCostRounded: number;
  tollSource: "google" | "estimation";

  // ─ Renta
  rentalCost: number;

  // ─ Operador
  includeOperator: boolean;
  operatorBreakdown: OperatorBreakdown;

  // ─ Totales
  subtotal: number;
  finalTotal: number;

  // ─ Meta
  vehicleName: string;
  fuelType: string;
  fuelEfficiency: number;
}

// ─── Función Principal ───────────────────────────────────────────────────────

export function calculateQuote(input: QuoteInput): QuoteResult {
  const {
    departureDateTime,
    returnDateTime,
    vehicle,
    distanceOutboundKm,
    distanceReturnKm,
    tollDirectCostMXN,
    tollKmTotal,
    tollSource,
    outboundLegs,
    returnLeg,
    includeOperator,
    fuelPrices,
    operatorData,
  } = input;

  // ─── Días (calendario) ────────────────────────────────────────────────────
  const depDate = new Date(departureDateTime.getFullYear(), departureDateTime.getMonth(), departureDateTime.getDate());
  const retDate = new Date(returnDateTime.getFullYear(), returnDateTime.getMonth(), returnDateTime.getDate());
  const diffDays = Math.round((retDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
  const rentalDays = Math.max(1, diffDays + 1);

  // ─── Distancia total (ida + regreso, ya calculados por separado) ──────────
  const distanceTotalKm = distanceOutboundKm + distanceReturnKm;

  // ─── Combustible ──────────────────────────────────────────────────────────
  // Note: Support both old (fuelEfficiency) and new (fuelEfficiencyKmPerLiter) property names
  const efficiency = (vehicle as any).fuelEfficiencyKmPerLiter ?? (vehicle as any).fuelEfficiency ?? 10;
  const liters = distanceTotalKm / efficiency;
  const fuelCostRaw = liters * fuelPrices[vehicle.fuelType];
  const fuelCostRounded = roundUpTo500(fuelCostRaw);

  // ─── Casetas (ya incluyen ida + regreso, no duplicar aquí) ───────────────
  const tollCostRaw =
    tollDirectCostMXN != null
      ? tollDirectCostMXN
      : tollKmTotal * TOLL_RATE_MXN_PER_KM;
  const tollCostRounded = roundUpTo200(tollCostRaw);

  // ─── Renta ────────────────────────────────────────────────────────────────
  // Note: Support both old (rentalCostPerDay) and new (rentaDia) property names
  const dailyRate = (vehicle as any).rentaDia ?? (vehicle as any).rentalCostPerDay ?? 0;
  const rentalCost = dailyRate * rentalDays;

  // ─── Operador ─────────────────────────────────────────────────────────────
  // Note: Support both old (dailySalary) and new (salaryPerDay) property names
  const dailySalary = (operatorData as any).salaryPerDay ?? (operatorData as any).dailySalary ?? 0;
  const mealsPerDay = (operatorData as any).foodPerDay ?? (operatorData as any).mealsPerDay ?? 0;
  const hotelPerNight = (operatorData as any).lodgingPerNight ?? (operatorData as any).hotelCostPerNight ?? 0;

  const salary = dailySalary * rentalDays;
  const meals = mealsPerDay * rentalDays;
  const hotel = rentalDays > 1 ? hotelPerNight * (rentalDays - 1) : 0;
  const operatorBreakdown: OperatorBreakdown = { salary, meals, hotel, total: salary + meals + hotel };

  // ─── Total ────────────────────────────────────────────────────────────────
  const subtotal = includeOperator
    ? fuelCostRounded + tollCostRounded + rentalCost + operatorBreakdown.total
    : rentalCost;
  const finalTotal = roundUpTo100(subtotal);

  // Note: Support both old (name) and new (marca/modelo) property names
  const vehicleName = (vehicle as any).name ?? `${(vehicle as any).marca ?? ''} ${(vehicle as any).modelo ?? ''}`.trim();

  return {
    distanceOutboundKm,
    distanceReturnKm,
    distanceTotalKm,
    outboundLegs,
    returnLeg,
    rentalDays,
    liters,
    fuelCostRaw,
    fuelCostRounded,
    tollCostRaw,
    tollCostRounded,
    tollSource,
    rentalCost,
    includeOperator,
    operatorBreakdown,
    subtotal,
    finalTotal,
    vehicleName,
    fuelType: vehicle.fuelType,
    fuelEfficiency: efficiency,
  };
}

/** Preview de días de renta desde strings datetime-local */
export function calcRentalDays(dep: string, ret: string): number {
  if (!dep || !ret) return 0;
  const d = new Date(dep), r = new Date(ret);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const rDate = new Date(r.getFullYear(), r.getMonth(), r.getDate());
  const diff = Math.round((rDate.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? Math.max(1, diff + 1) : 0;
}
