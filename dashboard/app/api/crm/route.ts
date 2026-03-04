import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

function parseBrDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStartStr = searchParams.get("date_start");
  const dateEndStr = searchParams.get("date_end");

  if (!dateStartStr || !dateEndStr) {
    return NextResponse.json({ error: "date_start and date_end are required" }, { status: 400 });
  }

  // Fetch all leads with pagination (Supabase default cap is 1000 rows)
  const SELECT = `Id, "Situação", "Nome", "Corretor", "Imobiliária", "Data Primeiro Cadastro", "Empreendimento", "Primeiro Empreendimento", "Convertido", "Reserva", "Ganhos", "Perdas", "Primeira Origem", "Última Origem", "Score"`;
  const PAGE = 1000;
  const allLeads: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await supabaseAdmin
      .from("Leads")
      .select(SELECT)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Supabase error:", error);
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

  // Filter by date range
  const filtered = (leads || []).filter((lead) => {
    const d = parseBrDate(lead["Data Primeiro Cadastro"]);
    if (!d) return false;
    return d >= startDate && d <= endDate;
  });

  interface LeadGanhoEntry {
    id: number;
    nome: string;
    corretor: string;
    data_cadastro: string | null;
    origem: string;
    situacao: string;
  }

  interface EmpEntry {
    empreendimento: string;
    total_leads: number;
    atendimento: number;
    reserva: number;
    ganhos: number;
    perdas: number;
    cancelados: number;
    conversao_rate: number;
    primary_origem: string;
    por_situacao: Record<string, number>;
    _origemCounts: Record<string, number>;
    ganho_leads: LeadGanhoEntry[];
  }

  // Group by empreendimento
  const byEmpreendimento: Record<string, EmpEntry> = {};

  for (const lead of filtered) {
    const emp = (lead["Primeiro Empreendimento"] || lead["Empreendimento"] || "Não Identificado") as string;

    if (!byEmpreendimento[emp]) {
      byEmpreendimento[emp] = {
        empreendimento: emp,
        total_leads: 0,
        atendimento: 0,
        reserva: 0,
        ganhos: 0,
        perdas: 0,
        cancelados: 0,
        conversao_rate: 0,
        primary_origem: "",
        por_situacao: {},
        _origemCounts: {},
        ganho_leads: [],
      };
    }

    const entry = byEmpreendimento[emp];
    entry.total_leads += 1;

    // Track origin frequency
    const origemLead = normalizeOrigem(lead["Primeira Origem"]);
    entry._origemCounts[origemLead] = (entry._origemCounts[origemLead] || 0) + 1;

    // Track situation frequency
    const sitLead = lead["Situação"] || "Não definido";
    entry.por_situacao[sitLead] = (entry.por_situacao[sitLead] || 0) + 1;

    const situacao = (lead["Situação"] || "").toLowerCase();
    const reserva = lead["Reserva"] === "1" || parseFloat(lead["Reserva"] || "0") > 0;
    const ganhos = parseFloat(lead["Ganhos"] || "0") > 0;
    const perdas = parseFloat(lead["Perdas"] || "0") > 0;

    if (situacao.includes("atendimento") || situacao.includes("tentativa")) {
      entry.atendimento += 1;
    }
    if (reserva || situacao.includes("reserva")) {
      entry.reserva += 1;
    }
    if (ganhos || situacao.includes("ganho") || situacao.includes("venda")) {
      entry.ganhos += 1;
      entry.ganho_leads.push({
        id: lead["Id"] as number,
        nome: (lead["Nome"] || "—") as string,
        corretor: (lead["Corretor"] || "—") as string,
        data_cadastro: (lead["Data Primeiro Cadastro"] || null) as string | null,
        origem: normalizeOrigem(lead["Primeira Origem"]),
        situacao: (lead["Situação"] || "—") as string,
      });
    }
    if (perdas || situacao.includes("perd") || situacao.includes("cancel")) {
      entry.perdas += 1;
      entry.cancelados += 1;
    }
  }

  // Calculate conversion rate + determine primary origem
  Object.values(byEmpreendimento).forEach((e) => {
    e.conversao_rate = e.total_leads > 0 ? (e.ganhos / e.total_leads) * 100 : 0;
    const entries = Object.entries(e._origemCounts);
    if (entries.length > 0) {
      e.primary_origem = entries.sort((a, b) => b[1] - a[1])[0][0];
    }
  });

  const result = Object.values(byEmpreendimento)
    .sort((a, b) => b.total_leads - a.total_leads)
    .map(({ _origemCounts: _unused, ...rest }) => ({ ...rest }));

  const totals = {
    total_leads: filtered.length,
    por_situacao: {} as Record<string, number>,
    por_origem: {} as Record<string, number>,
    por_origem_emp: {} as Record<string, Record<string, number>>,
    por_imobiliaria_emp: {} as Record<string, Record<string, number>>,
    por_imobiliaria_emp_sit: {} as Record<string, Record<string, Record<string, number>>>,
    por_empreendimento: result,
    origens_list: [] as string[],
  };

  // Aggregate situações for the full funnel
  for (const lead of filtered) {
    const sit = lead["Situação"] || "Não definido";
    totals.por_situacao[sit] = (totals.por_situacao[sit] || 0) + 1;

    const origem = normalizeOrigem(lead["Primeira Origem"]);
    totals.por_origem[origem] = (totals.por_origem[origem] || 0) + 1;

    const empTotal = (lead["Primeiro Empreendimento"] || lead["Empreendimento"] || "Não Identificado") as string;
    if (!totals.por_origem_emp[origem]) totals.por_origem_emp[origem] = {};
    totals.por_origem_emp[origem][empTotal] = (totals.por_origem_emp[origem][empTotal] || 0) + 1;

    const imob = normalizeImobiliaria(lead["Imobiliária"]);
    if (!totals.por_imobiliaria_emp[imob]) totals.por_imobiliaria_emp[imob] = {};
    totals.por_imobiliaria_emp[imob][empTotal] = (totals.por_imobiliaria_emp[imob][empTotal] || 0) + 1;

    const sitTotal = lead["Situação"] || "Não definido";
    if (!totals.por_imobiliaria_emp_sit[imob]) totals.por_imobiliaria_emp_sit[imob] = {};
    if (!totals.por_imobiliaria_emp_sit[imob][empTotal]) totals.por_imobiliaria_emp_sit[imob][empTotal] = {};
    totals.por_imobiliaria_emp_sit[imob][empTotal][sitTotal] = (totals.por_imobiliaria_emp_sit[imob][empTotal][sitTotal] || 0) + 1;
  }

  totals.origens_list = Object.keys(totals.por_origem).sort();

  // ── Override Visita Agendada / Visita Realizada from Visitas table ──────────
  const filteredLeadIds = new Set(filtered.map((l) => l["Id"] as number));
  const allVisitas: Record<string, unknown>[] = [];
  let vFrom = 0;
  while (true) {
    const { data: vPage, error: vError } = await supabaseAdmin
      .from("Visitas")
      .select(`"Lead", "Situação da visita", "Empreendimento visita"`)
      .range(vFrom, vFrom + 999);
    if (vError || !vPage || vPage.length === 0) break;
    allVisitas.push(...vPage);
    if (vPage.length < 1000) break;
    vFrom += 1000;
  }

  const visitasAgendadasByEmp: Record<string, number> = {};
  const visitasRealizadasByEmp: Record<string, number> = {};
  for (const v of allVisitas) {
    if (!filteredLeadIds.has(v["Lead"] as number)) continue;
    const emp = (v["Empreendimento visita"] || "Não Identificado") as string;
    const sit = String(v["Situação da visita"] || "").toLowerCase().trim();
    if (sit === "pendente" || sit === "em andamento") {
      visitasAgendadasByEmp[emp] = (visitasAgendadasByEmp[emp] || 0) + 1;
    } else if (sit === "concluido" || sit === "concluído") {
      visitasRealizadasByEmp[emp] = (visitasRealizadasByEmp[emp] || 0) + 1;
    }
  }

  // Replace visita counts in totals.por_situacao
  for (const key of Object.keys(totals.por_situacao)) {
    if (key.toLowerCase().includes("visita")) delete totals.por_situacao[key];
  }
  const totalAgendadas = Object.values(visitasAgendadasByEmp).reduce((a, b) => a + b, 0);
  const totalRealizadas = Object.values(visitasRealizadasByEmp).reduce((a, b) => a + b, 0);
  if (totalAgendadas > 0) totals.por_situacao["Visita Agendada"] = totalAgendadas;
  if (totalRealizadas > 0) totals.por_situacao["Visita Realizada"] = totalRealizadas;

  // Replace visita counts in each empreendimento's por_situacao
  for (const emp of result) {
    for (const key of Object.keys(emp.por_situacao)) {
      if (key.toLowerCase().includes("visita")) delete emp.por_situacao[key];
    }
    const agendadas = visitasAgendadasByEmp[emp.empreendimento] || 0;
    const realizadas = visitasRealizadasByEmp[emp.empreendimento] || 0;
    if (agendadas > 0) emp.por_situacao["Visita Agendada"] = agendadas;
    if (realizadas > 0) emp.por_situacao["Visita Realizada"] = realizadas;
  }

  return NextResponse.json(totals);
}
