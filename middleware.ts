import { NextResponse, type NextRequest } from "next/server";

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

  // 公開パスはそのまま通す
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // TODO: Supabase Auth のミドルウェアサポートが安定したら、
  // ここでセッション確認を行い、未ログイン時は /login へリダイレクトする。
  // 現時点では、全てのパスをそのまま通す。
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

