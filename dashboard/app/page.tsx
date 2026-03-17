"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw } from "lucide-react";

import Sidebar, { PageId } from "@/components/Sidebar";
import DateRangePicker from "@/components/DateRangePicker";
import OverviewSection from "@/components/sections/OverviewSection";
import MetaAdsSection from "@/components/sections/MetaAdsSection";
import CRMSection from "@/components/sections/CRMSection";
import AnalyticsSection from "@/components/sections/AnalyticsSection";
import GoogleAdsSection, { GoogleAdsAccount } from "@/components/sections/GoogleAdsSection";

import { DateRange, MetaSummaryByAccount, MergedData } from "@/types";
import { getDefaultDateRange, toISODate, findBestMatch } from "@/lib/utils";
import { META_ACCOUNTS, META_TO_GOOGLE } from "@/lib/meta-accounts";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  por_empreendimento: Array<{
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
    ganho_leads: Array<{ id: number; nome: string; corretor: string; data_cadastro: string | null; origem: string; situacao: string }>;
    novo_count: number;
    retorno_count: number;
  }>;
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
  leads_parados: Array<{
    id: number;
    nome: string;
    situacao: string;
    empreendimento: string;
    corretor: string;
    imobiliaria: string;
    origem: string;
    ultima_origem: string;
    data_cadastro: string | null;
    dias_parado: number;
    ultima_atualizacao: string | null;
    dias_sem_contato: number;
  }>;
  imobiliarias_list: string[];
  ultimas_origens_list: string[];
  motivos_descarte: Array<{
    motivo: string;
    descricao: string;
    submotivo: string;
    empreendimento: string;
    count: number;
    leads?: Array<{ id: number; nome: string; corretor: string; empreendimento: string; data_cadastro: string | null }>;
  }>;
  corretores_parados: Array<{
    corretor: string;
    total_parados: number;
    avg_dias: number;
    max_dias: number;
    por_situacao: Record<string, number>;
  }>;
  resumo_parados: {
    total_parados_3d: number;
    total_parados_7d: number;
    total_parados_15d: number;
    avg_dias_sem_contato: number;
  };
}

const PAGE_TITLES: Record<PageId, string> = {
  overview:  "Visão Geral",
  meta:      "Meta Ads",
  google:    "Google Ads",
  crm:       "CRM / Leads",
  analytics: "Operacional",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [activePage, setActivePage]   = useState<PageId>("overview");
  const [sidebarCollapsed, setSidebar] = useState(false);
  const [dateRange, setDateRange]     = useState<DateRange>(getDefaultDateRange());

  const [metaData, setMetaData]       = useState<MetaSummaryByAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [crmData, setCrmData]         = useState<CRMResponse | null>(null);
  const [analyticsData, setAnalytics] = useState<AnalyticsData | null>(null);
  const [googleData, setGoogleData]   = useState<GoogleAdsAccount[] | null>(null);
  const [stuckThreshold, setStuck]    = useState(3);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (range: DateRange, threshold: number) => {
    setLoading(true);
    const start = toISODate(range.start);
    const end   = toISODate(range.end);
    try {
      const [mr, cr, ar, gr] = await Promise.all([
        fetch(`/api/meta?date_start=${start}&date_end=${end}`, { cache: "no-store" }),
        fetch(`/api/crm?date_start=${start}&date_end=${end}`, { cache: "no-store" }),
        fetch(`/api/analytics?date_start=${start}&date_end=${end}&stuck_days=${threshold}`, { cache: "no-store" }),
        fetch(`/api/google-ads?date_start=${start}&date_end=${end}`, { cache: "no-store" }),
      ]);
      const [meta, crm, analytics, google] = await Promise.all([
        mr.ok ? mr.json() : [],
        cr.ok ? cr.json() : null,
        ar.ok ? ar.json() : null,
        gr.ok ? gr.json() : null,
      ]);
      setMetaData(meta);
      setCrmData(crm);
      setAnalytics(analytics);
      setGoogleData(google);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange, stuckThreshold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter metaData by selected accounts (empty = all)
  const filteredMetaData = selectedAccounts.length === 0
    ? metaData
    : metaData.filter(m => selectedAccounts.includes(m.ad_account_name));

  const accountOptions = META_ACCOUNTS.map(a => a.name);

  // Filtered CRM summary for Visão Geral (por_situacao, total_leads, por_empreendimento)
  const filteredCrmSummary = (() => {
    if (selectedAccounts.length === 0 || !crmData) return crmData;
    const crmKeys = new Set(filteredMetaData.map(m => m.crm_key.toLowerCase().trim()));
    const filtered = crmData.por_empreendimento.filter(e =>
      crmKeys.has(e.empreendimento.toLowerCase().trim())
    );
    const por_situacao = filtered.reduce((acc, e) => {
      for (const [sit, count] of Object.entries(e.por_situacao)) {
        acc[sit] = (acc[sit] || 0) + (count as number);
      }
      return acc;
    }, {} as Record<string, number>);
    return {
      ...crmData,
      total_leads: filtered.reduce((s, e) => s + e.total_leads, 0),
      por_empreendimento: filtered,
      por_situacao,
    };
  })();

  // Filter Google Ads data by selected Meta accounts (with name mapping)
  const filteredGoogleData = selectedAccounts.length === 0
    ? googleData
    : (() => {
        const expectedNames = new Set(
          selectedAccounts.map(name => {
            const key = name.toLowerCase().trim();
            return META_TO_GOOGLE[key] ?? key;
          })
        );
        return googleData?.filter(g =>
          expectedNames.has(g.account_name.toLowerCase().trim())
        ) ?? null;
      })();

  // Merge Meta + CRM with fuzzy name matching (uses filtered accounts)
  const crmEmpNames = crmData?.por_empreendimento.map(c => c.empreendimento) ?? [];
  const mergedData: MergedData[] = filteredMetaData.map(meta => {
    let crm = crmData?.por_empreendimento.find(
      c => c.empreendimento.toLowerCase().trim() === meta.crm_key.toLowerCase().trim()
    );
    if (!crm && crmEmpNames.length > 0) {
      const { match } = findBestMatch(meta.crm_key, crmEmpNames);
      if (match) crm = crmData?.por_empreendimento.find(c => c.empreendimento === match);
    }
    return {
      empreendimento:   meta.crm_key,
      crm_key:          meta.crm_key,
      ad_account_name:  meta.ad_account_name,
      meta_spend:       meta.total_spend,
      meta_impressions: meta.total_impressions,
      meta_clicks:      meta.total_clicks,
      meta_leads:       meta.total_leads,
      meta_cpl:         meta.cost_per_lead,
      meta_ctr:         meta.avg_ctr,
      meta_cpc:         meta.avg_cpc,
      meta_cpm:         meta.avg_cpm,
      crm_leads:        crm?.total_leads    ?? 0,
      crm_atendimento:  crm?.atendimento    ?? 0,
      crm_reserva:      crm?.reserva        ?? 0,
      crm_ganhos:       crm?.ganhos         ?? 0,
      crm_perdas:       crm?.perdas         ?? 0,
      crm_conversao:    crm?.conversao_rate ?? 0,
      lead_conversion:  meta.total_leads > 0
        ? ((crm?.total_leads ?? 0) / meta.total_leads) * 100
        : 0,
    };
  });

  const stuckCount = analyticsData?.resumo_parados.total_parados_3d ?? 0;

  // Total CRM filtered by selected accounts
  const filteredCrmLeads = selectedAccounts.length === 0
    ? (crmData?.total_leads ?? 0)
    : mergedData.reduce((s, m) => s + m.crm_leads, 0);

  function handleDateChange(range: DateRange) {
    setDateRange(range);
    fetchData(range, stuckThreshold);
  }

  function handleThreshold(t: number) {
    setStuck(t);
    fetchData(dateRange, t);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        active={activePage}
        onChange={setActivePage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebar(v => !v)}
        stuckCount={stuckCount}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0 z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{PAGE_TITLES[activePage]}</h2>
            <p className="text-xs text-gray-400">
              {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} →{" "}
              {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {lastUpdated && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Atualizado {format(lastUpdated, "HH:mm", { locale: ptBR })}
              </span>
            )}
            <MultiSelectDropdown
              label="Todas as contas"
              options={accountOptions}
              selected={selectedAccounts}
              onChange={setSelectedAccounts}
            />
            <button
              onClick={() => fetchData(dateRange, stuckThreshold)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-blue-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <DateRangePicker value={dateRange} onChange={handleDateChange} />
          </div>
        </header>

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto p-6">
          {activePage === "overview" && (
            <OverviewSection
              metaData={filteredMetaData}
              crmData={filteredCrmSummary}
              mergedData={mergedData}
              googleData={filteredGoogleData}
              loading={loading}
            />
          )}
          {activePage === "meta" && (
            <MetaAdsSection
              metaData={filteredMetaData}
              mergedData={mergedData}
              loading={loading}
              dateStart={toISODate(dateRange.start)}
              dateEnd={toISODate(dateRange.end)}
            />
          )}
          {activePage === "crm" && (
            <CRMSection
              crmData={crmData}
              metaData={filteredMetaData}
              loading={loading}
              accountCrmKeys={selectedAccounts.length > 0 ? filteredMetaData.map(m => m.crm_key) : null}
              dateStart={toISODate(dateRange.start)}
              dateEnd={toISODate(dateRange.end)}
            />
          )}
          {activePage === "google" && (
            <GoogleAdsSection
              data={googleData}
              loading={loading}
            />
          )}
          {activePage === "analytics" && (
            <AnalyticsSection
              data={analyticsData}
              loading={loading}
              stuckThreshold={stuckThreshold}
              onThresholdChange={handleThreshold}
              totalLeadsCrm={filteredCrmLeads}
              crmPorOrigem={crmData?.por_origem ?? null}
              crmPorOrigemEmp={crmData?.por_origem_emp ?? null}
              crmPorImobiliariaEmp={crmData?.por_imobiliaria_emp ?? null}
              crmPorOrigemImobiliaria={crmData?.por_origem_imobiliaria ?? null}
              accountCrmKeys={selectedAccounts.length > 0 ? filteredMetaData.map(m => m.crm_key) : null}
            />
          )}
        </main>
      </div>
    </div>
  );
}
