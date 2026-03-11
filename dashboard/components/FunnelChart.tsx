"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatNumber } from "@/lib/utils";

interface Props {
  porSituacao: Record<string, number>;
  loading?: boolean;
}

const COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1",
  "#14b8a6", "#a855f7",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700">{item.name}</p>
        <p className="text-gray-600">{formatNumber(item.value)} leads</p>
        <p className="text-gray-500">{item.payload.percent?.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export default function FunnelChart({ porSituacao, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-full animate-pulse mx-auto max-w-[200px]" />
      </div>
    );
  }

  const total = Object.values(porSituacao).reduce((a, b) => a + b, 0);

  const chartData = Object.entries(porSituacao)
    .map(([name, value]) => ({ name, value, percent: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Funil CRM por Situação</h3>
      <p className="text-xs text-gray-500 mb-4">Distribuição de {formatNumber(total)} leads</p>
      <ResponsiveContainer width="100%" height={310}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => <span className="text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Ranked list */}
      <div className="mt-2 space-y-1.5">
        {chartData.slice(0, 5).map((item, i) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
            <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
            <span className="text-xs font-semibold text-gray-700">{formatNumber(item.value)}</span>
            <span className="text-xs text-gray-400 w-10 text-right">{item.percent.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
