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
import { META_TO_GOOGLE } from "@/lib/meta-accounts";

interface Props {
  data: MergedData[];
  googleData?: GoogleAdsAccount[] | null;
  loading?: boolean;
}

const SPEND_KEYS = new Set(["meta_spend", "google_spend"]);

const BAR_SERIES = [
  { key: "meta_spend",         name: "Invest. Meta",    color: "#3b82f6", yAxis: "left"  },
  { key: "google_spend",       name: "Invest. Google",  color: "#f59e0b", yAxis: "left"  },
  { key: "crm_leads",          name: "Leads CRM",       color: "#10b981", yAxis: "right" },
  { key: "meta_leads",         name: "Leads Meta",      color: "#8b5cf6", yAxis: "right" },
  { key: "google_conversions", name: "Conv. Google",    color: "#f97316", yAxis: "right" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3.5 text-sm min-w-[180px]">
      <p className="font-semibold text-slate-200 mb-2.5 text-xs uppercase tracking-wide truncate max-w-[200px]">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
              <span className="text-slate-400 text-xs">{p.name}</span>
            </div>
            <span className="font-semibold text-slate-100 text-xs">
              {SPEND_KEYS.has(p.dataKey) ? formatCurrency(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomXAxisTick = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
    <text
      x={0} y={0} dy={4}
      textAnchor="end"
      fill="#94a3b8"
      fontSize={10}
      fontWeight={500}
      transform="rotate(-40)"
    >
      {payload.value}
    </text>
  </g>
);

const CustomLegend = ({ payload }: any) => (
  <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
    {payload?.map((entry: any) => (
      <div key={entry.dataKey} className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: entry.color }} />
        <span className="text-xs text-slate-500 font-medium">{entry.value}</span>
      </div>
    ))}
  </div>
);

export default function SpendLeadsChart({ data, googleData, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="h-72 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const googleMap = new Map<string, { spend: number; conversions: number }>();
  for (const g of googleData ?? []) {
    googleMap.set(g.account_name.toLowerCase().trim(), { spend: g.spend, conversions: g.conversions });
  }

  const sorted = [...data].sort((a, b) => b.meta_spend - a.meta_spend).slice(0, 12);

  const chartData = sorted.map((d) => {
    const rawKey = d.ad_account_name.toLowerCase().trim();
    const gKey   = META_TO_GOOGLE[rawKey] ?? rawKey;
    const g = googleMap.get(gKey) ?? { spend: 0, conversions: 0 };
    return {
      name:               d.empreendimento.replace("Viva Benx ", "VB ").replace("Benx | ", "").substring(0, 22),
      meta_spend:         Math.round(d.meta_spend),
      google_spend:       Math.round(g.spend),
      meta_leads:         d.meta_leads,
      crm_leads:          d.crm_leads,
      google_conversions: Math.round(g.conversions),
    };
  });

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Investimento x Leads por Empreendimento</h3>
          <p className="text-xs text-slate-400 mt-0.5">Top 12 por investimento · Meta + Google</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 100 }} barCategoryGap="25%">
          <defs>
            {BAR_SERIES.map(s => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.65} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
            strokeWidth={1}
          />

          <XAxis
            dataKey="name"
            tick={<CustomXAxisTick />}
            interval={0}
            height={100}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />

          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            width={52}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            width={30}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9", radius: 4 }} />
          <Legend content={<CustomLegend />} />

          {BAR_SERIES.map(s => (
            <Bar
              key={s.key}
              yAxisId={s.yAxis as "left" | "right"}
              dataKey={s.key}
              name={s.name}
              fill={`url(#grad-${s.key})`}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
