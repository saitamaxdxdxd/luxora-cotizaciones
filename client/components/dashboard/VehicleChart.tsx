import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { type VehiclePerf } from "./dashboardData";
import { cn } from "@/lib/utils";

const COLORS = ["#f59e0b","#a78bfa","#34d399","#60a5fa","#fb7185","#fb923c"];

const fmtK = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
const fmtMXN = (v: number) =>
  v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as VehiclePerf;
  return (
    <div className="bg-[hsl(222,47%,6%)] border border-[hsl(217,25%,18%)] rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="font-bold text-[hsl(210,40%,85%)] mb-1.5">{d.name}</p>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between gap-4">
          <span className="text-[hsl(215,20%,50%)]">Ingresos</span>
          <span className="font-bold text-amber-400">{fmtMXN(d.revenue)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[hsl(215,20%,50%)]">Rentas</span>
          <span className="font-semibold text-[hsl(210,40%,80%)]">{d.rentals}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[hsl(215,20%,50%)]">Utilización</span>
          <span className={cn("font-semibold", d.utilization >= 80 ? "text-emerald-400" : "text-amber-400")}>{d.utilization}%</span>
        </div>
      </div>
    </div>
  );
}

export function VehicleChart({ data }: { data: VehiclePerf[] }) {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-bold text-[hsl(210,40%,92%)] text-sm">Performance por Vehículo</h3>
        <p className="text-[10px] text-[hsl(215,20%,45%)] mt-0.5">Ingresos acumulados · año actual</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,25%,13%)" horizontal={false} />
          <XAxis
            type="number" tickFormatter={fmtK}
            tick={{ fill: "hsl(215,20%,40%)", fontSize: 9 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="name" width={90}
            tick={{ fill: "hsl(215,20%,50%)", fontSize: 9, fontWeight: 600 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(217,25%,10%)" }} />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Utilization mini-bars */}
      <div className="flex flex-col gap-2 border-t border-[hsl(217,25%,13%)] pt-3">
        <p className="text-[9px] font-bold text-[hsl(215,20%,40%)] uppercase tracking-widest">Utilización</p>
        {data.map((v, i) => (
          <div key={v.name} className="flex items-center gap-2">
            <span className="text-[9px] text-[hsl(215,20%,45%)] w-24 truncate flex-shrink-0">{v.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[hsl(217,25%,12%)]">
              <div className="h-full rounded-full transition-all" style={{ width: `${v.utilization}%`, background: COLORS[i % COLORS.length] }} />
            </div>
            <span className="text-[9px] font-bold w-8 text-right" style={{ color: COLORS[i % COLORS.length] }}>{v.utilization}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
