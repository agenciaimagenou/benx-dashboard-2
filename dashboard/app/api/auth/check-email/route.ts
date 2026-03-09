import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      // Retorna 500 explícito para o cliente poder bloquear o cadastro
      return NextResponse.json(
        { exists: false, reason: error.message },
        { status: 500 }
      );
    }

    const exists = (data?.users ?? []).some(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    return NextResponse.json({ exists });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ exists: false, reason: msg }, { status: 500 });
  }
}
