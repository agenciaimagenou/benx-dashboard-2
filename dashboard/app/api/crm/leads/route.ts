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
  // ISO format: "2026-01-26T21:27:25" or "2026-01-26"
  if (dateStr.includes("T") || /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  // Brazilian format: "DD/MM/YYYY"
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T00:00:00`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const empreendimento    = searchParams.get("empreendimento");
  const dateStartStr      = searchParams.get("date_start");
  const dateEndStr        = searchParams.get("date_end");
  const tipo              = searchParams.get("tipo") ?? "ganhos";
  const origensParam      = searchParams.get("origens");
  const ultimaOrigemParam = searchParams.get("ultima_origem");
  const imobiliariaParam  = searchParams.get("imobiliaria");

  const filterOrigens      = origensParam      ? origensParam.split(",").filter(Boolean)      : [];
  const filterUltimaOrigem = ultimaOrigemParam  ? ultimaOrigemParam.split(",").filter(Boolean)  : [];
  const filterImobiliaria  = imobiliariaParam   ? imobiliariaParam.split(",").filter(Boolean)   : [];

  if (!empreendimento || !dateStartStr || !dateEndStr) {
    return NextResponse.json({ error: "empreendimento, date_start e date_end são obrigatórios" }, { status: 400 });
  }

  const SELECT = `idlead, situacao, nome, corretor, imobiliaria, empreendimento, empreendimento_primeiro, origem_nome, origem_ultimo, data_cad, reserva, score`;
  const PAGE = 1000;
  const allLeads: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await supabaseAdmin
      .from("leads2")
      .select(SELECT)
      .or(`empreendimento_primeiro.ilike.${empreendimento},empreendimento.ilike.${empreendimento}`)
      .gte("data_cad", `${dateStartStr}T00:00:00`)
      .lte("data_cad", `${dateEndStr}T23:59:59`)
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!page || page.length === 0) break;
    allLeads.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }

  const startDate = new Date(`${dateStartStr}T00:00:00`);
  const endDate   = new Date(`${dateEndStr}T23:59:59`);

  const filtered = allLeads.filter((lead) => {
    // Date range filter (in-memory fallback for non-ISO formats)
    const d = parseBrDate(lead["data_cad"] as string | null);
    if (!d || d < startDate || d > endDate) return false;

    // Empreendimento filter
    const emp = ((lead["empreendimento_primeiro"] || lead["empreendimento"]) as string) || "";
    if (emp.toLowerCase().trim() !== empreendimento.toLowerCase().trim()) return false;

    // Internal filters
    if (filterOrigens.length > 0) {
      const origem = normalizeOrigem(lead["origem_nome"]);
      if (!filterOrigens.includes(origem)) return false;
    }
    if (filterUltimaOrigem.length > 0) {
      const ultimaOrigem = normalizeOrigem(lead["origem_ultimo"]);
      if (!filterUltimaOrigem.includes(ultimaOrigem)) return false;
    }
    if (filterImobiliaria.length > 0) {
      const imob = normalizeImobiliaria(lead["imobiliaria"]);
      if (!filterImobiliaria.includes(imob)) return false;
    }

    // Status filter
    const situacao = ((lead["situacao"] as string) || "").toLowerCase();
    const reserva  = (lead["reserva"] as number || 0) > 0;
    const ganhos   = situacao.includes("ganho") || situacao.includes("venda");

    if (tipo === "ganhos") return ganhos;
    if (tipo === "reservas") return reserva || situacao.includes("reserva");
    // visita types handled separately below
    return true;
  });

  // For visita types: mirror main CRM route logic exactly
  // Get ALL leads in date range → query Visitas2 for their IDs → filter by empreendimento
  if (tipo === "visita_agendada" || tipo === "visita_realizada") {
    const targetSits = tipo === "visita_agendada"
      ? ["pendente", "em andamento"]
      : ["concluída", "concluida"];

    // Step 1: get ALL leads in date range (applying internal filters), paginated
    const SELECT_ALL = `idlead, situacao, nome, corretor, imobiliaria, empreendimento, empreendimento_primeiro, origem_nome, origem_ultimo, data_cad, score`;
    const PAGE2 = 1000;
    const allLeadsInRange: Record<string, unknown>[] = [];
    let from2 = 0;
    while (true) {
      const { data: page, error } = await supabaseAdmin
        .from("leads2")
        .select(SELECT_ALL)
        .gte("data_cad", `${dateStartStr}T00:00:00`)
        .lte("data_cad", `${dateEndStr}T23:59:59`)
        .range(from2, from2 + PAGE2 - 1);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!page || page.length === 0) break;
      allLeadsInRange.push(...page);
      if (page.length < PAGE2) break;
      from2 += PAGE2;
    }

    // Apply internal filters to all leads
    const filteredInRange = allLeadsInRange.filter((lead) => {
      if (filterOrigens.length > 0) {
        if (!filterOrigens.includes(normalizeOrigem(lead["origem_nome"]))) return false;
      }
      if (filterUltimaOrigem.length > 0) {
        if (!filterUltimaOrigem.includes(normalizeOrigem(lead["origem_ultimo"]))) return false;
      }
      if (filterImobiliaria.length > 0) {
        if (!filterImobiliaria.includes(normalizeImobiliaria(lead["imobiliaria"]))) return false;
      }
      return true;
    });

    const leadIdMap = new Map(filteredInRange.map(l => [l["idlead"] as number, l]));
    const leadIdArray2 = Array.from(leadIdMap.keys());
    if (leadIdArray2.length === 0) return NextResponse.json({ leads: [], total: 0 });

    // Step 2: query Visitas2 for those lead IDs (same as main CRM route)
    // Use limit(10000) per chunk to avoid PostgREST default 1000-row cap
    const CHUNK = 500;
    const visResults = await Promise.all(
      Array.from({ length: Math.ceil(leadIdArray2.length / CHUNK) }, (_, i) =>
        supabaseAdmin
          .from("Visitas2")
          .select("idlead, situacao, nome_empreendimento")
          .in("idlead", leadIdArray2.slice(i * CHUNK, (i + 1) * CHUNK))
          .limit(10000)
      )
    );

    // Step 3: collect all statuses per lead for this empreendimento
    const leadSituacoes = new Map<number, Set<string>>();
    for (const r of visResults) {
      for (const v of (r.data ?? [])) {
        const emp = String(v["nome_empreendimento"] || "");
        if (emp.toLowerCase().trim() !== empreendimento.toLowerCase().trim()) continue;
        const sit = String(v["situacao"] || "").toLowerCase().trim();
        const id = v["idlead"] as number;
        if (!leadSituacoes.has(id)) leadSituacoes.set(id, new Set());
        leadSituacoes.get(id)!.add(sit);
      }
    }

    // Step 4: include any lead that has at least one matching status entry
    const matchedLeadIds = new Set<number>();
    for (const [id, sits] of leadSituacoes) {
      if (targetSits.some(s => sits.has(s))) {
        matchedLeadIds.add(id);
      }
    }

    const result = Array.from(matchedLeadIds)
      .map(id => leadIdMap.get(id))
      .filter((l): l is Record<string, unknown> => !!l)
      .map((l) => ({
        id:             l["idlead"],
        nome:           (l["nome"] as string) || "—",
        situacao:       (l["situacao"] as string) || "—",
        corretor:       ((l["corretor"] as string) || "—").split(" - ")[0],
        empreendimento: (l["empreendimento_primeiro"] || l["empreendimento"]) as string,
        origem:         (l["origem_nome"] as string) || "—",
        data_cadastro:  (l["data_cad"] as string) || "—",
        score:          l["score"] ?? 0,
      }));

    return NextResponse.json({ leads: result, total: result.length });
  }

  const leads = filtered.map((l) => ({
    id:             l["idlead"],
    nome:           (l["nome"] as string) || "—",
    situacao:       (l["situacao"] as string) || "—",
    corretor:       ((l["corretor"] as string) || "—").split(" - ")[0],
    empreendimento: (l["empreendimento_primeiro"] || l["empreendimento"]) as string,
    origem:         (l["origem_nome"] as string) || "—",
    data_cadastro:  (l["data_cad"] as string) || "—",
    score:          l["score"] ?? 0,
  }));

  return NextResponse.json({ leads, total: leads.length });
}
