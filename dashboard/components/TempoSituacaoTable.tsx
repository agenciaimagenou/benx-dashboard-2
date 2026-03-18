"use client";

import { useState } from "react";
import { Clock, AlertTriangle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface TempoSituacao {
  situacao: string;
  count: number;
  media_dias: number;
  max_dias: number;
  parados_3dias: number;
  parados_7dias: number;
  parados_15dias: number;
}

interface Props {
  data: TempoSituacao[];
  loading?: boolean;
}

function urgencyColor(mediaDias: number) {
  if (mediaDias >= 15) return "text-red-600 font-semibold";
  if (mediaDias >= 7) return "text-orange-500 font-semibold";
  if (mediaDias >= 3) return "text-yellow-600";
  return "text-emerald-600";
}

function urgencyBg(mediaDias: number) {
  if (mediaDias >= 15) return "bg-red-50";
  if (mediaDias >= 7) return "bg-orange-50";
  if (mediaDias >= 3) return "bg-yellow-50";
  return "";
}

type SortKey = "situacao" | "count" | "media_dias" | "max_dias" | "parados_3dias" | "parados_7dias" | "parados_15dias";

export default function TempoSituacaoTable({ data, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20 flex-shrink-0" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500 flex-shrink-0" />
      : <ChevronDown className="w-3 h-3 text-blue-500 flex-shrink-0" />;
  }

  const SIT_ORDER = [
    "Lead Recebido",
    "Tentativa de Contato",
    "Em Atendimento",
    "Visita Agendada",
    "Visita Realizada",
    "Proposta",
    "Com Reserva",
  ];

  const filtered = data.filter(row => {
    const s = row.situacao.toLowerCase();
    return !s.includes("descart") && !s.includes("venda") && !s.includes("ganho");
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "situacao") {
      const ai = SIT_ORDER.indexOf(a.situacao);
      const bi = SIT_ORDER.indexOf(b.situacao);
      const aIdx = ai === -1 ? SIT_ORDER.length : ai;
      const bIdx = bi === -1 ? SIT_ORDER.length : bi;
      if (aIdx !== bIdx) return sortDir === "asc" ? aIdx - bIdx : bIdx - aIdx;
      return a.situacao.localeCompare(b.situacao);
    }
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const thClass = "px-3 py-2.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-700 transition-colors whitespace-nowrap";

  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Clock className="w-4 h-4 text-orange-500" />
        <div>
          <h3 className="font-semibold text-gray-800">Tempo Médio por Etapa</h3>
          <p className="text-xs text-gray-500 mt-0.5">Quantos dias os leads ficam em cada situação</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800">
              <th onClick={() => toggleSort("situacao")} className={cn(thClass, "text-left")}>
                <div className="flex items-center gap-1">Situação <SortIcon col="situacao" /></div>
              </th>
              <th onClick={() => toggleSort("count")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">Total Leads <SortIcon col="count" /></div>
              </th>
              <th onClick={() => toggleSort("media_dias")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">Média Dias <SortIcon col="media_dias" /></div>
              </th>
              <th onClick={() => toggleSort("max_dias")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">Máx. Dias <SortIcon col="max_dias" /></div>
              </th>
              <th onClick={() => toggleSort("parados_3dias")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">
                  <span className="inline-flex items-center gap-0.5 text-yellow-400"><AlertTriangle className="w-3 h-3" /> +3D</span>
                  <SortIcon col="parados_3dias" />
                </div>
              </th>
              <th onClick={() => toggleSort("parados_7dias")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">
                  <span className="inline-flex items-center gap-0.5 text-orange-400"><AlertTriangle className="w-3 h-3" /> +7D</span>
                  <SortIcon col="parados_7dias" />
                </div>
              </th>
              <th onClick={() => toggleSort("parados_15dias")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">
                  <span className="inline-flex items-center gap-0.5 text-red-400"><AlertCircle className="w-3 h-3" /> +15D</span>
                  <SortIcon col="parados_15dias" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row, i) => (
              <tr key={row.situacao} className={cn(
                "border-b border-slate-100 hover:bg-blue-50/40 transition-colors",
                i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
              )}>
                <td className="px-3 py-2.5 font-semibold text-gray-800 text-xs whitespace-nowrap">{row.situacao}</td>
                <td className="px-3 py-2.5 text-right text-xs text-gray-600 font-medium">{formatNumber(row.count)}</td>
                <td className={cn("px-3 py-2.5 text-right text-xs font-semibold", urgencyColor(row.media_dias))}>{row.media_dias}d</td>
                <td className="px-3 py-2.5 text-right text-xs text-gray-400 font-mono">{row.max_dias}d</td>
                <td className="px-3 py-2.5 text-right text-xs">
                  {row.parados_3dias > 0
                    ? <span className="font-semibold text-yellow-600">{formatNumber(row.parados_3dias)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right text-xs">
                  {row.parados_7dias > 0
                    ? <span className="font-semibold text-orange-500">{formatNumber(row.parados_7dias)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right text-xs">
                  {row.parados_15dias > 0
                    ? <span className="font-semibold text-red-500">{formatNumber(row.parados_15dias)}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
