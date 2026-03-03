"use client";

import { DollarSign, Users, Eye, Target, TrendingUp, MousePointerClick } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import KPICard from "@/components/KPICard";
import MergedTable from "@/components/MergedTable";
import { MergedData, MetaSummaryByAccount } from "@/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

interface Props {
  metaData: MetaSummaryByAccount[];
  mergedData: MergedData[];
  loading: boolean;
  dateStart?: string;
  dateEnd?: string;
}

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1 max-w-[180px] truncate">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-800">
            {p.dataKey === "total_spend" ? formatCurrency(p.value) : formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function MetaAdsSection({ metaData, mergedData, loading, dateStart, dateEnd }: Props) {
  const totalSpend = metaData.reduce((s, m) => s + m.total_spend, 0);
  const totalLeads = metaData.reduce((s, m) => s + m.total_leads, 0);
  const totalImpressions = metaData.reduce((s, m) => s + m.total_impressions, 0);
  const totalClicks = metaData.reduce((s, m) => s + m.total_clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const activeAccounts = metaData.filter(m => m.total_spend > 0).length;

  // Chart data — by account
  const chartData = [...metaData]
    .sort((a, b) => b.total_spend - a.total_spend)
    .map(m => ({
      name: m.ad_account_name.replace("VIVA BENX | ", "VB ").replace("BENX | ", "").substring(0, 22),
      total_spend: Math.round(m.total_spend),
      total_leads: m.total_leads,
    }));

  // CPL ranking
  const cplRanking = [...metaData]
    .filter(m => m.cost_per_lead > 0)
    .sort((a, b) => a.cost_per_lead - b.cost_per_lead);
  const maxCpl = cplRanking.length > 0 ? Math.max(...cplRanking.map(m => m.cost_per_lead)) : 1;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Investimento Total" value={formatCurrency(totalSpend)}
          subtitle={`${activeAccounts} contas ativas`}
          icon={DollarSign} color="blue" loading={loading} />
        <KPICard title="Impressões" value={formatNumber(totalImpressions)}
          icon={Eye} color="purple" loading={loading} />
        <KPICard title="Cliques" value={formatNumber(totalClicks)}
          icon={MousePointerClick} color="teal" loading={loading} />
        <KPICard title="Leads (actions)" value={formatNumber(totalLeads)}
          subtitle="action_type: lead"
          icon={Users} color="orange" loading={loading} />
        <KPICard title="CPL Médio" value={formatCurrency(avgCpl)}
          subtitle="Investimento / leads"
          icon={Target} color="red" loading={loading} />
        <KPICard title="CTR Médio" value={formatPercent(avgCtr)}
          icon={TrendingUp} color="green" loading={loading} />
      </div>

      {/* Spend + Leads chart + CPL ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Investimento x Leads por Conta</h3>
          <p className="text-xs text-gray-500 mb-5">Todas as {metaData.length} contas</p>
          {loading ? (
            <div className="h-72 bg-gray-100 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={({ x, y, payload }: any) => (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={4} textAnchor="end" fill="#6b7280" fontSize={9} transform="rotate(-45)">{payload.value}</text>
                  </g>
                )} interval={0} height={90} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={50} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#6b7280" }} width={30} />
                <Tooltip content={<TooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  formatter={v => v === "Valor Gasto" ? "Investimento" : "Leads"} />
                <Bar yAxisId="left" dataKey="total_spend" fill="#3b82f6" name="Valor Gasto" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="total_leads" fill="#f59e0b" name="Leads" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CPL Ranking */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-1">Ranking de CPL</h3>
          <p className="text-xs text-gray-500 mb-4">Menor = mais eficiente</p>
          {loading ? (
            <div className="space-y-2">{Array.from({length: 8}).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[260px] pr-1">
              {cplRanking.map((m, i) => {
                const pct = (m.cost_per_lead / maxCpl) * 100;
                const color = m.cost_per_lead < 200 ? "bg-emerald-400" : m.cost_per_lead < 500 ? "bg-orange-400" : "bg-red-400";
                const textColor = m.cost_per_lead < 200 ? "text-emerald-600" : m.cost_per_lead < 500 ? "text-orange-500" : "text-red-500";
                return (
                  <div key={m.ad_account_id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-gray-400 w-4">{i + 1}.</span>
                        <span className="text-gray-700 truncate max-w-[160px]">
                          {m.crm_key}
                        </span>
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-gray-400">{m.total_leads} leads</span>
                        <span className={`font-semibold ${textColor}`}>{formatCurrency(m.cost_per_lead)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {cplRanking.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados no período</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full merged table */}
      <MergedTable data={mergedData} loading={loading} dateStart={dateStart} dateEnd={dateEnd} />
    </div>
  );
}
