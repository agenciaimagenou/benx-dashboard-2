"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function ConfirmarContent() {
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
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("success");
          setTimeout(() => router.push(next), 1500);
          return;
        }

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
    <>
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
    </>
  );
}

export default function ConfirmarPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="flex justify-center mb-4">
          <Image src="/logo-benx.png" alt="Benx" width={110} height={40} className="object-contain" />
        </div>
        <Suspense fallback={
          <div className="mt-6">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">Carregando...</p>
          </div>
        }>
          <ConfirmarContent />
        </Suspense>
      </div>
    </div>
  );
}
