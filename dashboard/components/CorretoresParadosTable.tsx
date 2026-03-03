"use client";

import { useState } from "react";
import { UserX, X } from "lucide-react";
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
  if (avg >= 7) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-yellow-700 bg-yellow-50 border-yellow-200";
}

function barColor(avg: number) {
  if (avg >= 15) return "bg-red-400";
  if (avg >= 7) return "bg-orange-400";
  return "bg-yellow-400";
}

function diasColor(d: number) {
  if (d >= 15) return "text-red-600 font-bold";
  if (d >= 7) return "text-orange-600 font-semibold";
  return "text-yellow-700";
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

export default function CorretoresParadosTable({ data, leads, corretoresTotal, loading, threshold = 3 }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null);

  function openModal(corretor: string, situacao: string) {
    const corretorLeads = leads.filter(
      l => (l.corretor?.split(" - ")[0]?.trim() || "Não atribuído") === corretor
        && l.situacao === situacao
    ).sort((a, b) => b.dias_parado - a.dias_parado);
    setModal({ corretor, situacao, leads: corretorLeads });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <UserX className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Nenhum corretor com leads parados</p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.map(d => d.total_parados));

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center gap-2">
          <UserX className="w-4 h-4 text-red-500" />
          <div>
            <h3 className="font-semibold text-gray-800">Corretores — Leads Parados</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ranqueado por leads sem atualização ≥ {threshold} dias · clique na situação para ver os leads
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-6">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Corretor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Por Situação</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Parados</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Média dias</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Máx dias</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, i) => {
                const situations = Object.entries(row.por_situacao).sort((a, b) => b[1] - a[1]);
                const totalLeads = corretoresTotal[row.corretor] ?? row.total_parados;
                return (
                  <tr key={row.corretor} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate whitespace-nowrap">{row.corretor}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {situations.map(([sit, count]) => (
                          <button
                            key={sit}
                            onClick={() => openModal(row.corretor, sit)}
                            className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-75 transition-opacity",
                              sitColor(sit)
                            )}
                            title={`Ver leads de ${row.corretor} em ${sit}`}
                          >
                            <span className="truncate max-w-[120px]">{sit}</span>
                            <span className="font-bold flex-shrink-0">{count}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700">{formatNumber(totalLeads)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border",
                        urgencyColor(row.avg_dias)
                      )}>
                        {row.total_parados}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs font-medium whitespace-nowrap">{row.avg_dias}d</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">{row.max_dias}d</td>
                    <td className="px-4 py-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", barColor(row.avg_dias))}
                          style={{ width: `${(row.total_parados / maxTotal) * 100}%` }}
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">{modal.corretor}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium mr-2", sitColor(modal.situacao))}>{modal.situacao}</span>
                  {modal.leads.length} lead{modal.leads.length !== 1 ? "s" : ""} parado{modal.leads.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empreendimento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Origem</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Últ. atualização</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Dias parado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {modal.leads.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{l.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{l.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{l.empreendimento}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{l.origem || "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">{l.data_cadastro ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">{l.ultima_atualizacao ?? "—"}</td>
                      <td className={cn("px-4 py-3 text-right text-xs whitespace-nowrap", diasColor(l.dias_parado))}>{l.dias_parado}d</td>
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
