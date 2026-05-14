import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { type MonthlyRevenue } from "./dashboardData";

const fmtK = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

const fmtMXN = (v: number) =>
  v.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(222,47%,6%)] border border-[hsl(217,25%,18%)] rounded-xl px-4 py-3 text-xs shadow-xl">
      <p className="font-bold text-[hsl(210,40%,85%)] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[hsl(215,20%,55%)]">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{fmtMXN(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: MonthlyRevenue[];
  currentMonth: number;
}

export function RevenueChart({ data, currentMonth }: Props) {
  // Clip future months for this year to show progression
  const display = data.map((d, i) => ({
    ...d,
    thisYear: i <= currentMonth ? d.thisYear : 0,
  }));

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-[hsl(210,40%,92%)] text-sm">Ingresos vs Año Anterior</h3>
          <p className="text-[10px] text-[hsl(215,20%,45%)] mt-0.5">Comparativo mensual MXN · {new Date().getFullYear()} vs {new Date().getFullYear() - 1}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span className="w-3 h-0.5 rounded bg-amber-400 inline-block" /> {new Date().getFullYear()}
          </span>
          <span className="flex items-center gap-1.5 text-[hsl(215,20%,45%)] font-semibold">
            <span className="w-3 h-0.5 rounded bg-[hsl(215,20%,35%)] inline-block" /> {new Date().getFullYear() - 1}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={display} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,25%,13%)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "hsl(215,20%,40%)", fontSize: 10, fontWeight: 600 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={fmtK}
            tick={{ fill: "hsl(215,20%,40%)", fontSize: 10 }}
            axisLine={false} tickLine={false} width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(217,25%,12%)" }} />
          <Bar
            dataKey="thisYear"
            name={`${new Date().getFullYear()}`}
            fill="url(#barGrad)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Line
            dataKey="lastYear"
            name={`${new Date().getFullYear() - 1}`}
            stroke="hsl(215,20%,35%)"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
