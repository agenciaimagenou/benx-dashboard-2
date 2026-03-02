"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { XCircle } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

interface MotivoDescarte {
  motivo: string;
  descricao: string;
  submotivo: string;
  empreendimento: string;
  count: number;
}

interface Props {
  data: MotivoDescarte[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm max-w-[220px]">
        <p className="font-semibold text-gray-700 text-xs mb-1">{label}</p>
        <p className="text-red-600 font-medium">{formatNumber(payload[0].value)} descartados</p>
      </div>
    );
  }
  return null;
};

export default function DiscardReasonsChart({ data, loading }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [filterEmp, setFilterEmp] = useState("Todos");

  const empreendimentos = ["Todos", ...Array.from(new Set(data.map((d) => d.empreendimento))).sort()];

  const filtered = filterEmp === "Todos" ? data : data.filter((d) => d.empreendimento === filterEmp);

  // Aggregate by motivo
  const byMotivo: Record<string, number> = {};
  for (const d of filtered) {
    const key = d.descricao || d.motivo || "Não informado";
    byMotivo[key] = (byMotivo[key] || 0) + d.count;
  }
  const chartData = Object.entries(byMotivo)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-50">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <div>
              <h3 className="font-semibold text-gray-800">Motivos de Descarte</h3>
              <p className="text-xs text-gray-500 mt-0.5">{formatNumber(total)} leads descartados no período</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterEmp}
              onChange={(e) => setFilterEmp(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none max-w-[160px]"
            >
              {empreendimentos.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["chart", "table"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "text-xs px-3 py-1.5 transition-colors",
                    view === v ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {v === "chart" ? "Gráfico" : "Tabela"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum descarte registrado no período</p>
        </div>
      ) : view === "chart" ? (
        <div className="p-5">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                width={140}
                tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 22) + "…" : v}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} name="Descartados" label={{ position: "right", fontSize: 10, fill: "#6b7280" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Motivo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Submotivo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Empreendimento</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtde</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.slice(0, 50).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">{row.motivo || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{row.descricao || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{row.submotivo || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{row.empreendimento}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold text-red-600">{row.count}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                    {total > 0 ? ((row.count / total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
