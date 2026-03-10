import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseRouteHandlerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectTo = requestUrl.searchParams.get("redirect_to") ?? "/dashboard";
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}

