"use client";

import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { MergedData } from "@/types";
import { formatCurrency, formatNumber, formatPercent, cn } from "@/lib/utils";
import GanhosModal from "@/components/GanhosModal";

interface Props {
  data: MergedData[];
  loading?: boolean;
  dateStart?: string;
  dateEnd?: string;
}

interface ModalState {
  empreendimento: string;
  tipo: "ganhos" | "reservas";
}

type SortKey = keyof MergedData;
type SortDir = "asc" | "desc";

const COLUMNS = [
  { key: "empreendimento" as SortKey, label: "Empreendimento", className: "text-left" },
  { key: "meta_spend" as SortKey, label: "Investimento", className: "text-right" },
  { key: "meta_impressions" as SortKey, label: "Impressões", className: "text-right" },
  { key: "meta_clicks" as SortKey, label: "Cliques", className: "text-right" },
  { key: "meta_ctr" as SortKey, label: "CTR", className: "text-right" },
  { key: "meta_leads" as SortKey, label: "Leads Meta", className: "text-right" },
  { key: "meta_cpl" as SortKey, label: "CPL Meta", className: "text-right" },
  { key: "meta_cpm" as SortKey, label: "CPM", className: "text-right" },
  { key: "crm_leads" as SortKey, label: "Leads CRM", className: "text-right" },
  { key: "crm_atendimento" as SortKey, label: "Atendimento", className: "text-right" },
  { key: "crm_reserva" as SortKey, label: "Reserva", className: "text-right" },
  { key: "crm_ganhos" as SortKey, label: "Ganhos", className: "text-right" },
];

export default function MergedTable({ data, loading, dateStart = "", dateEnd = "" }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("meta_spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modal, setModal] = useState<ModalState | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "number" && typeof bv === "number") {
      return sortDir === "asc" ? av - bv : bv - av;
    }
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  function formatCell(key: SortKey, value: unknown) {
    if (key === "empreendimento" || key === "ad_account_name" || key === "crm_key") {
      return <span className="font-medium text-gray-800">{String(value)}</span>;
    }
    if (key === "meta_spend" || key === "meta_cpl" || key === "meta_cpm") {
      return formatCurrency(Number(value));
    }
    if (key === "meta_ctr" || key === "crm_conversao" || key === "lead_conversion") {
      return formatPercent(Number(value));
    }
    if (key === "meta_cpc") {
      return formatCurrency(Number(value));
    }
    return formatNumber(Number(value));
  }

  function getGainColor(key: SortKey, value: unknown) {
    if (key === "crm_ganhos") {
      const n = Number(value);
      if (n > 0) return "text-emerald-600 font-semibold";
    }
    if (key === "meta_spend") {
      const n = Number(value);
      if (n === 0) return "text-gray-400";
    }
    return "text-gray-700";
  }

  return (
    <>
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <h3 className="font-semibold text-gray-800">Desempenho por Empreendimento</h3>
        <p className="text-xs text-gray-500 mt-0.5">Meta Ads + CRM combinados</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap",
                    col.className
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <div className={cn("flex items-center gap-1", col.className.includes("right") ? "justify-end" : "")}>
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.empreendimento}
                className={cn(
                  "transition-colors hover:bg-blue-50/40",
                  i % 2 === 0 ? "bg-white" : "bg-gray-100"
                )}
              >
                {COLUMNS.map((col) => {
                  const isClickableGanhos = col.key === "crm_ganhos" && Number(row[col.key]) > 0 && dateStart && dateEnd;
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 whitespace-nowrap",
                        col.className,
                        getGainColor(col.key, row[col.key])
                      )}
                    >
                      {isClickableGanhos ? (
                        <button
                          onClick={() => setModal({ empreendimento: row.empreendimento, tipo: "ganhos" })}
                          className="text-emerald-600 font-semibold underline decoration-dotted hover:decoration-solid transition-all"
                          title="Ver leads ganhos"
                        >
                          {formatCell(col.key, row[col.key])}
                        </button>
                      ) : (
                        formatCell(col.key, row[col.key])
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
              <td className="px-4 py-3 text-gray-800">TOTAL</td>
              {COLUMNS.slice(1).map((col) => {
                const total = data.reduce((sum, r) => sum + (typeof r[col.key] === "number" ? Number(r[col.key]) : 0), 0);
                const avg = data.length > 0 ? total / data.length : 0;
                const useAvg = col.key === "meta_ctr" || col.key === "meta_cpl" || col.key === "meta_cpc" || col.key === "meta_cpm";
                return (
                  <td key={col.key} className={cn("px-4 py-3 text-gray-800", col.className)}>
                    {formatCell(col.key, useAvg ? avg : total)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    {modal && dateStart && dateEnd && (
      <GanhosModal
        empreendimento={modal.empreendimento}
        dateStart={dateStart}
        dateEnd={dateEnd}
        tipo={modal.tipo}
        onClose={() => setModal(null)}
      />
    )}
    </>
  );
}
