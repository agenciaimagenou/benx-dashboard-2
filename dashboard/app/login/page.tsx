"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

// ─── Pupil ────────────────────────────────────────────────────────────────────
interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

function Pupil({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY }: PupilProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  const pos = (() => {
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    if (!ref.current) return { x: 0, y: 0 };
    const r = ref.current.getBoundingClientRect();
    const dx = mouse.x - (r.left + r.width / 2);
    const dy = mouse.y - (r.top + r.height / 2);
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  })();

  return (
    <div ref={ref} className="rounded-full" style={{
      width: size, height: size, backgroundColor: pupilColor,
      transform: `translate(${pos.x}px, ${pos.y}px)`,
      transition: "transform 0.1s ease-out",
    }} />
  );
}

// ─── EyeBall ──────────────────────────────────────────────────────────────────
interface EyeBallProps {
  size?: number; pupilSize?: number; maxDistance?: number;
  eyeColor?: string; pupilColor?: string; isBlinking?: boolean;
  forceLookX?: number; forceLookY?: number;
}

function EyeBall({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, forceLookX, forceLookY }: EyeBallProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  const pos = (() => {
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    if (!ref.current) return { x: 0, y: 0 };
    const r = ref.current.getBoundingClientRect();
    const dx = mouse.x - (r.left + r.width / 2);
    const dy = mouse.y - (r.top + r.height / 2);
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  })();

  return (
    <div ref={ref} className="rounded-full flex items-center justify-center transition-all duration-150" style={{
      width: size, height: isBlinking ? 2 : size,
      backgroundColor: eyeColor, overflow: "hidden",
    }}>
      {!isBlinking && (
        <div className="rounded-full" style={{
          width: pupilSize, height: pupilSize, backgroundColor: pupilColor,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: "transform 0.1s ease-out",
        }} />
      )}
    </div>
  );
}

// ─── Characters Panel ─────────────────────────────────────────────────────────
function CharactersPanel({ password, showPassword }: { password: string; showPassword: boolean }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [purpleBlink, setPurpleBlink] = useState(false);
  const [blackBlink, setBlackBlink] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lookingAtEachOther, setLookingAtEachOther] = useState(false);
  const [purplePeeking, setPurplePeeking] = useState(false);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef  = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  // Blinking
  useEffect(() => {
    const schedule = (set: (v: boolean) => void) => {
      const t = setTimeout(() => { set(true); setTimeout(() => { set(false); schedule(set); }, 150); }, Math.random() * 4000 + 3000);
      return t;
    };
    const t1 = schedule(setPurpleBlink);
    const t2 = schedule(setBlackBlink);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Look at each other when typing
  useEffect(() => {
    if (isTyping) {
      setLookingAtEachOther(true);
      const t = setTimeout(() => setLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    }
  }, [isTyping]);

  // Purple peeking when password visible
  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const t = setTimeout(() => {
        setPurplePeeking(true);
        setTimeout(() => setPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(t);
    } else {
      setPurplePeeking(false);
    }
  }, [password, showPassword, purplePeeking]);

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 3;
    const dx = mouse.x - cx, dy = mouse.y - cy;
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };

  const pp = calcPos(purpleRef);
  const bp = calcPos(blackRef);
  const yp = calcPos(yellowRef);
  const op = calcPos(orangeRef);

  const hidingPass = isTyping || (password.length > 0 && !showPassword);

  return (
    <div className="relative hidden lg:flex flex-col justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white overflow-hidden">
      {/* Characters — centered, full height */}
      <div className="relative z-20 flex items-end justify-center h-full">
        <div className="relative" style={{ width: 550, height: 400 }}>

          {/* Purple — back */}
          <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{
            left: 70, width: 180,
            height: hidingPass ? 440 : 400,
            backgroundColor: "#6C3FF5",
            borderRadius: "10px 10px 0 0", zIndex: 1,
            transform: (password.length > 0 && showPassword)
              ? "skewX(0deg)"
              : hidingPass
                ? `skewX(${(pp.bodySkew) - 12}deg) translateX(40px)`
                : `skewX(${pp.bodySkew}deg)`,
            transformOrigin: "bottom center",
          }}>
            <div className="absolute flex gap-8 transition-all duration-700 ease-in-out" style={{
              left: (password.length > 0 && showPassword) ? 20 : lookingAtEachOther ? 55 : 45 + pp.faceX,
              top:  (password.length > 0 && showPassword) ? 35 : lookingAtEachOther ? 65 : 40 + pp.faceY,
            }}>
              {[0,1].map(i => <EyeBall key={i} size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={purpleBlink}
                forceLookX={(password.length > 0 && showPassword) ? (purplePeeking ? 4 : -4) : lookingAtEachOther ? 3 : undefined}
                forceLookY={(password.length > 0 && showPassword) ? (purplePeeking ? 5 : -4) : lookingAtEachOther ? 4 : undefined} />)}
            </div>
          </div>

          {/* Black — middle */}
          <div ref={blackRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{
            left: 240, width: 120, height: 310,
            backgroundColor: "#2D2D2D",
            borderRadius: "8px 8px 0 0", zIndex: 2,
            transform: (password.length > 0 && showPassword)
              ? "skewX(0deg)"
              : lookingAtEachOther
                ? `skewX(${bp.bodySkew * 1.5 + 10}deg) translateX(20px)`
                : hidingPass
                  ? `skewX(${bp.bodySkew * 1.5}deg)`
                  : `skewX(${bp.bodySkew}deg)`,
            transformOrigin: "bottom center",
          }}>
            <div className="absolute flex gap-6 transition-all duration-700 ease-in-out" style={{
              left: (password.length > 0 && showPassword) ? 10 : lookingAtEachOther ? 32 : 26 + bp.faceX,
              top:  (password.length > 0 && showPassword) ? 28 : lookingAtEachOther ? 12 : 32 + bp.faceY,
            }}>
              {[0,1].map(i => <EyeBall key={i} size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={blackBlink}
                forceLookX={(password.length > 0 && showPassword) ? -4 : lookingAtEachOther ? 0 : undefined}
                forceLookY={(password.length > 0 && showPassword) ? -4 : lookingAtEachOther ? -4 : undefined} />)}
            </div>
          </div>

          {/* Orange — front left */}
          <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{
            left: 0, width: 240, height: 200,
            backgroundColor: "#FF9B6B",
            borderRadius: "120px 120px 0 0", zIndex: 3,
            transform: (password.length > 0 && showPassword) ? "skewX(0deg)" : `skewX(${op.bodySkew}deg)`,
            transformOrigin: "bottom center",
          }}>
            <div className="absolute flex gap-8 transition-all duration-200 ease-out" style={{
              left: (password.length > 0 && showPassword) ? 50 : 82 + op.faceX,
              top:  (password.length > 0 && showPassword) ? 85 : 90 + op.faceY,
            }}>
              {[0,1].map(i => <Pupil key={i} size={12} maxDistance={5} pupilColor="#2D2D2D"
                forceLookX={(password.length > 0 && showPassword) ? -5 : undefined}
                forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />)}
            </div>
          </div>

          {/* Yellow — front right */}
          <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{
            left: 310, width: 140, height: 230,
            backgroundColor: "#E8D754",
            borderRadius: "70px 70px 0 0", zIndex: 4,
            transform: (password.length > 0 && showPassword) ? "skewX(0deg)" : `skewX(${yp.bodySkew}deg)`,
            transformOrigin: "bottom center",
          }}>
            <div className="absolute flex gap-6 transition-all duration-200 ease-out" style={{
              left: (password.length > 0 && showPassword) ? 20 : 52 + yp.faceX,
              top:  (password.length > 0 && showPassword) ? 35 : 40 + yp.faceY,
            }}>
              {[0,1].map(i => <Pupil key={i} size={12} maxDistance={5} pupilColor="#2D2D2D"
                forceLookX={(password.length > 0 && showPassword) ? -5 : undefined}
                forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />)}
            </div>
            <div className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out" style={{
              left: (password.length > 0 && showPassword) ? 10 : 40 + yp.faceX,
              top:  (password.length > 0 && showPassword) ? 88 : 88 + yp.faceY,
            }} />
          </div>
        </div>
      </div>

      {/* Decorative blobs */}
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
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
    const hash = window.location.hash.slice(1);
    if (hash) {
      const p = new URLSearchParams(hash);
      const at = p.get("access_token"), rt = p.get("refresh_token") ?? "", type = p.get("type");
      if (at && (type === "recovery" || type === "signup")) {
        window.history.replaceState(null, "", window.location.pathname);
        supabase.auth.setSession({ access_token: at, refresh_token: rt })
          .then(() => { window.location.href = "/redefinir-senha?novo=true"; });
        return;
      }
      if (p.get("error_code") || p.get("error")) {
        setError("O link expirou ou já foi usado. Solicite um novo abaixo.");
        setMode("forgot");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        return;
      }
    }
    const err = searchParams.get("error");
    if (err === "callback") { setError("O link expirou ou já foi usado. Solicite um novo abaixo."); setMode("forgot"); }
    if (searchParams.get("confirmed") === "true") setSuccess("E-mail confirmado! Faça login para acessar.");
    if (searchParams.get("senha_criada") === "true") setSuccess("Senha criada com sucesso! Faça login.");
    if (searchParams.get("sessao_expirada") === "true") setError("Sua sessão expirou. Faça login novamente.");
  }, [searchParams]);

  function switchMode(m: Mode) { setMode(m); setError(null); setSuccess(null); setPassword(""); }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null); setSuccess(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
      setPassword(""); setLoading(false); return;
    }
    router.push("/"); router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error === "email_exists" ? "Este e-mail já está cadastrado." : `[${data.error}] ${data.message ?? "Tente novamente."}`); return; }
      setSuccess("Cadastro realizado! Verifique seu e-mail para criar sua senha.");
    } catch { setError("Erro ao processar o cadastro. Tente novamente."); }
    finally { setLoading(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(null); setSuccess(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha` });
    setLoading(false);
    if (error) { setError("Não foi possível enviar o e-mail. Verifique o endereço."); return; }
    setSuccess("E-mail enviado! Verifique sua caixa de entrada.");
  }

  const inputClass = "w-full h-12 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — animated characters */}
      <CharactersPanel password={password} showPassword={showPass} />

      {/* Right — login form */}
      <div className="flex flex-col justify-between p-8 bg-gray-50 min-h-screen">
        {/* Benx logo top */}
        <div className="flex justify-center pt-4">
          <Image src="/logo-benx.png" alt="Benx" width={130} height={48} className="object-contain" />
        </div>

        <div className="w-full max-w-[400px] mx-auto">
          {/* ── LOGIN ── */}
          {mode === "login" && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h1>
                <p className="text-sm text-gray-500">Insira seus dados para acessar o dashboard</p>
              </div>

              {success && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">{success}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required autoComplete="email" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required autoComplete="current-password"
                      className={inputClass + " pr-10"} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-gray-200 space-y-2">
                <button onClick={() => switchMode("forgot")} className="w-full text-xs text-gray-500 hover:text-gray-700 text-center transition-colors">
                  Esqueci minha senha
                </button>
                <button onClick={() => switchMode("signup")} className="w-full text-xs font-medium text-blue-600 hover:text-blue-700 text-center transition-colors">
                  Criar nova conta
                </button>
              </div>
            </div>
          )}

          {/* ── CADASTRO ── */}
          {mode === "signup" && (
            <div>
              <button onClick={() => switchMode("login")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-5 transition-colors">
                ← Voltar
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Criar conta</h2>
              <p className="text-xs text-gray-500 mb-6">Preencha os dados para solicitar acesso.</p>

              {success ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-800 mb-1">Verifique seu e-mail</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{success}</p>
                  <button onClick={() => switchMode("login")} className="mt-5 text-xs font-medium text-blue-600 hover:text-blue-700">
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome completo</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Seu nome" required autoComplete="name" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" required autoComplete="email" className={inputClass} />
                  </div>
                  {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Enviando link..." : "Continuar"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── ESQUECI SENHA ── */}
          {mode === "forgot" && (
            <div>
              <button onClick={() => switchMode("login")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-5 transition-colors">
                ← Voltar
              </button>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Redefinir senha</h2>
              <p className="text-xs text-gray-500 mb-6">Enviaremos um link para redefinir sua senha.</p>

              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required autoComplete="email" className={inputClass} />
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                {success && <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</p>}
                {!success && (
                  <button type="submit" disabled={loading}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Enviando..." : "Enviar link de redefinição"}
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Imagenou logo bottom */}
        <div className="flex flex-col items-center gap-1 pb-4">
          <p className="text-xs text-gray-400">Desenvolvido por</p>
          <Image src="/logo-imagenou-v2.png" alt="Imagenou" width={110} height={40} className="object-contain opacity-70" />
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
