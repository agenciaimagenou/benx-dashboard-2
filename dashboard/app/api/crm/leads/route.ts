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

  // For visita types, cross-reference with Visitas2 table
  if (tipo === "visita_agendada" || tipo === "visita_realizada") {
    const leadIds = filtered.map(l => l["idlead"] as number);
    if (leadIds.length === 0) return NextResponse.json({ leads: [], total: 0 });

    const targetSits = tipo === "visita_agendada"
      ? ["pendente", "em andamento"]
      : ["concluída", "concluida"];

    const { data: visitas, error: vError } = await supabaseAdmin
      .from("Visitas2")
      .select("idlead, situacao")
      .in("idlead", leadIds);

    if (vError) return NextResponse.json({ error: vError.message }, { status: 500 });

    const visitaLeadIds = new Set<number>(
      (visitas ?? [])
        .filter(v => targetSits.includes(String(v.situacao || "").toLowerCase().trim()))
        .map(v => v.idlead as number)
    );

    const visitaLeads = filtered
      .filter(l => visitaLeadIds.has(l["idlead"] as number))
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

    return NextResponse.json({ leads: visitaLeads, total: visitaLeads.length });
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
