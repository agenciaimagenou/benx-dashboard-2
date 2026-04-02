"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { DollarSign, Eye, MousePointerClick, Target, TrendingUp, Zap, Trophy, Bookmark, Info } from "lucide-react";
import { formatCurrency, formatNumber, findBestMatch } from "@/lib/utils";
import KPICard from "@/components/KPICard";
import GanhosModal from "@/components/GanhosModal";
import { META_ACCOUNTS, META_TO_GOOGLE } from "@/lib/meta-accounts";

export interface GoogleAdsAccount {
  account_id:   string;
  account_name: string;
  impressions:  number;
  clicks:       number;
  ctr:          number;
  avg_cpc:      number;
  avg_cpm:      number;
  spend:        number;
  conversions:  number;
  interactions: number;
  cpl:          number;
  campaigns: Array<{
    id:          string;
    name:        string;
    impressions: number;
    clicks:      number;
    ctr:         number;
    avg_cpc:     number;
    spend:       number;
    conversions: number;
  }>;
  // Reservas table enrichment
  res_ativas?: number;
  res_vendas?: number;
  res_emp_key?: string;
}

interface CRMEmp {
  empreendimento: string;
  total_leads_google: number;
  atendimento_google: number;
  reserva_google: number;
  ganhos_google: number;
}

interface ModalState {
  empreendimento: string;
  tipo: "ganhos" | "reservas";
}

interface Props {
  data:      GoogleAdsAccount[] | null;
  crmData:   { por_empreendimento: CRMEmp[] } | null;
  loading:   boolean;
  dateStart?: string;
  dateEnd?:   string;
  reservasRecords?: Record<string, unknown>[];
}

// Build reverse map: lowercased Google account name → crmKey
const GOOGLE_TO_CRM: Record<string, string> = {};
for (const acc of META_ACCOUNTS) {
  const metaLow = acc.name.toLowerCase();
  const googleLow = META_TO_GOOGLE[metaLow] ?? metaLow;
  GOOGLE_TO_CRM[googleLow] = acc.crmKey;
}

function ColTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);
  function show() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const tooltipW = 256;
      const center = r.left + r.width / 2;
      const raw = center - tooltipW / 2;
      const left = Math.max(8, Math.min(raw, window.innerWidth - tooltipW - 8)) + window.scrollX;
      setPos({ top: r.top + window.scrollY - 8, left });
    }
    setVisible(true);
  }
  return (
    <span ref={ref} className="ml-0.5 inline-flex items-center cursor-default"
      onMouseEnter={show} onMouseLeave={() => setVisible(false)}
      onClick={e => e.stopPropagation()}>
      <Info className="w-3 h-3 text-slate-400 hover:text-blue-300 transition-colors flex-shrink-0" />
      {visible && typeof document !== "undefined" && createPortal(
        <div className="fixed z-[9999] w-64 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed px-3 py-2.5 shadow-xl pointer-events-none whitespace-normal"
          style={{ top: pos.top, left: pos.left, transform: "translateY(-100%)" }}>
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900" />
        </div>,
        document.body
      )}
    </span>
  );
}

function shortName(name: string): string {
  if (name.startsWith("VIVA BENX | ")) return "VB | " + name.slice("VIVA BENX | ".length);
  if (name.startsWith("BENX | "))      return name.slice("BENX | ".length);
  return name;
}

const RES_VENDA_IDS_G = new Set([3, 17, 23, 24, 25, 26, 28]);
function isResVendaG(r: Record<string, unknown>): boolean {
  const idSit = Number(r.idsituacao);
  if (!isNaN(idSit) && idSit > 0 && RES_VENDA_IDS_G.has(idSit)) return true;
  const sit = String(r.situacao || "").toLowerCase().trim();
  return sit.startsWith("vend") || sit === "vendida";
}

interface ResModal { empreendimento: string; isVenda: boolean; records: Record<string, unknown>[]; }

export default function GoogleAdsSection({ data, crmData, loading, dateStart = "", dateEnd = "", reservasRecords = [] }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [resModal, setResModal] = useState<ResModal | null>(null);
  const crmEmpNames = crmData?.por_empreendimento.map(e => e.empreendimento) ?? [];

  function openResModal(account: GoogleAdsAccount, isVenda: boolean) {
    const empKey = account.res_emp_key;
    if (!empKey) return;
    const empLower = empKey.toLowerCase().trim();
    const filtered = reservasRecords.filter(r => {
      const rEmp = String(r.empreendimento || "").toLowerCase().trim();
      if (rEmp !== empLower) return false;
      const sit = String(r.situacao || "").toLowerCase().trim();
      if (sit.startsWith("cancel") || sit.startsWith("distrat")) return false;
      return isVenda ? isResVendaG(r) : !isResVendaG(r);
    });
    setResModal({ empreendimento: account.account_name, isVenda, records: filtered });
  }

  function getCrmForAccount(accountName: string): CRMEmp | undefined {
    const key = accountName.toLowerCase().trim();
    const crmKey = GOOGLE_TO_CRM[key];
    if (crmKey) {
      return crmData?.por_empreendimento.find(e => e.empreendimento.toLowerCase() === crmKey.toLowerCase());
    }
    // Fallback: fuzzy match
    if (crmEmpNames.length > 0) {
      const { match } = findBestMatch(accountName, crmEmpNames);
      if (match) return crmData?.por_empreendimento.find(e => e.empreendimento === match);
    }
    return undefined;
  }
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <KPICard key={i} title="" value="" icon={Eye} loading={true} />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-3" />
          <div className="h-8 bg-gray-100 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Nenhum dado do Google Ads encontrado para o período selecionado.
      </div>
    );
  }

  // Totals
  const totals = data.reduce(
    (acc, a) => ({
      spend:       acc.spend       + a.spend,
      impressions: acc.impressions + a.impressions,
      clicks:      acc.clicks      + a.clicks,
      conversions: acc.conversions + a.conversions,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
  );
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const totalCpl = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  const totalCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;

  // CRM totals: sum only accounts visible in the table (not all CRM empreendimentos)
  const crmTotals = data.reduce(
    (acc, account) => {
      const crm = getCrmForAccount(account.account_name);
      return {
        leads:   acc.leads   + (crm?.total_leads_google ?? 0),
        atend:   acc.atend   + (crm?.atendimento_google ?? 0),
        reserva: acc.reserva + (account.res_ativas ?? 0),
        ganhos:  acc.ganhos  + (account.res_vendas ?? 0),
      };
    },
    { leads: 0, atend: 0, reserva: 0, ganhos: 0 }
  );

  return (
    <>
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Valor Gasto" value={formatCurrency(totals.spend)}
          subtitle={`${data.length} contas ativas`}
          tooltip="Total investido no Google Ads no período, somando todas as contas ativas."
          icon={DollarSign} color="blue" loading={loading} />
        <KPICard title="Impressões"  value={formatNumber(totals.impressions)}
          tooltip="Número total de vezes que os anúncios foram exibidos para usuários no Google Ads."
          icon={Eye} color="purple" loading={loading} />
        <KPICard title="Cliques"     value={formatNumber(totals.clicks)}
          subtitle={`CTR ${totalCtr.toFixed(2)}%`}
          tooltip="Total de cliques nos anúncios do Google Ads. O CTR indica a % de impressões que geraram clique."
          icon={MousePointerClick} color="teal" loading={loading} />
        <KPICard title="Conversões"  value={formatNumber(Math.round(totals.conversions))}
          tooltip="Total de conversões registradas no Google Ads (leads ou ações configuradas como conversão)."
          icon={Zap} color="orange" loading={loading} />
        <KPICard title="CPL"         value={formatCurrency(totalCpl)}
          subtitle="Custo por conversão"
          tooltip="Custo por conversão no Google Ads: total investido dividido pelo total de conversões no período."
          icon={Target} color="red" loading={loading} />
        <KPICard title="CPC Médio"   value={formatCurrency(totalCpc)}
          tooltip="Custo médio por clique no Google Ads: total investido dividido pelo total de cliques no período."
          tooltipAlign="right"
          icon={TrendingUp} color="green" loading={loading} />
      </div>

      {/* Accounts table */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800">Contas Google Ads</h3>
          <p className="text-xs text-gray-400 mt-0.5">{data.length} contas com dados no período</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800">
              <tr>
                {([
                  { label: "Conta" },
                  { label: "Valor Gasto" },
                  { label: "Impressões" },
                  { label: "Cliques" },
                  { label: "CTR" },
                  { label: "CPC" },
                  { label: "CPM" },
                  { label: "Conversões" },
                  { label: "CPL" },
                  { label: "Leads CRM", tooltip: "Leads captados via Google Ads (origem Google) que entraram no CRM no período total histórico." },
                  { label: "Atend.", tooltip: "Leads do Google Ads que avançaram para a etapa de Atendimento no CRM." },
                  { label: "Reserva", tooltip: "Reservas ativas vinculadas a esta conta Google Ads, filtradas pelo período selecionado (data de cadastro)." },
                  { label: "Vendas", tooltip: "Vendas confirmadas (situação Vendida) vinculadas a esta conta Google Ads, filtradas pelo período selecionado (data da venda)." },
                ] as { label: string; tooltip?: string }[]).map(({ label, tooltip }) => (
                  <th
                    key={label}
                    className={`px-2 py-2 text-[10px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap ${
                      label === "Conta" ? "text-left" : "text-right"
                    }`}
                  >
                    <span className="inline-flex items-center justify-end gap-0.5">
                      {label}
                      {tooltip && <ColTooltip text={tooltip} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((account, i) => {
                const crm = getCrmForAccount(account.account_name);
                return (
                <tr key={account.account_id} className={`border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                  <td className="px-2 py-2 font-medium text-gray-800 truncate max-w-[150px]">{shortName(account.account_name)}</td>
                  <td className="px-2 py-2 text-right font-semibold text-gray-800">{formatCurrency(account.spend)}</td>
                  <td className="px-2 py-2 text-right text-gray-600">{formatNumber(account.impressions)}</td>
                  <td className="px-2 py-2 text-right text-gray-600">{formatNumber(account.clicks)}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{account.ctr.toFixed(2)}%</td>
                  <td className="px-2 py-2 text-right text-gray-500">{formatCurrency(account.avg_cpc)}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{formatCurrency(account.avg_cpm)}</td>
                  <td className="px-2 py-2 text-right text-gray-600">{Math.round(account.conversions)}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{account.conversions > 0 ? formatCurrency(account.cpl) : "—"}</td>
                  <td className="px-2 py-2 text-right text-gray-700 font-medium">{crm ? formatNumber(crm.total_leads_google) : "—"}</td>
                  <td className="px-2 py-2 text-right text-gray-500">{crm ? formatNumber(crm.atendimento_google) : "—"}</td>
                  <td className="px-2 py-2 text-right">
                    {(account.res_ativas ?? 0) > 0 ? (
                      <button
                        onClick={() => openResModal(account, false)}
                        className="inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer text-[10px] text-violet-700 bg-violet-100 border-violet-200 hover:bg-violet-200"
                        title="Ver reservas ativas"
                      >
                        <Bookmark className="w-2.5 h-2.5" />
                        {account.res_ativas}
                      </button>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {(account.res_vendas ?? 0) > 0 ? (
                      <button
                        onClick={() => openResModal(account, true)}
                        className="inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer text-[10px] text-emerald-700 bg-emerald-100 border-emerald-200 hover:bg-emerald-200"
                        title="Ver vendas"
                      >
                        <Trophy className="w-2.5 h-2.5" />
                        {account.res_vendas}
                      </button>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                </tr>
                );
              })}
            </tbody>

            {/* Totals row */}
            <tfoot className="bg-slate-800 border-t-2 border-slate-700">
              <tr>
                <td className="px-2 py-2 font-bold text-slate-200 text-[10px] uppercase tracking-wider">Total</td>
                <td className="px-2 py-2 text-right font-bold text-slate-200">{formatCurrency(totals.spend)}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{formatNumber(totals.impressions)}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{formatNumber(totals.clicks)}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{totalCtr.toFixed(2)}%</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{formatCurrency(totalCpc)}</td>
                <td className="px-2 py-2 text-right text-slate-500">—</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{Math.round(totals.conversions)}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{formatCurrency(totalCpl)}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{formatNumber(crmTotals.leads)}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{formatNumber(crmTotals.atend)}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{formatNumber(crmTotals.reserva)}</td>
                <td className="px-2 py-2 text-right font-semibold text-slate-300">{formatNumber(crmTotals.ganhos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    {modal && dateStart && dateEnd && (
      <GanhosModal
        empreendimento={modal.empreendimento}
        dateStart={dateStart}
        dateEnd={dateEnd}
        tipo={modal.tipo}
        googleOnly={true}
        onClose={() => setModal(null)}
      />
    )}

    {resModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pl-52" onClick={() => setResModal(null)}>
        <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-6xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">{resModal.isVenda ? "Vendas" : "Reservas Ativas"} — {resModal.empreendimento}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{resModal.records.length} {resModal.records.length === 1 ? "registro" : "registros"}</p>
            </div>
            <button onClick={() => setResModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
          </div>
          <div className="overflow-auto flex-1">
            {resModal.records.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-12">Nenhum registro encontrado</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-800 sticky top-0">
                  <tr>
                    {["ID Reserva", "ID Lead", "Origem", "Cliente", "Unidade", "Situação", "Corretor", "Valor Contrato", "Data Cad.", "Data Venda"].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resModal.records.map((r, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                      <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{String(r.idreserva || "—")}</td>
                      <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{String(r.idlead || "—")}</td>
                      <td className="px-2 py-2 text-gray-500 font-medium whitespace-nowrap">{String(r.origem_nome || "—")}</td>
                      <td className="px-2 py-2 font-medium text-blue-700">{String(r.cliente || r.nome || "—")}</td>
                      <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{String(r.unidade || "—")}</td>
                      <td className="px-2 py-2 text-violet-700 font-medium whitespace-nowrap">{String(r.situacao || "—")}</td>
                      <td className="px-2 py-2 text-gray-600">{String(r.corretor || "—")}</td>
                      <td className="px-2 py-2 text-gray-700 font-medium whitespace-nowrap">{r.valor_contrato ? `R$ ${Number(r.valor_contrato).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                      <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{r.data_cad ? String(r.data_cad).slice(0, 10).split("-").reverse().join("/") : "—"}</td>
                      <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{r.data_venda ? String(r.data_venda).slice(0, 10).split("-").reverse().join("/") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )}
  </>
  );
}
