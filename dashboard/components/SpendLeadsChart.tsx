"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MergedData } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { GoogleAdsAccount } from "@/components/sections/GoogleAdsSection";

interface Props {
  data: MergedData[];
  googleData?: GoogleAdsAccount[] | null;
  loading?: boolean;
}

const SPEND_KEYS = new Set(["meta_spend", "google_spend"]);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-2 max-w-[200px] truncate">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} />
            <span className="text-gray-600">{p.name}:</span>
            <span className="font-medium text-gray-800">
              {SPEND_KEYS.has(p.dataKey) ? formatCurrency(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomXAxisTick = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
    <text
      x={0}
      y={0}
      dy={4}
      textAnchor="end"
      fill="#4b5563"
      fontSize={11}
      fontWeight={500}
      transform="rotate(-45)"
    >
      {payload.value}
    </text>
  </g>
);

export default function SpendLeadsChart({ data, googleData, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  // Explicit mapping for Meta → Google name mismatches
  const META_TO_GOOGLE: Record<string, string> = {
    "benx | 1800 oscar":       "benx | 1800 oscar pinheiros",
    "viva benx | pompeia":     "viva benx | pompéia",
    "benx | j329":             "benx | j329 itaim",
    "lisbo pinheiros":         "benx | lisbô pinheiros",
  };

  // Build Google Ads lookup by account_name (normalized)
  const googleMap = new Map<string, { spend: number; conversions: number }>();
  for (const g of googleData ?? []) {
    googleMap.set(g.account_name.toLowerCase().trim(), { spend: g.spend, conversions: g.conversions });
  }

  const sorted = [...data]
    .sort((a, b) => b.meta_spend - a.meta_spend)
    .slice(0, 12);

  const chartData = sorted.map((d) => {
    const rawKey = d.ad_account_name.toLowerCase().trim();
    const gKey   = META_TO_GOOGLE[rawKey] ?? rawKey;
    const g = googleMap.get(gKey) ?? { spend: 0, conversions: 0 };
    return {
      name: d.empreendimento.replace("Viva Benx ", "VB ").replace("Benx | ", "").substring(0, 24),
      meta_spend:        Math.round(d.meta_spend),
      google_spend:      Math.round(g.spend),
      meta_leads:        d.meta_leads,
      crm_leads:         d.crm_leads,
      google_conversions: Math.round(g.conversions),
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Investimento x Leads por Empreendimento</h3>
      <p className="text-xs text-gray-500 mb-5">Top 12 por investimento</p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 110 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={<CustomXAxisTick />}
            interval={0}
            height={110}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            width={55}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => value}
          />
          <Bar yAxisId="left"  dataKey="meta_spend"         fill="#3b82f6" name="Investimento Meta (R$)"   radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left"  dataKey="google_spend"        fill="#f59e0b" name="Investimento Google (R$)" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="crm_leads"           fill="#10b981" name="Leads CRM"                radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="meta_leads"          fill="#8b5cf6" name="Leads Meta"               radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="google_conversions"  fill="#f97316" name="Conversões Google"        radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
