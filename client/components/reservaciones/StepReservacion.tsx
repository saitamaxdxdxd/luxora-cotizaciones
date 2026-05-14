/**
 * LUXORA — Paso "Reservación"
 * Formulario completo: vehículo, fechas/horas, ruta, tipo servicio, importes y participantes.
 */
import {
  Car, Calendar, MapPin, Users, CreditCard,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RentalCase, type ParticipantRole,
  getUserById, getOrganizations, getCompanyMembersBy,
} from "@/lib/store";
import type { Vehicle } from "@/lib/stores/vehicles";
import { ParticipantSelector } from "./ParticipantSelector";

// ─── helpers ─────────────────────────────────────────────────────────────────

const FORMAS_PAGO = ["Transferencia", "Efectivo", "Tarjeta de crédito", "Tarjeta de débito", "Cheque"];

function Field({ label, value, onChange, type = "text", placeholder = "", required = false }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all" />
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-amber-500/10">
      <Icon className="w-4 h-4 text-amber-400" />
      <p className="text-xs font-bold text-amber-400/80 uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  activeCase: RentalCase;
  vehicles: Vehicle[];
  update: (fields: Partial<RentalCase>) => void;
  setCaseError: (msg: string) => void;
}

export function StepReservacion({ activeCase, vehicles, update, setCaseError }: Props) {
  const conOp = activeCase.tipoContrato === "CON_OPERADOR";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Identificador ── */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
        <div className="flex flex-col">
          <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Reservación ID</p>
          <p className="text-lg font-bold text-amber-400 font-mono">{activeCase.caseNumber}</p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col text-right">
          <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest">Fecha reservación</p>
          <input type="date" value={activeCase.apartadoFecha}
            onChange={(e) => update({ apartadoFecha: e.target.value })}
            className="bg-transparent text-sm font-semibold text-amber-300 outline-none text-right" />
        </div>
      </div>

      {/* ── Vehículo y tipo de servicio ── */}
      <div className="flex flex-col gap-4">
        <SectionTitle icon={Car} label="Vehículo y tipo de servicio" />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">
            Vehículo <span className="text-red-400">*</span>
          </label>
          <select value={activeCase.vehicleId} onChange={(e) => update({ vehicleId: e.target.value })}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
            <option value="">— Seleccionar vehículo —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id} disabled={v.status === "RENTADO" && v.id !== activeCase.vehicleId}>
                {v.marca} {v.modelo} {v.anio} — {v.placas}
                {v.status === "RENTADO" && v.id !== activeCase.vehicleId ? " (Rentado)" : ` · $${v.rentaDia}/día`}
              </option>
            ))}
          </select>
        </div>

        {/* Con / Sin operador toggle */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Tipo de servicio</label>
          <div className="flex rounded-xl overflow-hidden border border-[hsl(217,25%,16%)]">
            <button
              onClick={() => update({ tipoContrato: "SIN_OPERADOR" })}
              className={cn("flex-1 py-2.5 text-xs font-bold transition-all",
                !conOp ? "bg-amber-500 text-[hsl(222,47%,4%)]" : "bg-[hsl(217,25%,9%)] text-[hsl(215,20%,50%)] hover:text-amber-400")}>
              Sin operador
            </button>
            <button
              onClick={() => update({ tipoContrato: "CON_OPERADOR" })}
              className={cn("flex-1 py-2.5 text-xs font-bold transition-all",
                conOp ? "bg-amber-500 text-[hsl(222,47%,4%)]" : "bg-[hsl(217,25%,9%)] text-[hsl(215,20%,50%)] hover:text-amber-400")}>
              Con operador
            </button>
          </div>
        </div>
      </div>

      {/* ── Fechas y horarios ── */}
      <div className="flex flex-col gap-4">
        <SectionTitle icon={Calendar} label="Fechas y horarios" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha salida" value={activeCase.fechaInicio} onChange={(v) => update({ fechaInicio: v })} type="date" required />
          <Field label="Hora salida" value={activeCase.horaInicio} onChange={(v) => update({ horaInicio: v })} type="time" />
          <Field label="Fecha regreso" value={activeCase.fechaFin} onChange={(v) => update({ fechaFin: v })} type="date" required />
          <Field label="Hora regreso" value={activeCase.horaFin} onChange={(v) => update({ horaFin: v })} type="time" />
        </div>
      </div>

      {/* ── Ruta ── */}
      <div className="flex flex-col gap-4">
        <SectionTitle icon={MapPin} label="Ruta del viaje" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Origen del viaje" value={activeCase.origenViaje} onChange={(v) => update({ origenViaje: v })} placeholder="Ciudad de México" required />
          <Field label="Destino del viaje" value={activeCase.destinoViaje} onChange={(v) => update({ destinoViaje: v })} placeholder="Monterrey, N.L." required />
        </div>
      </div>

      {/* ── Importes ── */}
      <div className="flex flex-col gap-4">
        <SectionTitle icon={CreditCard} label="Importes" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Importe renta acordado ($)" value={activeCase.montoRenta || ""}
            onChange={(v) => update({ montoRenta: +v })} type="number" placeholder="0" required />
          <Field label="Monto apartado / depósito ($)" value={activeCase.apartadoMonto || ""}
            onChange={(v) => update({ apartadoMonto: +v })} type="number" placeholder="0" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Forma de pago</label>
          <select value={activeCase.formaPago} onChange={(e) => update({ formaPago: e.target.value })}
            className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
            {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Saldo pendiente preview */}
        {activeCase.montoRenta > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Renta total", val: `$${activeCase.montoRenta.toLocaleString()}`, color: "text-[hsl(210,40%,85%)]" },
              { label: "Apartado", val: `$${activeCase.apartadoMonto.toLocaleString()}`, color: "text-amber-400" },
              { label: "Saldo pendiente", val: `$${(activeCase.montoRenta - activeCase.apartadoMonto).toLocaleString()}`, color: "text-emerald-400" },
            ].map(({ label, val, color }) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-[hsl(217,25%,9%)] border border-[hsl(217,25%,14%)]">
                <p className="text-[9px] text-[hsl(215,20%,45%)] uppercase tracking-widest">{label}</p>
                <p className={cn("text-sm font-bold mt-0.5", color)}>{val}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Participantes ── */}
      <div className="flex flex-col gap-4">
        <SectionTitle icon={Users} label={conOp ? "Participantes (servicio con operador)" : "Participantes"} />
        {conOp && (
          <p className="text-[11px] text-amber-500/60 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2">
            Servicio con operador: el operador es requerido. El Testigo es opcional.
          </p>
        )}

        <ParticipantSelector
          participants={activeCase.participants}
          onAddParticipant={(p) => {
            update({ participants: [...activeCase.participants, p] });
            setCaseError("");
          }}
          onRemoveParticipant={(userId, orgId) => {
            update({
              participants: activeCase.participants.filter(
                (p) => p.userId !== userId && p.organizationId !== orgId
              ),
            });
          }}
        />
      </div>

      {/* ── Notas internas ── */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Notas internas</label>
        <textarea value={activeCase.notas} onChange={(e) => update({ notas: e.target.value })}
          rows={3} placeholder="Observaciones, condiciones especiales, acuerdos verbales…"
          className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all resize-none" />
      </div>

      {/* Legal notice */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[hsl(217,25%,8%)] border border-[hsl(217,25%,14%)]">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/50 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[hsl(215,20%,40%)] leading-relaxed">
          El apartado no garantiza la renta del vehículo. La aprobación está sujeta a la validación
          de la documentación y cumplimiento de los registros de cada participante.
        </p>
      </div>
    </div>
  );
}
