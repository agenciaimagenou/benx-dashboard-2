"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import ReservasSection from "@/components/sections/ReservasSection";

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
  midia_ultimo_list: string[];
  por_midia_ultimo_emp: Record<string, Record<string, number>>;
  por_midia_ultimo_origem: Record<string, Record<string, number>>;
  por_midia_ultimo_origem_emp: Record<string, Record<string, Record<string, number>>>;
  por_imobiliaria_origem: Record<string, Record<string, number>>;
  por_imobiliaria_midia_origem_emp: Record<string, Record<string, Record<string, Record<string, number>>>>;
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
    total_leads_meta: number;
    total_leads_google: number;
    atendimento: number;
    atendimento_meta: number;
    atendimento_google: number;
    reserva: number;
    reserva_meta: number;
    reserva_google: number;
    ganhos: number;
    ganhos_meta: number;
    ganhos_google: number;
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
  descartados: Array<{ empreendimento: string; imobiliaria: string; origem: string; midia_ultimo: string }>;
  imobiliarias_list: string[];
  ultimas_origens_list: string[];
  midia_ultimo_list: string[];
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

interface ReservasData {
  records: Record<string, unknown>[];
  filter_options: {
    empreendimentos: string[];
    situacoes:       string[];
    times:           string[];
    corretores:      string[];
    tiposVenda:      string[];
  };
}

type ApiKey = "meta" | "crm" | "analytics" | "google" | "reservas";

const TAB_NEEDS: Record<PageId, ApiKey[]> = {
  overview:  ["meta", "crm", "google"],
  meta:      ["meta", "crm", "reservas"],
  google:    ["google", "crm", "reservas"],
  crm:       ["crm"],
  analytics: ["analytics", "crm"],
  reservas:  ["reservas", "crm"],
};

const PAGE_TITLES: Record<PageId, string> = {
  overview:  "Visão Geral",
  meta:      "Meta Ads",
  google:    "Google Ads",
  crm:       "CRM / Leads",
  analytics: "Operacional",
  reservas:  "Reservas",
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
  const [reservasData, setReservas]   = useState<ReservasData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Tracks which APIs have been loaded for the current date range
  const loadedRef = useRef<Set<ApiKey>>(new Set());

  const fetchApis = useCallback(async (apis: ApiKey[], range: DateRange) => {
    if (apis.length === 0) return;
    setLoading(true);
    const start = toISODate(range.start);
    const end   = toISODate(range.end);
    try {
      const responses = await Promise.all(apis.map(api => {
        if (api === "meta")      return fetch(`/api/meta?date_start=${start}&date_end=${end}`, { cache: "no-store" });
        if (api === "crm")       return fetch(`/api/crm?date_start=${start}&date_end=${end}`, { cache: "no-store" });
        if (api === "analytics") return fetch(`/api/analytics?date_start=${start}&date_end=${end}&stuck_days=3`, { cache: "no-store" });
        if (api === "reservas")  return fetch(`/api/reservas`, { cache: "no-store" });
        /* google */             return fetch(`/api/google-ads?date_start=${start}&date_end=${end}`, { cache: "no-store" });
      }));
      const jsons = await Promise.all(responses.map((r, i) => r.ok ? r.json() : (apis[i] === "meta" ? [] : null)));
      apis.forEach((api, i) => {
        if (api === "meta")      setMetaData(jsons[i]);
        if (api === "crm")       setCrmData(jsons[i]);
        if (api === "analytics") setAnalytics(jsons[i]);
        if (api === "google")    setGoogleData(jsons[i]);
        if (api === "reservas")  setReservas(jsons[i]);
        loadedRef.current.add(api);
      });
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchForTab = useCallback((tab: PageId, range: DateRange, force = false) => {
    const needs = TAB_NEEDS[tab];
    const toFetch = force ? needs : needs.filter(api => !loadedRef.current.has(api));
    return fetchApis(toFetch, range);
  }, [fetchApis]);

  // Initial load for the default tab
  useEffect(() => {
    fetchForTab(activePage, dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazy load when switching tabs
  useEffect(() => {
    fetchForTab(activePage, dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

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

  // ── Reservas: agrupa por empreendimento para cruzar com Meta Ads ───────────
  const RES_VENDA_IDS = new Set([3, 17, 23, 24, 25, 26, 28]);
  function isResVenda(r: Record<string, unknown>): boolean {
    const idSit = Number(r.idsituacao);
    if (!isNaN(idSit) && idSit > 0 && RES_VENDA_IDS.has(idSit)) return true;
    const sit = String(r.situacao || "").toLowerCase().trim();
    return sit.startsWith("vend") || sit === "vendida";
  }
  const ORIGENS_META = new Set(["FB", "IG"]);
  const _dsStart = toISODate(dateRange.start);
  const _dsEnd   = toISODate(dateRange.end);
  const resEmpMap: Record<string, { ativas: number; vendas: number }> = {};
  for (const r of reservasData?.records ?? []) {
    const rec = r as Record<string, unknown>;
    // Only count reservas from Meta (FB/IG) leads for the Meta Ads table
    const origem = String(rec.origem || "").toUpperCase().trim();
    if (!ORIGENS_META.has(origem)) continue;
    const sit = String(rec.situacao || "").toLowerCase().trim();
    if (sit.startsWith("cancel")) continue;
    const emp = String(rec.empreendimento || "");
    if (!emp) continue;
    // Date filter: vendas by data_venda, reservas ativas by data_cad
    const venda = isResVenda(rec);
    const dateField = venda
      ? (rec.data_venda ? String(rec.data_venda).slice(0, 10) : null)
      : (rec.data_cad   ? String(rec.data_cad).slice(0, 10)   : null);
    if (!dateField) continue;
    if (_dsStart && dateField < _dsStart) continue;
    if (_dsEnd   && dateField > _dsEnd)   continue;
    if (!resEmpMap[emp]) resEmpMap[emp] = { ativas: 0, vendas: 0 };
    if (venda) resEmpMap[emp].vendas++;
    else resEmpMap[emp].ativas++;
  }
  const resEmpNames = Object.keys(resEmpMap);

  // Strip brand prefixes before matching so "Viva Benx Estação X" and "VB Estação X"
  // are compared only by their specific product name ("Estação X")
  function stripBrand(name: string): string {
    return name
      .replace(/^viva\s+benx\s*[\|\-]?\s*/i, "")
      .replace(/^vb\s+/i, "")
      .trim();
  }
  const strippedResEmpNames = resEmpNames.map(e => ({ original: e, stripped: stripBrand(e) }));

  // Pre-compute one-to-one mapping: each reservas empreendimento → best matching meta account
  const resWinner: Record<string, { crm_key: string; score: number }> = {};
  for (const meta of filteredMetaData) {
    const strippedKey = stripBrand(meta.crm_key);
    // Try exact match on stripped names first
    const exactEntry = strippedResEmpNames.find(e => e.stripped.toLowerCase() === strippedKey.toLowerCase());
    if (exactEntry) {
      if (1 > (resWinner[exactEntry.original]?.score ?? 0)) {
        resWinner[exactEntry.original] = { crm_key: meta.crm_key, score: 1 };
      }
    } else if (strippedResEmpNames.length > 0) {
      const { match, score } = findBestMatch(strippedKey, strippedResEmpNames.map(e => e.stripped));
      if (match && score > (resWinner[strippedResEmpNames.find(e => e.stripped === match)?.original ?? ""]?.score ?? 0)) {
        const original = strippedResEmpNames.find(e => e.stripped === match)?.original;
        if (original) resWinner[original] = { crm_key: meta.crm_key, score };
      }
    }
  }
  // Reverse map: meta crm_key → winning reservas empreendimento name
  const metaToResKey: Record<string, string> = {};
  for (const [resEmp, { crm_key }] of Object.entries(resWinner)) {
    metaToResKey[crm_key] = resEmp;
  }

  // ── Reservas: agrupa por empreendimento para cruzar com Google Ads ──────────
  const ORIGENS_GOOGLE = new Set(["SI", "GO", "OP", "WA", "OU"]);
  const resEmpMapGoogle: Record<string, { ativas: number; vendas: number }> = {};
  for (const r of reservasData?.records ?? []) {
    const rec = r as Record<string, unknown>;
    const origem = String(rec.origem || "").toUpperCase().trim();
    if (!ORIGENS_GOOGLE.has(origem)) continue;
    const sit = String(rec.situacao || "").toLowerCase().trim();
    if (sit.startsWith("cancel") || sit.startsWith("distrat")) continue;
    const emp = String(rec.empreendimento || "");
    if (!emp) continue;
    // Date filter: vendas by data_venda, reservas ativas by data_cad
    const vendaG = isResVenda(rec);
    const dateFieldG = vendaG
      ? (rec.data_venda ? String(rec.data_venda).slice(0, 10) : null)
      : (rec.data_cad   ? String(rec.data_cad).slice(0, 10)   : null);
    if (!dateFieldG) continue;
    if (_dsStart && dateFieldG < _dsStart) continue;
    if (_dsEnd   && dateFieldG > _dsEnd)   continue;
    if (!resEmpMapGoogle[emp]) resEmpMapGoogle[emp] = { ativas: 0, vendas: 0 };
    if (vendaG) resEmpMapGoogle[emp].vendas++;
    else resEmpMapGoogle[emp].ativas++;
  }
  const resEmpNamesGoogle = Object.keys(resEmpMapGoogle);
  const strippedResEmpNamesGoogle = resEmpNamesGoogle.map(e => ({ original: e, stripped: stripBrand(e) }));

  // One-to-one mapping: each reservas emp → best Google Ads account
  const resWinnerGoogle: Record<string, { acc_name: string; score: number }> = {};
  for (const acc of filteredGoogleData ?? []) {
    const strippedKey = stripBrand(acc.account_name);
    const exactEntry = strippedResEmpNamesGoogle.find(e => e.stripped.toLowerCase() === strippedKey.toLowerCase());
    if (exactEntry) {
      if (1 > (resWinnerGoogle[exactEntry.original]?.score ?? 0)) {
        resWinnerGoogle[exactEntry.original] = { acc_name: acc.account_name, score: 1 };
      }
    } else if (strippedResEmpNamesGoogle.length > 0) {
      const { match, score } = findBestMatch(strippedKey, strippedResEmpNamesGoogle.map(e => e.stripped));
      if (match && score > (resWinnerGoogle[strippedResEmpNamesGoogle.find(e => e.stripped === match)?.original ?? ""]?.score ?? 0)) {
        const original = strippedResEmpNamesGoogle.find(e => e.stripped === match)?.original;
        if (original) resWinnerGoogle[original] = { acc_name: acc.account_name, score };
      }
    }
  }
  const googleToResKey: Record<string, string> = {};
  for (const [resEmp, { acc_name }] of Object.entries(resWinnerGoogle)) {
    googleToResKey[acc_name] = resEmp;
  }
  const enrichedGoogleData = (filteredGoogleData ?? []).map(acc => {
    const resKey = googleToResKey[acc.account_name] ?? null;
    const resEntry = resKey ? resEmpMapGoogle[resKey] : null;
    return { ...acc, res_ativas: resEntry?.ativas ?? 0, res_vendas: resEntry?.vendas ?? 0, res_emp_key: resKey ?? "" };
  });
  const googleReservasRecords = (reservasData?.records ?? []).filter(r => {
    const origem = String((r as Record<string, unknown>).origem || "").toUpperCase().trim();
    return ORIGENS_GOOGLE.has(origem);
  }) as Record<string, unknown>[];

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
    // One-to-one reservas match (each reservas emp assigned to best-scoring meta account only)
    const resKey = metaToResKey[meta.crm_key] ?? null;
    const resEntry = resKey ? resEmpMap[resKey] : null;
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
      crm_leads:        crm?.total_leads_meta   ?? 0,
      crm_atendimento:  crm?.atendimento_meta   ?? 0,
      crm_reserva:      crm?.reserva_meta       ?? 0,
      crm_ganhos:       crm?.ganhos_meta        ?? 0,
      crm_perdas:       crm?.perdas         ?? 0,
      crm_conversao:    crm?.conversao_rate ?? 0,
      lead_conversion:  meta.total_leads > 0
        ? ((crm?.total_leads ?? 0) / meta.total_leads) * 100
        : 0,
      res_ativas: resEntry?.ativas ?? 0,
      res_vendas: resEntry?.vendas ?? 0,
      res_emp_key: resKey ?? "",
    };
  });

  const stuckCount = analyticsData?.resumo_parados.total_parados_3d ?? 0;

  // Total CRM filtered by selected accounts
  const filteredCrmLeads = selectedAccounts.length === 0
    ? (crmData?.total_leads ?? 0)
    : mergedData.reduce((s, m) => s + m.crm_leads, 0);

  function handleDateChange(range: DateRange) {
    setDateRange(range);
    loadedRef.current.clear();
    fetchForTab(activePage, range, true);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
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
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-3.5 flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">{PAGE_TITLES[activePage]}</h2>
              <p className="text-[11px] text-gray-400 font-medium">
                {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} → {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            {lastUpdated && (
              <span className="text-[11px] text-gray-400 hidden sm:block font-medium">
                Atualizado {format(lastUpdated, "HH:mm", { locale: ptBR })}
              </span>
            )}
            {activePage !== "reservas" && activePage !== "crm" && activePage !== "analytics" && (
              <MultiSelectDropdown
                label="Todas as contas"
                options={accountOptions}
                selected={selectedAccounts}
                onChange={setSelectedAccounts}
              />
            )}
            <button
              onClick={() => { loadedRef.current.clear(); fetchForTab(activePage, dateRange, true); }}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-blue-50 hover:border-blue-200 transition-all disabled:opacity-50"
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
              reservasRecords={(reservasData?.records ?? []).filter(r => {
                const origem = String((r as Record<string, unknown>).origem || "").toUpperCase().trim();
                return ORIGENS_META.has(origem);
              }) as Record<string, unknown>[]}
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
              data={enrichedGoogleData.length > 0 ? enrichedGoogleData : filteredGoogleData}
              crmData={crmData}
              loading={loading}
              dateStart={toISODate(dateRange.start)}
              dateEnd={toISODate(dateRange.end)}
              reservasRecords={googleReservasRecords}
            />
          )}
          {activePage === "analytics" && (
            <AnalyticsSection
              data={analyticsData}
              loading={loading}
              totalLeadsCrm={filteredCrmLeads}
              crmPorOrigem={crmData?.por_origem ?? null}
              crmPorOrigemEmp={crmData?.por_origem_emp ?? null}
              crmPorImobiliariaEmp={crmData?.por_imobiliaria_emp ?? null}
              crmPorOrigemImobiliaria={crmData?.por_origem_imobiliaria ?? null}
              crmPorMidiaUltimoEmp={crmData?.por_midia_ultimo_emp ?? null}
              crmPorMidiaUltimoOrigemEmp={crmData?.por_midia_ultimo_origem_emp ?? null}
              crmPorImobiliariaMidiaOrigemEmp={crmData?.por_imobiliaria_midia_origem_emp ?? null}
              crmPorEmpTotal={crmData ? Object.fromEntries(crmData.por_empreendimento.map(e => [e.empreendimento, e.total_leads])) : null}
              accountCrmKeys={selectedAccounts.length > 0 ? filteredMetaData.map(m => m.crm_key) : null}
            />
          )}
          {activePage === "reservas" && (
            <ReservasSection
              data={reservasData}
              loading={loading}
              dateStart={toISODate(dateRange.start)}
              dateEnd={toISODate(dateRange.end)}
              crmTotalLeads={crmData?.total_leads ?? 0}
              crmLeadsByEmp={crmData?.por_empreendimento ?? []}
              crmPorOrigemEmp={crmData?.por_origem_emp ?? null}
            />
          )}
        </main>
      </div>
    </div>
  );
}
