import { AlertTriangle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  caseNumber: string;
  incidente: string;
  calificacion: number;
  fecha: string;
}

// Demo incidents for when no real data exists
const DEMO: Incident[] = [
  { id:"d1", caseNumber:"LUX-2026-0041", incidente:"Rayón en costado derecho al regresar la unidad.", calificacion:2, fecha:"2026-03-28" },
  { id:"d2", caseNumber:"LUX-2026-0033", incidente:"Retardo en devolución 4 hrs. sin aviso previo.", calificacion:3, fecha:"2026-03-15" },
  { id:"d3", caseNumber:"LUX-2026-0019", incidente:"Combustible entregado vacío. Cobro de penalización aplicado.", calificacion:2, fecha:"2026-02-10" },
];

export function IncidentList({ data }: { data: Incident[] }) {
  const list = data.length > 0 ? data : DEMO;

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-[hsl(210,40%,92%)] text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />Incidentes Registrados
          </h3>
          <p className="text-[10px] text-[hsl(215,20%,45%)] mt-0.5">{list.length} incidente{list.length !== 1 ? "s" : ""} en historial</p>
        </div>
        {list.length > 0 && (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/20 text-red-400">
            {list.length} activos
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {list.map((inc) => (
          <div key={inc.id} className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-red-400/80">{inc.caseNumber}</span>
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={cn("w-2.5 h-2.5",
                    n <= inc.calificacion ? "text-amber-400 fill-amber-400" : "text-[hsl(217,25%,20%)]")} />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-[hsl(215,20%,55%)] leading-relaxed line-clamp-2">{inc.incidente}</p>
            <p className="text-[9px] text-[hsl(215,20%,35%)]">{inc.fecha}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
