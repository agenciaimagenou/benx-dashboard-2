"use client";

import { cn } from "@/lib/utils";
import pkg from "@/package.json";
import Image from "next/image";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Home,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export type PageId = "overview" | "meta" | "google" | "crm" | "analytics" | "reservas";

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview",   label: "Visão Geral",  icon: LayoutDashboard },
  { id: "meta",       label: "Meta Ads",     icon: TrendingUp },
  { id: "google",     label: "Google Ads",   icon: Search },
  { id: "crm",        label: "CRM / Leads",  icon: Users },
  { id: "analytics",  label: "Operacional",  icon: Clock },
  { id: "reservas",   label: "Reservas",     icon: Home },
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
    <aside className={cn(
      "h-screen sticky top-0 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 z-20",
      collapsed ? "w-16" : "w-56"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-slate-800/60 py-4",
        collapsed ? "justify-center px-0" : "px-5"
      )}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">B</span>
          </div>
        ) : (
          <Image src="/logo-benx.png" alt="Benx" width={90} height={32} className="object-contain brightness-200" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          const badge = item.id === "analytics" ? stuckCount : undefined;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative group",
                collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <Icon className={cn(
                "flex-shrink-0 transition-transform duration-150",
                collapsed ? "w-5 h-5" : "w-4 h-4",
                !isActive && "group-hover:scale-110"
              )} />

              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}

              {badge !== undefined && badge > 0 && (
                <span className={cn(
                  "text-[10px] font-bold rounded-full flex items-center justify-center leading-none",
                  collapsed
                    ? "absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white"
                    : "ml-auto w-5 h-5 flex-shrink-0",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-red-500 text-white"
                )}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}

              {/* Tooltip for collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl pointer-events-none">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-slate-800/60 space-y-0.5">
        {!collapsed && (
          <div className="px-3 py-1">
            <span className="text-[10px] text-slate-600 font-mono">v{pkg.version}</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Sair"
          className={cn(
            "w-full flex items-center gap-3 rounded-xl py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <LogOut className={cn("flex-shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>

        <button
          onClick={onToggle}
          title={collapsed ? "Expandir" : "Recolher"}
          className="w-full flex items-center justify-center py-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <span className="flex items-center gap-1.5 text-xs"><ChevronLeft className="w-4 h-4" />Recolher</span>
          }
        </button>
      </div>
    </aside>
  );
}
