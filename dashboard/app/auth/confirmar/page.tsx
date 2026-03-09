"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ConfirmarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function confirm() {
      const next = searchParams.get("next") ?? "/";
      const code = searchParams.get("code");
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      try {
        // Fluxo PKCE — code na query string
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("success");
          setTimeout(() => router.push(next), 1500);
          return;
        }

        // Fluxo OTP — token_hash na query string
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as "signup" | "recovery" | "email_change" | "magiclink",
          });
          if (error) throw error;
          setStatus("success");
          setTimeout(() => router.push(next), 1500);
          return;
        }

        // Fluxo implícito — access_token no hash da URL (#access_token=...&refresh_token=...)
        const hash = window.location.hash.slice(1);
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") ?? "";

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          setStatus("success");
          setTimeout(() => router.push(next), 1500);
          return;
        }

        // Verificar se sessão já foi estabelecida pelo cliente Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus("success");
          setTimeout(() => router.push(next), 1500);
          return;
        }

        throw new Error("Não foi possível confirmar o acesso. O link pode ter expirado.");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido.");
      }
    }

    confirm();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 10h16M4 14h10M4 18h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Benx</h1>

        {status === "loading" && (
          <div className="mt-6">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Verificando acesso...</p>
          </div>
        )}

        {status === "success" && (
          <div className="mt-6">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-800 mb-1">Acesso confirmado!</p>
            <p className="text-xs text-gray-500">Redirecionando...</p>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6">
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-800 mb-2">Link inválido ou expirado</p>
            <p className="text-xs text-gray-500 mb-5">{errorMsg}</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
