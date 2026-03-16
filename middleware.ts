import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { MOCK_ROLE_COOKIE } from "@/lib/auth/mock-role-cookie";

/**
 * 認証保護用ミドルウェア。
 *
 * - 以下のパスは常に公開（未ログイン可）:
 *   - /
 *   - /login
 *   - /signup
 *   - /privacy
 *   - /terms
 *   - /auth/callback
 *   - /invite/*
 *   - /api/e2e-login（E2E テスト用・要 E2E_TEST_SECRET）
 *
 * - /dashboard/* はログイン必須。未ログイン時は /login へリダイレクト。
 * - 開発時のみ: MOCK_ROLE_COOKIE が設定されていればセッションなしでも /dashboard を許可。
 */
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/auth/callback",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 静的ファイルや Next 内部パスはスキップ
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  // 公開パスはそのまま通す（招待リンクは /invite/[calendarId]/[token]）
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/invite/")) {
    return NextResponse.next();
  }

  // E2E テスト用ログイン API（要 E2E_TEST_SECRET）
  if (pathname === "/api/e2e-login") {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: req,
  });

  const supabase = createSupabaseMiddlewareClient(req, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return response;
  }

  // 開発時: モック用クッキーがあればダッシュボードを許可（セッション不要）
  if (
    process.env.NODE_ENV === "development" &&
    pathname.startsWith("/dashboard") &&
    req.cookies.get(MOCK_ROLE_COOKIE)?.value
  ) {
    return response;
  }

  const loginUrl = new URL("/login", req.url);
  const redirectTo = pathname.startsWith("/dashboard") ? pathname : "/dashboard";
  loginUrl.searchParams.set("redirectTo", redirectTo);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

