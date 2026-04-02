"use client";

import { useMemo, useState, useRef, useEffect, Fragment } from "react";
import {
  CheckCircle2, AlertTriangle, DollarSign,
  Users, Filter, Search, ChevronUp, ChevronDown, X, BarChart3,
  Award, Calendar, Percent,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import KPICard from "@/components/KPICard";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReservaRecord {
  idreserva?: number | string | null;
  referencia?: string;
  cliente?: string;
  empreendimento?: string;
  bloco?: string;
  unidade?: string;
  situacao?: string;
  nome_time?: string;
  corretor?: string;
  imobiliaria?: string;
  valor_contrato?: number | string | null;
  data_venda?: string | null;
  data_cad?: string | null;
  data_contrato?: string | null;
  tipovenda?: string;
  ativo?: string;
  idlead?: number | string | null;
  lead_data_cad?: string | null;
  origem_nome?: string | null;
  origem_ultimo_nome?: string | null;
  [key: string]: unknown;
}

interface ReservasData {
  records: ReservaRecord[];
  filter_options: {
    empreendimentos: string[];
    situacoes: string[];
    times: string[];
    corretores: string[];
    tiposVenda: string[];
    origens: string[];
  };
}

interface CrmEmp { empreendimento: string; total_leads: number; [key: string]: unknown }
interface Props {
  data: ReservasData | null;
  loading: boolean;
  dateStart?: string;
  dateEnd?: string;
  crmTotalLeads?: number;
  crmLeadsByEmp?: CrmEmp[];
  crmPorOrigemEmp?: Record<string, Record<string, number>> | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v.replace(/[^\d.,-]/g, "").replace(",", ".")) : Number(v);
  return isNaN(n) ? 0 : n;
}

function formatBRL(v: number, compact = false): string {
  if (compact) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    if (v >= 1_000)     return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}K`;
  }
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const s = d.split("T")[0];
  const [y, m, day] = s.split("-");
  return `${day}/${m}/${y}`;
}

function situacaoType(sit: string): "vendida" | "cancelada" | "reservada" | "aprovada" | "outro" {
  const s = sit.toLowerCase().trim();
  if (s.startsWith("vend") || s === "vendida") return "vendida";
  if (s.includes("cancel") || s.includes("rescis") || s.includes("distrat")) return "cancelada";
  if (s.startsWith("reserv")) return "reservada";
  if (s.startsWith("aprov")) return "aprovada";
  return "outro";
}

// IDs de situação que devem ser tratados como "vendida"
const VENDA_IDS = new Set([3, 17, 23, 24, 25, 26, 28]);

function isVendaRecord(r: ReservaRecord): boolean {
  const idSit = Number(r.idsituacao);
  if (!isNaN(idSit) && idSit > 0 && VENDA_IDS.has(idSit)) return true;
  return situacaoType(String(r.situacao || "")) === "vendida";
}

const SIT_BADGE: Record<string, string> = {
  vendida:   "bg-emerald-100 text-emerald-700 ring-emerald-200",
  cancelada: "bg-red-100 text-red-700 ring-red-200",
  reservada: "bg-amber-100 text-amber-700 ring-amber-200",
  aprovada:  "bg-blue-100 text-blue-700 ring-blue-200",
  outro:     "bg-slate-100 text-slate-600 ring-slate-200",
};
const SIT_DOT: Record<string, string> = {
  vendida: "bg-emerald-500", cancelada: "bg-red-500",
  reservada: "bg-amber-400", aprovada: "bg-blue-500", outro: "bg-slate-400",
};
function SituacaoBadge({ sit }: { sit: string }) {
  const t = situacaoType(sit);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 whitespace-nowrap", SIT_BADGE[t])}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", SIT_DOT[t])} />
      {sit}
    </span>
  );
}

function formatMes(mes: string) {
  const [year, month] = mes.split("-");
  return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(month) - 1] + `/${year.slice(2)}`;
}

type SortKey = keyof ReservaRecord | "unidade_full";
const PAGE_SIZE = 30;

// ── Component ──────────────────────────────────────────────────────────────────

export default function ReservasSection({ data, loading, dateStart, dateEnd, crmTotalLeads = 0, crmLeadsByEmp = [], crmPorOrigemEmp }: Props) {
  // ── Filter state ────────────────────────────────────────────────────────────
  const [filterEmp,    setFilterEmp]    = useState<string[]>([]);
  const [filterSit,    setFilterSit]    = useState<string[]>([]);
  const [filterTime,   setFilterTime]   = useState("");
  const [filterCor,    setFilterCor]    = useState<string[]>([]);
  const [filterOrigem, setFilterOrigem] = useState<string[]>([]);

  // ── Table state ─────────────────────────────────────────────────────────────
  const [search,    setSearch]    = useState("");
  const [page,      setPage]      = useState(0);
  const [sortKey,   setSortKey]   = useState<SortKey>("data_venda");
  const [sortDir,   setSortDir]   = useState<"asc" | "desc">("desc");
  const [hoveredMes, setHoveredMes] = useState<number | null>(null);
  const [tooltipX,   setTooltipX]   = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const [vgvTab, setVgvTab] = useState<"resumo" | "analitico">("resumo");
  const [corSortKey, setCorSortKey] = useState<"count" | "vgv">("vgv");
  const [corSortDir, setCorSortDir] = useState<"asc" | "desc">("desc");

  // Reset page when period changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(0); }, [dateStart, dateEnd]);

  // ── Filtered records ────────────────────────────────────────────────────────
  const applyBaseFilters = (r: ReservaRecord) => {
    if (situacaoType(String(r.situacao || "")) === "cancelada") return false;
    if (filterEmp.length    && !filterEmp.includes(String(r.empreendimento || "")))  return false;
    if (filterTime          && String(r.nome_time || "") !== filterTime)              return false;
    if (filterCor.length    && !filterCor.includes(String(r.corretor  || "")))        return false;
    if (filterOrigem.length && !filterOrigem.includes(String(r.origem_nome || "")))   return false;
    if (dateStart || dateEnd) {
      // Vendas confirmadas: filtra por data_venda; pendentes e demais: filtra por data_cad
      let dateField: string | null = null;
      if (isVendaRecord(r)) {
        dateField = r.data_venda
          ? String(r.data_venda).slice(0, 10)
          : (r.data_cad ? String(r.data_cad).slice(0, 10) : null);
      } else {
        dateField = r.data_cad ? String(r.data_cad).slice(0, 10) : null;
      }
      if (!dateField) return false;
      if (dateStart && dateField < dateStart) return false;
      if (dateEnd   && dateField > dateEnd)   return false;
    }
    return true;
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.records.filter(r => {
      if (!applyBaseFilters(r)) return false;
      if (filterSit.length && !filterSit.includes(String(r.situacao || ""))) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filterEmp, filterSit, filterTime, filterCor, filterOrigem, dateStart, dateEnd]);

  // Leads count from CRM, filtered by empreendimento × origem (ignores situação/time/corretor)
  const totalLeadsFiltrado = useMemo(() => {
    // Origem + Empreendimento: 2-way intersection
    if (filterOrigem.length > 0 && crmPorOrigemEmp) {
      const allowedEmps = filterEmp.length > 0 ? new Set(filterEmp) : null;
      let total = 0;
      for (const origem of filterOrigem)
        for (const [emp, cnt] of Object.entries(crmPorOrigemEmp[origem] ?? {})) {
          if (allowedEmps && !allowedEmps.has(emp)) continue;
          total += cnt;
        }
      return total;
    }
    // Só Empreendimento
    if (filterEmp.length > 0) {
      return crmLeadsByEmp.filter(e => filterEmp.includes(e.empreendimento)).reduce((s, e) => s + (e.total_leads ?? 0), 0);
    }
    return crmTotalLeads;
  }, [filterEmp, filterOrigem, crmTotalLeads, crmLeadsByEmp, crmPorOrigemEmp]);

  const hasFilter = !!(filterEmp.length || filterSit.length || filterTime || filterCor.length || filterOrigem.length);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const vendidas   = filtered.filter(r => isVendaRecord(r));
    const canceladas = filtered.filter(r => situacaoType(String(r.situacao || "")) === "cancelada");
    const vgv        = vendidas.reduce((s, r) => s + toNum(r.valor_contrato), 0);
    return {
      total_vendas:    vendidas.length,
      vgv_total:       vgv,
      ticket_medio:    vendidas.length > 0 ? vgv / vendidas.length : 0,
      cancelamentos:   canceladas.length,
      taxa_conversao:  totalLeadsFiltrado > 0 ? Math.round((vendidas.length / totalLeadsFiltrado) * 1000) / 10 : 0,
    };
  }, [filtered, totalLeadsFiltrado]);

  // ── Vendas por mês ──────────────────────────────────────────────────────────
  // Confirmed: grouped AND filtered by data_venda within the selected period
  // Pending:   vendas without data_venda, grouped by data_cad within the selected period
  // NOTE: we intentionally do NOT apply the data_cad date filter here so that records
  // created in month A but sold in month B are consistently counted in month B's bar
  // regardless of the selected period's start date.
  const porMes = useMemo(() => {
    const confirmed: Record<string, { count: number; vgv: number }> = {};
    const pending:   Record<string, { count: number; vgv: number }> = {};
    if (!data) return [];
    for (const r of data.records) {
      if (!isVendaRecord(r)) continue;
      // Apply only emp/time/cor filters — NOT the date filter
      if (filterEmp.length    && !filterEmp.includes(String(r.empreendimento || "")))  continue;
      if (filterTime          && String(r.nome_time || "") !== filterTime)              continue;
      if (filterCor.length    && !filterCor.includes(String(r.corretor  || "")))        continue;
      if (filterSit.length    && !filterSit.includes(String(r.situacao || "")))         continue;
      if (filterOrigem.length && !filterOrigem.includes(String(r.origem_nome || "")))   continue;

      const dv = r.data_venda ? String(r.data_venda).slice(0, 10) : null;
      const dc = r.data_cad   ? String(r.data_cad).slice(0, 10)   : null;

      if (dv) {
        // Filter confirmed sales by data_venda within selected period
        if (dateStart && dv < dateStart) continue;
        if (dateEnd   && dv > dateEnd)   continue;
        const mes = dv.slice(0, 7);
        if (!confirmed[mes]) confirmed[mes] = { count: 0, vgv: 0 };
        confirmed[mes].count++;
        confirmed[mes].vgv += toNum(r.valor_contrato);
      } else if (dc) {
        // Pending: filter by data_cad within selected period
        if (dateStart && dc < dateStart) continue;
        if (dateEnd   && dc > dateEnd)   continue;
        const mes = dc.slice(0, 7);
        if (!pending[mes]) pending[mes] = { count: 0, vgv: 0 };
        pending[mes].count++;
        pending[mes].vgv += toNum(r.valor_contrato);
      }
    }
    const allMeses = new Set([...Object.keys(confirmed), ...Object.keys(pending)]);
    return [...allMeses].sort().map(mes => ({
      mes,
      count:        confirmed[mes]?.count ?? 0,
      vgv:          confirmed[mes]?.vgv   ?? 0,
      countPending: pending[mes]?.count   ?? 0,
      vgvPending:   pending[mes]?.vgv     ?? 0,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filterEmp, filterSit, filterTime, filterCor, filterOrigem, dateStart, dateEnd]);

  // ── Vendas por empreendimento ────────────────────────────────────────────────
  const porEmp = useMemo(() => {
    const map: Record<string, { count: number; vgv: number; sit_comercial: string }> = {};
    for (const r of filtered) {
      if (!isVendaRecord(r)) continue;
      const emp = String(r.empreendimento || "Não definido");
      if (!map[emp]) map[emp] = { count: 0, vgv: 0, sit_comercial: String(r["situacao_comercial"] || "") };
      map[emp].count++;
      map[emp].vgv += toNum(r.valor_contrato);
    }
    return Object.entries(map)
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.vgv - a.vgv)
      .slice(0, 12);
  }, [filtered]);

  // ── VGV por empreendimento — analítico por situação ──────────────────────────
  const porEmpAnalitico = useMemo(() => {
    const map: Record<string, Record<string, { count: number; vgv: number }>> = {};
    for (const r of filtered) {
      if (!isVendaRecord(r)) continue;
      const emp = String(r.empreendimento || "Não definido");
      const sit = String(r.situacao || "Não definido");
      if (!map[emp]) map[emp] = {};
      if (!map[emp][sit]) map[emp][sit] = { count: 0, vgv: 0 };
      map[emp][sit].count++;
      map[emp][sit].vgv += toNum(r.valor_contrato);
    }
    return Object.entries(map)
      .map(([emp, sitsMap]) => ({
        emp,
        total: Object.values(sitsMap).reduce((s, v) => s + v.vgv, 0),
        totalCount: Object.values(sitsMap).reduce((s, v) => s + v.count, 0),
        sits: Object.entries(sitsMap).map(([sit, v]) => ({ sit, ...v })).sort((a, b) => b.vgv - a.vgv),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [filtered]);

  // ── Ranking corretores ───────────────────────────────────────────────────────
  const porCorretor = useMemo(() => {
    const map: Record<string, { count: number; vgv: number; imobiliaria: string }> = {};
    for (const r of filtered) {
      if (!isVendaRecord(r)) continue;
      const cor = String(r.corretor || "Não informado");
      if (!map[cor]) map[cor] = { count: 0, vgv: 0, imobiliaria: String(r.imobiliaria || "—") };
      map[cor].count++;
      map[cor].vgv += toNum(r.valor_contrato);
    }
    return Object.entries(map)
      .map(([corretor, v]) => ({ corretor, ...v }))
      .sort((a, b) => b.vgv - a.vgv)
      .slice(0, 15);
  }, [filtered]);

  const sortedCorretores = useMemo(() => {
    return [...porCorretor].sort((a, b) => {
      const diff = corSortKey === "vgv" ? a.vgv - b.vgv : a.count - b.count;
      return corSortDir === "desc" ? -diff : diff;
    });
  }, [porCorretor, corSortKey, corSortDir]);

  // ── Pipeline de situações (kanban) ───────────────────────────────────────────
  const PIPELINE_ORDER = [
    "Nova Proposta",
    "Pre Analise",
    "Analise Comercial",
    "Gerar Contrato",
    "Assinado/Análise Laudo",
    "Recebido ADM E.V.",
    "Pendência Documentos",
    "Entregue Finan Benx",
    "Enviar para o Bexs",
    "Aguardando faturamento",
    "Vendida",
  ];

  const porSituacao = useMemo(() => {
    const map: Record<string, ReservaRecord[]> = {};
    for (const r of filtered) {
      const sit = String(r.situacao || "Não definido");
      if (!map[sit]) map[sit] = [];
      map[sit].push(r);
    }
    return Object.entries(map)
      .map(([sit, records]) => ({
        sit,
        records,
        type: situacaoType(sit),
        vgv: records.reduce((s, r) => s + toNum(r.valor_contrato), 0),
      }))
      .sort((a, b) => {
        const ai = PIPELINE_ORDER.findIndex(s => s.toLowerCase() === a.sit.toLowerCase());
        const bi = PIPELINE_ORDER.findIndex(s => s.toLowerCase() === b.sit.toLowerCase());
        if (ai === -1 && bi === -1) return b.records.length - a.records.length;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
  }, [filtered]);

  // ── Table ────────────────────────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    const q = search.toLowerCase();
    let rows = filtered.filter(r =>
      !q ||
      String(r.referencia    || "").toLowerCase().includes(q) ||
      String(r.cliente       || "").toLowerCase().includes(q) ||
      String(r.empreendimento|| "").toLowerCase().includes(q) ||
      String(r.corretor      || "").toLowerCase().includes(q)
    );
    rows = [...rows].sort((a, b) => {
      const av = sortKey === "unidade_full"
        ? `${a.bloco || ""}${a.unidade || ""}`
        : String(a[sortKey] ?? "");
      const bv = sortKey === "unidade_full"
        ? `${b.bloco || ""}${b.unidade || ""}`
        : String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return rows;
  }, [filtered, search, sortKey, sortDir]);

  const totalPages = Math.ceil(tableRows.length / PAGE_SIZE);
  const pageRows   = tableRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
    setPage(0);
  }
  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />;
  }

  const thClass = "px-3 py-2.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-700 transition-colors whitespace-nowrap";

  const maxEmpVgv = porEmp[0]?.vgv ?? 1;
  const maxMesCount = Math.max(...porMes.map(m => m.count + m.countPending), 1);
  const maxCorVgv = Math.max(...porCorretor.map(c => c.vgv), 1);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl ring-1 ring-slate-200 p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-6 animate-pulse h-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-6 animate-pulse h-64" />
          <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-6 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Filter Bar ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </div>

<MultiSelectDropdown label="Empreendimento" options={data.filter_options.empreendimentos}
          selected={filterEmp} onChange={v => { setFilterEmp(v); setPage(0); }} />
        <MultiSelectDropdown label="Situação" options={data.filter_options.situacoes}
          selected={filterSit} onChange={v => { setFilterSit(v); setPage(0); }} />

        <select value={filterTime} onChange={e => { setFilterTime(e.target.value); setPage(0); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none max-w-[160px]">
          <option value="">Todos os times</option>
          {data.filter_options.times.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <MultiSelectDropdown label="Corretor" options={data.filter_options.corretores}
          selected={filterCor} onChange={v => { setFilterCor(v); setPage(0); }} />

        <MultiSelectDropdown label="Origem" options={data.filter_options.origens ?? []}
          selected={filterOrigem} onChange={v => { setFilterOrigem(v); setPage(0); }} />

        {hasFilter && (
          <button
            onClick={() => { setFilterEmp([]); setFilterSit([]); setFilterTime(""); setFilterCor([]); setFilterOrigem([]); setPage(0); }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <X className="w-3 h-3" /> Limpar
          </button>
        )}

      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard title="Total de Vendas"   value={formatNumber(kpis.total_vendas)}    subtitle="contratos vendidos"    tooltip="Total de contratos com situação de venda confirmada no período selecionado."                                                           icon={CheckCircle2} color="green"  loading={false} />
        <KPICard title="VGV Total"         value={formatBRL(kpis.vgv_total)}         subtitle="valor geral de vendas" tooltip="Valor Geral de Vendas: soma dos valores de contrato de todas as vendas confirmadas no período."                                         icon={DollarSign}   color="blue"   loading={false} />
        <KPICard title="Ticket Médio"      value={formatBRL(kpis.ticket_medio)}      subtitle="por venda"             tooltip="Valor médio por contrato vendido: VGV Total dividido pelo total de vendas confirmadas no período."                                     icon={BarChart3}    color="purple" loading={false} />
        <KPICard title="Total de Leads"    value={formatNumber(totalLeadsFiltrado)}   subtitle="leads no período"      tooltip="Total de leads recebidos no CRM no período, filtrado por empreendimento quando selecionado."                                            icon={Users}        color="blue"   loading={false} />
        <KPICard title="Taxa de Conversão" value={`${kpis.taxa_conversao}%`}         subtitle="vendas / total leads"  tooltip="Percentual de leads que resultaram em venda: total de vendas dividido pelo total de leads no período." tooltipAlign="right" icon={Percent}      color="orange" loading={false} />
      </div>

      {/* ── VGV por Empreendimento — full width ─────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">VGV por Empreendimento</h3>
              <p className="text-xs text-gray-500 mt-0.5">Ordenado por VGV decrescente</p>
            </div>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["resumo", "analitico"] as const).map(t => (
              <button key={t} onClick={() => setVgvTab(t)}
                className={cn("text-xs px-3 py-1.5 transition-colors",
                  vgvTab === t ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                )}>
                {t === "resumo" ? "Resumo" : "Analítico"}
              </button>
            ))}
          </div>
        </div>

        {vgvTab === "resumo" ? (
          <div className="p-5 space-y-2.5">
            {porEmp.length === 0
              ? <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
              : porEmp.map((emp, i) => {
                const pct = (emp.vgv / maxEmpVgv) * 100;
                return (
                  <div key={emp.nome} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700 truncate max-w-[400px]">{emp.nome}</span>
                        <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">{emp.count} und · {formatBRL(emp.vgv)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase">#</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase">Empreendimento</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase">Situação</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-300 uppercase">Und</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-300 uppercase">VGV</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase min-w-[160px]">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {porEmpAnalitico.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Sem dados</td></tr>
                  : porEmpAnalitico.map((emp, i) => (
                    <Fragment key={`emp-${i}`}>
                      {/* Empreendimento header row */}
                      <tr className="bg-amber-50/60">
                        <td className="px-4 py-2 text-xs font-black text-amber-700">{i + 1}</td>
                        <td className="px-4 py-2 text-xs font-bold text-gray-800" colSpan={2}>{emp.emp}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-amber-700">{emp.totalCount}</td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-amber-700">{formatBRL(emp.total)}</td>
                        <td className="px-4 py-2" />
                      </tr>
                      {/* Situação sub-rows */}
                      {emp.sits.map(s => {
                        const pct = emp.total > 0 ? (s.vgv / emp.total) * 100 : 0;
                        return (
                          <tr key={`${i}-${s.sit}`} className="hover:bg-amber-50/30 transition-colors">
                            <td className="px-4 py-1.5 text-xs text-gray-400 pl-6">↳</td>
                            <td className="px-4 py-1.5 text-xs text-gray-500 pl-6" />
                            <td className="px-4 py-1.5">
                              <SituacaoBadge sit={s.sit} />
                            </td>
                            <td className="px-4 py-1.5 text-right text-xs font-semibold text-gray-600">{s.count}</td>
                            <td className="px-4 py-1.5 text-right text-xs font-semibold text-gray-700">{formatBRL(s.vgv)}</td>
                            <td className="px-4 py-1.5 min-w-[160px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400 w-8 text-right">{pct.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Vendas por Mês — full width ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Vendas por Mês</h3>
              <p className="text-xs text-gray-500 mt-0.5">Unidades vendidas e VGV acumulado</p>
            </div>
          </div>
          {porMes.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Sem dados de vendas no período</div>
          ) : (
            <div className="p-5">
              {/* Chart area — outer div is NOT overflow-hidden so tooltip isn't clipped */}
              <div
                className="relative"
                ref={chartRef}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipX(e.clientX - rect.left);
                }}
              >

                {/* Floating tooltip — follows mouse X, rendered outside scroll container */}
                <div
                  className={cn(
                    "absolute z-20 pointer-events-none transition-opacity duration-150",
                    hoveredMes !== null ? "opacity-100" : "opacity-0"
                  )}
                  style={{
                    bottom: 52,
                    left: `clamp(110px, ${tooltipX}px, calc(100% - 110px))`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {hoveredMes !== null && porMes[hoveredMes] && (
                    <div className="bg-slate-900 text-white rounded-xl shadow-xl px-5 py-3 whitespace-nowrap text-center">
                      <div className="text-[13px] font-bold text-white">{formatMes(porMes[hoveredMes].mes)}</div>
                      <div className="text-[12px] text-blue-300 font-semibold mt-1">
                        {porMes[hoveredMes].count} confirmada{porMes[hoveredMes].count !== 1 ? "s" : ""} · {formatBRL(porMes[hoveredMes].vgv)}
                      </div>
                      {porMes[hoveredMes].countPending > 0 && (
                        <div className="text-[12px] text-amber-300 mt-0.5">
                          {porMes[hoveredMes].countPending} em processamento · {formatBRL(porMes[hoveredMes].vgvPending)}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-1 border-t border-slate-700 pt-1">
                        Total: {porMes[hoveredMes].count + porMes[hoveredMes].countPending} · {formatBRL(porMes[hoveredMes].vgv + porMes[hoveredMes].vgvPending)}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900" />
                    </div>
                  )}
                </div>

                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ paddingBottom: 40 }}>
                  {[4, 3, 2, 1, 0].map(i => (
                    <div key={i} className="w-full border-t border-dashed border-slate-100 flex items-center">
                      <span className="text-[10px] text-slate-300 pr-2 w-6 text-right leading-none -translate-y-2">
                        {i === 0 ? "" : Math.round((maxMesCount / 4) * i)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bars — scrollable but tooltip lives outside */}
                <div className="flex items-end gap-3 pl-7 overflow-x-auto pb-8" style={{ minHeight: 220 }}>
                  {porMes.map((m, idx) => {
                    const BAR_H = 160;
                    const h  = Math.max(m.count > 0 ? 8 : 0, (m.count / maxMesCount) * BAR_H);
                    const hp = Math.max(m.countPending > 0 ? 8 : 0, (m.countPending / maxMesCount) * BAR_H);
                    const isHovered = hoveredMes === idx;
                    return (
                      <div
                        key={m.mes}
                        className="flex flex-col items-center gap-1.5 flex-1 min-w-[52px] max-w-[72px] cursor-default"
                        onMouseEnter={() => setHoveredMes(idx)}
                        onMouseLeave={() => setHoveredMes(null)}
                      >
                        {/* Count label */}
                        <span className={cn("text-[11px] font-bold transition-colors", isHovered ? "text-blue-700" : "text-blue-500")}>
                          {m.count + m.countPending}
                        </span>

                        {/* Two bars side by side */}
                        <div className="flex items-end gap-0.5 w-full">
                          {/* Confirmed bar (blue) */}
                          {h > 0 && (
                            <div
                              className={cn(
                                "flex-1 rounded-t-md shadow-sm transition-all duration-200",
                                isHovered ? "bg-gradient-to-t from-blue-700 to-blue-500" : "bg-gradient-to-t from-blue-600 to-blue-400"
                              )}
                              style={{ height: h }}
                            />
                          )}
                          {/* Pending bar (amber) */}
                          {hp > 0 && (
                            <div
                              className={cn(
                                "flex-1 rounded-t-md shadow-sm transition-all duration-200",
                                isHovered ? "bg-gradient-to-t from-amber-600 to-amber-400" : "bg-gradient-to-t from-amber-500 to-amber-300"
                              )}
                              style={{ height: hp }}
                            />
                          )}
                        </div>

                        {/* Month label */}
                        <span className={cn("text-[10px] font-medium mt-1 whitespace-nowrap transition-colors", isHovered ? "text-slate-700 font-semibold" : "text-slate-500")}>
                          {formatMes(m.mes)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span className="text-[11px] text-gray-500">Confirmadas ({kpis.total_vendas})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-amber-400" />
                    <span className="text-[11px] text-gray-500">Em processamento ({porMes.reduce((s, m) => s + m.countPending, 0)})</span>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400">
                  VGV total: <strong className="text-gray-700">{formatBRL(kpis.vgv_total)}</strong>
                </span>
              </div>
            </div>
          )}
        </div>


      {/* ── Pipeline de Situações — Kanban ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Pipeline de Situações</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {porSituacao.length} etapas · {formatNumber(filtered.length)} contratos no total
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="flex gap-3 p-4" style={{ minWidth: "max-content" }}>
            {porSituacao.map(({ sit, records, type, vgv }, idx) => {
              const pct = filtered.length > 0 ? ((records.length / filtered.length) * 100).toFixed(1) : "0";

              // Type-fixed colors for key statuses, varied palette for the rest
              const TYPE_COLORS: Record<string, string> = {
                vendida:   "bg-emerald-600",
                cancelada: "bg-red-600",
                reservada: "bg-amber-500",
                aprovada:  "bg-blue-600",
              };
              const PALETTE = [
                "bg-violet-600", "bg-cyan-600",   "bg-orange-500", "bg-teal-600",
                "bg-indigo-500", "bg-pink-600",   "bg-rose-500",   "bg-sky-600",
                "bg-fuchsia-600","bg-lime-600",   "bg-purple-600", "bg-blue-500",
              ];
              const headerBg = TYPE_COLORS[type] ?? PALETTE[idx % PALETTE.length];

              return (
                <div
                  key={sit}
                  className="flex flex-col rounded-xl overflow-hidden ring-1 ring-slate-200 shadow-sm flex-shrink-0"
                  style={{ width: 196 }}
                >
                  {/* Column header */}
                  <div className={cn("px-3 py-2.5", headerBg)}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-white truncate leading-tight">{sit}</span>
                      <span className="text-[10px] font-black bg-white/25 text-white rounded-full px-2 py-0.5 flex-shrink-0 leading-none">
                        {records.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-white/70">{pct}% do total</span>
                      {vgv > 0 && (
                        <span className="text-[10px] text-white/80 font-semibold">{formatBRL(vgv)}</span>
                      )}
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="bg-slate-50 overflow-y-auto space-y-1.5 p-2" style={{ maxHeight: 340 }}>
                    {records.slice(0, 25).map((r, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg px-2.5 py-2 ring-1 ring-slate-100 shadow-sm hover:ring-slate-200 transition-all"
                      >
                        <div className="text-[11px] font-semibold text-gray-800 truncate leading-tight">
                          {String(r.cliente || "—")}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                          {String(r.empreendimento || "—")}
                        </div>
                        <div className="flex items-center justify-between mt-1.5 gap-1">
                          {r.corretor && (
                            <span className="text-[9px] text-gray-400 truncate">{String(r.corretor)}</span>
                          )}
                          {toNum(r.valor_contrato) > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600 flex-shrink-0">
                              {formatBRL(toNum(r.valor_contrato))}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {records.length > 25 && (
                      <div className="text-center text-[10px] text-slate-400 py-1.5 font-medium">
                        + {records.length - 25} registros
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Ranking de Corretores ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Ranking de Corretores</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ordenado por VGV total de vendas</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase">#</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase">Corretor</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase">Imobiliária</th>
                <th
                  className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-300 uppercase cursor-pointer select-none hover:bg-slate-700 transition-colors whitespace-nowrap"
                  onClick={() => { if (corSortKey === "count") setCorSortDir(d => d === "asc" ? "desc" : "asc"); else { setCorSortKey("count"); setCorSortDir("desc"); } }}
                >
                  <div className="flex items-center justify-end gap-1">
                    Vendas {corSortKey === "count" ? (corSortDir === "desc" ? <ChevronDown className="w-3 h-3 text-blue-400" /> : <ChevronUp className="w-3 h-3 text-blue-400" />) : <ChevronUp className="w-3 h-3 opacity-20" />}
                  </div>
                </th>
                <th
                  className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-300 uppercase cursor-pointer select-none hover:bg-slate-700 transition-colors whitespace-nowrap min-w-[140px]"
                  onClick={() => { if (corSortKey === "vgv") setCorSortDir(d => d === "asc" ? "desc" : "asc"); else { setCorSortKey("vgv"); setCorSortDir("desc"); } }}
                >
                  <div className="flex items-center gap-1">
                    VGV {corSortKey === "vgv" ? (corSortDir === "desc" ? <ChevronDown className="w-3 h-3 text-blue-400" /> : <ChevronUp className="w-3 h-3 text-blue-400" />) : <ChevronUp className="w-3 h-3 opacity-20" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedCorretores.length === 0
                ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Sem dados</td></tr>
                : sortedCorretores.map((c, i) => {
                  const pct = (c.vgv / maxCorVgv) * 100;
                  return (
                    <tr key={c.corretor} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-gray-800">{c.corretor}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{c.imobiliaria}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-emerald-600">{c.count}</td>
                      <td className="px-4 py-2.5 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-700 whitespace-nowrap">{formatBRL(c.vgv)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tabela Detalhada ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">Contratos Detalhados</h3>
              <p className="text-xs text-gray-500 mt-0.5">{formatNumber(tableRows.length)} registros · página {page + 1} de {Math.max(totalPages, 1)}</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Buscar por referência, cliente, empreendimento..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400 w-80"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800">
                {([
                  { key: "idreserva",     label: "ID Reserva" },
                  { key: "idlead",        label: "ID Lead" },
                  { key: "lead_data_cad", label: "Cad. Lead" },
                  { key: "cliente",       label: "Cliente" },
                  { key: "empreendimento",label: "Empreendimento" },
                  { key: "unidade_full",  label: "Unidade" },
                  { key: "situacao",      label: "Situação" },
                  { key: "corretor",      label: "Corretor" },
                  { key: "valor_contrato",label: "Valor Contrato" },
                  { key: "data_cad",        label: "Data Cadastro" },
                  { key: "data_venda",      label: "Data Venda" },
                  { key: "origem_nome",     label: "Origem" },
                  { key: "origem_ultimo_nome", label: "Última Origem" },
                ] as { key: SortKey; label: string }[]).map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)}
                    className={cn(thClass, col.key === "valor_contrato" || col.key === "data_venda" || col.key === "data_cad" ? "text-right" : "text-left")}>
                    <div className={cn("flex items-center gap-1", col.key === "valor_contrato" || col.key === "data_venda" || col.key === "data_cad" ? "justify-end" : "")}>
                      {col.label} <SortIcon col={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.length === 0
                ? <tr><td colSpan={13} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum registro encontrado</td></tr>
                : pageRows.map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-3 py-2 text-xs font-mono text-gray-400 whitespace-nowrap">{String(r.idreserva || "—")}</td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-400 whitespace-nowrap">{r.idlead ? String(r.idlead) : <span className="text-gray-300 italic">S/lead</span>}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{r.lead_data_cad ? formatDate(r.lead_data_cad) : <span className="text-gray-300 italic">—</span>}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-800 max-w-[180px] truncate">{String(r.cliente || "—")}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[160px] truncate">{String(r.empreendimento || "—")}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{[r.bloco, r.unidade].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-3 py-2"><SituacaoBadge sit={String(r.situacao || "—")} /></td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[140px] truncate">{String(r.corretor || "—")}</td>
                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-800 whitespace-nowrap">
                      {toNum(r.valor_contrato) > 0 ? formatBRL(toNum(r.valor_contrato)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500 whitespace-nowrap">{formatDate(r.data_cad as string)}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500 whitespace-nowrap">{formatDate(r.data_venda as string)}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{String(r.origem_nome || "—")}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{String(r.origem_ultimo_nome || "—")}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Anterior
            </button>
            <div className="flex items-center gap-1">
              {(() => {
                const pages: (number | "...")[] = [];
                if (totalPages <= 7) {
                  for (let i = 0; i < totalPages; i++) pages.push(i);
                } else {
                  const start = Math.max(1, Math.min(page - 1, totalPages - 4));
                  const end   = Math.min(totalPages - 2, Math.max(page + 1, 3));
                  pages.push(0);
                  if (start > 1) pages.push("...");
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 2) pages.push("...");
                  pages.push(totalPages - 1);
                }
                return pages.map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className={cn("w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                        page === p ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100")}>
                      {(p as number) + 1}
                    </button>
                  )
                );
              })()}
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
