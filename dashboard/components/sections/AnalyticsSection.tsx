"use client";

import { useState, useMemo } from "react";
import { Filter } from "lucide-react";
import { formatNumber, normalizeStr, findBestMatch } from "@/lib/utils";

function matchesAccount(empName: string, keys: string[]): boolean {
  const normEmp = normalizeStr(empName);
  for (const key of keys) {
    if (normalizeStr(key) === normEmp) return true;
    if (findBestMatch(key, [empName]).score >= 0.45) return true;
  }
  return false;
}
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
  imobiliaria: string;
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
  imobiliarias_list: string[];
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
  crmPorOrigem?: Record<string, number> | null;
  crmPorOrigemEmp?: Record<string, Record<string, number>> | null;
  crmPorImobiliariaEmp?: Record<string, Record<string, number>> | null;
  accountCrmKeys?: string[] | null;
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

export default function AnalyticsSection({ data, loading, stuckThreshold, onThresholdChange, totalLeadsCrm, crmPorOrigem, crmPorOrigemEmp, crmPorImobiliariaEmp, accountCrmKeys }: Props) {
  const [filterOrigens, setFilterOrigens] = useState<string[]>([]);
  const [filterImobiliaria, setFilterImobiliaria] = useState<string[]>([]);

  const origemOptions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.leads_parados.map(l => l.origem || "Não definido"))).sort();
  }, [data]);

  const imobiliariasOptions = data?.imobiliarias_list ?? [];

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    return data.leads_parados.filter(l => {
      if (accountCrmKeys && !matchesAccount(l.empreendimento, accountCrmKeys)) return false;
      if (filterOrigens.length > 0 && !filterOrigens.includes(l.origem || "Não definido")) return false;
      if (filterImobiliaria.length && !filterImobiliaria.includes(l.imobiliaria)) return false;
      return true;
    });
  }, [data, accountCrmKeys, filterOrigens, filterImobiliaria]);

  const filteredCorretores = useMemo(
    () => computeCorretores(filteredLeads),
    [filteredLeads]
  );

  // Recompute tempo_por_situacao from filteredLeads when any filter is active
  const filteredTempoPorSituacao = useMemo(() => {
    const anyFilter = !!accountCrmKeys || filterOrigens.length > 0 || !!filterImobiliaria.length;
    if (!anyFilter) return data?.tempo_por_situacao ?? [];
    const bySit: Record<string, number[]> = {};
    for (const l of filteredLeads) {
      const sit = l.situacao || "Não definido";
      if (!bySit[sit]) bySit[sit] = [];
      bySit[sit].push(l.dias_parado);
    }
    return Object.entries(bySit)
      .map(([situacao, dias]) => ({
        situacao,
        count: dias.length,
        media_dias: dias.length > 0 ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length * 10) / 10 : 0,
        max_dias: dias.length > 0 ? Math.max(...dias) : 0,
        parados_3dias: dias.filter(d => d >= 3).length,
        parados_7dias: dias.filter(d => d >= 7).length,
        parados_15dias: dias.filter(d => d >= 15).length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, filteredLeads, accountCrmKeys, filterOrigens]);

  // Filter motivos_descarte by accountCrmKeys (origem not available in this dataset)
  const filteredMotivosDescarte = useMemo(() => {
    const motivos = data?.motivos_descarte ?? [];
    if (!accountCrmKeys) return motivos;
    return motivos.filter(m => matchesAccount(m.empreendimento, accountCrmKeys));
  }, [data, accountCrmKeys]);

  const resumo = useMemo(() => {
    if (!data) return null;
    const hasFilter = !!accountCrmKeys || filterOrigens.length > 0 || !!filterImobiliaria.length;
    if (!hasFilter) return data.resumo_parados;
    return {
      total_parados_3d:  filteredLeads.filter(l => l.dias_parado >= 3).length,
      total_parados_7d:  filteredLeads.filter(l => l.dias_parado >= 7).length,
      total_parados_15d: filteredLeads.filter(l => l.dias_parado >= 15).length,
      avg_dias_sem_contato: filteredLeads.length > 0
        ? Math.round(filteredLeads.reduce((s, l) => s + l.dias_sem_contato, 0) / filteredLeads.length * 10) / 10
        : 0,
    };
  }, [data, accountCrmKeys, filterOrigens, filteredLeads]);

  const hasFilter = filterOrigens.length > 0 || !!filterImobiliaria.length;

  const displayTotal = useMemo(() => {
    // Imobiliária filter active — sum from crmPorImobiliariaEmp
    if (filterImobiliaria.length > 0 && crmPorImobiliariaEmp) {
      return filterImobiliaria.reduce((sum, imob) => {
        const empMap = crmPorImobiliariaEmp[imob] ?? {};
        return sum + Object.entries(empMap).reduce((a, [emp, cnt]) => {
          if (accountCrmKeys && !matchesAccount(emp, accountCrmKeys)) return a;
          return a + cnt;
        }, 0);
      }, 0);
    }

    // No origem filter — totalLeadsCrm already reflects the account filter from parent
    if (filterOrigens.length === 0) return totalLeadsCrm;

    // Both account + origem filters — use the exact intersection from por_origem_emp
    if (accountCrmKeys && crmPorOrigemEmp) {
      let total = 0;
      for (const origem of filterOrigens) {
        const empCounts = crmPorOrigemEmp[origem] ?? {};
        for (const [emp, count] of Object.entries(empCounts)) {
          if (matchesAccount(emp, accountCrmKeys)) total += count;
        }
      }
      return total;
    }

    // Origem filter only — sum from por_origem
    if (crmPorOrigem) {
      return filterOrigens.reduce((sum, origem) => sum + (crmPorOrigem[origem] ?? 0), 0);
    }

    return totalLeadsCrm;
  }, [filterImobiliaria, filterOrigens, accountCrmKeys, crmPorOrigem, crmPorOrigemEmp, crmPorImobiliariaEmp, totalLeadsCrm]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>

        {/* Origem — multi select */}
        <MultiSelectDropdown
          label="Todas origens"
          options={origemOptions}
          selected={filterOrigens}
          onChange={setFilterOrigens}
        />

        {/* Imobiliária — multi select */}
        <MultiSelectDropdown
          label="Todas as imobiliárias"
          options={imobiliariasOptions}
          selected={filterImobiliaria}
          onChange={setFilterImobiliaria}
        />

        {hasFilter && (
          <>
            <button onClick={() => { setFilterOrigens([]); setFilterImobiliaria([]); }} className="text-xs text-blue-600 hover:underline">
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
          <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-blue-700 break-words">
            {loading ? "—" : formatNumber(displayTotal)}
          </p>
          <p className="text-xs text-gray-500 mt-1">leads no período</p>
        </div>
        <div className="bg-white rounded-2xl border border-yellow-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-2">Parados +3 dias</p>
          <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-yellow-600 break-words">
            {resumo ? formatNumber(resumo.total_parados_3d) : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">leads sem movimento</p>
        </div>
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Parados +7 dias</p>
          <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-orange-600 break-words">
            {resumo ? formatNumber(resumo.total_parados_7d) : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">atenção necessária</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Parados +15 dias</p>
          <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-red-600 break-words">
            {resumo ? formatNumber(resumo.total_parados_15d) : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">risco de perda</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Média sem contato</p>
          <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-700 break-words">
            {resumo ? `${resumo.avg_dias_sem_contato}d` : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-1">por lead ativo</p>
        </div>
      </div>

      {/* Tempo por situação */}
      <TempoSituacaoTable data={filteredTempoPorSituacao} loading={loading} />

      {/* Corretores com mais leads parados */}
      <CorretoresParadosTable
        data={filteredCorretores}
        leads={filteredLeads}
        corretoresTotal={data?.corretores_total ?? {}}
        loading={loading}
        threshold={stuckThreshold}
      />

      {/* Stuck leads — full width */}
      <StuckLeadsTable
        leads={filteredLeads}
        loading={loading}
        threshold={stuckThreshold}
        onThresholdChange={onThresholdChange}
      />

      {/* Discard reasons — below */}
      <DiscardReasonsChart
        data={filteredMotivosDescarte}
        loading={loading}
      />
    </div>
  );
}
