import { NextRequest, NextResponse } from "next/server";
import { META_FIELDS } from "@/lib/meta-accounts";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;
const GRAPH_API = "https://graph.facebook.com/v24.0";

export const dynamic = "force-dynamic";

async function queryInsights(accountId: string, timeRange: string, fields: string) {
  const params = new URLSearchParams({
    level: "campaign",
    time_range: timeRange,
    fields,
    limit: "500",
    access_token: ACCESS_TOKEN,
  });
  const res = await fetch(`${GRAPH_API}/act_${accountId}/insights?${params}`, { cache: "no-store" });
  const data = await res.json();
  const rows = data.data || [];
  const totalSpend = rows.reduce((s: number, r: Record<string, string>) => s + parseFloat(r.spend || "0"), 0);
  const totalLeads = rows.reduce((s: number, r: Record<string, unknown>) => {
    const actions = (r.actions as Array<{ action_type: string; value: string }>) || [];
    const lead = actions.find((a) => a.action_type === "lead");
    return s + (lead ? parseFloat(lead.value) : 0);
  }, 0);
  const totalImpressions = rows.reduce((s: number, r: Record<string, string>) => s + parseFloat(r.impressions || "0"), 0);
  return { total_rows: rows.length, totalSpend, totalLeads, totalImpressions, fields };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id");
  const dateStart = searchParams.get("date_start") || "2026-02-01";
  const dateEnd = searchParams.get("date_end") || "2026-02-28";

  if (!accountId) {
    return NextResponse.json({ error: "account_id is required" }, { status: 400 });
  }

  const timeRange = JSON.stringify({ since: dateStart, until: dateEnd });

  const [debugFields, metaFields] = await Promise.all([
    queryInsights(accountId, timeRange, "campaign_name,campaign_id,spend,impressions,clicks,reach,ctr,cpm,cpc,actions,cost_per_action_type"),
    queryInsights(accountId, timeRange, META_FIELDS.join(",")),
  ]);

  return NextResponse.json({
    account_id: accountId,
    date_start: dateStart,
    date_end: dateEnd,
    with_debug_fields: debugFields,
    with_meta_fields: metaFields,
  }, { headers: { "Cache-Control": "no-store" } });
}
