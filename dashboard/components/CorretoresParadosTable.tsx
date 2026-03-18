"use client";

import { useState } from "react";
import { UserX, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface CorretorParado {
  corretor: string;
  total_parados: number;
  avg_dias: number;
  max_dias: number;
  por_situacao: Record<string, number>;
}

interface StuckLead {
  id: number;
  nome: string;
  situacao: string;
  empreendimento: string;
  corretor: string;
  origem: string;
  data_cadastro: string | null;
  dias_parado: number;
  ultima_atualizacao: string | null;
  dias_sem_contato: number;
}

interface Props {
  data: CorretorParado[];
  leads: StuckLead[];
  corretoresTotal: Record<string, number>;
  loading?: boolean;
  threshold?: number;
}

function urgencyColor(avg: number) {
  if (avg >= 15) return "text-red-600 bg-red-50 border-red-200";
  if (avg >= 7)  return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-yellow-700 bg-yellow-50 border-yellow-200";
}

function barGradient(avg: number) {
  if (avg >= 15) return "from-red-400 to-rose-300";
  if (avg >= 7)  return "from-orange-400 to-amber-300";
  return "from-yellow-400 to-yellow-300";
}

function diasColor(d: number) {
  if (d >= 15) return "text-red-600 font-bold";
  if (d >= 7)  return "text-orange-600 font-semibold";
  return "text-yellow-700";
}

function formatDate(s: string | null): string {
  if (!s) return "—";
  if (s.includes("T")) return s.split("T")[0];
  return s;
}

const SIT_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-700",
];

const sitColorCache: Record<string, string> = {};
let sitColorIdx = 0;
function sitColor(sit: string): string {
  if (!sitColorCache[sit]) {
    sitColorCache[sit] = SIT_COLORS[sitColorIdx % SIT_COLORS.length];
    sitColorIdx++;
  }
  return sitColorCache[sit];
}

interface ModalState {
  corretor: string;
  situacao: string;
  leads: StuckLead[];
}

type SortKey = "corretor" | "total_parados" | "avg_dias" | "max_dias" | "totalLeads";

export default function CorretoresParadosTable({ data, leads, corretoresTotal, loading, threshold = 3 }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("total_parados");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20 flex-shrink-0" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-400 flex-shrink-0" />
      : <ChevronDown className="w-3 h-3 text-blue-400 flex-shrink-0" />;
  }

  function openModal(corretor: string, situacao: string) {
    const corretorLeads = leads.filter(
      l => (l.corretor?.split(" - ")[0]?.trim() || "Não atribuído") === corretor
        && l.situacao === situacao
    ).sort((a, b) => b.dias_parado - a.dias_parado);
    setModal({ corretor, situacao, leads: corretorLeads });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-56 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-8 text-center">
        <UserX className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Nenhum corretor com leads parados</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => {
    let av: string | number, bv: string | number;
    if (sortKey === "totalLeads") {
      av = corretoresTotal[a.corretor] ?? a.total_parados;
      bv = corretoresTotal[b.corretor] ?? b.total_parados;
    } else if (sortKey === "corretor") {
      av = a.corretor; bv = b.corretor;
    } else {
      av = a[sortKey]; bv = b[sortKey];
    }
    if (typeof av === "string" && typeof bv === "string")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const maxTotal = Math.max(...data.map(d => d.total_parados));
  const thClass = "px-3 py-2.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-700 transition-colors whitespace-nowrap";

  return (
    <>
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <UserX className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Corretores — Leads Parados</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Ranqueado por leads sem atualização ≥ {threshold} dias · clique na situação para ver os leads
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-8">#</th>
                <th onClick={() => toggleSort("corretor")} className={cn(thClass, "text-left")}>
                  <div className="flex items-center gap-1">Corretor <SortIcon col="corretor" /></div>
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Por Situação</th>
                <th onClick={() => toggleSort("totalLeads")} className={cn(thClass, "text-right")}>
                  <div className="flex items-center justify-end gap-1">Total <SortIcon col="totalLeads" /></div>
                </th>
                <th onClick={() => toggleSort("total_parados")} className={cn(thClass, "text-right")}>
                  <div className="flex items-center justify-end gap-1">Parados <SortIcon col="total_parados" /></div>
                </th>
                <th onClick={() => toggleSort("avg_dias")} className={cn(thClass, "text-right")}>
                  <div className="flex items-center justify-end gap-1">Média Dias <SortIcon col="avg_dias" /></div>
                </th>
                <th onClick={() => toggleSort("max_dias")} className={cn(thClass, "text-right")}>
                  <div className="flex items-center justify-end gap-1">Máx Dias <SortIcon col="max_dias" /></div>
                </th>
                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider w-28">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((row, i) => {
                const situations = Object.entries(row.por_situacao)
                  .filter(([sit]) => {
                    const s = sit.toLowerCase();
                    return !s.includes("descart") && !s.includes("venda") && !s.includes("ganho");
                  })
                  .sort((a, b) => b[1] - a[1]);
                const totalLeads = corretoresTotal[row.corretor] ?? row.total_parados;
                const pct = (row.total_parados / maxTotal) * 100;
                return (
                  <tr key={row.corretor} className={cn(
                    "border-b border-slate-100 transition-colors hover:bg-blue-50/40",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  )}>
                    <td className="px-3 py-2 text-[11px] text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800 text-xs max-w-[160px] truncate whitespace-nowrap">{row.corretor}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {situations.map(([sit, count]) => (
                          <button
                            key={sit}
                            onClick={() => openModal(row.corretor, sit)}
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-75 transition-opacity",
                              sitColor(sit)
                            )}
                            title={`Ver leads de ${row.corretor} em ${sit}`}
                          >
                            <span className="truncate max-w-[110px]">{sit}</span>
                            <span className="font-bold flex-shrink-0">{count}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-600">{formatNumber(totalLeads)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={cn(
                        "inline-flex items-center justify-center text-xs font-bold px-2.5 py-0.5 rounded-full border min-w-[2rem]",
                        urgencyColor(row.avg_dias)
                      )}>
                        {row.total_parados}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap">
                      <span className={cn(urgencyColor(row.avg_dias), "px-1.5 py-0.5 rounded text-xs font-semibold border-0 bg-transparent")}>
                        {row.avg_dias}d
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-400 whitespace-nowrap font-mono">{row.max_dias}d</td>
                    <td className="px-3 py-2">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r transition-all", barGradient(row.avg_dias))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">{modal.corretor}</h3>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", sitColor(modal.situacao))}>{modal.situacao}</span>
                  <span>{modal.leads.length} lead{modal.leads.length !== 1 ? "s" : ""} parado{modal.leads.length !== 1 ? "s" : ""}</span>
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-800">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Nome</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Empreendimento</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Origem</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">Cadastro</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">Últ. Atualização</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">Dias Parado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modal.leads.map((l, i) => (
                    <tr key={l.id} className={cn("transition-colors hover:bg-blue-50/30", i % 2 === 0 ? "bg-white" : "bg-slate-50/40")}>
                      <td className="px-3 py-2 text-[11px] text-gray-400 font-mono whitespace-nowrap">{l.id}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 text-xs max-w-[200px] truncate">{l.nome}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-[180px] truncate">{l.empreendimento}</td>
                      <td className="px-3 py-2 text-xs text-gray-400 max-w-[140px] truncate">{l.origem || "—"}</td>
                      <td className="px-3 py-2 text-right text-[11px] text-gray-400 whitespace-nowrap font-mono">{formatDate(l.data_cadastro)}</td>
                      <td className="px-3 py-2 text-right text-[11px] text-gray-400 whitespace-nowrap font-mono">{formatDate(l.ultima_atualizacao)}</td>
                      <td className={cn("px-3 py-2 text-right text-xs whitespace-nowrap font-semibold", diasColor(l.dias_parado))}>{l.dias_parado}d</td>
                    </tr>
                  ))}
                  {modal.leads.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum lead encontrado</td>
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
