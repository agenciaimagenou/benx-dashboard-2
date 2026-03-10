import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;
const GRAPH_API = "https://graph.facebook.com/v24.0";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id");
  const dateStart = searchParams.get("date_start") || "2026-02-01";
  const dateEnd = searchParams.get("date_end") || "2026-02-28";

  if (!accountId) {
    return NextResponse.json({ error: "account_id is required" }, { status: 400 });
  }

  const timeRange = JSON.stringify({ since: dateStart, until: dateEnd });

  // Campaign-level breakdown — no filtering, shows ALL campaigns including paused/archived
  const params = new URLSearchParams({
    level: "campaign",
    time_range: timeRange,
    fields: "campaign_name,campaign_id,spend,impressions,clicks,reach,ctr,cpm,cpc,actions,cost_per_action_type",
    limit: "500",
    access_token: ACCESS_TOKEN,
  });

  const url = `${GRAPH_API}/act_${accountId}/insights?${params}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();

  const rows = (data.data || []).map((row: Record<string, unknown>) => {
    const actions = (row.actions as Array<{ action_type: string; value: string }>) || [];
    const lead = actions.find((a) => a.action_type === "lead");
    const leadGrouped = actions.find((a) => a.action_type === "onsite_conversion.lead_grouped");
    return {
      campaign_name: row.campaign_name,
      campaign_id: row.campaign_id,
      spend: row.spend,
      impressions: row.impressions,
      clicks: row.clicks,
      leads_action_lead: lead?.value ?? null,
      leads_onsite_grouped: leadGrouped?.value ?? null,
      all_action_types: actions.map((a) => ({ type: a.action_type, value: a.value })),
    };
  });

  return NextResponse.json({
    account_id: accountId,
    date_start: dateStart,
    date_end: dateEnd,
    total_rows: rows.length,
    rows,
    raw_paging: data.paging,
  });
}
