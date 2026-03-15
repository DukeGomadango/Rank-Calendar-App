import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ヘルスチェック用エンドポイント。
 * デプロイ先の監視・ALB 等から GET /api/health で呼び出し可能。
 */
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
