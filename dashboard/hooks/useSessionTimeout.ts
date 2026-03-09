"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas
const STORAGE_KEY = "benx_last_activity";
const THROTTLE_MS = 60 * 1000; // atualiza localStorage no máximo 1x por minuto
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // verifica a cada 5 minutos

export function useSessionTimeout() {
  const router = useRouter();
  const supabase = createClient();
  const lastUpdateRef = useRef(0);

  async function signOutAndRedirect() {
    localStorage.removeItem(STORAGE_KEY);
    await supabase.auth.signOut();
    router.push("/login?sessao_expirada=true");
  }

  function updateActivity() {
    const now = Date.now();
    if (now - lastUpdateRef.current > THROTTLE_MS) {
      localStorage.setItem(STORAGE_KEY, String(now));
      lastUpdateRef.current = now;
    }
  }

  useEffect(() => {
    const now = Date.now();
    const stored = localStorage.getItem(STORAGE_KEY);

    // Se tem registro de atividade anterior e passou mais de 2h → derrubar
    if (stored && now - parseInt(stored, 10) > TIMEOUT_MS) {
      signOutAndRedirect();
      return;
    }

    // Registra atividade inicial
    localStorage.setItem(STORAGE_KEY, String(now));
    lastUpdateRef.current = now;

    // Ouve eventos de atividade do usuário
    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    // Verifica periodicamente se expirou (mesmo sem interação)
    const interval = setInterval(() => {
      const latest = localStorage.getItem(STORAGE_KEY);
      if (latest && Date.now() - parseInt(latest, 10) > TIMEOUT_MS) {
        signOutAndRedirect();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, []);
}
