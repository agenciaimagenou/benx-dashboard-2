"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "@/types";
import { toISODate } from "@/lib/utils";

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: "Hoje", days: 0 },
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 15 dias", days: 15 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Este mês", days: -1 },
  { label: "Últimos 90 dias", days: 90 },
];

function getPresetRange(days: number): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  const start = new Date();
  if (days === 0) {
    start.setHours(0, 0, 0, 0);
  } else if (days === -1) {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(toISODate(value.start));
  const [customEnd, setCustomEnd] = useState(toISODate(value.end));

  const label = `${format(value.start, "dd/MM/yyyy", { locale: ptBR })} → ${format(
    value.end,
    "dd/MM/yyyy",
    { locale: ptBR }
  )}`;

  function applyCustom() {
    if (customStart && customEnd) {
      onChange({ start: new Date(customStart + "T00:00:00"), end: new Date(customEnd + "T23:59:59") });
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
      >
        <Calendar className="w-4 h-4 text-blue-500" />
        <span>{label}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Períodos rápidos
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  const range = getPresetRange(p.days);
                  onChange(range);
                  setCustomStart(toISODate(range.start));
                  setCustomEnd(toISODate(range.end));
                  setOpen(false);
                }}
                className="text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-left transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Personalizado
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={applyCustom}
              className="mt-2 w-full bg-blue-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
