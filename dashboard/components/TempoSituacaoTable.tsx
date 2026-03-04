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

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const thClass = "px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors";

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50 flex items-center gap-2">
        <Clock className="w-4 h-4 text-orange-500" />
        <div>
          <h3 className="font-semibold text-gray-800">Tempo Médio por Etapa</h3>
          <p className="text-xs text-gray-500 mt-0.5">Quantos dias os leads ficam em cada situação</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th onClick={() => toggleSort("situacao")} className={cn(thClass, "text-left")}>
                <div className="flex items-center gap-1">Situação <SortIcon col="situacao" /></div>
              </th>
              <th onClick={() => toggleSort("count")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">Total leads <SortIcon col="count" /></div>
              </th>
              <th onClick={() => toggleSort("media_dias")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">Média dias <SortIcon col="media_dias" /></div>
              </th>
              <th onClick={() => toggleSort("max_dias")} className={cn(thClass, "text-right")}>
                <div className="flex items-center justify-end gap-1">Máx. dias <SortIcon col="max_dias" /></div>
              </th>
              <th onClick={() => toggleSort("parados_3dias")} className={cn(thClass, "text-right whitespace-nowrap")}>
                <div className="flex items-center justify-end gap-1">
                  <span className="inline-flex items-center gap-1 text-yellow-600"><AlertTriangle className="w-3 h-3" /> +3d</span>
                  <SortIcon col="parados_3dias" />
                </div>
              </th>
              <th onClick={() => toggleSort("parados_7dias")} className={cn(thClass, "text-right whitespace-nowrap")}>
                <div className="flex items-center justify-end gap-1">
                  <span className="inline-flex items-center gap-1 text-orange-500"><AlertTriangle className="w-3 h-3" /> +7d</span>
                  <SortIcon col="parados_7dias" />
                </div>
              </th>
              <th onClick={() => toggleSort("parados_15dias")} className={cn(thClass, "text-right whitespace-nowrap")}>
                <div className="flex items-center justify-end gap-1">
                  <span className="inline-flex items-center gap-1 text-red-500"><AlertCircle className="w-3 h-3" /> +15d</span>
                  <SortIcon col="parados_15dias" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((row) => (
              <tr key={row.situacao} className={cn("hover:bg-gray-50/50 transition-colors", urgencyBg(row.media_dias))}>
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{row.situacao}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatNumber(row.count)}</td>
                <td className={cn("px-4 py-3 text-right", urgencyColor(row.media_dias))}>{row.media_dias}d</td>
                <td className="px-4 py-3 text-right text-gray-500">{row.max_dias}d</td>
                <td className="px-4 py-3 text-right">
                  <span className={cn("font-medium", row.parados_3dias > 0 ? "text-yellow-600" : "text-gray-300")}>
                    {row.parados_3dias > 0 ? formatNumber(row.parados_3dias) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={cn("font-medium", row.parados_7dias > 0 ? "text-orange-500" : "text-gray-300")}>
                    {row.parados_7dias > 0 ? formatNumber(row.parados_7dias) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={cn("font-medium", row.parados_15dias > 0 ? "text-red-500" : "text-gray-300")}>
                    {row.parados_15dias > 0 ? formatNumber(row.parados_15dias) : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
