"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/utils";

interface Props {
  porSituacao: Record<string, number>;
  loading?: boolean;
  compact?: boolean;
}

const FUNNEL_STAGES = [
  { key: "Lead Recebido",        from: "#6366f1", to: "#4f46e5" },
  { key: "Tentativa de Contato", from: "#8b5cf6", to: "#7c3aed" },
  { key: "Em Atendimento",       from: "#0ea5e9", to: "#0284c7" },
  { key: "Visita Agendada",      from: "#06b6d4", to: "#0891b2" },
  { key: "Visita Realizada",     from: "#10b981", to: "#059669" },
  { key: "Proposta",             from: "#f59e0b", to: "#d97706" },
  { key: "Com Reserva",          from: "#a855f7", to: "#9333ea" },
  { key: "Venda Realizada",      from: "#22c55e", to: "#16a34a" },
];

// Funnel geometry
const SVG_W   = 620;
const STAGE_H = 54;
const GAP     = 4;
const MAX_W   = 580;
const MIN_W   = 100;
const CX      = SVG_W / 2;
const R       = 6;

function trapezoidPath(topX: number, topW: number, botX: number, botW: number, y: number, h: number) {
  const tx1 = topX, tx2 = topX + topW;
  const bx1 = botX, bx2 = botX + botW;
  return [
    `M ${tx1 + R} ${y}`,
    `L ${tx2 - R} ${y}`,
    `Q ${tx2} ${y} ${tx2} ${y + R}`,
    `L ${bx2} ${y + h}`,
    `L ${bx1} ${y + h}`,
    `L ${tx1} ${y + R}`,
    `Q ${tx1} ${y} ${tx1 + R} ${y}`,
    "Z",
  ].join(" ");
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function FunnelChart({ porSituacao, loading, compact }: Props) {
  const [view, setView] = useState<"funnel" | "bar">("funnel");

  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="flex flex-col items-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"
              style={{ width: `${88 - i * 11}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const stages   = FUNNEL_STAGES.filter(s => (porSituacao[s.key] ?? 0) > 0);
  const N        = stages.length;
  const total    = Object.values(porSituacao).reduce((a, b) => a + b, 0);
  const svgH = N * (STAGE_H + GAP) + 4;

  // All stages for bar chart — same order as funnel, extras at end
  const allBarStages = [
    ...FUNNEL_STAGES.map(s => ({ key: s.key, from: s.from, to: s.to, count: porSituacao[s.key] ?? 0 })),
    ...Object.entries(porSituacao)
      .filter(([k]) => !FUNNEL_STAGES.find(s => s.key === k))
      .map(([k, v]) => ({ key: k, from: "#94a3b8", to: "#64748b", count: v })),
  ].filter(s => s.count > 0);

  const maxBarCount = Math.max(...allBarStages.map(s => s.count), 1);

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Funil CRM por Situação</h3>
          <p className="text-xs text-slate-400 mt-0.5">{formatNumber(total)} leads no período</p>
          <p className="text-xs text-slate-400 mt-0.5">Dados filtrados geral da aba de leads do CV CRM</p>
        </div>
        {!compact && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
            <button onClick={() => setView("funnel")}
              className={`text-xs px-3 py-1.5 transition-colors ${view === "funnel" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
              Funil
            </button>
            <button onClick={() => setView("bar")}
              className={`text-xs px-3 py-1.5 transition-colors ${view === "bar" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
              Barras
            </button>
          </div>
        )}
      </div>

      {/* ── Bar chart view ── */}
      {view === "bar" && (
        <div className="space-y-2.5">
          {allBarStages.map(s => {
            const pct = (s.count / maxBarCount) * 100;
            const pctTotal = total > 0 ? (s.count / total) * 100 : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-36 text-[11px] font-semibold text-gray-600 truncate text-right flex-shrink-0">{s.key}</span>
                <div className="flex-1 relative h-7">
                  {/* Track */}
                  <div className="absolute inset-0 bg-slate-100 rounded-lg" />
                  {/* Bar */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg flex items-center px-2.5 transition-all duration-300"
                    style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${s.from}, ${s.to})` }}
                  >
                    {pct > 18 && (
                      <span className="text-[10px] font-bold text-white whitespace-nowrap">
                        {formatNumber(s.count)}
                      </span>
                    )}
                  </div>
                  {/* Count outside bar when bar is narrow */}
                  {pct <= 18 && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-700 whitespace-nowrap pl-1.5"
                      style={{ left: `${Math.max(pct, 2)}%` }}
                    >
                      {formatNumber(s.count)}
                    </span>
                  )}
                </div>
                <div className="w-14 text-right flex-shrink-0">
                  <span className="text-[10px] text-gray-400">{pctTotal.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Funnel view ── */}
      {(view === "funnel" || compact) && <div className={compact ? "flex justify-center" : "flex items-start gap-6"}>
        <div className={compact ? undefined : "flex justify-center flex-1 min-w-0"}>
        <svg
          viewBox={`0 0 ${SVG_W} ${svgH}`}
          width={580}
          style={{ display: "block", overflow: "visible", maxWidth: "100%" }}
        >
          <defs>
            {stages.map((stage, i) => (
              <linearGradient key={i} id={`fg-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={stage.from} />
                <stop offset="100%" stopColor={stage.to} />
              </linearGradient>
            ))}
            <filter id="fshadow" x="-5%" y="-5%" width="120%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(0,0,0,0.13)" />
            </filter>
          </defs>

          {stages.map((stage, i) => {
            const count     = porSituacao[stage.key] ?? 0;
            const pctTotal  = total > 0 ? (count / total) * 100 : 0;

            const topW  = lerp(MAX_W, MIN_W, i / N);
            const botW  = lerp(MAX_W, MIN_W, (i + 1) / N);
            const topX  = CX - topW / 2;
            const botX  = CX - botW / 2;
            const y     = i * (STAGE_H + GAP);
            const midY  = y + STAGE_H / 2;

            // Dynamic font size based on available width
            const fs     = Math.max(9, Math.min(12, topW / 40));
            const fsSub  = Math.max(8.5, Math.min(10.5, topW / 46));

            return (
              <g key={stage.key}>
                {/* Trapezoid */}
                <path
                  d={trapezoidPath(topX, topW, botX, botW, y, STAGE_H)}
                  fill={`url(#fg-${i})`}
                  filter="url(#fshadow)"
                />

                {/* Subtle shine */}
                <path
                  d={trapezoidPath(topX, topW, botX, botW, y, STAGE_H * 0.4)}
                  fill="rgba(255,255,255,0.11)"
                />

                {/* Stage name — centered top */}
                <text
                  x={CX}
                  y={midY - 7}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={fs}
                  fontWeight="700"
                  letterSpacing="0.4"
                  style={{ userSelect: "none" }}
                >
                  {stage.key.toUpperCase()}
                </text>

                {/* Count + % of total — centered bottom */}
                <text
                  x={CX}
                  y={midY + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.88)"
                  fontSize={fsSub}
                  fontWeight="500"
                  style={{ userSelect: "none" }}
                >
                  {formatNumber(count)} leads · {pctTotal.toFixed(1)}%
                </text>

              </g>
            );
          })}
        </svg>
        </div>

        {/* Right legend — Visão Geral only */}
        {!compact && (
          <div className="flex-shrink-0 w-44 flex flex-col justify-center gap-0.5 py-1">
            {FUNNEL_STAGES.map((stage) => {
              const count    = porSituacao[stage.key] ?? 0;
              const pctTotal = total > 0 ? (count / total) * 100 : 0;
              const hasData  = count > 0;
              return (
                <div key={stage.key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${hasData ? "hover:bg-slate-50" : "opacity-40"}`}>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: hasData ? `linear-gradient(135deg, ${stage.from}, ${stage.to})` : "#cbd5e1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-600 truncate leading-tight">{stage.key}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {hasData
                        ? <>{formatNumber(count)} · <span className="font-medium text-slate-500">{pctTotal.toFixed(1)}%</span></>
                        : <span className="text-slate-300">sem leads</span>
                      }
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Extra stages not in funnel (e.g. Descartado, Vencido) */}
            {(() => {
              const funnelKeys = new Set(FUNNEL_STAGES.map(s => s.key));
              const extras = Object.entries(porSituacao)
                .filter(([key, count]) => !funnelKeys.has(key) && count > 0)
                .sort((a, b) => b[1] - a[1]);
              if (extras.length === 0) return null;
              return (
                <>
                  <div className="border-t border-slate-100 my-1" />
                  {extras.map(([key, count]) => {
                    const pctTotal = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-slate-500 truncate leading-tight">{key}</p>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {formatNumber(count)} · <span className="font-medium text-slate-500">{pctTotal.toFixed(1)}%</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}
      </div>}
    </div>
  );
}
