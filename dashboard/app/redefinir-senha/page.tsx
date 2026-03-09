"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Mínimo 6 caracteres", ok: password.length >= 6 },
    { label: "Letra maiúscula", ok: /[A-Z]/.test(password) },
    { label: "Número", ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;

  if (!password) return null;

  const bar = [
    { min: 1, color: "bg-red-400", label: "Fraca" },
    { min: 2, color: "bg-yellow-400", label: "Média" },
    { min: 3, color: "bg-green-500", label: "Forte" },
  ];
  const level = bar.findLast((b) => score >= b.min) ?? bar[0];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              score >= i ? level.color : "bg-gray-200"
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs font-medium", score === 3 ? "text-green-600" : score === 2 ? "text-yellow-600" : "text-red-500")}>
        {level.label}
      </p>
      <div className="space-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.ok
              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              : <XCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
            <span className={cn("text-xs", c.ok ? "text-gray-600" : "text-gray-400")}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNovo = searchParams.get("novo") === "true";
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setError("Não foi possível salvar a senha. O link pode ter expirado — solicite um novo na tela de login.");
      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login?senha_criada=true";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-200">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 10h16M4 14h10M4 18h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Benx</h1>
          <p className="text-sm text-gray-500 mt-1">Meta Ads + CRM</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/80 overflow-hidden">

          {success ? (
            <div className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Senha atualizada!</h2>
              <p className="text-sm text-gray-500 mb-1">Sua nova senha foi salva com sucesso.</p>
              <p className="text-xs text-gray-400">Redirecionando para o login...</p>
              <div className="mt-6 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full animate-[shrink_3s_linear_forwards]" style={{ animation: "progress 3s linear forwards" }} />
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-7">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {isNovo ? "Criar senha" : "Redefinir senha"}
                    </h2>
                    <p className="text-sm text-blue-100 mt-0.5">
                      {isNovo ? "Defina uma senha para acessar sua conta" : "Escolha uma senha segura para sua conta"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="px-8 py-7">
                <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                  {/* Campos dummy para enganar o autofill do Chrome */}
                  <input type="text" name="username" className="hidden" aria-hidden="true" tabIndex={-1} readOnly />
                  <input type="password" name="password" className="hidden" aria-hidden="true" tabIndex={-1} readOnly />
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite sua nova senha"
                        required
                        autoComplete="off"
                        autoFocus
                        data-np-ignore="true"
                        data-lpignore="true"
                        className="w-full px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  {password.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repita a nova senha"
                        required
                        autoComplete="off"
                        data-np-ignore="true"
                        data-lpignore="true"
                        className={cn(
                          "w-full px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all",
                          confirm && password !== confirm ? "border-red-300 bg-red-50" : "border-gray-200"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirm && password !== confirm && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> As senhas não coincidem
                      </p>
                    )}
                    {confirm && password === confirm && confirm.length >= 6 && (
                      <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Senhas coincidem
                      </p>
                    )}
                  </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !password || !confirm}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-sm shadow-blue-200 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> Salvar nova senha</>
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-5">
                  Lembrou a senha?{" "}
                  <button onClick={() => router.push("/login")} className="text-blue-600 hover:text-blue-700 font-medium">
                    Voltar ao login
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Benx Dashboard © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
