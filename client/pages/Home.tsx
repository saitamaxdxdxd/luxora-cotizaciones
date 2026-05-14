/**
 * LUXORA — Dashboard Principal
 * Principio: Menos ruido, más decisiones.
 * Responde en 5 segundos: ¿Cuánto generamos? ¿Qué vehículos rinden? ¿Dónde hay riesgo?
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingUp, Calendar, Car, AlertTriangle,
  FolderKanban, RefreshCw, ShieldAlert,
} from "lucide-react";
import { NavShell } from "@/components/luxora/NavShell";

// ── Dashboard components ──────────────────────────────────────────────────────
import { KpiCard }           from "@/components/dashboard/KpiCard";
import { RevenueChart }      from "@/components/dashboard/RevenueChart";
import { VehicleChart }      from "@/components/dashboard/VehicleChart";
import { DestinationChart }  from "@/components/dashboard/DestinationChart";
import { IncidentList }      from "@/components/dashboard/IncidentList";
import { ReservationsTable } from "@/components/dashboard/ReservationsTable";
import { AlertsBanner }      from "@/components/dashboard/AlertsBanner";
import {
  computeKpis, computeMonthlyRevenue,
  computeVehiclePerf, computeTopDestinations,
  computeIncidents, computeActiveReservations,
  type KpiData, type VehiclePerf,
} from "@/components/dashboard/dashboardData";

// ─────────────────────────────────────────────────────────────────────────────

const fmtMXN = (v: number) =>
  v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-[hsl(215,20%,35%)] uppercase tracking-[0.15em]">{children}</p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate   = useNavigate();
  const currentMonth = new Date().getMonth();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Defaults vacíos para los async (se cargan en refresh())
  const [kpis, setKpis] = useState<KpiData>({
    ingresosDelMes: 0, crecimientoVsMesAnterior: 0, ingresosYTD: 0,
    vehiculosActivos: 0, incidentesActivos: 0, reservacionesAbiertas: 0, reservacionesEnRiesgo: 0,
  });
  const [monthlyRev,   setMonthlyRev]   = useState(computeMonthlyRevenue);
  const [vehiclePerf,  setVehiclePerf]  = useState<VehiclePerf[]>([]);
  const [topDest,      setTopDest]      = useState(computeTopDestinations);
  const [incidents,    setIncidents]    = useState(computeIncidents);
  const [activeCases,  setActiveCases]  = useState<Awaited<ReturnType<typeof computeActiveReservations>>>([]);

  const refresh = async () => {
    const [k, vp, ar] = await Promise.all([
      computeKpis(),
      computeVehiclePerf(),
      computeActiveReservations(),
    ]);
    setKpis(k);
    setVehiclePerf(vp);
    setActiveCases(ar);
    setMonthlyRev(computeMonthlyRevenue());
    setTopDest(computeTopDestinations());
    setIncidents(computeIncidents());
    setLastRefresh(new Date());
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <NavShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest">LUXORA · Panel Operativo</span>
            </div>
            <h1 className="font-display font-black text-3xl text-[hsl(210,40%,95%)] leading-tight">
              Dashboard
            </h1>
            <p className="text-sm text-[hsl(215,20%,45%)] mt-1">
              {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button onClick={() => void refresh()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[hsl(215,20%,50%)] border border-[hsl(217,25%,16%)] hover:border-amber-500/30 hover:text-amber-400 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar · {lastRefresh.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </button>
        </div>

        {/* ── ALERTAS ── */}
        <AlertsBanner />

        {/* ── KPIs ── */}
        <div className="flex flex-col gap-3">
          <SectionTitle>KPIs · Período actual</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label="Ingresos del mes"
              value={fmtMXN(kpis.ingresosDelMes)}
              sub={`${new Date().toLocaleDateString("es-MX", { month: "long" })}`}
              trend={kpis.crecimientoVsMesAnterior}
              icon={DollarSign}
              accent="amber"
              onClick={() => navigate("/reservaciones")}
            />
            <KpiCard
              label="Crecimiento"
              value={`${kpis.crecimientoVsMesAnterior > 0 ? "+" : ""}${kpis.crecimientoVsMesAnterior}%`}
              sub="vs mes anterior"
              icon={TrendingUp}
              accent={kpis.crecimientoVsMesAnterior >= 0 ? "emerald" : "red"}
            />
            <KpiCard
              label="Ingresos YTD"
              value={fmtMXN(kpis.ingresosYTD)}
              sub={`Acumulado ${new Date().getFullYear()}`}
              icon={Calendar}
              accent="blue"
            />
            <KpiCard
              label="Vehículos activos"
              value={`${kpis.vehiculosActivos}`}
              sub="en renta ahora"
              icon={Car}
              accent="purple"
              onClick={() => navigate("/vehiculos")}
            />
            <KpiCard
              label="Incidentes"
              value={`${kpis.incidentesActivos}`}
              sub="reportados"
              icon={AlertTriangle}
              accent={kpis.incidentesActivos > 0 ? "red" : "emerald"}
            />
            <KpiCard
              label="Reservaciones"
              value={`${kpis.reservacionesAbiertas}`}
              sub={`${kpis.reservacionesEnRiesgo} en riesgo`}
              icon={FolderKanban}
              accent="amber"
              onClick={() => navigate("/reservaciones")}
            />
          </div>
        </div>

        {/* ── ROW 1: Revenue chart ── */}
        <div className="flex flex-col gap-3">
          <SectionTitle>Ingresos · Comparativo anual</SectionTitle>
          <RevenueChart data={monthlyRev} currentMonth={currentMonth} />
        </div>

        {/* ── ROW 2: Vehicle perf + Top destinations ── */}
        <div className="flex flex-col gap-3">
          <SectionTitle>Performance de flota · Top destinos</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
              <VehicleChart data={vehiclePerf} />
            </div>
            <div className="lg:col-span-2">
              <DestinationChart data={topDest} />
            </div>
          </div>
        </div>

        {/* ── ROW 3: Reservaciones activas + Incidentes ── */}
        <div className="flex flex-col gap-3">
          <SectionTitle>Operaciones · Reservaciones activas e incidentes</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ReservationsTable data={activeCases} />
            </div>
            <div className="lg:col-span-1">
              <IncidentList data={incidents} />
            </div>
          </div>
        </div>

        {/* ── Footer note ── */}
        <p className="text-[10px] text-center text-[hsl(215,20%,25%)] pb-2">
          LUXORA Platform · Datos en tiempo real desde el motor local · Actualizado {lastRefresh.toLocaleTimeString("es-MX")}
        </p>

      </div>
    </NavShell>
  );
}
