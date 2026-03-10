import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * 認証保護用ミドルウェア。
 *
 * - 以下のパスは常に公開（未ログイン可）:
 *   - /
 *   - /login
 *   - /signup
 *   - /privacy
 *   - /terms
 *   - /_next/*, /favicon.*, /assets など静的ファイル
 *
 * - それ以外のパスはログイン必須。
 */
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
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

  // 公開パスはそのまま通す
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Supabase セッションを確認
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

