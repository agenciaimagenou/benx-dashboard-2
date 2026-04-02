import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_request: NextRequest) {
  try {
    // Fetch all reservas
    let all: Record<string, unknown>[] = [];
    let from = 0;
    const PAGE = 1000;

    while (true) {
      const { data, error } = await supabaseAdmin
        .from("reservas")
        .select("*")
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data as Record<string, unknown>[]);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Enrich with lead origem data
    // idlead in reservas is stored as string, leads table uses numeric idlead
    const idleads = [...new Set(
      all.flatMap(r => {
        const raw = String(r["idlead"] || "");
        return raw.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      })
    )];
    const leadMap: Record<number, { origem_nome?: string; origem_ultimo_nome?: string; origem?: string; lead_data_cad?: string }> = {};

    if (idleads.length > 0) {
      const BATCH = 500;
      for (let i = 0; i < idleads.length; i += BATCH) {
        const batch = idleads.slice(i, i + BATCH);
        const { data: leads } = await supabaseAdmin
          .from("leads")
          .select("idlead, origem_nome, origem_ultimo_nome, origem, data_cad")
          .in("idlead", batch);
        if (leads) {
          for (const l of leads) {
            leadMap[Number(l.idlead)] = {
              origem_nome: l.origem_nome as string | undefined,
              origem_ultimo_nome: l.origem_ultimo_nome as string | undefined,
              origem: l.origem as string | undefined,
              lead_data_cad: l.data_cad as string | undefined,
            };
          }
        }
      }
      // Merge lead fields — for multi-ID records, pick the oldest lead by data_cad
      all = all.map(r => {
        const raw = String(r["idlead"] || "");
        const ids = raw.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
        if (ids.length === 0) return r;
        const candidates = ids.map(id => leadMap[id]).filter(Boolean);
        if (candidates.length === 0) return r;
        const oldest = candidates.sort((a, b) => (a.lead_data_cad || "").localeCompare(b.lead_data_cad || ""))[0];
        return { ...r, ...oldest };
      });
    }

    // Build filter options
    const empreendimentos = [...new Set(all.map(r => String(r["empreendimento"] || "")).filter(Boolean))].sort();
    const situacoes       = [...new Set(all.map(r => String(r["situacao"]       || "")).filter(Boolean))].sort();
    const times           = [...new Set(all.map(r => String(r["nome_time"]      || "")).filter(Boolean))].sort();
    const corretores      = [...new Set(all.map(r => String(r["corretor"]       || "")).filter(Boolean))].sort();
    const tiposVenda      = [...new Set(all.map(r => String(r["tipovenda"]      || "")).filter(Boolean))].sort();
    const origens         = [...new Set(all.map(r => String(r["origem_nome"]    || "")).filter(Boolean))].sort();

    return NextResponse.json({
      records: all,
      filter_options: { empreendimentos, situacoes, times, corretores, tiposVenda, origens },
    });
  } catch (err) {
    console.error("reservas error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
