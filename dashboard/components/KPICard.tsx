"use client";

import { LucideIcon, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  tooltip?: string;
  tooltipAlign?: "left" | "right";
  icon: LucideIcon;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "teal";
  trend?: number;
  loading?: boolean;
}

const colorMap = {
  blue:   { bar: "from-blue-500 to-blue-400",      icon: "from-blue-600 to-blue-400",      ring: "ring-blue-100" },
  green:  { bar: "from-emerald-500 to-emerald-400", icon: "from-emerald-600 to-emerald-400", ring: "ring-emerald-100" },
  purple: { bar: "from-violet-500 to-violet-400",   icon: "from-violet-600 to-violet-400",   ring: "ring-violet-100" },
  orange: { bar: "from-orange-500 to-amber-400",    icon: "from-orange-600 to-amber-400",    ring: "ring-orange-100" },
  red:    { bar: "from-rose-500 to-red-400",         icon: "from-rose-600 to-red-400",         ring: "ring-rose-100" },
  teal:   { bar: "from-teal-500 to-cyan-400",        icon: "from-teal-600 to-cyan-400",        ring: "ring-teal-100" },
};

export default function KPICard({ title, value, subtitle, tooltip, tooltipAlign = "left", icon: Icon, color = "blue", trend, loading }: Props) {
  const c = colorMap[color];

  if (loading) {
    return (
      <div className="bg-white rounded-xl overflow-hidden shadow-sm ring-1 ring-gray-100 min-w-0">
        <div className="h-1 w-full bg-gray-200 animate-pulse" />
        <div className="p-4 animate-pulse space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="w-9 h-9 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-7 bg-gray-200 rounded w-28" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm ring-1 hover:shadow-md transition-all duration-300 min-w-0 group",
      c.ring
    )}>
      {/* Gradient accent bar */}
      <div className={cn("h-1 w-full bg-gradient-to-r rounded-t-xl", c.bar)} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-tight pt-0.5 truncate">
            {title}
          </p>
          <div className={cn(
            "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300",
            c.icon
          )}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Value */}
        <p className="text-xl font-extrabold text-gray-900 leading-tight truncate">
          {value}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between gap-1.5 mt-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {subtitle && (
            <p className="text-xs text-gray-400 truncate">{subtitle}</p>
          )}
          {trend !== undefined && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
              trend > 0  ? "bg-emerald-50 text-emerald-600" :
              trend < 0  ? "bg-red-50 text-red-500" :
                           "bg-gray-100 text-gray-400"
            )}>
              {trend > 0 ? <TrendingUp className="w-2.5 h-2.5" />
               : trend < 0 ? <TrendingDown className="w-2.5 h-2.5" />
               : <Minus className="w-2.5 h-2.5" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          </div>
          {tooltip && (
            <div className="relative flex-shrink-0 group/info">
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
              <div className={cn("absolute bottom-full mb-2 z-[9999] hidden group-hover/info:block w-56 pointer-events-none", tooltipAlign === "right" ? "right-0" : "left-0")}>
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl leading-relaxed text-center">
                  {tooltip}
                  <div className={cn("absolute top-full border-4 border-transparent border-t-gray-900", tooltipAlign === "right" ? "right-3" : "left-3")} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
