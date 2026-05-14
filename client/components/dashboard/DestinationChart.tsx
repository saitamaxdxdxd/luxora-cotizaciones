import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { type DestinationStat } from "./dashboardData";
import { MapPin } from "lucide-react";

const COLORS = ["#f59e0b","#a78bfa","#34d399","#60a5fa","#fb7185"];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DestinationStat;
  return (
    <div className="bg-[hsl(222,47%,6%)] border border-[hsl(217,25%,18%)] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-[hsl(210,40%,85%)]">{d.destino}</p>
      <p className="text-[hsl(215,20%,50%)]">{d.count} rentas · {d.pct}%</p>
    </div>
  );
}

export function DestinationChart({ data }: { data: DestinationStat[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-bold text-[hsl(210,40%,92%)] text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400" />Top Destinos
        </h3>
        <p className="text-[10px] text-[hsl(215,20%,45%)] mt-0.5">Últimos 12 meses · {total} rentas totales</p>
      </div>

      <div className="flex items-center gap-4">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={data} dataKey="count"
              cx="50%" cy="50%"
              innerRadius={38} outerRadius={56}
              strokeWidth={2} stroke="hsl(222,47%,4%)"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.map((d, i) => (
            <div key={d.destino} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[10px] text-[hsl(215,20%,55%)] truncate flex-1">{d.destino}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-1 rounded-full bg-[hsl(217,25%,12%)]">
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: COLORS[i % COLORS.length] }} />
                </div>
                <span className="text-[9px] font-bold w-6 text-right" style={{ color: COLORS[i % COLORS.length] }}>{d.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
