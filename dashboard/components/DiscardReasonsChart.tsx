"use client";

import React, { useState } from "react";
import { XCircle, X } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface MotivoDescarteLead {
  id: number;
  nome: string;
  corretor: string;
  empreendimento: string;
  imobiliaria?: string;
  origem?: string;
  ultima_origem?: string;
  data_cadastro: string | null;
}

interface MotivoDescarte {
  motivo: string;
  descricao: string;
  submotivo: string;
  empreendimento: string;
  count: number;
  leads?: MotivoDescarteLead[];
}

interface Props {
  data: MotivoDescarte[];
  loading?: boolean;
  totalLeads?: number;
}

const RANK_COLORS = [
  "bg-gradient-to-r from-red-500 to-rose-400",
  "bg-gradient-to-r from-red-400 to-orange-300",
  "bg-gradient-to-r from-orange-400 to-amber-300",
  "bg-gradient-to-r from-amber-400 to-yellow-300",
];
function barColor(i: number) {
  return RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)];
}

export default function DiscardReasonsChart({ data, loading, totalLeads }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [filterEmp, setFilterEmp] = useState("Todos");
  const [modal, setModal] = useState<{ title: string; leads: MotivoDescarteLead[] } | null>(null);

  const empreendimentos = ["Todos", ...Array.from(new Set(data.map((d) => d.empreendimento))).sort()];
  const filtered = filterEmp === "Todos" ? data : data.filter((d) => d.empreendimento === filterEmp);

  // Aggregate by motivo (descricao || motivo)
  const byMotivo: Record<string, { count: number; leads: MotivoDescarteLead[] }> = {};
  for (const d of filtered) {
    const key = d.descricao || d.motivo || "Não informado";
    if (!byMotivo[key]) byMotivo[key] = { count: 0, leads: [] };
    byMotivo[key].count += d.count;
    if (d.leads) byMotivo[key].leads.push(...d.leads);
  }

  const chartData = Object.entries(byMotivo)
    .map(([name, { count, leads }]) => ({ name, value: count, leads }))
    .sort((a, b) => b.value - a.value);

  // Add "Sem motivo registrado" row for the gap between totalLeads and sum of known motivos
  const knownTotal = chartData.reduce((s, d) => s + d.value, 0);
  const semMotivo = (totalLeads ?? 0) - knownTotal;
  if (semMotivo > 0) {
    chartData.push({ name: "Sem motivo registrado", value: semMotivo, leads: [] });
  }

  function openModal(name: string) {
    const entry = byMotivo[name];
    if (!entry) return;
    setModal({ title: name, leads: entry.leads });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  const total = filtered.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50">
          <div className="flex flex-wrap items-start gap-3 justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <div>
                <h3 className="font-semibold text-gray-800">Motivos de Descarte</h3>
                <p className="text-xs text-gray-500 mt-0.5">{formatNumber(totalLeads ?? total)} leads descartados no período · clique em um motivo para ver os leads</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterEmp}
                onChange={(e) => setFilterEmp(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none max-w-[160px]"
              >
                {empreendimentos.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {(["chart", "table"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "text-xs px-3 py-1.5 transition-colors",
                      view === v ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {v === "chart" ? "Gráfico" : "Tabela"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {total === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">Nenhum descarte registrado no período</p>
          </div>
        ) : view === "chart" ? (
          <div className="p-5 space-y-2">
            {chartData.map((entry, i) => {
              const pct = (entry.value / chartData[0].value) * 100;
              const sharePct = total > 0 ? (entry.value / total) * 100 : 0;
              const rankBg = i === 0 ? "bg-red-500 text-white shadow-red-200"
                           : i === 1 ? "bg-red-400 text-white shadow-rose-200"
                           : i === 2 ? "bg-orange-400 text-white shadow-orange-200"
                           : "bg-slate-100 text-slate-500";
              return (
                <button
                  key={entry.name}
                  onClick={() => openModal(entry.name)}
                  className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50/60 transition-colors duration-150 text-left"
                >
                  {/* Rank badge */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 shadow-sm ${rankBg}`}>
                    {i + 1}
                  </div>

                  {/* Label + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[260px] group-hover:text-slate-900">
                        {entry.name}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">
                        {sharePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor(i)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Count pill */}
                  <span className={cn(
                    "text-[11px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ring-1",
                    i === 0 ? "bg-red-50 text-red-600 ring-red-200"
                    : i <= 2 ? "bg-orange-50 text-orange-600 ring-orange-200"
                    : "bg-slate-50 text-slate-500 ring-slate-200"
                  )}>
                    {formatNumber(entry.value)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-300 uppercase tracking-wider">Motivo</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-300 uppercase tracking-wider">Empreendimento</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-300 uppercase tracking-wider">Qtde</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-300 uppercase tracking-wider">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {chartData.filter(e => e.name !== "Sem motivo registrado").map((entry, i) => {
                  // Group leads by empreendimento
                  const empMap: Record<string, { cnt: number; leads: MotivoDescarteLead[] }> = {};
                  for (const lead of entry.leads) {
                    const emp = lead.empreendimento || "Não definido";
                    if (!empMap[emp]) empMap[emp] = { cnt: 0, leads: [] };
                    empMap[emp].cnt++;
                    empMap[emp].leads.push(lead);
                  }
                  const empRows = Object.entries(empMap).sort((a, b) => b[1].cnt - a[1].cnt);
                  return (
                    <React.Fragment key={entry.name}>
                      {/* Motivo header row */}
                      <tr
                        key={`motivo-${i}`}
                        className="bg-slate-50 hover:bg-red-50/40 transition-colors cursor-pointer"
                        onClick={() => openModal(entry.name)}
                      >
                        <td className="px-4 py-2.5 text-xs font-bold text-gray-800" colSpan={2}>
                          <span className="inline-flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                            {entry.name}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs font-bold text-red-600">{formatNumber(entry.value)}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-gray-500 font-semibold">
                          {total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                      {/* Sub-rows per empreendimento */}
                      {empRows.map(([emp, { cnt, leads: empLeads }]) => (
                        <tr
                          key={`${i}-${emp}`}
                          className="hover:bg-red-50/30 transition-colors cursor-pointer"
                          onClick={() => setModal({ title: `${entry.name} · ${emp}`, leads: empLeads })}
                        >
                          <td className="px-4 py-2 text-xs text-gray-400 pl-8">↳</td>
                          <td className="px-4 py-2 text-xs text-gray-600">{emp}</td>
                          <td className="px-4 py-2 text-right text-xs font-semibold text-red-500">{formatNumber(cnt)}</td>
                          <td className="px-4 py-2 text-right text-xs text-gray-400">
                            {entry.value > 0 ? ((cnt / entry.value) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-red-50">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="font-semibold text-gray-800">{modal.title}</h3>
                  <p className="text-xs text-red-600 mt-0.5">
                    {modal.leads.length} lead{modal.leads.length !== 1 ? "s" : ""} descartado{modal.leads.length !== 1 ? "s" : ""}
                    {filterEmp !== "Todos" ? ` · ${filterEmp}` : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-300 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-300 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-300 uppercase tracking-wider">Empreendimento</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-300 uppercase tracking-wider">Corretor</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-300 uppercase tracking-wider">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {modal.leads.map((l, i) => (
                    <tr key={l.id} className={cn("border-b border-slate-100 hover:bg-red-50/30 transition-colors", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")}>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{l.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{l.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{l.empreendimento}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{l.corretor}</td>
                      <td className="px-4 py-3 text-right text-[11px] text-gray-400 whitespace-nowrap font-mono">{l.data_cadastro ? (l.data_cadastro.includes("T") ? l.data_cadastro.split("T")[0] : l.data_cadastro) : "—"}</td>
                    </tr>
                  ))}
                  {modal.leads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum lead encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
