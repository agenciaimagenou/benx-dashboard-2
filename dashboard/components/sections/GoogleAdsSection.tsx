"use client";

import { Eye, MousePointerClick, Target, TrendingUp, Zap } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import KPICard from "@/components/KPICard";

export interface GoogleAdsAccount {
  account_id:   string;
  account_name: string;
  impressions:  number;
  clicks:       number;
  ctr:          number;
  avg_cpc:      number;
  avg_cpm:      number;
  spend:        number;
  conversions:  number;
  interactions: number;
  cpl:          number;
  campaigns: Array<{
    id:          string;
    name:        string;
    impressions: number;
    clicks:      number;
    ctr:         number;
    avg_cpc:     number;
    spend:       number;
    conversions: number;
  }>;
}

interface Props {
  data:    GoogleAdsAccount[] | null;
  loading: boolean;
}

export default function GoogleAdsSection({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <KPICard key={i} title="" value="" icon={Eye} loading={true} />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
          <div className="h-8 bg-gray-100 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Nenhum dado do Google Ads encontrado para o período selecionado.
      </div>
    );
  }

  // Totals
  const totals = data.reduce(
    (acc, a) => ({
      spend:       acc.spend       + a.spend,
      impressions: acc.impressions + a.impressions,
      clicks:      acc.clicks      + a.clicks,
      conversions: acc.conversions + a.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const totalCpl = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  const totalCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard title="Impressões"  value={formatNumber(totals.impressions)}
          subtitle={`${data.length} contas ativas`}
          icon={Eye} color="purple" loading={loading} />
        <KPICard title="Cliques"     value={formatNumber(totals.clicks)}
          subtitle={`CTR ${totalCtr.toFixed(2)}%`}
          icon={MousePointerClick} color="teal" loading={loading} />
        <KPICard title="Conversões"  value={formatNumber(Math.round(totals.conversions))}
          icon={Zap} color="orange" loading={loading} />
        <KPICard title="CPL"         value={formatCurrency(totalCpl)}
          subtitle="Custo por conversão"
          icon={Target} color="red" loading={loading} />
        <KPICard title="CPC Médio"   value={formatCurrency(totalCpc)}
          icon={TrendingUp} color="green" loading={loading} />
      </div>

      {/* Accounts table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800">Contas Google Ads</h3>
          <p className="text-xs text-gray-400 mt-0.5">{data.length} contas com dados no período</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Conta", "Valor Gasto", "Impressões", "Cliques", "CTR", "CPC", "CPM", "Conversões", "CPL"].map(h => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${
                      h === "Conta" ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((account, i) => (
                <tr key={account.account_id} className={`transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? "bg-white" : "bg-gray-100"}`}>
                  <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[200px]">{account.account_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(account.spend)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatNumber(account.impressions)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatNumber(account.clicks)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{account.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(account.avg_cpc)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatCurrency(account.avg_cpm)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{Math.round(account.conversions)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{account.conversions > 0 ? formatCurrency(account.cpl) : "—"}</td>
                </tr>
              ))}
            </tbody>

            {/* Totals row */}
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(totals.spend)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{formatNumber(totals.impressions)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{formatNumber(totals.clicks)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{totalCtr.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{formatCurrency(totalCpc)}</td>
                <td className="px-4 py-3 text-right text-gray-400">—</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{Math.round(totals.conversions)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{formatCurrency(totalCpl)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
