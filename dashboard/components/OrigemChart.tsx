"use client";

import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  porOrigem: Record<string, number>;
  loading?: boolean;
}

const BAR_COLORS = [
  "bg-gradient-to-r from-violet-600 to-purple-400",
  "bg-gradient-to-r from-violet-500 to-indigo-400",
  "bg-gradient-to-r from-indigo-500 to-blue-400",
  "bg-gradient-to-r from-blue-500 to-cyan-400",
];

const PILL_COLORS = [
  "bg-violet-50 text-violet-700 ring-violet-200",
  "bg-violet-50 text-violet-600 ring-violet-200",
  "bg-indigo-50 text-indigo-600 ring-indigo-200",
  "bg-blue-50 text-blue-600 ring-blue-200",
];

const RANK_COLORS = [
  "bg-violet-600 text-white shadow-violet-200",
  "bg-violet-500 text-white shadow-violet-200",
  "bg-indigo-500 text-white shadow-indigo-200",
  "bg-slate-100 text-slate-500",
];

export default function OrigemChart({ porOrigem, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-5">
        <div className="h-4 bg-gray-200 rounded w-40 mb-1 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-24 mb-5 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                <div className="h-1.5 bg-gray-100 rounded-full" />
              </div>
              <div className="w-10 h-5 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const chartData = Object.entries(porOrigem)
    .map(([name, value]) => ({ name: name || "Não definido", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const total = chartData.reduce((s, d) => s + d.value, 0);
  const maxVal = chartData[0]?.value ?? 1;

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-0.5">Leads por Origem (CRM)</h3>
        <p className="text-xs text-slate-400 mb-4">Top 10 origens</p>
        <p className="text-sm text-gray-400 text-center py-8">Sem dados no período</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900 text-sm">Leads por Origem (CRM)</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Top {chartData.length} origens · {formatNumber(total)} total
        </p>
      </div>

      <div className="space-y-2">
        {chartData.map((entry, i) => {
          const pct = (entry.value / maxVal) * 100;
          const sharePct = total > 0 ? (entry.value / total) * 100 : 0;
          const barColor = BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)];
          const pillColor = PILL_COLORS[Math.min(i, PILL_COLORS.length - 1)];
          const rankColor = RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)];

          return (
            <div
              key={entry.name}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-50/50 transition-colors duration-150"
            >
              {/* Rank badge */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 shadow-sm ${rankColor}`}>
                {i + 1}
              </div>

              {/* Label + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[160px] group-hover:text-slate-900">
                    {entry.name}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">
                    {sharePct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Count pill */}
              <span className={cn(
                "text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ring-1",
                pillColor
              )}>
                {formatNumber(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
