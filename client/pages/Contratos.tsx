/**
 * LUXORA — Módulo de Contratos de Renta.
 * Generación, firma digital y gestión de contratos vinculados a clientes.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText, Plus, Search, ArrowLeft, ChevronRight, CheckCircle2,
  Clock, AlertTriangle, XCircle, Edit3, Trash2, User, Car,
  Calendar, MapPin, DollarSign, PenTool, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavShell } from "@/components/luxora/NavShell";
import {
  type Contrato, type ContratoEstado, type Cliente,
  getContratos, getClientes, saveContrato, createContrato, deleteContrato,
} from "@/lib/store";

// ─── Estado del contrato ──────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<ContratoEstado, { label: string; color: string; icon: React.ElementType }> = {
  borrador:        { label: "Borrador",        color: "text-[hsl(215,20%,50%)] bg-[hsl(217,25%,10%)] border-[hsl(217,25%,18%)]", icon: Edit3 },
  pendiente_firma: { label: "Pendiente firma", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Clock },
  firmado:         { label: "Firmado",         color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  activo:          { label: "Activo",          color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Car },
  cerrado:         { label: "Cerrado",         color: "text-[hsl(215,20%,40%)] bg-[hsl(217,25%,8%)] border-[hsl(217,25%,13%)]", icon: CheckCircle2 },
  cancelado:       { label: "Cancelado",       color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
};

const VEHICULOS = ["Toyota Hiace 2023", "Toyota Hiace 2025", "Ford Transit 2024", "Hyundai Tucson 2018"];
const FORMAS_PAGO = ["Transferencia", "Efectivo", "Tarjeta de crédito", "Tarjeta de débito"];

// ─── Input helper ─────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "text", placeholder = "", className = "" }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 focus:shadow-[0_0_0_2px_hsla(38,92%,50%,0.10)] transition-all" />
    </div>
  );
}

// ─── Firma digital con canvas ─────────────────────────────────────────────────

function FirmaCanvas({ onFirma }: { onFirma: (base64: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasFirma, setHasFirma] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasFirma(true);
  }, []);

  const endDraw = useCallback(() => {
    drawing.current = false;
    if (hasFirma && canvasRef.current) {
      onFirma(canvasRef.current.toDataURL("image/png"));
    }
  }, [hasFirma, onFirma]);

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasFirma(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Firma del cliente</span>
        {hasFirma && (
          <button type="button" onClick={clear} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">Borrar</button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={150}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        className="w-full h-32 rounded-xl border-2 border-dashed border-amber-500/30 bg-[hsl(217,25%,7%)] cursor-crosshair touch-none"
        style={{ touchAction: "none" }}
      />
      {!hasFirma && (
        <p className="text-[10px] text-[hsl(215,20%,38%)] text-center">Dibuja tu firma con el mouse o con el dedo en pantalla táctil</p>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "form" | "firma">("list");
  const [active, setActive] = useState<Contrato | null>(null);
  const [showFirma, setShowFirma] = useState(false);

  const reload = () => { setContratos(getContratos()); setClientes(getClientes()); };
  useEffect(() => { reload(); }, []);

  const filtered = contratos.filter((c) => {
    const cliente = clientes.find((cl) => cl.id === c.clienteId);
    const q = search.toLowerCase();
    return `${c.numero} ${c.vehiculo} ${cliente?.nombre ?? ""} ${cliente?.apellidoPaterno ?? ""}`.toLowerCase().includes(q);
  });

  const startNew = (clienteId?: string) => {
    const c = createContrato(clienteId ?? clientes[0]?.id ?? "");
    setActive(c);
    setView("form");
  };

  const openDetail = (c: Contrato) => { setActive(c); setView("form"); };
  const goBack = () => { reload(); setView("list"); setActive(null); };

  const update = (fields: Partial<Contrato>) => {
    if (!active) return;
    const updated = { ...active, ...fields };
    setActive(updated);
    saveContrato(updated);
  };

  const handleFirma = (base64: string) => {
    update({ firmaCliente: base64, firmadoEn: new Date().toISOString(), estado: "firmado" });
    setShowFirma(false);
  };

  const exportPDF = async () => {
    if (!active) return;
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const cliente = clientes.find((c) => c.id === active.clienteId);

    pdf.setFillColor(6, 13, 24);
    pdf.rect(0, 0, 210, 297, "F");
    pdf.setTextColor(245, 158, 11);
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("LUXORA — Contrato de Renta", 105, 25, { align: "center" });
    pdf.setTextColor(200, 200, 220);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Contrato No. ${active.numero}`, 105, 34, { align: "center" });
    pdf.setFontSize(9);
    pdf.text(`Fecha: ${new Date(active.createdAt).toLocaleDateString("es-MX")}`, 105, 41, { align: "center" });

    let y = 55;
    const addSection = (title: string, rows: [string, string][]) => {
      pdf.setTextColor(245, 158, 11);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(title.toUpperCase(), 15, y);
      y += 7;
      pdf.setTextColor(200, 200, 220);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      rows.forEach(([k, v]) => {
        pdf.text(k + ":", 20, y);
        pdf.text(v || "—", 80, y);
        y += 6;
      });
      y += 4;
    };

    addSection("Cliente", [
      ["Nombre", `${cliente?.nombre ?? ""} ${cliente?.apellidoPaterno ?? ""}`],
      ["CURP", cliente?.curp ?? ""],
      ["RFC", cliente?.rfc ?? ""],
      ["Email", cliente?.email ?? ""],
      ["Teléfono", cliente?.telefono ?? ""],
    ]);

    addSection("Vehículo", [
      ["Unidad", active.vehiculo],
      ["Placas", active.placas],
      ["Color", active.color],
    ]);

    addSection("Renta", [
      ["Fecha inicio", active.fechaInicio],
      ["Fecha fin", active.fechaFin],
      ["Lugar entrega", active.lugarEntrega],
      ["Lugar devolución", active.lugarDevolucion],
    ]);

    addSection("Financiero", [
      ["Monto renta", `$${active.montoRenta.toLocaleString("es-MX")} MXN`],
      ["Depósito", `$${active.deposito.toLocaleString("es-MX")} MXN`],
      ["Forma de pago", active.formaPago],
    ]);

    if (active.origenViaje) {
      addSection("Ruta del Viaje", [
        ["Origen", active.origenViaje],
        ["Destino", active.destinoViaje],
      ]);
    }

    if (active.notas) {
      addSection("Notas", [["Observaciones", active.notas]]);
    }

    // Firma
    if (active.firmaCliente) {
      y += 5;
      pdf.setTextColor(245, 158, 11);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("FIRMA DEL CLIENTE", 15, y);
      y += 4;
      pdf.addImage(active.firmaCliente, "PNG", 15, y, 60, 20);
      y += 25;
      pdf.setTextColor(150, 160, 180);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Firmado el: ${new Date(active.firmadoEn).toLocaleString("es-MX")}`, 15, y);
    }

    pdf.save(`LUXORA_Contrato_${active.numero}.pdf`);
  };

  // ── Vista: Lista ─────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <NavShell>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display font-bold text-2xl text-[hsl(210,40%,95%)]">Contratos de Renta</h1>
              <p className="text-sm text-[hsl(215,20%,45%)] mt-0.5">Gestión de contratos · Firma digital</p>
            </div>
            <button onClick={() => startNew()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
              <Plus className="w-4 h-4" /> Nuevo Contrato
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20%,40%)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número, vehículo o cliente…"
              className="w-full bg-[hsl(217,25%,8%)] text-[hsl(210,40%,90%)] placeholder:text-[hsl(215,20%,38%)] rounded-xl border border-[hsl(217,25%,13%)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-amber-500/40 transition-all" />
          </div>

          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <FileText className="w-12 h-12 text-amber-500/20 mx-auto mb-3" />
              <p className="text-[hsl(215,20%,50%)] text-sm">
                {contratos.length === 0 ? "Aún no hay contratos generados" : "Sin resultados"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((c) => {
                const estado = ESTADO_CONFIG[c.estado];
                const EIcon = estado.icon;
                const cliente = clientes.find((cl) => cl.id === c.clienteId);
                return (
                  <div key={c.id} className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-amber-500/20 transition-all border border-transparent group">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-amber-300">{c.numero}</p>
                        <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", estado.color)}>
                          <EIcon className="w-2.5 h-2.5" />{estado.label}
                        </span>
                      </div>
                      <p className="text-xs text-[hsl(210,40%,80%)] truncate">{c.vehiculo || "Vehículo sin asignar"}</p>
                      <p className="text-xs text-[hsl(215,20%,45%)] truncate">
                        {cliente ? `${cliente.nombre} ${cliente.apellidoPaterno}` : "Cliente sin asignar"} · {c.fechaInicio || "Sin fecha"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openDetail(c)} className="p-2 rounded-xl text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { deleteContrato(c.id); reload(); }} className="p-2 rounded-xl text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
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

  // ── Vista: Formulario de contrato ────────────────────────────────────────────
  if (!active) return null;
  const estado = ESTADO_CONFIG[active.estado];
  const EIcon = estado.icon;
  const clienteActivo = clientes.find((c) => c.id === active.clienteId);

  return (
    <NavShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={goBack} className="p-2 rounded-xl text-[hsl(215,20%,50%)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-[hsl(210,40%,95%)]">{active.numero}</h1>
              <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", estado.color)}>
                <EIcon className="w-2.5 h-2.5" />{estado.label}
              </span>
            </div>
            <p className="text-xs text-[hsl(215,20%,45%)]">Contrato de Renta VIP</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-all">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            {active.estado !== "firmado" && (
              <button onClick={() => { update({ estado: "pendiente_firma" }); setShowFirma(true); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gold-gradient text-[hsl(222,47%,4%)] hover:brightness-105 transition-all">
                <PenTool className="w-3.5 h-3.5" /> Firmar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Cliente */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold tracking-widest text-amber-500/60 uppercase mb-4 flex items-center gap-2">
              <User className="w-3.5 h-3.5" />Cliente
            </h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Seleccionar cliente</label>
              <select value={active.clienteId} onChange={(e) => update({ clienteId: e.target.value })}
                className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                <option value="">— Seleccionar cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre} {c.apellidoPaterno} · {c.riskLevel}</option>
                ))}
              </select>
              {clienteActivo && (
                <div className="flex items-center gap-2 mt-1 text-xs text-[hsl(215,20%,50%)]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {clienteActivo.email} · {clienteActivo.telefono}
                </div>
              )}
            </div>
          </div>

          {/* Vehículo */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold tracking-widest text-amber-500/60 uppercase mb-4 flex items-center gap-2">
              <Car className="w-3.5 h-3.5" />Vehículo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Unidad</label>
                <select value={active.vehiculo} onChange={(e) => update({ vehiculo: e.target.value })}
                  className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                  <option value="">— Seleccionar —</option>
                  {VEHICULOS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <Field label="Placas" value={active.placas} onChange={(v) => update({ placas: v })} placeholder="ABC-123-D" />
              <Field label="Color" value={active.color} onChange={(v) => update({ color: v })} placeholder="Blanco" />
            </div>
          </div>

          {/* Renta */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold tracking-widest text-amber-500/60 uppercase mb-4 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />Fechas y Lugares
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Fecha de inicio" value={active.fechaInicio} onChange={(v) => update({ fechaInicio: v })} type="date" />
              <Field label="Fecha de fin" value={active.fechaFin} onChange={(v) => update({ fechaFin: v })} type="date" />
              <Field label="Lugar de entrega" value={active.lugarEntrega} onChange={(v) => update({ lugarEntrega: v })} />
              <Field label="Lugar de devolución" value={active.lugarDevolucion} onChange={(v) => update({ lugarDevolucion: v })} />
            </div>
          </div>

          {/* Ruta del viaje */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold tracking-widest text-amber-500/60 uppercase mb-4 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />Ruta del Viaje
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Origen" value={active.origenViaje} onChange={(v) => update({ origenViaje: v })} placeholder="Ciudad de México" />
              <Field label="Destino" value={active.destinoViaje} onChange={(v) => update({ destinoViaje: v })} placeholder="Acapulco" />
            </div>
          </div>

          {/* Financiero */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold tracking-widest text-amber-500/60 uppercase mb-4 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" />Financiero
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Monto renta (MXN)" value={active.montoRenta} onChange={(v) => update({ montoRenta: parseFloat(v) || 0 })} type="number" placeholder="0" />
              <Field label="Depósito (MXN)" value={active.deposito} onChange={(v) => update({ deposito: parseFloat(v) || 0 })} type="number" placeholder="0" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-amber-500/70 uppercase tracking-widest">Forma de pago</label>
                <select value={active.formaPago} onChange={(e) => update({ formaPago: e.target.value })}
                  className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all">
                  {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold tracking-widest text-amber-500/60 uppercase mb-3">Notas / Condiciones</h3>
            <textarea value={active.notas} onChange={(e) => update({ notas: e.target.value })}
              rows={3} placeholder="Condiciones especiales, restricciones de uso, acuerdos adicionales…"
              className="w-full bg-[hsl(217,25%,9%)] text-[hsl(210,40%,93%)] placeholder:text-[hsl(215,20%,35%)] rounded-xl border border-[hsl(217,25%,14%)] px-3 py-2.5 text-sm outline-none focus:border-amber-500/50 resize-none transition-all" />
          </div>

          {/* Firma digital */}
          {(showFirma || active.firmaCliente) && (
            <div className="glass-card rounded-2xl p-5 border border-amber-500/20">
              <h3 className="text-xs font-bold tracking-widest text-amber-500/60 uppercase mb-4 flex items-center gap-2">
                <PenTool className="w-3.5 h-3.5" />Firma Digital
              </h3>
              {active.firmaCliente ? (
                <div>
                  <img src={active.firmaCliente} alt="Firma" className="h-20 bg-[hsl(217,25%,7%)] rounded-xl border border-amber-500/15 p-2" />
                  <p className="text-xs text-[hsl(215,20%,45%)] mt-2">
                    Firmado: {new Date(active.firmadoEn).toLocaleString("es-MX")}
                  </p>
                </div>
              ) : (
                <FirmaCanvas onFirma={handleFirma} />
              )}
            </div>
          )}

          {/* Estado */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold tracking-widest text-amber-500/60 uppercase mb-3">Estado del contrato</h3>
            <div className="flex flex-wrap gap-2">
              {(["borrador","pendiente_firma","firmado","activo","cerrado","cancelado"] as ContratoEstado[]).map((e) => {
                const cfg = ESTADO_CONFIG[e];
                const Icon = cfg.icon;
                return (
                  <button key={e} type="button" onClick={() => update({ estado: e })}
                    className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all",
                      active.estado === e ? cfg.color + " ring-1 ring-offset-0" : "border-[hsl(217,25%,18%)] text-[hsl(215,20%,45%)] hover:border-amber-500/25")}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </NavShell>
  );
}
