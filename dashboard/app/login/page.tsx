"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

type Mode = "login" | "signup" | "forgot";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    const confirmed = searchParams.get("confirmed");
    if (err === "callback") {
      setError("O link expirou ou já foi usado. Solicite um novo abaixo.");
      setMode("forgot");
    }
    if (confirmed === "true") {
      setSuccess("E-mail confirmado com sucesso! Faça login para acessar.");
    }
    if (searchParams.get("senha_criada") === "true") {
      setSuccess("Senha criada com sucesso! Faça login para acessar.");
    }
    if (searchParams.get("sessao_expirada") === "true") {
      setError("Sua sessão expirou por inatividade. Faça login novamente.");
    }

    // Tratar erros do Supabase no hash da URL (ex: link de e-mail expirado)
    const hash = window.location.hash.slice(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      if (hashParams.get("error_code") || hashParams.get("error")) {
        setError("O link expirou ou já foi usado. Solicite um novo abaixo.");
        setMode("forgot");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [searchParams]);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setSuccess(null);
    setPassword("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message
      );
      setPassword("");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "email_exists") {
          setError("Este e-mail já está cadastrado. Faça login ou redefina sua senha.");
        } else {
          setError(`[${data.error}] ${data.message ?? "Tente novamente."}`);
        }
        return;
      }

      setSuccess(
        "Cadastro realizado! Verifique seu e-mail e clique no link para criar sua senha."
      );
    } catch {
      setError("Erro ao processar o cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });

    setLoading(false);

    if (error) {
      setError("Não foi possível enviar o e-mail. Verifique o endereço informado.");
      return;
    }

    setSuccess("E-mail enviado! Verifique sua caixa de entrada.");
  }

  const inputClass =
    "w-full px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo-benx.png" alt="Benx" width={140} height={52} className="object-contain" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* ── LOGIN ── */}
          {mode === "login" && (
            <div key={success ?? "login"}>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Entrar</h2>

              {success && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">{success}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com" required autoComplete="email" className={inputClass} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      required autoComplete="current-password"
                      className="w-full px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                <button onClick={() => switchMode("forgot")}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 text-center transition-colors">
                  Esqueci minha senha
                </button>
                <button onClick={() => switchMode("signup")}
                  className="w-full text-xs font-medium text-blue-600 hover:text-blue-700 text-center transition-colors">
                  Criar nova conta
                </button>
              </div>
            </div>
          )}

          {/* ── CADASTRO ── */}
          {mode === "signup" && (
            <>
              <button onClick={() => switchMode("login")}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-5 transition-colors">
                ← Voltar
              </button>

              <h2 className="text-lg font-semibold text-gray-800 mb-1">Criar conta</h2>
              <p className="text-xs text-gray-500 mb-6">Preencha os dados abaixo para solicitar acesso.</p>

              {success ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-800 mb-1">Verifique seu e-mail</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{success}</p>
                  <button onClick={() => switchMode("login")}
                    className="mt-5 text-xs font-medium text-blue-600 hover:text-blue-700">
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome completo</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome" required autoComplete="name" className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com" required autoComplete="email" className={inputClass} />
                  </div>

                  {error && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Enviando link..." : "Continuar"}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── ESQUECI SENHA ── */}
          {mode === "forgot" && (
            <>
              <button onClick={() => switchMode("login")}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-5 transition-colors">
                ← Voltar
              </button>

              <h2 className="text-lg font-semibold text-gray-800 mb-2">Redefinir senha</h2>
              <p className="text-xs text-gray-500 mb-6">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com" required autoComplete="email" className={inputClass} />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}
                {success && (
                  <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</p>
                )}

                {!success && (
                  <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Enviando..." : "Enviar link de redefinição"}
                  </button>
                )}
              </form>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-xs text-gray-400">Desenvolvido por</p>
          <Image src="/logo-imagenou-v2.png" alt="Imagenou" width={120} height={42} className="object-contain opacity-80" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
