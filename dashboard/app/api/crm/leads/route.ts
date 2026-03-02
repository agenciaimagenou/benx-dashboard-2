import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function parseBrDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T00:00:00`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const empreendimento = searchParams.get("empreendimento");
  const dateStartStr   = searchParams.get("date_start");
  const dateEndStr     = searchParams.get("date_end");
  const tipo           = searchParams.get("tipo") ?? "ganhos"; // "ganhos" | "reservas"

  if (!empreendimento || !dateStartStr || !dateEndStr) {
    return NextResponse.json({ error: "empreendimento, date_start e date_end são obrigatórios" }, { status: 400 });
  }

  const SELECT = `Id, "Nome", "Situação", "Corretor", "Empreendimento", "Primeira Origem", "Data Primeiro Cadastro", "Ganhos", "Reserva", "Score"`;
  const PAGE = 1000;
  const allLeads: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await supabaseAdmin
      .from("Leads")
      .select(SELECT)
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
    // Date range filter
    const d = parseBrDate(lead["Data Primeiro Cadastro"] as string | null);
    if (!d || d < startDate || d > endDate) return false;

    // Empreendimento filter (exact match)
    const emp = (lead["Empreendimento"] as string) || "";
    if (emp.includes(",")) return false;
    if (emp.toLowerCase().trim() !== empreendimento.toLowerCase().trim()) return false;

    // Status filter
    const situacao = ((lead["Situação"] as string) || "").toLowerCase();
    const ganhos   = parseFloat((lead["Ganhos"] as string) || "0") > 0;
    const reserva  = parseFloat((lead["Reserva"] as string) || "0") > 0;

    if (tipo === "ganhos") {
      return ganhos || situacao.includes("ganho") || situacao.includes("venda");
    }
    if (tipo === "reservas") {
      return reserva || situacao.includes("reserva");
    }
    return false;
  });

  const leads = filtered.map((l) => ({
    id:           l["Id"],
    nome:         (l["Nome"] as string) || "—",
    situacao:     (l["Situação"] as string) || "—",
    corretor:     ((l["Corretor"] as string) || "—").split(" - ")[0],
    empreendimento: l["Empreendimento"],
    origem:       (l["Primeira Origem"] as string) || "—",
    data_cadastro: (l["Data Primeiro Cadastro"] as string) || "—",
    score:        l["Score"] ?? 0,
  }));

  return NextResponse.json({ leads, total: leads.length });
}
