import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";

/**
 * サーバーコンポーネント / Server Action 用 Supabase クライアント。
 * cookies() は Next.js 15+ で非同期のため await が必要です。
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
      set(name: string, value: string, options?: Parameters<typeof cookieStore.set>[1]) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options?: Parameters<typeof cookieStore.set>[1]) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

