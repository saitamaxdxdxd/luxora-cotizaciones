/**
 * LUXORA — Módulo de Vehículos (Supabase)
 *
 * Lifecycle del vehículo: info, seguro, verificación, mantenimiento, impuestos, alertas.
 * NOTA: `checkVehicleAlerts`/`getAlertsBy` siguen en el store legacy (localStorage) —
 *       pendientes de migración en una fase posterior.
 */
import { useState, useEffect, useRef } from "react";
import {
  Car, Plus, Search, Trash2, ArrowLeft, CheckCircle2, AlertTriangle, Wrench,
  Upload, RefreshCw, Shield, FileCheck, DollarSign, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavShell } from "@/components/luxora/NavShell";
import {
  type Vehicle, type VehicleStatus,
  type VehicleInsurance, type VehicleVerification, type VehicleMaintenance, type VehicleTax,
  getVehicles, saveVehicle, createVehicle, deleteVehicle,
  getVehicleInsurancesBy, saveVehicleInsurance, createVehicleInsurance, deleteVehicleInsurance,
  getVehicleVerificationsBy, saveVehicleVerification, createVehicleVerification, deleteVehicleVerification,
  getVehicleMaintenancesBy, saveVehicleMaintenance, createVehicleMaintenance, deleteVehicleMaintenance,
  getVehicleTaxesBy, saveVehicleTax, createVehicleTax, deleteVehicleTax,
} from "@/lib/stores/vehicles";
// Alertas siguen en el store legacy por ahora
import { checkVehicleAlerts, getAlertsBy } from "@/lib/store";
import { compressImage } from "@/lib/imageUtils";
import { getVehicleHealth, isVehicleOperational, getDaysUntilExpiration, formatDateDifference } from "@/lib/vehicleLifecycle";

const STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string }> = {
  DISPONIBLE:     { label: "Disponible",    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  RENTADO:        { label: "Rentado",       color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  MANTENIMIENTO:  { label: "Mantenimiento", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  INACTIVO:       { label: "Inactivo",      color: "text-[hsl(215,20%,50%)] bg-[hsl(217,25%,10%)] border-[hsl(217,25%,18%)]" },
};

function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all" />
    </div>
  );
}

function FotoUpload({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      const compressed = await compressImage(raw, "document");
      onChange(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Fotografía del vehículo</span>
      {value ? (
        <div className="rounded-xl overflow-hidden border border-emerald-500/25 relative">
          <img src={value} alt="Vehículo" className="w-full h-40 object-cover" />
          <div className="absolute top-2 right-2 flex gap-1">
            <button onClick={() => ref.current?.click()} className="p-1.5 rounded-lg bg-[hsl(217,25%,12%)] text-amber-400 hover:bg-amber-500/10 transition-colors"><RefreshCw className="w-3 h-3" /></button>
            <button onClick={() => onChange("")} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} className="flex flex-col items-center gap-2 p-8 rounded-xl border border-dashed border-[hsl(217,25%,20%)] hover:border-amber-500/40 hover:bg-amber-500/3 transition-all text-[hsl(215,20%,45%)] hover:text-amber-400">
          <Upload className="w-6 h-6" /><span className="text-xs">Subir foto del vehículo</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}

export default function Vehiculos() {
  // ─── State ────────────────────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "form">("list");
  const [active, setActive] = useState<Vehicle | null>(null);
  const [savingActive, setSavingActive] = useState(false);

  // Form-specific state
  const [tab, setTab] = useState<"info" | "insurance" | "verification" | "maintenance" | "taxes" | "alerts">("info");
  const [editInsurance, setEditInsurance] = useState<VehicleInsurance | null>(null);
  const [editVerification, setEditVerification] = useState<VehicleVerification | null>(null);
  const [editMaintenance, setEditMaintenance] = useState<VehicleMaintenance | null>(null);
  const [editTax, setEditTax] = useState<VehicleTax | null>(null);

  // Sub-listas (cargadas async cuando hay vehículo activo)
  const [insurances, setInsurances] = useState<VehicleInsurance[]>([]);
  const [verifications, setVerifications] = useState<VehicleVerification[]>([]);
  const [maintenances, setMaintenances] = useState<VehicleMaintenance[]>([]);
  const [taxes, setTaxes] = useState<VehicleTax[]>([]);

  // ─── Effects ──────────────────────────────────────────────────────────────
  const reloadList = async () => {
    setLoadingList(true);
    const list = await getVehicles();
    setVehicles(list);
    setLoadingList(false);
  };
  useEffect(() => { void reloadList(); }, []);

  // Cargar sub-listas cuando cambia el vehículo activo (solo si está persistido — tiene createdAt real)
  useEffect(() => {
    if (!active?.id) return;
    void reloadSub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const reloadSub = async () => {
    if (!active?.id) return;
    const [ins, ver, mai, tax] = await Promise.all([
      getVehicleInsurancesBy(active.id),
      getVehicleVerificationsBy(active.id),
      getVehicleMaintenancesBy(active.id),
      getVehicleTaxesBy(active.id),
    ]);
    setInsurances(ins);
    setVerifications(ver);
    setMaintenances(mai);
    setTaxes(tax);
  };

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    return `${v.marca} ${v.modelo} ${v.placas} ${v.color}`.toLowerCase().includes(q);
  });

  const openNew = () => { setActive(createVehicle()); setView("form"); };
  const openEdit = (v: Vehicle) => { setActive(v); setView("form"); };
  const goBack = () => {
    setView("list");
    setActive(null);
    setTab("info");
    setEditInsurance(null); setEditVerification(null);
    setEditMaintenance(null); setEditTax(null);
    setInsurances([]); setVerifications([]); setMaintenances([]); setTaxes([]);
    void reloadList();
  };

  // Local-only update — no autosave (se persiste con el botón Guardar)
  const update = (fields: Partial<Vehicle>) => {
    setActive((prev) => (prev ? { ...prev, ...fields } : prev));
  };

  const handleSaveVehicle = async () => {
    if (!active) return;
    setSavingActive(true);
    const saved = await saveVehicle(active);
    setSavingActive(false);
    if (saved) goBack();
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("¿Eliminar este vehículo? Esta acción no se puede deshacer.")) return;
    const ok = await deleteVehicle(id);
    if (ok) void reloadList();
  };

  const handleStatusChange = async (v: Vehicle, status: VehicleStatus) => {
    await saveVehicle({ ...v, status });
    void reloadList();
  };

  // ─── Render: List ─────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <NavShell>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-[hsl(210,40%,95%)]">Vehículos</h1>
              <p className="text-sm text-[hsl(215,20%,45%)] mt-0.5">Flota disponible para asignar a casos de renta</p>
            </div>
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
              <Plus className="w-4 h-4" /> Agregar vehículo
            </button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,40%)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por marca, modelo, placas…"
              className="w-full bg-[hsl(217,25%,8%)] text-[hsl(210,40%,90%)] placeholder:text-[hsl(215,20%,38%)] rounded-xl border border-[hsl(217,25%,13%)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-all" />
          </div>

          {loadingList ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
              <p className="text-[hsl(215,20%,50%)] text-sm">Cargando flota…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((v) => {
                const sc = STATUS_CONFIG[v.status];
                return (
                  <div key={v.id} onClick={() => openEdit(v)}
                    className="glass-card rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all border border-transparent cursor-pointer group">
                    <div className="h-36 bg-[hsl(217,25%,9%)] flex items-center justify-center overflow-hidden">
                      {v.foto ? <img src={v.foto} alt="" className="w-full h-full object-cover" /> : <Car className="w-10 h-10 text-amber-500/20" />}
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-[hsl(210,40%,92%)] text-sm">{v.marca} {v.modelo}</p>
                          <p className="text-xs text-[hsl(215,20%,50%)]">{v.anio} · {v.color} · {v.placas}</p>
                        </div>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0", sc.color)}>{sc.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-black text-amber-400">${v.rentaDia.toLocaleString()}<span className="text-xs font-normal text-[hsl(215,20%,45%)]">/día</span></p>
                        <p className="text-xs text-[hsl(215,20%,45%)]">{v.kilometraje.toLocaleString()} km</p>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <button onClick={(e) => { e.stopPropagation(); void handleDeleteVehicle(v.id); }}
                          className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <select value={v.status} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => { void handleStatusChange(v, e.target.value as VehicleStatus); }}
                          className="text-[10px] bg-transparent border-0 text-[hsl(215,20%,50%)] outline-none cursor-pointer hover:text-amber-400 transition-colors">
                          <option value="DISPONIBLE">Disponible</option>
                          <option value="RENTADO">Rentado</option>
                          <option value="MANTENIMIENTO">Mantenimiento</option>
                          <option value="INACTIVO">Inactivo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-3 glass-card rounded-2xl p-12 text-center">
                  <Car className="w-12 h-12 text-amber-500/20 mx-auto mb-3" />
                  <p className="text-[hsl(215,20%,50%)] text-sm">{vehicles.length === 0 ? "No hay vehículos en la flota" : "Sin resultados"}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </NavShell>
    );
  }

  // ─── Render: Form ─────────────────────────────────────────────────────────
  if (!active) return null;

  const alerts = getAlertsBy("vehicle", active.id);
  const lifecycleDeps = { insurances, verifications, maintenances, taxes, alerts };
  const health = getVehicleHealth(active, lifecycleDeps);
  const _isOperational = isVehicleOperational(active, lifecycleDeps);

  const onSaveInsurance = async (upd: Partial<VehicleInsurance>) => {
    if (!editInsurance) return;
    await saveVehicleInsurance({ ...editInsurance, ...upd });
    setEditInsurance(null);
    void reloadSub();
  };
  const onDeleteInsurance = async (id: string) => {
    await deleteVehicleInsurance(id);
    setEditInsurance(null);
    void reloadSub();
  };
  const onSaveVerification = async (upd: Partial<VehicleVerification>) => {
    if (!editVerification) return;
    await saveVehicleVerification({ ...editVerification, ...upd });
    setEditVerification(null);
    void reloadSub();
  };
  const onDeleteVerification = async (id: string) => {
    await deleteVehicleVerification(id);
    setEditVerification(null);
    void reloadSub();
  };
  const onSaveMaintenance = async (upd: Partial<VehicleMaintenance>) => {
    if (!editMaintenance) return;
    await saveVehicleMaintenance({ ...editMaintenance, ...upd });
    setEditMaintenance(null);
    void reloadSub();
  };
  const onDeleteMaintenance = async (id: string) => {
    await deleteVehicleMaintenance(id);
    setEditMaintenance(null);
    void reloadSub();
  };
  const onSaveTax = async (upd: Partial<VehicleTax>) => {
    if (!editTax) return;
    await saveVehicleTax({ ...editTax, ...upd });
    setEditTax(null);
    void reloadSub();
  };
  const onDeleteTax = async (id: string) => {
    await deleteVehicleTax(id);
    setEditTax(null);
    void reloadSub();
  };

  return (
    <NavShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 rounded-xl text-[hsl(215,20%,50%)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
            <div>
              <h1 className="font-bold text-lg text-[hsl(210,40%,95%)]">
                {active.marca ? `${active.marca} ${active.modelo} ${active.anio}` : "Nuevo Vehículo"}
              </h1>
              <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">{active.placas}</p>
            </div>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5",
            health.overall === "healthy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
            : health.overall === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
            : "bg-red-500/10 text-red-400 border border-red-500/25"
          )}>
            <AlertCircle className="w-3.5 h-3.5" />
            {health.overall === "healthy" ? "Sano" : health.overall === "warning" ? "Atención" : "Crítico"}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "info" as const, label: "Información", icon: Car, badge: undefined },
            { id: "insurance" as const, label: "Seguro", icon: Shield, badge: insurances.length },
            { id: "verification" as const, label: "Verificación", icon: FileCheck, badge: verifications.length },
            { id: "maintenance" as const, label: "Mantenimiento", icon: Wrench, badge: maintenances.length },
            { id: "taxes" as const, label: "Impuestos", icon: DollarSign, badge: taxes.length },
            { id: "alerts" as const, label: "Alertas", icon: AlertTriangle, badge: alerts.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0",
                tab === t.id
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-[hsl(217,25%,10%)] text-[hsl(215,20%,50%)] border border-transparent hover:border-amber-500/20"
              )}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge !== undefined && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-[hsl(217,25%,15%)] text-[10px]">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          {/* INFO TAB */}
          {tab === "info" && (
            <>
              <FotoUpload value={active.foto} onChange={(v) => update({ foto: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Marca" value={active.marca} onChange={(v) => update({ marca: v })} placeholder="Toyota" />
                <Field label="Modelo" value={active.modelo} onChange={(v) => update({ modelo: v })} placeholder="Hiace" />
                <Field label="Año" value={active.anio} onChange={(v) => update({ anio: +v })} type="number" placeholder="2024" />
                <Field label="Color" value={active.color} onChange={(v) => update({ color: v })} placeholder="Blanco" />
                <Field label="Placas" value={active.placas} onChange={(v) => update({ placas: v.toUpperCase() })} placeholder="ABC-123-D" />
                <Field label="VIN" value={active.vin} onChange={(v) => update({ vin: v.toUpperCase() })} placeholder="JT2BF19K..." />
                <Field label="Kilometraje" value={active.kilometraje} onChange={(v) => update({ kilometraje: +v })} type="number" placeholder="0" />
                <Field label="Renta por día ($MXN)" value={active.rentaDia} onChange={(v) => update({ rentaDia: +v })} type="number" placeholder="2400" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Estado</label>
                <select value={active.status} onChange={(e) => update({ status: e.target.value as VehicleStatus })}
                  className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="RENTADO">Rentado</option>
                  <option value="MANTENIMIENTO">Mantenimiento</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>

              <div>
                <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Datos para Cotización</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Capacidad de Pasajeros" value={active.capacidadPasajeros} onChange={(v) => update({ capacidadPasajeros: +v })} type="number" placeholder="5" />
                  <Field label="Rendimiento (km/litro)" value={active.fuelEfficiencyKmPerLiter} onChange={(v) => update({ fuelEfficiencyKmPerLiter: +v })} type="number" placeholder="10" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Tipo de Combustible</label>
                    <select value={active.fuelType} onChange={(e) => update({ fuelType: e.target.value as Vehicle["fuelType"] })}
                      className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                      <option value="magna">Magna</option>
                      <option value="premium">Premium</option>
                      <option value="diesel">Diesel</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Categoría</label>
                    <select value={active.vehicleCategory} onChange={(e) => update({ vehicleCategory: e.target.value as Vehicle["vehicleCategory"] })}
                      className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                      <option value="suv">SUV</option>
                      <option value="van">Van</option>
                      <option value="sprinter">Sprinter</option>
                      <option value="executive">Ejecutivo</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Uso Ideal</label>
                    <select value={active.idealUseType} onChange={(e) => update({ idealUseType: e.target.value as Vehicle["idealUseType"] })}
                      className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                      <option value="airport">Aeropuerto</option>
                      <option value="executive">Ejecutivo</option>
                      <option value="tourism">Turismo</option>
                      <option value="long_distance">Larga Distancia</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Notas</label>
                <textarea value={active.notas} onChange={(e) => update({ notas: e.target.value })} rows={2}
                  placeholder="Capacidad, equipamiento, condiciones especiales…"
                  className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2 text-sm outline-none focus:border-amber-500/50 transition-all resize-none" />
              </div>
            </>
          )}

          {/* INSURANCE TAB */}
          {tab === "insurance" && (
            editInsurance ? (
              <InsuranceForm
                insurance={editInsurance}
                onSave={onSaveInsurance}
                onDelete={onDeleteInsurance}
                onCancel={() => setEditInsurance(null)}
              />
            ) : (
              <>
                <button onClick={() => setEditInsurance(createVehicleInsurance(active.id))}
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all">
                  <Plus className="w-4 h-4" /> Agregar póliza
                </button>
                <div className="space-y-2">
                  {insurances.map((ins) => (
                    <div key={ins.id} onClick={() => setEditInsurance(ins)} className="p-4 rounded-xl border border-[hsl(217,25%,18%)] hover:border-amber-500/25 cursor-pointer transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-[hsl(210,40%,93%)]">{ins.insuranceCompany}</p>
                          <p className="text-xs text-[hsl(215,20%,45%)]">Vence: {ins.expirationDate}</p>
                          <p className="text-xs text-amber-400 mt-1">${ins.annualCost.toLocaleString()} MXN/año</p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full",
                          getDaysUntilExpiration(ins.expirationDate) <= 0 ? "bg-red-500/15 text-red-400"
                          : getDaysUntilExpiration(ins.expirationDate) <= 30 ? "bg-amber-500/15 text-amber-400"
                          : "bg-emerald-500/15 text-emerald-400"
                        )}>
                          {formatDateDifference(getDaysUntilExpiration(ins.expirationDate))}
                        </span>
                      </div>
                    </div>
                  ))}
                  {insurances.length === 0 && <p className="text-xs text-[hsl(215,20%,45%)] text-center py-4">Sin pólizas registradas</p>}
                </div>
              </>
            )
          )}

          {/* VERIFICATION TAB */}
          {tab === "verification" && (
            editVerification ? (
              <VerificationForm
                verification={editVerification}
                onSave={onSaveVerification}
                onDelete={onDeleteVerification}
                onCancel={() => setEditVerification(null)}
              />
            ) : (
              <>
                <button onClick={() => setEditVerification(createVehicleVerification(active.id))}
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all">
                  <Plus className="w-4 h-4" /> Registrar verificación
                </button>
                <div className="space-y-2">
                  {verifications.map((ver) => (
                    <div key={ver.id} onClick={() => setEditVerification(ver)} className="p-4 rounded-xl border border-[hsl(217,25%,18%)] hover:border-amber-500/25 cursor-pointer transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-[hsl(210,40%,93%)]">Verificación {ver.hologramType}</p>
                          <p className="text-xs text-[hsl(215,20%,45%)]">Realizada: {ver.verificationDate} · Válida: {ver.monthsValid} meses</p>
                          <p className="text-xs text-amber-400 mt-1">Vence: {ver.expirationDate}</p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full",
                          getDaysUntilExpiration(ver.expirationDate) <= 0 ? "bg-red-500/15 text-red-400"
                          : getDaysUntilExpiration(ver.expirationDate) <= 30 ? "bg-amber-500/15 text-amber-400"
                          : "bg-emerald-500/15 text-emerald-400"
                        )}>
                          {formatDateDifference(getDaysUntilExpiration(ver.expirationDate))}
                        </span>
                      </div>
                    </div>
                  ))}
                  {verifications.length === 0 && <p className="text-xs text-[hsl(215,20%,45%)] text-center py-4">Sin verificaciones registradas</p>}
                </div>
              </>
            )
          )}

          {/* MAINTENANCE TAB */}
          {tab === "maintenance" && (
            editMaintenance ? (
              <MaintenanceForm
                maintenance={editMaintenance}
                onSave={onSaveMaintenance}
                onDelete={onDeleteMaintenance}
                onCancel={() => setEditMaintenance(null)}
              />
            ) : (
              <>
                <button onClick={() => setEditMaintenance(createVehicleMaintenance(active.id))}
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all">
                  <Plus className="w-4 h-4" /> Registrar mantenimiento
                </button>
                <div className="space-y-2">
                  {[...maintenances].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()).map((maint) => (
                    <div key={maint.id} onClick={() => setEditMaintenance(maint)} className="p-4 rounded-xl border border-[hsl(217,25%,18%)] hover:border-amber-500/25 cursor-pointer transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-[hsl(210,40%,93%)]">{maint.type === "oil_change" ? "Cambio de aceite"
                            : maint.type === "brakes" ? "Frenos"
                            : maint.type === "tires" ? "Llantas"
                            : maint.type === "inspection" ? "Inspección"
                            : maint.type === "alignment" ? "Alineación"
                            : "Otro"}</p>
                          <p className="text-xs text-[hsl(215,20%,45%)]">{maint.serviceDate} · {maint.mileage.toLocaleString()} km</p>
                          <p className="text-xs text-amber-400 mt-1">Próximo: {maint.nextServiceMileage.toLocaleString()} km o {maint.nextServiceDate}</p>
                          <p className="text-xs text-emerald-400 mt-1">${maint.cost.toLocaleString()} MXN</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {maintenances.length === 0 && <p className="text-xs text-[hsl(215,20%,45%)] text-center py-4">Sin registros de mantenimiento</p>}
                </div>
              </>
            )
          )}

          {/* TAXES TAB */}
          {tab === "taxes" && (
            editTax ? (
              <TaxForm
                tax={editTax}
                onSave={onSaveTax}
                onDelete={onDeleteTax}
                onCancel={() => setEditTax(null)}
              />
            ) : (
              <>
                <button onClick={() => setEditTax(createVehicleTax(active.id))}
                  className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all">
                  <Plus className="w-4 h-4" /> Agregar impuesto
                </button>
                <div className="space-y-2">
                  {taxes.map((tax) => (
                    <div key={tax.id} onClick={() => setEditTax(tax)} className="p-4 rounded-xl border border-[hsl(217,25%,18%)] hover:border-amber-500/25 cursor-pointer transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-[hsl(210,40%,93%)]">{tax.type === "tenencia" ? "Tenencia" : "Refrendo"} {tax.year}</p>
                          <p className="text-xs text-[hsl(215,20%,45%)]">Vence: {tax.dueDate}</p>
                          <p className={cn("text-xs mt-1 font-semibold", tax.paid ? "text-emerald-400" : "text-red-400")}>
                            {tax.paid ? "Pagado" : "Pendiente"} · ${tax.amount.toLocaleString()} MXN
                          </p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full",
                          tax.paid ? "bg-emerald-500/15 text-emerald-400"
                          : getDaysUntilExpiration(tax.dueDate) <= 0 ? "bg-red-500/15 text-red-400"
                          : getDaysUntilExpiration(tax.dueDate) <= 30 ? "bg-amber-500/15 text-amber-400"
                          : "bg-blue-500/15 text-blue-400"
                        )}>
                          {tax.paid ? "✓ Pagado" : formatDateDifference(getDaysUntilExpiration(tax.dueDate))}
                        </span>
                      </div>
                    </div>
                  ))}
                  {taxes.length === 0 && <p className="text-xs text-[hsl(215,20%,45%)] text-center py-4">Sin impuestos registrados</p>}
                </div>
              </>
            )
          )}

          {/* ALERTS TAB */}
          {tab === "alerts" && (
            <div className="space-y-2">
              <button onClick={() => checkVehicleAlerts()}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all">
                <RefreshCw className="w-4 h-4" /> Actualizar alertas
              </button>
              {alerts.length === 0 ? (
                <p className="text-xs text-[hsl(215,20%,45%)] text-center py-8">Sin alertas activas</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    "p-4 rounded-xl border",
                    alert.severity === "high" ? "border-red-500/25 bg-red-500/5"
                    : alert.severity === "medium" ? "border-amber-500/25 bg-amber-500/5"
                    : "border-blue-500/25 bg-blue-500/5"
                  )}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className={cn("font-semibold text-sm",
                          alert.severity === "high" ? "text-red-400"
                          : alert.severity === "medium" ? "text-amber-400"
                          : "text-blue-400"
                        )}>{alert.title}</p>
                        <p className="text-xs text-[hsl(215,20%,50%)] mt-1">{alert.description}</p>
                        <p className="text-xs text-[hsl(215,20%,40%)] mt-1">Vencimiento: {alert.dueDate}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-amber-500/10">
            <button onClick={goBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 hover:text-amber-400 transition-all">
              <ArrowLeft className="w-4 h-4" />Volver
            </button>
            {tab === "info" && (
              <button onClick={() => void handleSaveVehicle()} disabled={savingActive}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 disabled:opacity-50 transition-all">
                {savingActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Guardar vehículo
              </button>
            )}
          </div>
        </div>
      </div>
    </NavShell>
  );
}

// ─── INSURANCE FORM ────────────────────────────────────────────────────────────

function InsuranceForm({ insurance, onSave, onDelete, onCancel }: { insurance: VehicleInsurance; onSave: (u: Partial<VehicleInsurance>) => void; onDelete: (id: string) => void; onCancel: () => void }) {
  const [data, setData] = useState(insurance);
  return (
    <>
      <div className="space-y-3">
        <Field label="Compañía de seguros" value={data.insuranceCompany} onChange={(v) => setData({ ...data, insuranceCompany: v })} placeholder="Seguros XYZ" />
        <Field label="Teléfono" value={data.phone} onChange={(v) => setData({ ...data, phone: v })} placeholder="5551234567" />
        <Field label="Costo anual ($MXN)" value={data.annualCost} onChange={(v) => setData({ ...data, annualCost: +v })} type="number" placeholder="15000" />
        <Field label="Fecha de inicio (YYYY-MM-DD)" value={data.startDate} onChange={(v) => setData({ ...data, startDate: v })} type="date" />
        <Field label="Fecha de vencimiento (YYYY-MM-DD)" value={data.expirationDate} onChange={(v) => setData({ ...data, expirationDate: v })} type="date" />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-amber-500/70 uppercase">Notas</label>
          <textarea value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} rows={2}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2 text-sm outline-none focus:border-amber-500/50 transition-all resize-none" />
        </div>
      </div>
      <div className="flex justify-between pt-2 border-t border-amber-500/10">
        <button onClick={() => onDelete(data.id)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-4 h-4" /> Eliminar
        </button>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 transition-all">
            Cancelar
          </button>
          <button onClick={() => onSave(data)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
            <CheckCircle2 className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── VERIFICATION FORM ────────────────────────────────────────────────────────

function VerificationForm({ verification, onSave, onDelete, onCancel }: { verification: VehicleVerification; onSave: (u: Partial<VehicleVerification>) => void; onDelete: (id: string) => void; onCancel: () => void }) {
  const [data, setData] = useState(verification);
  return (
    <>
      <div className="space-y-3">
        <Field label="Fecha de verificación (YYYY-MM-DD)" value={data.verificationDate} onChange={(v) => setData({ ...data, verificationDate: v })} type="date" />
        <Field label="Meses válidos" value={data.monthsValid} onChange={(v) => setData({ ...data, monthsValid: +v })} type="number" placeholder="12" />
        <Field label="Color de engomado" value={data.holomgramColor} onChange={(v) => setData({ ...data, holomgramColor: v })} placeholder="Verde" />
        <Field label="Tipo de engomado" value={data.hologramType} onChange={(v) => setData({ ...data, hologramType: v })} placeholder="2024" />
        <Field label="Fecha de vencimiento (YYYY-MM-DD)" value={data.expirationDate} onChange={(v) => setData({ ...data, expirationDate: v })} type="date" />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-amber-500/70 uppercase">Notas</label>
          <textarea value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} rows={2}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2 text-sm outline-none focus:border-amber-500/50 transition-all resize-none" />
        </div>
      </div>
      <div className="flex justify-between pt-2 border-t border-amber-500/10">
        <button onClick={() => onDelete(data.id)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-4 h-4" /> Eliminar
        </button>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 transition-all">
            Cancelar
          </button>
          <button onClick={() => onSave(data)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
            <CheckCircle2 className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── MAINTENANCE FORM ─────────────────────────────────────────────────────────

function MaintenanceForm({ maintenance, onSave, onDelete, onCancel }: { maintenance: VehicleMaintenance; onSave: (u: Partial<VehicleMaintenance>) => void; onDelete: (id: string) => void; onCancel: () => void }) {
  const [data, setData] = useState(maintenance);
  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-amber-500/70 uppercase">Tipo</label>
          <select value={data.type} onChange={(e) => setData({ ...data, type: e.target.value as VehicleMaintenance["type"] })}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
            <option value="oil_change">Cambio de aceite</option>
            <option value="brakes">Frenos</option>
            <option value="tires">Llantas</option>
            <option value="inspection">Inspección</option>
            <option value="alignment">Alineación</option>
            <option value="custom">Otro</option>
          </select>
        </div>
        <Field label="Kilometraje (km)" value={data.mileage} onChange={(v) => setData({ ...data, mileage: +v })} type="number" placeholder="0" />
        <Field label="Fecha de servicio (YYYY-MM-DD)" value={data.serviceDate} onChange={(v) => setData({ ...data, serviceDate: v })} type="date" />
        <Field label="Próximo km de servicio" value={data.nextServiceMileage} onChange={(v) => setData({ ...data, nextServiceMileage: +v })} type="number" placeholder="5000" />
        <Field label="Próximo servicio aprox. (YYYY-MM-DD)" value={data.nextServiceDate} onChange={(v) => setData({ ...data, nextServiceDate: v })} type="date" />
        <Field label="Costo ($MXN)" value={data.cost} onChange={(v) => setData({ ...data, cost: +v })} type="number" placeholder="500" />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-amber-500/70 uppercase">Notas</label>
          <textarea value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} rows={2}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2 text-sm outline-none focus:border-amber-500/50 transition-all resize-none" />
        </div>
      </div>
      <div className="flex justify-between pt-2 border-t border-amber-500/10">
        <button onClick={() => onDelete(data.id)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-4 h-4" /> Eliminar
        </button>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 transition-all">
            Cancelar
          </button>
          <button onClick={() => onSave(data)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
            <CheckCircle2 className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── TAX FORM ─────────────────────────────────────────────────────────────────

function TaxForm({ tax, onSave, onDelete, onCancel }: { tax: VehicleTax; onSave: (u: Partial<VehicleTax>) => void; onDelete: (id: string) => void; onCancel: () => void }) {
  const [data, setData] = useState(tax);
  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-amber-500/70 uppercase">Tipo</label>
          <select value={data.type} onChange={(e) => setData({ ...data, type: e.target.value as VehicleTax["type"] })}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
            <option value="tenencia">Tenencia</option>
            <option value="refrendo">Refrendo</option>
          </select>
        </div>
        <Field label="Año" value={data.year} onChange={(v) => setData({ ...data, year: +v })} type="number" placeholder="2024" />
        <Field label="Monto ($MXN)" value={data.amount} onChange={(v) => setData({ ...data, amount: +v })} type="number" placeholder="0" />
        <Field label="Fecha de vencimiento (YYYY-MM-DD)" value={data.dueDate} onChange={(v) => setData({ ...data, dueDate: v })} type="date" />
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={data.paid} onChange={(e) => setData({ ...data, paid: e.target.checked })} className="w-4 h-4 rounded" />
          <label className="text-sm text-[hsl(210,40%,90%)]">Pagado</label>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-amber-500/70 uppercase">Notas</label>
          <textarea value={data.notes} onChange={(e) => setData({ ...data, notes: e.target.value })} rows={2}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2 text-sm outline-none focus:border-amber-500/50 transition-all resize-none" />
        </div>
      </div>
      <div className="flex justify-between pt-2 border-t border-amber-500/10">
        <button onClick={() => onDelete(data.id)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-4 h-4" /> Eliminar
        </button>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 transition-all">
            Cancelar
          </button>
          <button onClick={() => onSave(data)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
            <CheckCircle2 className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>
    </>
  );
}
