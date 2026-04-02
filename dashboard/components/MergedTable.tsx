"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowUpDown, ArrowUp, ArrowDown, X, Trophy, Bookmark, Info } from "lucide-react";
import { MergedData } from "@/types";
import { formatCurrency, formatNumber, formatPercent, cn } from "@/lib/utils";

interface Props {
  data: MergedData[];
  loading?: boolean;
  dateStart?: string;
  dateEnd?: string;
  reservasRecords?: Record<string, unknown>[];
}

type SortKey = keyof MergedData;
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; tooltip?: string; className: string }[] = [
  { key: "empreendimento", label: "Empreendimento", className: "text-left" },
  { key: "meta_spend",     label: "Invest.",        className: "text-right" },
  { key: "meta_impressions", label: "Impressões",   className: "text-right" },
  { key: "meta_clicks",    label: "Cliques",        className: "text-right" },
  { key: "meta_ctr",       label: "CTR",            className: "text-right" },
  { key: "meta_leads",     label: "Leads Meta",     className: "text-right" },
  { key: "meta_cpl",       label: "CPL",            className: "text-right" },
  { key: "meta_cpm",       label: "CPM",            className: "text-right" },
  {
    key: "crm_leads", label: "Leads CRM", className: "text-right",
    tooltip: "Total de leads cadastrados no CRM com origem FB ou IG (Facebook/Instagram), por empreendimento, no período selecionado. Representa os leads que o CRM registrou como vindos do Meta — pode divergir dos \"Leads Meta\" por diferenças de atribuição entre as plataformas.",
  },
  {
    key: "crm_atendimento", label: "Atend.", className: "text-right",
    tooltip: "Leads de origem Meta (FB/IG) que receberam atendimento no CRM — ou seja, que passaram da situação inicial e foram trabalhados pela equipe comercial no período.",
  },
  {
    key: "res_ativas", label: "Reservas", className: "text-right",
    tooltip: "Contratos na tabela de Reservas com origem Meta (FB/IG) que ainda NÃO foram confirmados como venda — contados pela data de cadastro (data_cad) no período selecionado. Clique no número para ver os detalhes.",
  },
  {
    key: "res_vendas", label: "Vendas", className: "text-right",
    tooltip: "Contratos na tabela de Reservas com origem Meta (FB/IG) com situação de venda confirmada — contados pela data da venda (data_venda) no período selecionado. Clique no número para ver os detalhes.",
  },
];

function ColTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  function show() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const tooltipW = 256;
      const center = r.left + r.width / 2;
      const raw = center - tooltipW / 2;
      const left = Math.max(8, Math.min(raw, window.innerWidth - tooltipW - 8)) + window.scrollX;
      setPos({ top: r.top + window.scrollY - 8, left });
    }
    setVisible(true);
  }

  return (
    <span
      ref={ref}
      className="ml-0.5 inline-flex items-center cursor-default"
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
      onClick={e => e.stopPropagation()}
    >
      <Info className="w-3 h-3 text-slate-400 hover:text-blue-300 transition-colors flex-shrink-0" />
      {visible && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[9999] w-64 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-xl pointer-events-none whitespace-normal"
          style={{ top: pos.top, left: pos.left, transform: "translateY(-100%)" }}
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900" />
        </div>,
        document.body
      )}
    </span>
  );
}

const RES_VENDA_IDS = new Set([3, 17, 23, 24, 25, 26, 28]);

function isResVenda(r: Record<string, unknown>): boolean {
  const idSit = Number(r.idsituacao);
  if (!isNaN(idSit) && idSit > 0 && RES_VENDA_IDS.has(idSit)) return true;
  const sit = String(r.situacao || "").toLowerCase().trim();
  return sit.startsWith("vend") || sit === "vendida";
}

function isCancelada(r: Record<string, unknown>): boolean {
  const sit = String(r.situacao || "").toLowerCase().trim();
  return sit.startsWith("cancel");
}

interface ResModal {
  empreendimento: string;
  isVenda: boolean;
  records: Record<string, unknown>[];
}

const MODAL_COLS = [
  { key: "idreserva", label: "ID Reserva" },
  { key: "idlead", label: "ID Lead" },
  { key: "origem_nome", label: "Origem" },
  { key: "cliente", label: "Cliente" },
  { key: "unidade", label: "Unidade" },
  { key: "situacao", label: "Situação" },
  { key: "corretor", label: "Corretor" },
  { key: "valor_contrato", label: "Valor Contrato" },
  { key: "data_cad", label: "Data Cad." },
  { key: "data_venda", label: "Data Venda" },
];

function formatModalCell(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "valor_contrato") {
    const n = Number(value);
    return isNaN(n) ? String(value) : formatCurrency(n);
  }
  if ((key === "data_cad" || key === "data_venda") && value) {
    const s = String(value);
    // format ISO date to DD/MM/YYYY
    if (s.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
    }
    return s;
  }
  return String(value);
}

export default function MergedTable({ data, loading, dateStart, dateEnd, reservasRecords }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("meta_spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [resModal, setResModal] = useState<ResModal | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function openModal(row: MergedData, isVenda: boolean) {
    if (!reservasRecords || reservasRecords.length === 0) return;
    const empKey = row.res_emp_key || row.empreendimento;
    const empLower = empKey.toLowerCase().trim();
    const filtered = reservasRecords.filter(r => {
      const rEmp = String(r.empreendimento || "").toLowerCase().trim();
      if (rEmp !== empLower) return false;
      if (isCancelada(r)) return false;
      if (isVenda ? !isResVenda(r) : isResVenda(r)) return false;
      // Date filter: vendas by data_venda, reservas ativas by data_cad
      const dateField = isVenda
        ? (r.data_venda ? String(r.data_venda).slice(0, 10) : null)
        : (r.data_cad   ? String(r.data_cad).slice(0, 10)   : null);
      if (!dateField) return false;
      if (dateStart && dateField < dateStart) return false;
      if (dateEnd   && dateField > dateEnd)   return false;
      return true;
    });
    setResModal({ empreendimento: row.empreendimento, isVenda, records: filtered });
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
    if (key === "meta_spend" || key === "meta_cpl" || key === "meta_cpm" || key === "meta_cpc") {
      return formatCurrency(Number(value));
    }
    if (key === "meta_ctr" || key === "crm_conversao" || key === "lead_conversion") {
      return formatPercent(Number(value));
    }
    return formatNumber(Number(value));
  }

  function getCellClass(key: SortKey, value: unknown): string {
    if (key === "meta_spend" && Number(value) === 0) return "text-gray-400";
    return "text-gray-700";
  }

  return (
    <>
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800">Desempenho por Empreendimento</h3>
          <p className="text-xs text-gray-500 mt-0.5">Meta Ads + CRM + Reservas combinados</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-2 text-[10px] font-bold text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-700 select-none whitespace-nowrap transition-colors",
                      col.className
                    )}
                    onClick={() => handleSort(col.key)}
                  >
                    <div className={cn("flex items-center gap-1", col.className.includes("right") ? "justify-end" : "")}>
                      {col.label}
                      {col.tooltip && <ColTooltip text={col.tooltip} />}
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
                    "border-b border-slate-100 transition-colors hover:bg-blue-50/40",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  )}
                >
                  {COLUMNS.map((col) => {
                    const val = Number(row[col.key]);
                    const hasRecords = !!reservasRecords && reservasRecords.length > 0;

                    if (col.key === "res_ativas") {
                      return (
                        <td key={col.key} className={cn("px-3 py-2 whitespace-nowrap text-right")}>
                          {val > 0 ? (
                            <button
                              onClick={hasRecords ? () => openModal(row, false) : undefined}
                              className={cn(
                                "inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-full border text-[10px] transition-colors",
                                "text-violet-700 bg-violet-100 border-violet-200",
                                hasRecords ? "cursor-pointer hover:bg-violet-200" : "cursor-default"
                              )}
                              title="Reservas ativas (clique para ver detalhes)"
                            >
                              <Bookmark className="w-2.5 h-2.5" />
                              {val}
                            </button>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    }

                    if (col.key === "res_vendas") {
                      return (
                        <td key={col.key} className={cn("px-3 py-2 whitespace-nowrap text-right")}>
                          {val > 0 ? (
                            <button
                              onClick={hasRecords ? () => openModal(row, true) : undefined}
                              className={cn(
                                "inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-full border text-[10px] transition-colors",
                                "text-emerald-700 bg-emerald-100 border-emerald-200",
                                hasRecords ? "cursor-pointer hover:bg-emerald-200" : "cursor-default"
                              )}
                              title="Vendas (clique para ver detalhes)"
                            >
                              <Trophy className="w-2.5 h-2.5" />
                              {val}
                            </button>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-2 whitespace-nowrap",
                          col.className,
                          getCellClass(col.key, row[col.key])
                        )}
                      >
                        {formatCell(col.key, row[col.key])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 border-t-2 border-slate-700 font-semibold">
                <td className="px-3 py-2 text-slate-200 text-xs">TOTAL</td>
                {COLUMNS.slice(1).map((col) => {
                  const total = data.reduce((sum, r) => sum + (typeof r[col.key] === "number" ? Number(r[col.key]) : 0), 0);
                  const avg = data.length > 0 ? total / data.length : 0;
                  const useAvg = col.key === "meta_ctr" || col.key === "meta_cpl" || col.key === "meta_cpc" || col.key === "meta_cpm";
                  return (
                    <td key={col.key} className={cn("px-3 py-2 text-slate-200 text-xs", col.className)}>
                      {formatCell(col.key, useAvg ? avg : total)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Reservas Detail Modal */}
      {resModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pl-52"
          onClick={() => setResModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-7xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-base">
                  {resModal.isVenda ? "Vendas" : "Reservas Ativas"} — {resModal.empreendimento}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {resModal.records.length} {resModal.records.length === 1 ? "registro" : "registros"}
                </p>
              </div>
              <button
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
                onClick={() => setResModal(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal table */}
            <div className="overflow-auto flex-1">
              {resModal.records.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">Nenhum registro encontrado</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-800">
                      {MODAL_COLS.map(c => (
                        <th key={c.key} className="px-2 py-2 text-[10px] font-bold text-slate-300 uppercase tracking-wider text-left whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resModal.records.map((r, i) => (
                      <tr
                        key={String(r.idreserva ?? i)}
                        className={cn(
                          "border-b border-slate-100",
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        )}
                      >
                        {MODAL_COLS.map(c => (
                          <td key={c.key} className="px-2 py-2 whitespace-nowrap text-slate-700">
                            {c.key === "situacao" ? (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                                isResVenda(r) ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"
                              )}>
                                {formatModalCell(c.key, r[c.key])}
                              </span>
                            ) : (
                              formatModalCell(c.key, r[c.key])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
