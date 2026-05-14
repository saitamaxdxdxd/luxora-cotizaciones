/**
 * PrintableQuote — Layout compacto para exportar la cotización como PDF de 1 hoja.
 * Se renderiza fuera de pantalla (off-screen) y se captura con html2canvas.
 * Dimensiones: 794px de ancho (equivalente a A4 a 96 dpi).
 */

import { type QuoteResult } from "@/lib/calculations";
import { formatMXN, formatKm } from "@/data/config";
import type { FormState } from "./QuoteForm";

interface Props {
  result: QuoteResult;
  formState: FormState;
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid rgba(245,158,11,0.10)" }}>
      <span style={{ fontSize: 12, color: "#8fa3bf" }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2eaf4" }}>{value}</span>
        {sub && <div style={{ fontSize: 10, color: "#4d6480", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(245,158,11,0.55)", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export function PrintableQuote({ result, formState }: Props) {
  const dep = new Date(formState.departureDateTime);
  const ret = new Date(formState.returnDateTime);
  const fmt = (d: Date) =>
    d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const today = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  // Sumar duración total de ida (convertir "Xh Ymin" a minutos y sumar)
  const parseMins = (t: string) => {
    const h = parseInt(t.match(/(\d+)\s*h/)?.[1] ?? "0");
    const m = parseInt(t.match(/(\d+)\s*min/)?.[1] ?? "0");
    return h * 60 + m;
  };
  const totalMins = result.outboundLegs.reduce((sum, l) => sum + parseMins(l.durationText), 0);
  const outboundDuration = totalMins >= 60
    ? `${Math.floor(totalMins / 60)} h ${totalMins % 60} min`
    : `${totalMins} min`;

  return (
    <div style={{
      width: 794,
      minHeight: 1020,
      background: "#060d18",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "36px 40px",
      boxSizing: "border-box",
      color: "#e2eaf4",
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "1px solid rgba(245,158,11,0.20)", paddingBottom: 18 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.15em", background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            LUXORA
          </div>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(245,158,11,0.45)", textTransform: "uppercase", marginTop: 2 }}>
            Cotización VIP · Transporte Terrestre
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#8fa3bf" }}>Fecha de emisión</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#e2eaf4", marginTop: 2 }}>{today}</div>
        </div>
      </div>

      {/* ── Ruta ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {/* Tramos de ruta */}
        <div style={{ flex: 1, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 10, color: "rgba(245,158,11,0.50)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Ruta de ida</div>
          {result.outboundLegs.map((leg, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#f3f8ff" }}>{leg.from.split(",")[0]}</span>
                <span style={{ fontSize: 10, color: "rgba(245,158,11,0.40)" }}>→</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#f3f8ff" }}>{leg.to.split(",")[0]}</span>
              </div>
              <div style={{ fontSize: 10, color: "#8fa3bf", marginTop: 2 }}>
                {leg.distanceKm.toFixed(1)} km · {leg.durationText}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(245,158,11,0.10)" }}>
            <div style={{ fontSize: 10, color: "rgba(245,158,11,0.40)" }}>↩ Regreso</div>
            <div style={{ fontSize: 11, color: "#8fa3bf" }}>
              {result.returnLeg.from.split(",")[0]} → {result.returnLeg.to.split(",")[0]}
              <span style={{ marginLeft: 8 }}>{result.returnLeg.distanceKm.toFixed(1)} km · {result.returnLeg.durationText}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
          {[
            { label: "Dist. ida", value: formatKm(result.distanceOutboundKm) },
            { label: "Dist. regreso", value: formatKm(result.distanceReturnKm) },
            { label: "Total recorrido", value: formatKm(result.distanceTotalKm) },
            { label: "Tiempo ida", value: outboundDuration },
            { label: "Días de renta", value: `${result.rentalDays} ${result.rentalDays === 1 ? "día" : "días"}` },
            { label: "Vehículo", value: result.vehicleName },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,158,11,0.10)", borderRadius: 8, padding: "5px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#8fa3bf" }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#fbbf24" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fechas ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Fecha de salida", value: fmt(dep) },
          { label: "Fecha de regreso", value: fmt(ret) },
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,158,11,0.10)", borderRadius: 8, padding: "8px 14px" }}>
            <div style={{ fontSize: 10, color: "#8fa3bf", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2eaf4" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Desglose de costos ── */}
      {result.includeOperator ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          {/* Combustible */}
          <Section title="Combustible">
            <Row label="Dist. total" value={formatKm(result.distanceTotalKm)} sub={`Ida ${formatKm(result.distanceOutboundKm)} + Regreso ${formatKm(result.distanceReturnKm)}`} />
            <Row label="Consumo" value={`${result.liters.toFixed(1)} L`} sub={`${result.fuelEfficiency} km/L · ${result.fuelType}`} />
            <div style={{ marginTop: 8, padding: "7px 10px", background: "rgba(245,158,11,0.06)", borderRadius: 7, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#c4a35a" }}>Costo combustible</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>{formatMXN(result.fuelCostRounded)}</span>
            </div>
          </Section>

          {/* Casetas */}
          <Section title="Casetas de Peaje">
            <Row
              label={result.tollSource === "google" ? "Fuente" : "Base estimada"}
              value={result.tollSource === "google" ? "Google Routes API" : formatMXN(result.tollCostRaw)}
              sub={result.tollSource === "google" ? "Dato oficial · ida + regreso" : "Estimación por distancia"}
            />
            <div style={{ marginTop: 8, padding: "7px 10px", background: "rgba(245,158,11,0.06)", borderRadius: 7, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#c4a35a" }}>Costo casetas</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>{formatMXN(result.tollCostRounded)}</span>
            </div>
          </Section>

          {/* Renta */}
          <Section title="Renta de Vehículo">
            <Row label="Vehículo" value={result.vehicleName} />
            <Row label="Días" value={`${result.rentalDays}`} />
            <div style={{ marginTop: 8, padding: "7px 10px", background: "rgba(245,158,11,0.06)", borderRadius: 7, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#c4a35a" }}>Costo renta</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>{formatMXN(result.rentalCost)}</span>
            </div>
          </Section>

          {/* Operador */}
          <Section title="Operador VIP">
            <Row label="Salario" value={formatMXN(result.operatorBreakdown.salary)} sub={`${result.rentalDays} días`} />
            <Row label="Viáticos" value={formatMXN(result.operatorBreakdown.meals)} sub={`${result.rentalDays} días`} />
            <Row label="Hospedaje" value={formatMXN(result.operatorBreakdown.hotel)} sub={result.rentalDays > 1 ? `${result.rentalDays - 1} noches` : "N/A"} />
            <div style={{ marginTop: 8, padding: "7px 10px", background: "rgba(245,158,11,0.06)", borderRadius: 7, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#c4a35a" }}>Total operador</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>{formatMXN(result.operatorBreakdown.total)}</span>
            </div>
          </Section>
        </div>
      ) : (
        <Section title="Renta de Vehículo">
          <Row label="Vehículo" value={result.vehicleName} />
          <Row label="Días de renta" value={`${result.rentalDays} ${result.rentalDays === 1 ? "día" : "días"}`} />
          <Row label="Operador / Chofer" value="No incluido" sub="El cliente provee chofer" />
        </Section>
      )}

      {/* ── Gran Total ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.06))",
        border: "1.5px solid rgba(245,158,11,0.35)",
        borderRadius: 12,
        padding: "18px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "rgba(245,158,11,0.60)", textTransform: "uppercase" }}>Gran Total</div>
          <div style={{ fontSize: 11, color: "rgba(245,158,11,0.40)", marginTop: 3 }}>
            {result.includeOperator
              ? "Servicio con: camioneta, operador, gasolina y peajes"
              : "Renta solo camioneta"}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
            {(result.includeOperator
              ? [
                  { l: "Combustible", v: formatMXN(result.fuelCostRounded) },
                  { l: "Casetas", v: formatMXN(result.tollCostRounded) },
                  { l: "Renta", v: formatMXN(result.rentalCost) },
                  { l: "Operador", v: formatMXN(result.operatorBreakdown.total) },
                ]
              : [{ l: "Renta", v: formatMXN(result.rentalCost) }]
            ).map(({ l, v }) => (
              <span key={l} style={{ fontSize: 11, color: "#8fa3bf" }}>
                {l}: <strong style={{ color: "#c4a35a" }}>{v}</strong>
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 38, fontWeight: 800, background: "linear-gradient(135deg, #f59e0b, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>
            {formatMXN(result.finalTotal)}
          </div>
          <div style={{ fontSize: 11, color: "rgba(245,158,11,0.40)", marginTop: 3 }}>MXN · redondeado al $100</div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: 18, textAlign: "center", fontSize: 10, color: "#3d5268" }}>
        Cotización generada con LUXORA Cotizador VIP · Los precios son estimados y pueden variar según condiciones de ruta
      </div>
    </div>
  );
}
