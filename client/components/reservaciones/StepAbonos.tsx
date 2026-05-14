/**
 * LUXORA — Paso "Abonos"
 * Registro de pagos parciales con balance y saldo actualizado.
 */
import { useState } from "react";
import { Plus, Trash2, CreditCard, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type RentalCase, type Abono } from "@/lib/store";

const FORMAS_PAGO = ["Transferencia", "Efectivo", "Tarjeta de crédito", "Tarjeta de débito", "Cheque"];

const fmtMXN = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });

interface Props {
  activeCase: RentalCase;
  update: (fields: Partial<RentalCase>) => void;
}

export function StepAbonos({ activeCase, update }: Props) {
  const [form, setForm] = useState<Omit<Abono, "id">>({
    monto: 0,
    fecha: new Date().toISOString().slice(0, 10),
    formaPago: "Transferencia",
    notas: "",
  });
  const [adding, setAdding] = useState(false);

  const apartado = activeCase.apartadoMonto || 0;
  const totalAbonado = activeCase.abonos.reduce((s, a) => s + a.monto, 0) + apartado;
  const saldo = activeCase.montoRenta - totalAbonado;
  const pct = activeCase.montoRenta > 0 ? Math.min(100, Math.round((totalAbonado / activeCase.montoRenta) * 100)) : 0;

  const addAbono = () => {
    if (!form.monto || form.monto <= 0) return;
    const abono: Abono = { id: `abono-${Date.now()}`, ...form };
    update({ abonos: [...activeCase.abonos, abono] });
    setForm({ monto: 0, fecha: new Date().toISOString().slice(0, 10), formaPago: "Transferencia", notas: "" });
    setAdding(false);
  };

  const removeAbono = (id: string) => {
    update({ abonos: activeCase.abonos.filter((a) => a.id !== id) });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Renta total",    val: fmtMXN(activeCase.montoRenta),  color: "text-[hsl(210,40%,85%)]" },
          { label: "Total abonado",  val: fmtMXN(totalAbonado),           color: "text-emerald-400" },
          { label: "Saldo pendiente", val: fmtMXN(Math.max(0, saldo)),    color: saldo <= 0 ? "text-emerald-400" : "text-amber-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="px-3 py-3 rounded-xl bg-[hsl(217,25%,9%)] border border-[hsl(217,25%,14%)]">
            <p className="text-[9px] text-[hsl(215,20%,45%)] uppercase tracking-widest mb-1">{label}</p>
            <p className={cn("text-base font-bold", color)}>{val}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[10px] text-[hsl(215,20%,45%)]">
          <span>Avance de pago</span>
          <span className="font-bold text-emerald-400">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-[hsl(217,25%,12%)] overflow-hidden">
          <div className={cn("h-full rounded-full transition-all",
            pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Abonos list */}
      {(apartado > 0 || activeCase.abonos.length > 0) ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-amber-500/70 uppercase tracking-widest">Historial de abonos</p>

          {/* Depósito inicial / Apartado (from reservation) */}
          {apartado > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-400">{fmtMXN(apartado)}</p>
                  <p className="text-[10px] text-[hsl(215,20%,45%)]">
                    {activeCase.apartadoFecha || "—"} · {activeCase.formaPago || "—"}
                  </p>
                  <p className="text-[10px] text-amber-500/60 italic">Depósito inicial / Apartado</p>
                </div>
              </div>
              {/* No delete — this is part of the reservation record */}
            </div>
          )}

          {activeCase.abonos.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[hsl(217,25%,9%)] border border-[hsl(217,25%,14%)]">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-400">{fmtMXN(a.monto)}</p>
                  <p className="text-[10px] text-[hsl(215,20%,45%)]">{a.fecha} · {a.formaPago}</p>
                  {a.notas && <p className="text-[10px] text-amber-500/50 italic">{a.notas}</p>}
                </div>
              </div>
              <button onClick={() => removeAbono(a.id)}
                className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-[hsl(215,20%,40%)] text-xs">
          No hay abonos registrados. Registra el primer pago usando el botón de abajo.
        </div>
      )}

      {/* Add abono */}
      {adding ? (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-[hsl(217,25%,9%)] border border-amber-500/20">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Registrar abono</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Monto ($)</label>
              <input type="number" value={form.monto || ""} placeholder="0"
                onChange={(e) => setForm({ ...form, monto: +e.target.value })}
                className="w-full bg-[hsl(217,25%,12%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,18%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Fecha</label>
              <input type="date" value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full bg-[hsl(217,25%,12%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,18%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Forma de pago</label>
            <select value={form.formaPago} onChange={(e) => setForm({ ...form, formaPago: e.target.value })}
              className="w-full bg-[hsl(217,25%,12%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,18%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
              {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Notas</label>
            <input type="text" value={form.notas} placeholder="Observaciones del pago…"
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full bg-[hsl(217,25%,12%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,18%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-[hsl(215,20%,50%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/20 transition-all">
              Cancelar
            </button>
            <button onClick={addAbono}
              className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-all">
              Guardar abono
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-all">
          <Plus className="w-4 h-4" />
          Registrar abono
        </button>
      )}
    </div>
  );
}
