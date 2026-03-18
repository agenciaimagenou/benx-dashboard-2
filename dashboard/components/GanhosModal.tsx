"use client";

import { useEffect, useState } from "react";
import { X, Loader2, TrendingUp } from "lucide-react";

interface Lead {
  id: number;
  nome: string;
  situacao: string;
  corretor: string;
  empreendimento: string;
  origem: string;
  data_cadastro: string;
  score: number;
  visitas_count?: number;
}

interface Props {
  empreendimento: string;
  dateStart: string;
  dateEnd: string;
  tipo: "ganhos" | "reservas" | "visita_agendada" | "visita_realizada";
  filterOrigens?: string[];
  filterUltimaOrigem?: string[];
  filterImobiliaria?: string[];
  onClose: () => void;
}

export default function GanhosModal({ empreendimento, dateStart, dateEnd, tipo, filterOrigens, filterUltimaOrigem, filterImobiliaria, onClose }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      empreendimento,
      date_start: dateStart,
      date_end: dateEnd,
      tipo,
    });
    if (filterOrigens?.length)      params.set("origens",     filterOrigens.join(","));
    if (filterUltimaOrigem?.length) params.set("ultima_origem", filterUltimaOrigem.join(","));
    if (filterImobiliaria?.length)  params.set("imobiliaria",  filterImobiliaria.join(","));
    fetch(`/api/crm/leads?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setLeads(data.leads ?? []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [empreendimento, dateStart, dateEnd, tipo, filterOrigens, filterUltimaOrigem, filterImobiliaria]);

  const title =
    tipo === "ganhos" ? "Ganhos / Vendas" :
    tipo === "reservas" ? "Reservas" :
    tipo === "visita_agendada" ? "Visita Agendada" :
    "Visita Realizada";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <div>
              <h2 className="font-semibold text-gray-800">{title}</h2>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[420px]">{empreendimento}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Carregando leads...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-sm text-red-500">{error}</div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Nenhum lead encontrado
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-800 border-b border-slate-700 z-10">
                <tr>
                  {["ID", "Nome", "Situação", "Corretor", "Origem", "Data Cadastro"].map(h => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-bold text-slate-300 uppercase tracking-wider ${
                        h === "ID" || h === "Data Cadastro" ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map(lead => (
                  <tr key={lead.id} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-2.5 text-right text-xs font-mono text-gray-400 whitespace-nowrap">{lead.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[180px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{lead.nome}</span>
                        {lead.visitas_count && lead.visitas_count > 1 && (
                          <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                            {lead.visitas_count}x visitas
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {lead.situacao}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[140px] truncate">{lead.corretor}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">{lead.origem}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500 text-xs whitespace-nowrap">{lead.data_cadastro ? lead.data_cadastro.slice(0, 10).split("-").reverse().join("/") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && leads.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
            <p className="text-xs text-gray-400">{leads.length} lead{leads.length !== 1 ? "s" : ""} encontrado{leads.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
