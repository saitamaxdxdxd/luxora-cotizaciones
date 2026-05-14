/**
 * LUXORA — Módulo de Usuarios
 * Una persona = un registro. Los roles (RESPONSABLE, AVAL, OPERADOR) se asignan por Caso.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Users, Plus, Search, Trash2, Eye, User, ChevronRight,
  CheckCircle2, Clock, XCircle, AlertTriangle, BadgeCheck,
  ArrowLeft, Upload, RefreshCw, Loader2, Sparkles, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavShell } from "@/components/luxora/NavShell";
import {
  type LuxUser, type DocType, type RiskLevel,
  getUsers, saveUser, createUser, deleteUser, calcularRiesgoUsuario,
} from "@/lib/store";
import { CameraCapture } from "@/components/clientes/CameraCapture";
import { compressImage } from "@/lib/imageUtils";
import { useFormDirty } from "@/hooks/useFormDirty";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesBanner } from "@/components/forms/UnsavedChangesBanner";

// ─── OCR demo profiles ────────────────────────────────────────────────────────
const OCR_DEMO_PROFILES = [
  {
    nombre: "Israel", apellidoPaterno: "Piña", apellidoMaterno: "Rodríguez",
    curp: "PIRI880415HMCXSR04", rfc: "PIRI880415HM4",
    fechaNacimiento: "1988-04-15",
    calle: "Av. Reforma 456 Int. 3", colonia: "Juárez", ciudad: "Cuauhtémoc",
    estado: "Ciudad de México", cp: "06600", actividadEconomica: "Empleado",
  },
  {
    nombre: "María Fernanda", apellidoPaterno: "Torres", apellidoMaterno: "Vega",
    curp: "TOVM950822MDFRRR08", rfc: "TOVM950822MF3",
    fechaNacimiento: "1995-08-22",
    calle: "Calle Morelos 88", colonia: "Centro", ciudad: "Monterrey",
    estado: "Nuevo León", cp: "64000", actividadEconomica: "Profesionista (médico, abogado, etc.)",
  },
  {
    nombre: "Carlos Eduardo", apellidoPaterno: "Sánchez", apellidoMaterno: "Meza",
    curp: "SAMC910303HDFNZR05", rfc: "SAMC910303HC6",
    fechaNacimiento: "1991-03-03",
    calle: "Blvd. Díaz Ordaz 2100", colonia: "Santa María", ciudad: "San Pedro Garza García",
    estado: "Nuevo León", cp: "66220", actividadEconomica: "Empresario / Dueño de negocio",
  },
  {
    nombre: "Lucía", apellidoPaterno: "Ramírez", apellidoMaterno: "Flores",
    curp: "RAFL001118MDFMLL01", rfc: "RAFL001118MF9",
    fechaNacimiento: "2000-11-18",
    calle: "Calle 5 de Mayo 320", colonia: "Del Valle", ciudad: "Benito Juárez",
    estado: "Ciudad de México", cp: "03100", actividadEconomica: "Estudiante",
  },
] as const;

// Safe charCodeAt — returns 0 when index is out of bounds
const safeCode = (s: string, i: number) => (i < s.length ? s.charCodeAt(i) : 0);

// Deterministic profile index from data length
function pickOcrProfile(data: string): number {
  const s = data.length + safeCode(data, 10) + safeCode(data, 20);
  return Math.abs(s) % OCR_DEMO_PROFILES.length;
}

// Deterministic face match score from two base64 images
function calcFaceMatch(selfie: string, ineData: string): number {
  if (!selfie || !ineData) return 0;
  const a = safeCode(selfie, 15) + safeCode(selfie, 30);
  const b = safeCode(ineData, 15) + safeCode(ineData, 30);
  return 62 + ((a + b + selfie.length + ineData.length) % 36);
}

// Max upload size: 4 MB (base64 will be ~5.5 MB stored)
const MAX_FILE_MB = 4;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

// ─── Types / constants ────────────────────────────────────────────────────────
const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; icon: React.ElementType }> = {
  APPROVED: { label: "Aprobado",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle2 },
  REVIEW:   { label: "Revisión",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20",      icon: AlertTriangle },
  REJECTED: { label: "Rechazado", color: "text-red-400 bg-red-500/10 border-red-500/20",            icon: XCircle },
  PENDING:  { label: "Pendiente", color: "text-[hsl(215,20%,50%)] bg-[hsl(217,25%,10%)] border-[hsl(217,25%,18%)]", icon: Clock },
};

const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco",
  "México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro",
  "Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala",
  "Veracruz","Yucatán","Zacatecas",
];
const ACTIVIDADES = [
  "Empleado","Trabajador independiente / Freelancer","Empresario / Dueño de negocio",
  "Profesionista (médico, abogado, etc.)","Comerciante","Agricultor / Ganadero",
  "Estudiante","Jubilado / Pensionado","Ama de casa","Otro",
];

const DOC_TYPES: { type: DocType; label: string }[] = [
  { type: "INE_FRONT", label: "INE Frente" },
  { type: "INE_BACK",  label: "INE Reverso" },
  { type: "DOMICILIO", label: "Comprobante de domicilio" },
  { type: "CFDI",      label: "CFDI / Nómina" },
  { type: "LICENCIA",  label: "Licencia de conducir" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  isOcr?: boolean;
  conflict?: string;        // OCR value that conflicts with current manual value
  onUseOcr?: () => void;
  onKeepManual?: () => void;
}

function Field({ label, value, onChange, type = "text", placeholder = "", isOcr, conflict, onUseOcr, onKeepManual }: FieldProps) {
  const hasConflict = !!conflict;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">{label}</label>
        {isOcr && !hasConflict && (
          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
            <Sparkles className="w-2.5 h-2.5" /> OCR
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all",
          hasConflict
            ? "border-red-500/70 focus:border-red-400"
            : "border-[hsl(217,25%,14%)]"
        )}
      />
      {hasConflict && (
        <div className="flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-red-500/8 border border-red-500/20">
          <p className="text-[10px] text-red-400/80">
            OCR detectó: <span className="font-bold text-red-300">«{conflict}»</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onUseOcr}
              className="flex-1 text-[10px] font-bold py-1 px-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors">
              Usar OCR «{conflict}»
            </button>
            <button type="button" onClick={onKeepManual}
              className="flex-1 text-[10px] font-bold py-1 px-2 rounded-lg bg-[hsl(217,25%,12%)] border border-[hsl(217,25%,20%)] text-[hsl(215,20%,55%)] hover:border-amber-500/20 transition-colors">
              Mantener «{value}»
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocUpload({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState("");
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSizeError("");
    if (file.size > MAX_FILE_BYTES) {
      setSizeError(`El archivo excede el límite de ${MAX_FILE_MB} MB. Comprime la imagen e intenta de nuevo.`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      // Compress images; PDFs are returned as-is by compressImage
      const compressed = await compressImage(raw, "document");
      onChange(compressed);
    };
    reader.onerror = () => setSizeError("Error al leer el archivo. Intenta con otro archivo.");
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">{label}</span>
      {value ? (
        <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-emerald-500/5">
          {value.startsWith("data:image")
            ? <img src={value} alt={label} className="w-full h-24 object-cover" />
            : <div className="flex items-center gap-2 p-3 text-xs text-emerald-400"><CheckCircle2 className="w-4 h-4" /><span>Archivo cargado</span></div>
          }
          <div className="flex border-t border-emerald-500/15">
            <button type="button" onClick={() => ref.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors">
              <RefreshCw className="w-3 h-3" />Cambiar
            </button>
            <div className="w-px bg-emerald-500/15" />
            <button type="button" onClick={() => onChange("")}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-red-400/70 hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-3 h-3" />Eliminar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-[hsl(217,25%,20%)] hover:border-amber-500/40 hover:bg-amber-500/3 transition-all text-[hsl(215,20%,45%)] hover:text-amber-400">
          <Upload className="w-5 h-5" />
          <span className="text-xs">Seleccionar archivo</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={handle} />
      {sizeError && (
        <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />{sizeError}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Usuarios() {
  const [users, setUsers] = useState<LuxUser[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "form">("list");
  const [active, setActive] = useState<LuxUser | null>(null);
  const [originalActive, setOriginalActive] = useState<LuxUser | null>(null);
  const [tab, setTab] = useState<"datos" | "docs" | "bio">("datos");
  const isNew = useRef(false);
  const [saveError, setSaveError] = useState("");
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(true);

  // Detect unsaved changes
  const isDirty = useFormDirty(originalActive ?? {}, active ?? {});
  useUnsavedChanges({ isDirty });

  // OCR state
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrFields, setOcrFields] = useState<Set<string>>(new Set());
  const [ocrConflicts, setOcrConflicts] = useState<Map<string, string>>(new Map());
  const activeRef = useRef<LuxUser | null>(null);
  useEffect(() => { activeRef.current = active; }, [active]);

  const reload = () => setUsers(getUsers());
  useEffect(() => { reload(); }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return `${u.nombre} ${u.apellidoPaterno} ${u.curp} ${u.rfc} ${u.email}`.toLowerCase().includes(q);
  });

  const openNew = () => {
    isNew.current = true;
    const newUser = createUser();
    setActive(newUser);
    setOriginalActive(newUser);
    setOcrFields(new Set());
    setOcrConflicts(new Map());
    setTab("datos");
    setView("form");
    setShowUnsavedWarning(true);
  };
  const openEdit = (u: LuxUser) => {
    isNew.current = false;
    setActive(u);
    setOriginalActive(u);
    setOcrFields(new Set());
    setOcrConflicts(new Map());
    setTab("datos");
    setView("form");
    setShowUnsavedWarning(true);
  };
  const goBack = () => {
    if (isDirty) {
      if (!confirm("Tienes cambios sin guardar. ¿Estás seguro de que quieres descartar los cambios?")) {
        return;
      }
    }
    if (isNew.current && active && !active.nombre && !active.curp) deleteUser(active.id);
    reload();
    setView("list");
    setActive(null);
    setOriginalActive(null);
    setShowUnsavedWarning(true);
  };

  const update = useCallback((fields: Partial<LuxUser>) => {
    setActive((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      if (!isNew.current) saveUser(updated);
      return updated;
    });
  }, []);

  const updateDoc = (type: DocType, data: string) => {
    if (!active) return;
    const docs = active.documents.filter((d) => d.type !== type);
    if (data) {
      docs.push({
        id: `${type}-${Date.now()}`,
        type,
        label: DOC_TYPES.find((d) => d.type === type)?.label ?? type,
        data,
        verified: false,
        uploadedAt: new Date().toISOString(),
      });
    }
    update({ documents: docs });

    // Trigger OCR for INE documents
    if ((type === "INE_FRONT" || type === "INE_BACK") && data) {
      triggerOcr(data);
    }
  };

  const triggerOcr = (imageData: string) => {
    setOcrProcessing(true);
    const profile = OCR_DEMO_PROFILES[pickOcrProfile(imageData)];

    setTimeout(() => {
      const snap = activeRef.current;
      if (!snap) { setOcrProcessing(false); return; }

      const newOcrFields = new Set<string>();
      const newConflicts = new Map<string, string>();

      type ProfileKey = keyof typeof profile;
      const addressKeys = ["calle", "colonia", "ciudad", "estado", "cp"] as const;

      const applyField = (key: string, ocrVal: string) => {
        const current = (snap as unknown as Record<string, unknown>)[key];
        const manualVal = ((current as string) ?? "").trim();
        if (!manualVal) {
          newOcrFields.add(key);
        } else if (manualVal.toLowerCase() !== ocrVal.trim().toLowerCase()) {
          newConflicts.set(key, ocrVal.trim());
        }
      };

      // Top-level fields
      const topFields: [string, ProfileKey][] = [
        ["nombre", "nombre"],
        ["apellidoPaterno", "apellidoPaterno"],
        ["apellidoMaterno", "apellidoMaterno"],
        ["curp", "curp"],
        ["rfc", "rfc"],
        ["fechaNacimiento", "fechaNacimiento"],
        ["actividadEconomica", "actividadEconomica"],
      ];
      for (const [field, profileKey] of topFields) {
        applyField(field, profile[profileKey] as string);
      }

      // Address fields
      for (const key of addressKeys) {
        const ocrVal = profile[key as ProfileKey] as string | undefined;
        if (!ocrVal) continue;
        const addrVal = ((snap.address as unknown as Record<string, string>)[key] ?? "").trim();
        if (!addrVal) {
          newOcrFields.add(`address.${key}`);
        } else if (addrVal.toLowerCase() !== ocrVal.trim().toLowerCase()) {
          newConflicts.set(`address.${key}`, ocrVal.trim());
        }
      }

      // Build updated user with auto-filled empty fields
      const updatedTop: Partial<LuxUser> = {};
      for (const [field, profileKey] of topFields) {
        if (newOcrFields.has(field)) {
          (updatedTop as Record<string, unknown>)[field] = profile[profileKey] as string;
        }
      }
      const updatedAddress = { ...snap.address };
      for (const key of addressKeys) {
        if (newOcrFields.has(`address.${key}`)) {
          const ocrVal = profile[key as ProfileKey] as string | undefined;
          if (ocrVal) (updatedAddress as unknown as Record<string, string>)[key] = ocrVal;
        }
      }

      setOcrFields(newOcrFields);
      setOcrConflicts(newConflicts);

      // Apply auto-fill to empty fields
      setActive((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...updatedTop, address: updatedAddress };
        if (!isNew.current) saveUser(merged);
        return merged;
      });

      setOcrProcessing(false);
    }, 2200);
  };

  const resolveConflict = (key: string, useOcr: boolean) => {
    const ocrVal = ocrConflicts.get(key);
    if (!ocrVal) return;
    setOcrConflicts((prev) => { const n = new Map(prev); n.delete(key); return n; });
    if (useOcr && active) {
      if (key.startsWith("address.")) {
        const addrKey = key.split(".")[1];
        update({ address: { ...active.address, [addrKey]: ocrVal } });
      } else {
        update({ [key]: ocrVal } as Partial<LuxUser>);
      }
      setOcrFields((prev) => new Set([...prev, key]));
    }
  };

  const saveAndScore = () => {
    if (!active) return;
    if (!active.nombre.trim()) {
      setSaveError("El nombre del usuario es obligatorio antes de guardar.");
      setTab("datos");
      return;
    }
    setSaveError("");
    const { score, level, factors } = calcularRiesgoUsuario(active);
    const updated = { ...active, riskScore: score, riskLevel: level, riskFactors: factors };
    setActive(updated);
    const ok = saveUser(updated);
    if (!ok) {
      setSaveError("No se pudo guardar: almacenamiento lleno. Libera espacio desde el botón de almacenamiento en el menú superior.");
      return;
    }
    isNew.current = false;
    reload();
    setView("list");
    setActive(null);
    setOriginalActive(null);
    setShowUnsavedWarning(true);
  };

  // Face match score (selfie vs INE front)
  const faceMatchScore = (() => {
    if (!active) return 0;
    const ineFront = active.documents.find((d) => d.type === "INE_FRONT")?.data ?? "";
    return calcFaceMatch(active.selfie, ineFront);
  })();

  const matchColor =
    faceMatchScore >= 82 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
    : faceMatchScore >= 68 ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
    : "text-red-400 border-red-500/30 bg-red-500/10";

  // ─── List view ──────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <NavShell>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-[hsl(210,40%,95%)]">Usuarios</h1>
              <p className="text-sm text-[hsl(215,20%,45%)] mt-0.5">Una persona · Múltiples roles · KYC unificado</p>
            </div>
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
              <Plus className="w-4 h-4" /> Nuevo Usuario
            </button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,40%)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, CURP, RFC…"
              className="w-full bg-[hsl(217,25%,8%)] text-[hsl(210,40%,90%)] placeholder:text-[hsl(215,20%,38%)] rounded-xl border border-[hsl(217,25%,13%)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-all" />
          </div>
          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 text-amber-500/20 mx-auto mb-3" />
              <p className="text-[hsl(215,20%,50%)] text-sm mb-4">{users.length === 0 ? "Aún no hay usuarios" : "Sin resultados"}</p>
              {users.length === 0 && (
                <button onClick={openNew} className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400">
                  Registrar primer usuario
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((u) => {
                const rc = RISK_CONFIG[u.riskLevel];
                const RIcon = rc.icon;
                return (
                  <div key={u.id} className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-all border border-transparent group">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/15 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {u.selfie
                        ? <img src={u.selfie} alt="" className="w-full h-full object-cover scale-x-[-1]" />
                        : <User className="w-6 h-6 text-amber-500/50" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[hsl(210,40%,92%)] text-sm truncate">
                        {u.nombre || "Sin nombre"} {u.apellidoPaterno}
                      </p>
                      <p className="text-xs text-amber-400/60 font-mono truncate">
                        {u.curp || <span className="text-[hsl(215,20%,40%)] font-sans">CURP no registrado</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", rc.color)}>
                          <RIcon className="w-2.5 h-2.5" />{rc.label}
                        </span>
                        <span className="text-[10px] text-[hsl(215,20%,35%)]">Score: {u.riskScore}</span>
                        <span className="text-[10px] text-[hsl(215,20%,35%)]">{u.documents.length} doc{u.documents.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(u)} className="p-2 rounded-xl text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => { deleteUser(u.id); reload(); }} className="p-2 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
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

  if (!active) return null;
  const { score, level } = calcularRiesgoUsuario(active);
  const rc = RISK_CONFIG[level];

  // ─── Form view ──────────────────────────────────────────────────────────────
  return (
    <NavShell>
      {/* Unsaved changes warning banner */}
      <UnsavedChangesBanner
        isDirty={isDirty && showUnsavedWarning}
        onDismiss={() => setShowUnsavedWarning(false)}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={goBack} className="p-2 rounded-xl text-[hsl(215,20%,50%)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg text-[hsl(210,40%,95%)]">
              {isNew.current ? "Nuevo Usuario" : (`${active.nombre} ${active.apellidoPaterno}`.trim() || "Editar Usuario")}
            </h1>
            {active.curp && <p className="text-xs text-amber-400/70 font-mono">{active.curp}</p>}
          </div>
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold", rc.color)}>
            <rc.icon className="w-3.5 h-3.5" />{score} · {rc.label}
          </div>
        </div>

        {/* OCR processing banner */}
        {ocrProcessing && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-[hsl(217,25%,10%)] border border-amber-500/20">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-400">Analizando documento con OCR…</p>
              <p className="text-[10px] text-[hsl(215,20%,45%)]">Extrayendo datos para rellenar el formulario</p>
            </div>
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{saveError}
          </div>
        )}

        {/* OCR conflicts summary */}
        {ocrConflicts.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-red-500/8 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300/80">
              OCR detectó <span className="font-bold">{ocrConflicts.size}</span> diferencia{ocrConflicts.size !== 1 ? "s" : ""} con los datos ingresados. Revisa los campos marcados en rojo en la pestaña <span className="font-bold">Datos personales</span>.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(["datos", "docs", "bio"] as const).map((t) => {
            const labels: Record<typeof t, string> = { datos: "Datos personales", docs: "Documentos", bio: "Biometría" };
            return (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                  tab === t
                    ? "bg-amber-500 text-[hsl(222,47%,4%)] border-amber-500"
                    : "bg-[hsl(217,25%,10%)] border-[hsl(217,25%,17%)] text-[hsl(215,20%,50%)] hover:border-amber-500/30"
                )}>
                {labels[t]}
                {t === "datos" && ocrConflicts.size > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">{ocrConflicts.size}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">

          {/* ── Tab: Datos personales ─────────────────────────────────────────── */}
          {tab === "datos" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Nombre(s)" value={active.nombre} onChange={(v) => update({ nombre: v })}
                  isOcr={ocrFields.has("nombre")} conflict={ocrConflicts.get("nombre")}
                  onUseOcr={() => resolveConflict("nombre", true)} onKeepManual={() => resolveConflict("nombre", false)} />
                <Field label="Apellido paterno" value={active.apellidoPaterno} onChange={(v) => update({ apellidoPaterno: v })}
                  isOcr={ocrFields.has("apellidoPaterno")} conflict={ocrConflicts.get("apellidoPaterno")}
                  onUseOcr={() => resolveConflict("apellidoPaterno", true)} onKeepManual={() => resolveConflict("apellidoPaterno", false)} />
                <Field label="Apellido materno" value={active.apellidoMaterno} onChange={(v) => update({ apellidoMaterno: v })}
                  isOcr={ocrFields.has("apellidoMaterno")} conflict={ocrConflicts.get("apellidoMaterno")}
                  onUseOcr={() => resolveConflict("apellidoMaterno", true)} onKeepManual={() => resolveConflict("apellidoMaterno", false)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="CURP (18 chars) — ID único" value={active.curp} onChange={(v) => update({ curp: v.toUpperCase() })}
                  placeholder="XXXX000000XXXXXX00"
                  isOcr={ocrFields.has("curp")} conflict={ocrConflicts.get("curp")}
                  onUseOcr={() => resolveConflict("curp", true)} onKeepManual={() => resolveConflict("curp", false)} />
                <Field label="RFC" value={active.rfc} onChange={(v) => update({ rfc: v.toUpperCase() })}
                  placeholder="XXXX000000XXX"
                  isOcr={ocrFields.has("rfc")} conflict={ocrConflicts.get("rfc")}
                  onUseOcr={() => resolveConflict("rfc", true)} onKeepManual={() => resolveConflict("rfc", false)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Fecha nacimiento" value={active.fechaNacimiento} onChange={(v) => update({ fechaNacimiento: v })}
                  type="date"
                  isOcr={ocrFields.has("fechaNacimiento")} conflict={ocrConflicts.get("fechaNacimiento")}
                  onUseOcr={() => resolveConflict("fechaNacimiento", true)} onKeepManual={() => resolveConflict("fechaNacimiento", false)} />
                <Field label="Email" value={active.email} onChange={(v) => update({ email: v })} type="email" />
                <Field label="Teléfono" value={active.telefono} onChange={(v) => update({ telefono: v })} placeholder="55 1234 5678" />
              </div>

              {/* Actividad económica */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Actividad económica</label>
                  {ocrFields.has("actividadEconomica") && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
                      <Sparkles className="w-2.5 h-2.5" /> OCR
                    </span>
                  )}
                </div>
                <select value={active.actividadEconomica} onChange={(e) => update({ actividadEconomica: e.target.value })}
                  className={cn(
                    "w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all",
                    ocrConflicts.has("actividadEconomica") ? "border-red-500/70" : "border-[hsl(217,25%,14%)]"
                  )}>
                  <option value="">— Seleccionar —</option>
                  {ACTIVIDADES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                {ocrConflicts.has("actividadEconomica") && (
                  <div className="flex flex-col gap-1 px-2.5 py-2 rounded-lg bg-red-500/8 border border-red-500/20">
                    <p className="text-[10px] text-red-400/80">OCR detectó: <span className="font-bold text-red-300">«{ocrConflicts.get("actividadEconomica")}»</span></p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => resolveConflict("actividadEconomica", true)}
                        className="flex-1 text-[10px] font-bold py-1 px-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors">
                        Usar OCR
                      </button>
                      <button type="button" onClick={() => resolveConflict("actividadEconomica", false)}
                        className="flex-1 text-[10px] font-bold py-1 px-2 rounded-lg bg-[hsl(217,25%,12%)] border border-[hsl(217,25%,20%)] text-[hsl(215,20%,55%)] hover:border-amber-500/20 transition-colors">
                        Mantener actual
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Domicilio */}
              <div className="border-t border-amber-500/10 pt-4">
                <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Domicilio</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Calle" value={active.address.calle} onChange={(v) => update({ address: { ...active.address, calle: v } })}
                    isOcr={ocrFields.has("address.calle")} conflict={ocrConflicts.get("address.calle")}
                    onUseOcr={() => resolveConflict("address.calle", true)} onKeepManual={() => resolveConflict("address.calle", false)} />
                  <Field label="Número" value={active.address.numero} onChange={(v) => update({ address: { ...active.address, numero: v } })} />
                  <Field label="Colonia" value={active.address.colonia} onChange={(v) => update({ address: { ...active.address, colonia: v } })}
                    isOcr={ocrFields.has("address.colonia")} conflict={ocrConflicts.get("address.colonia")}
                    onUseOcr={() => resolveConflict("address.colonia", true)} onKeepManual={() => resolveConflict("address.colonia", false)} />
                  <Field label="Ciudad" value={active.address.ciudad} onChange={(v) => update({ address: { ...active.address, ciudad: v } })}
                    isOcr={ocrFields.has("address.ciudad")} conflict={ocrConflicts.get("address.ciudad")}
                    onUseOcr={() => resolveConflict("address.ciudad", true)} onKeepManual={() => resolveConflict("address.ciudad", false)} />
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Estado</label>
                      {ocrFields.has("address.estado") && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">
                          <Sparkles className="w-2.5 h-2.5" /> OCR
                        </span>
                      )}
                    </div>
                    <select value={active.address.estado} onChange={(e) => update({ address: { ...active.address, estado: e.target.value } })}
                      className={cn(
                        "w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all",
                        ocrConflicts.has("address.estado") ? "border-red-500/70" : "border-[hsl(217,25%,14%)]"
                      )}>
                      <option value="">— Estado —</option>
                      {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <Field label="CP" value={active.address.cp} onChange={(v) => update({ address: { ...active.address, cp: v } })}
                    placeholder="00000"
                    isOcr={ocrFields.has("address.cp")} conflict={ocrConflicts.get("address.cp")}
                    onUseOcr={() => resolveConflict("address.cp", true)} onKeepManual={() => resolveConflict("address.cp", false)} />
                </div>
              </div>
            </>
          )}

          {/* ── Tab: Documentos ──────────────────────────────────────────────── */}
          {tab === "docs" && (
            <div className="flex flex-col gap-4">
              {ocrFields.size === 0 && !ocrProcessing && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/15">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400/70" />
                  <p className="text-[11px] text-amber-400/70">Sube el INE para activar el análisis OCR automático</p>
                </div>
              )}
              {DOC_TYPES.map(({ type, label }) => (
                <DocUpload
                  key={type}
                  label={label}
                  value={active.documents.find((d) => d.type === type)?.data ?? ""}
                  onChange={(v) => updateDoc(type, v)}
                />
              ))}
            </div>
          )}

          {/* ── Tab: Biometría ────────────────────────────────────────────────── */}
          {tab === "bio" && (
            <div className="flex flex-col gap-5">
              {/* Selfie capture */}
              <div>
                <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Selfie biométrica</p>
                <CameraCapture
                  label="Foto biométrica"
                  initialPhoto={active.selfie || undefined}
                  onCapture={(b64) => update({ selfie: b64 })}
                />
                {active.selfie && (
                  <p className="text-xs text-emerald-400/70 flex items-center gap-1 mt-2">
                    <CheckCircle2 className="w-3 h-3" />Selfie registrada
                  </p>
                )}
              </div>

              {/* INE face match — static comparison, no camera */}
              <div className="border-t border-amber-500/10 pt-5">
                <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Match biométrico con INE</p>

                {!active.selfie || !active.documents.find((d) => d.type === "INE_FRONT") ? (
                  <div className="flex flex-col gap-2 p-4 rounded-xl border border-dashed border-[hsl(217,25%,20%)] text-center">
                    <ShieldAlert className="w-6 h-6 text-[hsl(215,20%,35%)] mx-auto" />
                    <p className="text-xs text-[hsl(215,20%,42%)]">
                      {!active.selfie && !active.documents.find((d) => d.type === "INE_FRONT")
                        ? "Se requiere selfie e INE Frente para calcular el match"
                        : !active.selfie
                        ? "Toma la selfie biométrica para calcular el match"
                        : "Sube el INE Frente para calcular el match"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[hsl(217,25%,16%)] bg-[hsl(217,25%,8%)] overflow-hidden">
                    {/* Image comparison row */}
                    <div className="grid grid-cols-2 divide-x divide-[hsl(217,25%,14%)]">
                      <div className="flex flex-col items-center gap-2 p-3">
                        <p className="text-[10px] font-semibold text-[hsl(215,20%,45%)] uppercase tracking-widest">Selfie</p>
                        <img
                          src={active.selfie}
                          alt="Selfie"
                          className="w-24 h-24 object-cover rounded-xl border border-[hsl(217,25%,20%)] scale-x-[-1]"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-2 p-3">
                        <p className="text-[10px] font-semibold text-[hsl(215,20%,45%)] uppercase tracking-widest">INE Frente</p>
                        <img
                          src={active.documents.find((d) => d.type === "INE_FRONT")!.data}
                          alt="INE Frente"
                          className="w-24 h-24 object-cover rounded-xl border border-[hsl(217,25%,20%)]"
                        />
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="p-4 border-t border-[hsl(217,25%,14%)]">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-[hsl(215,20%,50%)]">Similitud facial</p>
                        <span className={cn("text-sm font-bold px-2.5 py-1 rounded-lg border", matchColor)}>
                          {faceMatchScore}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[hsl(217,25%,14%)] overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            faceMatchScore >= 82 ? "bg-emerald-500" : faceMatchScore >= 68 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${faceMatchScore}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {faceMatchScore >= 82 ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <ShieldCheck className="w-4 h-4" />
                            <p className="text-xs font-semibold">Match biométrico aprobado</p>
                          </div>
                        ) : faceMatchScore >= 68 ? (
                          <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-center gap-1.5 text-amber-400">
                              <AlertTriangle className="w-4 h-4" />
                              <p className="text-xs font-semibold">Match bajo — revisión manual recomendada</p>
                            </div>
                            <button onClick={() => setTab("bio")}
                              className="w-full text-xs font-semibold py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-colors">
                              Retomar selfie
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full">
                            <div className="flex items-center gap-1.5 text-red-400">
                              <XCircle className="w-4 h-4" />
                              <p className="text-xs font-semibold">Match insuficiente — retomar selfie o reemplazar INE</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { update({ selfie: "" }); }}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-colors">
                                Nueva selfie
                              </button>
                              <button onClick={() => setTab("docs")}
                                className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[hsl(217,25%,12%)] border border-[hsl(217,25%,20%)] text-[hsl(215,20%,55%)] hover:border-amber-500/20 transition-colors">
                                Cambiar INE
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-between pt-4 border-t border-amber-500/10">
            <button onClick={goBack}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 hover:text-amber-400 transition-all">
              <ArrowLeft className="w-4 h-4" />{isNew.current ? "Cancelar" : "Volver"}
            </button>
            <button onClick={saveAndScore}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
              <BadgeCheck className="w-4 h-4" />Guardar y calcular score
            </button>
          </div>
        </div>
      </div>
    </NavShell>
  );
}
