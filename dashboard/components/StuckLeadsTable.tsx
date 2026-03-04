"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StuckLead {
  id: number;
  nome: string;
  situacao: string;
  empreendimento: string;
  corretor: string;
  data_cadastro: string | null;
  dias_parado: number;
  ultima_atualizacao: string | null;
  dias_sem_contato: number;
}

interface Props {
  leads: StuckLead[];
  loading?: boolean;
  threshold?: number;
  onThresholdChange?: (t: number) => void;
}

function urgencyBadge(dias: number) {
  const label = dias >= 10 ? `${Math.round(dias)}d` : `${dias.toFixed(1)}d`;
  if (dias >= 30)
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">{label}</span>;
  if (dias >= 15)
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">{label}</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">{label}</span>;
}

const PAGE_SIZE = 30;

type SortKey = "id" | "nome" | "empreendimento" | "situacao" | "corretor" | "data_cadastro" | "ultima_atualizacao" | "dias_sem_contato";

function parseBrDate(s: string | null): number {
  if (!s) return 0;
  const p = s.split("/");
  if (p.length !== 3) return 0;
  return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
}

export default function StuckLeadsTable({ leads, loading, threshold = 3, onThresholdChange }: Props) {
  const [page, setPage] = useState(0);
  const [filterSit, setFilterSit] = useState("Todos");
  const [filterEmp, setFilterEmp] = useState("Todos");
  const [sortKey, setSortKey] = useState<SortKey>("dias_sem_contato");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
    setPage(0);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20 flex-shrink-0" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500 flex-shrink-0" />
      : <ChevronDown className="w-3 h-3 text-blue-500 flex-shrink-0" />;
  }

  const situations = ["Todos", ...Array.from(new Set(leads.map((l) => l.situacao))).sort()];
  const empreendimentos = ["Todos", ...Array.from(new Set(leads.map((l) => l.empreendimento))).sort()];

  const filtered = leads
    .filter((l) => {
      if (filterSit !== "Todos" && l.situacao !== filterSit) return false;
      if (filterEmp !== "Todos" && l.empreendimento !== filterEmp) return false;
      return true;
    })
    .sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "data_cadastro") {
        av = parseBrDate(a.data_cadastro); bv = parseBrDate(b.data_cadastro);
      } else if (sortKey === "ultima_atualizacao") {
        av = parseBrDate(a.ultima_atualizacao); bv = parseBrDate(b.ultima_atualizacao);
      } else {
        av = a[sortKey] ?? ""; bv = b[sortKey] ?? "";
      }
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const current = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const thClass = "px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors";

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <div>
              <h3 className="font-semibold text-gray-800">Leads Parados sem Atualização</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {filtered.length} leads parados há ≥{" "}
                <span className="font-medium text-gray-700">{threshold} dias</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Threshold selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
              <span className="text-xs text-gray-500">Parados ≥</span>
              {[3, 7, 15, 30].map((t) => (
                <button
                  key={t}
                  onClick={() => { onThresholdChange?.(t); setPage(0); }}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    threshold === t ? "bg-blue-600 text-white font-semibold" : "text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {t}d
                </button>
              ))}
            </div>
            {/* Situation filter */}
            <select
              value={filterSit}
              onChange={(e) => { setFilterSit(e.target.value); setPage(0); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {situations.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Empreendimento filter */}
            <select
              value={filterEmp}
              onChange={(e) => { setFilterEmp(e.target.value); setPage(0); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-[160px]"
            >
              {empreendimentos.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum lead parado com esses filtros</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th onClick={() => toggleSort("id")} className={cn(thClass, "text-right")}>
                    <div className="flex items-center justify-end gap-1">ID <SortIcon col="id" /></div>
                  </th>
                  <th onClick={() => toggleSort("nome")} className={cn(thClass, "text-left")}>
                    <div className="flex items-center gap-1">Nome <SortIcon col="nome" /></div>
                  </th>
                  <th onClick={() => toggleSort("empreendimento")} className={cn(thClass, "text-left")}>
                    <div className="flex items-center gap-1">Empreendimento <SortIcon col="empreendimento" /></div>
                  </th>
                  <th onClick={() => toggleSort("situacao")} className={cn(thClass, "text-left")}>
                    <div className="flex items-center gap-1">Situação <SortIcon col="situacao" /></div>
                  </th>
                  <th onClick={() => toggleSort("corretor")} className={cn(thClass, "text-left")}>
                    <div className="flex items-center gap-1">Corretor <SortIcon col="corretor" /></div>
                  </th>
                  <th onClick={() => toggleSort("data_cadastro")} className={cn(thClass, "text-right whitespace-nowrap")}>
                    <div className="flex items-center justify-end gap-1">Data Cadastro <SortIcon col="data_cadastro" /></div>
                  </th>
                  <th onClick={() => toggleSort("ultima_atualizacao")} className={cn(thClass, "text-right")}>
                    <div className="flex items-center justify-end gap-1">Última atualização <SortIcon col="ultima_atualizacao" /></div>
                  </th>
                  <th onClick={() => toggleSort("dias_sem_contato")} className={cn(thClass, "text-right whitespace-nowrap")}>
                    <div className="flex items-center justify-end gap-1">Sem contato <SortIcon col="dias_sem_contato" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {current.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-right text-xs font-mono text-gray-400 whitespace-nowrap">{lead.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">{lead.nome}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{lead.empreendimento}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{lead.situacao}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate text-xs">{lead.corretor.split(" - ")[0]}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">{lead.data_cadastro || "—"}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{lead.ultima_atualizacao || "—"}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      {lead.dias_sem_contato > 0 ? (
                        <span className={cn("font-medium", lead.dias_sem_contato >= 7 ? "text-red-500" : "text-orange-500")}>
                          {lead.dias_sem_contato}d
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
              <span className="text-xs text-gray-500">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                </button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-colors",
                      page === i ? "bg-blue-600 text-white font-semibold" : "hover:bg-gray-100 text-gray-600"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(pages - 1, page + 1))}
                  disabled={page >= pages - 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
