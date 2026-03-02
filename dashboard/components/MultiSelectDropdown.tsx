"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;          // placeholder when nothing selected
  options: string[];      // all available options
  selected: string[];     // currently selected values
  onChange: (values: string[]) => void;
}

export default function MultiSelectDropdown({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function toggleAll() {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  }

  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;

  const buttonLabel = noneSelected
    ? label
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selecionadas`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-2 text-xs border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[160px] justify-between",
          noneSelected ? "border-gray-200 text-gray-500" : "border-blue-400 text-blue-700"
        )}
      >
        <span className="truncate max-w-[160px]">{buttonLabel}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:underline"
            >
              {allSelected ? "Desmarcar todas" : "Marcar todas"}
            </button>
          </div>

          {/* Options */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {options.map(opt => {
              const checked = selected.includes(opt);
              return (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => toggle(opt)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className={cn(
                      "w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors",
                      checked ? "bg-blue-600 border-blue-600" : "border-gray-300"
                    )}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-gray-700 truncate">{opt}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          {!noneSelected && (
            <div className="px-3 py-2 border-t border-gray-100">
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
