"use client";

import { useState, useMemo } from "react";
import { Filter, Users, Clock, AlertTriangle, AlertCircle, Timer, XCircle } from "lucide-react";
import { formatNumber, normalizeStr, findBestMatch } from "@/lib/utils";
import KPICard from "@/components/KPICard";

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
  ultima_origem: string;
  midia_ultimo: string;
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
  descartados: Array<{ empreendimento: string; imobiliaria: string; origem: string; midia_ultimo: string }>;
  motivos_descarte: Array<{
    motivo: string;
    descricao: string;
    submotivo: string;
    empreendimento: string;
    count: number;
    leads?: Array<{ id: number; nome: string; corretor: string; empreendimento: string; imobiliaria: string; origem: string; ultima_origem: string; midia_ultimo: string; data_cadastro: string | null }>;
  }>;
  corretores_parados: CorretorParado[];
  corretores_total: Record<string, number>;
  imobiliarias_list: string[];
  ultimas_origens_list: string[];
  midia_ultimo_list: string[];
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
  totalLeadsCrm: number;
  crmPorOrigem?: Record<string, number> | null;
  crmPorOrigemEmp?: Record<string, Record<string, number>> | null;
  crmPorImobiliariaEmp?: Record<string, Record<string, number>> | null;
  crmPorOrigemImobiliaria?: Record<string, Record<string, number>> | null;
  crmPorMidiaUltimoEmp?: Record<string, Record<string, number>> | null;
  crmPorMidiaUltimoOrigemEmp?: Record<string, Record<string, Record<string, number>>> | null;
  crmPorImobiliariaMidiaOrigemEmp?: Record<string, Record<string, Record<string, Record<string, number>>>> | null;
  crmPorEmpTotal?: Record<string, number> | null;
  accountCrmKeys?: string[] | null;
}

function computeCorretores(leads: StuckLead[]): CorretorParado[] {
  const map: Record<string, { dias: number[]; por_situacao: Record<string, number> }> = {};
  for (const l of leads) {
    const c = l.corretor?.split(" - ")[0]?.trim();
    if (!c) continue;
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

export default function AnalyticsSection({ data, loading, totalLeadsCrm, crmPorOrigem, crmPorOrigemEmp, crmPorImobiliariaEmp, crmPorOrigemImobiliaria, crmPorMidiaUltimoEmp, crmPorMidiaUltimoOrigemEmp, crmPorImobiliariaMidiaOrigemEmp, crmPorEmpTotal, accountCrmKeys }: Props) {
  const [filterEmpreendimento, setFilterEmpreendimento] = useState<string[]>([]);
  const [filterOrigens, setFilterOrigens] = useState<string[]>([]);
  const [filterImobiliaria, setFilterImobiliaria] = useState<string[]>([]);
  const [filterMidiaUltimo, setFilterMidiaUltimo] = useState<string[]>([]);

  const empOptions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(
      data.leads_parados
        .map(l => l.empreendimento)
        .filter(Boolean)
        .filter(e => !accountCrmKeys || matchesAccount(e, accountCrmKeys))
    )).sort();
  }, [data, accountCrmKeys]);

  const origemOptions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.leads_parados.map(l => l.origem || "Não definido"))).sort();
  }, [data]);

  const imobiliariasOptions = data?.imobiliarias_list ?? [];
  const midiaUltimoOptions = data?.midia_ultimo_list ?? [];

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    return data.leads_parados.filter(l => {
      if (accountCrmKeys && !matchesAccount(l.empreendimento, accountCrmKeys)) return false;
      if (filterEmpreendimento.length > 0 && !filterEmpreendimento.includes(l.empreendimento)) return false;
      if (filterOrigens.length > 0 && !filterOrigens.includes(l.origem || "Não definido")) return false;
      if (filterImobiliaria.length && !filterImobiliaria.includes(l.imobiliaria)) return false;
      if (filterMidiaUltimo.length && !filterMidiaUltimo.includes(l.midia_ultimo || "Não definido")) return false;
      return true;
    });
  }, [data, accountCrmKeys, filterEmpreendimento, filterOrigens, filterImobiliaria, filterMidiaUltimo]);

  const filteredCorretores = useMemo(
    () => computeCorretores(filteredLeads),
    [filteredLeads]
  );

  // Recompute tempo_por_situacao from filteredLeads when any filter is active
  const filteredTempoPorSituacao = useMemo(() => {
    const anyFilter = !!accountCrmKeys || filterEmpreendimento.length > 0 || filterOrigens.length > 0 || !!filterImobiliaria.length || filterMidiaUltimo.length > 0;
    if (!anyFilter) return data?.tempo_por_situacao ?? [];
    const bySit: Record<string, number[]> = {};
    for (const l of filteredLeads) {
      const sit = l.situacao || "Não definido";
      if (!bySit[sit]) bySit[sit] = [];
      bySit[sit].push(l.dias_parado);
    }
    return Object.entries(bySit)
      .filter(([situacao]) => {
        const s = situacao.toLowerCase();
        return !s.includes("descart") && !s.includes("venda") && !s.includes("ganho") && !s.includes("vencido");
      })
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
  }, [data, filteredLeads, accountCrmKeys, filterEmpreendimento, filterOrigens, filterMidiaUltimo]);

  // Filter motivos_descarte by accountCrmKeys + internal filters; rebuild count from filtered leads
  const filteredMotivosDescarte = useMemo(() => {
    const motivos = data?.motivos_descarte ?? [];
    const anyInternalFilter = filterEmpreendimento.length > 0 || filterOrigens.length > 0 || filterImobiliaria.length > 0 || filterMidiaUltimo.length > 0;

    return motivos
      .map(m => {
        if (accountCrmKeys && !matchesAccount(m.empreendimento, accountCrmKeys)) return null;
        if (filterEmpreendimento.length > 0 && !filterEmpreendimento.includes(m.empreendimento)) return null;
        if (!anyInternalFilter) return m;

        // Filter leads by internal filters and rebuild count
        const filteredLeadsForMotivo = (m.leads ?? []).filter(l => {
          if (filterOrigens.length > 0 && !filterOrigens.includes(l.origem ?? "Não definido")) return false;
          if (filterImobiliaria.length > 0 && !filterImobiliaria.includes(l.imobiliaria ?? "Sem imobiliária")) return false;
          if (filterMidiaUltimo.length > 0 && !filterMidiaUltimo.includes(l.midia_ultimo ?? "Não definido")) return false;
          return true;
        });
        if (filteredLeadsForMotivo.length === 0) return null;
        return { ...m, count: filteredLeadsForMotivo.length, leads: filteredLeadsForMotivo };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [data, accountCrmKeys, filterEmpreendimento, filterOrigens, filterImobiliaria, filterMidiaUltimo]);

  const resumo = useMemo(() => {
    if (!data) return null;
    const hasFilter = !!accountCrmKeys || filterEmpreendimento.length > 0 || filterOrigens.length > 0 || !!filterImobiliaria.length || filterMidiaUltimo.length > 0;
    if (!hasFilter) return data.resumo_parados;
    return {
      total_parados_3d:  filteredLeads.filter(l => l.dias_parado >= 3).length,
      total_parados_7d:  filteredLeads.filter(l => l.dias_parado >= 7).length,
      total_parados_15d: filteredLeads.filter(l => l.dias_parado >= 15).length,
      avg_dias_sem_contato: filteredLeads.length > 0
        ? Math.round(filteredLeads.reduce((s, l) => s + l.dias_sem_contato, 0) / filteredLeads.length * 10) / 10
        : 0,
    };
  }, [data, accountCrmKeys, filterEmpreendimento, filterOrigens, filterMidiaUltimo, filteredLeads]);

  const hasFilter = filterEmpreendimento.length > 0 || filterOrigens.length > 0 || !!filterImobiliaria.length || filterMidiaUltimo.length > 0;

  const displayTotal = useMemo(() => {
    const allowedMidia   = filterMidiaUltimo.length > 0   ? new Set(filterMidiaUltimo)   : null;
    const allowedOrigens = filterOrigens.length > 0       ? new Set(filterOrigens)        : null;
    const allowedEmps    = filterEmpreendimento.length > 0 ? new Set(filterEmpreendimento) : null;

    // Imobiliária: true 4-way intersection with any combination of midia, origem, empreendimento
    if (filterImobiliaria.length > 0 && crmPorImobiliariaMidiaOrigemEmp) {
      let total = 0;
      for (const imob of filterImobiliaria)
        for (const [midia, origemMap] of Object.entries(crmPorImobiliariaMidiaOrigemEmp[imob] ?? {})) {
          if (allowedMidia && !allowedMidia.has(midia)) continue;
          for (const [origem, empMap] of Object.entries(origemMap)) {
            if (allowedOrigens && !allowedOrigens.has(origem)) continue;
            for (const [emp, cnt] of Object.entries(empMap)) {
              if (allowedEmps && !allowedEmps.has(emp)) continue;
              if (accountCrmKeys && !matchesAccount(emp, accountCrmKeys)) continue;
              total += cnt;
            }
          }
        }
      return total;
    }

    // Mídia + origem + empreendimento: 3-way intersection
    if (filterMidiaUltimo.length > 0 && crmPorMidiaUltimoOrigemEmp) {
      let total = 0;
      for (const m of filterMidiaUltimo)
        for (const [origem, empMap] of Object.entries(crmPorMidiaUltimoOrigemEmp[m] ?? {})) {
          if (allowedOrigens && !allowedOrigens.has(origem)) continue;
          for (const [emp, cnt] of Object.entries(empMap)) {
            if (allowedEmps && !allowedEmps.has(emp)) continue;
            if (accountCrmKeys && !matchesAccount(emp, accountCrmKeys)) continue;
            total += cnt;
          }
        }
      return total;
    }

    // Origem + empreendimento: 2-way intersection
    if (filterOrigens.length > 0 && crmPorOrigemEmp) {
      let total = 0;
      for (const origem of filterOrigens)
        for (const [emp, cnt] of Object.entries(crmPorOrigemEmp[origem] ?? {})) {
          if (allowedEmps && !allowedEmps.has(emp)) continue;
          if (accountCrmKeys && !matchesAccount(emp, accountCrmKeys)) continue;
          total += cnt;
        }
      return total;
    }

    // Empreendimento only
    if (filterEmpreendimento.length > 0 && crmPorEmpTotal) {
      return filterEmpreendimento.reduce((sum, emp) => sum + (crmPorEmpTotal[emp] ?? 0), 0);
    }

    return totalLeadsCrm;
  }, [filterEmpreendimento, filterImobiliaria, filterOrigens, filterMidiaUltimo, accountCrmKeys, crmPorOrigem, crmPorOrigemEmp, crmPorImobiliariaEmp, crmPorOrigemImobiliaria, crmPorMidiaUltimoEmp, crmPorMidiaUltimoOrigemEmp, crmPorImobiliariaMidiaOrigemEmp, crmPorEmpTotal, totalLeadsCrm]);

  const totalDescartado = useMemo(() => {
    return (data?.descartados ?? []).filter(d => {
      if (accountCrmKeys && !matchesAccount(d.empreendimento, accountCrmKeys)) return false;
      if (filterEmpreendimento.length > 0 && !filterEmpreendimento.includes(d.empreendimento)) return false;
      if (filterOrigens.length > 0 && !filterOrigens.includes(d.origem || "Não definido")) return false;
      if (filterImobiliaria.length > 0 && !filterImobiliaria.includes(d.imobiliaria)) return false;
      if (filterMidiaUltimo.length > 0 && !filterMidiaUltimo.includes(d.midia_ultimo || "Não definido")) return false;
      return true;
    }).length;
  }, [data, filterEmpreendimento, filterOrigens, filterImobiliaria, filterMidiaUltimo, accountCrmKeys]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>

        {/* Empreendimento — multi select */}
        <MultiSelectDropdown
          label="Empreendimento"
          options={empOptions}
          selected={filterEmpreendimento}
          onChange={setFilterEmpreendimento}
        />

        {/* Primeira Origem — multi select */}
        <MultiSelectDropdown
          label="Primeira Origem"
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

        {/* Mídia Último — multi select */}
        <MultiSelectDropdown
          label="Mídia Último"
          options={midiaUltimoOptions}
          selected={filterMidiaUltimo}
          onChange={setFilterMidiaUltimo}
        />

        {hasFilter && (
          <>
            <button onClick={() => { setFilterEmpreendimento([]); setFilterOrigens([]); setFilterImobiliaria([]); setFilterMidiaUltimo([]); }} className="text-xs text-blue-600 hover:underline">
              Limpar filtros
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} filtrado{filteredLeads.length !== 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>

      {/* Stuck KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <KPICard
          title="Total CRM"
          value={loading ? "—" : formatNumber(displayTotal)}
          subtitle="leads no período"
          tooltip="Total de leads no CRM no período selecionado, considerando os filtros aplicados."
          icon={Users}
          color="blue"
          loading={loading}
        />
        <KPICard
          title="Total Descartado"
          value={loading ? "—" : formatNumber(totalDescartado)}
          subtitle="leads descartados"
          tooltip="Total de leads que foram descartados no período, com ou sem motivo de descarte registrado."
          icon={XCircle}
          color="red"
          loading={loading}
        />
        <KPICard
          title="Parados +3 dias"
          value={resumo ? formatNumber(resumo.total_parados_3d) : "—"}
          subtitle="leads sem movimento"
          tooltip="Leads ativos que estão sem nenhuma atualização ou contato há mais de 3 dias."
          icon={Clock}
          color="orange"
          loading={loading}
        />
        <KPICard
          title="Parados +7 dias"
          value={resumo ? formatNumber(resumo.total_parados_7d) : "—"}
          subtitle="atenção necessária"
          tooltip="Leads ativos que estão sem nenhuma atualização ou contato há mais de 7 dias. Requer atenção urgente."
          icon={AlertTriangle}
          color="orange"
          loading={loading}
        />
        <KPICard
          title="Parados +15 dias"
          value={resumo ? formatNumber(resumo.total_parados_15d) : "—"}
          subtitle="risco de perda"
          tooltip="Leads ativos sem contato há mais de 15 dias. Alto risco de perda — ação imediata recomendada."
          icon={AlertCircle}
          color="red"
          loading={loading}
        />
        <KPICard
          title="Média sem contato"
          value={resumo ? `${resumo.avg_dias_sem_contato}d` : "—"}
          subtitle="por lead ativo"
          tooltip="Média de dias sem contato por lead ativo no funil, considerando os filtros aplicados."
          tooltipAlign="right"
          icon={Timer}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Tempo por situação */}
      <TempoSituacaoTable data={filteredTempoPorSituacao} loading={loading} />

      {/* Corretores com mais leads parados */}
      <CorretoresParadosTable
        data={filteredCorretores}
        leads={filteredLeads}
        corretoresTotal={data?.corretores_total ?? {}}
        loading={loading}
      />

      {/* Stuck leads — full width */}
      <StuckLeadsTable
        leads={filteredLeads}
        loading={loading}
      />

      {/* Discard reasons — below */}
      <DiscardReasonsChart
        data={filteredMotivosDescarte}
        loading={loading}
        totalLeads={totalDescartado}
      />
    </div>
  );
}
