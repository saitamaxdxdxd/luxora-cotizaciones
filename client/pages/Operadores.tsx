/**
 * LUXORA — Módulo de Operadores
 * Gestión de conductores/operadores VIP para rentals.
 */
import { useState, useEffect, useRef } from "react";
import { Users, Plus, Search, Trash2, ArrowLeft, CheckCircle2, AlertTriangle, Upload, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavShell } from "@/components/luxora/NavShell";
import { type Operator, getOperators, saveOperator, createOperator, deleteOperator, seedOperatorsIfEmpty } from "@/lib/store";
import { compressImage } from "@/lib/imageUtils";

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
      <span className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Fotografía del operador</span>
      {value ? (
        <div className="rounded-xl overflow-hidden border border-emerald-500/25 relative">
          <img src={value} alt="Operador" className="w-full h-40 object-cover" />
          <div className="absolute top-2 right-2 flex gap-1">
            <button onClick={() => ref.current?.click()} className="p-1.5 rounded-lg bg-[hsl(217,25%,12%)] text-amber-400 hover:bg-amber-500/10 transition-colors"><RefreshCw className="w-3 h-3" /></button>
            <button onClick={() => onChange("")} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} className="flex flex-col items-center gap-2 p-8 rounded-xl border border-dashed border-[hsl(217,25%,20%)] hover:border-amber-500/40 hover:bg-amber-500/3 transition-all text-[hsl(215,20%,45%)] hover:text-amber-400">
          <Upload className="w-6 h-6" /><span className="text-xs">Subir foto del operador</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}

export default function Operadores() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "form">("list");
  const [active, setActive] = useState<Operator | null>(null);

  const reload = () => { seedOperatorsIfEmpty(); setOperators(getOperators()); };
  useEffect(() => { reload(); }, []);

  const filtered = operators.filter((o) => {
    const q = search.toLowerCase();
    return `${o.nombre} ${o.apellidoPaterno} ${o.apellidoMaterno} ${o.telefono}`.toLowerCase().includes(q);
  });

  const openNew = () => { setActive(createOperator()); setView("form"); };
  const openEdit = (o: Operator) => { setActive(o); setView("form"); };
  const goBack = () => { reload(); setView("list"); setActive(null); };
  const update = (fields: Partial<Operator>) => {
    if (!active) return;
    const updated = { ...active, ...fields };
    setActive(updated); saveOperator(updated);
  };

  if (view === "list") {
    return (
      <NavShell>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-[hsl(210,40%,95%)]">Operadores</h1>
              <p className="text-sm text-[hsl(215,20%,45%)] mt-0.5">Conductores VIP disponibles para asignar a rentals</p>
            </div>
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
              <Plus className="w-4 h-4" /> Agregar operador
            </button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,40%)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, teléfono…"
              className="w-full bg-[hsl(217,25%,8%)] text-[hsl(210,40%,90%)] placeholder:text-[hsl(215,20%,38%)] rounded-xl border border-[hsl(217,25%,13%)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-all" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((o) => (
              <div key={o.id} onClick={() => openEdit(o)}
                className="glass-card rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all border border-transparent cursor-pointer group">
                {/* Photo */}
                <div className="h-36 bg-[hsl(217,25%,9%)] flex items-center justify-center overflow-hidden">
                  {o.foto ? <img src={o.foto} alt="" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-amber-500/20" />}
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[hsl(210,40%,92%)] text-sm">{o.nombre} {o.apellidoPaterno}</p>
                      <p className="text-xs text-[hsl(215,20%,50%)]">{o.edad} años · {o.telefono}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[hsl(215,20%,45%)]">Día</p>
                      <p className="font-bold text-amber-400">${o.salarioDia}</p>
                    </div>
                    <div>
                      <p className="text-[hsl(215,20%,45%)]">Alimentos</p>
                      <p className="font-bold text-emerald-400">${o.alimentosDia}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteOperator(o.id); reload(); }}
                    className="mt-1 w-full p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" /><span className="text-xs">Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 glass-card rounded-2xl p-12 text-center">
                <Users className="w-12 h-12 text-amber-500/20 mx-auto mb-3" />
                <p className="text-[hsl(215,20%,50%)] text-sm">{operators.length === 0 ? "No hay operadores registrados" : "Sin resultados"}</p>
              </div>
            )}
          </div>
        </div>
      </NavShell>
    );
  }

  if (!active) return null;
  return (
    <NavShell>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={goBack} className="p-2 rounded-xl text-[hsl(215,20%,50%)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="font-bold text-lg text-[hsl(210,40%,95%)]">
            {active.nombre ? `${active.nombre} ${active.apellidoPaterno}` : "Nuevo Operador"}
          </h1>
        </div>
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <FotoUpload value={active.foto} onChange={(v) => update({ foto: v })} />
          
          {/* Datos personales */}
          <div>
            <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Datos Personales</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre" value={active.nombre} onChange={(v) => update({ nombre: v })} placeholder="Carlos" />
              <Field label="Apellido Paterno" value={active.apellidoPaterno} onChange={(v) => update({ apellidoPaterno: v })} placeholder="Rodríguez" />
              <Field label="Apellido Materno" value={active.apellidoMaterno} onChange={(v) => update({ apellidoMaterno: v })} placeholder="García" />
              <Field label="Edad" value={active.edad} onChange={(v) => update({ edad: +v })} type="number" placeholder="35" />
              <Field label="Teléfono" value={active.telefono} onChange={(v) => update({ telefono: v })} placeholder="5551234567" />
            </div>
          </div>

          {/* Domicilio */}
          <div>
            <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Domicilio</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Calle" value={active.calle} onChange={(v) => update({ calle: v })} placeholder="Av. Paseo" />
              <Field label="Número" value={active.numero} onChange={(v) => update({ numero: v })} placeholder="123" />
              <Field label="Colonia" value={active.colonia} onChange={(v) => update({ colonia: v })} placeholder="Centro" />
              <Field label="Ciudad" value={active.ciudad} onChange={(v) => update({ ciudad: v })} placeholder="CDMX" />
              <Field label="Estado" value={active.estado} onChange={(v) => update({ estado: v })} placeholder="Ciudad de México" />
              <Field label="CP" value={active.cp} onChange={(v) => update({ cp: v })} placeholder="06600" />
            </div>
          </div>

          {/* Tarifa */}
          <div>
            <p className="text-xs font-semibold text-amber-500/60 uppercase tracking-widest mb-3">Tarifa ($MXN)</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Salario por Día" value={active.salarioDia} onChange={(v) => update({ salarioDia: +v })} type="number" placeholder="800" />
              <Field label="Alimentos por Día" value={active.alimentosDia} onChange={(v) => update({ alimentosDia: +v })} type="number" placeholder="300" />
              <Field label="Hospedaje por Noche" value={active.hospedajNoche} onChange={(v) => update({ hospedajNoche: +v })} type="number" placeholder="500" />
            </div>
          </div>

          {/* Notas */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Notas</label>
            <textarea value={active.notas} onChange={(e) => update({ notas: e.target.value })} rows={2}
              placeholder="Experiencia, especialidades, idiomas, etc…"
              className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2 text-sm outline-none focus:border-amber-500/50 transition-all resize-none" />
          </div>

          <div className="flex justify-between pt-2 border-t border-amber-500/10">
            <button onClick={goBack} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[hsl(215,20%,55%)] border border-[hsl(217,25%,18%)] hover:border-amber-500/25 hover:text-amber-400 transition-all">
              <ArrowLeft className="w-4 h-4" />Volver
            </button>
            <button onClick={() => { saveOperator(active); goBack(); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
              <CheckCircle2 className="w-4 h-4" />Guardar operador
            </button>
          </div>
        </div>
      </div>
    </NavShell>
  );
}
