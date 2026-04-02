export interface MetaInsight {
  ad_account_id: string;
  ad_account_name: string;
  crm_key: string;
  campaign_name: string;
  date_start: string;
  date_stop: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  leads: number; // from actions: lead
  link_clicks: number;
  cost_per_lead: number;
}

export interface MetaSummaryByAccount {
  ad_account_id: string;
  ad_account_name: string;
  crm_key: string;
  total_spend: number;
  total_impressions: number;
  total_reach: number;
  total_clicks: number;
  total_leads: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  cost_per_lead: number;
}

export interface CRMLead {
  Id: number;
  "Situação": string;
  "Situação Anterior": string;
  "Data Primeiro Cadastro": string;
  "Empreendimento": string;
  "Primeiro Empreendimento": string;
  "Último Empreendimento": string;
  "Corretor": string;
  "Imobiliária": string;
  "Primeira Origem": string;
  "Última Origem": string;
  "Convertido": string;
  "Reserva": string;
  "Ganhos": string;
  "Perdas": string;
  "Primeira Campanha": string;
  "Última Campanha": string;
  "Score": number;
}

export interface CRMSummaryByEmpreendimento {
  empreendimento: string;
  total_leads: number;
  total_leads_meta: number;
  total_leads_google: number;
  atendimento: number;
  atendimento_meta: number;
  atendimento_google: number;
  reserva: number;
  reserva_meta: number;
  reserva_google: number;
  ganhos: number;
  ganhos_meta: number;
  ganhos_google: number;
  perdas: number;
  cancelados: number;
  conversao_rate: number;
}

export interface MergedData {
  empreendimento: string;
  crm_key: string;
  ad_account_name: string;
  // Meta
  meta_spend: number;
  meta_impressions: number;
  meta_clicks: number;
  meta_leads: number;
  meta_cpl: number;
  meta_ctr: number;
  meta_cpc: number;
  meta_cpm: number;
  // CRM
  crm_leads: number;
  crm_atendimento: number;
  crm_reserva: number;
  crm_ganhos: number;
  crm_perdas: number;
  crm_conversao: number;
  // Combined
  lead_conversion: number; // crm_leads / meta_leads
  // Reservas table
  res_ativas: number;  // reservas com situação != vendida
  res_vendas: number;  // reservas com situação = vendida
  res_emp_key: string; // matched empreendimento name in reservas table
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DashboardMetrics {
  total_meta_spend: number;
  total_meta_leads: number;
  total_crm_leads: number;
  avg_cpl: number;
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  total_ganhos: number;
  total_reservas: number;
}
