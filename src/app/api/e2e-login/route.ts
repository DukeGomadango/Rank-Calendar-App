import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

/**
 * E2E テスト用ログイン API。
 * E2E_TEST_SECRET が設定され、リクエストの x-e2e-secret ヘッダーと一致する場合のみ有効。
 * 環境変数 E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD で指定したユーザーでログインし、/dashboard へリダイレクトする。
 */
export async function GET(req: Request) {
  // 本番では常に無効化（誤設定・漏洩時の攻撃面を減らす）
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const secret = process.env.E2E_TEST_SECRET;
  const headerSecret = req.headers.get("x-e2e-secret");

  if (!secret || secret !== headerSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.E2E_TEST_USER_EMAIL;
  const password = process.env.E2E_TEST_USER_PASSWORD;

  if (!email || !password) {
    return NextResponse.json(
      { error: "E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD が未設定です" },
      { status: 500 }
    );
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: `ログインに失敗しました: ${error.message}` },
      { status: 401 }
    );
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
