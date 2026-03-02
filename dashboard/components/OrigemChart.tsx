"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface Props {
  porOrigem: Record<string, number>;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-gray-600">{formatNumber(payload[0].value)} leads</p>
      </div>
    );
  }
  return null;
};

export default function OrigemChart({ porOrigem, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const chartData = Object.entries(porOrigem)
    .map(([name, value]) => ({ name: name || "Não definido", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Leads por Origem (CRM)</h3>
      <p className="text-xs text-gray-500 mb-5">Top 10 origens</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            width={110}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Leads" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
