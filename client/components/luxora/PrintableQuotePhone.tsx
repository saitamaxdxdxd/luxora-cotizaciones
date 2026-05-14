/**
 * LUXORA — Cotización optimizada para móvil vertical (9:16, 1080x1920px Full HD)
 * 
 * Diseño compacto sin redundancias:
 * ✓ Solo información relevante
 * ✓ Optimizado para compartir por WhatsApp
 * ✓ Tipografía grande y legible en pantalla pequeña
 * ✓ Máximo 1920px alto para evitar scroll
 */

import type { QuoteResult } from "@/lib/calculations";
import type { FormState } from "./QuoteForm";
import { formatMXN, formatKm } from "@/data/config";

interface PrintableQuotePhoneProps {
  result: QuoteResult;
  formState: FormState;
}

export function PrintableQuotePhone({ result, formState }: PrintableQuotePhoneProps) {
  const dep = new Date(formState.departureDateTime);
  const ret = new Date(formState.returnDateTime);

  const depDate = dep.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const depTime = dep.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const retDate = ret.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const retTime = ret.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      style={{
        width: "1080px",
        height: "1920px",
        backgroundColor: "#060d18",
        fontFamily: "'Inter', 'Montserrat', sans-serif",
        color: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        padding: "28px 24px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <div
          style={{
            fontSize: "56px",
            fontWeight: "900",
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: "0 0 6px 0",
            letterSpacing: "4px",
            lineHeight: "1",
          }}
        >
          LUXORA
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            margin: "0",
            fontWeight: "500",
          }}
        >
          Cotización VIP
        </div>
      </div>

      {/* ─── RUTA ──────────────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "rgba(139, 92, 246, 0.08)",
          border: "2px solid rgba(139, 92, 246, 0.25)",
          borderRadius: "14px",
          padding: "18px 18px",
          marginBottom: "18px",
        }}
      >
        {/* Origen */}
        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              fontSize: "10px",
              color: "#8b5cf6",
              fontWeight: "700",
              marginBottom: "4px",
              letterSpacing: "1px",
            }}
          >
            ORIGEN
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#fbbf24",
              margin: "0",
              lineHeight: "1.2",
            }}
          >
            {formState.originText}
          </div>
        </div>

        {/* Flecha */}
        <div
          style={{
            textAlign: "center",
            fontSize: "20px",
            color: "#8b5cf6",
            margin: "8px 0",
          }}
        >
          ↓
        </div>

        {/* Destino */}
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "#8b5cf6",
              fontWeight: "700",
              marginBottom: "4px",
              letterSpacing: "1px",
            }}
          >
            DESTINO
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#10b981",
              margin: "0",
              lineHeight: "1.2",
            }}
          >
            {formState.destinationText}
          </div>
        </div>
      </div>

      {/* ─── DATOS DE VIAJE ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {/* Salida */}
        <div
          style={{
            backgroundColor: "rgba(6, 13, 24, 0.6)",
            border: "1px solid rgba(75, 85, 99, 0.4)",
            borderRadius: "10px",
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: "9px", color: "#8b5cf6", fontWeight: "700", marginBottom: "3px", letterSpacing: "0.5px" }}>
            SALIDA
          </div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#fbbf24", lineHeight: "1.2" }}>
            {depDate}
          </div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#10b981" }}>
            {depTime}
          </div>
        </div>

        {/* Regreso */}
        <div
          style={{
            backgroundColor: "rgba(6, 13, 24, 0.6)",
            border: "1px solid rgba(75, 85, 99, 0.4)",
            borderRadius: "10px",
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: "9px", color: "#8b5cf6", fontWeight: "700", marginBottom: "3px", letterSpacing: "0.5px" }}>
            REGRESO
          </div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#fbbf24", lineHeight: "1.2" }}>
            {retDate}
          </div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#10b981" }}>
            {retTime}
          </div>
        </div>
      </div>

      {/* ─── DATOS RUTA ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {/* Distancia */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "9px", color: "#8b5cf6", fontWeight: "700", marginBottom: "2px", letterSpacing: "0.5px" }}>
            DISTANCIA
          </div>
          <div style={{ fontSize: "32px", fontWeight: "900", color: "#fbbf24", lineHeight: "1" }}>
            {result.distanceTotalKm.toFixed(0)}
          </div>
          <div style={{ fontSize: "10px", color: "#6b7280", fontWeight: "600" }}>km</div>
        </div>

        {/* Días */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "9px", color: "#8b5cf6", fontWeight: "700", marginBottom: "2px", letterSpacing: "0.5px" }}>
            DURACIÓN
          </div>
          <div style={{ fontSize: "32px", fontWeight: "900", color: "#10b981", lineHeight: "1" }}>
            {result.rentalDays}
          </div>
          <div style={{ fontSize: "10px", color: "#6b7280", fontWeight: "600" }}>
            día{result.rentalDays > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ─── VEHÍCULO Y OPERADOR ───────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "rgba(6, 13, 24, 0.6)",
          border: "1px solid rgba(75, 85, 99, 0.4)",
          borderRadius: "10px",
          padding: "14px 12px",
          marginBottom: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "9px", color: "#8b5cf6", fontWeight: "700", marginBottom: "3px", letterSpacing: "0.5px" }}>
            VEHÍCULO
          </div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#fbbf24" }}>
            {result.vehicleName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "9px", color: "#8b5cf6", fontWeight: "700", marginBottom: "3px", letterSpacing: "0.5px" }}>
            OPERADOR
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: result.includeOperator ? "#10b981" : "#6b7280",
            }}
          >
            {result.includeOperator ? "✓ SÍ" : "✗ NO"}
          </div>
        </div>
      </div>

      {/* ─── DESGLOSE DE COSTOS ─────────────────────────────────────────── */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: "700",
            color: "#8b5cf6",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
          }}
        >
          Desglose
        </div>

        <div style={{ backgroundColor: "rgba(6, 13, 24, 0.4)", borderRadius: "10px" }}>
          {/* Renta */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: "1px solid rgba(75, 85, 99, 0.2)",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "16px", color: "#d1d5db", fontWeight: "500" }}>Renta</span>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#fbbf24" }}>
              {formatMXN(result.rentalCost)}
            </span>
          </div>

          {/* Combustible */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: "1px solid rgba(75, 85, 99, 0.2)",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "16px", color: "#d1d5db", fontWeight: "500" }}>Combustible</span>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#10b981" }}>
              {formatMXN(result.fuelCostRounded)}
            </span>
          </div>

          {/* Peajes */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: result.includeOperator ? "1px solid rgba(75, 85, 99, 0.2)" : "none",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "16px", color: "#d1d5db", fontWeight: "500" }}>Peajes</span>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#3b82f6" }}>
              {formatMXN(result.tollCostRounded)}
            </span>
          </div>

          {/* Operador (si aplica) */}
          {result.includeOperator && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "16px", color: "#d1d5db", fontWeight: "500" }}>Operador</span>
              <span style={{ fontSize: "18px", fontWeight: "700", color: "#ec4899" }}>
                {formatMXN(result.operatorBreakdown.total)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── TOTAL FINAL ───────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))",
          border: "2px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "14px",
          padding: "20px 16px",
          textAlign: "center",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "#8b5cf6",
            marginBottom: "8px",
            letterSpacing: "2px",
          }}
        >
          TOTAL FINAL
        </div>
        <div
          style={{
            fontSize: "64px",
            fontWeight: "900",
            background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: "0",
            lineHeight: "1",
          }}
        >
          {formatMXN(result.finalTotal)}
        </div>
      </div>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      <div
        style={{
          textAlign: "center",
          fontSize: "11px",
          color: "#6b7280",
          borderTop: "1px solid rgba(75, 85, 99, 0.15)",
          paddingTop: "10px",
        }}
      >
        <div style={{ marginBottom: "2px", fontSize: "10px" }}>
          {new Date().toLocaleDateString("es-MX")}
        </div>
        <div style={{ fontSize: "10px", color: "#4b5563", fontWeight: "500" }}>
          LUXORA • Transporte VIP
        </div>
      </div>
    </div>
  );
}
