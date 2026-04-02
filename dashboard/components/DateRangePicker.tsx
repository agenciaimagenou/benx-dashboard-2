"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "@/types";

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
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 23, 59, 59);
  const end = days === 0 ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59) : yesterday;
  const start = new Date();
  if (days === 0) {
    start.setHours(0, 0, 0, 0);
  } else if (days === -1) {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(today.getDate() - days);
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date(value.start));
  const [tempStart, setTempStart] = useState<Date | null>(value.start);
  const [tempEnd, setTempEnd] = useState<Date | null>(value.end);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const label = `${format(value.start, "dd/MM/yyyy", { locale: ptBR })} → ${format(
    value.end,
    "dd/MM/yyyy",
    { locale: ptBR }
  )}`;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const days = Array.from(
    { length: new Date(year, month + 1, 0).getDate() },
    (_, i) => new Date(year, month, i + 1)
  );
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const rangeStart = tempStart ? startOfDay(tempStart) : null;
  const rangeEnd = tempEnd
    ? startOfDay(tempEnd)
    : hoverDate && tempStart && selecting === "end"
    ? startOfDay(hoverDate)
    : null;

  const effectiveStart = rangeStart && rangeEnd
    ? rangeStart < rangeEnd ? rangeStart : rangeEnd
    : rangeStart;
  const effectiveEnd = rangeStart && rangeEnd
    ? rangeStart < rangeEnd ? rangeEnd : rangeStart
    : null;

  function isDayStart(day: Date) {
    if (!effectiveStart) return false;
    return isSameDay(startOfDay(day), effectiveStart);
  }

  function isDayEnd(day: Date) {
    if (!effectiveEnd) return false;
    return isSameDay(startOfDay(day), effectiveEnd);
  }

  function isDayInRange(day: Date) {
    if (!effectiveStart || !effectiveEnd) return false;
    const d = startOfDay(day);
    return d > effectiveStart && d < effectiveEnd;
  }

  function handleDayClick(day: Date) {
    if (selecting === "start") {
      setTempStart(day);
      setTempEnd(null);
      setSelecting("end");
    } else {
      if (tempStart && day < tempStart) {
        setTempEnd(tempStart);
        setTempStart(day);
      } else {
        setTempEnd(day);
      }
      setSelecting("start");
    }
  }

  function applyCustom() {
    if (tempStart && tempEnd) {
      const s = tempStart < tempEnd ? tempStart : tempEnd;
      const e = tempStart < tempEnd ? tempEnd : tempStart;
      onChange({
        start: new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0),
        end: new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59),
      });
      setOpen(false);
    }
  }

  function prevMonth() {
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
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
                  setTempStart(range.start);
                  setTempEnd(range.end);
                  setCalendarDate(new Date(range.start));
                  setOpen(false);
                }}
                className="text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg text-left transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Personalizado
            </p>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-xs font-semibold text-gray-700 capitalize">
                {format(calendarDate, "MMMM yyyy", { locale: ptBR })}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map((d, i) => (
                <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid — only current month days */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const isStart = isDayStart(day);
                const isEnd = isDayEnd(day);
                const inRange = isDayInRange(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => setHoverDate(day)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={[
                      "text-xs py-1.5 text-center transition-colors",
                      isStart || isEnd
                        ? "bg-blue-600 text-white rounded-full font-semibold"
                        : inRange
                        ? "bg-blue-50 text-blue-700"
                        : isToday
                        ? "text-blue-600 font-semibold hover:bg-gray-100 rounded-full"
                        : "text-gray-700 hover:bg-gray-100 rounded-full",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Selection hint */}
            <p className="text-xs text-gray-400 mt-2 text-center">
              {selecting === "start" ? "Selecione a data inicial" : "Selecione a data final"}
            </p>

            {/* Selected range preview */}
            {tempStart && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 justify-center">
                <span>{format(tempStart, "dd/MM/yyyy")}</span>
                {tempEnd && (
                  <>
                    <span className="text-gray-400">→</span>
                    <span>{format(tempEnd < tempStart ? tempStart : tempEnd, "dd/MM/yyyy")}</span>
                  </>
                )}
              </div>
            )}

            {tempStart && tempEnd && (
              <button
                onClick={applyCustom}
                className="mt-2 w-full bg-blue-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Aplicar
              </button>
            )}
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
