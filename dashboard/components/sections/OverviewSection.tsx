"use client";

import { DollarSign, Users, MousePointerClick, TrendingUp, Eye, Target, Award, Search, Zap } from "lucide-react";
import KPICard from "@/components/KPICard";
import SpendLeadsChart from "@/components/SpendLeadsChart";
import FunnelChart from "@/components/FunnelChart";
import { MergedData, MetaSummaryByAccount } from "@/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { GoogleAdsAccount } from "@/components/sections/GoogleAdsSection";

interface CRMSummary {
  total_leads: number;
  total_novo: number;
  total_retorno: number;
  por_situacao: Record<string, number>;
  por_empreendimento: Array<{ ganhos: number; reserva: number }>;
}

interface Props {
  metaData: MetaSummaryByAccount[];
  crmData: CRMSummary | null;
  mergedData: MergedData[];
  googleData: GoogleAdsAccount[] | null;
  loading: boolean;
}

export default function OverviewSection({ metaData, crmData, mergedData, googleData, loading }: Props) {
  const totalSpend = metaData.reduce((s, m) => s + m.total_spend, 0);
  const totalMetaLeads = metaData.reduce((s, m) => s + m.total_leads, 0);
  const totalImpressions = metaData.reduce((s, m) => s + m.total_impressions, 0);
  const totalClicks = metaData.reduce((s, m) => s + m.total_clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpl = totalMetaLeads > 0 ? totalSpend / totalMetaLeads : 0;
  const totalCrmLeads = crmData?.total_leads ?? 0;
  const totalNovo = crmData?.total_novo ?? 0;
  const totalRetorno = crmData?.total_retorno ?? 0;
  const totalDescartado = crmData?.por_situacao?.["Descartado"] ?? 0;
  const totalVencido = crmData?.por_situacao?.["Vencido"] ?? 0;

  // Google Ads totals
  const gTotals = (googleData ?? []).reduce(
    (acc, a) => ({
      spend:       acc.spend       + a.spend,
      impressions: acc.impressions + a.impressions,
      clicks:      acc.clicks      + a.clicks,
      conversions: acc.conversions + a.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );
  const gCtr = gTotals.impressions > 0 ? (gTotals.clicks / gTotals.impressions) * 100 : 0;
  const gCpl = gTotals.conversions > 0 ? gTotals.spend / gTotals.conversions : 0;
  const gCpc = gTotals.clicks > 0 ? gTotals.spend / gTotals.clicks : 0;
  const totalGanhos = crmData?.por_empreendimento.reduce((s, e) => s + e.ganhos, 0) ?? 0;
  const totalReservas = crmData?.por_empreendimento.reduce((s, e) => s + e.reserva, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Meta KPIs */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-sm font-bold">f</span>
            <span className="text-xs font-bold uppercase tracking-widest">Meta Ads</span>
          </div>
          <div className="flex-1 h-px bg-blue-100" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard title="Valor Gasto" value={formatCurrency(totalSpend)}
            subtitle={`${metaData.filter(m => m.total_spend > 0).length} contas ativas`}
            tooltip="Total investido no Meta Ads (Facebook/Instagram) no período, somando todas as contas ativas."
            icon={DollarSign} color="blue" loading={loading} />
          <KPICard title="Impressões" value={formatNumber(totalImpressions)}
            tooltip="Número total de vezes que os anúncios foram exibidos para usuários no Meta Ads."
            icon={Eye} color="purple" loading={loading} />
          <KPICard title="Cliques" value={formatNumber(totalClicks)}
            subtitle={`CTR ${formatPercent(avgCtr)}`}
            tooltip="Total de cliques nos anúncios do Meta Ads. O CTR indica a % de impressões que geraram clique."
            icon={MousePointerClick} color="teal" loading={loading} />
          <KPICard title="Leads Meta" value={formatNumber(totalMetaLeads)}
            tooltip="Total de leads gerados diretamente pelos formulários de lead do Meta Ads no período."
            icon={Users} color="orange" loading={loading} />
          <KPICard title="CPL Médio" value={formatCurrency(avgCpl)}
            subtitle="Custo por lead"
            tooltip="Custo médio por lead no Meta Ads: total gasto dividido pelo total de leads gerados."
            icon={Target} color="red" loading={loading} />
          <KPICard title="CTR Médio" value={formatPercent(avgCtr)}
            subtitle="Click-through rate"
            tooltip="Taxa de clique média: percentual de impressões que resultaram em clique nos anúncios do Meta Ads."
            tooltipAlign="right"
            icon={TrendingUp} color="green" loading={loading} />
        </div>
      </div>

      {/* Google Ads KPIs */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-green-700 text-white px-3 py-1.5 rounded-lg shadow-sm">
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-widest">Google Ads</span>
          </div>
          <div className="flex-1 h-px bg-green-100" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard title="Valor Gasto" value={formatCurrency(gTotals.spend)}
            subtitle={`${(googleData ?? []).length} contas ativas`}
            tooltip="Total investido no Google Ads no período, somando todas as contas ativas."
            icon={DollarSign} color="blue" loading={loading} />
          <KPICard title="Impressões" value={formatNumber(gTotals.impressions)}
            tooltip="Número total de vezes que os anúncios foram exibidos para usuários no Google Ads."
            icon={Eye} color="purple" loading={loading} />
          <KPICard title="Cliques" value={formatNumber(gTotals.clicks)}
            subtitle={`CTR ${gCtr.toFixed(2)}%`}
            tooltip="Total de cliques nos anúncios do Google Ads. O CTR indica a % de impressões que geraram clique."
            icon={MousePointerClick} color="teal" loading={loading} />
          <KPICard title="Conversões" value={formatNumber(Math.round(gTotals.conversions))}
            tooltip="Total de conversões registradas no Google Ads (geralmente leads ou ações configuradas como conversão)."
            icon={Zap} color="orange" loading={loading} />
          <KPICard title="CPL" value={formatCurrency(gCpl)}
            subtitle="Custo por conversão"
            tooltip="Custo por conversão no Google Ads: total gasto dividido pelo total de conversões no período."
            icon={Target} color="red" loading={loading} />
          <KPICard title="CPC Médio" value={formatCurrency(gCpc)}
            tooltip="Custo médio por clique no Google Ads: total gasto dividido pelo total de cliques."
            tooltipAlign="right"
            icon={TrendingUp} color="green" loading={loading} />
        </div>
      </div>

      {/* CRM KPIs */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg shadow-sm">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-widest">CRM</span>
          </div>
          <div className="flex-1 h-px bg-emerald-100" />
        </div>
        {/* Linha 1 — Volume de leads */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
          <KPICard title="Leads CRM" value={formatNumber(totalCrmLeads)}
            subtitle="Total no período"
            tooltip="Total de leads recebidos no CRM no período selecionado, independente do status atual."
            icon={Users} color="green" loading={loading} />
          <KPICard title="Leads Novos" value={formatNumber(totalNovo)}
            subtitle={totalCrmLeads > 0 ? `${((totalNovo / totalCrmLeads) * 100).toFixed(1)}% dos leads` : "—"}
            tooltip="Leads que entraram pela primeira vez no CRM no período. Nunca tiveram contato anterior com a empresa."
            icon={Users} color="teal" loading={loading} />
          <KPICard title="Leads Retorno" value={formatNumber(totalRetorno)}
            subtitle={totalCrmLeads > 0 ? `${((totalRetorno / totalCrmLeads) * 100).toFixed(1)}% dos leads` : "—"}
            tooltip="Leads que já estiveram no CRM anteriormente e retornaram com novo interesse no período."
            icon={Users} color="purple" loading={loading} />
          <KPICard title="Descartados" value={formatNumber(totalDescartado)}
            subtitle={totalCrmLeads > 0 ? `${((totalDescartado / totalCrmLeads) * 100).toFixed(1)}% dos leads` : "—"}
            tooltip="Leads removidos do funil ativo no período, com ou sem motivo de descarte registrado."
            icon={Users} color="red" loading={loading} />
          <KPICard title="Vencidos" value={formatNumber(totalVencido)}
            subtitle={totalCrmLeads > 0 ? `${((totalVencido / totalCrmLeads) * 100).toFixed(1)}% dos leads` : "—"}
            tooltip="Leads que tiveram o prazo de atendimento expirado sem conversão ou descarte no período."
            tooltipAlign="right"
            icon={Users} color="orange" loading={loading} />
        </div>
        {/* Linha 2 — Conversão e custo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KPICard title="Reservas" value={formatNumber(totalReservas)}
            subtitle={totalCrmLeads > 0 ? `${((totalReservas / totalCrmLeads) * 100).toFixed(1)}% dos leads` : "—"}
            tooltip="Leads que chegaram à etapa de Reserva no CRM no período selecionado."
            icon={Award} color="orange" loading={loading} />
          <KPICard title="Vendas" value={formatNumber(totalGanhos)}
            subtitle={totalCrmLeads > 0 ? `${((totalGanhos / totalCrmLeads) * 100).toFixed(1)}% conversão` : "—"}
            tooltip="Leads marcados como Ganho (venda concluída) no CRM no período selecionado."
            icon={TrendingUp} color="green" loading={loading} />
          <KPICard title="CPL Real (CRM)" value={totalCrmLeads > 0 ? formatCurrency((totalSpend + gTotals.spend) / totalCrmLeads) : "—"}
            subtitle="Investimento / leads CRM"
            tooltip="Custo por lead real: total investido em Meta Ads + Google Ads dividido pelo total de leads no CRM."
            tooltipAlign="right"
            icon={Target} color="blue" loading={loading} />
        </div>
      </div>

      {/* Charts */}
      <SpendLeadsChart data={mergedData} googleData={googleData} loading={loading} />
      <FunnelChart porSituacao={crmData?.por_situacao ?? {}} loading={loading} />
    </div>
  );
}
