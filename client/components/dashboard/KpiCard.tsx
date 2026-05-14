import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number;   // % positive = up, negative = down
  icon: React.ElementType;
  accent: "amber" | "emerald" | "blue" | "red" | "purple";
  onClick?: () => void;
}

const ACCENT = {
  amber:   { icon: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   glow: "group-hover:border-amber-500/40"  },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", glow: "group-hover:border-emerald-500/40"},
  blue:    { icon: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    glow: "group-hover:border-blue-500/40"   },
  red:     { icon: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     glow: "group-hover:border-red-500/40"    },
  purple:  { icon: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20",  glow: "group-hover:border-purple-500/40" },
};

export function KpiCard({ label, value, sub, trend, icon: Icon, accent, onClick }: KpiCardProps) {
  const a = ACCENT[accent];
  const hasTrend = trend !== undefined;
  const isUp = (trend ?? 0) > 0;
  const isFlat = (trend ?? 0) === 0;
  const TrendIcon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const trendColor = isFlat ? "text-[hsl(215,20%,45%)]" : isUp ? "text-emerald-400" : "text-red-400";

  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card rounded-2xl p-5 flex flex-col gap-3 border transition-all group",
        a.border, a.glow,
        onClick && "cursor-pointer hover:scale-[1.01]"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border", a.bg, a.border)}>
          <Icon className={cn("w-4.5 h-4.5", a.icon)} style={{ width: 18, height: 18 }} />
        </div>
        {hasTrend && (
          <div className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", trendColor,
            isFlat ? "bg-[hsl(217,25%,12%)] border-[hsl(217,25%,20%)]"
            : isUp ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-red-500/10 border-red-500/20")}>
            <TrendIcon className="w-3 h-3" />
            {isFlat ? "Sin cambio" : `${Math.abs(trend!)}%`}
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-black text-[hsl(210,40%,95%)] leading-none mb-1">{value}</p>
        <p className="text-xs font-semibold text-[hsl(215,20%,45%)] uppercase tracking-widest">{label}</p>
      </div>

      {sub && (
        <p className="text-[10px] text-[hsl(215,20%,38%)] border-t border-[hsl(217,25%,13%)] pt-2 mt-auto">{sub}</p>
      )}
    </div>
  );
}
