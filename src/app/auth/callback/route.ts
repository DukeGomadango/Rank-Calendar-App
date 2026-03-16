import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseRouteHandlerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const rawRedirect = requestUrl.searchParams.get("redirect_to") ?? "/dashboard";
  // オープンリダイレクト防止: 相対パス（/ 始まりで // で始まらない）のみ許可
  const redirectTo =
    typeof rawRedirect === "string" &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}

