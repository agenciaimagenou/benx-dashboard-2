import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function parseBrDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  if (!day || !month || !year) return null;
  return new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`);
}

function parseBrDateTime(dateStr: string | null | undefined, timeStr: string | null | undefined): Date | null {
  const d = parseBrDate(dateStr);
  if (!d) return null;
  if (timeStr) {
    const parts = timeStr.trim().split(":");
    d.setHours(
      parseInt(parts[0] ?? "0", 10),
      parseInt(parts[1] ?? "0", 10),
      parseInt(parts[2] ?? "0", 10),
      0
    );
  }
  return d;
}

// Conta apenas horas dentro do horário comercial (09:00–23:00)
function workingHoursBetween(start: Date, end: Date): number {
  const WORK_START = 9;
  const WORK_END = 23;
  if (end <= start) return 0;
  let total = 0;
  const cursor = new Date(start);
  cursor.setSeconds(0, 0);
  while (cursor < end) {
    const dayWorkStart = new Date(cursor);
    dayWorkStart.setHours(WORK_START, 0, 0, 0);
    const dayWorkEnd = new Date(cursor);
    dayWorkEnd.setHours(WORK_END, 0, 0, 0);
    const segStart = cursor > dayWorkStart ? cursor : dayWorkStart;
    const segEnd = end < dayWorkEnd ? end : dayWorkEnd;
    if (segEnd > segStart) {
      total += (segEnd.getTime() - segStart.getTime()) / (1000 * 60 * 60);
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);
  }
  return total;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeImobiliaria(imob: unknown): string {
  const s = String(imob || "").trim();
  return s || "Sem imobiliária";
}

function normalizeOrigem(origem: unknown): string {
  if (!origem) return "Não definido";
  const o = String(origem).trim();
  const l = o.toLowerCase();
  if (l.includes("google") || l.includes("adword") || l.includes("g_ads") || l.includes("gads")) return "Google";
  if (o.toUpperCase().startsWith("SITE_") || l.includes("website") || l === "site") return "Website";
  return o;
}

function formatBrDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function isDescartado(situacao: unknown): boolean {
  const s = String(situacao || "").toLowerCase();
  return s.includes("descart") || s.includes("cancel") || s.includes("perdido") || s.includes("perda");
}

export interface StuckLeadEntry {
  id: number;
  nome: string;
  situacao: string;
  empreendimento: string;
  corretor: string;
  imobiliaria: string;
  origem: string;
  data_cadastro: string | null;
  dias_parado: number;
  ultima_atualizacao: string | null;
  dias_sem_contato: number;
}

export interface TempoSituacao {
  situacao: string;
  count: number;
  media_dias: number;
  max_dias: number;
  parados_3dias: number;
  parados_7dias: number;
  parados_15dias: number;
}

export interface MotivoDescarte {
  motivo: string;
  descricao: string;
  submotivo: string;
  empreendimento: string;
  count: number;
}

export interface CorretorParado {
  corretor: string;
  total_parados: number;
  avg_dias: number;
  max_dias: number;
  por_situacao: Record<string, number>;
}

export interface AnalyticsResponse {
  tempo_por_situacao: TempoSituacao[];
  leads_parados: StuckLeadEntry[];
  motivos_descarte: MotivoDescarte[];
  corretores_parados: CorretorParado[];
  corretores_total: Record<string, number>;
  imobiliarias_list: string[];
  resumo_parados: {
    total_parados_3d: number;
    total_parados_7d: number;
    total_parados_15d: number;
    avg_dias_sem_contato: number;
  };
}

const SELECT_COLS = [
  "Id",
  "Situação",
  "Nome",
  "Empreendimento",
  "Corretor",
  "Data da Última Interação",
  "Hora da Última Interação",
  "Data Primeiro Cadastro",
  "Dias sem contato",
  "Motivo de Cancelamento",
  "Descrição do Motivo de Cancelamento",
  "Submotivo de Cancelamento",
  "Lead vencido",
].map((c) => `"${c}"`).join(", ");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStartStr = searchParams.get("date_start");
  const dateEndStr = searchParams.get("date_end");
  const stuckThreshold = parseInt(searchParams.get("stuck_days") || "3", 10);

  if (!dateStartStr || !dateEndStr) {
    return NextResponse.json({ error: "date_start and date_end are required" }, { status: 400 });
  }

  // Fetch all leads with pagination (Supabase default cap is 1000 rows)
  const SELECT = `Id, "Situação", "Nome", "Empreendimento", "Primeiro Empreendimento", "Corretor", "Imobiliária", "Primeira Origem", "Data da Última Interação", "Hora da Última Interação", "Data da Última Entrada", "Hora da Última Entrada", "Data Primeiro Cadastro", "Dias sem contato", "Motivo de Cancelamento", "Descrição do Motivo de Cancelamento", "Submotivo de Cancelamento", "Lead vencido"`;
  const PAGE = 1000;
  const allLeads: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await supabaseAdmin
      .from("Leads")
      .select(SELECT)
      .range(from, from + PAGE - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!page || page.length === 0) break;
    allLeads.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  const leads = allLeads;

  const startDate = new Date(`${dateStartStr}T00:00:00`);
  const endDate = new Date(`${dateEndStr}T23:59:59`);
  const today = new Date();
  today.setHours(23, 59, 59, 0);

  // Filter by date of first registration (same filter as CRM route)
  const filtered = (leads || []).filter((lead) => {
    const d = parseBrDate(lead["Data Primeiro Cadastro"]);
    if (!d) return false;
    return d >= startDate && d <= endDate;
  });

  // ── 1. Tempo por situação ────────────────────────────────────────────────────
  const bySituacao: Record<
    string,
    { dias: number[]; parados3: number; parados7: number; parados15: number }
  > = {};

  const leadsParados: StuckLeadEntry[] = [];

  for (const lead of filtered) {
    const sit = lead["Situação"] || "Não definido";
    // Última atividade: prefere "Última Interação", senão "Última Entrada"
    const ultimaInteracao = parseBrDateTime(lead["Data da Última Interação"], lead["Hora da Última Interação"]);
    const ultimaEntrada   = parseBrDateTime(lead["Data da Última Entrada"],   lead["Hora da Última Entrada"]);
    const ultimaAlteracao = ultimaInteracao ?? ultimaEntrada;

    // dias_sem_contato: nosso cálculo — dias corridos desde a última interação até hoje.
    // Usa cadastro como mínimo, para nunca extrapolar o período filtrado.
    const cadastroStart = parseBrDate(lead["Data Primeiro Cadastro"] as string);
    const interacaoStart = parseBrDate(lead["Data da Última Interação"] as string);
    const semContatoStart =
      interacaoStart && cadastroStart && interacaoStart > cadastroStart
        ? interacaoStart
        : (cadastroStart ?? null);
    const todayMidnight = new Date(); todayMidnight.setHours(23, 59, 59, 0);
    const diasSemContato = semContatoStart ? daysBetween(semContatoStart, todayMidnight) : 0;

    // diasParado = tempo desde a última atividade até hoje
    // Se nunca houve atividade, conta desde o cadastro
    const cadastroDT = parseBrDate(lead["Data Primeiro Cadastro"]);
    if (cadastroDT) cadastroDT.setHours(9, 0, 0, 0);
    const startPoint = ultimaAlteracao ?? cadastroDT;
    const horasUteis = startPoint ? workingHoursBetween(startPoint, today) : 0;
    // 14h úteis = 1 dia útil
    const diasParado = Math.round((horasUteis / 14) * 10) / 10;

    if (!bySituacao[sit]) {
      bySituacao[sit] = { dias: [], parados3: 0, parados7: 0, parados15: 0 };
    }
    bySituacao[sit].dias.push(diasParado);
    if (diasParado >= 3) bySituacao[sit].parados3++;
    if (diasParado >= 7) bySituacao[sit].parados7++;
    if (diasParado >= 15) bySituacao[sit].parados15++;

    // Collect stuck leads (stagnant for at least threshold days, excluding discarded/cancelled)
    if (!isDescartado(sit) && (diasParado >= stuckThreshold || diasSemContato >= stuckThreshold)) {
      leadsParados.push({
        id: lead["Id"],
        nome: lead["Nome"] || "—",
        situacao: sit,
        empreendimento: (lead["Primeiro Empreendimento"] || lead["Empreendimento"] || "—") as string,
        corretor: lead["Corretor"] || "—",
        imobiliaria: normalizeImobiliaria(lead["Imobiliária"]),
        origem: normalizeOrigem(lead["Primeira Origem"]),
        data_cadastro: lead["Data Primeiro Cadastro"] || null,
        dias_parado: diasParado,
        ultima_atualizacao: (lead["Data da Última Interação"] as string) || (lead["Data da Última Entrada"] as string) || null,
        dias_sem_contato: diasSemContato,
      });
    }
  }

  // ── Override Visita Agendada / Visita Realizada from Visitas table ──────────
  // Remove visita entries that came from lead's Situação field
  for (const key of Object.keys(bySituacao)) {
    if (key.toLowerCase().includes("visita")) delete bySituacao[key];
  }

  // Build quick lookup map for filtered leads
  const filteredLeadMap = new Map<number, Record<string, unknown>>();
  for (const l of filtered) filteredLeadMap.set(l["Id"] as number, l);

  // Fetch Visitas table with pagination
  const allVisitas: Record<string, unknown>[] = [];
  let vFrom = 0;
  while (true) {
    const { data: vPage, error: vError } = await supabaseAdmin
      .from("Visitas")
      .select(`"Lead", "Situação da visita", "Data de conclusão de visita"`)
      .range(vFrom, vFrom + 999);
    if (vError || !vPage || vPage.length === 0) break;
    allVisitas.push(...vPage);
    if (vPage.length < 1000) break;
    vFrom += 1000;
  }

  // Process visits for leads in our filtered date range
  for (const v of allVisitas) {
    const leadId = v["Lead"] as number;
    if (!filteredLeadMap.has(leadId)) continue;
    const lead = filteredLeadMap.get(leadId)!;

    const sitVisita = String(v["Situação da visita"] || "").toLowerCase().trim();
    let sit: string;
    let startPoint: Date | null = null;

    if (sitVisita === "pendente" || sitVisita === "em andamento") {
      sit = "Visita Agendada";
      const ultimaInteracao = parseBrDateTime(lead["Data da Última Interação"], lead["Hora da Última Interação"]);
      const ultimaEntrada   = parseBrDateTime(lead["Data da Última Entrada"],   lead["Hora da Última Entrada"]);
      const ultimaAlteracao = ultimaInteracao ?? ultimaEntrada;
      const cadastroDT = parseBrDate(lead["Data Primeiro Cadastro"]);
      if (cadastroDT) cadastroDT.setHours(9, 0, 0, 0);
      startPoint = ultimaAlteracao ?? cadastroDT;
    } else if (sitVisita === "concluido" || sitVisita === "concluído") {
      sit = "Visita Realizada";
      const conclusaoDate = parseBrDate(v["Data de conclusão de visita"] as string);
      if (conclusaoDate) conclusaoDate.setHours(9, 0, 0, 0);
      startPoint = conclusaoDate;
    } else {
      continue;
    }

    const horasUteis = startPoint ? workingHoursBetween(startPoint, today) : 0;
    const diasParado = Math.round((horasUteis / 14) * 10) / 10;

    if (!bySituacao[sit]) {
      bySituacao[sit] = { dias: [], parados3: 0, parados7: 0, parados15: 0 };
    }
    bySituacao[sit].dias.push(diasParado);
    if (diasParado >= 3) bySituacao[sit].parados3++;
    if (diasParado >= 7) bySituacao[sit].parados7++;
    if (diasParado >= 15) bySituacao[sit].parados15++;
  }

  const tempoPorSituacao: TempoSituacao[] = Object.entries(bySituacao)
    .map(([situacao, data]) => {
      const { dias, parados3, parados7, parados15 } = data;
      const avg = dias.length > 0 ? dias.reduce((a, b) => a + b, 0) / dias.length : 0;
      const max = dias.length > 0 ? Math.max(...dias) : 0;
      return {
        situacao,
        count: dias.length,
        media_dias: Math.round(avg * 10) / 10,
        max_dias: max,
        parados_3dias: parados3,
        parados_7dias: parados7,
        parados_15dias: parados15,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Sort stuck leads by days_parado desc
  leadsParados.sort((a, b) => b.dias_parado - a.dias_parado);

  // ── Corretores com mais leads parados ────────────────────────────────────────
  const corretorMap: Record<string, { dias: number[]; por_situacao: Record<string, number> }> = {};
  for (const l of leadsParados) {
    const corretor = l.corretor?.split(" - ")[0]?.trim() || "Não atribuído";
    if (!corretorMap[corretor]) corretorMap[corretor] = { dias: [], por_situacao: {} };
    corretorMap[corretor].dias.push(l.dias_parado);
    const sit = l.situacao || "Não definido";
    corretorMap[corretor].por_situacao[sit] = (corretorMap[corretor].por_situacao[sit] || 0) + 1;
  }
  const corretoresParados: CorretorParado[] = Object.entries(corretorMap)
    .map(([corretor, d]) => ({
      corretor,
      total_parados: d.dias.length,
      avg_dias: d.dias.length > 0 ? Math.round(d.dias.reduce((a, b) => a + b, 0) / d.dias.length) : 0,
      max_dias: d.dias.length > 0 ? Math.max(...d.dias) : 0,
      por_situacao: d.por_situacao,
    }))
    .sort((a, b) => b.total_parados - a.total_parados)
    .slice(0, 25);

  // ── 2. Motivos de descarte ───────────────────────────────────────────────────
  const descarteMap: Record<string, MotivoDescarte> = {};

  for (const lead of filtered) {
    const motivo = lead["Motivo de Cancelamento"];
    if (!motivo) continue;

    const descricao = lead["Descrição do Motivo de Cancelamento"] || "";
    const submotivo = lead["Submotivo de Cancelamento"] || "";
    const emp = (lead["Primeiro Empreendimento"] || lead["Empreendimento"] || "Não identificado") as string;

    const key = `${motivo}|${descricao}|${emp}`;
    if (!descarteMap[key]) {
      descarteMap[key] = { motivo, descricao, submotivo, empreendimento: emp, count: 0 };
    }
    descarteMap[key].count++;
  }

  const motivosDescarte = Object.values(descarteMap).sort((a, b) => b.count - a.count);

  // ── 3. Resumo parados ────────────────────────────────────────────────────────
  const allDiasSemContato = filtered
    .map((l) => parseInt(l["Dias sem contato"] || "0", 10))
    .filter((d) => d > 0);

  const avgDiasSemContato =
    allDiasSemContato.length > 0
      ? allDiasSemContato.reduce((a, b) => a + b, 0) / allDiasSemContato.length
      : 0;

  function getWorkingDays(l: Record<string, unknown>): number {
    const cad = parseBrDate(l["Data Primeiro Cadastro"]);
    if (cad) cad.setHours(9, 0, 0, 0);
    const ultimaAlt = parseBrDateTime(l["Data da Última Interação"], l["Hora da Última Interação"])
                   ?? parseBrDateTime(l["Data da Última Entrada"],   l["Hora da Última Entrada"]);
    const start = ultimaAlt ?? cad;
    return start ? workingHoursBetween(start, today) / 14 : 0;
  }

  const totalParados3d  = filtered.filter((l) => !isDescartado(l["Situação"]) && getWorkingDays(l) >= 3).length;
  const totalParados7d  = filtered.filter((l) => !isDescartado(l["Situação"]) && getWorkingDays(l) >= 7).length;
  const totalParados15d = filtered.filter((l) => !isDescartado(l["Situação"]) && getWorkingDays(l) >= 15).length;

  // Total de leads por corretor (todos no período, não apenas parados)
  const corretoresTotal: Record<string, number> = {};
  const imobiliariasSet = new Set<string>();
  for (const lead of filtered) {
    const c = String(lead["Corretor"] || "").split(" - ")[0].trim() || "Não atribuído";
    corretoresTotal[c] = (corretoresTotal[c] || 0) + 1;
    imobiliariasSet.add(normalizeImobiliaria(lead["Imobiliária"]));
  }

  const response: AnalyticsResponse = {
    tempo_por_situacao: tempoPorSituacao,
    leads_parados: leadsParados.slice(0, 2000),
    motivos_descarte: motivosDescarte,
    corretores_parados: corretoresParados,
    corretores_total: corretoresTotal,
    imobiliarias_list: Array.from(imobiliariasSet).sort(),
    resumo_parados: {
      total_parados_3d: totalParados3d,
      total_parados_7d: totalParados7d,
      total_parados_15d: totalParados15d,
      avg_dias_sem_contato: Math.round(avgDiasSemContato * 10) / 10,
    },
  };

  return NextResponse.json(response);
}
