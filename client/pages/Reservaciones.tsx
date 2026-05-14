/**
 * LUXORA — Módulo de Reservaciones
 * Flujo: Reservación → Enviar KYC → KYC → Revisión → Aprobación → Contrato → Firma → Abonos → Pagaré → Evidence Pack → Activo
 */
import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Plus, Search, ArrowLeft, ChevronRight, CheckCircle2, Clock, XCircle,
  AlertTriangle, Car, FileText, Shield, Pen, Send, Eye,
  Package, Trash2, Phone, Loader2,
  FileCheck, Stamp, BookOpen, CreditCard, Star, Download, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavShell } from "@/components/luxora/NavShell";
import {
  type RentalCase, type CaseStatus, type ParticipantRole, type RiskLevel,
  getCases, saveCase, createCase, deleteCase,
  getUsers, getUserById,
  calcularRiesgoCase,
  getOrganizations, getOrganizationById,
} from "@/lib/store";
import { getVehicles, getVehicleById, type Vehicle } from "@/lib/stores/vehicles";
import { StepReservacion } from "@/components/reservaciones/StepReservacion";
import { StepAbonos } from "@/components/reservaciones/StepAbonos";
import { PrintableContract } from "@/components/luxora/PrintableContract";

// ─── Step definitions ─────────────────────────────────────────────────────────

const CASE_STEPS: { status: CaseStatus; label: string; icon: React.ElementType; desc: string }[] = [
  { status: "RESERVACION",        label: "Reservación",   icon: BookOpen,   desc: "Datos del servicio y participantes" },
  { status: "INVITACION_ENVIADA", label: "KYC",           icon: Send,       desc: "Envío de links + progreso KYC" },
  { status: "CONTRATO_GENERADO",  label: "Contrato",      icon: FileCheck,  desc: "PDF auto-fill — sin edición" },
  { status: "FIRMADO",            label: "Firma digital", icon: Pen,        desc: "Táctil + OTP + IP" },
  { status: "ABONOS",             label: "Abonos",        icon: CreditCard, desc: "Pagos parciales al importe" },
  { status: "PAGARE_GENERADO",    label: "Pagaré",        icon: Stamp,      desc: "Firmado por responsable y aval" },
  { status: "EVIDENCE_PACK",      label: "Evidence Pack", icon: Package,    desc: "PDF legal + logs + biométricos" },
  { status: "ACTIVO",             label: "Activo",        icon: Car,        desc: "Renta en curso" },
];

const STATUS_ORDER: CaseStatus[] = [
  "RESERVACION", "INVITACION_ENVIADA", "KYC_EN_PROGRESO", "LISTO_REVISION",
  "APROBADO", "CONTRATO_GENERADO", "FIRMADO", "ABONOS", "PAGARE_GENERADO",
  "EVIDENCE_PACK", "ACTIVO", "CERRADO", "CANCELADO",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  RESERVACION:        { label: "Reservación",    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",         icon: BookOpen },
  INVITACION_ENVIADA: { label: "KYC enviado",    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",   icon: Send },
  KYC_EN_PROGRESO:    { label: "KYC en progreso",color: "text-amber-400 bg-amber-500/10 border-amber-500/20",      icon: Clock },
  LISTO_REVISION:     { label: "En revisión",    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",      icon: Eye },
  APROBADO:           { label: "Aprobado",       color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",icon: CheckCircle2 },
  RECHAZADO:          { label: "Rechazado",      color: "text-red-400 bg-red-500/10 border-red-500/20",            icon: XCircle },
  CONTRATO_GENERADO:  { label: "Contrato listo", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",icon: FileCheck },
  FIRMADO:            { label: "Firmado",        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",icon: Pen },
  ABONOS:             { label: "Abonos",         color: "text-amber-400 bg-amber-500/10 border-amber-500/20",      icon: CreditCard },
  PAGARE_GENERADO:    { label: "Pagaré listo",   color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",icon: Stamp },
  EVIDENCE_PACK:      { label: "Evidence Pack",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",icon: Package },
  ACTIVO:             { label: "Activo",         color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",icon: Car },
  CERRADO:            { label: "Cerrado",        color: "text-[hsl(215,20%,45%)] bg-[hsl(217,25%,10%)] border-[hsl(217,25%,18%)]", icon: CheckCircle2 },
  CANCELADO:          { label: "Cancelado",      color: "text-red-400/70 bg-red-500/8 border-red-500/15",          icon: XCircle },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  APPROVED: { label: "Aprobado",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  REVIEW:   { label: "Revisión",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  REJECTED: { label: "Rechazado", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  PENDING:  { label: "Pendiente", color: "text-[hsl(215,20%,50%)] bg-[hsl(217,25%,10%)] border-[hsl(217,25%,18%)]" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Map intermediate statuses (hidden from UI) to their visible CASE_STEPS equivalent
const STATUS_TO_STEP: Partial<Record<CaseStatus, CaseStatus>> = {
  KYC_EN_PROGRESO: "INVITACION_ENVIADA",
  LISTO_REVISION:  "INVITACION_ENVIADA",
  APROBADO:        "INVITACION_ENVIADA",
  RECHAZADO:       "INVITACION_ENVIADA",
};
function visibleStep(status: CaseStatus): CaseStatus {
  return (STATUS_TO_STEP[status] ?? status) as CaseStatus;
}
function stepIdx(status: CaseStatus) {
  const visible = visibleStep(status);
  return CASE_STEPS.findIndex((s) => s.status === visible);
}
function advanceStatus(c: RentalCase): CaseStatus {
  // Skip hidden intermediate statuses: INVITACION_ENVIADA → CONTRATO_GENERADO
  if (c.status === "INVITACION_ENVIADA" ||
      c.status === "KYC_EN_PROGRESO" ||
      c.status === "LISTO_REVISION" ||
      c.status === "APROBADO") {
    return "CONTRATO_GENERADO";
  }
  const order = STATUS_ORDER;
  const i = order.indexOf(c.status);
  return (order[i + 1] ?? c.status) as CaseStatus;
}
function saldoPendiente(c: RentalCase) {
  const abonado = c.abonos.reduce((s, a) => s + a.monto, 0) + c.apartadoMonto;
  return Math.max(0, c.montoRenta - abonado);
}
function progressPct(c: RentalCase) {
  const idx = Math.max(0, stepIdx(c.status));
  return Math.round((idx / (CASE_STEPS.length - 1)) * 100);
}
const fmtMXN = (n: number) =>
  n > 0 ? n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }) : "—";

function ProgressBar({ value, color = "bg-amber-500" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-[hsl(217,25%,12%)]">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)}>
          <Star className={cn("w-5 h-5 transition-colors", n <= value ? "text-amber-400 fill-amber-400" : "text-[hsl(215,20%,30%)]")} />
        </button>
      ))}
    </div>
  );
}

// ─── Sidebar summary (non-reservación steps) ──────────────────────────────────

function ReservacionSidebar({ activeCase, vehicles }: { activeCase: RentalCase; vehicles: Vehicle[] }) {
  const vehicle = activeCase.vehicleId ? vehicles.find((v) => v.id === activeCase.vehicleId) : undefined;
  const responsable = activeCase.participants.find((p) => p.role === "RESPONSABLE");
  const aval        = activeCase.participants.find((p) => p.role === "AVAL");
  const operador    = activeCase.participants.find((p) => p.role === "OPERADOR");
  const rUser = responsable ? getUserById(responsable.userId) : undefined;
  const aUser = aval        ? getUserById(aval.userId)        : undefined;
  const oUser = operador    ? getUserById(operador.userId)    : undefined;
  const saldo = saldoPendiente(activeCase);

  return (
    <div className="flex flex-col gap-4">
      {/* Vehicle */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Vehículo</p>
        {vehicle ? (
          <div>
            <p className="text-sm font-semibold text-[hsl(210,40%,90%)]">{vehicle.marca} {vehicle.modelo} {vehicle.anio}</p>
            <p className="text-xs text-amber-400/60 font-mono">{vehicle.placas}</p>
          </div>
        ) : <p className="text-xs text-[hsl(215,20%,40%)]">No asignado</p>}
        {(activeCase.fechaInicio || activeCase.fechaFin) && (
          <div className="text-[10px] text-[hsl(215,20%,45%)] border-t border-amber-500/10 pt-2 mt-1">
            {activeCase.fechaInicio && <p>Salida: {activeCase.fechaInicio} {activeCase.horaInicio}</p>}
            {activeCase.fechaFin    && <p>Regreso: {activeCase.fechaFin} {activeCase.horaFin}</p>}
            {activeCase.origenViaje && activeCase.destinoViaje && (
              <p className="truncate">{activeCase.origenViaje} → {activeCase.destinoViaje}</p>
            )}
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Participantes</p>
        {[
          { user: rUser, label: "Responsable", color: "text-amber-400" },
          { user: aUser, label: activeCase.tipoContrato === "CON_OPERADOR" ? "Testigo" : "Aval", color: "text-blue-400" },
          { user: oUser, label: "Operador", color: "text-purple-400" },
        ].filter(x => x.user).map(({ user, label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cn("text-[9px] font-bold w-16 flex-shrink-0", color)}>{label}</span>
            <p className="text-xs text-[hsl(210,40%,80%)] truncate">{user!.nombre} {user!.apellidoPaterno}</p>
          </div>
        ))}
        {!rUser && <p className="text-[10px] text-[hsl(215,20%,40%)]">Sin participantes asignados</p>}
      </div>

      {/* Saldo */}
      {activeCase.montoRenta > 0 && (
        <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Importes</p>
          <div className="flex justify-between text-xs">
            <span className="text-[hsl(215,20%,50%)]">Renta total</span>
            <span className="font-semibold text-[hsl(210,40%,85%)]">{fmtMXN(activeCase.montoRenta)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[hsl(215,20%,50%)]">Saldo pendiente</span>
            <span className={cn("font-bold", saldo > 0 ? "text-amber-400" : "text-emerald-400")}>{fmtMXN(saldo)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Reservaciones() {
  const [cases, setCases] = useState<RentalCase[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "detail">("list");
  const [activeCase, setActiveCase] = useState<RentalCase | null>(null);
  const [activeStep, setActiveStep] = useState<CaseStatus>("RESERVACION");
  const [saving, setSaving] = useState(false);
  const [caseError, setCaseError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const isNewCase = { current: false };

  const reload = () => { setCases(getCases()); };
  useEffect(() => { reload(); }, []);
  useEffect(() => { void getVehicles().then(setVehicles); }, []);

  // Get month from ISO date string (YYYY-MM-DD)
  const getMonthFromDate = (dateStr: string | undefined): number | null => {
    if (!dateStr) return null;
    const m = parseInt(dateStr.split("-")[1], 10);
    return isNaN(m) ? null : m - 1; // Convert to 0-11
  };

  const filtered = cases.filter((c) => {
    const q = search.toLowerCase();
    const r = c.participants.find((p) => p.role === "RESPONSABLE");
    const rUser = r ? getUserById(r.userId) : null;
    const caseMonth = getMonthFromDate(c.fechaInicio);
    const matchesSearch = [c.caseNumber, c.status, c.origenViaje, c.destinoViaje,
      rUser?.nombre, rUser?.apellidoPaterno].join(" ").toLowerCase().includes(q);
    // Show in selected month if date matches, or if undated (caseMonth is null)
    const matchesMonth = caseMonth === selectedMonth || caseMonth === null;
    return matchesSearch && matchesMonth;
  });

  // Sort filtered by date descending (most recent first)
  const sorted = [...filtered].sort((a, b) => {
    const aDate = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
    const bDate = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
    return bDate - aDate;
  });

  // Calculate monthly totals
  const getMonthlyTotal = (monthIdx: number): number => {
    return cases
      .filter((c) => {
        const caseMonth = getMonthFromDate(c.fechaInicio);
        return caseMonth === monthIdx || caseMonth === null;
      })
      .reduce((sum, c) => sum + (c.montoRenta || 0), 0);
  };

  const update = (fields: Partial<RentalCase>) => {
    if (!activeCase) return;
    const updated = { ...activeCase, ...fields };
    setActiveCase(updated);
    saveCase(updated);
  };

  const openCase = (c: RentalCase) => { setActiveCase(c); setActiveStep(c.status); setCaseError(""); setView("detail"); };

  const newCase = () => {
    isNewCase.current = true;
    const c = createCase();
    setActiveCase(c); setActiveStep("RESERVACION"); setCaseError(""); setView("detail");
  };

  const goBack = () => {
    if (isNewCase.current && activeCase) {
      const hasResponsable = activeCase.participants.some((p) => p.role === "RESPONSABLE");
      if (!hasResponsable && !activeCase.fechaInicio) deleteCase(activeCase.id);
    }
    isNewCase.current = false; setCaseError(""); reload(); setView("list"); setActiveCase(null);
  };

  const advance = () => {
    if (!activeCase) return;
    const hasResponsable = activeCase.participants.some((p) => p.role === "RESPONSABLE");
    if (!hasResponsable) { setCaseError("Debes asignar un Responsable antes de avanzar."); return; }
    if (activeCase.status === "RESERVACION" && !activeCase.fechaInicio) {
      setCaseError("La fecha de salida es obligatoria."); return;
    }
    setCaseError(""); setSaving(true);
    const next = advanceStatus(activeCase);
    const updated = { ...activeCase, status: next };
    // When jumping to CONTRATO_GENERADO from KYC step, auto-calculate risk + generate contract
    if (next === "CONTRATO_GENERADO") {
      const { score, level, breakdown, flags } = calcularRiesgoCase(updated);
      Object.assign(updated, { riskScore: score, riskLevel: level, riskBreakdown: breakdown, riskFlags: flags });
      updated.contratoNumero = `CTR-${updated.caseNumber}`;
      updated.contratoGenerado = true;
    }
    if (next === "FIRMADO") updated.contratoFirmado = true;
    if (next === "PAGARE_GENERADO") { updated.pagareNumero = `PAG-${updated.caseNumber}`; updated.pagareGenerado = true; }
    if (next === "EVIDENCE_PACK") {
      updated.evidencePack = { ...updated.evidencePack, generado: true, generadoAt: new Date().toISOString(),
        faceMatchScore: 0.87 + Math.random() * 0.1, ipLogs: ["187.154.22.10"], timestamps: [new Date().toISOString()], otpValidated: true };
    }
    setActiveCase(updated); saveCase(updated); setActiveStep(visibleStep(next));
    setTimeout(() => { setSaving(false); reload(); }, 400);
  };

  // ── PDF contract download ──────────────────────────────────────────────────
  const handleDownloadContract = async () => {
    if (!activeCase) return;
    setExportingPdf(true);
    try {
      const [h2cMod, jsPDFMod] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const html2canvas = h2cMod.default;
      const jsPDF = jsPDFMod.default;
      const rPart = activeCase.participants.find((p) => p.role === "RESPONSABLE");
      const aPart = activeCase.participants.find((p) => p.role === "AVAL");
      const oPart = activeCase.participants.find((p) => p.role === "OPERADOR");
      const rUser = rPart ? getUserById(rPart.userId) : undefined;
      const aUser = aPart ? getUserById(aPart.userId) : undefined;
      const oUser = oPart ? getUserById(oPart.userId) : undefined;
      const veh   = activeCase.vehicleId ? await getVehicleById(activeCase.vehicleId) : undefined;
      const offscreen = document.createElement("div");
      offscreen.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;z-index:-1;pointer-events:none;background:#fff;";
      document.body.appendChild(offscreen);
      // Create root, render, wait for paint, then capture and ALWAYS unmount + remove
      const root = createRoot(offscreen);
      let canvas: HTMLCanvasElement;
      try {
        await new Promise<void>((resolve) => {
          root.render(<PrintableContract rentalCase={activeCase} responsable={rUser} aval={aUser} operador={oUser} vehicle={veh} />);
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        canvas = await html2canvas(offscreen.firstElementChild as HTMLElement, { backgroundColor: "#fff", scale: 2, useCORS: true, logging: false });
      } finally {
        // Always unmount React root before removing the DOM node — prevents memory leak
        root.unmount();
        if (document.body.contains(offscreen)) document.body.removeChild(offscreen);
      }
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
      const totalH = pw / (canvas.width / canvas.height);
      let yPos = 0; let page = 0;
      while (yPos < totalH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, -yPos, pw, totalH);
        yPos += ph; page++;
      }
      pdf.save(`LUXORA_CTR_${activeCase.caseNumber}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) { console.error(err); } finally { setExportingPdf(false); }
  };

  // ── List view ──────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <NavShell>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-[hsl(210,40%,95%)]">Reservaciones</h1>
              <p className="text-sm text-[hsl(215,20%,45%)] mt-0.5">Reservación → KYC → Contrato → Firma → Abonos → Activo</p>
            </div>
            <button onClick={newCase}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
              <Plus className="w-4 h-4" /> Nueva Reservación
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,40%)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, responsable, origen, destino…"
              className="w-full bg-[hsl(217,25%,8%)] text-[hsl(210,40%,90%)] placeholder:text-[hsl(215,20%,38%)] rounded-xl border border-[hsl(217,25%,13%)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-all" />
          </div>

          {/* Monthly tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((month, idx) => {
              const monthTotal = getMonthlyTotal(idx);
              return (
                <button key={idx} onClick={() => setSelectedMonth(idx)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                    selectedMonth === idx
                      ? "bg-amber-500 text-[hsl(222,47%,4%)] border-amber-500"
                      : "bg-[hsl(217,25%,10%)] border-[hsl(217,25%,17%)] text-[hsl(215,20%,50%)] hover:border-amber-500/30"
                  )}>
                  <span>{month}</span>
                  {monthTotal > 0 && (
                    <span className={cn("text-[10px] font-bold", selectedMonth === idx ? "text-[hsl(222,47%,4%)]" : "text-amber-400")}>
                      {monthTotal.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {sorted.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Car className="w-12 h-12 text-amber-500/20 mx-auto mb-3" />
              <p className="text-[hsl(215,20%,50%)] text-sm mb-4">
                {cases.length === 0 ? "Sin reservaciones registradas" : `Sin reservaciones en ${["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][selectedMonth]}`}
              </p>
              {cases.length === 0 && (
                <button onClick={newCase} className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400">
                  Crear primera reservación
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sorted.map((c) => {
                const sc = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.RESERVACION;
                const ScIcon = sc.icon;
                const rPart = c.participants.find((p) => p.role === "RESPONSABLE");
                const rUser = rPart?.userId ? getUserById(rPart.userId) : null;
                const rOrg = rPart?.organizationId ? getOrganizationById(rPart.organizationId) : null;
                const rRep = rPart?.representativeUserId ? getUserById(rPart.representativeUserId) : null;
                const vehicle = c.vehicleId ? vehicles.find((v) => v.id === c.vehicleId) : null;
                const pct = progressPct(c);
                const saldo = saldoPendiente(c);
                const responsableName = rUser
                  ? `${rUser.nombre} ${rUser.apellidoPaterno}`
                  : rOrg && rRep
                  ? `${rOrg.businessName} (${rRep.nombre} ${rRep.apellidoPaterno})`
                  : "Sin responsable";
                return (
                  <div key={c.id}
                    className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-all border border-transparent group cursor-pointer"
                    onClick={() => openCase(c)}>
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <ScIcon className="w-5 h-5 text-amber-400/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-bold text-[hsl(210,40%,92%)] text-sm">{c.caseNumber}</p>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", sc.color)}>
                          {sc.label}
                        </span>
                        {c.riskScore > 0 && (
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", RISK_CONFIG[c.riskLevel].color)}>
                            Risk {c.riskScore}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[hsl(215,20%,55%)] truncate mb-1">
                        {responsableName}
                        {(c.origenViaje || c.destinoViaje) && (
                          <span className="text-[hsl(215,20%,40%)]">
                            {" · "}{c.origenViaje} {c.destinoViaje ? `→ ${c.destinoViaje}` : ""}
                          </span>
                        )}
                        {(c.fechaInicio || c.fechaFin) && (
                          <span className="text-[hsl(215,20%,38%)]">
                            {" · "}{c.fechaInicio} {c.fechaFin ? `– ${c.fechaFin}` : ""}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-amber-400/70 font-semibold truncate mb-1">
                        {vehicle
                          ? `${vehicle.marca} ${vehicle.modelo} ${vehicle.anio} · ${vehicle.placas}`
                          : "Sin vehículo asignado"}
                      </p>
                      <ProgressBar value={pct} color={pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-blue-500"} />
                    </div>
                    <div className="flex-shrink-0 text-right flex flex-col gap-1 items-end">
                      {c.montoRenta > 0 && (() => {
                        const abonado = c.abonos.reduce((s, a) => s + a.monto, 0) + (c.apartadoMonto || 0);
                        return abonado > 0
                          ? <p className="text-xs font-bold text-emerald-400">{fmtMXN(abonado)} <span className="text-[hsl(215,20%,40%)] font-normal">abonado</span></p>
                          : null;
                      })()}
                      {saldo > 0 && <p className="text-xs font-semibold text-amber-400/80">{fmtMXN(saldo)} <span className="text-[hsl(215,20%,38%)] font-normal">saldo</span></p>}
                      <p className="text-[10px] text-[hsl(215,20%,38%)]">{pct}% avance</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); deleteCase(c.id); reload(); }}
                        className="p-2 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-[hsl(215,20%,30%)] group-hover:text-amber-500/50" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </NavShell>
    );
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (!activeCase) return null;
  const sc = STATUS_CONFIG[activeCase.status] ?? STATUS_CONFIG.RESERVACION;
  const ScIcon = sc.icon;
  const curStepIdx = stepIdx(activeCase.status);
  const canAdvance = !["RECHAZADO", "CANCELADO", "CERRADO", "ACTIVO"].includes(activeCase.status);
  const users = getUsers();
  const isReservacion = activeStep === "RESERVACION";

  return (
    <NavShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} className="p-2 rounded-xl text-[hsl(215,20%,50%)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-lg text-[hsl(210,40%,95%)]">{activeCase.caseNumber}</h1>
            <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border", sc.color)}>
              <ScIcon className="w-3 h-3" />{sc.label}
            </span>
            {activeCase.riskScore > 0 && (
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", RISK_CONFIG[activeCase.riskLevel].color)}>
                Risk: {activeCase.riskScore}
              </span>
            )}
          </div>
          {canAdvance && (
            <button onClick={advance} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 disabled:opacity-50 transition-all">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {saving ? "Guardando…" : "Avanzar paso"}
            </button>
          )}
        </div>

        {/* Error banner */}
        {caseError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{caseError}
          </div>
        )}

        {/* Step timeline */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
          {CASE_STEPS.map((s, i) => {
            const done   = curStepIdx > i;
            const active = visibleStep(activeCase.status) === s.status;
            const SIcon  = s.icon;
            return (
              <button key={s.status} onClick={() => setActiveStep(s.status)}
                className={cn("flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all border",
                  active  ? "bg-amber-500 text-[hsl(222,47%,4%)] border-amber-500"
                  : done  ? "bg-emerald-500/12 border-emerald-500/25 text-emerald-400"
                  : activeStep === s.status ? "bg-[hsl(217,25%,14%)] border-amber-500/30 text-amber-400"
                  : "bg-[hsl(217,25%,10%)] border-[hsl(217,25%,18%)] text-[hsl(215,20%,40%)]")}>
                <SIcon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className={cn("grid gap-6", isReservacion ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}>
          <div className={isReservacion ? "" : "lg:col-span-2"}>

            {/* RESERVACIÓN */}
            {activeStep === "RESERVACION" && (
              <div className="glass-card rounded-2xl p-5">
                <StepReservacion
                  activeCase={activeCase} vehicles={vehicles}
                  update={update} setCaseError={setCaseError} />
              </div>
            )}

            {/* KYC — Enviar links + Progreso (pasos fusionados) */}
            {activeStep === "INVITACION_ENVIADA" && (
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-400" />KYC — Validación de participantes
                </h2>

                {/* Deduplicate by userId: one card per person, merging all their roles */}
                {(() => {
                  const seen = new Set<string>();
                  return activeCase.participants.filter((p) => {
                    if (seen.has(p.userId)) return false;
                    seen.add(p.userId);
                    return true;
                  });
                })().map((p) => {
                  // Collect ALL roles this person has in this case
                  const allRoles = activeCase.participants
                    .filter((x) => x.userId === p.userId)
                    .map((x) => x.role);
                  const isOperador = allRoles.includes("OPERADOR");

                  const u = getUserById(p.userId);

                  // Build combined label
                  const roleLabel = (role: string) =>
                    role === "RESPONSABLE" ? "Responsable"
                    : role === "AVAL" ? (activeCase.tipoContrato === "CON_OPERADOR" ? "Testigo" : "Aval")
                    : "Operador";
                  const label = allRoles.map(roleLabel).join(" · ");

                  // Primary role color (first non-operador role, or purple if only operator)
                  const primaryRole = allRoles.find((r) => r !== "OPERADOR") ?? "OPERADOR";
                  const labelColor = primaryRole === "RESPONSABLE" ? "text-amber-400"
                    : primaryRole === "AVAL" ? "text-blue-400"
                    : "text-purple-400";

                  // Use the invite token of the primary/first role for the KYC link
                  const primaryParticipant = activeCase.participants.find((x) => x.userId === p.userId && x.role === primaryRole)!;
                  const kycUrl = `${window.location.origin}/kyc/${activeCase.id}/${primaryRole.toLowerCase()}/${primaryParticipant.inviteToken}`;
                  // Status: COMPLETADO if all roles are complete
                  const allComplete = activeCase.participants
                    .filter((x) => x.userId === p.userId)
                    .every((x) => x.status === "COMPLETADO");
                  const anySent = activeCase.participants
                    .filter((x) => x.userId === p.userId)
                    .some((x) => ["INVITADO","EN_PROGRESO","COMPLETADO"].includes(x.status));
                  // Use merged status vars from dedup logic above
                  const sent    = anySent;
                  const complete = allComplete;
                  // Checklist includes licencia when this person is also operator
                  const pct = u ? Math.round(([
                    u.selfie,
                    u.documents.find(d => d.type === "INE_FRONT")?.data,
                    u.documents.find(d => d.type === "INE_BACK")?.data,
                    u.documents.find(d => d.type === "DOMICILIO")?.data,
                    u.nombre, u.curp,
                    // Extra item if also operator
                    ...(isOperador ? [u.documents.find(d => d.type === "LICENCIA")?.data ?? ""] : []),
                  ].filter(Boolean).length / (isOperador ? 7 : 6)) * 100) : 0;
                  const pctColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-blue-500";
                  const pctText  = pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-blue-400";

                  return (
                    <div key={p.userId}
                      className={cn("flex flex-col gap-3 rounded-2xl border p-4 transition-all",
                        allComplete
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-[hsl(217,25%,8%)] border-[hsl(217,25%,15%)]"
                      )}>

                      {/* Row 1: Avatar + info + status badge */}
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-[hsl(217,25%,12%)] border border-[hsl(217,25%,18%)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {u?.selfie
                            ? <img src={u.selfie} alt="" className="w-full h-full object-cover scale-x-[-1]" />
                            : <span className={cn("text-sm font-black", labelColor)}>
                                {u?.nombre?.charAt(0) ?? "?"}
                              </span>
                          }
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-[9px] font-black uppercase tracking-widest", labelColor)}>{label}</span>
                            {allComplete && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" />KYC completo
                              </span>
                            )}
                            {anySent && !allComplete && (
                              <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                                Link enviado
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-[hsl(210,40%,90%)] truncate">
                            {u ? `${u.nombre} ${u.apellidoPaterno}` : "Sin asignar"}
                          </p>
                          {u?.telefono && (
                            <p className="text-[10px] text-[hsl(215,20%,40%)] flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />{u.telefono}
                            </p>
                          )}
                        </div>
                        {/* % */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className={cn("text-lg font-black leading-none", pctText)}>{pct}%</span>
                          <span className="text-[9px] text-[hsl(215,20%,35%)]">completado</span>
                        </div>
                      </div>

                      {/* Row 2: Progress bar */}
                      <div className="flex flex-col gap-1">
                        <div className="h-2 rounded-full bg-[hsl(217,25%,12%)] overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", pctColor)}
                            style={{ width: `${pct}%` }} />
                        </div>
                        {/* Checklist items */}
                        {u && (
                          <div className="flex gap-3 mt-1 flex-wrap">
                            {[
                              { label: "Nombre",   done: !!u.nombre },
                              { label: "CURP",     done: !!u.curp },
                              { label: "INE ↑",    done: !!u.documents.find(d => d.type === "INE_FRONT")?.data },
                              { label: "INE ↓",    done: !!u.documents.find(d => d.type === "INE_BACK")?.data },
                              { label: "Domicilio",done: !!u.documents.find(d => d.type === "DOMICILIO")?.data },
                              { label: "Selfie",   done: !!u.selfie },
                              // Licencia only shown when this person is also the operator
                              ...(isOperador ? [{ label: "Licencia", done: !!u.documents.find(d => d.type === "LICENCIA")?.data }] : []),
                            ].map(({ label: lbl, done }) => (
                              <span key={lbl} className={cn("flex items-center gap-1 text-[9px] font-semibold",
                                done ? "text-emerald-400/80" : "text-[hsl(215,20%,30%)]")}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", done ? "bg-emerald-400" : "bg-[hsl(217,25%,22%)]")} />
                                {lbl}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Row 3: Action buttons + link */}
                      {u && (
                        <div className="flex flex-col gap-2 border-t border-[hsl(217,25%,13%)] pt-3">
                          <div className="flex gap-2">
                            <button onClick={() => {
                              const msg = `⚠️ *LUXORA — Validación requerida*\n\nPara continuar con tu reservación *${activeCase.caseNumber}* es necesario completar tu proceso de validación:\n\n🔗 ${kycUrl}\n\n_Este enlace expira en 48 hrs._`;
                              const tel = u.telefono?.replace(/\D/g, "");
                              window.open(`https://wa.me/${tel ? "52" + tel : ""}?text=${encodeURIComponent(msg)}`, "_blank");
                              const updated = activeCase.participants.map((x) =>
                                x.userId === p.userId ? { ...x, status: "INVITADO" as const, inviteSentAt: new Date().toISOString() } : x);
                              update({ participants: updated });
                            }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] hover:bg-[#25D366]/18 transition-all">
                              <MessageCircle className="w-3.5 h-3.5" />
                              {anySent ? "Re-enviar por WA" : "Enviar por WhatsApp"}
                            </button>
                            <button onClick={() => window.open(kycUrl, "_blank")}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/18 transition-all">
                              <Eye className="w-3.5 h-3.5" />Probar
                            </button>
                          </div>
                          {/* Copyable link */}
                          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[hsl(217,25%,11%)] border border-[hsl(217,25%,16%)]">
                            <p className="text-[9px] text-[hsl(215,20%,33%)] font-mono truncate flex-1">{kycUrl}</p>
                            <button onClick={() => navigator.clipboard.writeText(kycUrl)}
                              className="text-[9px] font-bold text-amber-500/50 hover:text-amber-400 flex-shrink-0 transition-colors whitespace-nowrap">
                              Copiar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <p className="text-[10px] text-[hsl(215,20%,35%)] flex items-center gap-1.5 mt-1">
                  <Shield className="w-3 h-3 text-amber-500/40" />
                  Link único por participante con token seguro. Expira en 48 hrs.
                </p>
              </div>
            )}


            {/* CONTRATO — solo visualización y descarga */}
            {activeStep === "CONTRATO_GENERADO" && (
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-400" />Contrato de Arrendamiento
                </h2>
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/70">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>El contrato se genera automáticamente con los datos de la Reservación. Para modificar algún dato, ve al paso <strong>Reservación</strong>.</span>
                </div>
                {activeCase.contratoNumero && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />Contrato: <strong>{activeCase.contratoNumero}</strong>
                  </div>
                )}
                <button onClick={handleDownloadContract} disabled={exportingPdf}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-all">
                  {exportingPdf ? <><Loader2 className="w-4 h-4 animate-spin" />Generando PDF…</> : <><Download className="w-4 h-4" />Descargar Contrato PDF</>}
                </button>
              </div>
            )}

            {/* FIRMA */}
            {activeStep === "FIRMADO" && (
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2"><Pen className="w-4 h-4 text-amber-400" />Firma Digital</h2>
                {activeCase.participants.filter((p) => p.role !== "OPERADOR").map((p) => {
                  const u = getUserById(p.userId);
                  const signed = activeCase.firmas.some((f) => f.userId === p.userId);
                  const label = p.role === "RESPONSABLE" ? "Responsable" : activeCase.tipoContrato === "CON_OPERADOR" ? "Testigo" : "Aval";
                  return (
                    <div key={p.userId} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[hsl(217,25%,9%)] border border-[hsl(217,25%,14%)]">
                      <div><p className="text-xs font-bold text-amber-400">{label}</p>
                        <p className="text-xs text-[hsl(215,20%,55%)]">{u ? `${u.nombre} ${u.apellidoPaterno}` : "—"}</p></div>
                      {signed
                        ? <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Firmado</span>
                        : <button onClick={() => {
                          const firma = { userId: p.userId, role: p.role, firma: "sig_demo", ip: "187.154.22.10", userAgent: navigator.userAgent, timestamp: new Date().toISOString(), otpValidado: true, signatureMatchScore: 0.87 };
                          update({ firmas: [...activeCase.firmas, firma] });
                        }} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400">Simular firma + OTP</button>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ABONOS */}
            {activeStep === "ABONOS" && (
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-400" />Abonos al importe de la renta</h2>
                <StepAbonos activeCase={activeCase} update={update} />
              </div>
            )}

            {/* PAGARÉ */}
            {activeStep === "PAGARE_GENERADO" && (
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2"><Stamp className="w-4 h-4 text-amber-400" />Pagaré Digital</h2>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: "Deudor", value: (() => { const r = activeCase.participants.find(p => p.role === "RESPONSABLE"); return r ? (getUserById(r.userId)?.nombre ?? "—") : "—"; })() },
                    { label: "Garante", value: (() => { const a = activeCase.participants.find(p => p.role === "AVAL"); return a ? (getUserById(a.userId)?.nombre ?? "—") : "—"; })() },
                    { label: "Monto", value: fmtMXN(activeCase.montoRenta) },
                    { label: "Vencimiento", value: activeCase.fechaFin || "—" },
                    { label: "No. Pagaré", value: activeCase.pagareNumero || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-[hsl(217,25%,8%)] rounded-xl px-3 py-2">
                      <p className="text-[hsl(215,20%,40%)] uppercase tracking-widest text-[9px] font-bold">{label}</p>
                      <p className="text-[hsl(210,40%,80%)] mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EVIDENCE PACK */}
            {activeStep === "EVIDENCE_PACK" && (
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2"><Package className="w-4 h-4 text-amber-400" />Evidence Pack — Defensa Legal</h2>
                {activeCase.evidencePack.generado ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Face Match",    value: `${(activeCase.evidencePack.faceMatchScore * 100).toFixed(0)}%` },
                      { label: "OTP Validado",  value: activeCase.evidencePack.otpValidated ? "✅ Sí" : "❌ No" },
                      { label: "Contrato",      value: activeCase.contratoNumero || "—" },
                      { label: "Pagaré",        value: activeCase.pagareNumero || "—" },
                      { label: "IPs",           value: activeCase.evidencePack.ipLogs.join(", ") },
                      { label: "Firmas",        value: `${activeCase.firmas.length} firmante(s)` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-3 py-2">
                        <p className="text-[hsl(215,20%,40%)] uppercase tracking-widest text-[9px] font-bold">{label}</p>
                        <p className="text-emerald-400 mt-0.5 font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-[hsl(215,20%,45%)] text-center py-4">Avanza el paso para generar el Evidence Pack.</p>}
              </div>
            )}

            {/* ACTIVO / CERRADO */}
            {(activeStep === "ACTIVO" || activeStep === "CERRADO" || activeStep === "CANCELADO") && (
              <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2"><Car className="w-4 h-4 text-amber-400" />Estado de la Renta</h2>
                <div className={cn("flex items-center gap-3 px-4 py-4 rounded-xl border",
                  activeStep === "ACTIVO" ? "bg-emerald-500/8 border-emerald-500/20"
                  : activeStep === "CERRADO" ? "bg-[hsl(217,25%,9%)] border-[hsl(217,25%,15%)]" : "bg-red-500/8 border-red-500/20")}>
                  <Car className={cn("w-6 h-6", activeStep === "ACTIVO" ? "text-emerald-400" : activeStep === "CERRADO" ? "text-[hsl(215,20%,50%)]" : "text-red-400")} />
                  <div>
                    <p className="text-sm font-bold text-[hsl(210,40%,90%)]">
                      {activeStep === "ACTIVO" ? "Renta activa en curso" : activeStep === "CERRADO" ? "Renta finalizada" : "Renta cancelada"}
                    </p>
                    <p className="text-xs text-[hsl(215,20%,45%)]">{activeCase.fechaInicio} → {activeCase.fechaFin}</p>
                  </div>
                </div>

                {activeStep === "ACTIVO" && (
                  <>
                    {/* Cierre form */}
                    <div className="flex flex-col gap-3 border-t border-amber-500/10 pt-4">
                      <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest">Cierre de reservación</p>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Incidentes / Observaciones</label>
                        <textarea rows={3} value={activeCase.cierreIncidentes}
                          onChange={(e) => update({ cierreIncidentes: e.target.value })}
                          placeholder="Registrar cualquier incidente, daño o comentario relevante…"
                          className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2 text-xs outline-none focus:border-amber-500/50 resize-none" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Calificación del responsable</label>
                        <StarRating value={activeCase.cierreCalificacion} onChange={(n) => update({ cierreCalificacion: n })} />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => update({ status: "CERRADO" })}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-[hsl(217,25%,12%)] border border-[hsl(217,25%,20%)] text-[hsl(215,20%,60%)] hover:text-amber-400 transition-all">
                          Marcar como cerrado
                        </button>
                        <button onClick={() => update({ status: "CANCELADO" })}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all">
                          Cancelar renta
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeStep === "CERRADO" && activeCase.cierreCalificacion > 0 && (
                  <div className="flex items-center gap-2 text-xs text-[hsl(215,20%,50%)]">
                    <span>Calificación:</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={cn("w-3.5 h-3.5", n <= activeCase.cierreCalificacion ? "text-amber-400 fill-amber-400" : "text-[hsl(215,20%,25%)]")} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar — shown for non-reservación steps */}
          {!isReservacion && (
            <div className="lg:col-span-1">
              <ReservacionSidebar activeCase={activeCase} vehicles={vehicles} />
            </div>
          )}
        </div>
      </div>
    </NavShell>
  );
}
