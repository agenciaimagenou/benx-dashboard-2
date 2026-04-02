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
  reservasRecords?: Record<string, unknown>[];
}

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3.5 text-sm min-w-[160px]">
      <p className="font-bold text-slate-200 mb-2 text-xs uppercase tracking-wide truncate max-w-[180px]">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
              <span className="text-slate-400 text-xs">{p.name}</span>
            </div>
            <span className="font-semibold text-slate-100 text-xs">
              {p.dataKey === "total_spend" ? formatCurrency(p.value) : formatNumber(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function MetaAdsSection({ metaData, mergedData, loading, dateStart, dateEnd, reservasRecords }: Props) {
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
          tooltip="Total investido no Meta Ads (Facebook/Instagram) no período, somando todas as contas ativas."
          icon={DollarSign} color="blue" loading={loading} />
        <KPICard title="Impressões" value={formatNumber(totalImpressions)}
          tooltip="Número total de vezes que os anúncios foram exibidos para usuários no Meta Ads."
          icon={Eye} color="purple" loading={loading} />
        <KPICard title="Cliques" value={formatNumber(totalClicks)}
          tooltip="Total de cliques nos anúncios do Meta Ads no período selecionado."
          icon={MousePointerClick} color="teal" loading={loading} />
        <KPICard title="Leads (actions)" value={formatNumber(totalLeads)}
          subtitle="action_type: lead"
          tooltip="Total de leads gerados pelos formulários de lead do Meta Ads (contabilizados como action_type: lead)."
          icon={Users} color="orange" loading={loading} />
        <KPICard title="CPL Médio" value={formatCurrency(avgCpl)}
          subtitle="Investimento / leads"
          tooltip="Custo médio por lead no Meta Ads: total investido dividido pelo total de leads gerados no período."
          icon={Target} color="red" loading={loading} />
        <KPICard title="CTR Médio" value={formatPercent(avgCtr)}
          tooltip="Taxa de clique média: percentual de impressões que resultaram em clique nos anúncios do Meta Ads."
          tooltipAlign="right"
          icon={TrendingUp} color="green" loading={loading} />
      </div>

      {/* Spend + Leads chart + CPL ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-0.5">Investimento x Leads por Conta</h3>
          <p className="text-xs text-slate-400 mb-5">Todas as {metaData.length} contas</p>
          {loading ? (
            <div className="h-72 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 90 }} barCategoryGap="30%">
                <defs>
                  <linearGradient id="grad-spend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="grad-leads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} strokeWidth={1} />
                <XAxis
                  dataKey="name"
                  tick={({ x, y, payload }: any) => (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={4} textAnchor="end" fill="#94a3b8" fontSize={9} fontWeight={500} transform="rotate(-40)">{payload.value}</text>
                    </g>
                  )}
                  interval={0} height={90}
                  axisLine={{ stroke: "#e2e8f0" }} tickLine={false}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} width={50} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} width={30} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipContent />} cursor={{ fill: "#f1f5f9", radius: 4 }} />
                <Legend
                  wrapperStyle={{ paddingTop: 8 }}
                  formatter={(v) => <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{v === "Valor Gasto" ? "Investimento" : "Leads"}</span>}
                />
                <Bar yAxisId="left"  dataKey="total_spend" fill="url(#grad-spend)" name="Valor Gasto" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar yAxisId="right" dataKey="total_leads" fill="url(#grad-leads)" name="Leads"       radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CPL Ranking */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Ranking de CPL</h3>
              <p className="text-xs text-slate-400 mt-0.5">Menor custo por lead = mais eficiente</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold">
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">● &lt; R$200</span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600">● &lt; R$500</span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-500">● alto</span>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({length: 8}).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-1.5 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="w-16 h-5 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}</div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[320px] pr-1">
              {cplRanking.map((m, i) => {
                const pct = (m.cost_per_lead / maxCpl) * 100;
                const isLow  = m.cost_per_lead < 200;
                const isMid  = m.cost_per_lead >= 200 && m.cost_per_lead < 500;
                const barGrad = isLow  ? "from-emerald-400 to-emerald-300"
                              : isMid  ? "from-amber-400 to-yellow-300"
                              :          "from-red-400 to-rose-300";
                const pillBg  = isLow  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : isMid  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              :          "bg-red-50 text-red-600 ring-1 ring-red-200";
                const rankBg  = i === 0 ? "bg-amber-400 text-white shadow-amber-200"
                              : i === 1 ? "bg-slate-400 text-white shadow-slate-200"
                              : i === 2 ? "bg-orange-400 text-white shadow-orange-200"
                              :           "bg-slate-100 text-slate-500";
                return (
                  <div
                    key={m.ad_account_id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors duration-150"
                  >
                    {/* Rank badge */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 shadow-sm ${rankBg}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px] group-hover:text-slate-900">
                          {m.crm_key}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">{m.total_leads} leads</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${barGrad} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* CPL pill */}
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${pillBg}`}>
                      {formatCurrency(m.cost_per_lead)}
                    </span>
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
      <MergedTable data={mergedData} loading={loading} dateStart={dateStart} dateEnd={dateEnd} reservasRecords={reservasRecords} />
    </div>
  );
}
