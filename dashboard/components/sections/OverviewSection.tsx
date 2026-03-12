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
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center text-[10px] font-bold">f</span>
          Meta Ads
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard title="Valor Gasto" value={formatCurrency(totalSpend)}
            subtitle={`${metaData.filter(m => m.total_spend > 0).length} contas ativas`}
            icon={DollarSign} color="blue" loading={loading} />
          <KPICard title="Impressões" value={formatNumber(totalImpressions)}
            icon={Eye} color="purple" loading={loading} />
          <KPICard title="Cliques" value={formatNumber(totalClicks)}
            subtitle={`CTR ${formatPercent(avgCtr)}`}
            icon={MousePointerClick} color="teal" loading={loading} />
          <KPICard title="Leads Meta" value={formatNumber(totalMetaLeads)}
            icon={Users} color="orange" loading={loading} />
          <KPICard title="CPL Médio" value={formatCurrency(avgCpl)}
            subtitle="Custo por lead"
            icon={Target} color="red" loading={loading} />
          <KPICard title="CTR Médio" value={formatPercent(avgCtr)}
            subtitle="Click-through rate"
            icon={TrendingUp} color="green" loading={loading} />
        </div>
      </div>

      {/* Google Ads KPIs */}
      <div>
        <p className="text-xs font-semibold text-green-700 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-green-100 rounded-md flex items-center justify-center">
            <Search className="w-3 h-3" />
          </span>
          Google Ads
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard title="Valor Gasto" value={formatCurrency(gTotals.spend)}
            subtitle={`${(googleData ?? []).length} contas ativas`}
            icon={DollarSign} color="blue" loading={loading} />
          <KPICard title="Impressões" value={formatNumber(gTotals.impressions)}
            icon={Eye} color="purple" loading={loading} />
          <KPICard title="Cliques" value={formatNumber(gTotals.clicks)}
            subtitle={`CTR ${gCtr.toFixed(2)}%`}
            icon={MousePointerClick} color="teal" loading={loading} />
          <KPICard title="Conversões" value={formatNumber(Math.round(gTotals.conversions))}
            icon={Zap} color="orange" loading={loading} />
          <KPICard title="CPL" value={formatCurrency(gCpl)}
            subtitle="Custo por conversão"
            icon={Target} color="red" loading={loading} />
          <KPICard title="CPC Médio" value={formatCurrency(gCpc)}
            icon={TrendingUp} color="green" loading={loading} />
        </div>
      </div>

      {/* CRM KPIs */}
      <div>
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center">
            <Users className="w-3 h-3" />
          </span>
          CRM
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard title="Leads CRM" value={formatNumber(totalCrmLeads)}
            subtitle="Total no período"
            icon={Users} color="green" loading={loading} />
          <KPICard title="Reservas" value={formatNumber(totalReservas)}
            subtitle={totalCrmLeads > 0 ? `${((totalReservas / totalCrmLeads) * 100).toFixed(1)}% dos leads` : "—"}
            icon={Award} color="orange" loading={loading} />
          <KPICard title="Ganhos (Vendas)" value={formatNumber(totalGanhos)}
            subtitle={totalCrmLeads > 0 ? `${((totalGanhos / totalCrmLeads) * 100).toFixed(1)}% conversão` : "—"}
            icon={TrendingUp} color="green" loading={loading} />
          <KPICard title="CPL Real (CRM)" value={totalCrmLeads > 0 ? formatCurrency(totalSpend / totalCrmLeads) : "—"}
            subtitle="Investimento / leads CRM"
            icon={Target} color="blue" loading={loading} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SpendLeadsChart data={mergedData} googleData={googleData} loading={loading} />
        </div>
        <FunnelChart porSituacao={crmData?.por_situacao ?? {}} loading={loading} />
      </div>
    </div>
  );
}
