"use client";

import { formatNumber } from "@/lib/utils";

interface Props {
  porSituacao: Record<string, number>;
  loading?: boolean;
}

const FUNNEL_STAGES = [
  { key: "Lead Recebido",       color: "#3b82f6", bg: "#eff6ff" },
  { key: "Tentativa de Contato",color: "#8b5cf6", bg: "#f5f3ff" },
  { key: "Em Atendimento",      color: "#06b6d4", bg: "#ecfeff" },
  { key: "Visita Agendada",     color: "#0ea5e9", bg: "#f0f9ff" },
  { key: "Visita Realizada",    color: "#10b981", bg: "#ecfdf5" },
  { key: "Proposta",            color: "#f59e0b", bg: "#fffbeb" },
  { key: "Com Reserva",         color: "#a855f7", bg: "#faf5ff" },
  { key: "Venda Realizada",     color: "#22c55e", bg: "#f0fdf4" },
];

export default function FunnelChart({ porSituacao, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" style={{ width: `${100 - i * 12}%`, margin: "0 auto" }} />
          ))}
        </div>
      </div>
    );
  }

  const stages = FUNNEL_STAGES.filter(s => (porSituacao[s.key] ?? 0) > 0);

  // Others: situations not in FUNNEL_STAGES
  const funnelKeys = new Set(FUNNEL_STAGES.map(s => s.key));
  const othersTotal = Object.entries(porSituacao)
    .filter(([k]) => !funnelKeys.has(k))
    .reduce((s, [, v]) => s + v, 0);

  const total = Object.values(porSituacao).reduce((a, b) => a + b, 0);
  const maxCount = stages.length > 0 ? Math.max(...stages.map(s => porSituacao[s.key] ?? 0)) : 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-800 mb-1">Funil CRM por Situação</h3>
      <p className="text-xs text-gray-500 mb-6">{formatNumber(total)} leads no período</p>

      <div className="space-y-2">
        {stages.map((stage, i) => {
          const count = porSituacao[stage.key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const prevCount = i > 0 ? (porSituacao[stages[i - 1].key] ?? 0) : null;
          const convRate = prevCount && prevCount > 0 ? (count / prevCount) * 100 : null;

          return (
            <div key={stage.key} className="flex items-center gap-3">
              {/* Stage name */}
              <div className="w-36 text-right flex-shrink-0">
                <span className="text-xs font-medium text-gray-600 truncate block">{stage.key}</span>
              </div>

              {/* Bar */}
              <div className="flex-1 relative h-8 bg-gray-50 rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                  style={{ width: `${barWidth}%`, backgroundColor: stage.color, minWidth: count > 0 ? "2rem" : 0 }}
                >
                  <span className="text-xs font-bold text-white whitespace-nowrap">
                    {formatNumber(count)}
                  </span>
                </div>
              </div>

              {/* Percentage of total */}
              <div className="w-12 text-right flex-shrink-0">
                <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
              </div>

              {/* Conversion from previous stage */}
              <div className="w-14 flex-shrink-0">
                {convRate !== null ? (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${convRate >= 50 ? "bg-green-50 text-green-600" : convRate >= 20 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                    ↓{convRate.toFixed(0)}%
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Others row */}
        {othersTotal > 0 && (
          <div className="flex items-center gap-3 pt-1 border-t border-gray-100 mt-1">
            <div className="w-36 text-right flex-shrink-0">
              <span className="text-xs text-gray-400 truncate block">Outros</span>
            </div>
            <div className="flex-1 relative h-8 bg-gray-50 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg flex items-center justify-end pr-3"
                style={{ width: `${(othersTotal / maxCount) * 100}%`, backgroundColor: "#94a3b8", minWidth: "2rem" }}
              >
                <span className="text-xs font-bold text-white">{formatNumber(othersTotal)}</span>
              </div>
            </div>
            <div className="w-12 text-right flex-shrink-0">
              <span className="text-xs text-gray-400">{total > 0 ? ((othersTotal / total) * 100).toFixed(1) : "0.0"}%</span>
            </div>
            <div className="w-14 flex-shrink-0" />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> ↓% = conversão da etapa anterior</span>
      </div>
    </div>
  );
}
