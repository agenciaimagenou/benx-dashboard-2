"use client";

import { useState } from "react";
import { Users, Award, TrendingUp, Target, CheckCircle2, Filter, X, Trophy, ChevronUp, ChevronDown } from "lucide-react";
import KPICard from "@/components/KPICard";
import FunnelChart from "@/components/FunnelChart";
import OrigemChart from "@/components/OrigemChart";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import { MetaSummaryByAccount } from "@/types";
import { formatCurrency, formatNumber, cn, normalizeStr, findBestMatch } from "@/lib/utils";
import GanhosModal from "@/components/GanhosModal";

interface LeadGanho {
  id: number;
  nome: string;
  corretor: string;
  data_cadastro: string | null;
  origem: string;
  situacao: string;
}

interface CRMEmp {
  empreendimento: string;
  total_leads: number;
  atendimento: number;
  reserva: number;
  ganhos: number;
  perdas: number;
  cancelados: number;
  conversao_rate: number;
  primary_origem: string;
  por_situacao: Record<string, number>;
  ganho_leads: LeadGanho[];
  novo_count: number;
  retorno_count: number;
}

interface CRMResponse {
  total_leads: number;
  por_situacao: Record<string, number>;
  por_origem: Record<string, number>;
  por_origem_emp: Record<string, Record<string, number>>;
  por_origem_imobiliaria: Record<string, Record<string, number>>;
  por_ultima_origem_emp: Record<string, Record<string, number>>;
  por_ultima_origem_imobiliaria: Record<string, Record<string, number>>;
  por_ultima_origem_emp_sit: Record<string, Record<string, Record<string, number>>>;
  por_ultima_origem_emp_novo: Record<string, Record<string, number>>;
  por_ultima_origem_emp_retorno: Record<string, Record<string, number>>;
  por_imobiliaria_emp: Record<string, Record<string, number>>;
  por_imobiliaria_emp_sit: Record<string, Record<string, Record<string, number>>>;
  por_origem_emp_sit: Record<string, Record<string, Record<string, number>>>;
  por_imobiliaria_emp_novo: Record<string, Record<string, number>>;
  por_imobiliaria_emp_retorno: Record<string, Record<string, number>>;
  por_origem_emp_novo: Record<string, Record<string, number>>;
  por_origem_emp_retorno: Record<string, Record<string, number>>;
  por_empreendimento: CRMEmp[];
  origens_list: string[];
  ultimas_origens_list: string[];
  total_novo: number;
  total_retorno: number;
  visitas_agendadas_por_origem_emp:         Record<string, Record<string, number>>;
  visitas_realizadas_por_origem_emp:        Record<string, Record<string, number>>;
  visitas_agendadas_por_ultima_origem_emp:  Record<string, Record<string, number>>;
  visitas_realizadas_por_ultima_origem_emp: Record<string, Record<string, number>>;
  visitas_agendadas_por_imob_emp:           Record<string, Record<string, number>>;
  visitas_realizadas_por_imob_emp:          Record<string, Record<string, number>>;
}

interface Props {
  crmData: CRMResponse | null;
  metaData: MetaSummaryByAccount[];
  loading: boolean;
  accountCrmKeys?: string[] | null;
  dateStart?: string;
  dateEnd?: string;
}

function isVendaSit(sit: string) {
  const s = sit.toLowerCase();
  return s.includes("venda") || s.includes("ganho");
}

// Fuzzy match: does empName match any of the accountCrmKeys?
function matchesAccount(empName: string, keys: string[]): boolean {
  const normEmp = normalizeStr(empName);
  for (const key of keys) {
    if (normalizeStr(key) === normEmp) return true;
    if (findBestMatch(key, [empName]).score >= 0.45) return true;
  }
  return false;
}

type FunnelSortKey = "empreendimento" | "total" | "conversao";

export default function CRMSection({ crmData, metaData, loading, accountCrmKeys, dateStart = "", dateEnd = "" }: Props) {
  const [filterOrigens, setFilterOrigens] = useState<string[]>([]);
  const [filterImobiliaria, setFilterImobiliaria] = useState<string[]>([]);
  const [funnelSort, setFunnelSort] = useState<FunnelSortKey>("total");
  const [funnelDir, setFunnelDir] = useState<"asc" | "desc">("desc");

  function toggleFunnelSort(key: FunnelSortKey) {
    if (funnelSort === key) setFunnelDir(d => d === "asc" ? "desc" : "asc");
    else { setFunnelSort(key); setFunnelDir("desc"); }
  }

  function FunnelSortIcon({ col }: { col: FunnelSortKey }) {
    if (funnelSort !== col) return <ChevronUp className="w-3 h-3 opacity-20 flex-shrink-0" />;
    return funnelDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-blue-500 flex-shrink-0" />
      : <ChevronDown className="w-3 h-3 text-blue-500 flex-shrink-0" />;
  }
  const imobiliariasOptions = Object.keys(crmData?.por_imobiliaria_emp ?? {}).sort();
  const [vendaModal, setVendaModal] = useState<{ empreendimento: string; leads: LeadGanho[] } | null>(null);
  const [visitaModal, setVisitaModal] = useState<{ empreendimento: string; tipo: "visita_agendada" | "visita_realizada" } | null>(null);

  const totalSpend    = metaData.reduce((s, m) => s + m.total_spend, 0);
  const allEmps       = crmData?.por_empreendimento ?? [];
  const origemOptions = crmData?.origens_list ?? [];

  const empreendimentos = allEmps.filter(e => {
    if (e.empreendimento.includes(",")) return false;
    if (accountCrmKeys && !matchesAccount(e.empreendimento, accountCrmKeys)) return false;
    if (filterOrigens.length > 0) {
      const hasLead = filterOrigens.some(o => (crmData?.por_origem_emp[o]?.[e.empreendimento] ?? 0) > 0);
      if (!hasLead) return false;
    }
    if (filterImobiliaria.length) {
      const hasLead = filterImobiliaria.some(imob => (crmData?.por_imobiliaria_emp[imob]?.[e.empreendimento] ?? 0) > 0);
      if (!hasLead) return false;
    }
    return true;
  });

  const hasFilter = filterOrigens.length > 0 || !!filterImobiliaria.length;

  // Effective total/situacao per empreendimento when imobiliária filter is active
  function empImobTotal(empName: string): number {
    if (!filterImobiliaria.length) return 0;
    return filterImobiliaria.reduce((sum, imob) => sum + (crmData?.por_imobiliaria_emp[imob]?.[empName] ?? 0), 0);
  }
  function empImobSit(empName: string): Record<string, number> {
    if (!filterImobiliaria.length) return {};
    const merged: Record<string, number> = {};
    for (const imob of filterImobiliaria) {
      const sitMap = crmData?.por_imobiliaria_emp_sit[imob]?.[empName] ?? {};
      for (const [sit, cnt] of Object.entries(sitMap)) {
        if (sit.toLowerCase().includes("visita")) continue; // use Visitas2 data below
        merged[sit] = (merged[sit] || 0) + cnt;
      }
      merged["Visita Agendada"]  = (merged["Visita Agendada"]  || 0) + (crmData?.visitas_agendadas_por_imob_emp?.[imob]?.[empName]  ?? 0);
      merged["Visita Realizada"] = (merged["Visita Realizada"] || 0) + (crmData?.visitas_realizadas_por_imob_emp?.[imob]?.[empName] ?? 0);
    }
    return merged;
  }
  function empImobNovo(empName: string): number {
    if (!filterImobiliaria.length) return 0;
    return filterImobiliaria.reduce((sum, imob) => sum + (crmData?.por_imobiliaria_emp_novo?.[imob]?.[empName] ?? 0), 0);
  }
  function empImobRetorno(empName: string): number {
    if (!filterImobiliaria.length) return 0;
    return filterImobiliaria.reduce((sum, imob) => sum + (crmData?.por_imobiliaria_emp_retorno?.[imob]?.[empName] ?? 0), 0);
  }
  function empOrigemSit(empName: string): Record<string, number> {
    if (!filterOrigens.length) return {};
    const merged: Record<string, number> = {};
    for (const o of filterOrigens) {
      const sitMap = crmData?.por_origem_emp_sit?.[o]?.[empName] ?? {};
      for (const [sit, cnt] of Object.entries(sitMap)) {
        if (sit.toLowerCase().includes("visita")) continue; // use Visitas2 data below
        merged[sit] = (merged[sit] || 0) + cnt;
      }
      merged["Visita Agendada"]  = (merged["Visita Agendada"]  || 0) + (crmData?.visitas_agendadas_por_origem_emp?.[o]?.[empName]  ?? 0);
      merged["Visita Realizada"] = (merged["Visita Realizada"] || 0) + (crmData?.visitas_realizadas_por_origem_emp?.[o]?.[empName] ?? 0);
    }
    return merged;
  }
  function empOrigemTotal(empName: string): number {
    if (!filterOrigens.length) return 0;
    return filterOrigens.reduce((sum, o) => sum + (crmData?.por_origem_emp?.[o]?.[empName] ?? 0), 0);
  }
  function empOrigemNovo(empName: string): number {
    if (!filterOrigens.length) return 0;
    return filterOrigens.reduce((sum, o) => sum + (crmData?.por_origem_emp_novo?.[o]?.[empName] ?? 0), 0);
  }
  function empOrigemRetorno(empName: string): number {
    if (!filterOrigens.length) return 0;
    return filterOrigens.reduce((sum, o) => sum + (crmData?.por_origem_emp_retorno?.[o]?.[empName] ?? 0), 0);
  }
  // Total CRM: handles all filter combinations using exact intersection data
  const totalCrmLeads = (() => {
    // Exact intersection: Primeira Origem × Imobiliária
    if (filterOrigens.length > 0 && filterImobiliaria.length > 0 && !accountCrmKeys) {
      let total = 0;
      for (const o of filterOrigens)
        for (const imob of filterImobiliaria)
          total += crmData?.por_origem_imobiliaria?.[o]?.[imob] ?? 0;
      return total;
    }
    // Imobiliária only (or with account filter fallback)
    if (filterImobiliaria.length) {
      const allowedEmps = new Set(empreendimentos.map(e => e.empreendimento));
      return filterImobiliaria.reduce((sum, imob) => {
        const empMap = crmData?.por_imobiliaria_emp[imob] ?? {};
        return sum + Object.entries(empMap).reduce((a, [emp, cnt]) => {
          if (!allowedEmps.has(emp)) return a;
          return a + cnt;
        }, 0);
      }, 0);
    }
    if (filterOrigens.length > 0) {
      return filterOrigens.reduce((sum, o) => {
        const empMap = crmData?.por_origem_emp[o] ?? {};
        return sum + Object.entries(empMap).reduce((a, [emp, cnt]) => {
          if (accountCrmKeys && !matchesAccount(emp, accountCrmKeys)) return a;
          return a + cnt;
        }, 0);
      }, 0);
    }
    return empreendimentos.reduce((s, e) => s + e.total_leads, 0);
  })();

  // When imobiliária or origem filter active, derive ganhos/reservas from filtered situation counts
  const totalGanhos = filterImobiliaria.length
    ? empreendimentos.reduce((s, e) => {
        const sit = empImobSit(e.empreendimento);
        return s + Object.entries(sit).filter(([k]) => isVendaSit(k)).reduce((a, [, v]) => a + v, 0);
      }, 0)
    : filterOrigens.length
    ? empreendimentos.reduce((s, e) => {
        const sit = empOrigemSit(e.empreendimento);
        return s + Object.entries(sit).filter(([k]) => isVendaSit(k)).reduce((a, [, v]) => a + v, 0);
      }, 0)
    : empreendimentos.reduce((s, e) => s + e.ganhos, 0);
  const totalReservas = filterImobiliaria.length
    ? empreendimentos.reduce((s, e) => {
        const sit = empImobSit(e.empreendimento);
        return s + (sit["Com Reserva"] ?? 0);
      }, 0)
    : filterOrigens.length
    ? empreendimentos.reduce((s, e) => {
        const sit = empOrigemSit(e.empreendimento);
        return s + (sit["Com Reserva"] ?? 0);
      }, 0)
    : empreendimentos.reduce((s, e) => s + e.reserva, 0);

  // Origem chart: filter by account when account filter is active
  const porOrigemFiltrado = (() => {
    const origemEmpMap = crmData?.por_origem_emp ?? {};
    if (filterOrigens.length > 0) {
      return Object.fromEntries(filterOrigens.map(o => {
        const empMap = origemEmpMap[o] ?? {};
        const count = Object.entries(empMap).reduce((a, [emp, cnt]) => {
          if (accountCrmKeys && !matchesAccount(emp, accountCrmKeys)) return a;
          return a + cnt;
        }, 0);
        return [o, count];
      }));
    }
    if (accountCrmKeys) {
      const result: Record<string, number> = {};
      for (const [origem, empMap] of Object.entries(origemEmpMap)) {
        const count = Object.entries(empMap).reduce((a, [emp, cnt]) => {
          return matchesAccount(emp, accountCrmKeys) ? a + cnt : a;
        }, 0);
        if (count > 0) result[origem] = count;
      }
      return result;
    }
    return crmData?.por_origem ?? {};
  })();

  function openVendaModal(emp: CRMEmp) {
    setVendaModal({ empreendimento: emp.empreendimento, leads: emp.ganho_leads ?? [] });
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>
        <MultiSelectDropdown
          label="Primeira Origem"
          options={origemOptions}
          selected={filterOrigens}
          onChange={setFilterOrigens}
        />
        <MultiSelectDropdown
          label="Todas as imobiliárias"
          options={imobiliariasOptions}
          selected={filterImobiliaria}
          onChange={setFilterImobiliaria}
        />
        {hasFilter && (
          <>
            <button
              onClick={() => { setFilterOrigens([]); setFilterImobiliaria([]); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Limpar filtros
            </button>
          </>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {empreendimentos.length} empreendimento{empreendimentos.length !== 1 ? "s" : ""} exibido{empreendimentos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard title="Leads CRM" value={formatNumber(totalCrmLeads)}
          subtitle={hasFilter ? "Filtrado" : "Cadastrados no período"} icon={Users} color="green" loading={loading} />
        <KPICard title="Reservas" value={formatNumber(totalReservas)}
          subtitle={totalCrmLeads > 0 ? `${((totalReservas / totalCrmLeads) * 100).toFixed(1)}% dos leads` : "—"}
          icon={Award} color="orange" loading={loading} />
        <KPICard title="Ganhos / Vendas" value={formatNumber(totalGanhos)}
          subtitle={totalCrmLeads > 0 ? `${((totalGanhos / totalCrmLeads) * 100).toFixed(1)}% conversão` : "—"}
          icon={TrendingUp} color="green" loading={loading} />
        <KPICard title="CPL Real" value={totalCrmLeads > 0 ? formatCurrency(totalSpend / totalCrmLeads) : "—"}
          subtitle="Meta spend / leads CRM" icon={Target} color="blue" loading={loading} />
      </div>

      {/* Funnel + Origem */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FunnelChart porSituacao={(() => {
          if (!accountCrmKeys && filterOrigens.length === 0 && !filterImobiliaria.length) return crmData?.por_situacao ?? {};
          const merged: Record<string, number> = {};
          empreendimentos.forEach(emp => {
            const sitMap = filterImobiliaria.length ? empImobSit(emp.empreendimento) : filterOrigens.length ? empOrigemSit(emp.empreendimento) : (emp.por_situacao ?? {});
            Object.entries(sitMap).forEach(([sit, cnt]) => {
              merged[sit] = (merged[sit] ?? 0) + cnt;
            });
          });
          return merged;
        })()} loading={loading} />
        <OrigemChart porOrigem={porOrigemFiltrado} loading={loading} />
      </div>

      {/* Empreendimento detail table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <div>
            <h3 className="font-semibold text-gray-800">Funil por Empreendimento</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Leads → Atendimento → Reserva → Ganho · clique em <span className="text-emerald-600 font-medium">Venda Realizada</span> para ver os leads
            </p>
          </div>
        </div>
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (() => {
          const sitTotals: Record<string, number> = {};
          empreendimentos.forEach(emp => {
            const sitMap = filterImobiliaria.length ? empImobSit(emp.empreendimento) : filterOrigens.length ? empOrigemSit(emp.empreendimento) : (emp.por_situacao ?? {});
            Object.entries(sitMap).forEach(([sit, cnt]) => {
              sitTotals[sit] = (sitTotals[sit] || 0) + cnt;
            });
          });
          const SIT_ORDER = [
            "Lead Recebido",
            "Tentativa de Contato",
            "Em Atendimento",
            "Visita Agendada",
            "Visita Realizada",
            "Proposta",
            "Com Reserva",
          ];
          const sitCols = [
            ...SIT_ORDER.filter(s => s in sitTotals),
            ...Object.keys(sitTotals).filter(s => !SIT_ORDER.includes(s)).sort((a, b) => (sitTotals[b] ?? 0) - (sitTotals[a] ?? 0)),
          ];
          const sortedEmps = [...empreendimentos].sort((a, b) => {
            const getVal = (e: typeof a) => {
              if (funnelSort === "empreendimento") return e.empreendimento;
              if (funnelSort === "conversao") {
                const t = filterImobiliaria.length ? empImobTotal(e.empreendimento) : filterOrigens.length ? empOrigemTotal(e.empreendimento) : e.total_leads;
                const g = filterImobiliaria.length
                  ? Object.entries(empImobSit(e.empreendimento)).filter(([k]) => isVendaSit(k)).reduce((acc, [, v]) => acc + v, 0)
                  : filterOrigens.length
                  ? Object.entries(empOrigemSit(e.empreendimento)).filter(([k]) => isVendaSit(k)).reduce((acc, [, v]) => acc + v, 0)
                  : e.ganhos;
                return t > 0 ? g / t : 0;
              }
              return filterImobiliaria.length ? empImobTotal(e.empreendimento) : filterOrigens.length ? empOrigemTotal(e.empreendimento) : e.total_leads;
            };
            const av = getVal(a), bv = getVal(b);
            if (typeof av === "string" && typeof bv === "string")
              return funnelDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
            return funnelDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
          });

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th
                      onClick={() => toggleFunnelSort("empreendimento")}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-1">Empreendimento <FunnelSortIcon col="empreendimento" /></div>
                    </th>
                    <th
                      onClick={() => toggleFunnelSort("total")}
                      className="px-4 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wide whitespace-nowrap bg-blue-50 border-r border-gray-100 cursor-pointer select-none hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">Total <FunnelSortIcon col="total" /></div>
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-sky-600 uppercase tracking-wide whitespace-nowrap bg-sky-50">
                      Lead Novo
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-violet-600 uppercase tracking-wide whitespace-nowrap bg-violet-50">
                      Lead Retorno
                    </th>
                    {sitCols.map(sit => (
                      <th
                        key={sit}
                        className={cn(
                          "px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap",
                          isVendaSit(sit)
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-gray-500 bg-gray-50"
                        )}
                      >
                        {sit}
                      </th>
                    ))}
                    <th
                      onClick={() => toggleFunnelSort("conversao")}
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50 cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">Conversão <FunnelSortIcon col="conversao" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmps.map((emp, i) => (
                    <tr
                      key={emp.empreendimento}
                      className={cn(
                        "border-b border-gray-100 hover:bg-blue-50/30 transition-colors",
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      )}
                    >
                      <td className={cn(
                        "px-4 py-3 font-medium text-gray-800 whitespace-nowrap sticky left-0 z-10 border-r border-gray-200",
                        i % 2 === 0 ? "bg-white" : "bg-gray-50"
                      )}>
                        {emp.empreendimento}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50/40 border-r border-gray-100 whitespace-nowrap">
                        {formatNumber(filterImobiliaria.length ? empImobTotal(emp.empreendimento) : filterOrigens.length ? empOrigemTotal(emp.empreendimento) : emp.total_leads)}
                      </td>
                      <td className="px-3 py-3 text-right bg-sky-50/40">
                        {(() => {
                          const cnt = filterImobiliaria.length ? empImobNovo(emp.empreendimento) : filterOrigens.length ? empOrigemNovo(emp.empreendimento) : (emp.novo_count ?? 0);
                          const effTotal = filterImobiliaria.length ? empImobTotal(emp.empreendimento) : filterOrigens.length ? empOrigemTotal(emp.empreendimento) : emp.total_leads;
                          const pct = effTotal > 0 ? ((cnt / effTotal) * 100).toFixed(1) : "0.0";
                          return cnt > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-medium text-sky-700">{cnt}</span>
                              <span className="text-gray-400 text-xs">{pct}%</span>
                            </div>
                          ) : <span className="text-gray-200">—</span>;
                        })()}
                      </td>
                      <td className="px-3 py-3 text-right bg-violet-50/40">
                        {(() => {
                          const cnt = filterImobiliaria.length ? empImobRetorno(emp.empreendimento) : filterOrigens.length ? empOrigemRetorno(emp.empreendimento) : (emp.retorno_count ?? 0);
                          const effTotal = filterImobiliaria.length ? empImobTotal(emp.empreendimento) : filterOrigens.length ? empOrigemTotal(emp.empreendimento) : emp.total_leads;
                          const pct = effTotal > 0 ? ((cnt / effTotal) * 100).toFixed(1) : "0.0";
                          return cnt > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="font-medium text-violet-700">{cnt}</span>
                              <span className="text-gray-400 text-xs">{pct}%</span>
                            </div>
                          ) : <span className="text-gray-200">—</span>;
                        })()}
                      </td>
                      {sitCols.map(sit => {
                        const effSit = filterImobiliaria.length ? empImobSit(emp.empreendimento) : filterOrigens.length ? empOrigemSit(emp.empreendimento) : (emp.por_situacao ?? {});
                        const effTotal = filterImobiliaria.length ? empImobTotal(emp.empreendimento) : filterOrigens.length ? empOrigemTotal(emp.empreendimento) : emp.total_leads;
                        const cnt = effSit[sit] ?? 0;
                        const pct = effTotal > 0 ? ((cnt / effTotal) * 100).toFixed(1) : "0.0";
                        const venda = isVendaSit(sit);
                        const isVisitaAgendada = sit === "Visita Agendada";
                        const isVisitaRealizada = sit === "Visita Realizada";
                        const isClickable = venda || isVisitaAgendada || isVisitaRealizada;
                        return (
                          <td
                            key={sit}
                            className={cn(
                              "px-3 py-3 text-right text-xs",
                              venda && "bg-emerald-50/60",
                              (isVisitaAgendada || isVisitaRealizada) && "bg-sky-50/60"
                            )}
                          >
                            {cnt > 0 ? (
                              isClickable ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <button
                                    onClick={() => {
                                      if (venda) openVendaModal(emp);
                                      else if (dateStart && dateEnd) setVisitaModal({
                                        empreendimento: emp.empreendimento,
                                        tipo: isVisitaAgendada ? "visita_agendada" : "visita_realizada",
                                      });
                                    }}
                                    className={cn(
                                      "inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer",
                                      venda
                                        ? "text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200"
                                        : "text-sky-700 bg-sky-100 border-sky-200 hover:bg-sky-200"
                                    )}
                                    title={`Ver leads — ${sit} — ${emp.empreendimento}`}
                                  >
                                    {venda ? <Trophy className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                    {cnt}
                                  </button>
                                  <span className="text-gray-400 text-xs">{pct}%</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-medium text-gray-700">{cnt}</span>
                                  <span className="text-gray-400 text-xs">{pct}%</span>
                                </div>
                              )
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        {(() => {
                          const effTotal = filterImobiliaria.length ? empImobTotal(emp.empreendimento) : filterOrigens.length ? empOrigemTotal(emp.empreendimento) : emp.total_leads;
                          const effGanhos = filterImobiliaria.length
                            ? Object.entries(empImobSit(emp.empreendimento)).filter(([k]) => isVendaSit(k)).reduce((a, [, v]) => a + v, 0)
                            : filterOrigens.length
                            ? Object.entries(empOrigemSit(emp.empreendimento)).filter(([k]) => isVendaSit(k)).reduce((a, [, v]) => a + v, 0)
                            : emp.ganhos;
                          const rate = effTotal > 0 ? (effGanhos / effTotal) * 100 : 0;
                          return (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(rate, 100)}%` }} />
                              </div>
                              <span className={cn("text-xs font-medium", rate > 0 ? "text-emerald-600" : "text-gray-400")}>
                                {rate.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                  {empreendimentos.length === 0 && (
                    <tr>
                      <td colSpan={sitCols.length + 5} className="px-4 py-8 text-center text-sm text-gray-400">
                        Nenhum empreendimento com esses filtros
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-100">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase sticky left-0 bg-gray-100 z-20 border-r border-gray-200">Total</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-blue-700 bg-blue-100/60 border-r border-gray-200">
                      {formatNumber(totalCrmLeads)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-sky-700 bg-sky-100/60">
                      {(() => {
                        const cnt = filterImobiliaria.length
                          ? empreendimentos.reduce((s, e) => s + empImobNovo(e.empreendimento), 0)
                          : filterOrigens.length
                          ? empreendimentos.reduce((s, e) => s + empOrigemNovo(e.empreendimento), 0)
                          : empreendimentos.reduce((s, e) => s + (e.novo_count ?? 0), 0);
                        const pct = totalCrmLeads > 0 ? ((cnt / totalCrmLeads) * 100).toFixed(1) : "0.0";
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{formatNumber(cnt)}</span>
                            <span className="text-gray-400 font-normal">{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-violet-700 bg-violet-100/60">
                      {(() => {
                        const cnt = filterImobiliaria.length
                          ? empreendimentos.reduce((s, e) => s + empImobRetorno(e.empreendimento), 0)
                          : filterOrigens.length
                          ? empreendimentos.reduce((s, e) => s + empOrigemRetorno(e.empreendimento), 0)
                          : empreendimentos.reduce((s, e) => s + (e.retorno_count ?? 0), 0);
                        const pct = totalCrmLeads > 0 ? ((cnt / totalCrmLeads) * 100).toFixed(1) : "0.0";
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{formatNumber(cnt)}</span>
                            <span className="text-gray-400 font-normal">{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                    {sitCols.map(sit => {
                      const cnt = sitTotals[sit] ?? 0;
                      const pct = totalCrmLeads > 0 ? ((cnt / totalCrmLeads) * 100).toFixed(1) : "0.0";
                      return (
                        <td key={sit} className={cn("px-3 py-3 text-right text-xs font-bold", isVendaSit(sit) ? "text-emerald-700 bg-emerald-100/60" : "text-gray-700")}>
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{formatNumber(cnt)}</span>
                            <span className="text-gray-400 font-normal">{pct}%</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-xs font-bold text-emerald-600">
                      {totalCrmLeads > 0 ? ((totalGanhos / totalCrmLeads) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Modal — Visita Agendada / Realizada */}
      {visitaModal && dateStart && dateEnd && (
        <GanhosModal
          empreendimento={visitaModal.empreendimento}
          dateStart={dateStart}
          dateEnd={dateEnd}
          tipo={visitaModal.tipo}
          filterOrigens={filterOrigens}
          filterImobiliaria={filterImobiliaria}
          onClose={() => setVisitaModal(null)}
        />
      )}

      {/* Modal — Vendas Realizadas */}
      {vendaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setVendaModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-50">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-gray-800">{vendaModal.empreendimento}</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {vendaModal.leads.length} venda{vendaModal.leads.length !== 1 ? "s" : ""} realizada{vendaModal.leads.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setVendaModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Corretor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Origem</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {vendaModal.leads.map((l, i) => (
                    <tr
                      key={l.id}
                      className={cn("border-b border-gray-50 hover:bg-emerald-50/40 transition-colors", i % 2 === 0 ? "bg-white" : "bg-gray-50/40")}
                    >
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{l.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{l.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{l.corretor}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{l.origem}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">{l.data_cadastro ?? "—"}</td>
                    </tr>
                  ))}
                  {vendaModal.leads.length === 0 && (
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
    </div>
  );
}
