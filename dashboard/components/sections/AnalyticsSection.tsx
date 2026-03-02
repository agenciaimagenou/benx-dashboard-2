"use client";

import { useState, useMemo } from "react";
import { Filter } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import TempoSituacaoTable from "@/components/TempoSituacaoTable";
import StuckLeadsTable from "@/components/StuckLeadsTable";
import DiscardReasonsChart from "@/components/DiscardReasonsChart";
import CorretoresParadosTable from "@/components/CorretoresParadosTable";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";

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

interface AnalyticsData {
  tempo_por_situacao: Array<{
    situacao: string;
    count: number;
    media_dias: number;
    max_dias: number;
    parados_3dias: number;
    parados_7dias: number;
    parados_15dias: number;
  }>;
  leads_parados: StuckLead[];
  motivos_descarte: Array<{
    motivo: string;
    descricao: string;
    submotivo: string;
    empreendimento: string;
    count: number;
  }>;
  corretores_parados: CorretorParado[];
  corretores_total: Record<string, number>;
  resumo_parados: {
    total_parados_3d: number;
    total_parados_7d: number;
    total_parados_15d: number;
    avg_dias_sem_contato: number;
  };
}

interface Props {
  data: AnalyticsData | null;
  loading: boolean;
  stuckThreshold: number;
  onThresholdChange: (t: number) => void;
  totalLeadsCrm: number;
}

function computeCorretores(leads: StuckLead[]): CorretorParado[] {
  const map: Record<string, { dias: number[]; por_situacao: Record<string, number> }> = {};
  for (const l of leads) {
    const c = l.corretor?.split(" - ")[0]?.trim() || "Não atribuído";
    if (!map[c]) map[c] = { dias: [], por_situacao: {} };
    map[c].dias.push(l.dias_parado);
    const sit = l.situacao || "Não definido";
    map[c].por_situacao[sit] = (map[c].por_situacao[sit] || 0) + 1;
  }
  return Object.entries(map)
    .map(([corretor, { dias, por_situacao }]) => ({
      corretor,
      total_parados: dias.length,
      avg_dias: dias.length > 0 ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0,
      max_dias: dias.length > 0 ? Math.max(...dias) : 0,
      por_situacao,
    }))
    .sort((a, b) => b.total_parados - a.total_parados)
    .slice(0, 25);
}

export default function AnalyticsSection({ data, loading, stuckThreshold, onThresholdChange, totalLeadsCrm }: Props) {
  const [filterEmp, setFilterEmp]         = useState("Todos");
  const [filterOrigens, setFilterOrigens] = useState<string[]>([]);

  const empOptions = useMemo(() => {
    if (!data) return ["Todos"];
    const emps = Array.from(new Set(data.leads_parados.map(l => l.empreendimento))).sort();
    return ["Todos", ...emps];
  }, [data]);

  const origemOptions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.leads_parados.map(l => l.origem || "Não definido"))).sort();
  }, [data]);

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    return data.leads_parados.filter(l => {
      if (filterEmp !== "Todos" && l.empreendimento !== filterEmp) return false;
      if (filterOrigens.length > 0 && !filterOrigens.includes(l.origem || "Não definido")) return false;
      return true;
    });
  }, [data, filterEmp, filterOrigens]);

  const filteredCorretores = useMemo(
    () => computeCorretores(filteredLeads),
    [filteredLeads]
  );

  const resumo = useMemo(() => {
    if (!data) return null;
    const hasFilter = filterEmp !== "Todos" || filterOrigens.length > 0;
    if (!hasFilter) return data.resumo_parados;
    return {
      total_parados_3d:  filteredLeads.filter(l => l.dias_parado >= 3).length,
      total_parados_7d:  filteredLeads.filter(l => l.dias_parado >= 7).length,
      total_parados_15d: filteredLeads.filter(l => l.dias_parado >= 15).length,
      avg_dias_sem_contato: filteredLeads.length > 0
        ? Math.round(filteredLeads.reduce((s, l) => s + l.dias_sem_contato, 0) / filteredLeads.length * 10) / 10
        : 0,
    };
  }, [data, filterEmp, filterOrigens, filteredLeads]);

  const hasFilter = filterEmp !== "Todos" || filterOrigens.length > 0;

  function clearFilters() {
    setFilterEmp("Todos");
    setFilterOrigens([]);
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>

        {/* Empreendimento — single select (still makes sense) */}
        <select
          value={filterEmp}
          onChange={(e) => setFilterEmp(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[180px]"
        >
          {empOptions.map(o => (
            <option key={o} value={o}>{o === "Todos" ? "Todos empreendimentos" : o}</option>
          ))}
        </select>

        {/* Origem — multi select */}
        <MultiSelectDropdown
          label="Todas origens"
          options={origemOptions}
          selected={filterOrigens}
          onChange={setFilterOrigens}
        />

        {hasFilter && (
          <>
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">
              Limpar filtros
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} filtrado{filteredLeads.length !== 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>

      {/* Stuck KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Total CRM</p>
          <p className="text-2xl font-bold text-blue-700">
            {loading ? "—" : formatNumber(totalLeadsCrm)}
          </p>
          <p className="text-xs text-gray-500 mt-1">leads no período</p>
        </div>
        <div className="bg-white rounded-2xl border border-yellow-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-2">Parados +3 dias</p>
          <p className="text-2xl font-bold text-yellow-600">
            {resumo ? formatNumber(resumo.total_parados_3d) : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">leads sem movimento</p>
        </div>
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Parados +7 dias</p>
          <p className="text-2xl font-bold text-orange-600">
            {resumo ? formatNumber(resumo.total_parados_7d) : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">atenção necessária</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Parados +15 dias</p>
          <p className="text-2xl font-bold text-red-600">
            {resumo ? formatNumber(resumo.total_parados_15d) : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">risco de perda</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Média sem contato</p>
          <p className="text-2xl font-bold text-gray-700">
            {resumo ? `${resumo.avg_dias_sem_contato}d` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">por lead ativo</p>
        </div>
      </div>

      {/* Tempo por situação */}
      <TempoSituacaoTable data={data?.tempo_por_situacao ?? []} loading={loading} />

      {/* Corretores com mais leads parados */}
      <CorretoresParadosTable
        data={filteredCorretores}
        leads={filteredLeads}
        corretoresTotal={data?.corretores_total ?? {}}
        loading={loading}
        threshold={stuckThreshold}
      />

      {/* Stuck leads + discard side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StuckLeadsTable
          leads={filteredLeads}
          loading={loading}
          threshold={stuckThreshold}
          onThresholdChange={onThresholdChange}
        />
        <DiscardReasonsChart
          data={data?.motivos_descarte ?? []}
          loading={loading}
        />
      </div>
    </div>
  );
}
