"use client";

import { cn } from "@/lib/utils";
import pkg from "@/package.json";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export type PageId = "overview" | "meta" | "crm" | "analytics";

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview",   label: "Visão Geral",      icon: LayoutDashboard },
  { id: "meta",       label: "Meta Ads",          icon: TrendingUp },
  { id: "crm",        label: "CRM / Leads",       icon: Users },
  { id: "analytics",  label: "Operacional",       icon: Clock },
];

interface Props {
  active: PageId;
  onChange: (id: PageId) => void;
  collapsed: boolean;
  onToggle: () => void;
  stuckCount?: number;
}

export default function Sidebar({ active, onChange, collapsed, onToggle, stuckCount }: Props) {
  const router = useRouter();
  const supabase = createClient();
  useSessionTimeout();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-white border-r border-gray-100 transition-all duration-200 z-20",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-2.5 px-4 py-5 border-b border-gray-50", collapsed && "justify-center px-0")}>
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 leading-tight">Benx</p>
            <p className="text-[10px] text-gray-400 leading-tight">Meta Ads + CRM</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const badge = item.id === "analytics" ? stuckCount : undefined;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative",
                collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5",
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {badge !== undefined && badge > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold rounded-full flex items-center justify-center leading-none",
                    collapsed
                      ? "absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white"
                      : "ml-auto w-5 h-5 flex-shrink-0",
                    isActive
                      ? "bg-white/30 text-white"
                      : "bg-red-100 text-red-600"
                  )}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-gray-50 space-y-1">
        {/* Version */}
        {!collapsed && (
          <div className="px-3 py-1.5">
            <span className="text-[10px] text-gray-300 font-mono">v{pkg.version}</span>
          </div>
        )}
        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors",
            collapsed ? "justify-center px-0" : "px-3"
          )}
          title="Sair"
        >
          <LogOut className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center py-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <span className="flex items-center gap-2 text-xs">
              <ChevronLeft className="w-4 h-4" />
              {!collapsed && "Recolher"}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
