import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Car } from "lucide-react";

interface Reservation {
  id: string;
  caseNumber: string;
  status: string;
  riskLevel: string;
  riskScore: number;
  vehiculo: string;
  monto: number;
  fechaInicio: string;
  fechaFin: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  RESERVACION:        { label: "Reservación",  color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  INVITACION_ENVIADA: { label: "KYC enviado",  color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  KYC_EN_PROGRESO:    { label: "KYC en progreso", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  CONTRATO_GENERADO:  { label: "Contrato",     color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  FIRMADO:            { label: "Firmado",      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  ABONOS:             { label: "Abonos",       color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  PAGARE_GENERADO:    { label: "Pagaré",       color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  EVIDENCE_PACK:      { label: "Evidence Pack",color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  ACTIVO:             { label: "Activo",       color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
};

const RISK_COLOR: Record<string, string> = {
  APPROVED: "text-emerald-400",
  REVIEW:   "text-amber-400",
  REJECTED: "text-red-400",
  PENDING:  "text-[hsl(215,20%,40%)]",
};

const fmtMXN = (v: number) =>
  v > 0 ? v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }) : "—";

// Demo rows
const DEMO: Reservation[] = [
  { id:"d1", caseNumber:"LUX-2026-0051", status:"ACTIVO", riskLevel:"APPROVED", riskScore:85, vehiculo:"Toyota Hiace 2025", monto:12000, fechaInicio:"2026-04-10", fechaFin:"2026-04-14" },
  { id:"d2", caseNumber:"LUX-2026-0049", status:"ABONOS", riskLevel:"REVIEW", riskScore:62, vehiculo:"Ford Transit 2024", monto:9500, fechaInicio:"2026-04-08", fechaFin:"2026-04-12" },
  { id:"d3", caseNumber:"LUX-2026-0047", status:"INVITACION_ENVIADA", riskLevel:"PENDING", riskScore:0, vehiculo:"Hyundai Tucson 2018", monto:5400, fechaInicio:"2026-04-15", fechaFin:"2026-04-17" },
  { id:"d4", caseNumber:"LUX-2026-0045", status:"CONTRATO_GENERADO", riskLevel:"APPROVED", riskScore:91, vehiculo:"Toyota Hiace 2023", monto:14200, fechaInicio:"2026-04-12", fechaFin:"2026-04-19" },
];

export function ReservationsTable({ data }: { data: Reservation[] }) {
  const navigate = useNavigate();
  const list = data.length > 0 ? data : DEMO;

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[hsl(210,40%,92%)] text-sm flex items-center gap-2">
            <Car className="w-4 h-4 text-amber-400" />Reservaciones Activas
          </h3>
          <p className="text-[10px] text-[hsl(215,20%,45%)] mt-0.5">{list.length} en proceso</p>
        </div>
        <button onClick={() => navigate("/reservaciones")}
          className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
          Ver todas <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[520px]">
          <thead>
            <tr className="border-b border-[hsl(217,25%,13%)]">
              {["ID", "Vehículo", "Estado", "Riesgo", "Monto", "Fechas"].map((h) => (
                <th key={h} className="pb-2 text-left text-[9px] font-bold text-[hsl(215,20%,35%)] uppercase tracking-widest px-2 first:pl-0">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const sc = STATUS_LABEL[r.status] ?? STATUS_LABEL.RESERVACION;
              return (
                <tr key={r.id}
                  className="border-b border-[hsl(217,25%,11%)] hover:bg-amber-500/3 cursor-pointer transition-colors group"
                  onClick={() => navigate("/reservaciones")}>
                  <td className="py-2.5 px-2 first:pl-0">
                    <span className="font-mono font-bold text-amber-400/80 text-[10px]">{r.caseNumber}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="text-[hsl(210,40%,80%)] truncate max-w-[100px] block">{r.vehiculo}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", sc.color)}>{sc.label}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={cn("font-bold text-[10px]", RISK_COLOR[r.riskLevel])}>
                      {r.riskScore > 0 ? r.riskScore : "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="font-semibold text-[hsl(210,40%,80%)]">{fmtMXN(r.monto)}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="text-[hsl(215,20%,45%)] text-[9px]">{r.fechaInicio}<br />{r.fechaFin}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
