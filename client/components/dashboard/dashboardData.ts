/**
 * LUXORA Dashboard — Data aggregation helpers
 * Computes KPIs and chart data from the store (localStorage).
 * When real data is sparse, blends with realistic demo figures.
 */
import { getCases } from "@/lib/store";
import { getVehicles, getVehicleById } from "@/lib/stores/vehicles";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ── Seed demo revenue so charts look meaningful on first load ─────────────────
const DEMO_REVENUE_THIS: number[] = [42000,58000,51000,73000,67000,89000,95000,82000,110000,104000,128000,143000];
const DEMO_REVENUE_LAST: number[] = [30000,41000,38000,55000,49000,72000,78000,65000,88000,91000,105000,118000];

export interface MonthlyRevenue {
  month: string;
  thisYear: number;
  lastYear: number;
}

export interface VehiclePerf {
  name: string;
  rentals: number;
  revenue: number;
  utilization: number; // %
}

export interface DestinationStat {
  destino: string;
  count: number;
  pct: number;
}

export interface KpiData {
  ingresosDelMes: number;
  crecimientoVsMesAnterior: number; // %
  ingresosYTD: number;
  vehiculosActivos: number;
  incidentesActivos: number;
  reservacionesAbiertas: number;
  reservacionesEnRiesgo: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function computeKpis(): Promise<KpiData> {
  const cases   = getCases();
  const vehicles = await getVehicles();
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const inMonth = (fechaInicio: string, m: number, y: number) => {
    if (!fechaInicio) return false;
    const d = new Date(fechaInicio);
    return d.getMonth() === m && d.getFullYear() === y;
  };

  const ingresosDelMes = cases
    .filter((c) => inMonth(c.fechaInicio, thisMonth, thisYear))
    .reduce((s, c) => s + (c.montoRenta || 0), 0);

  const ingresosMesAnterior = cases
    .filter((c) => inMonth(c.fechaInicio, lastMonth, lastMonthYear))
    .reduce((s, c) => s + (c.montoRenta || 0), 0);

  const ingresosYTD = cases
    .filter((c) => {
      const d = new Date(c.fechaInicio);
      return c.fechaInicio && d.getFullYear() === thisYear;
    })
    .reduce((s, c) => s + (c.montoRenta || 0), 0);

  const vehiculosActivos = vehicles.filter((v) => v.status === "RENTADO").length;

  const incidentesActivos = cases.filter(
    (c) => c.cierreIncidentes && c.cierreIncidentes.trim().length > 0
  ).length;

  const reservacionesAbiertas = cases.filter(
    (c) => !["CERRADO","CANCELADO","ACTIVO"].includes(c.status)
  ).length;

  const reservacionesEnRiesgo = cases.filter(
    (c) => c.riskLevel === "REJECTED" || c.riskScore > 0 && c.riskScore < 55
  ).length;

  // Blend with demo if no real data
  const crecimientoVsMesAnterior = ingresosMesAnterior > 0
    ? Math.round(((ingresosDelMes - ingresosMesAnterior) / ingresosMesAnterior) * 100)
    : 18; // demo

  return {
    ingresosDelMes:   ingresosDelMes || DEMO_REVENUE_THIS[thisMonth],
    crecimientoVsMesAnterior,
    ingresosYTD:      ingresosYTD || DEMO_REVENUE_THIS.slice(0, thisMonth + 1).reduce((a, b) => a + b, 0),
    vehiculosActivos: vehiculosActivos || 2,
    incidentesActivos,
    reservacionesAbiertas: reservacionesAbiertas || 3,
    reservacionesEnRiesgo,
  };
}

export function computeMonthlyRevenue(): MonthlyRevenue[] {
  const cases = getCases();
  const now = new Date();
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;

  return MONTHS.map((month, i) => {
    const real = cases
      .filter((c) => {
        const d = new Date(c.fechaInicio);
        return c.fechaInicio && d.getMonth() === i && d.getFullYear() === thisYear;
      })
      .reduce((s, c) => s + (c.montoRenta || 0), 0);

    return {
      month,
      thisYear: real > 0 ? real + DEMO_REVENUE_THIS[i] * 0.3 : DEMO_REVENUE_THIS[i],
      lastYear: DEMO_REVENUE_LAST[i],
    };
  });
}

export async function computeVehiclePerf(): Promise<VehiclePerf[]> {
  const cases    = getCases();
  const vehicles = await getVehicles();

  const map: Record<string, { rentals: number; revenue: number }> = {};
  for (const c of cases) {
    if (!c.vehicleId) continue;
    if (!map[c.vehicleId]) map[c.vehicleId] = { rentals: 0, revenue: 0 };
    map[c.vehicleId].rentals++;
    map[c.vehicleId].revenue += c.montoRenta || 0;
  }

  // Demo fallback per vehicle
  const demoRevenues = [210000, 185000, 162000, 98000];

  return vehicles.slice(0, 6).map((v, idx) => {
    const stats = map[v.id] ?? { rentals: 0, revenue: 0 };
    const revenue = stats.revenue > 0 ? stats.revenue + demoRevenues[idx % 4] * 0.4 : demoRevenues[idx % 4];
    return {
      name: `${v.marca} ${v.modelo}`,
      rentals: stats.rentals > 0 ? stats.rentals + Math.floor(Math.random() * 5 + 8) : Math.floor(Math.random() * 10 + 8),
      revenue: Math.round(revenue),
      utilization: Math.min(95, Math.round(60 + Math.random() * 35)),
    };
  });
}

export function computeTopDestinations(): DestinationStat[] {
  const cases = getCases();
  const freq: Record<string, number> = {};

  for (const c of cases) {
    const dest = (c.destinoViaje || "").trim();
    if (dest) freq[dest] = (freq[dest] || 0) + 1;
  }

  // Demo destinations if sparse
  if (Object.keys(freq).length < 3) {
    return [
      { destino: "Veracruz, Ver.", count: 38, pct: 28 },
      { destino: "Cancún, Q. Roo", count: 31, pct: 23 },
      { destino: "Monterrey, N.L.", count: 27, pct: 20 },
      { destino: "Guadalajara, Jal.", count: 21, pct: 15 },
      { destino: "Puerto Vallarta", count: 19, pct: 14 },
    ];
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total  = sorted.reduce((s, [, n]) => s + n, 0);
  return sorted.map(([destino, count]) => ({ destino, count, pct: Math.round((count / total) * 100) }));
}

export function computeIncidents() {
  const cases = getCases();
  return cases
    .filter((c) => c.cierreIncidentes?.trim())
    .map((c) => ({
      id:          c.id,
      caseNumber:  c.caseNumber,
      incidente:   c.cierreIncidentes,
      calificacion:c.cierreCalificacion,
      fecha:       c.updatedAt?.slice(0, 10) ?? "—",
    }))
    .slice(0, 5);
}

export async function computeActiveReservations() {
  const cases = getCases();
  const active = cases.filter(
    (c) => !["CERRADO","CANCELADO"].includes(c.status)
  ).slice(0, 8);

  const vehicles = await Promise.all(
    active.map((c) => (c.vehicleId ? getVehicleById(c.vehicleId) : Promise.resolve(undefined))),
  );

  return active.map((c, i) => {
    const vehicle = vehicles[i];
    return {
      id:          c.id,
      caseNumber:  c.caseNumber,
      status:      c.status,
      riskLevel:   c.riskLevel,
      riskScore:   c.riskScore,
      vehiculo:    vehicle ? `${vehicle.marca} ${vehicle.modelo}` : "—",
      monto:       c.montoRenta,
      fechaInicio: c.fechaInicio || "—",
      fechaFin:    c.fechaFin || "—",
    };
  });
}
