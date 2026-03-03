"use client";

import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "teal";
  trend?: number; // percentage change
  loading?: boolean;
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    text: "text-blue-600",
    border: "border-blue-100",
  },
  green: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    text: "text-emerald-600",
    border: "border-emerald-100",
  },
  purple: {
    bg: "bg-violet-50",
    icon: "bg-violet-100 text-violet-600",
    text: "text-violet-600",
    border: "border-violet-100",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "bg-orange-100 text-orange-600",
    text: "text-orange-600",
    border: "border-orange-100",
  },
  red: {
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
    text: "text-red-600",
    border: "border-red-100",
  },
  teal: {
    bg: "bg-teal-50",
    icon: "bg-teal-100 text-teal-600",
    text: "text-teal-600",
    border: "border-teal-100",
  },
};

export default function KPICard({ title, value, subtitle, icon: Icon, color = "blue", trend, loading }: Props) {
  const colors = colorMap[color];

  if (loading) {
    return (
      <div className={cn("bg-white rounded-2xl p-5 border shadow-sm animate-pulse overflow-hidden min-w-0", colors.border)}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className={cn("w-10 h-10 rounded-xl", colors.icon)} />
        </div>
        <div className="h-7 bg-gray-200 rounded w-32 mb-1" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow overflow-hidden min-w-0", colors.border)}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{title}</p>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className={cn("text-lg xl:text-xl 2xl:text-2xl font-bold leading-tight break-words", colors.text)}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        {trend !== undefined && (
          <div className={cn("flex items-center gap-0.5 text-xs font-medium",
            trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-gray-400"
          )}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
