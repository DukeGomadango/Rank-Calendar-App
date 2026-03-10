import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

/**
 * サーバーコンポーネント用 Supabase クライアント。
 * Next.js の制限により、ここでは cookies を「読み取り専用」で扱う。
 * （セッション更新などによる cookie 書き換えは行わない）
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase の環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Server Component では cookie の書き換えは禁止されているため no-op にする
      set() {
        // no-op
      },
      remove() {
        // no-op
      },
    },
  });
}

/**
 * Route Handler / Server Action 用 Supabase クライアント。
 * こちらでは cookies の読み書きが許可されている前提でフル機能を使う。
 */
export async function createSupabaseRouteHandlerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase の環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を確認してください。"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: Parameters<typeof cookieStore.set>[1]) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options?: Parameters<typeof cookieStore.set>[1]) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

