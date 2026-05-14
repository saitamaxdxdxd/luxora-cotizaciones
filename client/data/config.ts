/**
 * LUXORA Cotizador - Configuración Local de Datos
 * Estos datos simulan archivos JSON de configuración del negocio.
 * En producción, podrían cargarse desde un CMS o API propia.
 */

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type FuelType = "magna" | "premium" | "diesel";

export interface Vehicle {
  id: string;
  name: string;
  /** Capacidad de pasajeros */
  seats: number;
  cylinders: number;
  fuelType: FuelType;
  /** Rendimiento en km/litro */
  fuelEfficiency: number;
  /** Costo de renta por día en MXN */
  rentalCostPerDay: number;
  /** ID del Google Calendar para verificar disponibilidad (opcional) */
  calendarId?: string;
  /** Descripción corta para la UI */
  description?: string;
}

export interface FuelPrices {
  magna: number;
  premium: number;
  diesel: number;
}

export interface OperatorData {
  /** Salario diario del chofer en MXN */
  dailySalary: number;
  /** Costo de comidas por día en MXN */
  mealsPerDay: number;
  /** Costo de hotel por noche en MXN */
  hotelCostPerNight: number;
}

// ─── Flota de Vehículos ─────────────────────────────────────────────────────

export const vehicles: Vehicle[] = [
  {
    id: "hiace2023",
    name: "Toyota Hiace 2023",
    seats: 15,
    cylinders: 6,
    fuelType: "premium",
    fuelEfficiency: 7,
    rentalCostPerDay: 2_400,
    description: "VAN ejecutiva, 15 pasajeros",
    // calendarId: "tu_calendar_id_suburban@group.calendar.google.com",
  },
  {
    id: "hiace2025",
    name: "Toyota Hiace 2025",
    seats: 15,
    cylinders: 6,
    fuelType: "premium",
    fuelEfficiency: 7,
    rentalCostPerDay: 2_700,
    description: "VAN ejecutiva de lujo, 15 pasajeros",
    // calendarId: "tu_calendar_id_suburban@group.calendar.google.com",
  },
  {
    id: "transit2024",
    name: "Ford Transit 2024",
    seats: 15,
    cylinders: 4,
    fuelType: "diesel",
    fuelEfficiency: 9,
    rentalCostPerDay: 2_800,
    description: "VAN ejecutiva de lujo, 15 pasajeros",
    // calendarId: "tu_calendar_id_suburban@group.calendar.google.com",
  },
  {
    id: "tucson2018",
    name: "Hyundai Tucson 2018",
    seats: 5,
    cylinders: 4,
    fuelType: "magna",
    fuelEfficiency: 12,
    rentalCostPerDay: 1_800,
    description: "SUV familiar, 5 pasajeros",
    // calendarId: "tu_calendar_id_suburban@group.calendar.google.com",
  },
];

// ─── Precios de Combustible (MXN/litro) ─────────────────────────────────────

export const fuelPrices: FuelPrices = {
  magna: 24.00,
  premium: 28.00,
  diesel: 29.00,
};

// ─── Datos del Operador VIP ──────────────────────────────────────────────────

export const operatorData: OperatorData = {
  dailySalary: 800,
  mealsPerDay: 300,
  hotelCostPerNight: 900,
};

// ─── Configuración de Base Central ──────────────────────────────────────────

/**
 * Coordenadas de la base central de operaciones.
 * Coacalco de Berriozábal, Estado de México, CP 55700.
 * El radio de 50 km cubre toda el Área Metropolitana del Valle de México.
 */
export const BASE_COORDS = {
  lat: 19.6489,
  lng: -99.0986,
};

/** Radio máximo en km desde la base para el Autocomplete de Origen */
export const BASE_RADIUS_KM = 50;

/**
 * Descripción textual de la base para mostrar en la UI.
 * Cambia esto a la dirección real de tu empresa.
 */
export const BASE_DESCRIPTION = "Coacalco de Berriozábal, CP 55700";

// ─── Configuración de Tarifas de Peajes ─────────────────────────────────────

/**
 * Tarifa promedio de peajes en MXN por kilómetro.
 * Se aplica solo a los kilómetros identificados como peaje en OpenStreetMap.
 * Ajusta según tus datos históricos de rutas.
 */
export const TOLL_RATE_MXN_PER_KM = 2.5;

// ─── Helpers de Redondeo ─────────────────────────────────────────────────────

/** Redondea hacia arriba al múltiplo de $500 MXN más cercano */
export const roundUpTo500 = (value: number): number =>
  Math.ceil(value / 500) * 500;

/** Redondea hacia arriba al múltiplo de $200 MXN más cercano */
export const roundUpTo200 = (value: number): number =>
  Math.ceil(value / 200) * 200;

/** Redondea hacia arriba al múltiplo de $100 MXN más cercano */
export const roundUpTo100 = (value: number): number =>
  Math.ceil(value / 100) * 100;

/** Formatea un número como moneda MXN */
export const formatMXN = (value: number): string =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

/** Formatea kilómetros con 1 decimal */
export const formatKm = (value: number): string =>
  `${value.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
