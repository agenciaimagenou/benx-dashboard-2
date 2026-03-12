import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CLIENT_ID       = process.env.GOOGLE_ADS_CLIENT_ID!;
const CLIENT_SECRET   = process.env.GOOGLE_ADS_CLIENT_SECRET!;
const REFRESH_TOKEN   = process.env.GOOGLE_ADS_REFRESH_TOKEN!;
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
const LOGIN_CUSTOMER  = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!;
const GOOGLE_ADS_API  = "https://googleads.googleapis.com/v22";

const ACCOUNTS = [
  { id: "4224769384",  name: "VIVA BENX | BUTANTÃ" },
  { id: "7108288593",  name: "VIVA BENX | MOOCA II" },
  { id: "3394561411",  name: "BENX | AUTÓR JARDINS" },
  { id: "2916167660",  name: "VIVA BENX | POMPÉIA" },
  { id: "4137543972",  name: "BENX | J329 ITAIM" },
  { id: "8672936358",  name: "BENX | PLACE KLABIN" },
  { id: "4082459811",  name: "BENX | BROOKLIN NOVENTA" },
  { id: "2482881923",  name: "BENX | VOGEL MOEMA" },
  { id: "6899527219",  name: "VIVA BENX | STAR CAMPO BELO" },
  { id: "5973512417",  name: "VIVA BENX | STAR CONCEIÇÃO" },
  { id: "5392889574",  name: "BENX | RARO PERDIZES" },
  { id: "2264217956",  name: "BENX | 1800 OSCAR PINHEIROS" },
  { id: "8231840797",  name: "BENX | SONETO CASEMIRO" },
  { id: "9509007131",  name: "VIVA BENX | ESTAÇÃO VILA MARIANA" },
  { id: "3974358172",  name: "VIVA BENX | VILA LEOPOLDINA III" },
  { id: "8797859266",  name: "VIVA BENX | KLABIN" },
  { id: "5951690762",  name: "BENX | LED VILA MADALENA" },
  { id: "9358104290",  name: "BENX | Lisbô Pinheiros" },
  { id: "9045668735",  name: "VIVA BENX | LAPA" },
];

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get access token: ${err}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

interface CampaignRow {
  campaign: { id: string; name: string; status: string };
  metrics: {
    impressions:     string | number;
    clicks:          string | number;
    ctr:             string | number;
    averageCpc:      string | number;
    averageCpm:      string | number;
    costMicros:      string | number;
    conversions:     string | number;
    interactions:    string | number;
    interactionRate: string | number;
  };
}

async function queryAccount(
  accountId: string,
  dateStart: string,
  dateEnd: string,
  accessToken: string
): Promise<CampaignRow[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm,
      metrics.cost_micros,
      metrics.conversions,
      metrics.interactions,
      metrics.interaction_rate
    FROM campaign
    WHERE campaign.status = 'ENABLED'
      AND segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
  `.trim();

  const res = await fetch(`${GOOGLE_ADS_API}/customers/${accountId}/googleAds:search`, {
    method: "POST",
    headers: {
      "Authorization":    `Bearer ${accessToken}`,
      "developer-token":  DEVELOPER_TOKEN,
      "login-customer-id": LOGIN_CUSTOMER,
      "Content-Type":     "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Google Ads error for account ${accountId}:`, err);
    return [];
  }

  const data = await res.json();
  return (data.results ?? []) as CampaignRow[];
}

export interface GoogleAdsAccount {
  account_id:   string;
  account_name: string;
  impressions:  number;
  clicks:       number;
  ctr:          number;
  avg_cpc:      number;
  avg_cpm:      number;
  spend:        number;
  conversions:  number;
  interactions: number;
  cpl:          number;
  campaigns:    Array<{
    id:          string;
    name:        string;
    impressions: number;
    clicks:      number;
    ctr:         number;
    avg_cpc:     number;
    spend:       number;
    conversions: number;
  }>;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStart = searchParams.get("date_start");
  const dateEnd   = searchParams.get("date_end");

  if (!dateStart || !dateEnd) {
    return NextResponse.json({ error: "date_start e date_end são obrigatórios" }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }

  const results = await Promise.all(
    ACCOUNTS.map(async (account) => {
      const rows = await queryAccount(account.id, dateStart, dateEnd, accessToken);

      let impressions  = 0, clicks = 0, cost = 0, conversions = 0, interactions = 0;
      const n = (v: string | number | undefined) => Number(v ?? 0);
      const campaigns = rows.map((r) => {
        const imp  = n(r.metrics.impressions);
        const clk  = n(r.metrics.clicks);
        const spd  = n(r.metrics.costMicros)  / 1_000_000;
        const conv = n(r.metrics.conversions);
        const ctr  = n(r.metrics.ctr) * 100;
        const cpc  = n(r.metrics.averageCpc)  / 1_000_000;

        impressions  += imp;
        clicks       += clk;
        cost         += spd;
        conversions  += conv;
        interactions += n(r.metrics.interactions);

        return {
          id:          r.campaign.id,
          name:        r.campaign.name,
          impressions: imp,
          clicks:      clk,
          ctr:         ctr,
          avg_cpc:     cpc,
          spend:       spd,
          conversions: conv,
        };
      }).sort((a, b) => b.spend - a.spend);

      const ctr    = clicks > 0 ? (clicks / Math.max(impressions, 1)) * 100 : 0;
      const avg_cpc = clicks > 0 ? cost / clicks : 0;
      const avg_cpm = impressions > 0 ? (cost / impressions) * 1000 : 0;
      const cpl     = conversions > 0 ? cost / conversions : 0;

      return {
        account_id:   account.id,
        account_name: account.name,
        impressions,
        clicks,
        ctr,
        avg_cpc,
        avg_cpm,
        spend:        cost,
        conversions,
        interactions,
        cpl,
        campaigns,
      } satisfies GoogleAdsAccount;
    })
  );

  // Only include accounts with any spend or impressions
  const active = results.filter(r => r.spend > 0 || r.impressions > 0);
  active.sort((a, b) => b.spend - a.spend);

  return NextResponse.json(active, {
    headers: { "Cache-Control": "no-store" },
  });
}
