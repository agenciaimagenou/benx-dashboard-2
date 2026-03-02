"use client";

import { useState } from "react";
import { Users, Award, TrendingUp, Target, CheckCircle2, Filter, X, Trophy } from "lucide-react";
import KPICard from "@/components/KPICard";
import FunnelChart from "@/components/FunnelChart";
import OrigemChart from "@/components/OrigemChart";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import { MetaSummaryByAccount } from "@/types";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

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
}

interface CRMResponse {
  total_leads: number;
  por_situacao: Record<string, number>;
  por_origem: Record<string, number>;
  por_origem_emp: Record<string, Record<string, number>>;
  por_empreendimento: CRMEmp[];
  origens_list: string[];
}

interface Props {
  crmData: CRMResponse | null;
  metaData: MetaSummaryByAccount[];
  loading: boolean;
}

function isVendaSit(sit: string) {
  const s = sit.toLowerCase();
  return s.includes("venda") || s.includes("ganho");
}

export default function CRMSection({ crmData, metaData, loading }: Props) {
  const [filterEmp, setFilterEmp]         = useState("Todos");
  const [filterOrigens, setFilterOrigens] = useState<string[]>([]);
  const [vendaModal, setVendaModal] = useState<{ empreendimento: string; leads: LeadGanho[] } | null>(null);

  const totalSpend = metaData.reduce((s, m) => s + m.total_spend, 0);
  const allEmps = crmData?.por_empreendimento ?? [];

  const empOptions    = ["Todos", ...Array.from(new Set(allEmps.map(e => e.empreendimento))).sort()];
  const origemOptions = crmData?.origens_list ?? [];

  const empreendimentos = allEmps.filter(e => {
    if (e.empreendimento.includes(",")) return false;
    if (filterEmp !== "Todos" && e.empreendimento !== filterEmp) return false;
    if (filterOrigens.length > 0) {
      const hasLead = filterOrigens.some(o => (crmData?.por_origem_emp[o]?.[e.empreendimento] ?? 0) > 0);
      if (!hasLead) return false;
    }
    return true;
  });

  const hasFilter = filterEmp !== "Todos" || filterOrigens.length > 0;

  const totalCrmLeads = filterOrigens.length > 0
    ? filterOrigens.reduce((sum, o) => {
        const empMap = crmData?.por_origem_emp[o] ?? {};
        return sum + Object.values(empMap).reduce((a, b) => a + b, 0);
      }, 0)
    : hasFilter
    ? empreendimentos.reduce((s, e) => s + e.total_leads, 0)
    : (crmData?.total_leads ?? 0);
  const totalGanhos   = empreendimentos.reduce((s, e) => s + e.ganhos, 0);
  const totalReservas = empreendimentos.reduce((s, e) => s + e.reserva, 0);

  const porOrigemFiltrado = filterOrigens.length > 0
    ? Object.fromEntries(filterOrigens.map(o => [o, crmData?.por_origem[o] ?? 0]))
    : (crmData?.por_origem ?? {});

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
        <select
          value={filterEmp}
          onChange={(e) => setFilterEmp(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[180px]"
        >
          {empOptions.map(o => (
            <option key={o} value={o}>{o === "Todos" ? "Todos empreendimentos" : o}</option>
          ))}
        </select>
        <MultiSelectDropdown
          label="Todas origens"
          options={origemOptions}
          selected={filterOrigens}
          onChange={setFilterOrigens}
        />
        {hasFilter && (
          <>
            <button
              onClick={() => { setFilterEmp("Todos"); setFilterOrigens([]); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Limpar filtros
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {empreendimentos.length} empreendimento{empreendimentos.length !== 1 ? "s" : ""} exibido{empreendimentos.length !== 1 ? "s" : ""}
            </span>
          </>
        )}
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
        <FunnelChart porSituacao={crmData?.por_situacao ?? {}} loading={loading} />
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
            Object.entries(emp.por_situacao ?? {}).forEach(([sit, cnt]) => {
              sitTotals[sit] = (sitTotals[sit] || 0) + cnt;
            });
          });
          const sitCols = Object.entries(sitTotals).sort((a, b) => b[1] - a[1]).map(([sit]) => sit);
          const sortedEmps = [...empreendimentos].sort((a, b) => b.total_leads - a.total_leads);

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-100">
                      Empreendimento
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
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-gray-50">Conversão</th>
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
                        "px-4 py-3 font-medium text-gray-800 whitespace-nowrap sticky left-0 z-10 border-r border-gray-100",
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      )}>
                        {emp.empreendimento}
                      </td>
                      {sitCols.map(sit => {
                        const cnt = emp.por_situacao?.[sit] ?? 0;
                        const venda = isVendaSit(sit);
                        return (
                          <td
                            key={sit}
                            className={cn(
                              "px-3 py-3 text-right text-xs",
                              venda && "bg-emerald-50/60"
                            )}
                          >
                            {cnt > 0 ? (
                              venda ? (
                                <button
                                  onClick={() => openVendaModal(emp)}
                                  className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full hover:bg-emerald-200 transition-colors cursor-pointer"
                                  title={`Ver ${cnt} venda${cnt > 1 ? "s" : ""} de ${emp.empreendimento}`}
                                >
                                  <Trophy className="w-3 h-3" />
                                  {cnt}
                                </button>
                              ) : (
                                <span className="font-medium text-gray-700">{cnt}</span>
                              )
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatNumber(emp.total_leads)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(emp.conversao_rate, 100)}%` }} />
                          </div>
                          <span className={cn("text-xs font-medium", emp.conversao_rate > 0 ? "text-emerald-600" : "text-gray-400")}>
                            {emp.conversao_rate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {empreendimentos.length === 0 && (
                    <tr>
                      <td colSpan={sitCols.length + 3} className="px-4 py-8 text-center text-sm text-gray-400">
                        Nenhum empreendimento com esses filtros
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-100">
                    <td className="px-4 py-3 text-xs font-bold text-gray-700 uppercase sticky left-0 bg-gray-100 z-10 border-r border-gray-200">Total</td>
                    {sitCols.map(sit => (
                      <td key={sit} className={cn("px-3 py-3 text-right text-xs font-bold", isVendaSit(sit) ? "text-emerald-700 bg-emerald-100/60" : "text-gray-700")}>
                        {formatNumber(sitTotals[sit] ?? 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-xs font-bold text-gray-800">{formatNumber(totalCrmLeads)}</td>
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
