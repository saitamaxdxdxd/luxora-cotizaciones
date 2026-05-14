import { AlertTriangle, FileX, ShieldAlert, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getCases, getUsers } from "@/lib/store";

interface Alert {
  id: string;
  type: "risk" | "docs" | "incident";
  title: string;
  desc: string;
}

function buildAlerts(): Alert[] {
  const alerts: Alert[] = [];
  const seenIds = new Set<string>();
  const cases = getCases();
  const users  = getUsers();

  const addAlert = (alert: Alert) => {
    if (!seenIds.has(alert.id)) {
      seenIds.add(alert.id);
      alerts.push(alert);
    }
  };

  // High risk cases
  cases
    .filter((c) => c.riskLevel === "REJECTED" && !["CERRADO","CANCELADO"].includes(c.status))
    .slice(0, 2)
    .forEach((c) => addAlert({
      id: `risk-${c.id}`,
      type: "risk",
      title: `Riesgo alto — ${c.caseNumber}`,
      desc: `Risk Score: ${c.riskScore}. ${c.riskFlags?.[0] ?? "Requiere revisión manual."}`,
    }));

  // Users with incomplete docs in active cases
  cases
    .filter((c) => ["INVITACION_ENVIADA","KYC_EN_PROGRESO"].includes(c.status))
    .slice(0, 2)
    .forEach((c) => {
      c.participants.forEach((p) => {
        const u = users.find((x) => x.id === p.userId);
        if (!u) return;
        const missingDocs = !u.documents.find((d) => d.type === "INE_FRONT");
        if (missingDocs && p.status !== "COMPLETADO") {
          addAlert({
            id: `docs-${c.id}-${p.userId}`,
            type: "docs",
            title: `Documentos faltantes — ${u.nombre || "Participante"}`,
            desc: `${c.caseNumber}: No ha subido INE. Envía el link KYC nuevamente.`,
          });
        }
      });
    });

  // Active incidents
  cases
    .filter((c) => c.cierreIncidentes?.trim() && c.status === "ACTIVO")
    .slice(0, 2)
    .forEach((c) => addAlert({
      id: `incident-${c.id}`,
      type: "incident",
      title: `Incidente — ${c.caseNumber}`,
      desc: c.cierreIncidentes.slice(0, 80) + (c.cierreIncidentes.length > 80 ? "…" : ""),
    }));

  return alerts;
}

const ALERT_STYLE = {
  risk:     { icon: ShieldAlert,    border: "border-red-500/25",    bg: "bg-red-500/6",    icon_color: "text-red-400",    title_color: "text-red-300" },
  docs:     { icon: FileX,         border: "border-amber-500/25",  bg: "bg-amber-500/6",  icon_color: "text-amber-400",  title_color: "text-amber-300" },
  incident: { icon: AlertTriangle,  border: "border-orange-500/25", bg: "bg-orange-500/6", icon_color: "text-orange-400", title_color: "text-orange-300" },
};

export function AlertsBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alerts = buildAlerts().filter((a) => !dismissed.has(a.id));

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold text-[hsl(215,20%,40%)] uppercase tracking-widest flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3 text-amber-400" />Alertas activas · {alerts.length}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {alerts.map((a) => {
          const s = ALERT_STYLE[a.type];
          const Icon = s.icon;
          return (
            <div key={a.id} className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-xl border transition-all",
              s.bg, s.border
            )}>
              <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", s.icon_color)} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-bold truncate", s.title_color)}>{a.title}</p>
                <p className="text-[10px] text-[hsl(215,20%,50%)] mt-0.5 leading-relaxed">{a.desc}</p>
              </div>
              <button onClick={() => setDismissed((prev) => new Set([...prev, a.id]))}
                className="text-[hsl(215,20%,35%)] hover:text-[hsl(215,20%,55%)] transition-colors flex-shrink-0 mt-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
