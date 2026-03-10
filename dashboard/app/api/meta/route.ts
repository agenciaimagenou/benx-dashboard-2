import { NextRequest, NextResponse } from "next/server";
import { META_ACCOUNTS, META_FIELDS } from "@/lib/meta-accounts";
import { MetaSummaryByAccount } from "@/types";

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!;
const GRAPH_API = "https://graph.facebook.com/v24.0";

type ActionItem = { action_type: string; value: string };

// Meta returns leads under action_type "lead" — confirmed from live API
const LEAD_ACTION_TYPES = [
  "lead",
  "offsite_conversion.fb_pixel_lead",
  "onsite_conversion.lead_grouped",
];

function extractLeads(actions: ActionItem[] | undefined): number {
  if (!actions) return 0;
  // Sum all lead action types, but deduplicate: prefer the plain "lead" if available
  const plain = actions.find((a) => a.action_type === "lead");
  if (plain) return parseFloat(plain.value) || 0;
  // Fallback: try other known lead action types
  for (const type of LEAD_ACTION_TYPES) {
    const match = actions.find((a) => a.action_type === type);
    if (match) return parseFloat(match.value) || 0;
  }
  return 0;
}

function extractCostPerLead(costPerAction: ActionItem[] | undefined): number {
  if (!costPerAction) return 0;
  const plain = costPerAction.find((a) => a.action_type === "lead");
  if (plain) return parseFloat(plain.value) || 0;
  for (const type of LEAD_ACTION_TYPES) {
    const match = costPerAction.find((a) => a.action_type === type);
    if (match) return parseFloat(match.value) || 0;
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStart = searchParams.get("date_start");
  const dateEnd = searchParams.get("date_end");

  if (!dateStart || !dateEnd) {
    return NextResponse.json({ error: "date_start and date_end are required" }, { status: 400 });
  }

  const timeRange = JSON.stringify({ since: dateStart, until: dateEnd });

  const summaryByAccount: MetaSummaryByAccount[] = [];

  await Promise.allSettled(
    META_ACCOUNTS.map(async (account) => {
      try {
        const params = new URLSearchParams({
          level: "campaign",          // campaign level like n8n — ensures actions array is populated
          time_range: timeRange,
          fields: META_FIELDS.join(","),
          action_attribution_windows: JSON.stringify(["1d_click", "1d_view"]),
          filtering: JSON.stringify([
            { field: "campaign.effective_status", operator: "IN", value: ["ACTIVE", "PAUSED"] },
          ]),
          limit: "500",
          access_token: ACCESS_TOKEN,
        });

        const url = `${GRAPH_API}/act_${account.id}/insights?${params}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          console.error(`Meta API error for ${account.name}: ${res.status}`);
          summaryByAccount.push({
            ad_account_id: account.id,
            ad_account_name: account.name,
            crm_key: account.crmKey,
            total_spend: 0,
            total_impressions: 0,
            total_reach: 0,
            total_clicks: 0,
            total_leads: 0,
            avg_ctr: 0,
            avg_cpc: 0,
            avg_cpm: 0,
            cost_per_lead: 0,
          });
          return;
        }

        const data = await res.json();
        const rows = data.data || [];

        // Aggregate all campaigns for this account
        let totalSpend = 0;
        let totalImpressions = 0;
        let totalReach = 0;
        let totalClicks = 0;
        let totalLeads = 0;
        let weightedCtr = 0;
        let weightedCpc = 0;
        let weightedCpm = 0;

        for (const row of rows) {
          const spend = parseFloat(row.spend || "0");
          const impressions = parseFloat(row.impressions || "0");
          const clicks = parseFloat(row.clicks || "0");
          const leads = extractLeads(row.actions);

          totalSpend += spend;
          totalImpressions += impressions;
          totalReach += parseFloat(row.reach || "0");
          totalClicks += clicks;
          totalLeads += leads;
          weightedCtr += parseFloat(row.ctr || "0") * impressions;
          weightedCpc += parseFloat(row.cpc || "0") * clicks;
          weightedCpm += parseFloat(row.cpm || "0") * impressions;
        }

        summaryByAccount.push({
          ad_account_id: account.id,
          ad_account_name: account.name,
          crm_key: account.crmKey,
          total_spend: totalSpend,
          total_impressions: totalImpressions,
          total_reach: totalReach,
          total_clicks: totalClicks,
          total_leads: totalLeads,
          avg_ctr: totalImpressions > 0 ? weightedCtr / totalImpressions : 0,
          avg_cpc: totalClicks > 0 ? weightedCpc / totalClicks : 0,
          avg_cpm: totalImpressions > 0 ? weightedCpm / totalImpressions : 0,
          cost_per_lead: totalLeads > 0 ? totalSpend / totalLeads : 0,
        });
      } catch (err) {
        console.error(`Error fetching Meta data for ${account.name}:`, err);
        summaryByAccount.push({
          ad_account_id: account.id,
          ad_account_name: account.name,
          crm_key: account.crmKey,
          total_spend: 0,
          total_impressions: 0,
          total_reach: 0,
          total_clicks: 0,
          total_leads: 0,
          avg_ctr: 0,
          avg_cpc: 0,
          avg_cpm: 0,
          cost_per_lead: 0,
        });
      }
    })
  );

  return NextResponse.json(summaryByAccount);
}
