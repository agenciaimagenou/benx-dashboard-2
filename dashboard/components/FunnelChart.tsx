"use client";

import { formatNumber } from "@/lib/utils";

interface Props {
  porSituacao: Record<string, number>;
  loading?: boolean;
}

const FUNNEL_STAGES = [
  { key: "Lead Recebido",        color: "#3b82f6" },
  { key: "Tentativa de Contato", color: "#8b5cf6" },
  { key: "Em Atendimento",       color: "#06b6d4" },
  { key: "Visita Agendada",      color: "#0ea5e9" },
  { key: "Visita Realizada",     color: "#10b981" },
  { key: "Proposta",             color: "#f59e0b" },
  { key: "Com Reserva",          color: "#a855f7" },
  { key: "Venda Realizada",      color: "#22c55e" },
];

const SVG_W   = 600;
const STAGE_H = 54;
const GAP     = 3;
const MAX_W   = 580;
const MIN_W   = 80;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function FunnelChart({ porSituacao, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="flex flex-col items-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"
              style={{ width: `${100 - i * 12}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const stages = FUNNEL_STAGES.filter(s => (porSituacao[s.key] ?? 0) > 0);
  const N = stages.length;
  const total = Object.values(porSituacao).reduce((a, b) => a + b, 0);
  const svgH = N * (STAGE_H + GAP) + 10;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-800 mb-1">Funil CRM por Situação</h3>
      <p className="text-xs text-gray-500 mb-5">{formatNumber(total)} leads no período</p>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_W} ${svgH}`}
          width="100%"
          style={{ display: "block" }}
        >
          {stages.map((stage, i) => {
            const count = porSituacao[stage.key] ?? 0;
            const pct   = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
            const prevCount = i > 0 ? (porSituacao[stages[i - 1].key] ?? 0) : null;
            const conv  = prevCount && prevCount > 0
              ? ((count / prevCount) * 100).toFixed(0) + "%"
              : null;

            const topW = lerp(MAX_W, MIN_W, i / N);
            const botW = lerp(MAX_W, MIN_W, (i + 1) / N);
            const topX = (SVG_W - topW) / 2;
            const botX = (SVG_W - botW) / 2;
            const y    = i * (STAGE_H + GAP);
            const midY = y + STAGE_H / 2;

            const points = [
              `${topX},${y}`,
              `${topX + topW},${y}`,
              `${botX + botW},${y + STAGE_H}`,
              `${botX},${y + STAGE_H}`,
            ].join(" ");

            // font size: smaller for narrow bottom stages
            const fs = Math.max(10, Math.min(13, topW / 40));

            return (
              <g key={stage.key}>
                <polygon points={points} fill={stage.color} />

                {/* Stage label */}
                <text
                  x={SVG_W / 2}
                  y={midY - 9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={fs}
                  fontWeight="600"
                  style={{ userSelect: "none" }}
                >
                  {stage.key.toUpperCase()}
                </text>

                {/* Count + % */}
                <text
                  x={SVG_W / 2}
                  y={midY + 9}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.9)"
                  fontSize={Math.max(9, fs - 1)}
                  style={{ userSelect: "none" }}
                >
                  {formatNumber(count)} leads · {pct}%
                  {conv ? `  ↓${conv}` : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
