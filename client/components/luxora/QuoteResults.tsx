/**
 * LUXORA - Panel de Resultados de Cotización
 * Muestra el desglose completo de costos con acciones de exportación.
 */

import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PrintableQuote } from "./PrintableQuote";
import { PrintableQuotePhone } from "./PrintableQuotePhone";
import {
  Download,
  MessageCircle,
  Fuel,
  Car,
  User,
  Route,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TriangleAlert,
  FileText,
  BadgeCheck,
  Lightbulb,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type QuoteResult } from "@/lib/calculations";
import { formatMXN, formatKm } from "@/data/config";
import type { FormState } from "./QuoteForm";

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuoteResultsProps {
  result: QuoteResult | null;
  formState: FormState | null;
  isCalculating: boolean;
  error: string | null;
  routeSuggestion?: {
    message: string;
    suggestedLabels: string[];
    savingKm: number;
  };
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

/** Fila de costo individual con valores antes/después de redondeo */
function CostRow({
  icon,
  label,
  rawValue,
  roundedValue,
  highlight = false,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  rawValue: number;
  roundedValue: number;
  highlight?: boolean;
  note?: string;
}) {
  const isRounded = rawValue !== roundedValue;
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3 px-4 rounded-xl transition-colors",
        highlight
          ? "bg-amber-500/8 border border-amber-500/15"
          : "bg-[hsl(217,25%,9%)] border border-[hsl(217,25%,13%)]"
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div
          className={cn(
            "mt-0.5 flex-shrink-0",
            highlight ? "text-amber-400" : "text-amber-500/50"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "text-sm font-medium",
              highlight ? "text-amber-200" : "text-[hsl(210,40%,85%)]"
            )}
          >
            {label}
          </p>
          {isRounded && (
            <p className="text-xs text-[hsl(215,20%,40%)] mt-0.5">
              Base:{" "}
              <span className="line-through decoration-red-400/60">
                {formatMXN(rawValue)}
              </span>{" "}
              → redondeado
            </p>
          )}
          {note && (
            <p className="text-xs text-amber-500/40 mt-0.5">{note}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span
          className={cn(
            "text-base font-bold tabular-nums",
            highlight ? "text-amber-300" : "text-[hsl(210,40%,92%)]"
          )}
        >
          {formatMXN(roundedValue)}
        </span>
      </div>
    </div>
  );
}

/** Fila informativa (sin costo) */
function InfoRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-1">
      <span className="text-xs text-[hsl(215,20%,45%)]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-[hsl(210,40%,85%)]">
          {value}
        </span>
        {sub && (
          <p className="text-xs text-[hsl(215,20%,40%)]">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function QuoteResults({
  result,
  formState,
  isCalculating,
  error,
  routeSuggestion,
}: QuoteResultsProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);

  // ─── Share Image (Imagen móvil 9:16 para WhatsApp) ────────────────────────
  const handleShareImage = async () => {
    if (!result || !formState) return;
    setExportingImage(true);
    try {
      const [html2canvasModule] = await Promise.all([
        import("html2canvas"),
      ]);
      const html2canvas = html2canvasModule.default;

      // ── Renderizar PrintableQuotePhone (1080x1920px, 9:16) off-screen ──────
      const offscreen = document.createElement("div");
      offscreen.style.cssText =
        "position:fixed;left:-9999px;top:0;width:1080px;height:1920px;z-index:-1;pointer-events:none;";
      document.body.appendChild(offscreen);

      await new Promise<void>((resolve) => {
        const root = createRoot(offscreen);
        root.render(
          <PrintableQuotePhone result={result} formState={formState} />
        );
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      // ── Capturar con html2canvas (máxima resolución) ──────────────────────
      const canvas = await html2canvas(offscreen.firstElementChild as HTMLElement, {
        backgroundColor: "#060d18",
        scale: 1, // Ya está a 1080px, no necesita escalar
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1080,
        windowHeight: 1920,
      });

      document.body.removeChild(offscreen);

      // ── Convertir a PNG y descargar ────────────────────────────────────────
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png", 0.95); // 95% quality para archivo pequeño
      link.download = `LUXORA_${formState.destinationText?.slice(0, 20) ?? "VIP"}_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();

      // Mostrar instrucción para compartir
      alert(
        "✅ Imagen descargada (1080x1920px, optimizada para móvil)\n\n💡 Para compartir por WhatsApp:\n1. Abre WhatsApp\n2. Haz tap en el clip (📎)\n3. Selecciona: Galería\n4. Elige la imagen descargada\n5. Envía"
      );
    } catch (err) {
      console.error("[LUXORA] Error generando imagen:", err);
      alert("❌ Error al generar la imagen");
    } finally {
      setExportingImage(false);
    }
  };

  // ─── WhatsApp ─────────────────────────────────────────────────────────────
  const handleWhatsApp = () => {
    if (!result || !formState) return;

    const dep = new Date(formState.departureDateTime);
    const ret = new Date(formState.returnDateTime);
    const dateFormat = (d: Date) =>
      d.toLocaleString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    const msg = [
      "🚐 *LUXORA – Cotización VIP*",
      "",
      `📍 *Origen:* ${formState.originText}`,
      `📍 *Destino:* ${formState.destinationText}`,
      "",
      `📅 *Salida:* ${dateFormat(dep)}`,
      `📅 *Regreso:* ${dateFormat(ret)}`,
      `🗓️ *Días:* ${result.rentalDays}`,
      "",
      `🚗 *Vehículo:* ${result.vehicleName}`,
      `👨‍✈️ *Operador VIP:* ${result.includeOperator ? "Incluido" : "No incluido"}`,
      "",
      "─────────────────",
      "*Desglose de Costos:*",
      `⛽ Combustible: ${formatMXN(result.fuelCostRounded)}`,
      `🛣️ Peajes: ${formatMXN(result.tollCostRounded)}`,
      `🚘 Renta: ${formatMXN(result.rentalCost)}`,
      ...(result.includeOperator
        ? [`👤 Operador: ${formatMXN(result.operatorBreakdown.total)}`]
        : []),
      "─────────────────",
      `💰 *TOTAL: ${formatMXN(result.finalTotal)}*`,
      "",
      "_Cotización generada con LUXORA Cotizador VIP_",
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  // ─── PDF Export ───────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!result || !formState) return;
    setExportingPdf(true);
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      // ── Renderizar PrintableQuote en un div off-screen ────────────────────
      const offscreen = document.createElement("div");
      offscreen.style.cssText =
        "position:fixed;left:-9999px;top:0;width:794px;z-index:-1;pointer-events:none;";
      document.body.appendChild(offscreen);

      await new Promise<void>((resolve) => {
        const root = createRoot(offscreen);
        root.render(
          <PrintableQuote result={result} formState={formState} />
        );
        // Esperar un frame para que React pinte el componente
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      // ── Capturar con html2canvas ──────────────────────────────────────────
      const canvas = await html2canvas(offscreen.firstElementChild as HTMLElement, {
        backgroundColor: "#060d18",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
      });

      document.body.removeChild(offscreen);

      // ── Generar PDF en A4 ajustando todo el contenido a 1 sola hoja ──────
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      // Escalar para que quepa exactamente en A4 (sin márgenes extra)
      const imgH = (canvas.height * pageW) / canvas.width;
      const finalH = Math.min(imgH, pageH); // nunca exceder la página
      pdf.addImage(imgData, "PNG", 0, 0, pageW, finalH);

      pdf.save(
        `LUXORA_${formState.destinationText?.slice(0, 20) ?? "VIP"}_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      console.error("[LUXORA] Error generando PDF:", err);
    } finally {
      setExportingPdf(false);
    }
  };

  // ─── Estado: Calculando ───────────────────────────────────────────────────
  if (isCalculating) {
    return (
      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 border-amber-500/20 animate-spin" />
          <div className="absolute inset-3 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Route className="w-5 h-5 text-amber-400" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[hsl(210,40%,85%)]">
            Calculando cotización
          </p>
          <p className="text-xs text-[hsl(215,20%,45%)] mt-1">
            Consultando ruta y peajes...
          </p>
        </div>
      </div>
    );
  }

  // ─── Estado: Error ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm font-medium text-red-400 text-center">{error}</p>
        <p className="text-xs text-[hsl(215,20%,45%)] text-center">
          Verifica tu conexión y los datos ingresados.
        </p>
      </div>
    );
  }

  // ─── Estado: Sin cotización aún ───────────────────────────────────────────
  if (!result) {
    return (
      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/8 border border-amber-500/15 flex items-center justify-center">
          <FileText className="w-8 h-8 text-amber-500/30" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[hsl(215,20%,55%)]">
            Tu cotización aparecerá aquí
          </p>
          <p className="text-xs text-[hsl(215,20%,40%)] mt-1.5 max-w-[200px] mx-auto">
            Completa el formulario y haz clic en{" "}
            <span className="text-amber-500/70 font-medium">
              Calcular Cotización
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ─── Resultado ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* ─── Contenido capturado para PDF ─────────────────────────────────── */}
      <div ref={printRef} className="flex flex-col gap-4">
      {/* ─── Sugerencia de optimización ────────────────────────────────── */}
      {routeSuggestion && (
        <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/30 rounded-2xl px-4 py-3 animate-fade-in">
          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-300">Sugerencia de ruta</p>
            <p className="text-xs text-amber-400/70 mt-0.5">{routeSuggestion.message}</p>
            <p className="text-xs text-amber-500/50 mt-1">
              Orden sugerido:{" "}
              {routeSuggestion.suggestedLabels.map((l, i) => (
                <span key={i} className="text-amber-400/70">{i > 0 ? " → " : ""}{l.split(",")[0]}</span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* ─── Encabezado de cotización ───────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg text-[hsl(210,40%,95%)]">Cotización VIP</h2>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <CheckCircle2 className="w-3 h-3" />Generada
          </div>
        </div>

        {/* Tramos de ida */}
        <div className="flex flex-col gap-1.5 mb-3">
          {result.outboundLegs.map((leg, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <MapPin className="w-3 h-3 text-amber-500/50 flex-shrink-0" />
              <span className="text-[hsl(210,40%,75%)] truncate max-w-[100px]">{leg.from.split(",")[0]}</span>
              <ArrowRight className="w-3 h-3 text-amber-500/30 flex-shrink-0" />
              <span className="text-[hsl(210,40%,75%)] truncate max-w-[100px]">{leg.to.split(",")[0]}</span>
              <span className="ml-auto text-[10px] text-amber-500/40 whitespace-nowrap tabular-nums">
                {leg.distanceKm.toFixed(1)} km · {leg.durationText}
              </span>
            </div>
          ))}
          {/* Regreso */}
          <div className="flex items-center gap-2 text-xs pt-1 mt-0.5 border-t border-amber-500/10">
            <RotateCcw className="w-3 h-3 text-amber-500/30 flex-shrink-0" />
            <span className="text-[hsl(215,20%,50%)] truncate max-w-[100px]">{result.returnLeg.from.split(",")[0]}</span>
            <ArrowRight className="w-3 h-3 text-amber-500/20 flex-shrink-0" />
            <span className="text-[hsl(215,20%,50%)] truncate max-w-[100px]">{result.returnLeg.to.split(",")[0]}</span>
            <span className="ml-auto text-[10px] text-amber-500/30 whitespace-nowrap tabular-nums">
              {result.returnLeg.distanceKm.toFixed(1)} km · {result.returnLeg.durationText}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Ida", value: formatKm(result.distanceOutboundKm), sub: `${result.outboundLegs.length} tramo${result.outboundLegs.length !== 1 ? "s" : ""}` },
            { label: "Regreso", value: formatKm(result.distanceReturnKm), sub: "directo" },
            { label: "Días", value: `${result.rentalDays}`, sub: result.rentalDays === 1 ? "día" : "días" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="text-center p-2 rounded-xl bg-[hsl(217,25%,9%)] border border-[hsl(217,25%,13%)]">
              <div className="text-[10px] text-[hsl(215,20%,45%)] uppercase tracking-wider">{label}</div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">{value}</div>
              <div className="text-[10px] text-[hsl(215,20%,38%)]">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Desglose de costos ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Header del desglose (visible en PDF) */}
        <div className="hidden-when-screen bg-[hsl(222,47%,5%)] p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Car className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="font-display font-bold text-lg text-gold-gradient">
                LUXORA
              </div>
              <div className="text-[10px] text-amber-500/50 tracking-widest uppercase">
                Cotización VIP
              </div>
            </div>
          </div>
        </div>

        {/* Combustible */}
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-bold tracking-[0.15em] text-amber-500/60 uppercase mb-3 flex items-center gap-1.5">
            <Fuel className="w-3.5 h-3.5" />
            Combustible
          </h3>
          <div className="flex flex-col gap-2 mb-3">
            <InfoRow
              label="Distancia total (ida + regreso)"
              value={formatKm(result.distanceTotalKm)}
              sub={`Ida: ${formatKm(result.distanceOutboundKm)} · Regreso: ${formatKm(result.distanceReturnKm)}`}
            />
            <InfoRow
              label="Consumo estimado"
              value={`${result.liters.toFixed(1)} L`}
              sub={`${result.fuelEfficiency} km/L · ${result.fuelType}`}
            />
          </div>
          <CostRow
            icon={<Fuel className="w-4 h-4" />}
            label="Costo de Combustible"
            rawValue={result.fuelCostRaw}
            roundedValue={result.fuelCostRounded}
            note="Redondeado al múltiplo de $500 más cercano"
          />
        </div>

        {/* Peajes */}
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-bold tracking-[0.15em] text-amber-500/60 uppercase mb-3 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5" />
            Casetas de Peaje
            {result.tollSource === "google" ? (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400/80 font-normal tracking-normal normal-case">
                <BadgeCheck className="w-3 h-3" />
                Dato real · Google
              </span>
            ) : (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-500/40 font-normal tracking-normal normal-case">
                <TriangleAlert className="w-3 h-3" />
                Estimación
              </span>
            )}
          </h3>
          <div className="flex flex-col gap-2 mb-3">
            {result.tollSource === "google" ? (
              <InfoRow
                label="Costo de casetas"
                value={`$${result.tollCostRaw.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MXN`}
                sub="Dato oficial vía Google Routes API"
              />
            ) : (
              <InfoRow
                label="Casetas estimadas"
                value={formatMXN(result.tollCostRaw)}
                sub="Estimación basada en distancia total"
              />
            )}
          </div>
          <CostRow
            icon={<Route className="w-4 h-4" />}
            label="Costo de Peajes"
            rawValue={result.tollCostRaw}
            roundedValue={result.tollCostRounded}
            note="Redondeado al múltiplo de $200 más cercano"
          />
        </div>

        {/* Renta de vehículo */}
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <h3 className="text-xs font-bold tracking-[0.15em] text-amber-500/60 uppercase mb-3 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5" />
            Renta de Vehículo
          </h3>
          <div className="flex flex-col gap-2 mb-3">
            <InfoRow
              label="Vehículo"
              value={result.vehicleName}
            />
            <InfoRow
              label="Días de renta"
              value={`${result.rentalDays} ${result.rentalDays === 1 ? "día" : "días"}`}
            />
          </div>
          <CostRow
            icon={<Car className="w-4 h-4" />}
            label="Costo de Renta"
            rawValue={result.rentalCost}
            roundedValue={result.rentalCost}
          />
        </div>

        {/* Operador VIP (si aplica) */}
        {result.includeOperator && (
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-amber-500/10 animate-fade-in">
            <h3 className="text-xs font-bold tracking-[0.15em] text-amber-500/60 uppercase mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Operador VIP
            </h3>
            <div className="flex flex-col gap-2 mb-3">
              <InfoRow
                label="Salario del operador"
                value={formatMXN(result.operatorBreakdown.salary)}
                sub={`${result.rentalDays} días`}
              />
              <InfoRow
                label="Viáticos (comidas)"
                value={formatMXN(result.operatorBreakdown.meals)}
                sub={`${result.rentalDays} días`}
              />
              <InfoRow
                label="Hospedaje"
                value={formatMXN(result.operatorBreakdown.hotel)}
                sub={
                  result.rentalDays > 1
                    ? `${result.rentalDays - 1} noches`
                    : "N/A"
                }
              />
            </div>
            <CostRow
              icon={<User className="w-4 h-4" />}
              label="Total Operador VIP"
              rawValue={result.operatorBreakdown.total}
              roundedValue={result.operatorBreakdown.total}
              highlight
            />
          </div>
        )}

        {/* ─── GRAN TOTAL ────────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 glow-gold">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/12 via-amber-600/6 to-amber-700/10" />
          <div className="absolute inset-0 bg-card-gradient opacity-80" />

          {/* Content */}
          <div className="relative p-5 sm:p-6">
            {/* Subtotal breakdown */}
            <div className="flex flex-col gap-1.5 mb-4">
              {(result.includeOperator
                ? [
                    { label: "Combustible", val: result.fuelCostRounded },
                    { label: "Peajes", val: result.tollCostRounded },
                    { label: "Renta", val: result.rentalCost },
                    { label: "Operador", val: result.operatorBreakdown.total },
                  ]
                : [
                    { label: "Renta de camioneta", val: result.rentalCost },
                  ]
              ).map(({ label, val }) => (
                <div
                  key={label}
                  className="flex justify-between text-sm text-[hsl(210,40%,70%)]"
                >
                  <span>{label}</span>
                  <span className="font-medium tabular-nums">{formatMXN(val)}</span>
                </div>
              ))}
              <div className="divider-gold my-2" />
            </div>

            {/* Total final */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-amber-500/60 uppercase">
                  Gran Total
                </p>
                <p className="text-xs text-amber-500/40 mt-0.5">
                  {result.includeOperator
                    ? "Servicio con: camioneta, operador, gasolina y peajes"
                    : "Renta solo camioneta"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-display font-bold text-gold-gradient tabular-nums">
                  {formatMXN(result.finalTotal)}
                </span>
                <p className="text-xs text-amber-500/40 mt-0.5">MXN</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>{/* fin printRef */}

      {/* ─── Acciones de exportación ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Imagen para WhatsApp */}
        <button
          onClick={handleShareImage}
          disabled={exportingImage}
          className="flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-4 text-sm font-semibold
            bg-cyan-500/10 border border-cyan-500/25 text-cyan-400
            hover:bg-cyan-500/15 hover:border-cyan-500/40
            transition-all duration-200 active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed"
          title="Descargar como imagen PNG para compartir en WhatsApp"
        >
          {exportingImage ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54h2.86l2.3-3.54z" />
            </svg>
          )}
          <span className="hidden sm:inline">{exportingImage ? "..." : "Imagen"}</span>
        </button>

        {/* WhatsApp - Texto */}
        <button
          onClick={handleWhatsApp}
          className="flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-4 text-sm font-semibold
            bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366]
            hover:bg-[#25D366]/15 hover:border-[#25D366]/40
            transition-all duration-200 active:scale-95"
          title="Enviar cotización por WhatsApp como texto"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>

        {/* PDF */}
        <button
          onClick={handleDownloadPDF}
          disabled={exportingPdf}
          className="flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-4 text-sm font-semibold
            bg-amber-500/10 border border-amber-500/25 text-amber-400
            hover:bg-amber-500/15 hover:border-amber-500/40
            transition-all duration-200 active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed"
          title="Descargar cotización como PDF"
        >
          {exportingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{exportingPdf ? "..." : "PDF"}</span>
        </button>
      </div>
    </div>
  );
}
