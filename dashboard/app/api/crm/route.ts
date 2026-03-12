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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStartStr = searchParams.get("date_start");
  const dateEndStr = searchParams.get("date_end");

  if (!dateStartStr || !dateEndStr) {
    return NextResponse.json({ error: "date_start and date_end are required" }, { status: 400 });
  }

  // Fetch leads with parallel pagination
  const SELECT = `idlead, situacao, nome, corretor, imobiliaria, data_cad, empreendimento, empreendimento_primeiro, reserva, origem_nome, origem_ultimo, score, novo, retorno`;
  const PAGE = 1000;

  const { data: firstPage, count, error: firstError } = await supabaseAdmin
    .from("leads2")
    .select(SELECT, { count: "exact" })
    .gte("data_cad", `${dateStartStr}T00:00:00`)
    .lte("data_cad", `${dateEndStr}T23:59:59`)
    .range(0, PAGE - 1);

  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const allLeads: Record<string, unknown>[] = [...(firstPage ?? [])];
  const remainingPages = Math.max(0, Math.ceil((count ?? 0) / PAGE) - 1);

  if (remainingPages > 0) {
    const rest = await Promise.all(
      Array.from({ length: remainingPages }, (_, i) =>
        supabaseAdmin.from("leads2").select(SELECT)
          .gte("data_cad", `${dateStartStr}T00:00:00`)
          .lte("data_cad", `${dateEndStr}T23:59:59`)
          .range((i + 1) * PAGE, (i + 2) * PAGE - 1)
      )
    );
    for (const r of rest) { if (r.data) allLeads.push(...r.data); }
  }

  // Already filtered at DB level — no in-memory re-filter needed
  const filtered = allLeads;

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
    novo_count: number;
    retorno_count: number;
  }

  // Group by empreendimento
  const byEmpreendimento: Record<string, EmpEntry> = {};

  for (const lead of filtered) {
    const emp = (lead["empreendimento_primeiro"] || lead["empreendimento"] || "Não Identificado") as string;

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
        novo_count: 0,
        retorno_count: 0,
      };
    }

    const entry = byEmpreendimento[emp];
    entry.total_leads += 1;

    // Track origin frequency
    const origemLead = normalizeOrigem(lead["origem_nome"]);
    entry._origemCounts[origemLead] = (entry._origemCounts[origemLead] || 0) + 1;

    // Track situation frequency
    const sitLead = lead["situacao"] || "Não definido";
    entry.por_situacao[sitLead] = (entry.por_situacao[sitLead] || 0) + 1;

    const situacao = (lead["situacao"] || "").toLowerCase();
    const reserva = (lead["reserva"] as number || 0) > 0;
    const ganhos = situacao.includes("ganho") || situacao.includes("venda");
    const perdas = situacao.includes("perd") || situacao.includes("cancel") || situacao.includes("descart");

    // Count novo and retorno (handles boolean, 1/0, 'S'/'N', 'true'/'false', 'sim'/'nao')
    const novoVal = lead["novo"];
    const retornoVal = lead["retorno"];
    const isTruthy = (v: unknown) => v === true || v === 1 || v === "S" || v === "s" || v === "true" || v === "sim";
    if (isTruthy(novoVal)) entry.novo_count += 1;
    if (isTruthy(retornoVal)) entry.retorno_count += 1;

    if (situacao.includes("atendimento") || situacao.includes("tentativa")) {
      entry.atendimento += 1;
    }
    if (reserva || situacao.includes("reserva")) {
      entry.reserva += 1;
    }
    if (ganhos) {
      entry.ganhos += 1;
      entry.ganho_leads.push({
        id: lead["idlead"] as number,
        nome: (lead["nome"] || "—") as string,
        corretor: (lead["corretor"] || "—") as string,
        data_cadastro: (lead["data_cad"] || null) as string | null,
        origem: normalizeOrigem(lead["origem_nome"]),
        situacao: (lead["situacao"] || "—") as string,
      });
    }
    if (perdas) {
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
    por_origem_imobiliaria: {} as Record<string, Record<string, number>>,
    por_ultima_origem: {} as Record<string, number>,
    por_ultima_origem_emp: {} as Record<string, Record<string, number>>,
    por_ultima_origem_imobiliaria: {} as Record<string, Record<string, number>>,
    por_imobiliaria_emp: {} as Record<string, Record<string, number>>,
    por_imobiliaria_emp_sit: {} as Record<string, Record<string, Record<string, number>>>,
    por_origem_emp_sit: {} as Record<string, Record<string, Record<string, number>>>,
    por_imobiliaria_emp_novo: {} as Record<string, Record<string, number>>,
    por_imobiliaria_emp_retorno: {} as Record<string, Record<string, number>>,
    por_origem_emp_novo: {} as Record<string, Record<string, number>>,
    por_origem_emp_retorno: {} as Record<string, Record<string, number>>,
    por_ultima_origem_emp_sit: {} as Record<string, Record<string, Record<string, number>>>,
    por_ultima_origem_emp_novo: {} as Record<string, Record<string, number>>,
    por_ultima_origem_emp_retorno: {} as Record<string, Record<string, number>>,
    por_empreendimento: result,
    origens_list: [] as string[],
    ultimas_origens_list: [] as string[],
    total_novo: 0,
    total_retorno: 0,
  };

  // Aggregate situações for the full funnel
  for (const lead of filtered) {
    const sit = lead["situacao"] || "Não definido";
    totals.por_situacao[sit] = (totals.por_situacao[sit] || 0) + 1;

    const origem = normalizeOrigem(lead["origem_nome"]);
    totals.por_origem[origem] = (totals.por_origem[origem] || 0) + 1;

    const empTotal = (lead["empreendimento_primeiro"] || lead["empreendimento"] || "Não Identificado") as string;
    if (!totals.por_origem_emp[origem]) totals.por_origem_emp[origem] = {};
    totals.por_origem_emp[origem][empTotal] = (totals.por_origem_emp[origem][empTotal] || 0) + 1;

    const ultimaOrigem = normalizeOrigem(lead["origem_ultimo"]);
    totals.por_ultima_origem[ultimaOrigem] = (totals.por_ultima_origem[ultimaOrigem] || 0) + 1;
    if (!totals.por_ultima_origem_emp[ultimaOrigem]) totals.por_ultima_origem_emp[ultimaOrigem] = {};
    totals.por_ultima_origem_emp[ultimaOrigem][empTotal] = (totals.por_ultima_origem_emp[ultimaOrigem][empTotal] || 0) + 1;

    const imob = normalizeImobiliaria(lead["imobiliaria"]);
    if (!totals.por_imobiliaria_emp[imob]) totals.por_imobiliaria_emp[imob] = {};
    totals.por_imobiliaria_emp[imob][empTotal] = (totals.por_imobiliaria_emp[imob][empTotal] || 0) + 1;

    // Intersection aggregates: origem × imobiliária
    if (!totals.por_origem_imobiliaria[origem]) totals.por_origem_imobiliaria[origem] = {};
    totals.por_origem_imobiliaria[origem][imob] = (totals.por_origem_imobiliaria[origem][imob] || 0) + 1;

    if (!totals.por_ultima_origem_imobiliaria[ultimaOrigem]) totals.por_ultima_origem_imobiliaria[ultimaOrigem] = {};
    totals.por_ultima_origem_imobiliaria[ultimaOrigem][imob] = (totals.por_ultima_origem_imobiliaria[ultimaOrigem][imob] || 0) + 1;

    const sitTotal = lead["situacao"] || "Não definido";
    if (!totals.por_imobiliaria_emp_sit[imob]) totals.por_imobiliaria_emp_sit[imob] = {};
    if (!totals.por_imobiliaria_emp_sit[imob][empTotal]) totals.por_imobiliaria_emp_sit[imob][empTotal] = {};
    totals.por_imobiliaria_emp_sit[imob][empTotal][sitTotal] = (totals.por_imobiliaria_emp_sit[imob][empTotal][sitTotal] || 0) + 1;

    if (!totals.por_origem_emp_sit[origem]) totals.por_origem_emp_sit[origem] = {};
    if (!totals.por_origem_emp_sit[origem][empTotal]) totals.por_origem_emp_sit[origem][empTotal] = {};
    totals.por_origem_emp_sit[origem][empTotal][sitTotal] = (totals.por_origem_emp_sit[origem][empTotal][sitTotal] || 0) + 1;

    if (!totals.por_ultima_origem_emp_sit[ultimaOrigem]) totals.por_ultima_origem_emp_sit[ultimaOrigem] = {};
    if (!totals.por_ultima_origem_emp_sit[ultimaOrigem][empTotal]) totals.por_ultima_origem_emp_sit[ultimaOrigem][empTotal] = {};
    totals.por_ultima_origem_emp_sit[ultimaOrigem][empTotal][sitTotal] = (totals.por_ultima_origem_emp_sit[ultimaOrigem][empTotal][sitTotal] || 0) + 1;

    // Track novo / retorno by imobiliária × empreendimento and origem × empreendimento
    const isTruthyTotal = (v: unknown) => v === true || v === 1 || v === "S" || v === "s" || v === "true" || v === "sim";
    if (isTruthyTotal(lead["novo"])) {
      if (!totals.por_imobiliaria_emp_novo[imob]) totals.por_imobiliaria_emp_novo[imob] = {};
      totals.por_imobiliaria_emp_novo[imob][empTotal] = (totals.por_imobiliaria_emp_novo[imob][empTotal] || 0) + 1;
      if (!totals.por_origem_emp_novo[origem]) totals.por_origem_emp_novo[origem] = {};
      totals.por_origem_emp_novo[origem][empTotal] = (totals.por_origem_emp_novo[origem][empTotal] || 0) + 1;
      if (!totals.por_ultima_origem_emp_novo[ultimaOrigem]) totals.por_ultima_origem_emp_novo[ultimaOrigem] = {};
      totals.por_ultima_origem_emp_novo[ultimaOrigem][empTotal] = (totals.por_ultima_origem_emp_novo[ultimaOrigem][empTotal] || 0) + 1;
      totals.total_novo += 1;
    }
    if (isTruthyTotal(lead["retorno"])) {
      if (!totals.por_imobiliaria_emp_retorno[imob]) totals.por_imobiliaria_emp_retorno[imob] = {};
      totals.por_imobiliaria_emp_retorno[imob][empTotal] = (totals.por_imobiliaria_emp_retorno[imob][empTotal] || 0) + 1;
      if (!totals.por_origem_emp_retorno[origem]) totals.por_origem_emp_retorno[origem] = {};
      totals.por_origem_emp_retorno[origem][empTotal] = (totals.por_origem_emp_retorno[origem][empTotal] || 0) + 1;
      if (!totals.por_ultima_origem_emp_retorno[ultimaOrigem]) totals.por_ultima_origem_emp_retorno[ultimaOrigem] = {};
      totals.por_ultima_origem_emp_retorno[ultimaOrigem][empTotal] = (totals.por_ultima_origem_emp_retorno[ultimaOrigem][empTotal] || 0) + 1;
      totals.total_retorno += 1;
    }
  }

  totals.origens_list = Object.keys(totals.por_origem).sort();
  totals.ultimas_origens_list = Object.keys(totals.por_ultima_origem).sort();

  // ── Override Visita Agendada / Visita Realizada from Visitas2 table ─────────
  const filteredLeadIds = new Set(filtered.map((l) => l["idlead"] as number));
  const leadIdArray = Array.from(filteredLeadIds);
  const allVisitas: Record<string, unknown>[] = [];
  if (leadIdArray.length > 0) {
    const CHUNK = 500;
    const visResults = await Promise.all(
      Array.from({ length: Math.ceil(leadIdArray.length / CHUNK) }, (_, i) =>
        supabaseAdmin
          .from("visitas")
          .select("idlead, situacao, nome_empreendimento")
          .in("idlead", leadIdArray.slice(i * CHUNK, (i + 1) * CHUNK))
      )
    );
    for (const r of visResults) { if (r.data) allVisitas.push(...r.data); }
  }

  const visitasAgendadasByEmp: Record<string, number> = {};
  const visitasRealizadasByEmp: Record<string, number> = {};
  // Breakdown by (origem|ultima_origem|imobiliaria) × empreendimento for filtered visita counts
  const visitasAgendadasByOrigemEmp: Record<string, Record<string, number>> = {};
  const visitasRealizadasByOrigemEmp: Record<string, Record<string, number>> = {};
  const visitasAgendadasByUltimaOrigemEmp: Record<string, Record<string, number>> = {};
  const visitasRealizadasByUltimaOrigemEmp: Record<string, Record<string, number>> = {};
  const visitasAgendadasByImobEmp: Record<string, Record<string, number>> = {};
  const visitasRealizadasByImobEmp: Record<string, Record<string, number>> = {};

  // Build lead lookup for origin/imobiliaria attribution
  const leadAttrMap = new Map(allLeads.map(l => [l["idlead"] as number, {
    origem:       normalizeOrigem(l["origem_nome"]),
    ultimaOrigem: normalizeOrigem(l["origem_ultimo"]),
    imob:         normalizeImobiliaria(l["imobiliaria"]),
  }]));

  for (const v of allVisitas) {
    if (!filteredLeadIds.has(v["idlead"] as number)) continue;
    const emp = (v["nome_empreendimento"] || "Não Identificado") as string;
    const sit = String(v["situacao"] || "").toLowerCase().trim();
    const isAgendada  = sit === "pendente" || sit === "em andamento";
    const isRealizada = sit === "concluída" || sit === "concluida";
    if (!isAgendada && !isRealizada) continue;

    if (isAgendada)  visitasAgendadasByEmp[emp]  = (visitasAgendadasByEmp[emp]  || 0) + 1;
    if (isRealizada) visitasRealizadasByEmp[emp]  = (visitasRealizadasByEmp[emp] || 0) + 1;

    const attr = leadAttrMap.get(v["idlead"] as number);
    if (!attr) continue;

    if (isAgendada) {
      if (!visitasAgendadasByOrigemEmp[attr.origem])       visitasAgendadasByOrigemEmp[attr.origem]       = {};
      if (!visitasAgendadasByUltimaOrigemEmp[attr.ultimaOrigem]) visitasAgendadasByUltimaOrigemEmp[attr.ultimaOrigem] = {};
      if (!visitasAgendadasByImobEmp[attr.imob])           visitasAgendadasByImobEmp[attr.imob]           = {};
      visitasAgendadasByOrigemEmp[attr.origem][emp]            = (visitasAgendadasByOrigemEmp[attr.origem][emp]            || 0) + 1;
      visitasAgendadasByUltimaOrigemEmp[attr.ultimaOrigem][emp]= (visitasAgendadasByUltimaOrigemEmp[attr.ultimaOrigem][emp]|| 0) + 1;
      visitasAgendadasByImobEmp[attr.imob][emp]                = (visitasAgendadasByImobEmp[attr.imob][emp]                || 0) + 1;
    } else {
      if (!visitasRealizadasByOrigemEmp[attr.origem])       visitasRealizadasByOrigemEmp[attr.origem]       = {};
      if (!visitasRealizadasByUltimaOrigemEmp[attr.ultimaOrigem]) visitasRealizadasByUltimaOrigemEmp[attr.ultimaOrigem] = {};
      if (!visitasRealizadasByImobEmp[attr.imob])           visitasRealizadasByImobEmp[attr.imob]           = {};
      visitasRealizadasByOrigemEmp[attr.origem][emp]            = (visitasRealizadasByOrigemEmp[attr.origem][emp]            || 0) + 1;
      visitasRealizadasByUltimaOrigemEmp[attr.ultimaOrigem][emp]= (visitasRealizadasByUltimaOrigemEmp[attr.ultimaOrigem][emp]|| 0) + 1;
      visitasRealizadasByImobEmp[attr.imob][emp]                = (visitasRealizadasByImobEmp[attr.imob][emp]                || 0) + 1;
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

  return NextResponse.json({
    ...totals,
    visitas_agendadas_por_origem_emp:        visitasAgendadasByOrigemEmp,
    visitas_realizadas_por_origem_emp:       visitasRealizadasByOrigemEmp,
    visitas_agendadas_por_ultima_origem_emp: visitasAgendadasByUltimaOrigemEmp,
    visitas_realizadas_por_ultima_origem_emp:visitasRealizadasByUltimaOrigemEmp,
    visitas_agendadas_por_imob_emp:          visitasAgendadasByImobEmp,
    visitas_realizadas_por_imob_emp:         visitasRealizadasByImobEmp,
  });
}
