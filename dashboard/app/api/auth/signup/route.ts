import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const normalizedEmail = email.trim().toLowerCase();

    // Verificar se e-mail já existe
    const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const exists = (existing?.users ?? []).some(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );
    if (exists) {
      return NextResponse.json({ error: "email_exists" }, { status: 409 });
    }

    // Criar usuário com e-mail já confirmado (nós enviamos o e-mail via Resend)
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      user_metadata: { name: name.trim(), needs_password_change: true },
      email_confirm: true,
    });

    if (createError) {
      return NextResponse.json(
        { error: "create_failed", message: createError.message },
        { status: 500 }
      );
    }

    // Gerar link de redefinição de senha (para o usuário criar a própria senha)
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: `${origin}/auth/callback?next=%2Fredefinir-senha%3Fnovo%3Dtrue`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ error: "link_failed" }, { status: 500 });
    }

    // Enviar e-mail via Brevo REST API
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: "Benx Dashboard", email: process.env.BREVO_SMTP_USER },
        to: [{ email: normalizedEmail }],
        subject: "Crie sua senha — Benx Dashboard",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="background: #2563eb; width: 48px; height: 48px; border-radius: 12px; margin-bottom: 20px;"></div>
            <h1 style="color: #111827; font-size: 22px; margin: 0 0 8px;">Olá, ${name.trim()}!</h1>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
              Seu cadastro no <strong>Benx Dashboard</strong> foi criado com sucesso.<br>
              Clique no botão abaixo para definir sua senha e começar a usar.
            </p>
            <a href="${linkData.properties.action_link}"
               style="display: inline-block; background: #2563eb; color: #ffffff; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
              Criar minha senha
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 32px; line-height: 1.5;">
              Este link é válido por 24 horas.<br>
              Se você não solicitou este cadastro, ignore este e-mail.
            </p>
            <p style="color: #d1d5db; font-size: 11px; margin-top: 16px;">
              Benx Dashboard © ${new Date().getFullYear()}
            </p>
          </div>
        `,
      }),
    });

    if (!brevoRes.ok) {
      const brevoErr = await brevoRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: "email_failed", message: JSON.stringify(brevoErr) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
