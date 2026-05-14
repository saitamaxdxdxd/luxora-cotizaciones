/**
 * LUXORA Quotation Engine v2
 * 
 * Single source of truth for quotation calculations:
 * - Vehicle fuel type, efficiency, and pricing come from Vehicle entity in store
 * - No separate config files needed
 * - Centralized fuel price management
 */

import type { Vehicle, FuelType } from "@/lib/stores/vehicles";
import type { FuelPrices } from "@/data/config";

// ─── Fuel Prices (MXN per liter) ───────────────────────────────────────────
// These can be updated from an admin panel or API
export const getFuelPrices = (): FuelPrices => {
  const cached = localStorage.getItem("luxora_fuel_prices_v1");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Fall back to defaults
    }
  }
  return {
    magna: 24.00,
    premium: 28.00,
    diesel: 29.00,
  };
};

export const setFuelPrices = (prices: FuelPrices): void => {
  localStorage.setItem("luxora_fuel_prices_v1", JSON.stringify(prices));
};

// ─── Operator Data (from LuxUser or OperatorProfile) ────────────────────────
export interface OperatorCosts {
  salaryPerDay: number;
  foodPerDay: number;
  lodgingPerNight: number;
}

export const getDefaultOperatorCosts = (): OperatorCosts => {
  const cached = localStorage.getItem("luxora_operator_costs_v1");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Fall back to defaults
    }
  }
  return {
    salaryPerDay: 800,
    foodPerDay: 300,
    lodgingPerNight: 900,
  };
};

export const setDefaultOperatorCosts = (costs: OperatorCosts): void => {
  localStorage.setItem("luxora_operator_costs_v1", JSON.stringify(costs));
};

// ─── Base Configuration ────────────────────────────────────────────────────
export const BASE_COORDS = {
  lat: 19.6489,
  lng: -99.0986,
};

export const BASE_DESCRIPTION = "Coacalco de Berriozábal, CP 55700";
export const BASE_RADIUS_KM = 50;

// ─── Toll Calculation ─────────────────────────────────────────────────────
export const TOLL_RATE_MXN_PER_KM = 2.5;

// ─── Rounding Helpers ─────────────────────────────────────────────────────

export const roundUpTo500 = (value: number): number =>
  Math.ceil(value / 500) * 500;

export const roundUpTo200 = (value: number): number =>
  Math.ceil(value / 200) * 200;

export const roundUpTo100 = (value: number): number =>
  Math.ceil(value / 100) * 100;

// ─── Quotation Calculation ────────────────────────────────────────────────

export interface QuoteInput {
  vehicle: Vehicle;
  departureDateTime: Date;
  returnDateTime: Date;
  distanceOutboundKm: number;
  distanceReturnKm: number;
  tollDirectCostMXN?: number;
  tollKmTotal: number;
  tollSource: "google" | "estimation";
  includeOperator: boolean;
}

export interface QuoteResult {
  // Vehicle info
  vehicleId: string;
  vehicleName: string;
  fuelType: FuelType;
  fuelEfficiency: number;
  rentalDayRate: number;
  passengerCapacity: number;
  
  // Route
  distanceOutboundKm: number;
  distanceReturnKm: number;
  distanceTotalKm: number;
  
  // Time
  rentalDays: number;
  
  // Fuel calculation
  litersNeeded: number;
  fuelPricePerLiter: number;
  fuelCostRaw: number;
  fuelCostRounded: number;
  
  // Tolls
  tollCostRaw: number;
  tollCostRounded: number;
  tollSource: "google" | "estimation";
  
  // Rental base cost
  rentalCostSubtotal: number;
  
  // Operator (if included)
  includeOperator: boolean;
  operatorSalary?: number;
  operatorFood?: number;
  operatorLodging?: number;
  operatorTotal?: number;
  
  // Final total
  subtotal: number;
  finalTotal: number;
}

/**
 * calculateQuote()
 * Calculates a complete quotation using vehicle data as the source of truth.
 * All pricing, fuel type, efficiency comes directly from the Vehicle entity.
 */
export function calculateQuote(input: QuoteInput): QuoteResult {
  const vehicle = input.vehicle;
  const fuelPrices = getFuelPrices();
  const fuelPrice = fuelPrices[vehicle.fuelType];

  // ─ Time calculation
  const departureTime = input.departureDateTime.getTime();
  const returnTime = input.returnDateTime.getTime();
  const durationMs = returnTime - departureTime;
  const durationDays = durationMs / (1000 * 60 * 60 * 24);
  const rentalDays = Math.ceil(durationDays);

  // ─ Fuel calculation (using vehicle's fuel efficiency)
  const totalDistance = input.distanceOutboundKm + input.distanceReturnKm;
  const litersNeeded = totalDistance / vehicle.fuelEfficiencyKmPerLiter;
  const fuelCostRaw = litersNeeded * fuelPrice;
  const fuelCostRounded = roundUpTo100(fuelCostRaw);

  // ─ Toll calculation
  const tollCostRaw =
    input.tollDirectCostMXN !== undefined
      ? input.tollDirectCostMXN
      : input.tollKmTotal * TOLL_RATE_MXN_PER_KM;
  const tollCostRounded = roundUpTo100(tollCostRaw);

  // ─ Rental base cost (using vehicle's daily rental rate)
  const rentalCostSubtotal = vehicle.rentaDia * rentalDays;

  // ─ Operator costs (optional)
  let operatorTotal = 0;
  let operatorSalary = 0;
  let operatorFood = 0;
  let operatorLodging = 0;

  if (input.includeOperator) {
    const operatorCosts = getDefaultOperatorCosts();
    operatorSalary = operatorCosts.salaryPerDay * rentalDays;
    operatorFood = operatorCosts.foodPerDay * rentalDays;
    operatorLodging = operatorCosts.lodgingPerNight * (rentalDays - 1); // nights are one less than days
    operatorTotal = operatorSalary + operatorFood + operatorLodging;
  }

  // ─ Total calculation
  const subtotal = rentalCostSubtotal + fuelCostRounded + tollCostRounded;
  const finalTotal = subtotal + operatorTotal;

  return {
    // Vehicle info
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.marca} ${vehicle.modelo}`,
    fuelType: vehicle.fuelType,
    fuelEfficiency: vehicle.fuelEfficiencyKmPerLiter,
    rentalDayRate: vehicle.rentaDia,
    passengerCapacity: vehicle.capacidadPasajeros,

    // Route
    distanceOutboundKm: input.distanceOutboundKm,
    distanceReturnKm: input.distanceReturnKm,
    distanceTotalKm: totalDistance,

    // Time
    rentalDays,

    // Fuel
    litersNeeded: Math.round(litersNeeded * 100) / 100, // 2 decimal places
    fuelPricePerLiter: fuelPrice,
    fuelCostRaw,
    fuelCostRounded,

    // Tolls
    tollCostRaw,
    tollCostRounded,
    tollSource: input.tollSource,

    // Rental
    rentalCostSubtotal,

    // Operator
    includeOperator: input.includeOperator,
    operatorSalary: input.includeOperator ? operatorSalary : undefined,
    operatorFood: input.includeOperator ? operatorFood : undefined,
    operatorLodging: input.includeOperator ? operatorLodging : undefined,
    operatorTotal: input.includeOperator ? operatorTotal : undefined,

    // Totals
    subtotal,
    finalTotal,
  };
}

/**
 * Estimate fuel cost without full quotation
 * Useful for quick quotes
 */
export function estimateFuelCost(
  vehicle: Vehicle,
  totalDistanceKm: number
): { liters: number; costRaw: number; costRounded: number } {
  const fuelPrices = getFuelPrices();
  const liters = totalDistanceKm / vehicle.fuelEfficiencyKmPerLiter;
  const costRaw = liters * fuelPrices[vehicle.fuelType];
  return {
    liters: Math.round(liters * 100) / 100,
    costRaw,
    costRounded: roundUpTo100(costRaw),
  };
}

/**
 * Get vehicle category description (for UI)
 */
export function getVehicleCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    suv: "SUV",
    van: "Van",
    sprinter: "Sprinter",
    executive: "Ejecutivo",
  };
  return labels[category] || category;
}

/**
 * Get ideal use description (for UI)
 */
export function getIdealUseLabel(useType: string): string {
  const labels: Record<string, string> = {
    airport: "Aeropuerto",
    executive: "Ejecutivo",
    tourism: "Turismo",
    long_distance: "Larga Distancia",
  };
  return labels[useType] || useType;
}

/**
 * Get fuel type label (for UI)
 */
export function getFuelTypeLabel(fuelType: string): string {
  const labels: Record<string, string> = {
    magna: "Magna",
    premium: "Premium",
    diesel: "Diesel",
  };
  return labels[fuelType] || fuelType;
}

/**
 * Filter vehicles by passenger count
 */
export function filterVehiclesByCapacity(
  vehicles: Vehicle[],
  minPassengers: number
): Vehicle[] {
  return vehicles.filter((v) => v.capacidadPasajeros >= minPassengers);
}

/**
 * Filter vehicles by fuel type
 */
export function filterVehiclesByFuelType(
  vehicles: Vehicle[],
  fuelType: FuelType
): Vehicle[] {
  return vehicles.filter((v) => v.fuelType === fuelType);
}

/**
 * Filter vehicles by category
 */
export function filterVehiclesByCategory(
  vehicles: Vehicle[],
  category: string
): Vehicle[] {
  return vehicles.filter((v) => v.vehicleCategory === category);
}

/**
 * Sort vehicles by rental price (ascending)
 */
export function sortVehiclesByPrice(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => a.rentaDia - b.rentaDia);
}

/**
 * Sort vehicles by fuel efficiency (descending = best efficiency first)
 */
export function sortVehiclesByEfficiency(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => b.fuelEfficiencyKmPerLiter - a.fuelEfficiencyKmPerLiter);
}

/**
 * Recommend vehicles based on criteria
 */
export function recommendVehicles(
  availableVehicles: Vehicle[],
  passengerCount: number,
  distanceKm: number
): Vehicle[] {
  // Filter by capacity
  let candidates = filterVehiclesByCapacity(availableVehicles, passengerCount);

  // If distance > 500km, prefer diesel (better efficiency on long distance)
  if (distanceKm > 500) {
    const dieselVehicles = filterVehiclesByFuelType(candidates, "diesel");
    if (dieselVehicles.length > 0) {
      candidates = dieselVehicles;
    }
  }

  // Sort by price (least expensive first) then efficiency (best first)
  return candidates
    .sort((a, b) => b.fuelEfficiencyKmPerLiter - a.fuelEfficiencyKmPerLiter)
    .sort((a, b) => a.rentaDia - b.rentaDia);
}
