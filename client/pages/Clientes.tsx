/**
 * LUXORA — Módulo de Registro de Clientes con KYC.
 * Flujo: Paso 0 (Generales, OPCIONAL) → Paso 1 (Docs + Biometría) → Paso 2 (Verificar / Auto-fill OCR) → Paso 3 (Resultado)
 */

import { useState, useEffect, useRef } from "react";
import {
  Users, Plus, Search, ChevronRight, Shield, CheckCircle2,
  AlertTriangle, XCircle, Clock, User, FileText, Camera,
  BarChart3, Upload, Trash2, ArrowLeft, Eye, Scan, Loader2,
  BadgeCheck, Info, RefreshCw, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavShell } from "@/components/luxora/NavShell";
import { CameraCapture } from "@/components/clientes/CameraCapture";
import {
  type Cliente, getClientes, saveCliente, createCliente,
  deleteCliente, calcularRiesgo,
} from "@/lib/store";

// ─── Constantes ──────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  APPROVED: { label: "Aprobado",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle2 },
  REVIEW:   { label: "Revisión",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20",      icon: AlertTriangle },
  REJECTED: { label: "Rechazado", color: "text-red-400 bg-red-500/10 border-red-500/20",            icon: XCircle },
  PENDING:  { label: "Pendiente", color: "text-[hsl(215,20%,50%)] bg-[hsl(217,25%,10%)] border-[hsl(217,25%,18%)]", icon: Clock },
};

const STEPS = [
  { id: 0, label: "Generales", icon: User,       optional: true },
  { id: 1, label: "Docs + Bio", icon: FileText,  optional: false },
  { id: 2, label: "Verificar",  icon: Scan,       optional: false },
  { id: 3, label: "Resultado",  icon: BarChart3,  optional: false },
];

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco",
  "México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
  "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala",
  "Veracruz","Yucatán","Zacatecas",
];

const ACTIVIDADES = [
  "Empleado",
  "Trabajador independiente / Freelancer",
  "Empresario / Dueño de negocio",
  "Profesionista (médico, abogado, etc.)",
  "Comerciante",
  "Agricultor / Ganadero",
  "Estudiante",
  "Jubilado / Pensionado",
  "Ama de casa",
  "Otro",
];

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function DocUpload({ label, value, onChange, highlight = false }: {
  label: string; value: string; onChange: (v: string) => void; highlight?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Reset file input value so the same file can be re-selected after clearing
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-selecting same file
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn(
        "text-xs font-semibold uppercase tracking-widest",
        highlight && !value ? "text-amber-400" : "text-amber-500/70"
      )}>
        {label}{highlight && !value && " ●"}
      </span>
      {value ? (
        <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-emerald-500/5">
          {value.startsWith("data:image") ? (
            <img src={value} alt={label} className="w-full h-28 object-cover" />
          ) : (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /><span>Archivo cargado</span>
            </div>
          )}
          {/* Cambiar / Eliminar */}
          <div className="flex border-t border-emerald-500/15">
            <button type="button" onClick={() => inputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
              <RefreshCw className="w-3 h-3" />Cambiar
            </button>
            <div className="w-px bg-emerald-500/15" />
            <button type="button" onClick={() => onChange("")}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors">
              <Trash2 className="w-3 h-3" />Eliminar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed transition-all",
            highlight
              ? "border-amber-500/50 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10"
              : "border-[hsl(217,25%,20%)] text-[hsl(215,20%,45%)] hover:border-amber-500/40 hover:bg-amber-500/3 hover:text-amber-400"
          )}>
          <Upload className="w-5 h-5" />
          <span className="text-xs">{highlight ? "Requerido — Seleccionar" : "Seleccionar archivo"}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
    </div>
  );
}

/** Simula un score de MATCH biométrico entre selfie e INE (demo; en producción: DeepFace API) */
function matchScore(selfie: string, ine: string): number {
  if (!selfie || !ine) return 0;
  // Deterministic "score" varying per pair, range 62–97
  const a = selfie.charCodeAt(selfie.length - 4) ?? 0;
  const b = ine.charCodeAt(ine.length - 4) ?? 0;
  return 62 + ((a + b + selfie.length + ine.length) % 36);
}

function MatchBadge({ score, onRetake, onReplaceDoc }: {
  score: number;
  onRetake: () => void;
  onReplaceDoc: () => void;
}) {
  const high   = score >= 82;
  const medium = score >= 68 && score < 82;
  const low    = score < 68;
  return (
    <div className={cn(
      "rounded-2xl border p-4 flex flex-col gap-3",
      high   ? "bg-emerald-500/8 border-emerald-500/20"
      : medium ? "bg-amber-500/8 border-amber-500/20"
      : "bg-red-500/8 border-red-500/20"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className={cn("w-4 h-4", high ? "text-emerald-400" : medium ? "text-amber-400" : "text-red-400")} />
          <span className="text-xs font-bold text-[hsl(210,40%,90%)]">MATCH biométrico (simulación)</span>
        </div>
        <span className={cn(
          "text-xl font-black",
          high ? "text-emerald-400" : medium ? "text-amber-400" : "text-red-400"
        )}>{score}%</span>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex-1 h-2 rounded-full bg-[hsl(217,25%,12%)] overflow-hidden">
          <div className={cn("h-full rounded-full transition-all",
            high ? "bg-emerald-500" : medium ? "bg-amber-500" : "bg-red-500"
          )} style={{ width: `${score}%` }} />
        </div>
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-widest flex-shrink-0",
          high ? "text-emerald-400" : medium ? "text-amber-400" : "text-red-400"
        )}>{high ? "Alto" : medium ? "Medio" : "Bajo"}</span>
      </div>
      {!high && (
        <div className="flex flex-col gap-2">
          <p className={cn(
            "text-xs",
            medium ? "text-amber-400/80" : "text-red-400/80"
          )}>
            {low
              ? "Score bajo — Es necesario retomar la selfie o reemplazar la imagen de la INE."
              : "Score medio — Se puede proceder pero se recomienda mejorar la calidad de la foto."}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onRetake}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-all">
              <RefreshCw className="w-3 h-3" />Retomar selfie
            </button>
            <button type="button" onClick={onReplaceDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[hsl(217,25%,12%)] border border-[hsl(217,25%,20%)] text-[hsl(215,20%,60%)] hover:border-amber-500/25 hover:text-amber-400 transition-all">
              <Upload className="w-3 h-3" />Reemplazar INE
            </button>
          </div>
        </div>
      )}
      <p className="text-[10px] text-[hsl(215,20%,35%)]">En producción: comparación facial mediante DeepFace con detección de vida (liveness check)</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", readOnly = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">{label}</label>
      <input type={type} value={value} placeholder={placeholder} readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border px-3 py-2.5 text-sm outline-none transition-all",
          readOnly
            ? "bg-[hsl(217,25%,7%)] border-[hsl(217,25%,12%)] text-[hsl(215,20%,55%)] cursor-not-allowed"
            : "bg-[hsl(217,25%,9%)] border-[hsl(217,25%,14%)] focus:border-amber-500/50 focus:shadow-[0_0_0_2px_hsla(38,92%,50%,0.10)]"
        )} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
        <option value="">— Seleccionar —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/** Busca un cliente registrado por su CURP y muestra el match */
function CurpAvalField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [match, setMatch] = useState<Cliente | null | "loading">(null);

  useEffect(() => {
    if (value.length !== 18) { setMatch(null); return; }
    setMatch("loading");
    const t = setTimeout(() => {
      const found = getClientes().find((c) => c.curp === value) ?? null;
      setMatch(found);
    }, 400);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">CURP del Aval</label>
      <input
        value={value}
        placeholder="CURP 18 caracteres (debe estar registrado)"
        maxLength={18}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 focus:shadow-[0_0_0_2px_hsla(38,92%,50%,0.10)] transition-all"
      />
      {match === "loading" && (
        <p className="text-xs text-[hsl(215,20%,45%)] flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
        </p>
      )}
      {match && match !== "loading" && (
        <p className="text-xs text-emerald-400 flex items-center gap-1">
          <BadgeCheck className="w-3.5 h-3.5" />
          Aval encontrado: <span className="font-semibold">{match.nombre} {match.apellidoPaterno} {match.apellidoMaterno}</span>
        </p>
      )}
      {match === null && value.length === 18 && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> CURP no encontrado — el aval debe registrarse como cliente primero
        </p>
      )}
    </div>
  );
}

// ─── OCR Demo Profiles ────────────────────────────────────────────────────────
// En producción: sustituir por llamada a OCR API (AWS Textract / Google Vision / Tesseract)
// Datos de ejemplo realistas para demostración del flujo KYC.

const OCR_DEMO_PROFILES = [
  {
    nombre: "Juan Carlos", apellidoPaterno: "García", apellidoMaterno: "Hernández",
    curp: "GAHJ850312HMCXRN08", rfc: "GAHJ850312HM3",
    fechaNacimiento: "1985-03-12",
    calle: "Av. Insurgentes Sur 1234 Int. 5", colonia: "Del Valle Centro",
    ciudad: "Benito Juárez", estado: "Ciudad de México", cp: "03100",
    actividadEconomica: "Empleado",
  },
  {
    nombre: "María Guadalupe", apellidoPaterno: "Rodríguez", apellidoMaterno: "López",
    curp: "ROLM920715MJCRPZ03", rfc: "ROLM920715JR5",
    fechaNacimiento: "1992-07-15",
    calle: "Calle Morelos 456", colonia: "Centro Histórico",
    ciudad: "Guadalajara", estado: "Jalisco", cp: "44100",
    actividadEconomica: "Trabajador independiente / Freelancer",
  },
  {
    nombre: "José Antonio", apellidoPaterno: "Martínez", apellidoMaterno: "Torres",
    curp: "MATJ780901HNLRRS05", rfc: "MATJ780901NL3",
    fechaNacimiento: "1978-09-01",
    calle: "Blvd. Adolfo López Mateos 789", colonia: "Jardines de la Paz",
    ciudad: "Monterrey", estado: "Nuevo León", cp: "64720",
    actividadEconomica: "Empresario / Dueño de negocio",
  },
  {
    nombre: "Ana Patricia", apellidoPaterno: "González", apellidoMaterno: "Jiménez",
    curp: "GONP951120MDFMNA01", rfc: "GONP951120DF5",
    fechaNacimiento: "1995-11-20",
    calle: "Calle Hidalgo 321", colonia: "Roma Norte",
    ciudad: "Cuauhtémoc", estado: "Ciudad de México", cp: "06700",
    actividadEconomica: "Profesionista (médico, abogado, etc.)",
  },
] as const;

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [activeCliente, setActiveCliente] = useState<Cliente | null>(null);
  const [step, setStep] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrFields, setOcrFields] = useState<Set<string>>(new Set()); // fields auto-filled by OCR
  const [ocrConflicts, setOcrConflicts] = useState<Map<string, string>>(new Map()); // key → OCR value that differs from manual
  // Track if client is new (created via startNew, not openDetail)
  const isNewRef = useRef(false);
  // Signal to CameraCapture to retake (incremented triggers a key change)
  const [cameraKey, setCameraKey] = useState(0);
  const requestRetake = () => setCameraKey((k) => k + 1);

  const reload = () => setClientes(getClientes());

  useEffect(() => {
    // One-time cleanup: remove blank clients that were saved by the old buggy code
    const all = getClientes();
    const blanks = all.filter((c) => !c.nombre && !c.curp);
    blanks.forEach((c) => deleteCliente(c.id));
    reload();
  }, []);

  // When entering step 2 (verify/auto-fill), simulate OCR processing + data extraction
  // Keep a ref to activeCliente so the OCR timeout always uses the latest value
  const activeClienteRef = useRef<typeof activeCliente>(activeCliente);
  useEffect(() => { activeClienteRef.current = activeCliente; }, [activeCliente]);

  useEffect(() => {
    if (step !== 2 || ocrDone || !activeClienteRef.current) return;
    setOcrProcessing(true);

    const t = setTimeout(() => {
      setOcrProcessing(false);
      setOcrDone(true);

      const snap = activeClienteRef.current; // latest value, no stale closure
      if (!snap) return;

      // Pick demo profile deterministically based on uploaded image data
      const seed = (snap.ineFrente.length + snap.selfie.length) % OCR_DEMO_PROFILES.length;
      const profile = OCR_DEMO_PROFILES[seed];

      // Fill empty fields; flag conflicts where manual ≠ OCR
      const filled    = new Set<string>();
      const updates: Partial<Cliente> = {};
      const conflicts = new Map<string, string>(); // field → OCR value

      const apply = (key: keyof Cliente, ocrValue: string) => {
        if (!ocrValue) return;
        const manual = ((snap[key] as string) ?? "").trim();
        if (!manual) {
          (updates as Record<string, string>)[key] = ocrValue;
          filled.add(key as string);
        } else if (manual.toLowerCase() !== ocrValue.trim().toLowerCase()) {
          conflicts.set(key as string, ocrValue.trim());
        }
      };

      apply("nombre",            profile.nombre);
      apply("apellidoPaterno",   profile.apellidoPaterno);
      apply("apellidoMaterno",   profile.apellidoMaterno);
      apply("curp",              profile.curp);
      apply("rfc",               profile.rfc);
      apply("fechaNacimiento",   profile.fechaNacimiento);
      apply("calle",             profile.calle);
      apply("colonia",           profile.colonia);
      apply("ciudad",            profile.ciudad);
      apply("estado",            profile.estado);
      apply("cp",                profile.cp);
      if (profile.actividadEconomica) apply("actividadEconomica", profile.actividadEconomica);

      if (Object.keys(updates).length > 0) {
        setActiveCliente((prev) => prev ? { ...prev, ...updates } : prev);
        setOcrFields(filled);
      }
      setOcrConflicts(conflicts);
    }, 2400);

    return () => clearTimeout(t);
  }, [step, ocrDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return `${c.nombre} ${c.apellidoPaterno} ${c.curp} ${c.rfc} ${c.email}`.toLowerCase().includes(q);
  });

  const startNew = () => {
    // createCliente() does NOT save to localStorage — only saved on first update()
    const c = createCliente();
    setActiveCliente(c);
    setStep(0);
    setOcrDone(false);
    setOcrProcessing(false);
    setOcrFields(new Set());
    setOcrConflicts(new Map());
    isNewRef.current = true;
    setView("new");
  };

  const openDetail = (c: Cliente) => {
    setActiveCliente(c);
    setStep(c.kycStep);
    setOcrDone(c.kycStep >= 2);
    setOcrFields(new Set());
    setOcrConflicts(new Map());
    isNewRef.current = false;
    setView("detail");
  };

  /** Updates state. For new clients, localStorage is only written on explicit step advancement. */
  const update = (fields: Partial<Cliente>) => {
    if (!activeCliente) return;
    const updated = { ...activeCliente, ...fields };
    setActiveCliente(updated);
    // Existing clients: auto-save every change
    // New clients: only save when nextStep() or handleSaveAndExit() is called
    if (!isNewRef.current) {
      saveCliente(updated);
    }
  };

  const skipToStep1 = () => {
    // Skip generales: go directly to docs step (no save needed yet)
    setStep(1);
  };

  const nextStep = () => {
    if (!activeCliente) return;
    const ns = step + 1;
    // Build the updated record — always persist to localStorage on step advancement
    let toSave: Cliente = { ...activeCliente, kycStep: ns };
    if (ns === 2) {
      setOcrDone(false); // triggers OCR simulation
    } else if (ns === 3) {
      const { score, level, factors } = calcularRiesgo(activeCliente);
      toSave = { ...toSave, kycComplete: true, riskScore: score, riskLevel: level, riskFactors: factors };
    }
    setActiveCliente(toSave);
    saveCliente(toSave); // always persist on step advancement
    setStep(ns);
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const goBack = () => {
    // For new clients: delete from localStorage if no identifying info (name or CURP).
    // deleteCliente is a safe no-op if the client was never saved.
    if (isNewRef.current && activeCliente) {
      if (!activeCliente.nombre && !activeCliente.curp) {
        deleteCliente(activeCliente.id);
      }
    }
    reload();
    setView("list");
    setActiveCliente(null);
    setStep(0);
    setOcrDone(false);
    isNewRef.current = false;
  };

  /** Explicitly saves the current state then returns to list (used by "Guardar y salir" at step 3) */
  const handleSaveAndExit = () => {
    if (activeCliente) saveCliente(activeCliente);
    reload();
    setView("list");
    setActiveCliente(null);
    setStep(0);
    setOcrDone(false);
    isNewRef.current = false;
  };

  const handleDelete = (id: string) => { deleteCliente(id); reload(); };

  // ── Vista: Lista ────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <NavShell>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-[hsl(210,40%,95%)]">Registro de Clientes</h1>
              <p className="text-sm text-[hsl(215,20%,45%)] mt-0.5">Verificación KYC · Motor antifraude</p>
            </div>
            <button onClick={startNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
              <Plus className="w-4 h-4" /> Nuevo Cliente
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,40%)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, CURP, RFC…"
              className="w-full bg-[hsl(217,25%,8%)] text-[hsl(210,40%,90%)] placeholder:text-[hsl(215,20%,38%)] rounded-xl border border-[hsl(217,25%,13%)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-all" />
          </div>

          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 text-amber-500/20 mx-auto mb-3" />
              <p className="text-[hsl(215,20%,50%)] text-sm">
                {clientes.length === 0 ? "Aún no hay clientes registrados" : "Sin resultados"}
              </p>
              {clientes.length === 0 && (
                <button onClick={startNew}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-all">
                  Registrar primer cliente
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((c) => {
                const risk = RISK_CONFIG[c.riskLevel];
                const Icon = risk.icon;
                const fullName = [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(" ");
                return (
                  <div key={c.id}
                    className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-all border border-transparent group">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {c.selfie
                        ? <img src={c.selfie} alt="" className="w-full h-full object-cover scale-x-[-1]" />
                        : <User className="w-6 h-6 text-amber-500/50" />}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[hsl(210,40%,92%)] text-sm truncate">
                        {fullName || "Sin nombre"}
                      </p>
                      {/* CURP como identificador primario */}
                      <p className="text-xs text-amber-400/60 font-mono truncate">
                        {c.curp || <span className="text-[hsl(215,20%,40%)] font-sans">CURP no registrado</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", risk.color)}>
                          <Icon className="w-2.5 h-2.5" />{risk.label}
                        </span>
                        {c.kycComplete && <span className="text-[10px] text-emerald-400/60">KYC completo</span>}
                        <span className="text-[10px] text-[hsl(215,20%,35%)]">Score: {c.riskScore}</span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openDetail(c)}
                        className="p-2 rounded-xl text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-2 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-[hsl(215,20%,30%)] group-hover:text-amber-500/50 transition-colors" />
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

  // ── Vista: Formulario KYC ───────────────────────────────────────────────────
  if (!activeCliente) return null;
  const risk = RISK_CONFIG[activeCliente.riskLevel];
  const RiskIcon = risk.icon;

  return (
    <NavShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={goBack}
            className="p-2 rounded-xl text-[hsl(215,20%,50%)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-[hsl(210,40%,95%)]">
              {view === "new"
                ? "Nuevo Cliente"
                : [activeCliente.nombre, activeCliente.apellidoPaterno].filter(Boolean).join(" ") || "Editar Cliente"}
            </h1>
            {activeCliente.curp && (
              <p className="text-xs text-amber-400/70 font-mono">{activeCliente.curp}</p>
            )}
            {!activeCliente.curp && (
              <p className="text-xs text-[hsl(215,20%,45%)]">Verificación KYC · 4 pasos</p>
            )}
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done   = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-1.5 flex-shrink-0">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  active ? "bg-amber-500 text-[hsl(222,47%,4%)]"
                  : done  ? "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400"
                  : "bg-[hsl(217,25%,10%)] border border-[hsl(217,25%,17%)] text-[hsl(215,20%,45%)]"
                )}>
                  <Icon className="w-3 h-3" />
                  {s.label}
                  {s.optional && active && (
                    <span className="ml-0.5 text-[9px] opacity-70">(opcional)</span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-[hsl(215,20%,30%)] flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="glass-card rounded-2xl p-6">

          {/* ────────────────────────────────────────────────────────────────
              PASO 0: Datos generales (OPCIONAL)
          ──────────────────────────────────────────────────────────────── */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />Datos Generales
                </h2>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[hsl(217,25%,12%)] border border-[hsl(217,25%,20%)] text-[hsl(215,20%,50%)]">
                  <Info className="w-2.5 h-2.5" />OPCIONAL
                </span>
              </div>

              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-500/60">
                <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400/50" />
                <span>Puedes omitir este paso e ir directo a cargar documentos. El sistema extrae los datos automáticamente con OCR y los propone para confirmación.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Nombre(s)"       value={activeCliente.nombre}          onChange={(v) => update({ nombre: v })} />
                <Field label="Apellido paterno" value={activeCliente.apellidoPaterno} onChange={(v) => update({ apellidoPaterno: v })} />
                <Field label="Apellido materno" value={activeCliente.apellidoMaterno} onChange={(v) => update({ apellidoMaterno: v })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="CURP (18 caracteres)" value={activeCliente.curp} onChange={(v) => update({ curp: v.toUpperCase() })} placeholder="XXXX000000XXXXXX00" />
                <Field label="RFC"                  value={activeCliente.rfc}  onChange={(v) => update({ rfc: v.toUpperCase() })}  placeholder="XXXX000000XXX" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Fecha de nacimiento" value={activeCliente.fechaNacimiento} onChange={(v) => update({ fechaNacimiento: v })} type="date" />
                <Field label="Email"    value={activeCliente.email}    onChange={(v) => update({ email: v })}    type="email" />
                <Field label="Teléfono" value={activeCliente.telefono} onChange={(v) => update({ telefono: v })} placeholder="55 1234 5678" />
              </div>
              <SelectField
                label="Actividad económica"
                value={activeCliente.actividadEconomica}
                onChange={(v) => update({ actividadEconomica: v })}
                options={ACTIVIDADES}
              />

              <div className="border-t border-amber-500/10 pt-4">
                <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Domicilio</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Calle y número" value={activeCliente.calle}   onChange={(v) => update({ calle: v })} />
                  <Field label="Colonia"         value={activeCliente.colonia} onChange={(v) => update({ colonia: v })} />
                  <Field label="Ciudad"          value={activeCliente.ciudad}  onChange={(v) => update({ ciudad: v })} />
                  <SelectField label="Estado" value={activeCliente.estado} onChange={(v) => update({ estado: v })} options={ESTADOS_MX} />
                  <Field label="CP" value={activeCliente.cp} onChange={(v) => update({ cp: v })} placeholder="00000" />
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              PASO 1: Biometría + Documentos
          ──────────────────────────────────────────────────────────────── */}
          {step === 1 && (() => {
            // Refs para scroll a sección de INE cuando se pide reemplazar
            const ineRef = { current: null as HTMLDivElement | null };
            const missingItems = [
              !activeCliente.selfie          && "Selfie biométrica",
              !activeCliente.ineFrente       && "INE Frente",
              !activeCliente.ineReverso      && "INE Reverso",
              !activeCliente.comprobanteDomicilio && "Comprobante de domicilio",
            ].filter(Boolean) as string[];

            const score = (activeCliente.selfie && activeCliente.ineFrente)
              ? matchScore(activeCliente.selfie, activeCliente.ineFrente)
              : null;

            return (
              <div className="flex flex-col gap-5">
                <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />Biometría y Documentos
                </h2>

                {/* Checklist de progreso */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: "Selfie",       done: !!activeCliente.selfie },
                    { label: "INE Frente",   done: !!activeCliente.ineFrente },
                    { label: "INE Reverso",  done: !!activeCliente.ineReverso },
                    { label: "Domicilio",    done: !!activeCliente.comprobanteDomicilio },
                    { label: "CFDI / Nómina", done: !!activeCliente.cfdi },
                  ].map(({ label, done }) => (
                    <div key={label} className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium",
                      done ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                           : "bg-[hsl(217,25%,9%)] border-[hsl(217,25%,15%)] text-[hsl(215,20%,40%)]"
                    )}>
                      {done
                        ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        : <div className="w-3 h-3 rounded-full border border-current flex-shrink-0" />}
                      {label}
                    </div>
                  ))}
                </div>

                {/* Documentos faltantes — aviso destacado */}
                {missingItems.length > 0 && (
                  <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-amber-400 mb-0.5">Documentos requeridos faltantes</p>
                      <p className="text-amber-400/70">{missingItems.join(" · ")}</p>
                    </div>
                  </div>
                )}

                {/* ── 1. Verificación biométrica ── */}
                <div className="border border-[hsl(217,25%,15%)] rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />Verificación biométrica
                  </p>
                  {/* cameraKey forces remount when retake is requested from MatchBadge */}
                  <CameraCapture
                    key={cameraKey}
                    label="Selfie de verificación"
                    initialPhoto={activeCliente.selfie || undefined}
                    onCapture={(base64) => update({ selfie: base64 })}
                  />
                </div>

                {/* MATCH biométrico — solo cuando selfie + INE frente están listos */}
                {score !== null && (
                  <MatchBadge
                    score={score}
                    onRetake={() => {
                      update({ selfie: "" }); // clear selfie
                      requestRetake();        // remount camera component fresh
                    }}
                    onReplaceDoc={() => {
                      ineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                )}

                {/* ── 2. Documentos ── */}
                <div ref={(el) => { ineRef.current = el; }}
                  className="border border-[hsl(217,25%,15%)] rounded-2xl p-4 flex flex-col gap-4">
                  <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />Identificación oficial (INE)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DocUpload label="INE Frente"  value={activeCliente.ineFrente}  highlight={!activeCliente.ineFrente}  onChange={(v) => update({ ineFrente: v })} />
                    <DocUpload label="INE Reverso" value={activeCliente.ineReverso} highlight={!activeCliente.ineReverso} onChange={(v) => update({ ineReverso: v })} />
                  </div>

                  <div className="border-t border-[hsl(217,25%,13%)] pt-4">
                    <p className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />Comprobantes
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <DocUpload label="Comprobante de domicilio"           value={activeCliente.comprobanteDomicilio} highlight={!activeCliente.comprobanteDomicilio} onChange={(v) => update({ comprobanteDomicilio: v })} />
                      <DocUpload label="CFDI / Nómina (actividad económica)" value={activeCliente.cfdi}                onChange={(v) => update({ cfdi: v })} />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-500/60">
                  <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400/50" />
                  <span>En producción: OCR (Tesseract), QR parsing (ZXing), validación SAT para CFDI. Datos biométricos cifrados con AES-256.</span>
                </div>
              </div>
            );
          })()}

          {/* ────────────────────────────────────────────────────────────────
              PASO 2: Verificar datos (Auto-fill OCR)
          ──────────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
                <Scan className="w-4 h-4 text-amber-400" />Verificación de Datos
              </h2>

              {/* Non-intrusive OCR progress banner — form stays visible the whole time */}
              {ocrProcessing ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[hsl(217,25%,10%)] border border-amber-500/20">
                  <div className="relative w-5 h-5 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping" />
                    <Loader2 className="absolute inset-0 w-5 h-5 text-amber-400 animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-400">Analizando documentos con OCR…</p>
                    <p className="text-[10px] text-[hsl(215,20%,45%)] mt-0.5">Extrayendo CURP · Comparando biometría · Por favor espera</p>
                  </div>
                </div>
              ) : ocrFields.size > 0 ? (
                <div className="flex items-start gap-2 px-3 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold mb-0.5">Datos extraídos vía OCR de tus documentos</p>
                    <p className="text-emerald-400/70">Los campos con <span className="text-amber-400 font-bold">✦ OCR</span> fueron completados automáticamente. Verifica y corrige si es necesario.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15 text-xs text-amber-400">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Datos ingresados manualmente. Verifica que toda la información sea correcta antes de continuar.</span>
                </div>
              )}

              {/* Helper to render Field with OCR badge */}
                  {(() => {
                    const OcrField = ({ fieldKey, label, type, placeholder }: {
                      fieldKey: keyof Cliente; label: string; type?: string; placeholder?: string;
                    }) => {
                      const fromOcr    = ocrFields.has(fieldKey as string);
                      const ocrVal     = ocrConflicts.get(fieldKey as string);
                      const hasConflict = !!ocrVal;
                      const val        = (activeCliente[fieldKey] as string) ?? "";
                      const needsUpper = fieldKey === "curp" || fieldKey === "rfc";

                      const clearConflict = () =>
                        setOcrConflicts((p) => { const n = new Map(p); n.delete(fieldKey as string); return n; });

                      return (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                            {label}
                            {fromOcr     && <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">✦ OCR</span>}
                            {hasConflict && <span className="text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/25 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />Discrepancia</span>}
                          </label>
                          <input
                            type={type ?? "text"}
                            value={val}
                            placeholder={placeholder ?? ""}
                            onChange={(e) => {
                              const v = needsUpper ? e.target.value.toUpperCase() : e.target.value;
                              update({ [fieldKey]: v } as Partial<Cliente>);
                              setOcrFields((prev) => { const n = new Set(prev); n.delete(fieldKey as string); return n; });
                              clearConflict();
                            }}
                            className={cn(
                              "w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border px-3 py-2.5 text-sm outline-none transition-all",
                              hasConflict
                                ? "border-red-500/60 focus:border-red-500/70 focus:shadow-[0_0_0_2px_hsla(0,80%,60%,0.12)]"
                                : "border-[hsl(217,25%,14%)] focus:border-amber-500/50 focus:shadow-[0_0_0_2px_hsla(38,92%,50%,0.10)]"
                            )}
                          />
                          {/* Conflict resolution panel */}
                          {hasConflict && (
                            <div className="flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-red-500/8 border border-red-500/15">
                              <p className="text-[10px] text-red-400/80 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                El dato manual no coincide con lo extraído por OCR. ¿Cuál es el correcto?
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                <button type="button"
                                  onClick={() => {
                                    update({ [fieldKey]: needsUpper ? ocrVal!.toUpperCase() : ocrVal } as Partial<Cliente>);
                                    clearConflict();
                                    setOcrFields((p) => { const n = new Set(p); n.add(fieldKey as string); return n; });
                                  }}
                                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-all">
                                  <Scan className="w-2.5 h-2.5" />Usar OCR «{ocrVal}»
                                </button>
                                <button type="button"
                                  onClick={clearConflict}
                                  className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                  <CheckCircle2 className="w-2.5 h-2.5" />Mantener «{val}»
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    };

                    return (
                      <>
                        {/* Datos de identidad */}
                        <div>
                          <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Datos de identidad</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <OcrField fieldKey="nombre"          label="Nombre(s)" />
                            <OcrField fieldKey="apellidoPaterno" label="Apellido paterno" />
                            <OcrField fieldKey="apellidoMaterno" label="Apellido materno" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <OcrField fieldKey="curp" label="CURP — ID de usuario (18 caracteres)" placeholder="XXXX000000XXXXXX00" />
                            <OcrField fieldKey="rfc"  label="RFC" placeholder="XXXX000000XXX" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                            <OcrField fieldKey="fechaNacimiento" label="Fecha de nacimiento" type="date" />
                            <Field label="Email"    value={activeCliente.email}    onChange={(v) => update({ email: v })}    type="email" />
                            <Field label="Teléfono" value={activeCliente.telefono} onChange={(v) => update({ telefono: v })} placeholder="55 1234 5678" />
                          </div>
                          <div className="mt-4">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest flex items-center gap-1.5">
                                Actividad económica
                                {ocrFields.has("actividadEconomica") && <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">✦ OCR</span>}
                              </label>
                              <select
                                value={activeCliente.actividadEconomica}
                                onChange={(e) => { update({ actividadEconomica: e.target.value }); setOcrFields((p) => { const n = new Set(p); n.delete("actividadEconomica"); return n; }); }}
                                className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                                <option value="">— Seleccionar —</option>
                                {ACTIVIDADES.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Domicilio */}
                        <div className="border-t border-amber-500/10 pt-4">
                          <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Domicilio</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <OcrField fieldKey="calle"   label="Calle y número" />
                            <OcrField fieldKey="colonia" label="Colonia" />
                            <OcrField fieldKey="ciudad"  label="Ciudad" />
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest flex items-center gap-1.5">
                                Estado
                                {ocrFields.has("estado") && <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">✦ OCR</span>}
                              </label>
                              <select value={activeCliente.estado}
                                onChange={(e) => { update({ estado: e.target.value }); setOcrFields((p) => { const n = new Set(p); n.delete("estado"); return n; }); }}
                                className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                                <option value="">— Estado —</option>
                                {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
                              </select>
                            </div>
                            <OcrField fieldKey="cp" label="CP" placeholder="00000" />
                          </div>
                        </div>

                        {/* Aval */}
                        <div className="border-t border-amber-500/10 pt-4">
                          <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Aval / Garantía</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Nombre del aval"   value={activeCliente.avalNombre}   onChange={(v) => update({ avalNombre: v })} />
                            <Field label="Teléfono del aval" value={activeCliente.avalTelefono} onChange={(v) => update({ avalTelefono: v })} />
                            <Field label="Relación"          value={activeCliente.avalRelacion} onChange={(v) => update({ avalRelacion: v })} placeholder="Familiar, amigo…" />
                            <CurpAvalField value={activeCliente.curpAval} onChange={(v) => update({ curpAval: v })} />
                          </div>
                          <p className="text-xs text-[hsl(215,20%,38%)] mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            El aval debe estar registrado como cliente en el sistema para vincularlo por CURP.
                          </p>
                        </div>
                      </>
                    );
                  })()}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
              PASO 3: Resultado de riesgo KYC
          ──────────────────────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <h2 className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />Análisis de Riesgo KYC
              </h2>

              {/* Score circle */}
              <div className="flex flex-col items-center gap-3 py-6 border border-amber-500/10 rounded-2xl bg-[hsl(217,25%,7%)]">
                <div className={cn(
                  "w-24 h-24 rounded-full flex flex-col items-center justify-center border-4",
                  activeCliente.riskLevel === "APPROVED" ? "border-emerald-500/50 bg-emerald-500/10"
                  : activeCliente.riskLevel === "REVIEW"   ? "border-amber-500/50 bg-amber-500/10"
                  : "border-red-500/50 bg-red-500/10"
                )}>
                  <span className="text-3xl font-bold text-[hsl(210,40%,95%)]">{activeCliente.riskScore}</span>
                  <span className="text-[10px] text-[hsl(215,20%,45%)]">/ 100</span>
                </div>
                <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold", risk.color)}>
                  <RiskIcon className="w-4 h-4" />{risk.label}
                </div>

                {/* CURP como ID */}
                {activeCliente.curp && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
                    <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-mono text-amber-400">ID: {activeCliente.curp}</span>
                  </div>
                )}

                <p className="text-xs text-[hsl(215,20%,45%)] text-center max-w-xs">
                  {activeCliente.riskLevel === "APPROVED" && "Cliente verificado. Puede proceder a la firma del contrato."}
                  {activeCliente.riskLevel === "REVIEW"   && "Se requiere revisión manual antes de proceder."}
                  {activeCliente.riskLevel === "REJECTED" && "Documentación insuficiente. Solicitar información faltante."}
                  {activeCliente.riskLevel === "PENDING"  && "Completa los pasos anteriores para obtener el análisis."}
                </p>
              </div>

              {/* Resumen de datos */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Nombre", value: [activeCliente.nombre, activeCliente.apellidoPaterno, activeCliente.apellidoMaterno].filter(Boolean).join(" ") },
                  { label: "CURP (ID)", value: activeCliente.curp },
                  { label: "RFC", value: activeCliente.rfc },
                  { label: "Actividad", value: activeCliente.actividadEconomica },
                  { label: "Domicilio", value: [activeCliente.calle, activeCliente.colonia, activeCliente.ciudad, activeCliente.estado].filter(Boolean).join(", ") },
                  { label: "Aval CURP", value: activeCliente.curpAval || activeCliente.avalNombre },
                ].map(({ label, value }) => value && (
                  <div key={label} className="bg-[hsl(217,25%,8%)] rounded-xl px-3 py-2">
                    <p className="text-[hsl(215,20%,40%)] uppercase tracking-widest text-[9px] font-bold">{label}</p>
                    <p className="text-[hsl(210,40%,80%)] mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Factores de riesgo */}
              {activeCliente.riskFactors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-2">Factores de riesgo</p>
                  <div className="flex flex-col gap-1.5">
                    {activeCliente.riskFactors.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-xs text-[hsl(215,20%,50%)] bg-[hsl(217,25%,8%)] rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400/60 flex-shrink-0" />{f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Navegación ────────────────────────────────────────────── */}
          <div className="flex justify-between mt-8 pt-5 border-t border-amber-500/10">
            <button
              onClick={step === 0 ? goBack : prevStep}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 hover:text-amber-400 transition-all">
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? "Cancelar" : "Anterior"}
            </button>

            <div className="flex items-center gap-2">
              {/* Botón "Omitir" solo en paso 0 */}
              {step === 0 && (
                <button onClick={skipToStep1}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 hover:text-amber-400 transition-all">
                  Omitir <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={nextStep}
                  disabled={step === 2 && ocrProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {step === 0 ? "Continuar con datos" : "Siguiente"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSaveAndExit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  <CheckCircle2 className="w-4 h-4" />Guardar y salir
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </NavShell>
  );
}
