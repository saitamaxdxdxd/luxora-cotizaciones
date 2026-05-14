/**
 * LUXORA — KYC Público
 * Página accesible por el participante via link de WhatsApp.
 * Ruta: /kyc/:caseId/:role/:token
 *
 * Flujo: Bienvenida → Generales → Domicilio → Documentos → Biométrica → Completado
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft,
  Upload, RefreshCw, Trash2, AlertTriangle, Lock, User,
  MapPin, FileText, Camera, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type LuxUser, type DocType, type CaseParticipant,
  getCases, saveCase, getUserById, saveUser, createUser,
} from "@/lib/store";
import { compressImage } from "@/lib/imageUtils";
import { CameraCapture } from "@/components/clientes/CameraCapture";

// ─── Constantes ───────────────────────────────────────────────────────────────

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

const MAX_FILE_MB = 4;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const ROLE_LABEL: Record<string, string> = {
  responsable: "Responsable del contrato",
  aval: "Aval / Testigo",
  operador: "Operador / Conductor",
};

type KycStep = "bienvenida" | "generales" | "domicilio" | "documentos" | "biometrica" | "completado" | "invalido";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = "text", placeholder = "", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options, required = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all"
      >
        <option value="">— Seleccionar —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function DocUploadKyc({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    if (file.size > MAX_FILE_BYTES) {
      setErr(`Archivo muy grande (máx ${MAX_FILE_MB} MB). Comprime e intenta de nuevo.`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      const compressed = await compressImage(raw, "document");
      onChange(compressed);
    };
    reader.onerror = () => setErr("Error al leer el archivo. Intenta con otro.");
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">{label}</span>
      {value ? (
        <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-emerald-500/5">
          {value.startsWith("data:image")
            ? <img src={value} alt={label} className="w-full h-28 object-cover" />
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
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-[hsl(217,25%,20%)] hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-[hsl(215,20%,45%)] hover:text-amber-400">
          <Upload className="w-5 h-5" />
          <span className="text-xs">Toca para subir imagen o PDF</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={handle} />
      {err && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{err}</p>}
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS: { key: KycStep; label: string; icon: React.ElementType }[] = [
  { key: "generales",   label: "Datos",     icon: User },
  { key: "domicilio",   label: "Domicilio", icon: MapPin },
  { key: "documentos",  label: "Documentos",icon: FileText },
  { key: "biometrica",  label: "Selfie",    icon: Camera },
];

function StepDots({ current }: { current: KycStep }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => {
        const SIcon = s.icon;
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              "flex flex-col items-center gap-1",
            )}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                active  ? "bg-amber-500 border-amber-400 text-[hsl(222,47%,4%)]"
                : done  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                : "bg-[hsl(217,25%,12%)] border-[hsl(217,25%,20%)] text-[hsl(215,20%,35%)]"
              )}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : <SIcon className="w-3.5 h-3.5" />}
              </div>
              <span className={cn("text-[9px] font-semibold",
                active ? "text-amber-400" : done ? "text-emerald-400" : "text-[hsl(215,20%,30%)]")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-6 h-0.5 -mt-3 rounded-full", done ? "bg-emerald-500/40" : "bg-[hsl(217,25%,18%)]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function KycPublico() {
  const { caseId, role, token } = useParams<{ caseId: string; role: string; token: string }>();
  const navigate = useNavigate();

  const [step, setStep]         = useState<KycStep>("bienvenida");
  const [user, setUser]         = useState<LuxUser | null>(null);
  const [caseNum, setCaseNum]   = useState("");
  const [participant, setParticipant] = useState<CaseParticipant | null>(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  // ── Validate token on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!caseId || !role || !token) { setStep("invalido"); return; }

    const cases = getCases();
    const found = cases.find((c) => c.id === caseId);
    if (!found) { setStep("invalido"); return; }

    const roleUpper = role.toUpperCase() as "RESPONSABLE" | "AVAL" | "OPERADOR";
    const part = found.participants.find(
      (p) => p.role === roleUpper && p.inviteToken === token
    );
    if (!part) { setStep("invalido"); return; }

    setCaseNum(found.caseNumber);
    setParticipant(part);

    // Load existing user data if available
    const existingUser = getUserById(part.userId);
    setUser(existingUser ?? createUser());

    // If already completed, go straight to completado
    if (part.status === "COMPLETADO") setStep("completado");
  }, [caseId, role, token]);

  const update = (fields: Partial<LuxUser>) =>
    setUser((prev) => prev ? { ...prev, ...fields } : prev);

  const updateDoc = (type: DocType, data: string) => {
    if (!user) return;
    const docs = user.documents.filter((d) => d.type !== type);
    if (data) docs.push({ id: `${type}-${Date.now()}`, type, label: type, data, verified: false, uploadedAt: new Date().toISOString() });
    update({ documents: docs });
  };

  const getDoc = (type: DocType) => user?.documents.find((d) => d.type === type)?.data ?? "";

  // ── Save and complete KYC ─────────────────────────────────────────────────
  const complete = () => {
    if (!user || !caseId || !role || !token) return;
    setSaving(true);

    // Save user
    saveUser(user);

    // Update participant status to COMPLETADO
    const cases = getCases();
    const cIdx = cases.findIndex((c) => c.id === caseId);
    if (cIdx >= 0) {
      const roleUpper = role.toUpperCase() as "RESPONSABLE" | "AVAL" | "OPERADOR";
      cases[cIdx].participants = cases[cIdx].participants.map((p) =>
        p.role === roleUpper && p.inviteToken === token
          ? { ...p, status: "COMPLETADO" as const, kycComplete: true, progress: 100 }
          : p
      );
      // Advance case to KYC_EN_PROGRESO if still at INVITACION_ENVIADA
      if (cases[cIdx].status === "INVITACION_ENVIADA") {
        cases[cIdx].status = "KYC_EN_PROGRESO";
      }
      saveCase(cases[cIdx]);
    }

    setTimeout(() => { setSaving(false); setStep("completado"); }, 800);
  };

  // ─── Validation per step ─────────────────────────────────────────────────
  const canGoNext = (s: KycStep): boolean => {
    if (!user) return false;
    if (s === "generales") return !!user.nombre.trim() && !!user.apellidoPaterno.trim();
    if (s === "domicilio") return !!user.address.ciudad.trim() && !!user.address.estado.trim();
    if (s === "documentos") return !!getDoc("INE_FRONT") && !!getDoc("INE_BACK");
    if (s === "biometrica") return !!user.selfie;
    return true;
  };

  const next = () => {
    setError("");
    const order: KycStep[] = ["generales","domicilio","documentos","biometrica"];
    const idx = order.indexOf(step as KycStep);
    if (idx < 0) return;
    if (!canGoNext(step)) {
      setError(
        step === "generales" ? "Nombre y apellido paterno son obligatorios."
        : step === "domicilio" ? "Ciudad y estado son obligatorios."
        : step === "documentos" ? "Sube al menos la INE frente y reverso."
        : step === "biometrica" ? "Toma tu selfie para continuar."
        : ""
      );
      return;
    }
    if (idx === order.length - 1) { complete(); return; }
    setStep(order[idx + 1]);
  };

  const back = () => {
    const order: KycStep[] = ["bienvenida","generales","domicilio","documentos","biometrica"];
    const idx = order.indexOf(step as KycStep);
    if (idx > 0) setStep(order[idx - 1]);
  };

  // ─── Shared card wrapper ─────────────────────────────────────────────────
  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[hsl(222,47%,4%)] flex flex-col items-center justify-start px-4 py-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
          <span className="text-[hsl(222,47%,4%)] font-black text-sm">L</span>
        </div>
        <span className="font-display font-bold text-lg text-[hsl(210,40%,92%)] tracking-wider">LUXORA</span>
      </div>
      <div className="w-full max-w-md glass-card rounded-2xl p-6 flex flex-col gap-5">
        {children}
      </div>
    </div>
  );

  // ─── INVÁLIDO ─────────────────────────────────────────────────────────────
  if (step === "invalido") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <p className="font-bold text-[hsl(210,40%,92%)]">Link inválido o expirado</p>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-1">
              Este enlace de validación no es válido o ya expiró. Solicita uno nuevo al operador.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // ─── BIENVENIDA ───────────────────────────────────────────────────────────
  if (step === "bienvenida") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-[hsl(210,40%,92%)] text-lg">Validación KYC</p>
            {caseNum && <p className="text-xs text-amber-400/80 mt-0.5">Reservación: {caseNum}</p>}
            {role && <p className="text-xs text-[hsl(215,20%,50%)]">Participas como: <span className="font-semibold text-[hsl(210,40%,75%)]">{ROLE_LABEL[role] ?? role}</span></p>}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { icon: Lock,        text: "Tu información se cifra con AES-256 y se almacena de forma segura." },
            { icon: ShieldCheck, text: "NO compartimos tus datos con terceros ni los usamos para entrenar IA." },
            { icon: FileText,    text: "Solo necesitas tu INE, comprobante de domicilio y una selfie." },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-2.5 text-xs text-[hsl(215,20%,55%)]">
              <Icon className="w-3.5 h-3.5 mt-0.5 text-emerald-400/70 flex-shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setStep("generales")}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
          <ChevronRight className="w-4 h-4" />Comenzar validación
        </button>

        <p className="text-[10px] text-center text-[hsl(215,20%,35%)]">Este proceso toma aproximadamente 3 minutos</p>
      </Card>
    );
  }

  // ─── COMPLETADO ───────────────────────────────────────────────────────────
  if (step === "completado") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-[hsl(210,40%,92%)] text-lg">¡Validación completada!</p>
            <p className="text-xs text-[hsl(215,20%,50%)] mt-1 leading-relaxed">
              Tu información ha sido registrada. El operador revisará tus datos y recibirás una notificación con el resultado.
            </p>
          </div>
          <div className="w-full px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-400 text-left">
            <p className="font-bold mb-1">Resumen de lo enviado:</p>
            <ul className="flex flex-col gap-1 text-emerald-400/80">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />Datos personales</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />Domicilio</li>
              <li className={cn("flex items-center gap-1.5", getDoc("INE_FRONT") ? "text-emerald-400/80" : "text-[hsl(215,20%,40%)]")}>
                <CheckCircle2 className="w-3 h-3" />Documentos de identidad
              </li>
              <li className={cn("flex items-center gap-1.5", user?.selfie ? "text-emerald-400/80" : "text-[hsl(215,20%,40%)]")}>
                <CheckCircle2 className="w-3 h-3" />Verificación biométrica
              </li>
            </ul>
          </div>
        </div>
      </Card>
    );
  }

  if (!user) return null;

  // ─── FORM STEPS ───────────────────────────────────────────────────────────
  return (
    <Card>
      <StepDots current={step} />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/8 border border-red-500/20 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* ── GENERALES ── */}
      {step === "generales" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />Datos personales
            </p>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">Ingresa exactamente como aparecen en tu INE</p>
          </div>
          <Field label="Nombre(s)" value={user.nombre} onChange={(v) => update({ nombre: v })} required placeholder="Como aparece en tu INE" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Apellido paterno" value={user.apellidoPaterno} onChange={(v) => update({ apellidoPaterno: v })} required />
            <Field label="Apellido materno" value={user.apellidoMaterno} onChange={(v) => update({ apellidoMaterno: v })} />
          </div>
          <Field label="CURP" value={user.curp} onChange={(v) => update({ curp: v.toUpperCase() })} placeholder="18 caracteres" />
          <Field label="RFC" value={user.rfc} onChange={(v) => update({ rfc: v.toUpperCase() })} placeholder="12–13 caracteres" />
          <Field label="Fecha de nacimiento" value={user.fechaNacimiento} onChange={(v) => update({ fechaNacimiento: v })} type="date" />
          <SelectField label="Actividad económica" value={user.actividadEconomica} onChange={(v) => update({ actividadEconomica: v })} options={ACTIVIDADES} required />
          <Field label="Teléfono" value={user.telefono} onChange={(v) => update({ telefono: v })} type="tel" placeholder="10 dígitos" />
          <Field label="Email" value={user.email} onChange={(v) => update({ email: v })} type="email" placeholder="correo@ejemplo.com" />
        </div>
      )}

      {/* ── DOMICILIO ── */}
      {step === "domicilio" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />Domicilio
            </p>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">Debe coincidir con tu comprobante de domicilio</p>
          </div>
          <Field label="Calle y número" value={user.address.calle} onChange={(v) => update({ address: { ...user.address, calle: v } })} placeholder="Av. Reforma 456 Int. 3" required />
          <Field label="Colonia" value={user.address.colonia} onChange={(v) => update({ address: { ...user.address, colonia: v } })} placeholder="Juárez" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad / Alcaldía" value={user.address.ciudad} onChange={(v) => update({ address: { ...user.address, ciudad: v } })} required />
            <Field label="C.P." value={user.address.cp} onChange={(v) => update({ address: { ...user.address, cp: v } })} placeholder="06600" />
          </div>
          <SelectField label="Estado" value={user.address.estado} onChange={(v) => update({ address: { ...user.address, estado: v } })} options={ESTADOS_MX} required />
        </div>
      )}

      {/* ── DOCUMENTOS ── */}
      {step === "documentos" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />Documentos de identidad
            </p>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">Sube fotos claras, sin reflejos ni recortes</p>
          </div>
          <DocUploadKyc label="INE — Frente *" value={getDoc("INE_FRONT")} onChange={(v) => updateDoc("INE_FRONT", v)} />
          <DocUploadKyc label="INE — Reverso *" value={getDoc("INE_BACK")} onChange={(v) => updateDoc("INE_BACK", v)} />
          <DocUploadKyc label="Comprobante de domicilio (opcional)" value={getDoc("DOMICILIO")} onChange={(v) => updateDoc("DOMICILIO", v)} />
          <DocUploadKyc label="CFDI / Comprobante de ingresos (opcional)" value={getDoc("CFDI")} onChange={(v) => updateDoc("CFDI", v)} />
        </div>
      )}

      {/* ── BIOMÉTRICA ── */}
      {step === "biometrica" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-bold text-[hsl(210,40%,92%)] flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />Selfie de verificación
            </p>
            <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">Se comparará con tu INE para confirmar tu identidad</p>
          </div>
          <CameraCapture
            label="Selfie biométrica"
            initialPhoto={user.selfie}
            onCapture={(b64) => update({ selfie: b64 })}
          />
          {saving && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />Guardando tu información…
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex gap-3 mt-2">
        {step !== "generales" && (
          <button onClick={back}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/20 transition-all">
            <ChevronLeft className="w-3.5 h-3.5" />Anterior
          </button>
        )}
        <button onClick={next} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 disabled:opacity-50 transition-all">
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
            : step === "biometrica"
              ? <><CheckCircle2 className="w-4 h-4" />Finalizar KYC</>
              : <><ChevronRight className="w-4 h-4" />Continuar</>
          }
        </button>
      </div>
    </Card>
  );
}
